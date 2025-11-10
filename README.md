# Rental Scraper API

A backend API that scrapes rental listings from **any rental website** (VRBO, Booking.com, Airbnb, Expedia, TripAdvisor, etc.), then sends the data to Notion via Zapier. Designed to be called by Zapier when users submit rental links through Google Forms.

## Features

- 🏠 Scrapes rental data from **any rental website** (not just VRBO/Booking.com/Airbnb)
- 📸 Captures images from rental listings
- 📋 Extracts key information (price, bedrooms, bathrooms, guests, location, rating)
- 🔗 Sends data to Notion via Zapier webhook
- 🤖 API endpoint ready for Zapier integration

## Prerequisites

- Node.js 18+ 
- npm or yarn
- A Zapier account with a webhook URL (for Notion integration)
- A Google Form to collect rental links

## Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npm run install-browsers
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Zapier webhook URL:
   ```
   PORT=3000
   ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/your-webhook-id
   NODE_ENV=production
   ```

## Running Locally

```bash
npm start
```

The API will be available at `http://localhost:3000/api/scrape-rental`

## API Endpoint

**POST** `/api/scrape-rental`

Accepts a JSON body with a URL field (Zapier will call this from Google Forms):

```json
{
  "url": "https://www.vrbo.com/123456"
}
```

Or any of these field names:
- `url`
- `rentalUrl`
- `link`
- `Rental URL`
- `Rental Link`

Returns scraped rental data and sends it to Notion via Zapier.

## Deployment

### Railway

1. **Connect your GitHub repository to Railway**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Set environment variables in Railway**
   - Go to your project settings
   - Add the following variables:
     - `PORT` (Railway will set this automatically, but you can override)
     - `ZAPIER_WEBHOOK_URL` (your Zapier webhook URL)
     - `NODE_ENV=production`

3. **Configure build and start commands**
   Railway should auto-detect Node.js, but you can set:
   - Build Command: `npm install && npm run install-browsers`
   - Start Command: `npm start`

4. **Deploy**
   - Railway will automatically deploy when you push to your main branch
   - Or click "Deploy" in the Railway dashboard

## Zapier Integration Setup

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
   - URL: `https://your-railway-app.railway.app/api/scrape-rental`
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
     - `images` → Files/Media property (may need special handling)

4. **Set up the second Zapier webhook** (for Notion)
   - Create another Zap with "Webhooks by Zapier → Catch Hook"
   - Copy this webhook URL
   - Add it to your `.env` file as `ZAPIER_WEBHOOK_URL`
   - This is where the scraper sends the final data

### Step 3: Test Your Integration
1. Submit a test rental link through Google Forms
2. Check that the scraper processes it
3. Verify a Notion page is created

## Project Structure

```
scraper/
├── server.js              # Express API server
├── src/
│   ├── scraper.js         # Playwright scraping logic (works with any rental site)
│   └── zapier.js          # Zapier webhook integration
├── package.json
├── .env.example
└── README.md
```

## How It Works

1. User submits a rental URL through **Google Form**
2. Zapier triggers when form is submitted
3. Zapier calls this API with the rental URL
4. API uses Playwright to scrape the rental page (works with any rental website)
5. Scraper extracts:
   - Title
   - Description
   - Price per night
   - Bedrooms, bathrooms, guests
   - Location
   - Rating
   - Images
6. Data is sent to Zapier webhook (for Notion)
7. Zapier creates a Notion page with the rental information

## Supported Rental Websites

The scraper works with **any rental website**, including:
- VRBO
- Booking.com
- Airbnb
- Expedia
- TripAdvisor
- HomeAway
- And many others!

The scraper uses generic selectors and fallbacks to extract data from any rental listing page.

## Troubleshooting

### Scraping fails
- Some sites may have anti-bot protection
- Check server logs for specific errors
- The generic scraper should work with most sites, but some may need custom handling

### Images not showing
- Images are sent as URLs to Zapier
- You may need to configure Zapier to download images separately
- Some sites may block direct image access

### Zapier webhook not working
- Verify your webhook URL is correct in `.env`
- Check Zapier logs for errors
- Ensure your Zap is turned on
- Verify the API endpoint URL in your Zapier webhook action

### Google Form integration
- Make sure the URL field name in Zapier matches your Google Form field
- The API accepts multiple field names: `url`, `rentalUrl`, `link`, `Rental URL`, `Rental Link`

## License

MIT
