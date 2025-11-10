# Render Docker Setup Instructions

Your service is currently using Node.js environment, but we need it to use Docker for headed browser mode.

## Manual Configuration in Render Dashboard

1. **Go to your Render Dashboard**
   - Navigate to: https://dashboard.render.com
   - Find your `scraper` service

2. **Change Environment to Docker**
   - Click on your service
   - Go to **Settings** tab
   - Scroll down to **Environment**
   - Change from **Node** to **Docker**
   - Set **Dockerfile Path** to: `./Dockerfile`
   - Click **Save Changes**

3. **Set Environment Variables**
   - Go to **Environment** section
   - Add/Update these variables:
     - `NODE_ENV=production`
     - `HEADED=true`
     - `DISPLAY=:99`
     - `PORT=3000` (Render sets this automatically, but you can add it)

4. **Redeploy**
   - Go to **Manual Deploy** tab
   - Click **Deploy latest commit**
   - Or push a new commit to trigger auto-deploy

## Alternative: Use Blueprint Deployment

If you want to use `render.yaml` automatically:

1. **Delete the current service** (or create a new one)
2. **Create a new Blueprint**
   - In Render Dashboard, click **New +**
   - Select **Blueprint**
   - Connect your GitHub repository
   - Render will read `render.yaml` and create services automatically

## Verify Docker is Being Used

After redeploying, check the build logs. You should see:
- `Building Docker image...`
- `FROM node:18-slim`
- `RUN apt-get update && apt-get install -y xvfb`
- `RUN npx playwright install chromium`
- `RUN npx playwright install-deps chromium`

If you still see `yarn install` or `npm install` at the top level, Docker is not being used.

