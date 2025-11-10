# Render Deployment Guide

Since Railway's free tier no longer supports applications, here's how to deploy to Render (which has a free tier).

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (free)
3. Verify your email

## Step 2: Create New Web Service

1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect your GitHub account (if not already connected)
4. Select your `scraper` repository
5. Click **"Connect"**

## Step 3: Configure Service

Fill in the service configuration:

- **Name**: `rental-scraper` (or any name you like)
- **Region**: Choose closest to you
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (or `./` if needed)
- **Runtime**: `Node`
- **Build Command**: `npm install && npx playwright install chromium`
- **Start Command**: `npm start`
- **Plan**: **Free** (select this!)

**Important:** Make sure to use `npm install` (not `yarn install`) so the postinstall script runs and Playwright browsers are installed.

## Step 4: Environment Variables (Optional)

Click **"Advanced"** → **"Environment Variables"**

You can add (all optional):
- `NODE_ENV=production`
- `PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright` (helps with browser installation)

**Note:** Render automatically sets `PORT`, so you don't need to set it.

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will start building (takes 5-10 minutes)
3. Watch the build logs

## Step 6: Get Your URL

Once deployment completes:
1. Your service will have a URL like: `https://rental-scraper.onrender.com`
2. Copy this URL for Zapier

## Step 7: Test

1. Visit: `https://your-app-name.onrender.com/health`
2. Should return: `{"status":"ok"}`

## Render Free Tier Limitations

- **Spins down after 15 minutes of inactivity**
- **First request after spin-down takes ~30 seconds** (cold start)
- **750 hours/month free** (enough for most use cases)
- **512MB RAM** (should be enough for this app)

## Alternative: Fly.io (Also Free)

If Render doesn't work, try Fly.io:

1. Go to [fly.io](https://fly.io)
2. Sign up (free tier available)
3. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
4. Run: `fly launch`
5. Follow the prompts

## Alternative: Self-Hosted Options

If free tiers don't work, consider:
- **DigitalOcean** ($6/month droplet)
- **Vultr** ($6/month VPS)
- **Linode** ($5/month)
- **AWS Free Tier** (12 months free, then pay-as-you-go)

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure `package.json` is correct
- Verify Node.js version (18+)

### Playwright Browsers Not Installing
- The `postinstall` script should automatically install browsers
- Build logs will show browser installation (takes 3-5 minutes)
- If it fails, try setting `PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright` environment variable
- Make sure build command is just `npm install` (not `npm install && npm run install-browsers`)

### App Spins Down
- This is normal on free tier
- First request after spin-down will be slow (~30 seconds)
- Consider upgrading to paid plan for always-on service

### Timeout Issues
- Free tier has request timeout limits
- Scraping may take 30-60 seconds
- Consider upgrading if you hit timeouts

## Next Steps

Once deployed on Render:
1. ✅ Copy your Render URL
2. ✅ Use it in Zapier: `https://your-app-name.onrender.com/api/scrape-rental`
3. ✅ Set up your Zapier Zap (see `CONFIGURATION.md`)

