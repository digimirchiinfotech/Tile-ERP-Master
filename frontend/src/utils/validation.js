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
 * ⚠️ DEPRECATED: Use validators.js instead ⚠️
 * 
 * This file is kept for backward compatibility only.
 * All new code should use the validators in frontend/src/utils/validators.js
 * 
 * The new validators.js provides:
 * - Consistent return format: { isValid: boolean, error: string|null }
 * - Better error messages
 * - More comprehensive validation patterns
 * - Security features (sanitization, SQL injection detection)
 * 
 * Migration Guide:
 * - Replace: import { validateEmail } from './validation.js'
 * - With: import { validateEmail } from './validators.js'
 * 
 * This file will be removed in a future version.
 * 
 * ---
 * 
 * Comprehensive Validation Utilities
 * Provides validation functions for all forms and data imports throughout the application.
 * Includes email, phone, password validation, and complete form validation for all modules.
 */

/**
 * Validate email address using comprehensive RFC-compliant regex pattern
 * Must contain @ and domain, no spaces allowed
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid, false otherwise
 * 
 * @example
 * validateEmail('user@example.com') // => true
 * validateEmail('invalid.email') // => false
 * validateEmail('test@domain.co.uk') // => true
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const trimmed = email.trim();
  
  if (trimmed.includes(' ')) return false;
  
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(trimmed) && trimmed.length <= 254;
};

/**
 * Contact Number Validation (All Countries)
 * Must accept valid phone numbers for any country with country codes (e.g., +1, +91, +44)
 * Only digits (0–9) allowed after country code
 * No letters or symbols (except the leading "+")
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number is valid international format
 * 
 * @example
 * validatePhone('+1-555-1234567') // => true
 * validatePhone('+91 9876543210') // => true
 * validatePhone('1234567890') // => true
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  
  const phoneRegex = /^[\+]?[1-9][\d]{6,14}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Password Validation
 * Minimum 8 characters
 * Must include: uppercase (A-Z), lowercase (a-z), digit (0-9), special character (!@#$%^&*)
 * No spaces allowed
 * 
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with errors and strength rating
 * @returns {boolean} returns.isValid - Whether password meets all requirements
 * @returns {Array<string>} returns.errors - Array of validation error messages
 * @returns {string} returns.strength - Strength rating: 'weak', 'medium', or 'strong'
 * 
 * @example
 * validatePassword('Test@123') // => { isValid: true, errors: [], strength: 'strong' }
 * validatePassword('weak') // => { isValid: false, errors: ['Password must...'], strength: 'weak' }
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors, strength: 'weak' };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.includes(' ')) {
    errors.push('Password cannot contain spaces');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit (0-9)');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: getPasswordStrength(password),
  };
};

/**
 * Calculate password strength score based on length and character diversity
 * 
 * @param {string} password - Password to evaluate
 * @returns {string} Strength rating: 'weak', 'medium', or 'strong'
 * @private
 */
const getPasswordStrength = (password) => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
};

/**
 * Width & Height Input Validation
 * Only positive numeric values allowed
 * No characters, no symbols, no spaces
 * 
 * @param {string|number} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {boolean} True if valid dimension
 * 
 * @example
 * validateDimension('100', 'Width') // => true
 * validateDimension('abc', 'Height') // => false
 * validateDimension('-5', 'Width') // => false
 */
export const validateDimension = (value, fieldName = 'Dimension') => {
  if (value === null || value === undefined || value === '') return false;
  
  const numValue = Number(value);
  
  if (isNaN(numValue) || !isFinite(numValue)) return false;
  if (numValue <= 0) return false;
  
  return true;
};

/**
 * Truck Number Validation (India Format)
 * Format: AA 00 AA 0000 or AA00AA0000
 * 
 * Rules:
 * - First 2 characters: Alphabets only (State code)
 * - Next 2 characters: Digits only (District number)
 * - Next 1-2 characters: Alphabets only
 * - Last 4 characters: Digits only
 * 
 * Example valid: MH12AB1234, DL01CA9876
 * 
 * @param {string} truckNumber - Truck number to validate
 * @returns {boolean} True if valid truck number
 * 
 * @example
 * validateTruckNumber('MH12AB1234') // => true
 * validateTruckNumber('MH 12 AB 1234') // => true
 * validateTruckNumber('INVALID') // => false
 */
