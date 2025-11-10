# Configuration Guide

This guide walks you through all the configuration needed to get the rental scraper app working.

## Required Configuration

### 1. Environment Variables

**No environment variables are required!** The app works out of the box.

Optional variables:
- **`PORT`** (Optional) - Server port (defaults to 3000)
- **`NODE_ENV`** (Optional) - Environment (set to `production` for Railway)

**Note:** You no longer need `ZAPIER_WEBHOOK_URL` - Zapier will use the API response directly to create Notion pages.

## Local Setup

### Step 1: Install Dependencies

```bash
cd scraper
npm install
```

### Step 2: Install Playwright Browsers

```bash
npm run install-browsers
```

This installs Chromium which is needed for scraping.

### Step 3: Create `.env` File (Optional)

You can create a `.env` file if you want to customize settings, but it's not required:

```bash
# Copy the example file (optional)
cp .env.example .env
```

Or create it manually with this content (all optional):

```env
PORT=3000
NODE_ENV=production
```

**Note:** You don't need `ZAPIER_WEBHOOK_URL` anymore - Zapier uses the API response directly!

### Step 5: Test Locally

```bash
npm start
```

The API will run on `http://localhost:3000`

Test it with:
```bash
curl -X POST http://localhost:3000/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.vrbo.com/123456"}'
```

## Railway Deployment Configuration

### Step 1: Connect to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `scraper` repository

### Step 2: Set Environment Variables in Railway (Optional)

1. Go to your project in Railway
2. Click on your service
3. Go to the "Variables" tab
4. Add optional environment variables (if needed):

```
NODE_ENV=production
```

**Note:** Railway automatically sets `PORT`, so you don't need to set it manually. You also don't need `ZAPIER_WEBHOOK_URL` - Zapier uses the API response directly!

### Step 3: Configure Build Settings

Railway should auto-detect Node.js, but verify:

- **Build Command**: `npm install && npm run install-browsers`
- **Start Command**: `npm start`

These are already configured in `railway.json`, so Railway should use them automatically.

### Step 4: Deploy

Railway will automatically deploy when you push to your main branch, or you can click "Deploy" in the dashboard.

After deployment, Railway will provide a public URL like:
`https://your-app-name.railway.app`

## Zapier Integration Setup

### Step 1: Create Google Form

1. Go to [forms.google.com](https://forms.google.com)
2. Create a new form
3. Add a question: "Rental URL" (Short answer type)
4. Share the form with your users

### Step 2: Create Zap (Google Forms → Railway → Notion)

1. In Zapier, create a new Zap
2. **Trigger**: Google Forms → "New Form Response"
   - Connect your Google account
   - Select your form
3. **Action 1**: Webhooks by Zapier → "POST"
   - URL: `https://your-railway-app.railway.app/api/scrape-rental`
   - Method: POST
   - Data: 
     ```json
     {
       "url": "[URL from Google Form]"
     }
     ```
   - Map the URL field from your Google Form
   - Test this step to see the response
4. **Action 2**: Notion → "Create Page"
   - Connect your Notion account
   - Select the database/page where rentals should be added
   - Map fields from the previous step's response:
     - `title` → Title property
     - `url` → URL property
     - `pricePerNight` → Number property
     - `bedrooms` → Number property
     - `bathrooms` → Number property
     - `guests` → Number property
     - `location` → Text property
     - `rating` → Number property
     - `description` → Text/Rich Text property
     - `images` → Files property (may need special handling)
   - See `RESPONSE_FORMAT.md` for the complete response structure
5. Test and turn on the Zap

**Note:** You only need ONE Zap now! The Railway API response is used directly by Zapier to create the Notion page.

## Configuration Checklist

- [ ] Installed dependencies (`npm install`)
- [ ] Installed Playwright browsers (`npm run install-browsers`)
- [ ] Tested locally (`npm start`)
- [ ] Deployed to Railway
- [ ] Created Google Form
- [ ] Created Zap: Google Forms → Railway → Notion
- [ ] Mapped response fields in Zapier (see `RESPONSE_FORMAT.md`)
- [ ] Tested end-to-end flow

## Troubleshooting

### App won't start locally
- Verify Node.js version is 18+ (`node --version`)
- Make sure Playwright browsers are installed (`npm run install-browsers`)
- Check that dependencies are installed (`npm install`)

### Railway deployment fails
- Check Railway logs for errors
- Verify environment variables are set correctly
- Ensure `railway.json` is in the repository

### Zapier not receiving data
- Check Railway logs to see if the API is being called
- Test the API endpoint directly with curl
- Verify the Railway URL is correct in your Zapier Zap
- Check that the Zapier webhook action is using the response from the previous step

### Scraping fails
- Check Railway logs for specific errors
- Some sites may block automated access
- Verify the URL format is correct

