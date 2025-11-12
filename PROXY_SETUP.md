# Proxy Rotation Setup Guide

## Current Implementation

The scraper now supports proxy rotation to avoid IP-based blocking. However, **Firecrawl's `proxy: 'stealth'` option already uses their own rotating proxy infrastructure**, which should help with IP rotation.

## If You Want to Use Your Own Proxy Service

Since Firecrawl handles the actual scraping, we can't directly control the IP addresses they use unless they support custom proxy configuration. Here are your options:

### Option 1: Use Firecrawl's Stealth Mode (Current Implementation)
- Firecrawl's `proxy: 'stealth'` already uses rotating IPs
- This is automatically enabled for Airbnb links
- No additional configuration needed

### Option 2: Use a Proxy Service API (Alternative Approach)
If you want to use your own proxy service, you'll need to:

1. **Sign up for a proxy service** that provides rotating IPs:
   - **ScraperAPI** (free tier available): https://www.scraperapi.com/
   - **Bright Data** (paid): https://brightdata.com/
   - **Oxylabs** (paid): https://oxylabs.io/
   - **Webshare** (free tier available): https://www.webshare.io/

2. **Configure proxy list** in your `.env` file:
   ```env
   # Enable proxy rotation
   ENABLE_PROXY_ROTATION=true
   
   # Proxy list format: "host:port" or "host:port:username:password"
   # Separate multiple proxies with commas
   PROXY_LIST=proxy1.example.com:8080,proxy2.example.com:8080,proxy3.example.com:8080
   # Or with authentication:
   PROXY_LIST=proxy1.example.com:8080:user:pass,proxy2.example.com:8080:user:pass
   ```

3. **Note**: Firecrawl might not support custom proxy URLs directly. If you need to use your own proxy service, you may need to:
   - Contact Firecrawl support to see if they support custom proxy configuration
   - Or use a different scraping approach that supports custom proxies

### Option 3: Use a Proxy Service API Directly (Bypass Firecrawl)
If Firecrawl continues to be blocked, you could:
1. Use a service like ScraperAPI that provides proxy rotation + scraping
2. Make direct HTTP requests through their API
3. Parse the HTML response yourself

## Environment Variables

Add these to your `.env` file:

```env
# Enable proxy rotation (automatically enabled for Airbnb)
ENABLE_PROXY_ROTATION=true

# Optional: Custom proxy list (if Firecrawl supports it)
PROXY_LIST=proxy1:port,proxy2:port,proxy3:port
```

## Current Behavior

- **Airbnb links**: Automatically use stealth mode + proxy rotation
- **Other links**: Use default proxy, retry with stealth + proxy rotation on 403 errors
- **User-Agent rotation**: Already implemented (rotates through 6 different user agents)
- **Anti-detection headers**: Already implemented (full browser headers)

## Testing

To test if proxy rotation is working:
1. Check the server logs for "Using proxy: ... (rotated)" messages
2. Monitor if 403 errors decrease
3. Check if requests appear to come from different IPs (if you have access to IP logging)

## Troubleshooting

If you're still getting 403 errors:
1. **Firecrawl might be blocked**: The issue might be that Firecrawl's infrastructure is being blocked by Airbnb, not your local IP
2. **Try a different proxy service**: Some services have better success rates
3. **Contact Firecrawl support**: They might have additional options for proxy rotation
4. **Consider using a different scraping service**: Services like ScraperAPI or Bright Data might have better success rates for Airbnb

