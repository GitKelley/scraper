# How to Check Build Logs in Render

## Viewing Build Logs

1. Go to your Render dashboard
2. Click on your service (`scraper` or whatever you named it)
3. Click on the **"Logs"** tab
4. Scroll up to see the **build logs** (they appear before the runtime logs)

## What to Look For

### 1. npm install Output

You should see output like:

```
==> Building...
==> npm install
npm WARN deprecated ...
added 234 packages in 15s
```

Or you might see:
```
==> Installing dependencies
npm install
```

### 2. Playwright Browser Installation

After `npm install`, you should see the `postinstall` script run:

```
> rental-scraper-app@1.0.0 postinstall
> npx playwright install chromium

Downloading chromium...
Installing chromium...
chromium@1194.0.0 downloaded
```

This confirms Playwright browsers were installed.

### 3. Build Completion

You should see:
```
==> Build successful
==> Deploying...
```

## If You Don't See npm install

If you don't see `npm install` in the logs, it might mean:
- The build command isn't set correctly
- Render is using a cached build
- The logs are truncated

## How to Force a Fresh Build

1. Go to your service in Render
2. Click **"Manual Deploy"** → **"Clear build cache & deploy"**
3. This will force a fresh build and show all logs

## Checking if Browsers Are Installed

The best way to verify browsers are installed is to:
1. Test the API endpoint
2. Check the runtime logs when a request comes in
3. If browsers aren't installed, you'll see the error you saw before

## Full Build Log Example

A successful build should show:

```
==> Building...
==> Detected Node.js
==> Installing dependencies
npm install
added 234 packages, and audited 235 packages in 15s

> rental-scraper-app@1.0.0 postinstall
> npx playwright install chromium

Downloading chromium 1194.0.0...
Installing chromium 1194.0.0...
chromium@1194.0.0 downloaded

==> Build successful
==> Deploying...
==> Running 'node server.js'
Rental scraper API running on port 10000
```

## Troubleshooting

### Can't See Build Logs
- Click **"Logs"** tab
- Scroll up (build logs are at the top)
- Click **"Show all logs"** if available
- Try **"Clear build cache & deploy"** to see a fresh build

### Build Logs Are Truncated
- Render may truncate very long logs
- Look for key indicators: "npm install", "postinstall", "chromium"
- If you see "Build successful", npm install likely ran

### Want to See Full Build Process
1. Go to **"Events"** tab
2. Click on the latest **"Deploy"** event
3. This shows the full deployment process

