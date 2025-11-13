import axios from 'axios';
import { parseBodyDetailsWrapper } from './airbnb-parsers/parse.js';
import { fromDetails } from './airbnb-parsers/standardize.js';
import { getPrice, extractPriceAmount } from './airbnb-parsers/price.js';

/**
 * Alternative scraper using Airbnb's internal API/HTML parsing
 * This is a fallback when Firecrawl fails due to bot detection
 * 
 * Note: This approach reverse-engineers Airbnb's API and may violate their ToS
 * Based on approach from pybnb/pyairbnb projects
 */

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html) {
  if (!html || typeof html !== 'string') return '';
  // Remove HTML tags and decode HTML entities
  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Trim whitespace
}

/**
 * Reverse geocode coordinates to city/state using OpenStreetMap Nominatim API
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string|null>} City, State or null if geocoding fails
 */
async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) return null;
  
  try {
    // Use OpenStreetMap Nominatim API (free, no API key required)
    // Use zoom level 18 for more detailed city-level results
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.airbnb.com/'
      },
      timeout: 10000,
    });
    
    const data = response.data;
    if (data && data.address) {
      const address = data.address;
      
      // Try multiple fields for city (in order of preference)
      const city = address.city || 
                   address.town || 
                   address.village || 
                   address.municipality || 
                   address.city_district ||
                   address.suburb ||
                   address.neighbourhood ||
                   address.county; // Sometimes county is the best we can get
      
      // Try multiple fields for state
      const state = address.state || 
                    address.region || 
                    address.state_district ||
                    address.province;
      
      // If we have both city and state, return "City, State"
      if (city && state) {
        // Filter out generic names like "County" from city
        const cleanCity = city.replace(/\s+County$/i, '');
        return `${cleanCity}, ${state}`;
      } 
      // If we only have city, try to get state from a second call with lower zoom
      else if (city && !state) {
        // Try again with lower zoom to get state
        try {
          const stateUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
          await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit delay
          const stateResponse = await axios.get(stateUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000,
          });
          const stateData = stateResponse.data;
          if (stateData?.address) {
            const foundState = stateData.address.state || stateData.address.region;
            if (foundState) {
              return `${city}, ${foundState}`;
            }
          }
        } catch (e) {
          // If second call fails, just return city
        }
        return city;
      } 
      // If we only have state, return it (but this is less ideal)
      else if (state) {
        return state;
      }
    }
    
    return null;
  } catch (error) {
    // If we get a 403, it might be rate limiting - just return null and use coordinates
    if (error.response?.status === 403 || error.response?.status === 429) {
      console.log(`[Geocoding] Rate limited or blocked, using coordinates instead`);
    } else {
      console.log(`[Geocoding] Failed to reverse geocode ${latitude}, ${longitude}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Extract listing ID from Airbnb URL
 */
function extractListingId(url) {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/rooms\/(\d+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch Airbnb API key from homepage
 * The API key is embedded in the HTML/JS
 */
async function fetchAirbnbApiKey(proxyUrl = null) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    const config = {
      headers,
      timeout: 10000,
      maxRedirects: 5
    };

    if (proxyUrl) {
      config.proxy = {
        host: proxyUrl.split(':')[0],
        port: parseInt(proxyUrl.split(':')[1] || '80')
      };
    }

    const response = await axios.get('https://www.airbnb.com/', config);
    const html = response.data;

    // Try to find API key in various places
    // It's often in window.__REACT_QUERY_STATE__ or similar
    const apiKeyMatch = html.match(/["']apiKey["']:\s*["']([^"']+)["']/) ||
                       html.match(/X-Airbnb-Api-Key["']:\s*["']([^"']+)["']/) ||
                       html.match(/api_key["']:\s*["']([^"']+)["']/);

    if (apiKeyMatch) {
      return apiKeyMatch[1];
    }

    // Try to find in script tags
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        const keyMatch = script.match(/["']apiKey["']:\s*["']([^"']+)["']/);
        if (keyMatch) {
          return keyMatch[1];
        }
      }
    }

    // Fallback: try common API keys (these change frequently)
    // This is a temporary workaround - ideally we'd extract it dynamically
    return null;
  } catch (error) {
    console.error('Error fetching Airbnb API key:', error.message);
    return null;
  }
}

/**
 * Fetch listing details by parsing HTML page directly
 * Airbnb embeds listing data in script tags, so we don't need the API key
 */
async function fetchListingViaAPI(listingId, apiKey = null, proxyUrl = null) {
  try {
    // Fetch the listing page HTML directly
    // Airbnb embeds all listing data in the HTML, so we don't need API calls
    const listingUrl = `https://www.airbnb.com/rooms/${listingId}`;
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    const config = {
      headers,
      timeout: 15000,
      maxRedirects: 5
    };

    if (proxyUrl) {
      config.proxy = {
        host: proxyUrl.split(':')[0],
        port: parseInt(proxyUrl.split(':')[1] || '80')
      };
    }

    console.log(`[Airbnb API] Fetching listing page: ${listingUrl}`);
    const listingResponse = await axios.get(listingUrl, config);
    const listingHtml = listingResponse.data;
    
    console.log(`[Airbnb API] Page fetched, length: ${listingHtml.length} chars`);
    
    // Use the pyairbnb parsing approach - extract from #data-deferred-state-0
    console.log('[Airbnb API] Parsing embedded data from #data-deferred-state-0...');
    try {
      const { detailsData, priceDependencyInput } = parseBodyDetailsWrapper(listingHtml);
      console.log('[Airbnb API] Successfully extracted details data');
      
      // Standardize the data using pyairbnb format
      const standardized = fromDetails(detailsData);
      console.log('[Airbnb API] Successfully standardized data');
      
      // Try to extract price if we have the required data
      let price = null;
      if (priceDependencyInput?.api_key && priceDependencyInput?.product_id && priceDependencyInput?.impression_id) {
        try {
          console.log('[Airbnb API] Attempting to fetch price...');
          // Get cookies from the response headers
          const setCookieHeaders = listingResponse.headers['set-cookie'] || [];
          const cookies = {};
          
          // Parse set-cookie headers into a cookies object
          if (Array.isArray(setCookieHeaders)) {
            for (const cookieHeader of setCookieHeaders) {
              const cookieParts = cookieHeader.split(';')[0].split('=');
              if (cookieParts.length === 2) {
                cookies[cookieParts[0].trim()] = cookieParts[1].trim();
              }
            }
          }
          
          const priceData = await getPrice(
            priceDependencyInput.api_key,
            cookies,
            priceDependencyInput.impression_id,
            priceDependencyInput.product_id,
            null, // checkIn - optional
            null, // checkOut - optional
            1, // adults
            'USD', // currency
            'en', // language
            proxyUrl
          );
          
          // Extract price from the main price data
          const priceString = priceData.main?.price || priceData.main?.originalPrice || priceData.main?.discountedPrice;
          if (priceString) {
            price = extractPriceAmount(priceString);
            console.log(`[Airbnb API] Extracted price: $${price}`);
          }
        } catch (priceError) {
          console.log(`[Airbnb API] Price extraction failed (non-critical): ${priceError.message}`);
          // Continue without price - it's optional
        }
      }
      
      // Convert coordinates to city/state if available
      let location = null;
      if (standardized.coordinates?.latitude && standardized.coordinates?.longitude) {
        try {
          console.log(`[Airbnb API] Reverse geocoding coordinates ${standardized.coordinates.latitude}, ${standardized.coordinates.longitude}...`);
          // Add a small delay to respect Nominatim rate limits (1 req/sec)
          await new Promise(resolve => setTimeout(resolve, 1100));
          location = await reverseGeocode(standardized.coordinates.latitude, standardized.coordinates.longitude);
          if (location) {
            console.log(`[Airbnb API] Geocoded location: ${location}`);
          } else {
            // Fallback to coordinates if geocoding fails
            location = `${standardized.coordinates.latitude}, ${standardized.coordinates.longitude}`;
            console.log(`[Airbnb API] Geocoding unavailable, using coordinates`);
          }
        } catch (geocodeError) {
          console.log(`[Airbnb API] Geocoding failed, using coordinates: ${geocodeError.message}`);
          location = `${standardized.coordinates.latitude}, ${standardized.coordinates.longitude}`;
        }
      }
      
      // Convert to our rental data format
      const rentalData = {
        url: `https://www.airbnb.com/rooms/${listingId}`,
        source: 'Airbnb',
        scrapedAt: new Date().toISOString(),
        title: standardized.title || '',
        description: stripHtmlTags(standardized.description || ''),
        bedrooms: standardized.bedrooms || null,
        bathrooms: standardized.bathrooms || null,
        sleeps: standardized.person_capacity || null,
        location: location,
        images: standardized.images?.map(img => img.url || img).filter(Boolean) || [],
        amenities: standardized.amenities?.flatMap(group => 
          group.values?.map(amenity => amenity.title || amenity).filter(Boolean) || []
        ) || [],
        price: price,
      };
      
      console.log(`[Airbnb API] Extracted: title="${rentalData.title}", bedrooms=${rentalData.bedrooms}, bathrooms=${rentalData.bathrooms}, sleeps=${rentalData.sleeps}, location=${rentalData.location || 'N/A'}, price=$${rentalData.price || 'N/A'}`);
      
      return rentalData;
    } catch (parseError) {
      console.error(`[Airbnb API] Parsing failed: ${parseError.message}`);
      // Fallback to old method
      console.log('[Airbnb API] Trying fallback HTML parsing...');
      return parseListingHTML(listingHtml, listingId);
    }
  } catch (error) {
    console.error('Error fetching listing via API:', error.message);
    throw error;
  }
}

/**
 * Parse embedded listing data from Airbnb's page
 * Recursively searches through the data structure to find listing info
 */
function parseEmbeddedListingData(data, listingId) {
  const rentalData = {
    url: `https://www.airbnb.com/rooms/${listingId}`,
    source: 'Airbnb',
    scrapedAt: new Date().toISOString()
  };

  // Helper function to recursively search for listing data
  function findListingData(obj, depth = 0) {
    if (depth > 10 || !obj || typeof obj !== 'object') return null;
    
    // Check if this object looks like listing data
    if (obj.name || obj.title || obj.pdpListingDetail) {
      return obj.pdpListingDetail || obj;
    }
    
    // Check common keys
    if (obj.listing) return obj.listing;
    if (obj.pdpListingDetail) return obj.pdpListingDetail;
    if (obj.data?.pdpListingDetail) return obj.data.pdpListingDetail;
    
    // Recursively search arrays and objects
    for (const key in obj) {
      if (key === 'pdpListingDetail' || key === 'listing') {
        return obj[key];
      }
      const found = findListingData(obj[key], depth + 1);
      if (found) return found;
    }
    
    return null;
  }

  try {
    // Try to find listing data recursively
    const listing = findListingData(data);
    
    if (listing) {
      console.log('[Airbnb API] Found listing data structure');
      
      // Extract title
      rentalData.title = listing.name || listing.title || listing.heading || 
                        listing.publicName || listing.listingName;
      
      // Extract description
      rentalData.description = stripHtmlTags(listing.description || listing.summary || 
                              listing.publicDescription || listing.space || '');
      
      // Extract price (try multiple paths)
      rentalData.price = listing.price?.rate?.amount || 
                        listing.pricingQuote?.structuredStayDisplayPrice?.primaryLine?.price ||
                        listing.price?.amount ||
                        listing.nightlyPrice?.amount;
      
      // Extract property details
      rentalData.bedrooms = listing.bedrooms || listing.bedroomCount;
      rentalData.bathrooms = listing.bathrooms || listing.bathroomCount || listing.bathroomLabel;
      rentalData.sleeps = listing.personCapacity || listing.guests || listing.accommodates ||
                         listing.guestCapacity;
      
      // Extract location
      rentalData.location = listing.city || listing.location?.city || 
                           listing.address || listing.location?.address;
      
      // Extract images
      if (listing.photos) {
        rentalData.images = listing.photos.map(p => 
          p.large || p.xlarge || p.medium || p.picture || p.url || p
        ).filter(Boolean);
      } else if (listing.images) {
        rentalData.images = listing.images.map(img => 
          img.large || img.xlarge || img.medium || img.url || img
        ).filter(Boolean);
      }
      
      // Extract amenities
      if (listing.amenities) {
        rentalData.amenities = listing.amenities.map(a => 
          a.name || a.title || a.label || a
        ).filter(Boolean);
      } else if (listing.amenityIds) {
        // Sometimes amenities are just IDs
        rentalData.amenities = listing.amenityIds;
      }
    } else {
      // Try searching in queries structure (React Query format)
      const queries = data?.queries || data?.queryClient?.queries || {};
      for (const query of Object.values(queries)) {
        const state = query?.state?.data || query?.data;
        const found = findListingData(state);
        if (found) {
          rentalData.title = found.name || found.title;
          rentalData.description = stripHtmlTags(found.description || found.summary || '');
          rentalData.price = found.price?.rate?.amount;
          rentalData.bedrooms = found.bedrooms;
          rentalData.bathrooms = found.bathrooms;
          rentalData.sleeps = found.personCapacity || found.guests;
          rentalData.location = found.city || found.location?.city;
          rentalData.images = found.photos?.map(p => p.large || p.xlarge || p.medium) || [];
          rentalData.amenities = found.amenities?.map(a => a.name || a) || [];
          break;
        }
      }
    }
  } catch (e) {
    console.error('[Airbnb API] Error parsing embedded data structure:', e.message);
  }

  return rentalData;
}

/**
 * Parse listing data from HTML (fallback)
 * Extracts data from embedded JSON in script tags
 */
function parseListingHTML(html, listingId) {
  const rentalData = {
    url: `https://www.airbnb.com/rooms/${listingId}`,
    source: 'Airbnb',
    scrapedAt: new Date().toISOString()
  };

  // Try to find embedded JSON data in script tags
  // Airbnb embeds listing data in various formats
  const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
  
  if (scriptMatches) {
    for (const script of scriptMatches) {
      // Look for JSON-LD structured data
      if (script.includes('application/ld+json')) {
        try {
          const jsonMatch = script.match(/{[\s\S]+}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            if (jsonData['@type'] === 'Product' || jsonData.name) {
              rentalData.title = jsonData.name;
              rentalData.description = stripHtmlTags(jsonData.description || '');
              if (jsonData.offers?.price) {
                rentalData.price = parseInt(jsonData.offers.price);
              }
            }
          }
        } catch (e) {
          // Continue to next script
        }
      }

      // Look for React Query State or Bootstrap State
      if (script.includes('__REACT_QUERY_STATE__') || script.includes('__BOOTSTRAP_STATE__')) {
        try {
          const jsonMatch = script.match(/=\s*({[\s\S]+?});/);
          if (jsonMatch) {
            const stateData = JSON.parse(jsonMatch[1]);
            const parsed = parseEmbeddedListingData(stateData, listingId);
            if (parsed.title) {
              return parsed;
            }
          }
        } catch (e) {
          // Continue
        }
      }

      // Look for pdpListingDetail in the script
      if (script.includes('pdpListingDetail') || script.includes('listing')) {
        try {
          const jsonMatch = script.match(/({[\s\S]*"pdpListingDetail"[\s\S]*?})/);
          if (jsonMatch) {
            const listingData = JSON.parse(jsonMatch[1]);
            const parsed = parseEmbeddedListingData(listingData, listingId);
            if (parsed.title) {
              return parsed;
            }
          }
        } catch (e) {
          // Continue
        }
      }
    }
  }

  // Fallback: Try regex patterns for common data
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i) || 
                    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/["']name["']:\s*["']([^"']+)["']/i);
  if (titleMatch && !titleMatch[1].includes('Airbnb:') && !titleMatch[1].includes('Vacation Rentals')) {
    rentalData.title = titleMatch[1].trim();
  }

  return rentalData;
}

/**
 * Main function to scrape Airbnb listing using internal API
 */
export async function scrapeAirbnbViaAPI(url, proxyUrl = null) {
  const listingId = extractListingId(url);
  
  if (!listingId) {
    throw new Error('Could not extract listing ID from URL');
  }

  try {
    const rentalData = await fetchListingViaAPI(listingId, null, proxyUrl);
    
    if (!rentalData.title && !rentalData.description) {
      throw new Error('No data extracted from API');
    }

    return rentalData;
  } catch (error) {
    console.error('Airbnb API scraping failed:', error.message);
    throw error;
  }
}

