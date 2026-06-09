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
 * Input Helper Utilities
 * Provides functions to restrict and format user input in real-time
 */

/**
 * Restricts input to numbers only (for phone numbers, etc.)
 * Allows + at the beginning for international numbers
 * @param {string} value - The input value
 * @param {boolean} allowPlus - Whether to allow + at the beginning
 * @returns {string} - Sanitized numeric value
 */
export const restrictToNumbers = (value, allowPlus = true) => {
  if (!value) return '';
  
  // Convert to string if it's a number
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  // Remove all non-numeric characters except + at the beginning
  let sanitized = valueStr.replace(/[^0-9+]/g, '');
  
  if (allowPlus) {
    // Ensure + only appears at the beginning
    const plusCount = (sanitized.match(/\+/g) || []).length;
    if (plusCount > 1) {
      sanitized = '+' + sanitized.replace(/\+/g, '');
    }
    if (sanitized.indexOf('+') > 0) {
      sanitized = sanitized.replace(/\+/g, '');
    }
  } else {
    // Remove all + signs
    sanitized = sanitized.replace(/\+/g, '');
  }
  
  return sanitized;
};

/**
 * Formats phone number with proper spacing/hyphens for display
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^0-9+]/g, '');
  
  // Handle international numbers starting with +
  if (cleaned.startsWith('+')) {
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    if (cleaned.length <= 11) return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)} ${cleaned.slice(11)}`;
  }
  
  // Handle domestic numbers
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  if (cleaned.length <= 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  
  return cleaned; // Return as-is if too long
};

/**
 * Restricts input to alphanumeric characters only
 * @param {string} value - The input value
 * @param {boolean} allowSpaces - Whether to allow spaces
 * @returns {string} - Sanitized alphanumeric value
 */
export const restrictToAlphaNumeric = (value, allowSpaces = true) => {
  if (!value) return '';
  
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  if (allowSpaces) {
    return valueStr.replace(/[^a-zA-Z0-9\s]/g, '');
  }
  return valueStr.replace(/[^a-zA-Z0-9]/g, '');
};

/**
 * Restricts input to letters only (for names, etc.)
 * @param {string} value - The input value
 * @param {boolean} allowSpaces - Whether to allow spaces
 * @returns {string} - Sanitized alphabetic value
 */
export const restrictToLetters = (value, allowSpaces = true) => {
  if (!value) return '';
  
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  if (allowSpaces) {
    return valueStr.replace(/[^a-zA-Z\s]/g, '');
  }
  return valueStr.replace(/[^a-zA-Z]/g, '');
};

/**
 * Restricts input to decimal numbers (for prices, weights, etc.)
 * @param {string} value - The input value
 * @param {number} decimalPlaces - Maximum decimal places allowed
 * @returns {string} - Sanitized decimal value
 */
export const restrictToDecimal = (value, decimalPlaces = 3) => {
  if (value === null || value === undefined) return '';
  
  // Convert to string if it's a number
  const valueStr = typeof value === 'number' ? value.toString() : String(value);
  
  // Remove any character that is not a digit or a dot
  let sanitized = valueStr.replace(/[^0-9.]/g, '');
  
  // Ensure only one dot (e.g., prevent 00..5 or ..25)
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Handle leading dot: ".5" -> "0.5"
  if (sanitized.startsWith('.')) {
    sanitized = '0' + sanitized;
  }
  
  // Limit decimal places
  const decimalIndex = sanitized.indexOf('.');
  if (decimalIndex !== -1) {
    if (sanitized.substring(decimalIndex + 1).length > decimalPlaces) {
      sanitized = sanitized.substring(0, decimalIndex + decimalPlaces + 1);
    }
  }
  
  // Handle multiple leading zeros: "005" -> "5", "00" -> "0", "00.5" -> "0.5", "0.5" -> "0.5"
  if (sanitized.length > 1 && sanitized.startsWith('0') && sanitized[1] !== '.') {
    sanitized = sanitized.replace(/^0+/, '');
    if (sanitized === '' || sanitized.startsWith('.')) {
      sanitized = '0' + sanitized;
    }
  }
  
  return sanitized;
};

/**
 * Restricts input to truck number format (India)
 * Allows only uppercase letters and digits, auto-converts to uppercase
 * Format: AA00AA0000
 * @param {string} value - The input value
 * @returns {string} - Sanitized truck number value
 */
export const restrictToTruckNumber = (value) => {
  if (!value) return '';
  
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  // Remove all characters except letters and digits, convert to uppercase
  let sanitized = valueStr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Limit to 10 characters (AA00AA0000)
  if (sanitized.length > 10) {
    sanitized = sanitized.substring(0, 10);
  }
  
  return sanitized;
};

/**
 * Restricts input to seal number format
 * Allows only alphanumeric characters, no spaces or special characters
 * @param {string} value - The input value
 * @param {number} maxLength - Maximum length allowed
 * @returns {string} - Sanitized seal number value
 */
