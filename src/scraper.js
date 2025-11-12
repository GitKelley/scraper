import axios from 'axios';
import Firecrawl from '@mendable/firecrawl-js';

/**
 * Scrapes rental data from any rental website using Firecrawl API
 * Requires FIRECRAWL_API_KEY environment variable
 */
/**
 * Clean URL by removing tracking and problematic parameters
 * These parameters can trigger anti-bot detection
 */
function cleanUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // List of parameters to remove that can cause 403s
    const paramsToRemove = [
      // Branch.io tracking parameters
      'brandcid',
      '_branch_match_id',
      '_branch_referrer',
      '_branch_referrer_hook',
      // Other tracking parameters
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      'source',
      // VRBO-specific tracking
      'rm1',
      'rfrr',
      'pwa_ts',
      'referrerUrl',
      'privacyTrackingState',
      'searchId',
      'selectedRoomType',
      'selectedRatePlan',
      'userIntent',
      'top_dp',
      'top_cur',
      // Keep essential parameters for VRBO
      // Keep: chkin, chkout, startDate, endDate, adults, children, guests, etc.
    ];
    
    // Remove problematic parameters
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    const cleanedUrl = urlObj.toString();
    if (cleanedUrl !== url) {
      console.log(`[URL Cleaning] Removed tracking parameters. Original: ${url.substring(0, 100)}...`);
      console.log(`[URL Cleaning] Cleaned: ${cleanedUrl.substring(0, 100)}...`);
    }
    
    return cleanedUrl;
  } catch (error) {
    console.warn(`[URL Cleaning] Failed to clean URL, using original: ${error.message}`);
    return url;
  }
}

/**
 * Normalize mobile app links to web URLs
 * Handles short links by following redirects
 */
