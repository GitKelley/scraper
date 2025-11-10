# Deployment Guide

## Deploying to Railway

### Step 1: Push to GitHub

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push to GitHub:
   ```bash
   git remote add origin https://github.com/yourusername/rental-scraper.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Railway

1. **Sign up/Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Environment Variables**
   - Go to your project → Variables tab
   - Add the following:
     - `ZAPIER_WEBHOOK_URL` = Your Zapier webhook URL
     - `NODE_ENV` = `production`
     - `PORT` (Railway sets this automatically, but you can override if needed)

4. **Deploy**
   - Railway will automatically detect Node.js
   - It will run `npm install` and `npm run install-browsers`
   - The app will start with `npm start`
   - Railway will provide a public URL (e.g., `your-app.railway.app`)

### Step 3: Set Up Google Form

1. **Create a Google Form**
   - Go to [forms.google.com](https://forms.google.com)
   - Create a new form
   - Add a question: "Rental URL" or "Link" (Short answer type)
   - Share the form with your users

### Step 4: Set Up Zapier Integration

1. **Create a Zapier Account** (if needed)
   - Go to [zapier.com](https://zapier.com)

2. **Create First Zap: Google Forms → API**
   - **Trigger**: Google Forms → "New Form Response"
   - Connect your Google account and select your form
   - **Action**: Webhooks by Zapier → "POST"
   - URL: `https://your-railway-app.railway.app/api/scrape-rental`
   - Method: POST
   - Data: Map the URL field from Google Forms:
     ```json
     {
       "url": "[URL from Google Form]"
     }
     ```
   - Test and turn on this Zap

3. **Create Second Zap: Webhook → Notion**
   - **Trigger**: Webhooks by Zapier → "Catch Hook"
   - Copy the webhook URL
   - **Action**: Notion → "Create Page"
   - Connect your Notion account
   - Choose the database/page where you want rentals added
   - Map fields from webhook data:
     - `title` → Title property
     - `url` → URL property  
     - `pricePerNight` → Number property (Price)
     - `bedrooms` → Number property
     - `bathrooms` → Number property
     - `guests` → Number property
     - `location` → Text property
     - `rating` → Number property
     - `description` → Text/Rich Text property
     - `images` → Files property (may need special handling)

4. **Add Webhook URL to Railway**
   - Go to Railway → Variables
   - Set `ZAPIER_WEBHOOK_URL` to the webhook URL from step 3 (the Catch Hook URL)

### Step 4: Test Your Deployment

1. Visit your Railway URL (e.g., `https://your-app.railway.app`)
2. Submit a test rental link
3. Check your Notion page to see if the rental was added

## Troubleshooting

### Build Fails
- Check Railway logs for errors
- Ensure `package.json` is correct
- Verify Node.js version (18+)

### Playwright Browsers Not Installing
- Railway may need additional build time
- Check build logs for browser installation
- You may need to add `PLAYWRIGHT_BROWSERS_PATH` environment variable

### Scraping Fails
- Some sites block automated access
- Check server logs for specific errors
- You may need to add delays or use different selectors

### Zapier Not Receiving Data
- Verify webhook URL is correct
- Check Zapier logs
- Ensure your Zap is turned on
- Test the webhook manually with curl:
  ```bash
  curl -X POST YOUR_ZAPIER_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  ```

## Custom Domain (Optional)

1. In Railway, go to your project → Settings
2. Click "Generate Domain" or add a custom domain
3. Update your DNS if using a custom domain

## Monitoring

- Railway provides logs in the dashboard
- Set up error monitoring (e.g., Sentry) for production
- Monitor Zapier webhook usage limits

