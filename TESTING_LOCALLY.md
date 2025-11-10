# Testing Locally

How to test the rental scraper locally before deploying.

## Prerequisites

1. Node.js 18+ installed
2. Git repository cloned

## Setup

1. **Install dependencies**
   ```bash
   cd scraper
   npm install
   ```

2. **Install Playwright browsers**
   ```bash
   npm run install-browsers
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   The server will run on `http://localhost:3000`

## Testing

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok"}`

### Test 2: Scrape a Rental

```bash
curl -X POST http://localhost:3000/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.vrbo.com/123456"}'
```

Or use a tool like Postman or Insomnia.

### Test 3: Test with Different Rental Sites

**VRBO:**
```bash
curl -X POST http://localhost:3000/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.vrbo.com/123456"}'
```

**Airbnb:**
```bash
curl -X POST http://localhost:3000/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.airbnb.com/rooms/123456"}'
```

**Booking.com:**
```bash
curl -X POST http://localhost:3000/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.booking.com/hotel/123456"}'
```

## Development Mode

For auto-reload during development:

```bash
npm run dev
```

This will restart the server automatically when you make changes.

## Troubleshooting

### Browsers Not Found
If you get browser errors:
```bash
npm run install-browsers
```

### Port Already in Use
If port 3000 is already in use:
```bash
PORT=3001 npm start
```

### Timeout Issues
If pages take too long to load, you can:
- Increase timeout in `src/scraper.js`
- Use a simpler wait condition (already set to `domcontentloaded`)

## Testing with Zapier

To test the full Zapier integration locally:

1. Use a tool like [ngrok](https://ngrok.com) to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. Use the ngrok URL in your Zapier webhook:
   ```
   https://your-ngrok-url.ngrok.io/api/scrape-rental
   ```

3. Test your Zapier Zap with the ngrok URL

4. Once working, deploy to Render and update the URL

## Debugging

### Enable Verbose Logging

The server already logs:
- When scraping starts
- Browser executable found
- Navigation to URL
- Scraped data
- Errors

### Check Browser Installation

```bash
npx playwright install chromium --dry-run
```

### Test Browser Launch

```bash
node -e "import('playwright').then(p => p.chromium.launch().then(b => { console.log('Browser works!'); b.close(); }))"
```

