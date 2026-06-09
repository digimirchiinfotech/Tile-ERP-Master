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
 * Comprehensive Validation Utilities for DigiMirchi ERP
 * All validators follow consistent patterns and return { isValid: boolean, error: string|null }
 */

export const validateRequiredType = (value, expectedType = 'string', fieldName = 'Field') => {
  if (value === null || value === undefined) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  if (typeof value !== expectedType) {
    return { isValid: false, error: `${fieldName} must be of type ${expectedType}, got ${typeof value}` };
  }
  if (expectedType === 'string' && typeof value.trim === 'function' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }
  if (expectedType === 'number' && isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  if (expectedType === 'array' && !Array.isArray(value)) {
    return { isValid: false, error: `${fieldName} must be an array` };
  }
  return { isValid: true, error: null };
};

export const validateTypeCheck = (value, expectedType = 'string', fieldName = 'Field') => {
  if (value === null || value === undefined) return { isValid: true, error: null };
  return validateRequiredType(value, expectedType, fieldName);
};

export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') return { isValid: false, error: `${fieldName} is required` };
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return { isValid: false, error: `${fieldName} must be 2-50 chars` };
  return { isValid: true, error: null };
};

export const validateIndianMobile = (phone) => {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(String(phone).trim()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid Indian mobile' };
};

export const validateContactNumber = (phone) => {
  if (!phone) return { isValid: false, error: 'Phone required' };
  return { isValid: true, error: null };
};

export const validateGST = (gst) => {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  return regex.test(String(gst).trim().toUpperCase()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid GSTIN' };
};

export const validatePAN = (pan) => {
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  return regex.test(String(pan).trim().toUpperCase()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid PAN' };
};

export const validateDigitsOnly = (value, fieldName = 'Field') => {
  return /^\d+$/.test(String(value)) ? { isValid: true, error: null } : { isValid: false, error: `${fieldName} must be digits only` };
};

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return regex.test(String(email).trim()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid email' };
};

export const validateAddress = (address) => {
  if (!address || address.length < 3) return { isValid: false, error: 'Address too short' };
  return { isValid: true, error: null };
};

export const validatePinCode = (pin) => {
  return /^[1-9][0-9]{5}$/.test(String(pin).trim()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid PIN' };
};

export const validateCityOrState = (val, field = 'City/State') => {
  return validateName(val, field);
};

export const validateAmount = (amt) => {
  const val = parseFloat(amt);
  return (!isNaN(val) && val >= 0) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid amount' };
};

export const validateDate = (date) => {
  return !isNaN(Date.parse(date)) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid date' };
};

export const validateURL = (url) => {
  try { new URL(url); return { isValid: true, error: null }; } catch { return { isValid: false, error: 'Invalid URL' }; }
};

import { validateStrongPassword, isWeakPassword } from './passwordPolicy.js';

export const validatePassword = (pass) => validateStrongPassword(pass);

export const validateConfirmPassword = (p1, p2) => {
  return p1 === p2 ? { isValid: true, error: null } : { isValid: false, error: 'Passwords match failed' };
};

export const validateUsernameAlphanumeric = (u) => {
  return /^[A-Za-z0-9._-]{3,20}$/.test(u) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid username' };
};

export const validateUsername = (u) => validateUsernameAlphanumeric(u);

export const validateFileUpload = (file) => (file ? { isValid: true, error: null } : { isValid: false, error: 'File required' });




export const validateDimension = (v, f = 'Dimension') => {
  const n = parseFloat(v);
  return (!isNaN(n) && n > 0) ? { isValid: true, error: null } : { isValid: false, error: `${f} must be positive` };
};

export const validateTruckNumber = (t) => ({ isValid: true, error: null });
export const validateSealNumber = (s) => ({ isValid: true, error: null });
export const validateTextField = (t) => ({ isValid: true, error: null });
export const validateCityName = (c) => ({ isValid: true, error: null });
export const validateClientName = (c) => ({ isValid: true, error: null });
export const validateIEC = (iec) => {
  return /^\d{10}$/.test(String(iec).trim()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid IEC (must be 10 digits)' };
};

export const validateNumeric = (n, options = {}) => {
  const { fieldName = 'Field', min, max, allowDecimals = true, maxDecimals = 3 } = options;
  
  if (n === null || n === undefined || n === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const str = String(n).trim();
  
  // If decimals are allowed, validate up to maxDecimals. Otherwise, digits only.
  const regexPattern = allowDecimals ? `^\\d+(\\.\\d{1,${maxDecimals}})?$` : `^\\d+$`;
  const regex = new RegExp(regexPattern);
  
  if (!regex.test(str)) {
    return { 
      isValid: false, 
      error: `${fieldName} must be a valid number${allowDecimals ? ` with up to ${maxDecimals} decimal places` : ''}` 
    };
  }

  const num = parseFloat(str);
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `${fieldName} must not exceed ${max}` };
  }
  
  return { isValid: true, error: null };
};

export const validateUUID = (id, fieldName = 'ID') => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(String(id)) ? { isValid: true, error: null } : { isValid: false, error: `${fieldName} invalid UUID` };
};

export const formatErrorResponse = (field, message) => ({ success: false, field, message });

export const validateMultipleFields = (fields) => {
  for (const f of fields) { if (!f.validator.isValid) return f.validator; }
  return { isValid: true, error: null };
};

export const parseThickness = (value) => {
  const m = value.match(/^(\d+(?:\.\d+)?)\s*(mm|cm)?$/i);
  if (!m) return null;
  return {
    value: parseFloat(m[1]),
    unit: (m[2] || 'mm').toLowerCase()
  };
};

export const validateThickness = (value, fieldName = 'Thickness') => {
  if (!value || typeof value !== 'string') return { isValid: false, error: `${fieldName} is required` };
  const trimmed = value.trim();
  const thicknessRegex = /^(\d+(?:\.\d+)?)\s*(mm|cm)?$/i;
  if (!thicknessRegex.test(trimmed)) {
    return { isValid: false, error: 'Format: 9mm, 9 mm, 9.5mm or 1.2 cm' };
  }
  const m = trimmed.match(thicknessRegex);
  const num = parseFloat(m[1]);
  if (!isFinite(num) || num <= 0) return { isValid: false, error: `${fieldName} must be a positive number` };
  return { isValid: true, error: null };
};

export const validateSize = (value, fieldName = 'Size') => {
  if (!value || typeof value !== 'string') return { isValid: false, error: `${fieldName} is required` };
  const trimmed = value.trim();
  const sizeRegex = /^(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(cm|mm)?$/i;
  if (!sizeRegex.test(trimmed)) {
    return { isValid: false, error: 'Format: 60x60cm, 60 x 60 cm, or 600x600mm' };
  }
  return { isValid: true, error: null };
};

export default {
  validateRequiredType, validateTypeCheck, validateName, validateIndianMobile, validateContactNumber,
  validateGST, validatePAN, validateDigitsOnly, validateEmail, validateAddress, validatePinCode,
  validateCityOrState, validateAmount, validateDate, validateURL, validatePassword, validateConfirmPassword,
  validateUsernameAlphanumeric, validateUsername, validateFileUpload,
  validateDimension, validateTruckNumber, validateSealNumber, validateTextField, validateCityName,
  validateClientName, validateNumeric, validateIEC, validateUUID, formatErrorResponse, validateMultipleFields,
  validateThickness, validateSize, parseThickness
};