export const restrictToSealNumber = (value, maxLength = 10) => {
  if (!value) return '';
  
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  // Remove all non-alphanumeric characters
  let sanitized = valueStr.replace(/[^a-zA-Z0-9]/g, '');
  
  // Limit to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Restricts input to allow numbers, characters, spaces, dots, and asterisks
 * Used for product specifications like Size, Surface, Thickness, Application
 * Allows: a-z, A-Z, 0-9, space, dot (.), asterisk (*)
 * @param {string} value - The input value
 * @returns {string} - Sanitized value with allowed characters only
 */
export const restrictToSpecificationChars = (value) => {
  if (!value) return '';
  const valueStr = typeof value === 'number' ? value.toString() : value;
  // Allow: letters (a-z, A-Z), numbers (0-9), space, dot (.), asterisk (*), slash (/), hyphen (-), comma (,), parentheses ( )
  return valueStr.replace(/[^a-zA-Z0-9\s.*\-/,()]/g, '');
};

/**
 * Capitalizes first letter of each word
 * @param {string} value - The input value
 * @returns {string} - Capitalized value
 */
export const capitalizeWords = (value) => {
  if (!value) return '';
  
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  return valueStr.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Validates and sanitizes email input in real-time
 * @param {string} email - Email input
 * @returns {string} - Sanitized email (lowercase, no spaces)
 */
export const sanitizeEmail = (email) => {
  if (!email) return '';
  
  const emailStr = typeof email === 'number' ? email.toString() : email;
  
  // Convert to lowercase and remove spaces
  return emailStr.toLowerCase().replace(/\s/g, '');
};

/**
 * Real-time validation helper that returns error message
 * @param {string} value - Value to validate
 * @param {string} type - Type of validation (email, phone, required, etc.)
 * @param {Object} options - Additional validation options
 * @returns {string} - Error message or empty string if valid
 */
export const getValidationError = (value, type, options = {}) => {
  const { required = false, minLength, maxLength, label = 'Field' } = options;
  
  // Check if required
  if (required && (!value || value.trim() === '')) {
    return `${label} is required`;
  }
  
  // If not required and empty, no error
  if (!value || value.trim() === '') {
    return '';
  }
  
  // Type-specific validation
  switch (type) {
    case 'email':
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(value.trim())) {
        return 'Please enter a valid email address';
      }
      if (value.trim().includes(' ')) {
        return 'Email cannot contain spaces';
      }
      break;
      
    case 'phone':
      const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
      const phoneRegex = /^[\+]?[1-9][\d]{6,14}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return 'Please enter a valid phone number (7-15 digits)';
      }
      break;
      
    case 'password':
      if (value.length < 8) {
        return 'Password must be at least 8 characters long';
      }
      if (value.includes(' ')) {
        return 'Password cannot contain spaces';
      }
      if (!/[A-Z]/.test(value)) {
        return 'Password must contain at least one uppercase letter';
      }
      if (!/[a-z]/.test(value)) {
        return 'Password must contain at least one lowercase letter';
      }
      if (!/[0-9]/.test(value)) {
        return 'Password must contain at least one digit';
      }
      if (!/[!@#$%^&*]/.test(value)) {
        return 'Password must contain at least one special character (!@#$%^&*)';
      }
      break;
      
    case 'number':
      if (isNaN(value) || isNaN(parseFloat(value))) {
        return `${label} must be a valid number`;
      }
      if (parseFloat(value) <= 0) {
        return `${label} must be a positive number`;
      }
      break;
      
    case 'decimal':
      if (!/^\d*\.?\d*$/.test(value)) {
        return `${label} must be a valid decimal number`;
      }
      break;
      
    case 'truckNumber':
      const truckCleaned = value.replace(/\s/g, '').toUpperCase();
      const truckRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
      if (!truckRegex.test(truckCleaned)) {
        return 'Invalid truck number format (e.g., MH12AB1234)';
      }
      break;
      
    case 'sealNumber':
      if (value.includes(' ')) {
        return 'Seal number cannot contain spaces';
      }
      if (!/^[a-zA-Z0-9]+$/.test(value)) {
        return 'Seal number can only contain letters and numbers';
      }
      if (value.length < 6 || value.length > 10) {
        return 'Seal number must be 6-10 characters long';
      }
      break;
      
    case 'city':
    case 'clientName':
    case 'username':
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        return `${label} can only contain letters and spaces`;
      }
      if (/\s{2,}/.test(value)) {
        return `${label} cannot contain multiple consecutive spaces`;
      }
      break;
  }
  
  // Length validation
  if (minLength && value.length < minLength) {
    return `${label} must be at least ${minLength} characters`;
  }
  
  if (maxLength && value.length > maxLength) {
    return `${label} must not exceed ${maxLength} characters`;
  }
  
  return '';
};

/**
 * Creates an input change handler with built-in validation and restrictions
 * @param {Function} setValue - State setter function
 * @param {Function} setError - Error setter function
 * @param {string} validationType - Type of validation to apply
 * @param {Object} options - Validation options
 * @returns {Function} - Input change handler
 */
