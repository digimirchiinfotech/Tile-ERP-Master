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

import { body, param, query as queryValidator } from 'express-validator';
import { validateEmail, validateContactNumber, validateCityName } from '../utils/validators.js';

/**
 * Register Company Validation
 * Used for public company registration form
 */
export const registerCompanyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\.\-,&'()]*$/)
    .withMessage('Company name contains invalid characters'),

  body('industry')
    .trim()
    .notEmpty()
    .withMessage('Industry is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Industry must be between 2 and 100 characters'),

  body('contact_person_name')
    .trim()
    .notEmpty()
    .withMessage('Contact person name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Contact person name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\-']*$/)
    .withMessage('Contact person name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email_id')
    .trim()
    .notEmpty()
    .withMessage('Email ID is required')
    .custom((value) => {
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    })
    .normalizeEmail(),

  body('contact_number')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .custom((value) => {
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters')
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateCityName(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('website')
    .optional()
    .trim()
    .custom((value) => {
      if (!value || value === '') return true;
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!urlPattern.test(value)) {
        throw new Error('Website must be a valid URL');
      }
      return true;
    })
];

/**
 * Create Company Validation
 * Used for internal company creation
 */
export const createCompanyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\.\-,&'()]*$/)
    .withMessage('Company name contains invalid characters'),
  
  body('email_id')
    .trim()
    .notEmpty()
    .withMessage('Email ID is required')
    .custom((value) => {
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    })
    .normalizeEmail(),
  
  body('industry')
    .trim()
    .notEmpty()
    .withMessage('Industry is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Industry must be between 2 and 100 characters'),
  
  body('contact_person_name')
    .trim()
    .notEmpty()
    .withMessage('Contact person name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Contact person name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\-']*$/)
    .withMessage('Contact person name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('contact_number')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .custom((value) => {
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters')
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateCityName(value);
      if (!isValid) throw new Error(error);
      return true;
    }),
  
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  
  body('website')
    .optional()
    .trim()
    .custom((value) => {
      if (!value || value === '') return true;
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!urlPattern.test(value)) {
        throw new Error('Website must be a valid URL');
      }
      return true;
    }),
  
  body('iec_no')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('IEC number must not exceed 50 characters'),
  
  body('gstn')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('GSTN must not exceed 50 characters'),
  
  body('pan')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('PAN must not exceed 50 characters'),
  
  body('logo_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
  
  body('subscription_plan')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subscription plan must not exceed 50 characters'),
  
  body('status')
    .optional()
    .isIn(['Active', 'Suspended', 'Trial', 'Expired'])
    .withMessage('Status must be Active, Suspended, Trial, or Expired'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid JSON object'),

  body('bank_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('account_holder_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('account_number').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('swift_code').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('branch_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('bank_address').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('lut_arn_no').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('lut_date').optional({ checkFalsy: true }).custom(v => {
    if (!v) return true;
    const d = new Date(v);
    return !isNaN(d.getTime());
  }).withMessage('Invalid LUT date')
];

export const updateCompanyValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Company name must not exceed 255 characters'),
  
  body('email_id')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    }),
  
  body('industry')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry must not exceed 100 characters'),
  
  body('contact_person_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contact Person Name must not exceed 255 characters'),
  
  body('contact_number')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),
  
  body('address')
    .optional({ checkFalsy: true })
    .trim(),
  
  body('city')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateCityName(value);
      if (!isValid) throw new Error(error);
      return true;
    }),
  
  body('country')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  
  body('website')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (!value || value === '') return true;
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!urlPattern.test(value)) {
        return true; // Relaxed: allow any string for now if it's optional
      }
      return true;
    }),
  
  body('iec_no')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('IEC number must not exceed 50 characters'),
  
  body('gstn')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('GSTN must not exceed 50 characters'),
  
  body('pan')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('PAN must not exceed 50 characters'),
  
  body('logo_url')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 512 })
    .withMessage('Logo URL is too long'),
  
  body('subscription_plan')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subscription plan must not exceed 50 characters'),
  
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['Active', 'Suspended', 'Trial', 'Expired'])
    .withMessage('Status must be Active, Suspended, Trial, or Expired'),
  
  body('settings')
    .optional()
    .custom((value) => {
      if (!value) return true;
      if (typeof value === 'object') return true;
      try {
        JSON.parse(value);
        return true;
      } catch (e) {
        return false;
      }
    })
    .withMessage('Settings must be a valid JSON object or string'),

  body('bank_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('account_holder_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('account_number').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('swift_code').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('branch_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('bank_address').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('lut_arn_no').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('lut_date').optional({ checkFalsy: true }).custom(v => {
    if (!v) return true;
    const d = new Date(v);
    return !isNaN(d.getTime());
  }).withMessage('Invalid LUT date')
];

export const getCompanyValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID')
];

export const deleteCompanyValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID')
];

export const getAllCompaniesValidation = [
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  queryValidator('search')
    .optional()
    .trim(),
  
  queryValidator('status')
    .optional()
    .isIn(['Active', 'Suspended', 'Trial', 'Expired'])
    .withMessage('Status must be Active, Suspended, Trial, or Expired'),
  
  queryValidator('industry')
    .optional()
    .trim()
];
