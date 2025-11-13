/**
 * Parse Airbnb listing page HTML to extract embedded data
 * Adapted from pyairbnb/parse.py
 */

import { removeSpace } from './utils.js';
import { JSDOM } from 'jsdom';

const regexApiKey = /"key":"([^"]+)"/;
const regexLanguage = /"language":"([^"]+)"/;

/**
 * Parse the HTML body to extract listing details, language, and API key
 */
export function parseBodyDetails(body) {
  const dom = new JSDOM(body);
  const document = dom.window.document;
  
  // Find the data-deferred-state-0 element
  const dataElement = document.querySelector('#data-deferred-state-0');
  if (!dataElement) {
    throw new Error('Could not find #data-deferred-state-0 element in HTML');
  }
  
  const htmlData = removeSpace(dataElement.textContent);
  
  // Extract language
  const languageMatch = body.match(regexLanguage);
  const language = languageMatch ? languageMatch[1] : 'en';
  
  // Extract API key
  const apiKeyMatch = body.match(regexApiKey);
  const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
  
  // Parse JSON data
  let data;
  try {
    data = JSON.parse(htmlData);
  } catch (e) {
    throw new Error(`Failed to parse JSON from data-deferred-state-0: ${e.message}`);
  }
  
  // Extract details data from niobeClientData structure
  const detailsData = data?.niobeClientData?.[0]?.[1];
  if (!detailsData) {
    throw new Error('Could not find details data in niobeClientData structure');
  }
  
  return { detailsData, language, apiKey };
}

/**
 * Wrapper function that parses and standardizes the data
 */
export function parseBodyDetailsWrapper(body) {
  const { detailsData, language, apiKey } = parseBodyDetails(body);
  
  // Extract product_id and impression_id for price API
  const productId = detailsData?.variables?.id;
  const impressionId = detailsData?.variables?.pdpSectionsRequest?.p3ImpressionId;
  
  const priceDependencyInput = {
    product_id: productId,
    impression_id: impressionId,
    api_key: apiKey
  };
  
  return { detailsData, language, priceDependencyInput };
}

