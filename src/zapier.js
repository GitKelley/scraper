import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends rental data to Zapier webhook
 */
export async function sendToZapier(rentalData) {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('ZAPIER_WEBHOOK_URL is not set in environment variables');
  }

  try {
    // Format data for Zapier/Notion
    const payload = {
      title: rentalData.title || 'Rental Listing',
      url: rentalData.url,
      source: rentalData.source,
      description: rentalData.description || '',
      pricePerNight: rentalData.pricePerNight || null,
      bedrooms: rentalData.bedrooms || null,
      bathrooms: rentalData.bathrooms || null,
      guests: rentalData.guests || null,
      location: rentalData.location || '',
      rating: rentalData.rating || null,
      images: rentalData.images || rentalData.imageUrls || [],
      scrapedAt: rentalData.scrapedAt,
      // Additional fields for New Year's trip
      tripType: 'New Years Trip',
      submittedAt: new Date().toISOString()
    };

    console.log('Sending to Zapier:', JSON.stringify(payload, null, 2));

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('Zapier response:', response.status, response.data);

    return {
      success: true,
      status: response.status,
      data: response.data
    };

  } catch (error) {
    console.error('Error sending to Zapier:', error.message);
    
    if (error.response) {
      console.error('Zapier response error:', error.response.status, error.response.data);
      throw new Error(`Zapier webhook error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('No response from Zapier webhook');
    } else {
      throw error;
    }
  }
}

