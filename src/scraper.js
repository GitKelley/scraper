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
  // Try ScraperAPI first if API key is set (free tier: 1000 requests/month)
  const scraperApiKey = process.env.SCRAPERAPI_KEY;
  if (scraperApiKey) {
    try {
      console.log(`[${new Date().toISOString()}] Attempting ScraperAPI...`);
      const result = await scrapeWithScraperAPI(url, scraperApiKey);
      if (result && (result.title || result.description || result.images?.length > 0)) {
        console.log(`[${new Date().toISOString()}] ScraperAPI succeeded!`);
        return result;
      }
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ScraperAPI failed: ${error.message}, falling back to Playwright...`);
    }
  }
  
  // Fallback to Playwright (current approach)
  // Try mobile version first (often less protected)
  const mobileUrl = url.replace('www.vrbo.com', 'm.vrbo.com').replace('vrbo.com', 'm.vrbo.com');
  const urlsToTry = [url, mobileUrl].filter((u, i, arr) => arr.indexOf(u) === i); // Remove duplicates
  
  let browser = null;
  let lastError = null;
  
  // Try each URL until one works
  for (const tryUrl of urlsToTry) {
    try {
      const result = await attemptScrape(tryUrl);
      if (result && (result.title || result.description || result.images?.length > 0)) {
        return result; // Got some data, return it
      }
    } catch (error) {
      lastError = error;
      console.log(`[${new Date().toISOString()}] Failed to scrape ${tryUrl}, trying next URL...`);
      continue;
    }
  }
  
  // If all URLs failed, throw the last error
  if (lastError) {
    throw lastError;
  }
  
  return null;
}

async function attemptScrape(url) {
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
    
    // Block unnecessary resources to speed up loading (especially in production)
    await page.route('**/*', (route) => {
      const url = route.request().url();
      // Block analytics, ads, tracking, and Google Sign-In scripts
      if (
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('googleapis.com/gsi') ||
        url.includes('doubleclick') ||
        url.includes('facebook.net') ||
        url.includes('analytics') ||
        url.includes('tracking') ||
        url.includes('advertising') ||
        url.includes('.woff') ||
        url.includes('.woff2') ||
        url.includes('.ttf') ||
        url.includes('.eot') ||
        url.includes('fonts.googleapis.com')
      ) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Listen for console messages and errors (set up before navigation)
    // Only log errors, not all console messages (too noisy)
    page.on('pageerror', error => {
      // Only log non-Google Sign-In errors (those are expected and harmless)
      if (!error.message.includes('accounts.google.com/gsi')) {
        console.error('Page error:', error.message, error.stack || 'No stack trace');
      }
    });
    
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
    
    const timeout = process.env.NODE_ENV === 'production' ? 20000 : 10000;
    
    console.log(`[${new Date().toISOString()}] Starting page navigation (timeout: ${timeout}ms)...`);
    
    // Retry logic for production - reduced to 1 retry for faster execution
    let retries = process.env.NODE_ENV === 'production' ? 1 : 0;
    let lastError = null;
    
    while (retries >= 0) {
      try {
        console.log(`[${new Date().toISOString()}] Attempting page.goto (${retries + 1} attempts remaining)...`);
        
        // Try page.goto, but don't fail if it times out - we might still have HTML
        let navigationSucceeded = false;
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
          navigationSucceeded = true;
          console.log(`[${new Date().toISOString()}] Page.goto completed successfully`);
        } catch (navError) {
          console.log(`[${new Date().toISOString()}] Page.goto timed out, but checking if we have HTML content...`);
          // Continue anyway - might have HTML even if event didn't fire
        }
        
        // Check if we have HTML content (even if navigation "failed")
        let hasContent = false;
        try {
          const htmlContent = await page.content();
          const bodyExists = await page.locator('body').count().catch(() => 0);
          const h1Exists = await page.locator('h1').count().catch(() => 0);
          
          console.log(`[${new Date().toISOString()}] Current URL: ${page.url()}`);
          console.log(`[${new Date().toISOString()}] Body elements found: ${bodyExists}`);
          console.log(`[${new Date().toISOString()}] H1 elements found: ${h1Exists}`);
          console.log(`[${new Date().toISOString()}] HTML length: ${htmlContent.length} chars`);
          
          // If we have body or h1, we have content
          if (bodyExists > 0 || h1Exists > 0 || htmlContent.length > 1000) {
            hasContent = true;
            console.log(`[${new Date().toISOString()}] HTML content detected, continuing with scrape...`);
          }
        } catch (e) {
          console.log(`[${new Date().toISOString()}] Could not check HTML content: ${e.message}`);
        }
        
        // If navigation failed but we have content, continue anyway
        if (!navigationSucceeded && !hasContent) {
          throw new Error('No HTML content available');
        }
        
        // Wait for h1 specifically - this is the title and indicates main content is loaded
        try {
          await page.waitForSelector('h1', { timeout: 5000 });
          console.log(`[${new Date().toISOString()}] h1 element found!`);
        } catch (e) {
          console.log(`[${new Date().toISOString()}] h1 not found, but continuing anyway...`);
        }
        
        // Wait for dynamic content to render - reduced for faster execution
        const waitTime = process.env.NODE_ENV === 'production' ? 5000 : 3000;
        console.log(`[${new Date().toISOString()}] Waiting ${waitTime}ms for dynamic content to render...`);
        await page.waitForTimeout(waitTime);
        console.log(`[${new Date().toISOString()}] Dynamic content wait complete, page ready for scraping`);
        
        // Success - break out of retry loop
        break;
      } catch (error) {
        lastError = error;
        console.log(`[${new Date().toISOString()}] Page load failed: ${error.message}`);
        
        // Try to log page state even on error
        try {
          const currentUrl = page.url();
          const pageTitle = await page.title().catch(() => 'Unable to get title');
          console.log(`[${new Date().toISOString()}] Error state - Current URL: ${currentUrl}`);
          console.log(`[${new Date().toISOString()}] Error state - Page title: ${pageTitle}`);
          
          // Try to get HTML snippet
          try {
            const htmlContent = await page.content();
            const htmlSnippet = htmlContent.substring(0, 1000);
            console.log(`[${new Date().toISOString()}] Error state - HTML snippet:`, htmlSnippet);
          } catch (e) {
            console.log(`[${new Date().toISOString()}] Error state - Could not get HTML: ${e.message}`);
          }
        } catch (e) {
          console.log(`[${new Date().toISOString()}] Could not get page state on error: ${e.message}`);
        }
        
        if (retries > 0) {
          console.log(`[${new Date().toISOString()}] Retrying... (${retries} attempts left)`);
          retries--;
          // Wait a bit before retrying (reduced for faster execution)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Last attempt failed, throw the error
          console.log(`[${new Date().toISOString()}] All retry attempts exhausted`);
          throw error;
        }
      }
    }

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
      console.log(`[${new Date().toISOString()}] Starting VRBO scraper...`);
      rentalData = { ...rentalData, ...await scrapeVRBO(page) };
      console.log(`[${new Date().toISOString()}] VRBO scraper completed. Fields found:`, {
        title: !!rentalData.title,
        description: !!rentalData.description,
        price: !!rentalData.pricePerNight,
        bedrooms: !!rentalData.bedrooms,
        bathrooms: !!rentalData.bathrooms,
        sleeps: !!rentalData.sleeps,
        location: !!rentalData.location,
        rating: !!rentalData.rating,
        images: rentalData.images?.length || 0
      });
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
  const selectorTimeout = process.env.NODE_ENV === 'production' ? 2000 : 1000;

  console.log(`[${new Date().toISOString()}] VRBO: Starting field extraction (selector timeout: ${selectorTimeout}ms)`);

  try {
    // Title - extract from h1 element
    console.log(`[${new Date().toISOString()}] VRBO: Extracting title...`);
    try {
      data.title = await page.locator('h1').first().textContent({ timeout: selectorTimeout }).catch(() => null);
      if (data.title) {
        data.title = data.title.trim();
        console.log(`[${new Date().toISOString()}] VRBO: Title found: "${data.title.substring(0, 50)}..."`);
      } else {
        console.log(`[${new Date().toISOString()}] VRBO: Title not found`);
      }
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Title extraction error: ${e.message}`);
      data.title = null;
    }

    // Description - extract from content-markup divs
    console.log(`[${new Date().toISOString()}] VRBO: Extracting description...`);
    try {
      // Get all description content from content-markup divs
      const descriptionElements = await page.locator('[data-stid="content-markup"]').all({ timeout: selectorTimeout }).catch(() => []);
      console.log(`[${new Date().toISOString()}] VRBO: Found ${descriptionElements.length} description elements`);
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
      console.log(`[${new Date().toISOString()}] VRBO: Description ${data.description ? `found (${data.description.length} chars)` : 'not found'}`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Description extraction error: ${e.message}`);
      data.description = null;
    }

    // Price - extract from price-summary element
    console.log(`[${new Date().toISOString()}] VRBO: Extracting price...`);
    try {
      const priceText = await page.locator('[data-test-id="price-summary"] [data-test-id="price-summary-message-line"] .uitk-text-emphasis-theme').first().textContent({ timeout: selectorTimeout }).catch(() => null);
      data.pricePerNight = extractPrice(priceText);
      console.log(`[${new Date().toISOString()}] VRBO: Price ${data.pricePerNight ? `found: ${data.pricePerNight}` : 'not found'}`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Price extraction error: ${e.message}`);
      data.pricePerNight = null;
    }

    // Bedrooms - extract from title text or page content
    console.log(`[${new Date().toISOString()}] VRBO: Extracting bedrooms...`);
    try {
      // Try to extract from title first (e.g., "7 Bedroom House")
      const titleText = data.title || '';
      const bedroomsMatch = titleText.match(/(\d+)\s*bedroom/i) || titleText.match(/(\d+)\s*bed/i);
      if (bedroomsMatch) {
        data.bedrooms = parseInt(bedroomsMatch[1], 10);
        console.log(`[${new Date().toISOString()}] VRBO: Bedrooms found in title: ${data.bedrooms}`);
      } else {
        // Fallback: search page for bedroom text
        const bedroomsText = await page.locator('text=/\\d+\\s*bedroom/i').first().textContent({ timeout: selectorTimeout }).catch(() => null) ||
                              await page.locator('text=/\\d+\\s*bed/i').first().textContent({ timeout: selectorTimeout }).catch(() => null);
        data.bedrooms = extractNumber(bedroomsText);
        console.log(`[${new Date().toISOString()}] VRBO: Bedrooms ${data.bedrooms ? `found: ${data.bedrooms}` : 'not found'}`);
      }
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Bedrooms extraction error: ${e.message}`);
      data.bedrooms = null;
    }

    // Bathrooms - extract from title text or page content
    console.log(`[${new Date().toISOString()}] VRBO: Extracting bathrooms...`);
    try {
      // Try to extract from title first (e.g., "7 Bedroom House 8 Bath")
      const titleText = data.title || '';
      const bathroomsMatch = titleText.match(/(\d+)\s*bathroom/i) || titleText.match(/(\d+)\s*bath/i);
      if (bathroomsMatch) {
        data.bathrooms = parseInt(bathroomsMatch[1], 10);
        console.log(`[${new Date().toISOString()}] VRBO: Bathrooms found in title: ${data.bathrooms}`);
      } else {
        // Fallback: search page for bathroom text
        const bathroomsText = await page.locator('text=/\\d+\\s*bathroom/i').first().textContent({ timeout: selectorTimeout }).catch(() => null) ||
                               await page.locator('text=/\\d+\\s*bath/i').first().textContent({ timeout: selectorTimeout }).catch(() => null);
        data.bathrooms = extractNumber(bathroomsText);
        console.log(`[${new Date().toISOString()}] VRBO: Bathrooms ${data.bathrooms ? `found: ${data.bathrooms}` : 'not found'}`);
      }
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Bathrooms extraction error: ${e.message}`);
      data.bathrooms = null;
    }

    // Sleeps - extract from bedrooms heading span (e.g., "7 bedrooms (sleeps 14)")
    console.log(`[${new Date().toISOString()}] VRBO: Extracting sleeps...`);
    try {
      // Look for the span inside the h3 heading that contains bedrooms and sleeps
      // Structure: <h3>7 bedrooms <span>(sleeps 14)</span></h3>
      const sleepsText = await page.locator('h3.uitk-heading-5:has-text("bedroom") span.uitk-text').first().textContent({ timeout: selectorTimeout }).catch(() => null) ||
                         await page.locator('h3:has-text("bedroom") span:has-text("sleeps")').first().textContent({ timeout: selectorTimeout }).catch(() => null) ||
                         await page.locator('text=/\\(sleeps\\s+\\d+\\)/i').first().textContent({ timeout: selectorTimeout }).catch(() => null);
      data.sleeps = extractNumber(sleepsText);
      console.log(`[${new Date().toISOString()}] VRBO: Sleeps ${data.sleeps ? `found: ${data.sleeps}` : 'not found'}`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Sleeps extraction error: ${e.message}`);
      data.sleeps = null;
    }

    // Location - extract from content-hotel-address
    console.log(`[${new Date().toISOString()}] VRBO: Extracting location...`);
    try {
      data.location = await page.locator('[data-stid="content-hotel-address"]').first().textContent({ timeout: selectorTimeout }).catch(() => null);
      if (data.location) {
        data.location = data.location.trim();
        console.log(`[${new Date().toISOString()}] VRBO: Location found: "${data.location}"`);
      } else {
        console.log(`[${new Date().toISOString()}] VRBO: Location not found`);
      }
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Location extraction error: ${e.message}`);
      data.location = null;
    }

    // Images - extract from media.vrbo.com images
    console.log(`[${new Date().toISOString()}] VRBO: Extracting images...`);
    try {
      const imageElements = await page.locator('img[src*="media.vrbo.com"]').all({ timeout: selectorTimeout }).catch(() => []);
      console.log(`[${new Date().toISOString()}] VRBO: Found ${imageElements.length} image elements`);
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
      console.log(`[${new Date().toISOString()}] VRBO: Extracted ${data.images.length} images`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Images extraction error: ${e.message}`);
      data.images = [];
    }

    // Rating - extract from badge element
    console.log(`[${new Date().toISOString()}] VRBO: Extracting rating...`);
    try {
      const ratingText = await page.locator('.uitk-badge-base-text').first().textContent({ timeout: selectorTimeout }).catch(() => null);
      data.rating = extractRating(ratingText);
      console.log(`[${new Date().toISOString()}] VRBO: Rating ${data.rating ? `found: ${data.rating}` : 'not found'}`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] VRBO: Rating extraction error: ${e.message}`);
      data.rating = null;
    }
    
    console.log(`[${new Date().toISOString()}] VRBO: Field extraction complete`);



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
