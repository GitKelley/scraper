# API Request Format

This document shows the request format that the `/api/scrape-rental` endpoint expects.

## Endpoint

**POST** `/api/scrape-rental`

## Request Format

### Headers

```
Content-Type: application/json
```

### Request Body

The endpoint expects a JSON body with a rental URL. The URL can be provided in any of these field names:

```json
{
  "url": "https://www.vrbo.com/123456"
}
```

Or any of these alternative field names:
- `url`
- `rentalUrl`
- `link`
- `Rental URL`
- `Rental Link`

## Examples

### Example 1: Using `url` field

```bash
curl -X POST https://your-railway-app.railway.app/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.vrbo.com/123456"
  }'
```

### Example 2: Using `rentalUrl` field

```bash
curl -X POST https://your-railway-app.railway.app/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{
    "rentalUrl": "https://www.airbnb.com/rooms/123456"
  }'
```

### Example 3: Using `link` field

```bash
curl -X POST https://your-railway-app.railway.app/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://www.booking.com/hotel/123456"
  }'
```

## Zapier Configuration

When setting up your Zapier Zap:

1. **Trigger**: Google Forms → "New Form Response"
2. **Action**: Webhooks by Zapier → "POST"
   - URL: `https://your-railway-app.railway.app/api/scrape-rental`
   - Method: `POST`
   - Data: Map the URL field from your Google Form
     ```json
     {
       "url": "[URL from Google Form]"
     }
     ```

## Supported Rental Websites

The scraper works with **any rental website**, including:
- VRBO (`vrbo.com`)
- Airbnb (`airbnb.com`, `airbnb.ca`, `airbnb.co.uk`)
- Booking.com (`booking.com`)
- Expedia
- TripAdvisor
- And many others!

## Response

On success, the API returns a JSON response with the scraped rental data. See `RESPONSE_FORMAT.md` for details.

## Error Responses

### Missing URL

**Status:** `400 Bad Request`

```json
{
  "error": "URL is required"
}
```

### Invalid URL Format

**Status:** `400 Bad Request`

```json
{
  "error": "Invalid URL format"
}
```

### Scraping Failed

**Status:** `500 Internal Server Error`

```json
{
  "error": "Failed to process rental submission",
  "message": "Error details here"
}
```

## Testing

You can test the endpoint locally:

```bash
# Start the server
npm start

# In another terminal, test with curl
curl -X POST http://localhost:3000/api/scrape-rental \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.vrbo.com/123456"}'
```

Or test with a tool like Postman or Insomnia.

