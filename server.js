import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { scrapeRental } from './src/scraper.js';
import { saveRental, getAllRentals, getRentalById, voteOnRental, getVotingResults, deleteRental, saveActivity, getAllActivities, getActivityById, voteOnActivity, getActivityVotingResults, deleteActivity, addComment, getComments, deleteComment, getSetting } from './src/storage.js';
import { initializeDatabase } from './src/database.js';
import { signUp, login } from './src/auth.js';

dotenv.config();

// Initialize database on server start
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads (base64 encoded)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========== AUTHENTICATION ENDPOINTS ==========

// Sign up endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }

    const user = await signUp(username, password, name);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(400).json({ error: error.message || 'Failed to sign up' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await login(username, password);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(401).json({ error: error.message || 'Invalid username or password' });
  }
});

// Create rental manually (without scraping) - MUST come before /:id routes
app.post('/api/lodging-options', async (req, res) => {
  try {
    const rentalData = req.body;
    const savedRental = saveRental(rentalData);
    res.json(savedRental);
  } catch (error) {
    console.error('Error creating rental:', error);
    res.status(500).json({ error: 'Failed to create rental' });
  }
});

// Get all lodging options endpoint (for frontend)
app.get('/api/lodging-options', async (req, res) => {
  try {
    const rentals = getAllRentals();
    res.json(rentals);
  } catch (error) {
    console.error('Error fetching lodging options:', error);
    res.status(500).json({ error: 'Failed to fetch lodging options' });
  }
});

// Get single rental by ID
app.get('/api/lodging-options/:id', async (req, res) => {
  try {
    const rental = getRentalById(req.params.id);
    if (rental) {
      res.json(rental);
    } else {
      res.status(404).json({ error: 'Rental not found' });
    }
  } catch (error) {
    console.error('Error fetching rental:', error);
    res.status(500).json({ error: 'Failed to fetch rental' });
  }
});

// Update rental by ID
app.put('/api/lodging-options/:id', async (req, res) => {
  try {
    const rentalData = { ...req.body, id: req.params.id };
    const savedRental = saveRental(rentalData);
    res.json(savedRental);
  } catch (error) {
    console.error('Error updating rental:', error);
    res.status(500).json({ error: 'Failed to update rental' });
  }
});

// Vote on a rental
app.post('/api/lodging-options/:id/vote', async (req, res) => {
  try {
    const { voteType, userId } = req.body; // 'upvote' or 'downvote', userId
    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "upvote" or "downvote"' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const votes = voteOnRental(req.params.id, voteType, userId);
    if (votes.alreadyVoted) {
      return res.status(400).json({ error: votes.message || 'You have already voted this way' });
    }
    res.json({ success: true, votes });
  } catch (error) {
    console.error('Error voting on rental:', error);
    res.status(500).json({ error: 'Failed to vote on rental' });
  }
});

// Get voting results
app.get('/api/voting-results', async (req, res) => {
  try {
    const results = getVotingResults();
    res.json(results);
  } catch (error) {
    console.error('Error fetching voting results:', error);
    res.status(500).json({ error: 'Failed to fetch voting results' });
  }
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

    // Scrape the rental data
    const rentalData = await scrapeRental(url);

    if (!rentalData) {
      return res.status(500).json({
        error: 'Failed to scrape rental data',
        message: 'No data was extracted from the URL'
      });
    }

    // Log the scraped data for debugging
    console.log('Scraped rental data:', JSON.stringify(rentalData, null, 2));
    
    // Check if we got redirected to Airbnb homepage
    if (rentalData.title && (rentalData.title.includes('Airbnb: Vacation Rentals') || rentalData.title.includes('Airbnb homepage'))) {
      console.warn('WARNING: Appears to have been redirected to Airbnb homepage - Airbnb may be blocking Firecrawl');
      return res.status(500).json({
        error: 'Failed to scrape rental data',
        message: 'Airbnb appears to be blocking or redirecting the scraper. Please try manually entering the rental details, or try again later. The URL is valid, but Airbnb is preventing automated access.',
        redirected: true
      });
    }

    // Prepare rental data for storage - ensure all fields are properly mapped
    const rentalToSave = {
      title: rentalData.title || 'Untitled Rental',
      url: rentalData.url || url,
      source: rentalData.source || 'Other',
      description: rentalData.description || null,
      price: rentalData.price || null,
      bedrooms: rentalData.bedrooms || null,
      bathrooms: rentalData.bathrooms || null,
      sleeps: rentalData.sleeps || null,
      location: rentalData.location || null,
      amenities: rentalData.amenities || [],
      images: Array.isArray(rentalData.images) ? rentalData.images : (rentalData.imageUrls || []),
      status: rentalData.status || 'Idea',
      bookingType: rentalData.bookingType || 'Lodging',
      scrapedAt: rentalData.scrapedAt || new Date().toISOString(),
      tripType: rentalData.tripType || 'New Years Trip'
    };

    // Log the prepared data for debugging
    console.log('Prepared rental data for storage:', JSON.stringify(rentalToSave, null, 2));

    // Save to storage
    const savedRental = saveRental(rentalToSave);

    // Return the saved rental with ID
    const result = {
      success: true,
      message: 'Rental scraped and saved successfully!',
      rental: savedRental
    };

    res.json(result);

  } catch (error) {
    console.error('Error scraping rental:', error);
    res.status(500).json({ 
      error: 'Failed to scrape rental',
      message: error.message 
    });
  }
});

