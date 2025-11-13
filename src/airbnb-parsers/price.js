/**
 * Extract price information from Airbnb listing
 * Adapted from pyairbnb/price.py
 */

import axios from 'axios';
import { getNestedValue } from './utils.js';
import { parsePriceSymbol } from './utils.js';

const PRICE_API_ENDPOINT = 'https://www.airbnb.com/api/v3/StaysPdpSections/80c7889b4b0027d99ffea830f6c0d4911a6e863a957cbe1044823f0fc746bf1f';

/**
 * Get price information for a listing
 * @param {string} apiKey - Airbnb API key
 * @param {Object} cookies - Cookies from the initial request
 * @param {string} impressionId - Impression ID from the listing page
 * @param {string} productId - Listing ID
 * @param {string} checkIn - Check-in date (YYYY-MM-DD) - optional
 * @param {string} checkOut - Check-out date (YYYY-MM-DD) - optional
 * @param {number} adults - Number of adults (default: 1)
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} language - Language code (default: 'en')
 * @param {string} proxyUrl - Optional proxy URL
 * @returns {Promise<Object>} Price data
 */
export async function getPrice(apiKey, cookies, impressionId, productId, checkIn = null, checkOut = null, adults = 1, currency = 'USD', language = 'en', proxyUrl = null) {
  const extension = {
    persistedQuery: {
      version: 1,
      sha256Hash: '80c7889b4b0027d99ffea830f6c0d4911a6e863a957cbe1044823f0fc746bf1f',
    },
  };

  const variablesData = {
    id: productId,
    pdpSectionsRequest: {
      adults: String(adults),
      bypassTargetings: false,
      categoryTag: null,
      causeId: null,
      children: null,
      disasterId: null,
      discountedGuestFeeVersion: null,
      displayExtensions: null,
      federatedSearchId: null,
      forceBoostPriorityMessageType: null,
      infants: null,
      interactionType: null,
      layouts: ['SIDEBAR', 'SINGLE_COLUMN'],
      pets: 0,
      pdpTypeOverride: null,
      photoId: null,
      preview: false,
      previousStateCheckIn: null,
      previousStateCheckOut: null,
      priceDropSource: null,
      privateBooking: false,
      promotionUuid: null,
      relaxedAmenityIds: null,
      searchId: null,
      selectedCancellationPolicyId: null,
      selectedRatePlanId: null,
      splitStays: null,
      staysBookingMigrationEnabled: false,
      translateUgc: null,
      useNewSectionWrapperApi: false,
      sectionIds: [
        'BOOK_IT_FLOATING_FOOTER',
        'POLICIES_DEFAULT',
        'EDUCATION_FOOTER_BANNER_MODAL',
        'BOOK_IT_SIDEBAR',
        'URGENCY_COMMITMENT_SIDEBAR',
        'BOOK_IT_NAV',
        'MESSAGE_BANNER',
        'HIGHLIGHTS_DEFAULT',
        'EDUCATION_FOOTER_BANNER',
        'URGENCY_COMMITMENT',
        'BOOK_IT_CALENDAR_SHEET',
        'CANCELLATION_POLICY_PICKER_MODAL'
      ],
      checkIn: checkIn,
      checkOut: checkOut,
      p3ImpressionId: impressionId,
    },
  };

  const queryParams = new URLSearchParams({
    operationName: 'StaysPdpSections',
    locale: language,
    currency: currency,
    variables: JSON.stringify(variablesData),
    extensions: JSON.stringify(extension),
  });

  const url = `${PRICE_API_ENDPOINT}?${queryParams.toString()}`;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Airbnb-Api-Key': apiKey,
  };

  const config = {
    headers,
    timeout: 15000,
  };

  if (proxyUrl) {
    config.proxy = {
      host: proxyUrl.split(':')[0],
      port: parseInt(proxyUrl.split(':')[1] || '80')
    };
  }

  // Convert cookies object to axios format
  if (cookies && typeof cookies === 'object') {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    headers['Cookie'] = cookieString;
  }

  try {
    const response = await axios.get(url, config);
    const data = response.data;

    const sections = getNestedValue(data, 'data.presentation.stayProductDetailPage.sections.sections', []);
    const priceGroups = getNestedValue(data, 'data.presentation.stayProductDetailPage.sections.metadata.bookingPrefetchData.barPrice.explanationData.priceGroups', []);

    const finalData = {
      raw: priceGroups,
    };

    for (const section of sections) {
      if (section.sectionId === 'BOOK_IT_SIDEBAR') {
        const priceData = getNestedValue(section, 'section.structuredDisplayPrice', {});
        
        finalData.main = {
          price: getNestedValue(priceData, 'primaryLine.price', ''),
          discountedPrice: getNestedValue(priceData, 'primaryLine.discountedPrice', ''),
          originalPrice: getNestedValue(priceData, 'primaryLine.originalPrice', ''),
          qualifier: getNestedValue(priceData, 'primaryLine.qualifier', ''),
        };

        finalData.details = {};
        const details = getNestedValue(priceData, 'explanationData.priceDetails', []);
        
        for (const detail of details) {
          const items = getNestedValue(detail, 'items', []);
          for (const item of items) {
            finalData.details[item.description] = item.priceString;
          }
        }

        return finalData;
      }
    }

    return finalData;
  } catch (error) {
    console.error('[Price API] Error fetching price:', error.message);
    throw error;
  }
}

/**
 * Extract numeric price from price string
 * @param {string} priceString - Price string like "$150" or "$150/night"
 * @returns {number|null} Numeric price value
 */
export function extractPriceAmount(priceString) {
  if (!priceString) return null;
  
  const [amount] = parsePriceSymbol(priceString);
  return amount > 0 ? amount : null;
}

