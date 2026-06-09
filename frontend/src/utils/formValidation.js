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
 * Form Validation Utility
 * Only validates REQUIRED fields (marked with *)
 * Optional fields NEVER cause validation errors
 */

export const REQUIRED_FIELDS = {
  product: ['factoryName', 'factoryProductName', 'catalogueName', 'size', 'surface', 'thickness', 'application', 'sqmPerBox', 'defaultPerBoxWeight', 'defaultPerPalletWeight'],
  client: ['name', 'country', 'city', 'address'],
  supplier: ['name', 'country'],
  invoice: ['clientName', 'date', 'totalAmount'],
  order: ['supplierName', 'date', 'poNo'],
};

/**
 * Validate only required fields
 * Optional fields with empty/null values are ignored
 */
export const validateRequiredFields = (formData, moduleType) => {
  const newErrors = {};
  const requiredFields = REQUIRED_FIELDS[moduleType] || [];

  requiredFields.forEach(field => {
    const value = formData[field];
    
    // Allow empty arrays/objects for optional fields
    if (Array.isArray(value) && value.length === 0 && !requiredFields.includes(field)) {
      return;
    }
    
    // For required fields
    if (requiredFields.includes(field)) {
      if (Array.isArray(value) && value.length === 0) {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
      } else if (!value || (typeof value === 'string' && !value.trim())) {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    }
  });

  return newErrors;
};

/**
 * Validate optional field if it has a value
 * Don't throw errors for empty optional fields
 */
export const validateIfProvided = (value, fieldName, rules) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return null; // Optional field is empty - no error
  }
  
  // Field has value - apply validation rules
  if (rules.maxLength && value.toString().length > rules.maxLength) {
    return `${fieldName} must not exceed ${rules.maxLength} characters`;
  }
  
  if (rules.minLength && value.toString().length < rules.minLength) {
    return `${fieldName} must be at least ${rules.minLength} characters`;
  }
  
  if (rules.min !== undefined && parseFloat(value) < rules.min) {
    return `${fieldName} must be at least ${rules.min}`;
  }
  
  if (rules.max !== undefined && parseFloat(value) > rules.max) {
    return `${fieldName} must not exceed ${rules.max}`;
  }
  
  if (rules.pattern && !rules.pattern.test(value.toString())) {
    return rules.patternError || `${fieldName} format is invalid`;
  }
  
  return null;
};
