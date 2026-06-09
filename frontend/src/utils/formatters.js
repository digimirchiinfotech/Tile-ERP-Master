/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

/**
 * Number and Currency Formatting Utilities
 * Provides consistent formatting functions for numbers, prices, weights, and measurements
 * across the application using locale-specific formatting.
 */

/**
 * Format a number with specified decimal places using locale-specific formatting
 * 
 * @param {number|string} value - The numeric value to format
 * @param {number} [decimals=2] - Number of decimal places to display
 * @returns {string} Formatted number string with thousand separators and decimal places
 * 
 * @example
 * formatNumber(1234.5678) // => "1,234.57"
 * formatNumber(1234.5678, 0) // => "1,235"
 * formatNumber(1234.5678, 4) // => "1,234.5678"
 */
export const formatNumber = (value, decimals = 2) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format a price value with 2 decimal places for currency display in INR (default)
 * 
 * @param {number|string} value - The price value to format
 * @param {string} currency - Optional currency string (e.g., 'INR (₹)', 'USD ($)')
 * @returns {string} Formatted price string in INR format by default (e.g., "₹1,234.56")
 * 
 * @example
 * formatPrice(1234.5) // => "$1,234.50"
 * formatPrice("999.99") // => "$999.99"
 */
export const formatPrice = (value, currency) => {
  const num = parseFloat(value) || 0;
  const formatWithSymbol = (val, sym) => {
    return `${sym}${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!currency) return formatWithSymbol(num, '$');

  try {
    const code = String(currency).includes('(') ? String(currency).split(' ')[0].trim() : String(currency).trim();
    const upper = code.toUpperCase();
    if (upper === 'INR' || String(currency).includes('₹') || upper === 'INDIAN RUPEE') return formatWithSymbol(num, '₹');
    if (upper === 'USD' || String(currency).includes('$') || upper === 'US DOLLAR') return formatWithSymbol(num, '$');
    if (upper === 'EUR' || String(currency).includes('€') || upper === 'EURO') return formatWithSymbol(num, '€');
    if (upper === 'GBP' || String(currency).includes('£') || upper === 'BRITISH POUND') return formatWithSymbol(num, '£');
    
    // Check if there is a parenthesis with a symbol
    if (String(currency).includes('(')) {
      const match = String(currency).match(/\(([^)]+)\)/);
      if (match && match[1]) {
        return formatWithSymbol(num, match[1]);
      }
    }
  } catch (e) {
    // Fallback
  }

  return formatWithSymbol(num, '$');
};

/**
 * Format a weight value with 2 decimal places
 * 
 * @param {number|string} value - The weight value to format (typically in kg)
 * @returns {string} Formatted weight string with 2 decimal places
 * 
 * @example
 * formatWeight(22.5) // => "22.50"
 * formatWeight(1234.567) // => "1,234.57"
 */
export const formatWeight = (value) => {
  return formatNumber(value, 2);
};

/**
 * Format a quantity value with 2 decimal places
 * 
 * @param {number|string} value - The quantity value to format
 * @returns {string} Formatted quantity string with 2 decimal places
 * 
 * @example
 * formatQuantity(48) // => "48.00"
 * formatQuantity(123.456) // => "123.46"
 */
export const formatQuantity = (value) => {
  return formatNumber(value, 2);
};

/**
 * Format square meter (SQM) values with 2 decimal places
 * 
 * @param {number|string} value - The SQM value to format
 * @returns {string} Formatted SQM string with 2 decimal places
 * 
 * @example
 * formatSQM(69.12) // => "69.12"
 * formatSQM(1234.5678) // => "1,234.57"
 */
export const formatSQM = (value) => {
  return formatNumber(value, 2);
};

/**
 * Format an integer value without decimal places
 * 
 * @param {number|string} value - The value to format as an integer
 * @returns {string} Formatted integer string with thousand separators, no decimals
 * 
 * @example
 * formatInteger(1234) // => "1,234"
 * formatInteger(1234.99) // => "1,234" (rounded down)
 * formatInteger("5678") // => "5,678"
 */
export const formatInteger = (value) => {
  const num = parseInt(value) || 0;
  return num.toLocaleString('en-US');
};

/**
 * Format date for display in DD/MM/YYYY format
 * This is the single source of truth for date display formatting across the app.
 * 
 * @param {string|Date} value - Date value to format
 * @returns {string} Formatted date string (e.g., "08/04/2026")
 * 
 * @example
 * formatDisplayDate('2026-04-08') // => "08/04/2026"
 * formatDisplayDate(new Date())   // => "08/04/2026"
 * formatDisplayDate(null)         // => "-"
 */
export const formatDisplayDate = (value) => {
  if (!value) return '-';
  
  if (typeof value === 'string' && value.includes(',')) {
    return value.split(',').map(v => formatDisplayDate(v.trim())).filter(val => val !== '-').join(', ');
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    if (typeof value === 'string' && /^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}$/.test(value.trim())) {
      return value.trim().replace(/\./g, '/');
    }
    return '-';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date for HTML5 date input (YYYY-MM-DD)
 * Ensures consistent date population in form inputs.
 * 
 * @param {string|Date} value - Date value to format
 * @returns {string} Formatted date string (e.g., "2026-04-08")
 */
export const formatDateForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
