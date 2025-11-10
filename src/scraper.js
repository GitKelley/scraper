import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Browsers are installed during build via postinstall script
// We just need to find the correct path to the executable

/**
 * Scrapes rental data from any rental website
 * Uses generic selectors that work across multiple platforms
 */
export async function scrapeRental(url) {
  let browser = null;
  
  try {
    // Set Playwright browsers path - only for Render (Linux)
    // On Windows, Playwright uses its default path
    const isRender = process.env.RENDER || process.platform === 'linux';
    let browsersPath = null;
    let executablePath = null;
    
    // Allow headed mode for local debugging or Linux servers (set HEADED=true environment variable)
    // On Linux, headed mode requires Xvfb (virtual display server) - handled by Docker
    const headed = process.env.HEADED === 'true' || process.env.HEADED === '1';
    // Running in headed mode if HEADED env var is set
    
    if (isRender) {
      // In Docker, Playwright installs browsers to ~/.cache/ms-playwright by default
      // Let Playwright use its default path - don't override it
      const defaultPath = path.join(process.env.HOME || '/root', '.cache/ms-playwright');
      
      // Try to find the browser executable in common locations (Docker/Linux)
      // For headed mode, we need chromium (not headless_shell)
      const possiblePaths = [
        // Headed mode - full chromium (check multiple version directories)
        path.join(defaultPath, 'chromium-1194/chrome-linux/chrome'),
        path.join(defaultPath, 'chromium-1200/chrome-linux/chrome'),
        path.join(defaultPath, 'chromium-1210/chrome-linux/chrome'),
        // Headless mode fallback
        path.join(defaultPath, 'chromium_headless_shell-1194/chrome-linux/headless_shell'),
        path.join(defaultPath, 'chromium_headless_shell-1194/headless_shell-linux/headless_shell')
      ];
      
      for (const possiblePath of possiblePaths) {
        try {
          await fs.access(possiblePath);
          executablePath = possiblePath;
          break;
        } catch (e) {
          // Try next path
        }
      }
      
      // If not found, try to find any chromium directory
      if (!executablePath) {
        try {
          const files = await fs.readdir(defaultPath);
          const chromiumDirs = files.filter(f => f.startsWith('chromium-') && !f.includes('headless'));
          for (const dir of chromiumDirs) {
            const chromePath = path.join(defaultPath, dir, 'chrome-linux/chrome');
            try {
              await fs.access(chromePath);
              executablePath = chromePath;
              break;
            } catch (e) {
              // Try next
            }
          }
        } catch (e) {
        }
      }
      
      if (!executablePath) {
      }
    }
    
    const launchOptions = {
      headless: !headed,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled', // Hide automation flags
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    };
    
    // Only use --single-process on Linux (Render)
    if (isRender) {
      launchOptions.args.push('--single-process');
    }
    
    if (headed) {
    }
    
    // Use executablePath if we found it (bypasses Playwright's path resolution)
    // On Windows, let Playwright use its default path
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    browser = await chromium.launch(launchOptions);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      // Add more realistic browser properties
      permissions: [],
      geolocation: { longitude: -74.006, latitude: 40.7128 },
      colorScheme: 'light',
      // Add extra HTTP headers to look more like a real browser
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    });

    const page = await context.newPage();
    
    // Listen for console messages and errors (set up before navigation)
    // Only log errors, not all console messages (too noisy)
    page.on('pageerror', error => console.error('Page error:', error.message));
    
    // Remove webdriver property to avoid detection
    // MUST be called before page.goto() - init scripts run before page loads
    try {
      await page.addInitScript(() => {
        // Remove webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // Add chrome object
        window.chrome = {
          runtime: {},
        };
        
        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });
    } catch (e) {
      console.log('Warning: Could not add init script (page may already be loaded):', e.message);
      // Continue anyway - stealth measures may not be as effective but scraping can still work
    }
    
    const timeout = process.env.NODE_ENV === 'production' ? 30000 : 10000;
    
    // Navigate to the page - use domcontentloaded for faster navigation
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    
    // Wait for dynamic content to render (10 seconds)
    await page.waitForTimeout(10000);

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
    // Title - extract from h1 element
    try {
      data.title = await page.locator('h1').first().textContent({ timeout: 1000 }).catch(() => null);
      if (data.title) {
        data.title = data.title.trim();
      }
    } catch (e) {
      data.title = null;
    }

    // Description - extract from content-markup divs
    try {
      // Get all description content from content-markup divs
      const descriptionElements = await page.locator('[data-stid="content-markup"]').all({ timeout: 1000 }).catch(() => []);
      const descriptionParts = [];
      for (const elem of descriptionElements) {
        const text = await elem.textContent({ timeout: 500 }).catch(() => null);
        if (text && text.trim()) {
          descriptionParts.push(text.trim());
        }
      }
      data.description = descriptionParts.length > 0 ? descriptionParts.join(' ').trim() : null;
      if (data.description && data.description.length > 2000) {
        data.description = data.description.substring(0, 2000) + '...';
      }
    } catch (e) {
      data.description = null;
    }

    // Price - extract from price-summary element
    try {
      const priceText = await page.locator('[data-test-id="price-summary"] [data-test-id="price-summary-message-line"] .uitk-text-emphasis-theme').first().textContent({ timeout: 1000 }).catch(() => null);
      data.pricePerNight = extractPrice(priceText);
    } catch (e) {
      data.pricePerNight = null;
    }

    // Bedrooms - extract from title text or page content
    try {
      // Try to extract from title first (e.g., "7 Bedroom House")
      const titleText = data.title || '';
      const bedroomsMatch = titleText.match(/(\d+)\s*bedroom/i) || titleText.match(/(\d+)\s*bed/i);
      if (bedroomsMatch) {
        data.bedrooms = parseInt(bedroomsMatch[1], 10);
      } else {
        // Fallback: search page for bedroom text
        const bedroomsText = await page.locator('text=/\\d+\\s*bedroom/i').first().textContent({ timeout: 1000 }).catch(() => null) ||
                              await page.locator('text=/\\d+\\s*bed/i').first().textContent({ timeout: 1000 }).catch(() => null);
        data.bedrooms = extractNumber(bedroomsText);
      }
    } catch (e) {
      data.bedrooms = null;
    }

    // Bathrooms - extract from title text or page content
    try {
      // Try to extract from title first (e.g., "7 Bedroom House 8 Bath")
      const titleText = data.title || '';
      const bathroomsMatch = titleText.match(/(\d+)\s*bathroom/i) || titleText.match(/(\d+)\s*bath/i);
      if (bathroomsMatch) {
        data.bathrooms = parseInt(bathroomsMatch[1], 10);
      } else {
        // Fallback: search page for bathroom text
        const bathroomsText = await page.locator('text=/\\d+\\s*bathroom/i').first().textContent({ timeout: 1000 }).catch(() => null) ||
                               await page.locator('text=/\\d+\\s*bath/i').first().textContent({ timeout: 1000 }).catch(() => null);
        data.bathrooms = extractNumber(bathroomsText);
      }
    } catch (e) {
      data.bathrooms = null;
    }

    // Sleeps - extract from bedrooms heading span (e.g., "7 bedrooms (sleeps 14)")
    try {
      // Look for the span inside the h3 heading that contains bedrooms and sleeps
      // Structure: <h3>7 bedrooms <span>(sleeps 14)</span></h3>
      const sleepsText = await page.locator('h3.uitk-heading-5:has-text("bedroom") span.uitk-text').first().textContent({ timeout: 1000 }).catch(() => null) ||
                         await page.locator('h3:has-text("bedroom") span:has-text("sleeps")').first().textContent({ timeout: 1000 }).catch(() => null) ||
                         await page.locator('text=/\\(sleeps\\s+\\d+\\)/i').first().textContent({ timeout: 1000 }).catch(() => null);
      data.sleeps = extractNumber(sleepsText);
    } catch (e) {
      data.sleeps = null;
    }

    // Location - extract from content-hotel-address
    try {
      data.location = await page.locator('[data-stid="content-hotel-address"]').first().textContent({ timeout: 1000 }).catch(() => null);
      if (data.location) {
        data.location = data.location.trim();
      }
    } catch (e) {
      data.location = null;
    }

    // Images - extract from media.vrbo.com images
    try {
      const imageElements = await page.locator('img[src*="media.vrbo.com"]').all({ timeout: 1000 }).catch(() => []);
      data.images = [];
      const seenUrls = new Set();
      for (let i = 0; i < Math.min(imageElements.length, 15); i++) { // Limit to 15 images
        try {
          const img = imageElements[i];
          const src = await img.getAttribute('src', { timeout: 500 }).catch(() => null) ||
                      await img.getAttribute('data-src', { timeout: 500 }).catch(() => null);
          
          if (src && src.trim().length > 0) {
            const fullUrl = src.startsWith('http') ? src : new URL(src, page.url()).href;
            // Filter out logos, icons, and duplicates
            if (!fullUrl.includes('logo') && 
                !fullUrl.includes('icon') && 
                !fullUrl.includes('pictogram') &&
                !fullUrl.includes('avatar') &&
                !seenUrls.has(fullUrl)) {
              data.images.push(fullUrl);
              seenUrls.add(fullUrl);
            }
          }
        } catch (e) {
          // Skip this image
        }
      }
    } catch (e) {
      data.images = [];
    }

    // Rating - extract from badge element
    try {
      const ratingText = await page.locator('.uitk-badge-base-text').first().textContent({ timeout: 1000 }).catch(() => null);
      data.rating = extractRating(ratingText);
    } catch (e) {
      data.rating = null;
    }



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
      data.sleeps = extractNumber(detailsText.match(/sleeps/i)?.[0]);
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
      if (text.includes('sleeps')) data.sleeps = extractNumber(text);
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

    // Sleeps
    const sleepsMatch = pageText.match(/(\d+)\s*sleeps?/i);
    data.sleeps = sleepsMatch ? parseInt(sleepsMatch[1]) : null;

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
