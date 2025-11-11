import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { scrapeRental } from './src/scraper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main endpoint - called by Zapier webhook from Google Forms
app.post('/api/scrape-rental', async (req, res) => {
  try {
    // Zapier will send data from Google Forms
    // The URL field name might vary, so we'll check common field names
    const url = req.body.url || req.body.rentalUrl || req.body.link || req.body['Rental URL'] || req.body['Rental Link'];
    
    if (!url) {
      console.error('No URL found in request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ error: 'URL is required' });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`[${new Date().toISOString()}] Scraping rental from: ${url}`);

    // Scrape the rental data
    const rentalData = await scrapeRental(url);
    console.log(`[${new Date().toISOString()}] Scraping completed, preparing response...`);

    if (!rentalData) {
      return res.status(500).json({
        error: 'Failed to scrape rental data',
        message: 'No data was extracted from the URL'
      });
    }

    // Return the scraped data directly
    const result = {
      success: true,
      message: 'Rental scraped successfully!',
      title: rentalData.title,
      url: rentalData.url,
      source: rentalData.source,
      description: rentalData.description,
      pricePerNight: rentalData.pricePerNight,
      bedrooms: rentalData.bedrooms,
      bathrooms: rentalData.bathrooms,
      sleeps: rentalData.sleeps,
      location: rentalData.location,
      rating: rentalData.rating,
      images: rentalData.images || rentalData.imageUrls || [],
      scrapedAt: rentalData.scrapedAt,
      tripType: 'New Years Trip'
    };

    console.log(`[${new Date().toISOString()}] Scraping completed successfully`);
    console.log(`[${new Date().toISOString()}] Response JSON:`, JSON.stringify(result, null, 2));
    res.json(result);

  } catch (error) {
    console.error('Error scraping rental:', error);
    res.status(500).json({ 
      error: 'Failed to scrape rental',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Rental scraper API running on port ${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/api/scrape-rental`);
});