export const validateTruckNumber = (truckNumber) => {
  if (!truckNumber || typeof truckNumber !== 'string') return false;
  
  const cleaned = truckNumber.trim().replace(/\s/g, '').toUpperCase();
  
  const truckRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
  return truckRegex.test(cleaned);
};

/**
 * Seal Number Validation
 * Alphanumeric only, no spaces, no special characters
 * Length: 6-10 characters
 * 
 * @param {string} sealNumber - Seal number to validate
 * @param {number} minLength - Minimum length (default: 6)
 * @param {number} maxLength - Maximum length (default: 10)
 * @returns {boolean} True if valid seal number
 * 
 * @example
 * validateSealNumber('ABC123') // => true
 * validateSealNumber('SEAL-001') // => false (contains special char)
 * validateSealNumber('AB12') // => false (too short)
 */
export const validateSealNumber = (sealNumber, minLength = 6, maxLength = 10) => {
  if (!sealNumber || typeof sealNumber !== 'string') return false;
  
  const trimmed = sealNumber.trim();
  
  if (trimmed.includes(' ')) return false;
  
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) return false;
  
  if (trimmed.length < minLength || trimmed.length > maxLength) return false;
  
  return true;
};

/**
 * City Name Validation
 * Only alphabets (A-Z, a-z) and spaces allowed
 * No numbers, no special characters
 * 
 * @param {string} cityName - City name to validate
 * @returns {boolean} True if valid city name
 * 
 * @example
 * validateCityName('New York') // => true
 * validateCityName('Mumbai') // => true
 * validateCityName('City123') // => false
 */
export const validateCityName = (cityName) => {
  if (!cityName || typeof cityName !== 'string') return false;
  
  const trimmed = cityName.trim();
  
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) return false;
  
  if (/\s{2,}/.test(trimmed)) return false;
  
  return true;
};

/**
 * Client Name Validation
 * Only alphabets (A-Z, a-z) and spaces allowed
 * No numbers, no special characters
 * 
 * @param {string} clientName - Client name to validate
 * @returns {boolean} True if valid client name
 * 
 * @example
 * validateClientName('ABC Corporation') // => true
 * validateClientName('Client & Co') // => false
 */
export const validateClientName = (clientName) => {
  if (!clientName || typeof clientName !== 'string') return false;
  
  const trimmed = clientName.trim();
  
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) return false;
  
  if (/\s{2,}/.test(trimmed)) return false;
  
  return true;
};

/**
 * Username Validation
 * Only alphabets (A-Z, a-z) and spaces allowed for full names
 * 
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username
 * 
 * @example
 * validateUsername('John Doe') // => true
 * validateUsername('User123') // => false
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  
  const trimmed = username.trim();
  
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) return false;
  
  if (/\s{2,}/.test(trimmed)) return false;
  
  return true;
};

/**
 * Validate proforma invoice form data with comprehensive field checking
 * Validates required fields, product lines, and shipping details
 * 
 * @param {Object} formData - Invoice form data to validate
 * @param {string} formData.client - Client name
 * @param {string} formData.country - Country
 * @param {string} formData.date - Invoice date
 * @param {string} formData.currency - Currency code
 * @param {Array<Object>} formData.productLines - Product line items
 * @param {string} formData.portOfLoading - Port of loading
 * @param {string} formData.portOfDischarge - Port of discharge
 * @returns {Object} Validation result
 * @returns {boolean} returns.isValid - Whether form data is valid
 * @returns {Object} returns.errors - Object mapping field names to error messages
 * 
 * @example
 * const result = validateInvoiceForm(invoiceData);
 * if (!result.isValid) {
 *   Object.entries(result.errors).forEach(([field, error]) => {
 *     console.log(`${field}: ${error}`);
 *   });
 * }
 */
