# Quick Start Guide

Get your rental scraper API up and running!

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   npm run install-browsers
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Zapier webhook URL (for Notion).

3. **Start the server**
   ```bash
   npm start
   ```

4. **Test the API**
   ```bash
   curl -X POST http://localhost:3000/api/scrape-rental \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.vrbo.com/123456"}'
   ```

## Getting Your Zapier Webhook URL

1. Go to [zapier.com](https://zapier.com) and sign in
2. Create a Zap with:
   - Trigger: Webhooks by Zapier → "Catch Hook"
   - Action: Notion → "Create Page"
3. Copy the webhook URL from the trigger
4. Add it to your `.env` file as `ZAPIER_WEBHOOK_URL`

## Setting Up Google Forms Integration

1. Create a Google Form with a "Rental URL" field
2. In Zapier, create a Zap:
   - Trigger: Google Forms → "New Form Response"
   - Action: Webhooks by Zapier → "POST"
   - URL: `https://your-railway-app.railway.app/api/scrape-rental`
   - Data: `{"url": "[URL from Google Form]"}`

## Example Rental Links to Test

The scraper works with **any rental website**:
- VRBO: `https://www.vrbo.com/...`
- Airbnb: `https://www.airbnb.com/rooms/...`
- Booking.com: `https://www.booking.com/hotel/...`
- Expedia, TripAdvisor, and many others!

## Next Steps

- See [README.md](README.md) for full documentation
- See [DEPLOYMENT.md](DEPLOYMENT.md) for Railway deployment instructions

