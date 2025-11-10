# Rental Scraper API

A backend API that scrapes rental listings from **any rental website** (VRBO, Booking.com, Airbnb, etc.) and returns the data for Zapier to create Notion pages. Designed to be called by Zapier when users submit rental links through Google Forms.

## Features

- 🏠 Scrapes rental data from **any rental website**
- 📸 Captures images from rental listings
- 📋 Extracts key information (title, price, bedrooms, bathrooms, guests, location, rating)
- 🔗 Returns data for Zapier to create Notion pages
- 🤖 API endpoint ready for Zapier integration

## Prerequisites

- Node.js 18+
- npm or yarn
- A Zapier account (for Notion integration)
- A Google Form to collect rental links

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Install Playwright browsers**
   ```bash
   npm run install-browsers
   ```

3. **Set up environment variables** (optional for local testing)
   ```bash
   cp .env.example .env
   ```

## Running Locally

**Headless mode (default):**
```bash
npm start
```

**Headed mode (for debugging):**
```bash
npm run start:headed
```

The API will be available at `http://localhost:3000/api/scrape-rental`

## API Endpoint

**POST** `/api/scrape-rental`

Accepts a JSON body with a URL field:

```json
{
  "url": "https://www.vrbo.com/123456"
}
```

Or any of these field names: `url`, `rentalUrl`, `link`, `Rental URL`, `Rental Link`

**Response:**
```json
{
  "success": true,
  "message": "Rental scraped successfully!",
  "title": "7 Bedroom House in Downtown Banner Elk!",
  "url": "https://www.vrbo.com/3334535",
  "source": "VRBO",
  "description": "...",
  "pricePerNight": 1101,
  "bedrooms": 7,
  "bathrooms": 8,
  "guests": 14,
  "location": "Banner Elk, NC",
  "rating": 4.5,
  "images": ["https://..."],
  "scrapedAt": "2025-11-10T04:52:37.503Z",
  "tripType": "New Years Trip"
}
```

## Deployment

### Render (Recommended)

1. **Connect your GitHub repository to Render**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select your repository

2. **Configure service**
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free (or paid for always-on)

3. **Set environment variables**
   - `NODE_ENV=production`
   - `HEADED=true` (for headed browser mode)
   - `DISPLAY=:99` (for virtual display)
   - `PORT=3000` (Render sets this automatically)

4. **Deploy**
   - Render will automatically build and deploy
   - Your service will be available at `https://your-app-name.onrender.com`

## Zapier Integration

### Step 1: Create Google Form
1. Create a Google Form with a field for "Rental URL" or "Link"
2. Share the form with your users

### Step 2: Create Zapier Zap

1. **Trigger: Google Forms**
   - Choose "New Form Response"
   - Connect your Google account
   - Select your form

2. **Action: Webhooks by Zapier**
   - Choose "POST" action
   - URL: `https://your-app-name.onrender.com/api/scrape-rental`
   - Method: POST
   - Data: Map the URL field from Google Forms
     ```json
     {
       "url": "[URL from Google Form]"
     }
     ```

3. **Action: Notion → Create Page**
   - Connect your Notion account
   - Select the database/page where rentals should be added
   - Map fields from the webhook response:
     - `title` → Title property
     - `url` → URL property
     - `pricePerNight` → Number property
     - `bedrooms` → Number property
     - `bathrooms` → Number property
     - `guests` → Number property
     - `location` → Text property
     - `rating` → Number property
     - `images` → Files/Media property

## Project Structure

```
scraper/
├── server.js              # Express API server
├── src/
│   ├── scraper.js         # Playwright scraping logic
│   └── zapier.js          # Zapier webhook integration (optional)
├── Dockerfile             # Docker configuration for Render
├── render.yaml            # Render deployment config
├── package.json
└── README.md
```

## Supported Rental Websites

The scraper works with **any rental website**, including:
- VRBO
- Booking.com
- Airbnb
- Expedia
- TripAdvisor
- And many others!

The scraper uses generic selectors and fallbacks to extract data from any rental listing page.

## Troubleshooting

### Scraping fails
- Some sites may have anti-bot protection
- Check server logs for specific errors
- The scraper runs in headed mode on Render to bypass bot detection

### Images not showing
- Images are sent as URLs to Zapier
- You may need to configure Zapier to download images separately

### Zapier webhook not working
- Verify your API endpoint URL is correct
- Check Zapier logs for errors
- Ensure your Zap is turned on

## License

MIT
