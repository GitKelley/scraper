import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { scrapeRental } from './src/scraper.js';
import { createJob, getJob, setJobResult, setJobError } from './src/job-queue.js';

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
// Returns immediately with jobId (for Zapier's 30-second timeout)
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

    // Create a job and return immediately
    const jobId = createJob();
    console.log(`Created job ${jobId} for URL: ${url}`);

    // Start scraping in the background (don't await)
    scrapeRental(url)
      .then(rentalData => {
        if (!rentalData) {
          setJobError(jobId, new Error('Failed to scrape rental data'));
          return;
        }

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
          guests: rentalData.guests,
          location: rentalData.location,
          rating: rentalData.rating,
          images: rentalData.images || rentalData.imageUrls || [],
          scrapedAt: rentalData.scrapedAt,
          tripType: 'New Years Trip'
        };

        console.log(`Job ${jobId} completed successfully`);
        setJobResult(jobId, result);
      })
      .catch(error => {
        console.error(`Job ${jobId} failed:`, error);
        setJobError(jobId, error);
      });

    // Return immediately with jobId (for Zapier's 30-second timeout)
    const baseUrl = req.protocol + '://' + req.get('host');
    res.json({
      jobId: jobId,
      status: 'processing',
      message: 'Scraping started, check back in 2-3 minutes',
      checkUrl: `${baseUrl}/api/scrape-rental/${jobId}`
    });

  } catch (error) {
    console.error('Error creating scraping job:', error);
    res.status(500).json({ 
      error: 'Failed to create scraping job',
      message: error.message 
    });
  }
});

// Get job results endpoint - called by Zapier after delay
app.get('/api/scrape-rental/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: 'Job may have expired (jobs expire after 10 minutes) or invalid jobId'
    });
  }

  if (job.status === 'processing') {
    return res.json({
      jobId: job.id,
      status: 'processing',
      message: 'Scraping still in progress, please check again in a moment'
    });
  }

  if (job.status === 'failed') {
    return res.status(500).json({
      jobId: job.id,
      status: 'failed',
      error: job.error,
      message: 'Scraping failed'
    });
  }

  if (job.status === 'completed') {
    return res.json(job.result);
  }

  res.status(500).json({
    error: 'Unknown job status',
    job: job
  });
});

app.listen(PORT, () => {
  console.log(`Rental scraper API running on port ${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/api/scrape-rental`);
});