async function normalizeUrl(url, visited = new Set()) {
  // Prevent infinite loops
  if (visited.has(url)) {
    console.log(`[URL Normalization] Already visited: ${url}, returning as-is`);
    return url;
  }
  visited.add(url);
  
  // Handle VRBO short links (t.vrbo.io) and Branch.io links (a8ro.app.link) - need to follow redirect
  if (url.includes('t.vrbo.io/') || url.includes('a8ro.app.link/')) {
    console.log(`[URL Normalization] Resolving short link: ${url}`);
    try {
      // First try without following redirects to catch the Location header
      try {
        const response = await axios.get(url, {
          maxRedirects: 0, // Don't follow redirects automatically
          validateStatus: () => true, // Accept all status codes
          timeout: 10000
        });
        
        // If we get a redirect status, follow it
        if (response.status >= 300 && response.status < 400 && response.headers.location) {
          let redirectUrl = response.headers.location;
          // If location is relative, make it absolute
          if (redirectUrl.startsWith('/')) {
            redirectUrl = `${new URL(url).origin}${redirectUrl}`;
          } else if (!redirectUrl.startsWith('http')) {
            redirectUrl = `https://${redirectUrl}`;
          }
          console.log(`[URL Normalization] Following redirect to: ${redirectUrl}`);
          // Recursively resolve - continue following redirects until we reach vrbo.com
          const resolvedUrl = await normalizeUrl(redirectUrl, visited);
          // If we've reached a vrbo.com URL, return it; otherwise continue following
          if (resolvedUrl.includes('vrbo.com')) {
            return resolvedUrl;
          }
          // If not vrbo.com yet, continue following redirects
          return await normalizeUrl(resolvedUrl, visited);
        }
      } catch (redirectError) {
        // Axios throws an error when maxRedirects is 0 and a redirect is encountered
        // Extract the Location header from the error response
        if (redirectError.response?.status >= 300 && redirectError.response?.status < 400 && redirectError.response?.headers?.location) {
          let redirectUrl = redirectError.response.headers.location;
          if (redirectUrl.startsWith('/')) {
            redirectUrl = `${new URL(url).origin}${redirectUrl}`;
          } else if (!redirectUrl.startsWith('http')) {
            redirectUrl = `https://${redirectUrl}`;
          }
          console.log(`[URL Normalization] Following redirect (from error) to: ${redirectUrl}`);
          // Recursively resolve - continue following redirects until we reach vrbo.com
          const resolvedUrl = await normalizeUrl(redirectUrl, visited);
          // If we've reached a vrbo.com URL, return it; otherwise continue following
          if (resolvedUrl.includes('vrbo.com')) {
            return resolvedUrl;
          }
          // If not vrbo.com yet, continue following redirects
          return await normalizeUrl(resolvedUrl, visited);
        }
        // If it's not a redirect error, try with redirects enabled
        try {
          const response = await axios.get(url, {
            maxRedirects: 5,
            validateStatus: () => true,
            timeout: 10000
          });
          
          // Check various places for the final URL
          let finalUrl = url;
          
          // Check response.request.res.responseUrl (final URL after redirects)
          if (response.request?.res?.responseUrl) {
            finalUrl = response.request.res.responseUrl;
          }
          // Check response.request.path (final path after redirects)
          else if (response.request?.path && response.request.path !== new URL(url).pathname) {
            finalUrl = `${response.request.protocol}//${response.request.host}${response.request.path}`;
          }
          // Check response.config.url (might be updated after redirects)
          else if (response.config?.url && response.config.url !== url) {
            finalUrl = response.config.url;
          }
          
          if (finalUrl !== url) {
            console.log(`[URL Normalization] Resolved to: ${finalUrl}`);
            // If we've reached a vrbo.com URL, return it
            if (finalUrl.includes('vrbo.com')) {
              return finalUrl;
            }
            // Otherwise, continue following redirects
            return await normalizeUrl(finalUrl, visited);
          }
        } catch (err) {
          throw redirectError; // Re-throw original error if fallback also fails
        }
      }
    } catch (error) {
      console.error(`[URL Normalization] Failed to resolve VRBO short link: ${error.message}`);
      // Return original URL if redirect resolution fails
      return url;
    }
  }
  
  // Handle VRBO mobile app links
  if (url.startsWith('vrbo://')) {
    // Extract property ID and parameters from mobile link
    // Format: vrbo://property/{id}?params or vrbo://{id}?params
    const propertyMatch = url.match(/vrbo:\/\/(?:property\/)?(\d+)/);
    if (propertyMatch) {
      const propertyId = propertyMatch[1];
      // Extract query parameters if present
      const paramsMatch = url.match(/\?(.+)$/);
      const params = paramsMatch ? `?${paramsMatch[1]}` : '';
      return `https://www.vrbo.com/${propertyId}${params}`;
    }
  }
  
  // Handle Airbnb mobile app links
  if (url.startsWith('airbnb://')) {
    // Extract room ID and parameters from mobile link
    // Format: airbnb://rooms/{id}?params or airbnb://{id}?params
    const roomMatch = url.match(/airbnb:\/\/(?:rooms\/)?(\d+)/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      // Extract query parameters if present
      const paramsMatch = url.match(/\?(.+)$/);
      const params = paramsMatch ? `?${paramsMatch[1]}` : '';
      return `https://www.airbnb.com/rooms/${roomId}${params}`;
    }
  }
  
  // Handle short links (vrbo.com/12345 or airbnb.com/r/12345)
  if (url.includes('vrbo.com/') && !url.startsWith('http')) {
    // Add https:// if missing
    url = `https://${url}`;
  }
  
  if (url.includes('airbnb.com/') && !url.startsWith('http')) {
    // Add https:// if missing
    url = `https://${url}`;
    // Convert short links (airbnb.com/r/12345) to full format
    url = url.replace(/airbnb\.com\/r\/(\d+)/, 'airbnb.com/rooms/$1');
  }
  
  // If it's already a web URL, return as-is
  return url;
}

