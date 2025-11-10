import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scrapes rental data from any rental website
 * Uses generic selectors that work across multiple platforms
 */
export async function scrapeRental(url) {
  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for dynamic content to load
    await page.waitForTimeout(3000);

    // Determine which site we're scraping (for source identification)
    const hostname = new URL(url).hostname.toLowerCase();
    const domain = hostname.replace('www.', '').split('.')[0];
    
    let rentalData = {
      url: url,
      source: getSourceName(hostname),
      scrapedAt: new Date().toISOString()
    };

    // Try site-specific scrapers first for better accuracy
    if (hostname.includes('vrbo')) {
      rentalData = { ...rentalData, ...await scrapeVRBO(page) };
    } else if (hostname.includes('booking')) {
      rentalData = { ...rentalData, ...await scrapeBooking(page) };
    } else if (hostname.includes('airbnb')) {
      rentalData = { ...rentalData, ...await scrapeAirbnb(page) };
    } else {
      // Generic scraper for any rental website
      rentalData = { ...rentalData, ...await scrapeGeneric(page) };
    }

    // Ensure images are included
    if (rentalData.images && rentalData.images.length > 0) {
      rentalData.imageUrls = rentalData.images;
    }

    return rentalData;

  } catch (error) {
    console.error('Error scraping rental:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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

/**
 * Scrape VRBO listing
 */
async function scrapeVRBO(page) {
  const data = {};

  try {
    // Title
    data.title = await page.locator('h1').first().textContent().catch(() => null) ||
                 await page.locator('[data-testid="listing-title"]').textContent().catch(() => null) ||
                 await page.locator('.listing-title').textContent().catch(() => null);

    // Description
    data.description = await page.locator('[data-testid="listing-description"]').textContent().catch(() => null) ||
                      await page.locator('.listing-description').textContent().catch(() => null) ||
                      await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);

    // Price per night
    const priceText = await page.locator('[data-testid="price"]').textContent().catch(() => null) ||
                     await page.locator('.price').first().textContent().catch(() => null) ||
                     await page.locator('[class*="price"]').first().textContent().catch(() => null);
    data.pricePerNight = extractPrice(priceText);

    // Bedrooms
    const bedroomsText = await page.locator('[data-testid="bedrooms"]').textContent().catch(() => null) ||
                        await page.locator('text=/bedroom/i').first().textContent().catch(() => null);
    data.bedrooms = extractNumber(bedroomsText);

    // Bathrooms
    const bathroomsText = await page.locator('[data-testid="bathrooms"]').textContent().catch(() => null) ||
                         await page.locator('text=/bathroom/i').first().textContent().catch(() => null);
    data.bathrooms = extractNumber(bathroomsText);

    // Guests
    const guestsText = await page.locator('[data-testid="guests"]').textContent().catch(() => null) ||
                      await page.locator('text=/sleeps|guests/i').first().textContent().catch(() => null);
    data.guests = extractNumber(guestsText);

    // Location
    data.location = await page.locator('[data-testid="location"]').textContent().catch(() => null) ||
                   await page.locator('.location').textContent().catch(() => null) ||
                   await page.locator('meta[property="og:locality"]').getAttribute('content').catch(() => null);

    // Images
    const imageElements = await page.locator('img[src*="vrbo"], img[data-src*="vrbo"], img[alt*="rental"], img[alt*="property"]').all();
    data.images = [];
    for (const img of imageElements.slice(0, 10)) { // Limit to 10 images
      const src = await img.getAttribute('src').catch(() => null) ||
                 await img.getAttribute('data-src').catch(() => null);
      if (src && !src.includes('logo') && !src.includes('icon')) {
        data.images.push(src.startsWith('http') ? src : new URL(src, page.url()).href);
      }
    }

    // Rating
    const ratingText = await page.locator('[data-testid="rating"]').textContent().catch(() => null) ||
                      await page.locator('[class*="rating"]').first().textContent().catch(() => null);
    data.rating = extractRating(ratingText);

  } catch (error) {
    console.error('Error scraping VRBO:', error);
  }

  return data;
}

/**
 * Scrape Booking.com listing
 */
async function scrapeBooking(page) {
  const data = {};

  try {
    // Title
    data.title = await page.locator('h2[data-testid="title"]').textContent().catch(() => null) ||
                 await page.locator('h2.pp-header__title').textContent().catch(() => null) ||
                 await page.locator('h1').first().textContent().catch(() => null);

    // Description
    data.description = await page.locator('[data-testid="property-description"]').textContent().catch(() => null) ||
                      await page.locator('#property_description_content').textContent().catch(() => null);

    // Price per night
    const priceText = await page.locator('[data-testid="price-and-discounted-price"]').textContent().catch(() => null) ||
                     await page.locator('.prco-valign-middle-helper').first().textContent().catch(() => null);
    data.pricePerNight = extractPrice(priceText);

    // Property details
    const detailsText = await page.locator('[data-testid="property-highlights"]').textContent().catch(() => null) ||
                       await page.locator('.hp_property_description_building').textContent().catch(() => null);
    
    if (detailsText) {
      data.bedrooms = extractNumber(detailsText.match(/bedroom[s]?/i)?.[0]);
      data.bathrooms = extractNumber(detailsText.match(/bathroom[s]?/i)?.[0]);
      data.guests = extractNumber(detailsText.match(/guest[s]?|sleeps/i)?.[0]);
    }

    // Location
    data.location = await page.locator('[data-testid="address"]').textContent().catch(() => null) ||
                   await page.locator('.hp_address_subtitle').textContent().catch(() => null);

    // Images
    const imageElements = await page.locator('img[src*="booking"], img[data-src*="booking"], img[alt*="hotel"], img[alt*="property"]').all();
    data.images = [];
    for (const img of imageElements.slice(0, 10)) {
      const src = await img.getAttribute('src').catch(() => null) ||
                 await img.getAttribute('data-src').catch(() => null);
      if (src && !src.includes('logo') && !src.includes('icon')) {
        data.images.push(src.startsWith('http') ? src : new URL(src, page.url()).href);
      }
    }

    // Rating
    const ratingText = await page.locator('[data-testid="review-score-badge"]').textContent().catch(() => null) ||
                      await page.locator('.bui-review-score__badge').textContent().catch(() => null);
    data.rating = extractRating(ratingText);

  } catch (error) {
    console.error('Error scraping Booking.com:', error);
  }

  return data;
}

/**
 * Scrape Airbnb listing
 */
async function scrapeAirbnb(page) {
  const data = {};

  try {
    // Title
    data.title = await page.locator('h1').first().textContent().catch(() => null) ||
                 await page.locator('[data-testid="listing-title"]').textContent().catch(() => null);

    // Description
    data.description = await page.locator('[data-testid="listing-description"]').textContent().catch(() => null) ||
                      await page.locator('._14i3z6h').textContent().catch(() => null);

    // Price per night
    const priceText = await page.locator('[data-testid="price"]').textContent().catch(() => null) ||
                     await page.locator('._tyxjp1').textContent().catch(() => null);
    data.pricePerNight = extractPrice(priceText);

    // Property details
    const details = await page.locator('._cv5qq4').all().catch(() => []);
    for (const detail of details) {
      const text = await detail.textContent().catch(() => '');
      if (text.includes('bedroom')) data.bedrooms = extractNumber(text);
      if (text.includes('bath')) data.bathrooms = extractNumber(text);
      if (text.includes('guest') || text.includes('sleeps')) data.guests = extractNumber(text);
    }

    // Location
    data.location = await page.locator('[data-testid="listing-location"]').textContent().catch(() => null) ||
                   await page.locator('._1p8iqzw').textContent().catch(() => null);

    // Images
    const imageElements = await page.locator('img[src*="airbnb"], img[data-src*="airbnb"], img[alt*="listing"]').all();
    data.images = [];
    for (const img of imageElements.slice(0, 10)) {
      const src = await img.getAttribute('src').catch(() => null) ||
                 await img.getAttribute('data-src').catch(() => null);
      if (src && !src.includes('logo') && !src.includes('icon') && src.includes('airbnb')) {
        data.images.push(src.startsWith('http') ? src : new URL(src, page.url()).href);
      }
    }

    // Rating
    const ratingText = await page.locator('[data-testid="rating"]').textContent().catch(() => null) ||
                      await page.locator('._1fwiw8gv').textContent().catch(() => null);
    data.rating = extractRating(ratingText);

  } catch (error) {
    console.error('Error scraping Airbnb:', error);
  }

  return data;
}

/**
 * Extract price from text
 */
function extractPrice(text) {
  if (!text) return null;
  const match = text.match(/[\$£€]?[\d,]+/);
  return match ? match[0].replace(/[^\d]/g, '') : null;
}

/**
 * Extract number from text
 */
function extractNumber(text) {
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Extract rating from text
 */
function extractRating(text) {
  if (!text) return null;
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Generic scraper for any rental website
 * Uses common patterns and fallbacks to extract data
 */
async function scrapeGeneric(page) {
  const data = {};

  try {
    // Title - try multiple common selectors
    data.title = await trySelectors(page, [
      'h1',
      'h2',
      '[data-testid*="title"]',
      '[class*="title"]',
      'meta[property="og:title"]',
      'title'
    ], 'textContent', 'getAttribute');

    // Description - try multiple selectors
    data.description = await trySelectors(page, [
      '[data-testid*="description"]',
      '[class*="description"]',
      'meta[name="description"]',
      'meta[property="og:description"]',
      '[id*="description"]',
      'p'
    ], 'textContent', 'getAttribute');

    // Price - look for price patterns in text
    const priceSelectors = [
      '[data-testid*="price"]',
      '[class*="price"]',
      '[id*="price"]',
      'text=/$',
      'text=/€',
      'text=/£'
    ];
    const priceText = await trySelectors(page, priceSelectors, 'textContent');
    data.pricePerNight = extractPrice(priceText) || await extractPriceFromPage(page);

    // Property details - search for common patterns
    const pageText = await page.textContent('body').catch(() => '');
    
    // Bedrooms
    const bedroomMatch = pageText.match(/(\d+)\s*(bedroom|bed|br|beds?)/i);
    data.bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : null;

    // Bathrooms
    const bathroomMatch = pageText.match(/(\d+)\s*(bathroom|bath|ba|baths?)/i);
    data.bathrooms = bathroomMatch ? parseInt(bathroomMatch[1]) : null;

    // Guests/Sleeps
    const guestMatch = pageText.match(/(\d+)\s*(guest|sleeps?|accommodates|people|person)/i);
    data.guests = guestMatch ? parseInt(guestMatch[1]) : null;

    // Location
    data.location = await trySelectors(page, [
      '[data-testid*="location"]',
      '[data-testid*="address"]',
      '[class*="location"]',
      '[class*="address"]',
      '[id*="location"]',
      '[id*="address"]',
      'meta[property="og:locality"]',
      'address'
    ], 'textContent', 'getAttribute');

    // Images - get all images and filter
    const imageElements = await page.locator('img').all();
    data.images = [];
    const seenUrls = new Set();
    
    for (const img of imageElements.slice(0, 20)) {
      try {
        const src = await img.getAttribute('src').catch(() => null) ||
                   await img.getAttribute('data-src').catch(() => null) ||
                   await img.getAttribute('data-lazy-src').catch(() => null);
        
        if (src) {
          const fullUrl = src.startsWith('http') ? src : new URL(src, page.url()).href;
          
          // Filter out logos, icons, and small images
          if (!fullUrl.includes('logo') && 
              !fullUrl.includes('icon') && 
              !fullUrl.includes('avatar') &&
              !fullUrl.includes('button') &&
              !seenUrls.has(fullUrl)) {
            
            // Check image dimensions if possible
            const width = await img.evaluate(el => el.naturalWidth || el.width).catch(() => 0);
            if (width > 200) { // Only include reasonably sized images
              data.images.push(fullUrl);
              seenUrls.add(fullUrl);
              if (data.images.length >= 10) break;
            }
          }
        }
      } catch (e) {
        // Skip this image
      }
    }

    // Rating
    const ratingText = await trySelectors(page, [
      '[data-testid*="rating"]',
      '[class*="rating"]',
      '[class*="review"]',
      '[id*="rating"]',
      'text=/[0-9.]+.*star/i'
    ], 'textContent');
    data.rating = extractRating(ratingText);

  } catch (error) {
    console.error('Error in generic scraper:', error);
  }

  return data;
}

/**
 * Try multiple selectors until one works
 */
async function trySelectors(page, selectors, method = 'textContent', altMethod = null) {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      const exists = await element.count();
      if (exists > 0) {
        if (method === 'textContent') {
          const text = await element.textContent();
          if (text && text.trim()) return text.trim();
        } else if (method === 'getAttribute' || altMethod === 'getAttribute') {
          // For meta tags, get the 'content' attribute
          if (selector.includes('meta')) {
            const attr = await element.getAttribute('content');
            if (attr && attr.trim()) return attr.trim();
          } else {
            // For other elements, try textContent
            const text = await element.textContent();
            if (text && text.trim()) return text.trim();
          }
        }
      }
    } catch (e) {
      // Try next selector
    }
  }
  return null;
}

/**
 * Extract price from page using multiple strategies
 */
async function extractPriceFromPage(page) {
  try {
    // Look for price in meta tags
    const ogPrice = await page.locator('meta[property="product:price:amount"]').getAttribute('content').catch(() => null);
    if (ogPrice) return extractPrice(ogPrice);

    // Look for structured data (JSON-LD)
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of scripts) {
      try {
        const jsonText = await script.textContent();
        const json = JSON.parse(jsonText);
        if (json.offers?.price) return extractPrice(String(json.offers.price));
        if (json.price) return extractPrice(String(json.price));
      } catch (e) {
        // Not valid JSON, skip
      }
    }

    // Look for price in visible text
    const bodyText = await page.textContent('body').catch(() => '');
    const priceMatches = bodyText.match(/[\$£€]\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/);
    if (priceMatches) return extractPrice(priceMatches[0]);
  } catch (e) {
    // Fallback
  }
  return null;
}

/**
 * Download images (optional - for local storage)
 */
async function downloadImages(imageUrls) {
  const downloaded = [];
  const downloadDir = path.join(__dirname, '../downloads');
  
  try {
    await fs.mkdir(downloadDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
    try {
      const response = await axios.get(imageUrls[i], { 
        responseType: 'arraybuffer',
        timeout: 10000 
      });
      const filename = `image_${Date.now()}_${i}.jpg`;
      const filepath = path.join(downloadDir, filename);
      await fs.writeFile(filepath, response.data);
      downloaded.push(filepath);
    } catch (error) {
      console.error(`Failed to download image ${i}:`, error.message);
    }
  }

  return downloaded;
}
