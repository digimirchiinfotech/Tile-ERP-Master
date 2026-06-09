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

import { useState, useCallback } from 'react';
import {
  validateRequired,
  validateType,
  validateName,
  validateFullName,
  validateCompanyName,
  validateEmail,
  validateContactNumber,
  validateIndianMobile,
  validatePassword,
  validateConfirmPassword,
  validateGST,
  validatePAN,
  validateIEC,
  validateAddress,
  validateCityOrState,
  validateAmount,
  validateDigitsOnly,
  validateDate,
  validateURL,
  validateTruckNumber,
  validateSealNumber,
  validateDimension,
} from '../utils/validators.js';

/**
 * Shared Form Validation Hook
 * Provides centralized validation logic for all forms in the application
 * 
 * @param {object} validationRules - Object mapping field names to validation types
 * @returns {object} { errors, validateField, validateForm, clearError, clearAllErrors }
 * 
 * @example
 * const { errors, validateField, validateForm } = useFormValidation({
 *   name: 'fullName',
 *   email: 'email',
 *   phone: 'contactNumber',
 *   gstn: 'gst',
 *   pan: 'pan'
 * });
 */
export const useFormValidation = (validationRules = {}) => {
  const [errors, setErrors] = useState({});

  /**
   * Get the appropriate validator function based on validation type
   */
  const getValidator = useCallback((validationType, fieldName) => {
    const validators = {
      // Name validators
      name: (value) => validateName(value, fieldName),
      fullName: (value) => validateFullName(value),
      companyName: (value) => validateCompanyName(value),
      
      // Contact validators
      email: (value) => validateEmail(value),
      contactNumber: (value) => validateContactNumber(value),
      indianMobile: (value) => validateIndianMobile(value),
      phone: (value) => validateContactNumber(value),
      
      // Password validators
      password: (value) => validatePassword(value),
      confirmPassword: (value, compareValue) => validateConfirmPassword(compareValue, value),
      
      // Indian regulatory validators
      gst: (value) => validateGST(value),
      gstn: (value) => validateGST(value),
      pan: (value) => validatePAN(value),
      iec: (value) => validateIEC(value),
      iecNo: (value) => validateIEC(value),
      
      // Location validators
      address: (value) => validateAddress(value),
      city: (value) => validateCityOrState(value, 'City'),
      state: (value) => validateCityOrState(value, 'State'),
      
      // Numeric validators
      amount: (value) => validateAmount(value),
      creditLimit: (value) => validateAmount(value),
      creditDays: (value) => validateDigitsOnly(value, 'Credit Days'),
      digits: (value) => validateDigitsOnly(value, fieldName),
      dimension: (value) => validateDimension(value, fieldName),
      
      // Date and URL validators
      date: (value) => validateDate(value),
      url: (value) => validateURL(value),
      website: (value) => validateURL(value),
      
      // Logistics validators
      truckNumber: (value) => validateTruckNumber(value),
      sealNumber: (value) => validateSealNumber(value),
      
      // Required field validators (uses new type checking)
      required: (value) => validateRequired(value, 'string', fieldName),
      requiredString: (value) => validateRequired(value, 'string', fieldName),
      requiredNumber: (value) => validateRequired(value, 'number', fieldName),
      requiredArray: (value) => validateRequired(value, 'array', fieldName),
      requiredObject: (value) => validateRequired(value, 'object', fieldName),
      
      // Type validators (optional fields with type constraints)
      typeString: (value) => validateType(value, 'string', fieldName),
      typeNumber: (value) => validateType(value, 'number', fieldName),
      typeArray: (value) => validateType(value, 'array', fieldName),
      typeObject: (value) => validateType(value, 'object', fieldName),
    };

    return validators[validationType] || validators.required;
  }, []);

  /**
   * Validate a single field
   * @param {string} fieldName - Name of the field to validate
   * @param {any} value - Value to validate
   * @param {object} options - Additional validation options
   * @returns {object} { isValid: boolean, error: string|null }
   */
  const validateField = useCallback((fieldName, value, options = {}) => {
    const validationType = validationRules[fieldName];
    
    if (!validationType) {
      return { isValid: true, error: null };
    }

    // Handle optional fields (skip validation if empty)
    if (options.optional && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return { isValid: true, error: null };
    }

    const validator = getValidator(validationType, fieldName);
    const result = validator(value, options.compareValue);

    // Update errors state
    setErrors((prev) => ({
      ...prev,
      [fieldName]: result.error || '',
    }));

    return result;
  }, [validationRules, getValidator]);

  /**
   * Validate all fields in the form
   * @param {object} formData - Object containing all form field values
   * @param {object} optionalFields - Object mapping field names to boolean indicating if optional
   * @returns {boolean} True if all validations pass, false otherwise
   */
  const validateForm = useCallback((formData, optionalFields = {}) => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const validationType = validationRules[fieldName];
      const value = formData[fieldName];
      
      // Skip validation for optional fields that are empty
      if (optionalFields[fieldName] && (!value || (typeof value === 'string' && value.trim() === ''))) {
        return;
      }

      const validator = getValidator(validationType, fieldName);
      const result = validator(value, formData);

      if (!result.isValid) {
        newErrors[fieldName] = result.error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validationRules, getValidator]);

  /**
   * Clear error for a specific field
   * @param {string} fieldName - Name of the field
   */
  const clearError = useCallback((fieldName) => {
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Set a custom error for a field
   * @param {string} fieldName - Name of the field
   * @param {string} errorMessage - Error message to set
   */
  const setFieldError = useCallback((fieldName, errorMessage) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: errorMessage,
    }));
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearError,
    clearAllErrors,
    setFieldError,
  };
};

export default useFormValidation;
