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

