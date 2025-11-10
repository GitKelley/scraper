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
    
    if (isRender) {
      browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/render/project/.cache/ms-playwright';
      process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
      process.env.PW_BROWSERS_PATH = browsersPath;
      
      // Try to find the browser executable in common locations (Render/Linux)
      const possiblePaths = [
        `${browsersPath}/chromium_headless_shell-1194/chrome-linux/headless_shell`,
        `${browsersPath}/chromium_headless_shell-1194/headless_shell-linux/headless_shell`,
        `${browsersPath}/chromium-1194/chrome-linux/chrome`
      ];
      
      for (const possiblePath of possiblePaths) {
        try {
          await fs.access(possiblePath);
          executablePath = possiblePath;
          console.log('Found browser executable at:', executablePath);
          break;
        } catch (e) {
          // Try next path
        }
      }
    }
    
    // Allow headed mode for local debugging or Linux servers (set HEADED=true environment variable)
    // On Linux, headed mode requires Xvfb (virtual display server) - handled by xvfb-run
    const headed = process.env.HEADED === 'true' || process.env.HEADED === '1';
    
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
      console.log('Running in HEADED mode - browser window will be visible');
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
    
    // Remove webdriver property to avoid detection
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
    
    console.log(`Navigating to: ${url}`);
    // Use shorter timeout for faster testing
    const timeout = process.env.NODE_ENV === 'production' ? 60000 : 10000;
    
    // Listen for console messages and errors
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    console.log('Page navigation complete');

    // Verify page loaded - check title and URL
    let pageTitle = await page.title();
    let pageUrl = page.url();
    console.log('Page title:', pageTitle);
    console.log('Page URL:', pageUrl);
    
    // Check if we're on the bot detection page
    const isBotDetectionPage = pageTitle.includes('Bot or Not') || pageTitle.toLowerCase().includes('bot');
    
    if (isBotDetectionPage) {
      console.log('Detected bot detection page, waiting for challenge to complete...');
      
      // Wait for the page to potentially redirect or load content after bot detection
      // Try waiting for the title to change or for actual content to appear
      try {
        await Promise.race([
          // Wait for title to change (not "Bot or Not")
          page.waitForFunction(
            () => !document.title.includes('Bot or Not') && !document.title.toLowerCase().includes('bot'),
            { timeout: 15000 }
          ).catch(() => null),
          // Or wait for actual VRBO content to appear
          page.waitForSelector('[data-stid="content-hotel-address"], h1:not(:has-text("Bot"))', { timeout: 15000 }).catch(() => null),
          // Or just wait a bit
          new Promise(resolve => setTimeout(resolve, 10000))
        ]);
        
        // Check title again
        pageTitle = await page.title();
        pageUrl = page.url();
        console.log('After waiting - Page title:', pageTitle);
        console.log('After waiting - Page URL:', pageUrl);
        
        // If still on bot detection page, wait a bit more
        if (pageTitle.includes('Bot or Not') || pageTitle.toLowerCase().includes('bot')) {
          console.log('Still on bot detection page, waiting additional time...');
          await page.waitForTimeout(5000);
          pageTitle = await page.title();
          console.log('Final page title:', pageTitle);
        }
      } catch (e) {
        console.log('Error waiting for bot detection to complete:', e.message);
      }
    }
    
    // Check if page has content
    const bodyText = await page.locator('body').textContent().catch(() => '');
    console.log('Page body length:', bodyText.length);
    console.log('Page body preview:', bodyText.substring(0, 200));

    // Save HTML and screenshot for debugging (only in local/dev mode)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const html = await page.content();
        await fs.writeFile(path.join(__dirname, '../debug-page.html'), html);
        console.log('Saved page HTML to debug-page.html');
        
        await page.screenshot({ path: path.join(__dirname, '../debug-screenshot.png'), fullPage: true });
        console.log('Saved screenshot to debug-screenshot.png');
      } catch (e) {
        console.log('Could not save debug files:', e.message);
      }
    }

    // Wait for dynamic content - try waiting for common VRBO elements
    console.log('Waiting for content to load...');
    try {
      // Wait for either a title or any content to appear
      await Promise.race([
        page.waitForSelector('h1', { timeout: 5000 }).catch(() => null),
        page.waitForSelector('[data-stid="content-hotel-address"]', { timeout: 5000 }).catch(() => null),
        page.waitForSelector('body', { timeout: 5000 }).catch(() => null),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
    } catch (e) {
      console.log('Wait for elements timed out:', e.message);
    }
    
    await page.waitForTimeout(2000);
    console.log('Starting to scrape...');

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
      console.log('Using VRBO scraper...');
      rentalData = { ...rentalData, ...await scrapeVRBO(page) };
      console.log('VRBO scraping complete');
    } else if (hostname.includes('booking')) {
      console.log('Using Booking.com scraper...');
      rentalData = { ...rentalData, ...await scrapeBooking(page) };
      console.log('Booking.com scraping complete');
    } else if (hostname.includes('airbnb')) {
      console.log('Using Airbnb scraper...');
      rentalData = { ...rentalData, ...await scrapeAirbnb(page) };
      console.log('Airbnb scraping complete');
    } else {
      // Generic scraper for any rental website
      console.log('Using generic scraper...');
      rentalData = { ...rentalData, ...await scrapeGeneric(page) };
      console.log('Generic scraping complete');
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
    console.log('Scraping VRBO title...');
    // Check what h1 elements exist
    const h1Count = await page.locator('h1').count();
    console.log('Found', h1Count, 'h1 elements');
    if (h1Count > 0) {
      const h1Text = await page.locator('h1').first().textContent().catch(() => null);
      console.log('First h1 text:', h1Text);
    }
    
    // Title - use timeout to avoid hanging
    try {
      data.title = await Promise.race([
        page.locator('h1').first().textContent(),
        page.locator('[data-testid="listing-title"]').textContent(),
        page.locator('.listing-title').textContent(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]).catch(() => null);
    } catch (e) {
      data.title = null;
    }
    console.log('Title found:', data.title);

    // Description - use timeout
    try {
      data.description = await Promise.race([
        page.locator('[data-testid="listing-description"]').textContent(),
        page.locator('.listing-description').textContent(),
        page.locator('meta[name="description"]').getAttribute('content'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]).catch(() => null);
    } catch (e) {
      data.description = null;
    }

    // Price per night - with timeout
    console.log('Scraping price...');
    const priceText = await Promise.race([
      page.locator('[data-testid="price"]').textContent(),
      page.locator('.price').first().textContent(),
      page.locator('[class*="price"]').first().textContent(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]).catch(() => null);
    data.pricePerNight = extractPrice(priceText);
    console.log('Price found:', data.pricePerNight);

    // Bedrooms - with timeout
    console.log('Scraping bedrooms...');
    const bedroomsText = await Promise.race([
      page.locator('[data-testid="bedrooms"]').textContent(),
      page.locator('text=/bedroom/i').first().textContent(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]).catch(() => null);
    data.bedrooms = extractNumber(bedroomsText);
    console.log('Bedrooms found:', data.bedrooms);

    // Bathrooms - with timeout
    console.log('Scraping bathrooms...');
    const bathroomsText = await Promise.race([
      page.locator('[data-testid="bathrooms"]').textContent(),
      page.locator('text=/bathroom/i').first().textContent(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]).catch(() => null);
    data.bathrooms = extractNumber(bathroomsText);
    console.log('Bathrooms found:', data.bathrooms);

    // Guests - with timeout
    console.log('Scraping guests...');
    const guestsText = await Promise.race([
      page.locator('[data-testid="guests"]').textContent(),
      page.locator('text=/sleeps|guests/i').first().textContent(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]).catch(() => null);
    data.guests = extractNumber(guestsText);
    console.log('Guests found:', data.guests);

    // Location - with timeout
    console.log('Scraping location...');
    // Check if location element exists
    const locationCount = await page.locator('[data-stid="content-hotel-address"]').count();
    console.log('Found', locationCount, 'elements with data-stid="content-hotel-address"');
    if (locationCount > 0) {
      const locationText = await page.locator('[data-stid="content-hotel-address"]').first().textContent().catch(() => null);
      console.log('Location element text:', locationText);
    }
    
    data.location = await Promise.race([
      page.locator('[data-stid="content-hotel-address"]').textContent(),
      page.locator('[data-testid="location"]').textContent(),
      page.locator('.location').textContent(),
      page.locator('meta[property="og:locality"]').getAttribute('content'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]).catch(() => null);
    console.log('Location found:', data.location);

    // Images - with timeout
    console.log('Scraping VRBO images...');
    try {
      const imageElements = await Promise.race([
        page.locator('img[src*="vrbo"], img[data-src*="vrbo"], img[alt*="rental"], img[alt*="property"]').all(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]).catch(() => []);
      console.log(`Found ${imageElements.length} image elements`);
      data.images = [];
      for (let i = 0; i < Math.min(imageElements.length, 10); i++) { // Limit to 10 images
        try {
          const img = imageElements[i];
          const src = await Promise.race([
            img.getAttribute('src'),
            img.getAttribute('data-src'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
          ]).catch(() => null);
          if (src && !src.includes('logo') && !src.includes('icon')) {
            data.images.push(src.startsWith('http') ? src : new URL(src, page.url()).href);
          }
        } catch (e) {
          // Skip this image
        }
      }
      console.log(`Collected ${data.images.length} images`);
    } catch (e) {
      console.log('Error scraping images:', e.message);
      data.images = [];
    }

    // Rating - with timeout
    console.log('Scraping VRBO rating...');
    const ratingText = await Promise.race([
      page.locator('[data-testid="rating"]').textContent(),
      page.locator('[class*="rating"]').first().textContent(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]).catch(() => null);
    data.rating = extractRating(ratingText);
    console.log('Rating found:', data.rating);

    console.log('VRBO scraping data:', JSON.stringify(data, null, 2));

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