export const createValidatedInputHandler = (setValue, setError, validationType, options = {}) => {
  return (e) => {
    let value = e.target.value;
    
    // Apply input restrictions based on validation type
    switch (validationType) {
      case 'phone':
        value = restrictToNumbers(value, true);
        break;
      case 'number':
        value = restrictToNumbers(value, false);
        break;
      case 'decimal':
        value = restrictToDecimal(value, options.decimalPlaces);
        break;
      case 'letters':
      case 'city':
      case 'clientName':
      case 'username':
        value = restrictToLetters(value, options.allowSpaces !== false);
        break;
      case 'alphanumeric':
        value = restrictToAlphaNumeric(value, options.allowSpaces !== false);
        break;
      case 'email':
        value = sanitizeEmail(value);
        break;
      case 'truckNumber':
        value = restrictToTruckNumber(value);
        break;
      case 'sealNumber':
        value = restrictToSealNumber(value, options.maxLength);
        break;
    }
    
    // Update value
    setValue(value);
    
    // Validate and set error
    if (setError) {
      const error = getValidationError(value, validationType, options);
      setError(error);
    }
  };
};
/**
 * Validates thickness format
 * Allows: 9mm, 9 mm, 9.5mm, 9.5 mm, etc
 * @param {string} value - The thickness value
 * @returns {string} - Error message or empty string if valid
 */
export const validateThicknessFormat = (value) => {
  if (!value || !value.trim()) {
    return 'Thickness is required';
  }
  
  const trimmed = value.trim();
  // Allow: number with optional decimal and optional unit (mm or cm), with optional space
  // Examples: 9mm, 9 mm, 9.5mm, 1.2 cm, 10
  const thicknessRegex = /^(\d+(?:\.\d+)?)\s*(mm|cm)?$/i;

  if (!thicknessRegex.test(trimmed)) {
    return 'Format: 9mm, 9 mm, 9.5mm or 1.2 cm (units mm or cm optional)';
  }

  // numeric value must be > 0
  const m = trimmed.match(thicknessRegex);
  const num = parseFloat(m[1]);
  if (!isFinite(num) || num <= 0) return 'Thickness must be a positive number';

  return '';
};

/**
 * Validates size format
 * Allows: 60 x 60 cm, 600 x 600 mm (no inches, no trailing spaces)
 * @param {string} value - The size value
 * @returns {string} - Error message or empty string if valid
 */
export const validateSizeFormat = (value) => {
  if (!value || !value.trim()) {
    return 'Size is required';
  }
  
  const trimmed = value.trim();
  
  // Check for trailing/leading spaces
  if (trimmed !== value.replace(/^\s+|\s+$/g, '')) {
    return 'Format: No blank spaces allowed (e.g., 60x60cm or 60 x 60 cm)';
  }
  
  // Allow: number x number unit (cm or mm only, no inches)
  // Examples: 60x60cm, 60 x 60 cm, 600x600mm, etc
  const sizeRegex = /^(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(cm|mm)?$/i;
  
  if (!sizeRegex.test(trimmed)) {
    return 'Format: 60x60cm, 60 x 60 cm, or 600x600mm (cm or mm only, no inches)';
  }
  
  return '';
};

/**
 * Restricts input for thickness field
 * Allows numbers, decimal point, space, and 'mm'
 * @param {string} value - The input value
 * @returns {string} - Sanitized value
 */
export const restrictToThicknessFormat = (value) => {
  if (!value) return '';
  
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  // Keep digits, dot, spaces, and letters m,c (for mm/cm)
  const cleaned = valueStr.replace(/[^0-9.\smcMC]/g, '');
  return cleaned.trim();
};

/**
 * Restricts input for size field
 * Allows numbers, decimal point, space, 'x', and units (cm, mm, in)
 * @param {string} value - The input value
 * @returns {string} - Sanitized value
 */
export const restrictToSizeFormat = (value) => {
  if (!value) return '';
  
  const valueStr = typeof value === 'number' ? value.toString() : value;
  
  // Allow: numbers, dot, space, 'x', and common units
  // Keep x for multiplication, allow numbers, decimal, space, and units
  let result = valueStr.replace(/[^0-9.\sx\s]/gi, (char) => {
    if (/[cm|mm|in]/i.test(char)) return char;
    return '';
  });
  
  // Clean up: allow letters only for units at the end
  result = result.replace(/[^0-9.\sx]/g, (char) => {
    return /[a-z]/i.test(char) ? char : '';
  });
  
  return result;
};

/**
 * Deduplicates master data arrays by value (case-insensitive)
 * Handles both arrays of strings and arrays of objects with a 'value' property
 * @param {Array} arr - The array to deduplicate
 * @returns {Array} - Deduplicated array
 */
export const deduplicateMasterData = (arr) => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  return arr.filter(item => {
    if (!item) return false;
    const rawVal = typeof item === 'object' ? (item.value || item.name || item.portName || item.countryName || item.cityName || '') : item;
    const val = String(rawVal).trim().toLowerCase();
    if (!val || seen.has(val)) return false;
    seen.add(val);
    return true;
  });
};

/**
 * Robust UUID generator that works in non-secure (HTTP) contexts
 * Falls back to a pseudo-random generator if crypto.randomUUID is unavailable
 * @returns {string} - A random UUID
 */
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for non-secure contexts (HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
