import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { scrapeRental } from './src/scraper.js';
import { sendToZapier } from './src/zapier.js';

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

    console.log(`Scraping rental from: ${url}`);

    // Scrape the rental page (works with any rental website)
    const rentalData = await scrapeRental(url);

    if (!rentalData) {
      return res.status(500).json({ error: 'Failed to scrape rental data' });
    }

    console.log('Scraped data:', JSON.stringify(rentalData, null, 2));

    // Send to Zapier webhook (for Notion)
    const zapierResponse = await sendToZapier(rentalData);

    res.json({
      success: true,
      message: 'Rental scraped and sent to Notion successfully!',
      data: rentalData,
      zapierResponse
    });

  } catch (error) {
    console.error('Error processing rental submission:', error);
    res.status(500).json({ 
      error: 'Failed to process rental submission',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Rental scraper API running on port ${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/api/scrape-rental`);
});

