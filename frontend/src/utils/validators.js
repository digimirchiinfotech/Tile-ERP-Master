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

export const validateCompanyName = (value) => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return { isValid: false, error: 'Company name is required' };
  }
  const trimmed = value.trim();
  if (trimmed.length < 2) return { isValid: false, error: 'Company name must be at least 2 characters' };
  if (trimmed.length > 255) return { isValid: false, error: 'Company name cannot exceed 255 characters' };
  const companyNamePattern = /^[a-zA-Z0-9\s&.,\-'\"()]+$/;
  if (!companyNamePattern.test(trimmed)) return { isValid: false, error: 'Company name contains invalid characters' };
  return { isValid: true, error: null };
};

export const validateFullName = (value) => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return { isValid: false, error: 'Full name is required' };
  }
  const trimmed = value.trim();
  if (trimmed.length < 2) return { isValid: false, error: 'Full name must be at least 2 characters' };
  if (trimmed.length > 255) return { isValid: false, error: 'Full name cannot exceed 255 characters' };
  const fullNamePattern = /^[a-zA-Z\s\-'.]+$/;
  if (!fullNamePattern.test(trimmed)) return { isValid: false, error: 'Full name can only contain letters, spaces, hyphens, apostrophes, and periods' };
  return { isValid: true, error: null };
};

export const validateIndianMobile = (phone) => {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(String(phone).trim()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid Indian mobile' };
};

export const validateContactNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') return { isValid: false, error: 'Contact number is required' };
  const trimmed = phoneNumber.trim();
  const phoneRegex = /^(\+\d{1,3})?[\s.-]?\d{1,14}$/;
  if (!phoneRegex.test(trimmed)) return { isValid: false, error: 'Invalid phone number format' };
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return { isValid: false, error: 'Phone must have 7-15 digits' };
  return { isValid: true, error: null };
};

export const validateGST = (gst) => {
  if (!gst || typeof gst !== 'string') return { isValid: false, error: 'GST number is required' };
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  return regex.test(String(gst).trim().toUpperCase()) ? { isValid: true, error: null } : { isValid: false, error: 'Enter a valid GSTIN' };
};

export const validatePAN = (pan) => {
  if (!pan || typeof pan !== 'string') return { isValid: false, error: 'PAN number is required' };
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  return regex.test(String(pan).trim().toUpperCase()) ? { isValid: true, error: null } : { isValid: false, error: 'Enter a valid PAN number' };
};

export const validateDigitsOnly = (value, fieldName = 'Field') => {
  return /^\d+$/.test(String(value)) ? { isValid: true, error: null } : { isValid: false, error: `${fieldName} must be digits only` };
};

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return { isValid: false, error: 'Email is required' };
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return regex.test(String(email).trim()) ? { isValid: true, error: null } : { isValid: false, error: 'Enter a valid email address' };
};

export const validateAddress = (address) => {
  if (!address || typeof address !== 'string' || address.length < 3) return { isValid: false, error: 'Address is required' };
  return { isValid: true, error: null };
};

export const validatePinCode = (pin) => {
  return /^[1-9][0-9]{5}$/.test(String(pin).trim()) ? { isValid: true, error: null } : { isValid: false, error: 'Invalid PIN' };
};

export const validateCityOrState = (val, field = 'City/State') => {
  if (!val || typeof val !== 'string') return { isValid: false, error: `${field} is required` };
  return { isValid: true, error: null };
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

export const validatePassword = (pass) => {
  return (pass && pass.length >= 8) ? { isValid: true, error: null } : { isValid: false, error: 'Password min 8 chars' };
};

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
  if (n === null || n === undefined || n === '') return { isValid: false, error: `${fieldName} is required` };
  const str = String(n).trim();
  const regexPattern = allowDecimals ? `^\\d+(\\.\\d{1,${maxDecimals}})?$` : `^\\d+$`;
  const regex = new RegExp(regexPattern);
  if (!regex.test(str)) return { isValid: false, error: `${fieldName} must be a valid number` };
  const num = parseFloat(str);
  if (min !== undefined && num < min) return { isValid: false, error: `${fieldName} must be at least ${min}` };
  if (max !== undefined && num > max) return { isValid: false, error: `${fieldName} must not exceed ${max}` };
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
  return { value: parseFloat(m[1]), unit: (m[2] || 'mm').toLowerCase() };
};

export const validateThickness = (value, fieldName = 'Thickness') => {
  if (!value || typeof value !== 'string') return { isValid: false, error: `${fieldName} is required` };
  const trimmed = value.trim();
  const thicknessRegex = /^(\d+(?:\.\d+)?)\s*(mm|cm)?$/i;
  if (!thicknessRegex.test(trimmed)) return { isValid: false, error: 'Format: 9mm' };
  const m = trimmed.match(thicknessRegex);
  const num = parseFloat(m[1]);
  if (!isFinite(num) || num <= 0) return { isValid: false, error: `${fieldName} must be positive` };
  return { isValid: true, error: null };
};

export const validateSize = (value, fieldName = 'Size') => {
  if (!value || typeof value !== 'string') return { isValid: false, error: `${fieldName} is required` };
  const trimmed = value.trim();
  const sizeRegex = /^(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(cm|mm)?$/i;
  if (!sizeRegex.test(trimmed)) return { isValid: false, error: 'Format: 60x60cm' };
  return { isValid: true, error: null };
};

export const validateIFSC = (ifsc) => {
  if (!ifsc || typeof ifsc !== 'string') return { isValid: false, error: 'IFSC is required' };
  const trimmed = ifsc.trim().toUpperCase();
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(trimmed)) return { isValid: false, error: 'Enter a valid 11-character IFSC' };
  return { isValid: true, error: null };
};

export const validateAccountNumber = (accNo) => {
  if (!accNo || typeof accNo !== 'string') return { isValid: false, error: 'Account number is required' };
  const trimmed = accNo.trim();
  const accRegex = /^\d{9,18}$/;
  if (!accRegex.test(trimmed)) return { isValid: false, error: 'Must be 9-18 digits' };
  return { isValid: true, error: null };
};

export const sanitizeHTML = (input) => {
  if (!input || typeof input !== 'string') return input;
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' };
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
};

export const detectSQLInjection = (input) => {
  if (!input || typeof input !== 'string') return false;
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /('|")\s*(OR|AND)\s*('|")/i,
    /UNION.*SELECT/i
  ];
  return sqlPatterns.some(pattern => pattern.test(input));
};

export default {
  validateRequiredType, validateTypeCheck, validateName, validateIndianMobile, validateContactNumber,
  validateGST, validatePAN, validateDigitsOnly, validateEmail, validateAddress, validatePinCode,
  validateCityOrState, validateAmount, validateDate, validateURL, validatePassword, validateConfirmPassword,
  validateUsernameAlphanumeric, validateUsername, validateFileUpload,
  validateDimension, validateTruckNumber, validateSealNumber, validateTextField, validateCityName,
  validateClientName, validateNumeric, validateIEC, validateUUID, formatErrorResponse, validateMultipleFields,
  validateThickness, validateSize, parseThickness, validateCompanyName, validateFullName,
  validateIFSC, validateAccountNumber, sanitizeHTML, detectSQLInjection
};
