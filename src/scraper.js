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
    
    // Description - use metadata first, then try markdown
    rentalData.description = pageData.metadata?.description || null;
    if (!rentalData.description && pageData.markdown) {
      // Extract description from markdown (usually first paragraph after title)
      const descMatch = pageData.markdown.match(/^#.+\n\n(.+?)(?:\n\n|$)/s);
      rentalData.description = descMatch ? descMatch[1].substring(0, 2000) : null;
    } else if (!rentalData.description && pageData.content) {
      rentalData.description = pageData.content.substring(0, 2000);
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
    
    // Parse markdown to extract additional data
    if (pageData.markdown) {
      const markdownData = parseMarkdown(pageData.markdown, hostname);
      rentalData = { ...rentalData, ...markdownData };
    }
    
    // Images from metadata if available
    if (pageData.metadata?.image && !rentalData.images?.length) {
      rentalData.images = [pageData.metadata.image];
    }
  }
  
  return rentalData;
}

/**
 * Parse markdown to extract rental data
 */
function parseMarkdown(markdown, hostname) {
  const data = {};
  
  try {
    // Price - look for dollar amounts
    const priceMatches = markdown.match(/\$[\d,]+/g);
    if (priceMatches && priceMatches.length > 0) {
      // Take the largest price (likely the nightly rate)
      const prices = priceMatches.map(p => parseInt(p.replace(/[^\d]/g, '')));
      data.price = Math.max(...prices);
    }
    
    // Bedrooms - look for patterns like "7 bedroom" or "7 bed"
    const bedroomMatch = markdown.match(/(\d+)\s*bedroom/i) || markdown.match(/(\d+)\s*bed\b/i);
    if (bedroomMatch) {
      data.bedrooms = parseInt(bedroomMatch[1], 10);
    }
    
    // Bathrooms - look for patterns like "8 bathroom" or "8 bath"
    const bathroomMatch = markdown.match(/(\d+)\s*bathroom/i) || markdown.match(/(\d+)\s*bath\b/i);
    if (bathroomMatch) {
      data.bathrooms = parseInt(bathroomMatch[1], 10);
    }
    
    // Sleeps - look for patterns like "sleeps 14" or "(sleeps 14)"
    const sleepsMatch = markdown.match(/sleeps\s+(\d+)/i) || markdown.match(/\(sleeps\s+(\d+)\)/i);
    if (sleepsMatch) {
      data.sleeps = parseInt(sleepsMatch[1], 10);
    }
    
    // Images - extract image URLs from markdown
    const imageMatches = markdown.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g);
    if (imageMatches) {
      data.images = [];
      const seenUrls = new Set();
      for (const match of imageMatches) {
        const urlMatch = match.match(/\((https?:\/\/[^\)]+)\)/);
        if (urlMatch) {
          const url = urlMatch[1];
          // Filter VRBO images
          if (url.includes('media.vrbo.com') && !url.includes('logo') && !url.includes('icon') && !seenUrls.has(url)) {
            data.images.push(url);
            seenUrls.add(url);
            if (data.images.length >= 15) break;
          }
        }
      }
    }
    
    // Amenities - look for amenities section or common amenity terms
    data.amenities = [];
    const amenitiesSet = new Set();
    
    // Common amenities to look for
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
    
    // Try to find amenities section (look for "Amenities" heading followed by list items)
    const amenitiesSectionMatch = markdown.match(/##?\s*Amenities[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/i);
    if (amenitiesSectionMatch) {
      const amenitiesSection = amenitiesSectionMatch[1];
      // Look for list items (markdown lists start with - or *)
      const listItems = amenitiesSection.match(/^[\s]*[-*]\s*(.+)$/gm);
      if (listItems) {
        for (const item of listItems) {
          const amenity = item.replace(/^[\s]*[-*]\s*/, '').trim();
          if (amenity && !amenitiesSet.has(amenity.toLowerCase())) {
            data.amenities.push(amenity);
            amenitiesSet.add(amenity.toLowerCase());
          }
        }
      }
    }
    
    // If no amenities section found, search for common amenity terms in the markdown
    if (data.amenities.length === 0) {
      const markdownLower = markdown.toLowerCase();
      // Sort by length (longer phrases first) to avoid duplicates like "Parking" matching before "Parking available"
      const sortedAmenities = [...commonAmenities].sort((a, b) => b.length - a.length);
      for (const amenity of sortedAmenities) {
        const amenityLower = amenity.toLowerCase();
        // Check if this amenity is already covered by a longer one we found
        const isDuplicate = Array.from(amenitiesSet).some(existing => 
          existing.includes(amenityLower) || amenityLower.includes(existing)
        );
        if (!isDuplicate) {
          // Look for the amenity as a standalone word or in a phrase
          const regex = new RegExp(`\\b${amenityLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(markdown)) {
            data.amenities.push(amenity);
            amenitiesSet.add(amenityLower);
          }
        }
      }
    } else {
      // Deduplicate amenities list (remove shorter versions if longer ones exist)
      data.amenities = data.amenities.filter((amenity, index) => {
        const amenityLower = amenity.toLowerCase();
        return !data.amenities.some((other, otherIndex) => 
          otherIndex !== index && 
          (other.toLowerCase().includes(amenityLower) && other.length > amenity.length)
        );
      });
    }
    
  } catch (error) {
    console.error('Error parsing markdown:', error);
  }
  
  return data;
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

