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
 * Validation Helper - Standardized error handling and validation
 */

/**
 * Extract validation errors from API response
 * Handles multiple error formats from backend
 */
export const extractValidationErrors = (error) => {
  try {
    // Handle Axios error response
    if (error.response?.data) {
      const data = error.response.data;
      
      // Format 1: { errors: { fieldName: 'message' } }
      if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
        return data.errors;
      }
      
      // Format 3: { data: { errors: {...} } }
      if (data.data?.errors) {
        return data.data.errors;
      }
      
      // Format 4: express-validator array format [{ path: 'field', msg: 'message' }] or [{ param: 'field', msg: 'message' }]
      if (Array.isArray(data.errors)) {
        const errorObj = {};
        data.errors.forEach(err => {
          const field = err.path || err.param || 'general';
          if (!errorObj[field]) {
            errorObj[field] = err.msg || err.message;
          }
        });
        return errorObj;
      }

      // Format 2: { message: 'error message' }
      if (data.message) {
        return { general: data.message };
      }
    }

    // Handle generic error message
    if (error.message) {
      return { general: error.message };
    }

    return { general: 'An unexpected error occurred. Please try again.' };
  } catch (err) {
    return { general: 'Failed to process error response' };
  }
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (data, requiredFields) => {
  const errors = {};

  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors[field] = `${field.replace(/_/g, ' ')} is required`;
    }
  });

  return errors;
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (basic - 10+ digits)
 */
export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\d{10,}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/**
 * Validate URL format
 */
export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate number is positive
 */
export const validatePositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
};

/**
 * Format error field name for display
 */
export const formatFieldName = (fieldName) => {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

/**
 * Check if object has any errors
 */
export const hasErrors = (errors) => {
  return errors && Object.keys(errors).length > 0;
};
