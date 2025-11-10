# Railway Setup Guide

Step-by-step guide to deploy and configure your rental scraper app on Railway.

## Step 1: Deploy from GitHub

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `scraper` repository
5. Railway will automatically start deploying

## Step 2: Wait for Build

Railway will automatically:
- Detect Node.js
- Run `npm install`
- Run `npm run install-browsers` (installs Playwright Chromium)
- Start the app with `npm start`

**This may take 3-5 minutes** (especially the browser installation step).

## Step 3: Get Your Public URL

1. Once deployment is complete, Railway will provide a public URL
2. Click on your service
3. Go to the **"Settings"** tab
4. Under **"Domains"**, you'll see your public URL
   - Example: `https://your-app-name.railway.app`
   - Or click **"Generate Domain"** to create a custom one

**Copy this URL** - you'll need it for Zapier!

## Step 4: Verify Deployment

1. Click on your service in Railway
2. Go to the **"Logs"** tab
3. You should see:
   ```
   Rental scraper API running on port XXXX
   Endpoint: POST http://localhost:XXXX/api/scrape-rental
   ```

4. Test the health endpoint:
   - Visit: `https://your-app-name.railway.app/health`
   - Should return: `{"status":"ok"}`

## Step 5: Configure Environment Variables (Optional)

**You don't need to set any environment variables!** The app works out of the box.

However, if you want to customize:

1. Go to your service in Railway
2. Click on the **"Variables"** tab
3. Add optional variables:
   - `NODE_ENV=production` (optional, but recommended)

**Note:** Railway automatically sets `PORT`, so you don't need to set it.

## Step 6: Test the API

You can test your deployed API:

```bash
curl -X POST https://your-app-name.railway.app/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.vrbo.com/123456"}'
```

Or use a tool like Postman or Insomnia.

## Step 7: Set Up Zapier

1. In Zapier, create your Zap:
   - **Trigger**: Google Forms → "New Form Response"
   - **Action**: Webhooks by Zapier → "POST"
   - **URL**: `https://your-app-name.railway.app/api/scrape-rental`
   - **Method**: `POST`
   - **Data**: `{"url": "[URL from Google Form]"}`

2. Add a second action:
   - **Action**: Notion → "Create Page"
   - Map fields from the previous step's response

## Troubleshooting

### Build Fails

- Check the **"Logs"** tab for errors
- Ensure `package.json` is correct
- Verify Node.js version (18+)

### Playwright Browsers Not Installing

- Check build logs - browser installation can take a few minutes
- Railway may need additional build time
- If it fails, check the logs for specific errors

### App Won't Start

- Check the **"Logs"** tab for startup errors
- Verify the port is being set automatically (Railway does this)
- Check that all dependencies installed correctly

### API Not Responding

- Verify the service is running (check **"Logs"** tab)
- Check that the public URL is correct
- Test the `/health` endpoint first
- Ensure Railway has generated a domain

### Timeout Issues

- Railway may spin down inactive services on free tier
- First request after inactivity may take longer
- Consider upgrading if you need always-on service

## Railway Configuration Files

The app includes `railway.json` which tells Railway:
- **Build Command**: `npm install && npm run install-browsers`
- **Start Command**: `npm start`
- **Restart Policy**: Restart on failure (up to 10 times)

Railway should automatically use these settings.

## Resource Limits

On Railway's free tier ($1/month credit):
- Services may spin down after inactivity
- First request after spin-down may be slower
- Build time is included in usage

For production use, consider:
- Railway's paid plans for always-on service
- Or accept the cold start delay

## Next Steps

Once Railway is set up:
1. ✅ Copy your Railway URL
2. ✅ Set up your Google Form
3. ✅ Configure Zapier with your Railway URL
4. ✅ Test the end-to-end flow

See `CONFIGURATION.md` for complete Zapier setup instructions.