// ========== ACTIVITY ENDPOINTS ==========

// Create activity manually - MUST come before /:id routes
app.post('/api/activities', async (req, res) => {
  try {
    const activityData = req.body;
    const savedActivity = saveActivity(activityData);
    res.json(savedActivity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// Get all activities endpoint (for frontend)
app.get('/api/activities', async (req, res) => {
  try {
    const activities = getAllActivities();
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get single activity by ID
app.get('/api/activities/:id', async (req, res) => {
  try {
    const activity = getActivityById(req.params.id);
    if (activity) {
      res.json(activity);
    } else {
      res.status(404).json({ error: 'Activity not found' });
    }
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Update activity by ID
app.put('/api/activities/:id', async (req, res) => {
  try {
    const activityData = { ...req.body, id: req.params.id };
    const savedActivity = saveActivity(activityData);
    res.json(savedActivity);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Vote on an activity
app.post('/api/activities/:id/vote', async (req, res) => {
  try {
    const { voteType, userId } = req.body; // 'upvote' or 'downvote', userId
    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "upvote" or "downvote"' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const votes = voteOnActivity(req.params.id, voteType, userId);
    if (votes.alreadyVoted) {
      return res.status(400).json({ error: votes.message || 'You have already voted this way' });
    }
    res.json({ success: true, votes });
  } catch (error) {
    console.error('Error voting on activity:', error);
    res.status(500).json({ error: 'Failed to vote on activity' });
  }
});

// Get activity voting results
app.get('/api/activity-voting-results', async (req, res) => {
  try {
    const results = getActivityVotingResults();
    res.json(results);
  } catch (error) {
    console.error('Error fetching activity voting results:', error);
    res.status(500).json({ error: 'Failed to fetch activity voting results' });
  }
});

// ========== COMMENT ENDPOINTS ==========

// Add a comment
app.post('/api/comments', async (req, res) => {
  try {
    const { itemId, itemType, userId, userName, text } = req.body;
    
    if (!itemId || !itemType || !userId || !userName || !text) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const comment = addComment(itemId, itemType, userId, userName, text);
    res.json({ success: true, comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for an item
app.get('/api/comments/:itemId/:itemType', async (req, res) => {
  try {
    const { itemId, itemType } = req.params;
    const comments = getComments(itemId, itemType);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Delete a comment
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    deleteComment(commentId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(400).json({ error: error.message || 'Failed to delete comment' });
  }
});

// ========== SETTINGS ENDPOINTS ==========

// Delete a rental
app.delete('/api/rentals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    deleteRental(id);
    res.json({ success: true, message: 'Rental deleted successfully' });
  } catch (error) {
    console.error('Error deleting rental:', error);
    res.status(500).json({ error: 'Failed to delete rental', message: error.message });
  }
});

// Delete an activity
app.delete('/api/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    deleteActivity(id);
    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity', message: error.message });
  }
});

// Get header image
app.get('/api/settings/header-image', async (req, res) => {
  try {
    const headerImage = getSetting('headerImage');
    res.json({ headerImage });
  } catch (error) {
    console.error('Error fetching header image:', error);
    res.status(500).json({ error: 'Failed to fetch header image' });
  }
});

app.listen(PORT, () => {
  console.log(`Rental scraper API running on port ${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/api/scrape-rental`);
});

