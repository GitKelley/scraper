/**
 * Utility functions adapted from pyairbnb/utils.py
 */

const regexSpace = /[\s\u00A0]+/g;
const regexPrice = /\d+/;

/**
 * Remove extra spaces from a string
 */
export function removeSpace(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(regexSpace, ' ').trim();
}

/**
 * Get nested value from object using dot notation path
 */
export function getNestedValue(dic, keyPath, defaultValue = null) {
  if (!dic || typeof dic !== 'object') return defaultValue;
  
  const keys = keyPath.split('.');
  let current = dic;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
    if (current === undefined || current === null) {
      return defaultValue;
    }
  }
  
  return current;
}

/**
 * Parse price string to extract amount and currency symbol
 */
export function parsePriceSymbol(priceRaw) {
  if (!priceRaw || typeof priceRaw !== 'string') {
    return [0, ''];
  }
  
  const cleaned = priceRaw.replace(/,/g, '');
  const priceMatch = cleaned.match(regexPrice);
  
  if (!priceMatch) {
    return [0, ''];
  }
  
  const priceNumber = priceMatch[0];
  const priceCurrency = cleaned.replace(priceNumber, '').replace(/\s+/g, '').replace(/-/g, '');
  
  let priceConverted = parseFloat(priceNumber);
  if (priceRaw.startsWith('-')) {
    priceConverted *= -1;
  }
  
  return [priceConverted, priceCurrency];
}