export async function scrapeRental(url) {
  // Firecrawl API key is required
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlApiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is required');
  }

  // Clean URL first to remove tracking parameters that can trigger 403s
  const cleanedUrl = cleanUrl(url);
  
  // Normalize mobile app links to web URLs (follows redirects for short links)
  const normalizedUrl = await normalizeUrl(cleanedUrl);

  try {
    const result = await scrapeWithFirecrawl(normalizedUrl, firecrawlApiKey);
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
 * Scrape using Firecrawl SDK with stealth mode
 * Get API key from https://firecrawl.dev (free signup)
 * API docs: https://docs.firecrawl.dev
 */
async function scrapeWithFirecrawl(url, apiKey) {
  // Initialize Firecrawl client
  const firecrawl = new Firecrawl({ apiKey });
  
  // Helper function to get realistic browser headers
  const getStealthHeaders = () => {
    // Rotate through realistic user agents
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // Core browser identification headers
    const browserIdentity = {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br'
    };
    
    // Connection and security headers
    const connectionHeaders = {
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
    
    // Modern browser security headers
    const securityHeaders = {
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };
    
    // Combine all headers
    return {
      ...browserIdentity,
      ...connectionHeaders,
      ...securityHeaders
    };
  };
  
  // Helper function to get a random proxy from pool (if configured)
  const getRandomProxy = () => {
    const proxyList = process.env.PROXY_LIST;
    if (!proxyList) {
      return null;
    }
    
    // Parse proxy list (format: "proxy1:port:user:pass,proxy2:port:user:pass" or "proxy1:port,proxy2:port")
    const proxies = proxyList.split(',').map(p => p.trim()).filter(p => p);
    if (proxies.length === 0) {
      return null;
    }
    
    // Return random proxy from pool
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    console.log(`[${new Date().toISOString()}] Using proxy: ${randomProxy.split(':')[0]}:${randomProxy.split(':')[1]} (rotated)`);
    
    // Parse proxy format: "host:port" or "host:port:username:password"
    const parts = randomProxy.split(':');
    if (parts.length === 2) {
      return { host: parts[0], port: parseInt(parts[1], 10) };
    } else if (parts.length === 4) {
      return { 
        host: parts[0], 
        port: parseInt(parts[1], 10),
        auth: { username: parts[2], password: parts[3] }
      };
    }
    
    return null;
  };
  
  // Helper function to add human-like delay
  const humanDelay = async (baseDelay = 2000) => {
    // Random delay to mimic human behavior
    // For Airbnb, use longer delays to avoid detection
    const hostname = new URL(url).hostname.toLowerCase();
    const delayBase = hostname.includes('airbnb') ? 5000 : baseDelay; // 5-8 seconds for Airbnb
    const delay = Math.floor(Math.random() * 3000) + delayBase;
    console.log(`[${new Date().toISOString()}] Adding human-like delay: ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  };
  
  // Helper function for exponential backoff
  const exponentialBackoff = async (attempt) => {
    // Exponential backoff: 5s, 10s, 20s, 40s...
    const delay = Math.min(5000 * Math.pow(2, attempt), 60000); // Max 60 seconds
    console.log(`[${new Date().toISOString()}] Exponential backoff: waiting ${delay}ms before retry ${attempt + 1}`);
    await new Promise(resolve => setTimeout(resolve, delay));
  };
  
  // Helper function to perform the actual scrape
  const performScrape = async (useStealth = false, useProxy = false) => {
    // Add human-like delay before making request (especially for Airbnb)
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('airbnb')) {
      await humanDelay();
    }
    
    const options = {
      formats: ['markdown', 'html'],
      // Page options for v1 API
      onlyMainContent: false, // Get full page - changed back to false, onlyMainContent might be causing redirects
      waitFor: hostname.includes('airbnb') ? 10000 : 2000, // Wait even longer for Airbnb (10 seconds) - needs more time for JS to fully load
      timeout: 30000, // 30 second timeout for Airbnb
      // Complete browser headers to avoid detection
      headers: getStealthHeaders()
    };
    
    // Use proxy rotation if enabled and proxy list is configured
    if (useProxy) {
      const proxy = getRandomProxy();
      if (proxy) {
        // Firecrawl might support proxy configuration - check their docs
        // For now, we'll use stealth mode which uses their proxy infrastructure
        // If Firecrawl supports custom proxy URLs, we can add it here
        options.proxy = 'stealth'; // Use stealth as fallback
        console.log(`[${new Date().toISOString()}] Proxy rotation enabled, using stealth proxy`);
      }
    }
    
    if (useStealth) {
      options.proxy = 'stealth';
    }
    
    return await firecrawl.scrapeUrl(url, options);
  };
  
  // Check if this is an Airbnb link - use stealth and proxy rotation from the start
  const hostname = new URL(url).hostname.toLowerCase();
  const isAirbnb = hostname.includes('airbnb');
  const useStealthFirst = isAirbnb; // Use stealth mode from start for Airbnb
  const useProxyRotation = process.env.ENABLE_PROXY_ROTATION === 'true' || isAirbnb; // Enable proxy rotation for Airbnb or if explicitly enabled
  
  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Add exponential backoff between retries
        await exponentialBackoff(attempt - 1);
      }
      
      if (useStealthFirst) {
        console.log(`[${new Date().toISOString()}] Calling Firecrawl API for: ${url} (stealth proxy + IP rotation - Airbnb detected) [Attempt ${attempt + 1}/${maxRetries + 1}]`);
        // Start with stealth and proxy rotation for Airbnb
        let scrapeResponse = await performScrape(true, useProxyRotation);
        console.log(`[${new Date().toISOString()}] Firecrawl response received (stealth proxy + IP rotation)`);
        let data = scrapeResponse;
        
        // Process the data
        return processFirecrawlData(data, url, hostname);
      } else {
        if (attempt === 0) {
          console.log(`[${new Date().toISOString()}] Calling Firecrawl API for: ${url} (default proxy) [Attempt ${attempt + 1}/${maxRetries + 1}]`);
          // First try with default proxy
          let scrapeResponse = await performScrape(false, false);
          
          console.log(`[${new Date().toISOString()}] Firecrawl response received`);
          let data = scrapeResponse;
          
          // Check if we got an error status code
          const statusCode = data?.metadata?.statusCode || data?.data?.metadata?.statusCode;
          if ([401, 403, 500].includes(statusCode)) {
            console.log(`[${new Date().toISOString()}] Got status code ${statusCode}, will retry with stealth proxy + IP rotation`);
            // Continue to retry logic below
            throw new Error(`Status code ${statusCode} received`);
          }
          
          // Process the data
          return processFirecrawlData(data, url, hostname);
        } else {
          // Retry with stealth proxy and IP rotation
          console.log(`[${new Date().toISOString()}] Retrying with stealth proxy + IP rotation [Attempt ${attempt + 1}/${maxRetries + 1}]`);
          let scrapeResponse = await performScrape(true, true);
          let data = scrapeResponse;
          console.log(`[${new Date().toISOString()}] Firecrawl response received (stealth proxy + IP rotation)`);
          
          // Process the data
          return processFirecrawlData(data, url, hostname);
        }
      }
    } catch (error) {
      lastError = error;
      
      // Check if error message contains status code info
      const errorMessage = error.message || '';
      const statusMatch = errorMessage.match(/status code:?\s*(\d+)/i);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
      
      // If we've exhausted retries, log as error and throw
      if (attempt === maxRetries) {
        console.error(`[${new Date().toISOString()}] All ${maxRetries + 1} attempts failed: ${error.message}`);
        throw error;
      }
      
      // During retries, log as warning (not error) since we're still trying
      // Retry even for "not currently supported" errors - sometimes retrying with different IP/proxy helps
      console.warn(`[${new Date().toISOString()}] Attempt ${attempt + 1} failed, retrying... (${error.message})`);
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new Error('Failed to scrape after all retries');
}

/**
 * Process Firecrawl response data into rental data format
 */
function processFirecrawlData(data, url, hostname) {
  // Firecrawl returns structured data
  // Map it to our rental data format
    let rentalData = {
      url: url,
      source: getSourceName(hostname),
      scrapedAt: new Date().toISOString()
    };
    
    // Firecrawl SDK returns data directly or in data.data structure
    // Handle both response formats
    let pageData;
    if (data.data) {
      pageData = data.data;
    } else if (data.markdown || data.metadata) {
      pageData = data;
    } else {
      throw new Error('Invalid Firecrawl response format');
    }
    
    // Extract data from Firecrawl response
    if (pageData) {
    
    // Log markdown for debugging (first 1000 chars)
    if (pageData.markdown) {
      console.log(`[${new Date().toISOString()}] Markdown preview (first 1000 chars):`, pageData.markdown.substring(0, 1000));
      // Check if we got redirected to homepage
      if (pageData.markdown.includes('[Airbnb homepage]') || pageData.markdown.includes('Airbnb: Vacation Rentals')) {
        console.warn(`[${new Date().toISOString()}] WARNING: Appears to have been redirected to Airbnb homepage instead of listing page`);
        console.warn(`[${new Date().toISOString()}] This suggests Airbnb is blocking or redirecting Firecrawl`);
      }
    }
    
    // Title from metadata (but this might be generic page title)
    let titleFromMetadata = pageData.metadata?.title || pageData.metadata?.name || null;
    
    // For Airbnb, try to extract title from markdown first (more reliable)
    if (hostname.includes('airbnb') && pageData.markdown) {
      // Look for the actual listing title in markdown - usually the first # heading that's not "Airbnb:"
      const titleMatch = pageData.markdown.match(/^#\s+(.+?)$/m);
      if (titleMatch && !titleMatch[1].includes('Airbnb:') && !titleMatch[1].includes('Vacation Rentals')) {
        rentalData.title = titleMatch[1].trim();
        console.log(`[${new Date().toISOString()}] Extracted title from markdown: ${rentalData.title}`);
      } else {
        // Try to find title in h1 or first major heading
        const h1Match = pageData.markdown.match(/^#\s+(.+?)$/m);
        if (h1Match) {
          rentalData.title = h1Match[1].trim();
        } else {
          rentalData.title = titleFromMetadata;
        }
      }
    } else {
      rentalData.title = titleFromMetadata;
    }
    
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
      
      // Use title from parser if it found a better one (not generic Airbnb title)
      if (markdownData.title && !markdownData.title.includes('Airbnb:') && !markdownData.title.includes('Vacation Rentals')) {
        rentalData.title = markdownData.title;
        console.log(`[${new Date().toISOString()}] Using title from parser: ${rentalData.title}`);
      }
      
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
      const savedTitle = rentalData.title; // Preserve title we extracted
      const savedDescription = rentalData.description; // Preserve description (null for Airbnb)
      rentalData = { ...rentalData, ...markdownData };
      if (savedPrice) {
        rentalData.price = savedPrice;
      }
      // Preserve title if we found a good one
      if (savedTitle && !savedTitle.includes('Airbnb:') && !savedTitle.includes('Vacation Rentals')) {
        rentalData.title = savedTitle;
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
    
    // Extract title from markdown - look for the actual listing title
    // Skip generic "Airbnb:" titles
    const titleMatch = markdown.match(/^#\s+(.+?)$/m);
    if (titleMatch && !titleMatch[1].includes('Airbnb:') && !titleMatch[1].includes('Vacation Rentals')) {
      data.title = titleMatch[1].trim();
      console.log(`[${new Date().toISOString()}] AirbnbParser: Extracted title from markdown: ${data.title}`);
    } else {
      // Try to find title in the first few lines
      const lines = markdown.split('\n').slice(0, 20);
      for (const line of lines) {
        if (line.trim().startsWith('#') && !line.includes('Airbnb:') && !line.includes('Vacation Rentals')) {
          data.title = line.replace(/^#+\s*/, '').trim();
          console.log(`[${new Date().toISOString()}] AirbnbParser: Found title in markdown: ${data.title}`);
          break;
        }
      }
    }
    
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

