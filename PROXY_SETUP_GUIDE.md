# Proxy Setup Guide for VRBO Scraping

## What are Proxies?

Proxies are intermediary servers that route your requests through different IP addresses. This helps avoid IP-based blocking by making it appear your requests come from different locations.

## Why You Need Proxies for VRBO

VRBO blocks repeated requests from the same IP address. Using proxies allows you to:
- Rotate through different IP addresses
- Avoid rate limiting
- Scrape multiple listings without getting blocked

## How to Get Proxies

### Option 1: Free Proxy Lists (Not Recommended)
- **Pros**: Free
- **Cons**: 
  - Very unreliable (most don't work)
  - Often already blocked by sites like VRBO
  - Slow and unstable
  - Security risks
- **Where**: Free proxy list websites (e.g., proxylist.geonode.com, free-proxy-list.net)
- **Verdict**: Don't use for production - they won't work with VRBO

### Option 2: Residential Proxy Services (Recommended for VRBO)

Residential proxies use real home IP addresses, making them much harder to detect. These are the best option for VRBO scraping.

#### Popular Providers:

1. **Bright Data (formerly Luminati)**
   - **Cost**: ~$500/month for starter plan
   - **Quality**: Excellent
   - **Best for**: Enterprise/production use
   - **Website**: https://brightdata.com

2. **Smartproxy**
   - **Cost**: ~$75-400/month depending on traffic
   - **Quality**: Very good
   - **Best for**: Mid-range production use
   - **Website**: https://smartproxy.com

3. **Oxylabs**
   - **Cost**: ~$300+/month
   - **Quality**: Excellent
   - **Best for**: Enterprise use
   - **Website**: https://oxylabs.io

4. **Proxy-Cheap**
   - **Cost**: ~$50-200/month
   - **Quality**: Good
   - **Best for**: Budget-conscious production use
   - **Website**: https://proxy-cheap.com

5. **IPRoyal**
   - **Cost**: ~$7-50/month (pay-as-you-go)
   - **Quality**: Good
   - **Best for**: Testing and small-scale use
   - **Website**: https://iproyal.com

### Option 3: Datacenter Proxies (Cheaper but Less Effective)

- **Cost**: $30-100/month
- **Quality**: Lower (easier to detect)
- **Best for**: Less protected sites
- **Verdict**: May not work well with VRBO's bot detection

## How to Set Up Proxies

### Step 1: Sign Up for a Proxy Service

1. Choose a provider (Smartproxy or IPRoyal are good starting points)
2. Sign up and purchase a plan
3. Get your proxy credentials:
   - Proxy host/endpoint
   - Port
   - Username
   - Password

### Step 2: Get Your Proxy List

Most services provide:
- A dashboard with proxy endpoints
- API to fetch proxy lists
- Pre-configured proxy pools

Example proxy format:
```
gate.smartproxy.com:10000:username:password
gate.smartproxy.com:10001:username:password
gate.smartproxy.com:10002:username:password
```

### Step 3: Configure in Your Application

#### For Python/Crawl4AI Scraper:

**Option A: Environment Variable (Recommended for Render)**
```bash
# In Render Dashboard → Environment Variables
PROXIES=gate.smartproxy.com:10000:user:pass,gate.smartproxy.com:10001:user:pass,gate.smartproxy.com:10002:user:pass
```

**Option B: Command Line**
```bash
python src/experimental-vrbo-scraper/vrbo_crawl4ai_scraper.py "URL" \
  --proxy "gate.smartproxy.com:10000:user:pass" \
  --proxy "gate.smartproxy.com:10001:user:pass"
```

**Option C: Proxy File**
Create `proxies.txt`:
```
gate.smartproxy.com:10000:username:password
gate.smartproxy.com:10001:username:password
gate.smartproxy.com:10002:username:password
```

Then use:
```bash
python src/experimental-vrbo-scraper/vrbo_crawl4ai_scraper.py "URL" --proxy-file proxies.txt
```

#### For Node.js Scraper (when implemented):

Set in Render Dashboard:
```
PROXY_LIST=gate.smartproxy.com:10000:user:pass,gate.smartproxy.com:10001:user:pass
```

## Cost Comparison

| Provider | Monthly Cost | Traffic | Best For |
|----------|-------------|---------|----------|
| IPRoyal | $7-50 | Pay-per-GB | Testing, small scale |
| Proxy-Cheap | $50-200 | 10-100GB | Budget production |
| Smartproxy | $75-400 | 10-500GB | Mid-range production |
| Bright Data | $500+ | Unlimited | Enterprise |
| Oxylabs | $300+ | Unlimited | Enterprise |

## Testing Without Proxies

If you don't have proxies yet, you can:
1. **Wait between requests**: Use `--delay 60` to wait 60 seconds between requests
2. **Use VPN**: Change your IP manually (not automatic rotation)
3. **Test locally**: Your local IP might not be blocked yet

## Quick Start with IPRoyal (Cheapest Option)

1. Go to https://iproyal.com
2. Sign up for "Residential Proxies"
3. Start with the smallest plan ($7-15/month)
4. Get your proxy credentials from the dashboard
5. Add to Render environment variables:
   ```
   PROXIES=your-endpoint:port:username:password
   ```

## Important Notes

- **Residential proxies are best** for VRBO (harder to detect)
- **Free proxies won't work** - VRBO blocks them immediately
- **Start small** - Test with a cheap plan before scaling up
- **Rotate automatically** - The scraper will rotate through your proxy list
- **Keep proxies secret** - Don't commit proxy credentials to git

## Example: Smartproxy Setup

1. Sign up at smartproxy.com
2. Choose "Residential Proxies" plan
3. In dashboard, go to "Endpoints" → "Residential"
4. Copy your endpoint (e.g., `gate.smartproxy.com:10000`)
5. Get username/password from dashboard
6. Format: `gate.smartproxy.com:10000:your-username:your-password`
7. Add multiple endpoints for rotation:
   ```
   PROXIES=gate.smartproxy.com:10000:user:pass,gate.smartproxy.com:10001:user:pass,gate.smartproxy.com:10002:user:pass
   ```
8. Add to Render Dashboard → Environment Variables
9. Deploy - proxies will rotate automatically!

## Troubleshooting

**Q: Do I need proxies for every request?**
A: For VRBO, yes - they block quickly. For other sites, maybe not.

**Q: Can I use free proxies?**
A: Not recommended - they're unreliable and often already blocked.

**Q: How many proxies do I need?**
A: Start with 3-5. More proxies = better rotation = less chance of blocking.

**Q: Will proxies guarantee success?**
A: No, but they significantly improve success rates. VRBO's bot detection is aggressive.

**Q: Can I test locally first?**
A: Yes! Set `PROXIES` environment variable locally before deploying to Render.

