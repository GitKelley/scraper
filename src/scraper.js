import axios from 'axios';

/**
 * Scrapes rental data from any rental website using Firecrawl API
 * Requires FIRECRAWL_API_KEY environment variable
 */
export async function scrapeRental(url) {
  // Firecrawl API key is required
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlApiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is required');
  }

  try {
    const result = await scrapeWithFirecrawl(url, firecrawlApiKey);
    if (result && (result.title || result.description || result.images?.length > 0)) {
      return result;
    }
    throw new Error('No data extracted from Firecrawl response');
  } catch (error) {
    console.error(`Firecrawl failed: ${error.message}`);
    throw error;
  }
}

/**
 * Scrape using Firecrawl API (free tier: 300 credits)
 * Get API key from https://firecrawl.dev (free signup)
 * API docs: https://docs.firecrawl.dev
 */
async function scrapeWithFirecrawl(url, apiKey) {
  // Firecrawl API endpoint
  const apiUrl = 'https://api.firecrawl.dev/v0/scrape';
  
  try {
    console.log(`[${new Date().toISOString()}] Calling Firecrawl API for: ${url}`);
    const response = await axios.post(
      apiUrl,
      {
        url: url,
        pageOptions: {
          onlyMainContent: false // Get full page content
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );
    
    console.log(`[${new Date().toISOString()}] Firecrawl response received, status: ${response.status}`);
    const data = response.data;
    
    // Firecrawl returns structured data
    // Map it to our rental data format
    const hostname = new URL(url).hostname.toLowerCase();
    let rentalData = {
      url: url,
      source: getSourceName(hostname),
      scrapedAt: new Date().toISOString()
    };
    
    // Extract data from Firecrawl response
    if (data.data) {
      const pageData = data.data;
    
    // Title from metadata
    rentalData.title = pageData.metadata?.title || pageData.metadata?.name || null;
    
    // Description - skip extraction for Airbnb (markdown structure is too complex)
    rentalData.description = null;
    
    if (!hostname.includes('airbnb')) {
      // Description - extract full description from markdown (not just metadata summary)
      if (pageData.markdown) {
        // Look for description after the title - capture multiple paragraphs until next major section
        // Pattern: Title (# heading) followed by description text until next ## heading
        let descMatch = pageData.markdown.match(/^#\s+.+?\n\n((?:.+?\n?)+?)(?=\n##|$)/s);
        
        if (descMatch) {
          // Clean up the description - remove markdown formatting
          let desc = descMatch[1]
            .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
            .replace(/\*\*([^\*]+)\*\*/g, '$1') // Remove bold
            .replace(/\*([^\*]+)\*/g, '$1') // Remove italic
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
            .replace(/^\s+|\s+$/gm, '') // Trim each line
            .replace(/\n\n+/g, '\n\n') // Clean up extra newlines
            .trim();
          
          // Take up to 5000 characters to get full description
          if (desc.length > 5000) {
            desc = desc.substring(0, 5000);
            // Try to cut at a sentence boundary
            const lastPeriod = desc.lastIndexOf('.');
            if (lastPeriod > 4500) {
              desc = desc.substring(0, lastPeriod + 1);
            } else {
              desc = desc + '...';
            }
          }
          rentalData.description = desc || null;
        }
      }
      
      // Fallback to metadata description if markdown extraction failed
      if (!rentalData.description && pageData.metadata?.description) {
        rentalData.description = pageData.metadata.description;
      }
      
      // Last fallback to content
      if (!rentalData.description && pageData.content) {
        rentalData.description = pageData.content.substring(0, 5000);
      }
    }
    
    // Location from metadata
    if (pageData.metadata?.addressLocality || pageData.metadata?.addressRegion) {
      const locationParts = [];
      if (pageData.metadata.addressLocality) locationParts.push(pageData.metadata.addressLocality);
      if (pageData.metadata.addressRegion) locationParts.push(pageData.metadata.addressRegion);
      if (pageData.metadata.addressCountry) locationParts.push(pageData.metadata.addressCountry);
      rentalData.location = locationParts.join(', ') || null;
    }
    
    // Bedrooms from title (e.g., "7 Bedroom House")
    if (rentalData.title) {
      const bedroomsMatch = rentalData.title.match(/(\d+)\s*bedroom/i) || rentalData.title.match(/(\d+)\s*bed/i);
      if (bedroomsMatch) {
        rentalData.bedrooms = parseInt(bedroomsMatch[1], 10);
      }
    }
    
    // Try to extract price from URL parameters first (most reliable)
    const urlObj = new URL(url);
    const topDp = urlObj.searchParams.get('top_dp');
    const nightlyPrice = urlObj.searchParams.get('nightly_price');
    if (topDp && !isNaN(parseInt(topDp))) {
      rentalData.price = parseInt(topDp, 10);
    } else if (nightlyPrice && !isNaN(parseInt(nightlyPrice))) {
      rentalData.price = parseInt(nightlyPrice, 10);
    }
    
    // Parse markdown to extract additional data
    if (pageData.markdown) {
      const markdownData = parseMarkdown(pageData.markdown, hostname, url);
      // Only use markdown price if we didn't get it from URL
      if (!rentalData.price && markdownData.price) {
        rentalData.price = markdownData.price;
      }
      // Use parser-specific description if provided (but skip for Airbnb)
      if (markdownData.description && !hostname.includes('airbnb')) {
        rentalData.description = markdownData.description;
      }
      // Merge markdown data, but preserve price from URL if we have it
      const savedPrice = rentalData.price;
      const savedDescription = rentalData.description; // Preserve description (null for Airbnb)
      rentalData = { ...rentalData, ...markdownData };
      if (savedPrice) {
        rentalData.price = savedPrice;
      }
      // Preserve null description for Airbnb
      if (hostname.includes('airbnb')) {
        rentalData.description = null;
      } else if (savedDescription) {
        rentalData.description = savedDescription;
      }
    }
    
    // Images from metadata if available
    if (pageData.metadata?.image && !rentalData.images?.length) {
      rentalData.images = [pageData.metadata.image];
    }
  }
  
  return rentalData;
  } catch (error) {
    // Log detailed error information
    console.error(`[${new Date().toISOString()}] Firecrawl API error details:`);
    console.error(`  URL: ${url}`);
    console.error(`  Error message: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Status text: ${error.response.statusText}`);
      console.error(`  Response data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error(`  Request made but no response received`);
      console.error(`  Request config:`, JSON.stringify({
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout
      }, null, 2));
    }
    if (error.code) {
      console.error(`  Error code: ${error.code}`);
    }
    throw error;
  }
}

/**
 * Parse markdown to extract rental data using site-specific parsers
 */
function parseMarkdown(markdown, hostname, url) {
  try {
    const parser = getParser(hostname);
    return parser.parse(markdown, url);
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return {};
  }
}

/**
 * Base parser with common extraction logic
 */
const BaseParser = {
  extractPrice(markdown, url) {
    // Try URL parameters first (most reliable)
    const urlObj = new URL(url);
    const topDp = urlObj.searchParams.get('top_dp');
    const nightlyPrice = urlObj.searchParams.get('nightly_price');
    if (topDp && !isNaN(parseInt(topDp))) {
      return parseInt(topDp, 10);
    }
    if (nightlyPrice && !isNaN(parseInt(nightlyPrice))) {
      return parseInt(nightlyPrice, 10);
    }
    
    // Look for nightly price patterns
    const nightlyPricePattern = /\$([\d,]+)\s*(?:per\s+night|nightly|\/night)/i;
    const nightlyMatch = markdown.match(nightlyPricePattern);
    if (nightlyMatch) {
      return parseInt(nightlyMatch[1].replace(/[^\d]/g, ''), 10);
    }
    
    // Filter out unreasonably high prices
    const priceMatches = markdown.match(/\$[\d,]+/g);
    if (priceMatches && priceMatches.length > 0) {
      const prices = priceMatches.map(p => parseInt(p.replace(/[^\d]/g, '')));
      const reasonablePrices = prices.filter(p => p < 10000 && p > 0);
      if (reasonablePrices.length > 0) {
        reasonablePrices.sort((a, b) => a - b);
        const priceCounts = {};
        reasonablePrices.forEach(p => {
          priceCounts[p] = (priceCounts[p] || 0) + 1;
        });
        const mostCommonPrice = Object.entries(priceCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0];
        return mostCommonPrice ? parseInt(mostCommonPrice, 10) : reasonablePrices[Math.floor(reasonablePrices.length / 2)];
      }
    }
    return null;
  },

  extractImages(markdown, hostname) {
    const imageMatches = markdown.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g);
    if (imageMatches) {
      const images = [];
      const seenUrls = new Set();
      for (const match of imageMatches) {
        const urlMatch = match.match(/\((https?:\/\/[^\)]+)\)/);
        if (urlMatch) {
          const url = urlMatch[1];
          // Filter based on hostname
          if (hostname.includes('vrbo') && url.includes('media.vrbo.com') && !url.includes('logo') && !url.includes('icon') && !seenUrls.has(url)) {
            images.push(url);
            seenUrls.add(url);
            if (images.length >= 15) break;
          } else if (hostname.includes('airbnb') && url.includes('a0.muscache.com') && !seenUrls.has(url)) {
            // Filter out platform assets, UI elements, and user profile pictures
            const isPropertyPhoto = 
              url.includes('/pictures/hosting/') || 
              url.includes('/pictures/prohost-api/') ||
              (url.includes('/pictures/') && !url.includes('airbnb-platform-assets') && !url.includes('/user/') && !url.includes('laurel') && !url.includes('GuestFavorite') && !url.includes('search-bar-icons'));
            
            if (isPropertyPhoto) {
              images.push(url);
              seenUrls.add(url);
              if (images.length >= 15) break;
            }
          }
        }
      }
      return images;
    }
    return [];
  }
};

/**
 * VRBO-specific parser
 */
const VRBOParser = {
  ...BaseParser,

  parse(markdown, url) {
    const data = {};
    
    // Price
    data.price = this.extractPrice(markdown, url);
    
    // Bedrooms
    const bedroomPatterns = [
      /(\d{1,2})\s+bedroom\b/gi,
      /(\d{1,2})\s+bed\b/gi,
      /###\s+(\d{1,2})\s+bedroom/gi,
      /(\d{1,2})bedroom\b/gi,
    ];
    
    for (const pattern of bedroomPatterns) {
      const matches = [...markdown.matchAll(pattern)];
      for (const match of matches) {
        const bedrooms = parseInt(match[1], 10);
        if (bedrooms >= 1 && bedrooms <= 50) {
          data.bedrooms = bedrooms;
          break;
        }
      }
      if (data.bedrooms) break;
    }
    
    // Bathrooms
    const bathroomPatterns = [
      /(\d{1,2})\s+bathroom\b/gi,
      /(\d{1,2})\s+bath\b/gi,
      /###\s+(\d{1,2})\s+bathroom/gi,
      /(\d{1,2})bathroom\b/gi,
    ];
    
    for (const pattern of bathroomPatterns) {
      const matches = [...markdown.matchAll(pattern)];
      for (const match of matches) {
        const bathrooms = parseInt(match[1], 10);
        if (bathrooms >= 1 && bathrooms <= 30) {
          data.bathrooms = bathrooms;
          break;
        }
      }
      if (data.bathrooms) break;
    }
    
    // Sleeps
    const sleepsPatterns = [
      /sleeps\s+(?:up\s+to\s+)?(\d{1,3})\b/i,
      /\(sleeps\s+(\d{1,3})\)/i,
      /sleeps\s+(\d{1,3})\s+guests?/i,
      /accommodates\s+(\d{1,3})\s+guests?/i
    ];
    
    for (const pattern of sleepsPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        const sleeps = parseInt(match[1], 10);
        if (sleeps >= 1 && sleeps <= 200) {
          data.sleeps = sleeps;
          break;
        }
      }
    }
    
    // Images
    data.images = this.extractImages(markdown, 'vrbo');
    
    // Amenities
    data.amenities = this.extractAmenities(markdown);
    
    return data;
  },

  extractAmenities(markdown) {
    let amenities = [];
    const amenitiesSet = new Set();
    
    const commonAmenities = [
      'Kitchen', 'WiFi', 'Wi-Fi', 'Free WiFi', 'Air conditioning', 'AC', 'Heating',
      'Parking', 'Parking available', 'Garage', 'Outdoor Space', 'Patio', 'Balcony',
      'Fireplace', 'Pool', 'Hot tub', 'Jacuzzi', 'Washer', 'Dryer', 'Dishwasher',
      'Microwave', 'Refrigerator', 'TV', 'Television', 'Cable TV', 'Internet',
      'Pet friendly', 'Pets allowed', 'Smoking allowed', 'Non-smoking',
      'Beach access', 'Waterfront', 'Mountain view', 'Ocean view', 'Gym', 'Fitness center',
      'Theater room', 'Home theater', 'Movie theater', 'Game room', 'Games room',
      'Pool table', 'Billiards', 'Ping pong', 'Table tennis', 'Foosball',
      'Arcade', 'Video games', 'Gaming room', 'Entertainment room', 'Media room',
      'Wine cellar', 'Bar', 'Wet bar', 'Sauna', 'Steam room', 'Spa',
      'Tennis court', 'Basketball court', 'Volleyball court', 'Playground',
      'Library', 'Office', 'Workspace', 'Golf course access', 'Ski-in/ski-out'
    ];
    
    const amenitiesSectionMatch = markdown.match(/##?\s*Amenities[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/i);
    if (amenitiesSectionMatch) {
      const amenitiesSection = amenitiesSectionMatch[1];
      const listItems = amenitiesSection.match(/^[\s]*[-*]\s*(.+)$/gm);
      if (listItems) {
        for (const item of listItems) {
          const amenity = item.replace(/^[\s]*[-*]\s*/, '').trim();
          if (amenity && !amenitiesSet.has(amenity.toLowerCase())) {
            amenities.push(amenity);
            amenitiesSet.add(amenity.toLowerCase());
          }
        }
      }
    }
    
    if (amenities.length === 0) {
      const markdownLower = markdown.toLowerCase();
      const sortedAmenities = [...commonAmenities].sort((a, b) => b.length - a.length);
      for (const amenity of sortedAmenities) {
        const amenityLower = amenity.toLowerCase();
        const isDuplicate = Array.from(amenitiesSet).some(existing => 
          existing.includes(amenityLower) || amenityLower.includes(existing)
        );
        if (!isDuplicate) {
          const regex = new RegExp(`\\b${amenityLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(markdown)) {
            amenities.push(amenity);
            amenitiesSet.add(amenityLower);
          }
        }
      }
    } else {
      amenities = amenities.filter((amenity, index) => {
        const amenityLower = amenity.toLowerCase();
        return !amenities.some((other, otherIndex) => 
          otherIndex !== index && 
          (other.toLowerCase().includes(amenityLower) && other.length > amenity.length)
        );
      });
    }
    
    return amenities;
  }
};

/**
 * Airbnb-specific parser
 */
const AirbnbParser = {
  ...BaseParser,

  parse(markdown, url) {
    const data = {};
    
    // Note: Description extraction skipped for Airbnb - use default extraction from main scraper
    
    // Price - Airbnb shows total price "X for Y nights", keep the total as shown
    // Check for "X for Y nights" pattern FIRST (most reliable for Airbnb)
    const totalPriceMatch = markdown.match(/\$([\d,]+)\s+for\s+(\d+)\s+nights?/i);
    if (totalPriceMatch) {
      const total = parseInt(totalPriceMatch[1].replace(/[^\d]/g, ''), 10);
      if (total > 0) {
        data.price = total; // Keep total price as shown on listing
      }
    } else {
      // Fallback to base price extraction
      data.price = this.extractPrice(markdown, url);
    }
    
    // Bedrooms - Airbnb format: "5 bedrooms" or "5 bedrooms ·"
    const bedroomMatch = markdown.match(/(\d{1,2})\s+bedrooms?\b/gi);
    if (bedroomMatch) {
      const bedrooms = parseInt(bedroomMatch[0].match(/\d+/)[0], 10);
      if (bedrooms >= 1 && bedrooms <= 50) {
        data.bedrooms = bedrooms;
      }
    }
    
    // Bathrooms - Airbnb format: "4 baths" or "4 bathrooms"
    const bathroomMatch = markdown.match(/(\d{1,2})\s+(?:baths?|bathrooms?)\b/gi);
    if (bathroomMatch) {
      const bathrooms = parseInt(bathroomMatch[0].match(/\d+/)[0], 10);
      if (bathrooms >= 1 && bathrooms <= 30) {
        data.bathrooms = bathrooms;
      }
    }
    
    // Sleeps/Guests - Airbnb format: "10 guests" or "Sleeps 10"
    const guestsMatch = markdown.match(/(\d{1,3})\s+guests?\b/gi) || markdown.match(/sleeps\s+(\d{1,3})\b/gi);
    if (guestsMatch) {
      const guests = parseInt(guestsMatch[0].match(/\d+/)[0], 10);
      if (guests >= 1 && guests <= 200) {
        data.sleeps = guests;
      }
    }
    
    // Images
    data.images = this.extractImages(markdown, 'airbnb');
    
    // Amenities - Airbnb has a specific section
    data.amenities = this.extractAmenities(markdown);
    
    return data;
  },

  extractAmenities(markdown) {
    const amenities = [];
    const amenitiesSet = new Set();
    
    // Look for amenities section
    const amenitiesSectionMatch = markdown.match(/##?\s*Amenities?[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/i);
    if (amenitiesSectionMatch) {
      const amenitiesSection = amenitiesSectionMatch[1];
      // Look for list items or inline mentions
      const listItems = amenitiesSection.match(/^[\s]*[-*·]\s*(.+)$/gm);
      if (listItems) {
        for (const item of listItems) {
          const amenity = item.replace(/^[\s]*[-*·]\s*/, '').trim();
          if (amenity && !amenitiesSet.has(amenity.toLowerCase())) {
            amenities.push(amenity);
            amenitiesSet.add(amenity.toLowerCase());
          }
        }
      }
    }
    
    // Common Airbnb amenities to search for
    const commonAmenities = [
      'Kitchen', 'WiFi', 'Free WiFi', 'Air conditioning', 'AC', 'Heating',
      'Parking', 'Garage', 'Patio', 'Balcony', 'Fireplace', 'Pool', 'Hot tub',
      'Washer', 'Dryer', 'Dishwasher', 'TV', 'Internet', 'Pet-friendly', 'Pets allowed',
      'Self check-in', 'Smoking allowed', 'Non-smoking', 'Gym', 'Fitness center'
    ];
    
    if (amenities.length === 0) {
      const markdownLower = markdown.toLowerCase();
      for (const amenity of commonAmenities) {
        const amenityLower = amenity.toLowerCase();
        if (!amenitiesSet.has(amenityLower)) {
          const regex = new RegExp(`\\b${amenityLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(markdown)) {
            amenities.push(amenity);
            amenitiesSet.add(amenityLower);
          }
        }
      }
    }
    
    return amenities;
  }
};

/**
 * Parser registry - maps hostnames to parsers
 */
const PARSER_REGISTRY = {
  'vrbo.com': VRBOParser,
  'www.vrbo.com': VRBOParser,
  'airbnb.com': AirbnbParser,
  'www.airbnb.com': AirbnbParser,
};

/**
 * Get the appropriate parser for a hostname
 */
function getParser(hostname) {
  const normalizedHostname = hostname.toLowerCase().replace('www.', '');
  for (const [key, parser] of Object.entries(PARSER_REGISTRY)) {
    if (normalizedHostname.includes(key.replace('www.', ''))) {
      return parser;
    }
  }
  // Default to VRBO parser for unknown sites
  return VRBOParser;
}

/**
 * Get source name from hostname
 */
function getSourceName(hostname) {
  if (hostname.includes('vrbo')) return 'VRBO';
  if (hostname.includes('booking')) return 'Booking.com';
  if (hostname.includes('airbnb')) return 'Airbnb';
  if (hostname.includes('expedia')) return 'Expedia';
  if (hostname.includes('tripadvisor')) return 'TripAdvisor';
  if (hostname.includes('homeaway')) return 'HomeAway';
  if (hostname.includes('rentals')) return 'Rentals.com';
  // Extract domain name
  const parts = hostname.replace('www.', '').split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

