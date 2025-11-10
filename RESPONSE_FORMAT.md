# API Response Format

This document shows the response format from the `/api/scrape-rental` endpoint that Zapier will receive.

## Response Structure

When Railway successfully scrapes a rental, it returns a JSON response with the following structure:

```json
{
  "success": true,
  "message": "Rental scraped successfully!",
  "title": "Beautiful Beachfront Villa",
  "url": "https://www.vrbo.com/123456",
  "source": "VRBO",
  "description": "Stunning ocean views...",
  "pricePerNight": "250",
  "bedrooms": 3,
  "bathrooms": 2,
  "guests": 6,
  "location": "Miami Beach, FL",
  "rating": 4.8,
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "scrapedAt": "2024-01-15T10:30:00.000Z",
  "tripType": "New Years Trip"
}
```

## Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `success` | boolean | Always `true` on success | `true` |
| `message` | string | Status message | `"Rental scraped successfully!"` |
| `title` | string | Rental listing title | `"Beautiful Beachfront Villa"` |
| `url` | string | Original rental URL | `"https://www.vrbo.com/123456"` |
| `source` | string | Rental website name | `"VRBO"`, `"Airbnb"`, `"Booking.com"` |
| `description` | string | Rental description | `"Stunning ocean views..."` |
| `pricePerNight` | string | Price per night (numbers only) | `"250"` |
| `bedrooms` | number | Number of bedrooms | `3` |
| `bathrooms` | number | Number of bathrooms | `2` |
| `guests` | number | Maximum guests | `6` |
| `location` | string | Rental location | `"Miami Beach, FL"` |
| `rating` | number | Rating (if available) | `4.8` |
| `images` | array | Array of image URLs | `["url1", "url2"]` |
| `scrapedAt` | string | ISO timestamp of scraping | `"2024-01-15T10:30:00.000Z"` |
| `tripType` | string | Always `"New Years Trip"` | `"New Years Trip"` |

## Error Response

If scraping fails, the response will be:

```json
{
  "error": "Failed to process rental submission",
  "message": "Error details here"
}
```

## Zapier Configuration

In your Zapier Zap, when configuring the Notion action, you can map these fields:

### Recommended Field Mappings

- **Title** → `title`
- **URL** → `url`
- **Source** → `source`
- **Description** → `description`
- **Price per Night** → `pricePerNight` (convert to number if needed)
- **Bedrooms** → `bedrooms`
- **Bathrooms** → `bathrooms`
- **Guests** → `guests`
- **Location** → `location`
- **Rating** → `rating`
- **Images** → `images` (may need special handling for Notion)
- **Scraped At** → `scrapedAt`
- **Trip Type** → `tripType`

### Notes

- Some fields may be `null` if not found on the rental page
- `images` is an array - you may need to handle this specially in Notion
- `pricePerNight` is a string of numbers only (no currency symbols)
- All fields are at the root level of the response (not nested in a `data` object)