export const validateInvoiceForm = (formData) => {
  const errors = {};

  // Required fields validation
  if (!formData.client?.trim()) {
    errors.client = 'Client selection is required';
  }

  if (!formData.country?.trim()) {
    errors.country = 'Country is required';
  }

  if (!formData.date) {
    errors.date = 'Invoice date is required';
  } else {
    const invoiceDate = new Date(formData.date);
    const today = new Date();
    if (invoiceDate > today) {
      errors.date = 'Invoice date cannot be in the future';
    }
  }

  if (!formData.currency) {
    errors.currency = 'Currency is required';
  }

  // Product lines validation
  if (!formData.productLines || formData.productLines.length === 0) {
    errors.productLines = 'At least one product line is required';
  } else {
    const productLineErrors = [];
    formData.productLines.forEach((line, index) => {
      const lineErrors = {};

      if (!line.product?.trim()) {
        lineErrors.product = 'Product is required';
      }

      if (!line.rate || line.rate <= 0) {
        lineErrors.rate = 'Rate must be greater than 0';
      }

      if (!line.bigPallet && !line.kathaliPallet) {
        lineErrors.pallets = 'At least one pallet type is required';
      }

      if (Object.keys(lineErrors).length > 0) {
        productLineErrors[index] = lineErrors;
      }
    });

    if (productLineErrors.length > 0) {
      errors.productLineErrors = productLineErrors;
    }
  }

  // Shipping details validation
  if (!formData.portOfLoading?.trim()) {
    errors.portOfLoading = 'Port of loading is required';
  }

  if (!formData.portOfDischarge?.trim()) {
    errors.portOfDischarge = 'Port of discharge is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate proforma order form data
 * Checks supplier, PI reference, date, and product lines
 * 
 * @param {Object} formData - Order form data to validate
 * @param {string} formData.supplier - Supplier name
 * @param {string} formData.piReference - PI reference number
 * @param {string} formData.date - Order date
 * @param {Array<Object>} formData.productLines - Product lines from PI
 * @returns {Object} Validation result with isValid flag and errors object
 * 
 * @example
 * const validation = validateOrderForm(orderData);
 * if (!validation.isValid) {
 *   showErrors(validation.errors);
 * }
 */
export const validateOrderForm = (formData) => {
  const errors = {};

  if (!formData.supplier?.trim()) {
    errors.supplier = 'Supplier selection is required';
  }

  if (!formData.piReference?.trim()) {
    errors.piReference = 'PI Reference is required';
  }

  if (!formData.date) {
    errors.date = 'Order date is required';
  }

  if (!formData.productLines || formData.productLines.length === 0) {
    errors.productLines =
      'Product lines are required (loaded from PI Reference)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate client form data with email and phone number validation
 * 
 * @param {Object} formData - Client form data
 * @param {string} formData.name - Client name
 * @param {string} formData.email_id - Email address
 * @param {string} formData.contact_number - Phone number
 * @param {string} formData.country - Country
 * @returns {Object} Validation result with isValid and errors
 * 
 * @example
 * const result = validateClientForm({ name: 'ABC Corp', email_id: 'test@abc.com', contact_number: '+1234567890', country: 'USA' });
 * // => { isValid: true, errors: {} }
 */
export const validateClientForm = (formData) => {
  const errors = {};

  if (!formData.name?.trim()) {
    errors.name = 'Client name is required';
  }

  if (!formData.email_id?.trim()) {
    errors.email_id = 'Email is required';
  } else if (!validateEmail(formData.email_id)) {
    errors.email_id = 'Please enter a valid email address';
  }

  if (!formData.contact_number?.trim()) {
    errors.contact_number = 'Phone number is required';
  } else if (!validatePhone(formData.contact_number)) {
    errors.contact_number = 'Please enter a valid phone number';
  }

  if (!formData.country) {
    errors.country = 'Country is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate product form data with mandatory image requirement
 * Products must have at least one image for visual identification in orders and QC
 * 
 * @param {Object} formData - Product form data
 * @param {string} formData.factoryName - Factory/manufacturer name
 * @param {string} formData.factoryProductName - Factory product name
 * @param {string} formData.name - Display product name
 * @param {string} formData.catalogueName - Catalogue name
 * @param {Array<string>} formData.size - Available sizes
 * @param {Array<string>} formData.surface - Surface types
 * @param {string} formData.thickness - Product thickness
 * @param {Array<string>} formData.application - Application types
 * @param {number} formData.boxPcs - Pieces per box
 * @param {number} formData.boxWeight - Weight per box
 * @param {Array<File>} formData.images - Product images (mandatory)
 * @returns {Object} Validation result with isValid and errors
 * 
 * @example
 * const result = validateProductForm(productData);
 * if (!result.isValid) {
 *   console.log('Validation errors:', result.errors);
 * }
 */
export const validateProductForm = (formData) => {
  const errors = {};

  if (!formData.factoryName?.trim()) {
    errors.factoryName = 'Factory name is required';
  }

  if (!formData.factoryProductName?.trim()) {
    errors.factoryProductName = 'Factory product name is required';
  }

  if (!formData.name?.trim()) {
    errors.name = 'Product name is required';
  }

  if (!formData.catalogueName?.trim()) {
    errors.catalogueName = 'Catalogue name is required';
  }

  if (!formData.size || formData.size.length === 0) {
    errors.size = 'At least one size is required';
  }

  if (!formData.surface || formData.surface.length === 0) {
    errors.surface = 'At least one surface type is required';
  }

  if (!formData.thickness?.trim()) {
    errors.thickness = 'Thickness is required';
  }

  if (!formData.application || formData.application.length === 0) {
    errors.application = 'At least one application is required';
  }

  if (!formData.boxPcs || formData.boxPcs <= 0) {
    errors.boxPcs = 'Box pieces must be greater than 0';
  }

  if (!formData.boxWeight || formData.boxWeight <= 0) {
    errors.boxWeight = 'Box weight must be greater than 0';
  }

  // MANDATORY IMAGE REQUIREMENT
  if (!formData.images || formData.images.length === 0) {
    errors.images =
      'Product image is mandatory. Images are used for visual identification in orders, QC inspections, and client presentations.';
  } else {
    // Validate image file types and sizes
    const invalidImages = formData.images.filter((img) => {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      const maxSize = 4 * 1024 * 1024; // 4MB
      return !validTypes.includes(img.type) || img.size > maxSize;
    });

    if (invalidImages.length > 0) {
      errors.images =
        'Invalid image format or size. Use JPG, PNG, GIF, WebP (max 4MB each).';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate Quality Control (QC) form data
 * For passed QC status, validates that all inspection sections have required media
 * 
 * @param {Object} formData - QC form data
 * @param {string} formData.orderNumber - Order number being inspected
 * @param {string} formData.clientName - Client name
 * @param {string} formData.qcDate - QC inspection date
 * @param {string} formData.qcStatus - QC status ('Passed', 'Failed', etc.)
 * @param {Object} [formData.inspectionMedia] - Media for each inspection section
 * @returns {Object} Validation result with isValid and errors
 * 
 * @example
 * const result = validateQCForm(qcData);
 * if (!result.isValid) {
 *   alert(`QC validation failed: ${Object.values(result.errors).join(', ')}`);
 * }
 */
export const validateQCForm = (formData) => {
  const errors = {};

  if (!formData.orderNumber?.trim()) {
    errors.orderNumber = 'Order number is required';
  }

  if (!formData.clientName?.trim()) {
    errors.clientName = 'Client name is required';
  }

  if (!formData.qcDate) {
    errors.qcDate = 'QC date is required';
  }

  if (!formData.qcStatus) {
    errors.qcStatus = 'QC status is required';
  }

  // Media validation for passed QC
  if (formData.qcStatus === 'Passed') {
    const requiredSections = [
      'onlineChecking',
      'flooring',
      'joint',
      'curvature',
      'thickness',
      'glossy',
      'lValue',
      'boxWeight',
      'palletPacking',
      'mor',
    ];

    const missingSections = requiredSections.filter((section) => {
      const sectionMedia = formData.inspectionMedia?.[section];
      return (
        !sectionMedia ||
        (sectionMedia.images.length === 0 && sectionMedia.videos.length === 0)
      );
    });

    if (missingSections.length > 0) {
      errors.inspectionMedia = `Missing media in sections: ${missingSections.join(
        ', '
      )}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate packing list form data with shipping details
 * 
 * @param {Object} formData - Packing list form data
 * @param {string} formData.piReference - PI reference number
 * @param {string} formData.clientName - Client name
 * @param {string} formData.date - Packing list date
 * @param {Array<Object>} formData.productLines - Product lines
 * @param {Object} formData.shippingDetails - Shipping information
 * @returns {Object} Validation result with isValid and errors
 */
export const validatePackingListForm = (formData) => {
  const errors = {};

  if (!formData.piReference?.trim()) {
    errors.piReference = 'PI Reference is required';
  }

  if (!formData.clientName?.trim()) {
    errors.clientName = 'Client name is required';
  }

  if (!formData.date) {
    errors.date = 'Date is required';
  }

  if (!formData.productLines || formData.productLines.length === 0) {
    errors.productLines =
      'Product lines are required (auto-loaded from PI Reference)';
  }

  // Validate shipping details
  if (!formData.shippingDetails?.portOfLoading?.trim()) {
    errors.portOfLoading = 'Port of loading is required';
  }

  if (!formData.shippingDetails?.containerType) {
    errors.containerType = 'Container type is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate lead form data for CRM lead management
 * 
 * @param {Object} formData - Lead form data
 * @param {string} formData.companyName - Company name
 * @param {string} formData.clientName - Contact person name
 * @param {string} formData.contactNumber - Contact phone number
 * @param {string} formData.email_id - Contact email
 * @param {string} formData.country - Lead country
 * @param {string} formData.source - Lead source
 * @param {string} formData.salesPerson - Assigned salesperson
 * @returns {Object} Validation result with isValid and errors
 */
export const validateLeadForm = (formData) => {
  const errors = {};

  if (!formData.companyName?.trim()) {
    errors.companyName = 'Company name is required';
  }

  if (!formData.clientName?.trim()) {
    errors.clientName = 'Client name is required';
  }

  if (!formData.contactNumber?.trim()) {
    errors.contactNumber = 'Contact number is required';
  } else if (!validatePhone(formData.contactNumber)) {
    errors.contactNumber = 'Please enter a valid phone number';
  }

  if (!formData.email_id?.trim()) {
    errors.email_id = 'Email is required';
  } else if (!validateEmail(formData.email_id)) {
    errors.email_id = 'Please enter a valid email address';
  }

  if (!formData.country) {
    errors.country = 'Country is required';
  }

  if (!formData.source) {
    errors.source = 'Lead source is required';
  }

  if (!formData.salesPerson) {
    errors.salesPerson = 'Sales person assignment is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate user form data for user management
 * Password is required for new users, optional for edits
 * 
 * @param {Object} formData - User form data
 * @param {string} formData.name - Full name
 * @param {string} formData.username - Username (min 3 characters)
 * @param {string} formData.email_id - Email address
 * @param {string} formData.contactNo - Contact number
 * @param {string} formData.role - User role
 * @param {string} [formData.password] - Password (required for new users)
 * @param {string} [formData.confirmPassword] - Password confirmation
 * @param {boolean} [isEdit=false] - Whether this is an edit operation
 * @returns {Object} Validation result with isValid and errors
 * 
 * @example
 * const result = validateUserForm(userData, false); // New user
 * if (!result.isValid) {
 *   displayFormErrors(result.errors);
 * }
 */
export const validateUserForm = (formData, isEdit = false) => {
  const errors = {};

  if (!formData.name?.trim()) {
    errors.name = 'Full name is required';
  }

  if (!formData.username?.trim()) {
    errors.username = 'Username is required';
  } else if (formData.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }

  if (!formData.email_id?.trim()) {
    errors.email_id = 'Email is required';
  } else if (!validateEmail(formData.email_id)) {
    errors.email_id = 'Please enter a valid email address';
  }

  if (!formData.contactNo?.trim()) {
    errors.contactNo = 'Contact number is required';
  } else if (!validatePhone(formData.contactNo)) {
    errors.contactNo = 'Please enter a valid contact number';
  }

  if (!formData.role) {
    errors.role = 'Role selection is required';
  }

  // Password validation for new users or when password is provided
  if (!isEdit || formData.password) {
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0]; // Show first error
      }
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate imported data structure for specific module type
 * Performs field-level and type validation on each row
 * 
 * @param {Array<Object>} data - Array of data rows to validate
 * @param {string} moduleType - Module type determining validation rules
 * @returns {Object} Validation results
 * @returns {Array<Object>} returns.valid - Valid rows ready for import
 * @returns {Array<Object>} returns.invalid - Invalid rows with error details
 * @returns {Object} returns.summary - Summary with total, valid, and invalid counts
 * 
 * @example
 * const result = validateImportData(csvData, 'leads');
 * console.log(`${result.summary.validCount} valid, ${result.summary.invalidCount} invalid`);
 * result.invalid.forEach(row => {
 *   console.log(`Row ${row.rowIndex}: ${row.errors.join(', ')}`);
 * });
 */
export const validateImportData = (data, moduleType) => {
  const results = {
    valid: [],
    invalid: [],
    summary: {
      total: data.length,
      validCount: 0,
      invalidCount: 0,
    },
  };

  const requiredFields = getRequiredFieldsForModule(moduleType);

  data.forEach((row, index) => {
    const rowErrors = [];

    // Check required fields
    requiredFields.forEach((field) => {
      if (!row[field] || row[field].toString().trim() === '') {
        rowErrors.push(`${field} is required`);
      }
    });

    // Module-specific validation with comprehensive type checking
    switch (moduleType) {
      case 'proforma-invoice-enhanced':
        if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
          rowErrors.push('Invalid date format. Use YYYY-MM-DD (e.g., 2025-01-15)');
        }
        if (row.amount && (isNaN(parseFloat(row.amount)) || parseFloat(row.amount) <= 0)) {
          rowErrors.push('Amount must be a positive number');
        }
        break;

      case 'proforma-order':
        if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
          rowErrors.push('Invalid date format. Use YYYY-MM-DD (e.g., 2025-01-15)');
        }
        if (row.amount && (isNaN(parseFloat(row.amount)) || parseFloat(row.amount) <= 0)) {
          rowErrors.push('Amount must be a positive number');
        }
        break;

      case 'packing-lists':
        if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
          rowErrors.push('Invalid date format. Use YYYY-MM-DD (e.g., 2025-01-15)');
        }
        if (row.totalPallets && isNaN(parseFloat(row.totalPallets))) {
          rowErrors.push('Total pallets must be a number');
        }
        if (row.totalBoxes && isNaN(parseFloat(row.totalBoxes))) {
          rowErrors.push('Total boxes must be a number');
        }
        if (row.totalSQM && isNaN(parseFloat(row.totalSQM))) {
          rowErrors.push('Total SQM must be a number');
        }
        if (row.totalWeight && isNaN(parseFloat(row.totalWeight))) {
          rowErrors.push('Total weight must be a number');
        }
        break;

      case 'leads':
        if (row.email && !validateEmail(row.email)) {
          rowErrors.push('Invalid email format. Use format: user@domain.com');
        }
        if (row.contactNumber && !validatePhone(row.contactNumber)) {
          rowErrors.push('Invalid phone format. Use international format: +1-555-1234');
        }
        if (row.leadValue && isNaN(parseFloat(row.leadValue))) {
          rowErrors.push('Lead value must be a number');
        }
        if (row.expectedCloseDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.expectedCloseDate)) {
          rowErrors.push('Invalid expected close date format. Use YYYY-MM-DD');
        }
        break;

      case 'clients':
        if (row.email && !validateEmail(row.email)) {
          rowErrors.push('Invalid email format. Use format: user@domain.com');
        }
        if (row.phone && !validatePhone(row.phone)) {
          rowErrors.push('Invalid phone format. Use international format: +1-555-1234');
        }
        if (row.website && row.website.trim()) {
          try {
            new URL(row.website);
          } catch {
            rowErrors.push('Invalid website URL. Use format: https://example.com');
          }
        }
        break;

      case 'account-entries':
        if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
          rowErrors.push('Invalid date format. Use YYYY-MM-DD (e.g., 2025-01-15)');
        }
        if (row.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate)) {
          rowErrors.push('Invalid due date format. Use YYYY-MM-DD');
        }
        if (row.amount && (isNaN(parseFloat(row.amount)) || parseFloat(row.amount) <= 0)) {
          rowErrors.push('Amount must be a positive number');
        }
        if (row.type && !['Receivable', 'Payable'].includes(row.type)) {
          rowErrors.push('Type must be either "Receivable" or "Payable"');
        }
        break;

      case 'qc-records':
        if (row.qcDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.qcDate)) {
          rowErrors.push('Invalid QC date format. Use YYYY-MM-DD (e.g., 2025-01-15)');
        }
        if (row.qcStatus && !['Passed', 'Failed', 'Pending', 'Under Process'].includes(row.qcStatus)) {
          rowErrors.push('QC Status must be: Passed, Failed, Pending, or Under Process');
        }
        break;

      case 'products':
        if (row.boxPcs && isNaN(parseInt(row.boxPcs))) {
          rowErrors.push('Pieces per box must be a number');
        }
        if (row.boxWeight && isNaN(parseFloat(row.boxWeight))) {
          rowErrors.push('Box weight must be a number');
        }
        break;

      case 'pallets':
        if (row.weight && isNaN(parseFloat(row.weight))) {
          rowErrors.push('Weight must be a number');
        }
        if (row.capacity && isNaN(parseFloat(row.capacity))) {
          rowErrors.push('Capacity must be a number');
        }
        break;

      case 'users':
        if (row.email_id && !validateEmail(row.email_id)) {
          rowErrors.push('Invalid email format');
        }
        if (row.contactNo && !validatePhone(row.contactNo)) {
          rowErrors.push('Invalid contact number');
        }
        if (row.role && !['super_admin', 'company_admin', 'sales', 'purchase', 'logistics', 'accounts', 'qc', 'administration'].includes(row.role)) {
          rowErrors.push('Invalid user role');
        }
        break;

      case 'companies':
        if (row.email && !validateEmail(row.email)) {
          rowErrors.push('Invalid email format. Use format: user@domain.com');
        }
        if (row.phone && !validatePhone(row.phone)) {
          rowErrors.push('Invalid phone format. Use international format: +1-555-1234');
        }
        if (row.status && !['Active', 'Suspended', 'Trial', 'Expired'].includes(row.status)) {
          rowErrors.push('Status must be: Active, Suspended, Trial, or Expired');
        }
        if (row.subscriptionPlan && !['Free', 'Basic', 'Pro', 'Enterprise'].includes(row.subscriptionPlan)) {
          rowErrors.push('Subscription Plan must be: Free, Basic, Pro, or Enterprise');
        }
        if (row.registeredDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.registeredDate)) {
          rowErrors.push('Invalid registered date format. Use YYYY-MM-DD');
        }
        if (row.totalUsers && isNaN(parseInt(row.totalUsers))) {
          rowErrors.push('Total users must be a number');
        }
        if (row.monthlyRevenue && isNaN(parseFloat(row.monthlyRevenue))) {
          rowErrors.push('Monthly revenue must be a number');
        }
        break;
    }

    if (rowErrors.length === 0) {
      results.valid.push({ ...row, rowIndex: index + 1 });
    } else {
      results.invalid.push({ ...row, rowIndex: index + 1, errors: rowErrors });
    }
  });

  results.summary.validCount = results.valid.length;
  results.summary.invalidCount = results.invalid.length;

  return results;
};

/**
 * Get required fields for each module type
 * Defines which fields must be present for each import module
 * 
 * @param {string} moduleType - Module type
 * @returns {Array<string>} Array of required field names
 * @private
 */
const getRequiredFieldsForModule = (moduleType) => {
  const fieldMappings = {
    'proforma-invoice-enhanced': ['invoiceNo', 'date', 'clientName', 'country', 'amount'],
    'proforma-order': ['orderNo', 'date', 'supplierName', 'piReference', 'amount'],
    leads: ['companyName', 'clientName', 'contactNumber', 'email_id', 'country'],
    clients: ['name', 'email_id', 'contact_number', 'country'],
    'packing-lists': ['packingListNo', 'date', 'piReference', 'clientName', 'country'],
    'account-entries': ['partyName', 'amount', 'type'],
    users: ['name', 'username', 'email_id', 'role'],
    products: ['factoryName', 'name', 'catalogueName'],
    pallets: ['palletId', 'category', 'size', 'status'],
    'qc-records': ['qcId', 'orderNumber', 'clientName', 'productName', 'qcStatus', 'qcDate'],
    companies: ['name', 'email_id', 'industry', 'contact_person_name', 'contact_number', 'country', 'subscriptionPlan', 'status'],
  };

  return fieldMappings[moduleType] || [];
};

/**
 * Validate file upload against allowed types and size limits
 * 
 * @param {File} file - File to validate
 * @param {Array<string>} allowedTypes - Array of allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result
 * @returns {boolean} returns.isValid - Whether file is valid
 * @returns {Array<string>} returns.errors - Array of error messages
 * 
 * @example
 * const result = validateFileUpload(file, ['image/jpeg', 'image/png'], 5 * 1024 * 1024);
 * if (!result.isValid) {
 *   alert(result.errors.join('\n'));
 * }
 */
export const validateFileUpload = (file, allowedTypes, maxSize) => {
  const errors = [];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  if (file.size > maxSize) {
    errors.push(
      `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate image file with predefined allowed types and size limit
 * Accepts JPEG, PNG, GIF, and WebP formats up to 4MB
 * 
 * @param {File} file - Image file to validate
 * @returns {Object} Validation result with isValid and errors
 * 
 * @example
 * const result = validateImageFile(imageFile);
 * if (!result.isValid) {
 *   showError(`Invalid image: ${result.errors.join(', ')}`);
 * }
 */
export const validateImageFile = (file) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  const maxSize = 4 * 1024 * 1024; // 4MB

  return validateFileUpload(file, allowedTypes, maxSize);
};

/**
 * Validate PDF file with size limit of 10MB
 * 
 * @param {File} file - PDF file to validate
 * @returns {Object} Validation result with isValid and errors
 * 
 * @example
 * const result = validatePDFFile(pdfFile);
 * if (result.isValid) {
 *   uploadPDF(pdfFile);
 * }
 */
export const validatePDFFile = (file) => {
  const allowedTypes = ['application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  return validateFileUpload(file, allowedTypes, maxSize);
};

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and trims whitespace
 * 
 * @param {string|*} input - Input to sanitize (non-strings returned unchanged)
 * @returns {string|*} Sanitized input with dangerous characters removed
 * 
 * @example
 * sanitizeInput('<script>alert("xss")</script>Hello') // => 'scriptalert("xss")/scriptHello'
 * sanitizeInput('  normal text  ') // => 'normal text'
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

/**
 * Validate and sanitize form data in one operation
 * First sanitizes all string inputs, then validates with provided function
 * 
 * @param {Object} formData - Form data to validate and sanitize
 * @param {Function} validationFunction - Validation function to use
 * @returns {Object} Result with validation status and sanitized data
 * @returns {boolean} returns.isValid - Whether validation passed
 * @returns {Object} returns.errors - Validation errors
 * @returns {Object} returns.sanitizedData - Sanitized form data
 * 
 * @example
 * const result = validateAndSanitizeForm(userData, validateUserForm);
 * if (result.isValid) {
 *   saveUser(result.sanitizedData);
 * }
 */
export const validateAndSanitizeForm = (formData, validationFunction) => {
  // Sanitize all string inputs
  const sanitizedData = {};
  Object.keys(formData).forEach((key) => {
    if (typeof formData[key] === 'string') {
      sanitizedData[key] = sanitizeInput(formData[key]);
    } else {
      sanitizedData[key] = formData[key];
    }
  });

  // Validate sanitized data
  const validation = validationFunction(sanitizedData);

  return {
    ...validation,
    sanitizedData,
  };
};

/**
 * Format validation errors for user-friendly display
 * Handles both array and object error formats
 * 
 * @param {Array<string>|Object|string} errors - Errors in various formats
 * @returns {string} Formatted error string ready for display
 * 
 * @example
 * formatValidationErrors(['Error 1', 'Error 2']) // => 'Error 1, Error 2'
 * formatValidationErrors({name: 'Required', email: 'Invalid'}) // => 'Required, Invalid'
 */
export const formatValidationErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.join(', ');
  }

  if (typeof errors === 'object') {
    return Object.values(errors).flat().join(', ');
  }

  return errors.toString();
};
