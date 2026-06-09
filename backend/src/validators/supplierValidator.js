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

import { body } from 'express-validator';
import { validateEmail, validateContactNumber, validateCityName, validateGST, validatePAN, validateRequiredType } from '../utils/validators.js';

export const createSupplierValidator = [
  body('supplier_name')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required')
    .isString()
    .withMessage('Supplier name must be a string')
    .isLength({ min: 2, max: 255 })
    .withMessage('Supplier name must be between 2 and 255 characters')
    .custom((value) => {
      const typeCheck = validateRequiredType(value, 'string', 'Supplier Factory Name');
      if (!typeCheck.isValid) throw new Error(typeCheck.error);
      return true;
    }),

  body('contact_person_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contact Person Name must not exceed 255 characters'),

  body('email_id')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('contact_number')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('address')
    .optional()
    .trim(),

  body('city')
    .optional()
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
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('product_categories')
    .optional()
    .isArray()
    .withMessage('Product categories must be an array'),

  body('payment_terms')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Payment terms must not exceed 255 characters'),

  body('quality_rating')
    .optional()
    .customSanitizer(value => value !== null && value !== undefined ? String(value) : value)
    .trim()
    .isLength({ max: 10 })
    .withMessage('Quality rating must not exceed 10 characters'),

  body('gstn')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateGST(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('pan')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validatePAN(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('bank_details')
    .optional()
    .isObject()
    .withMessage('Bank details must be an object'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Suspended'])
    .withMessage('Invalid status'),

  body('notes')
    .optional()
    .trim(),

  body('lead_time')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Lead time must not exceed 100 characters'),

  body('website')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Website must not exceed 255 characters')
];

export const updateSupplierValidator = [
  body('supplier_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Supplier name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Supplier name must be between 2 and 255 characters'),

  body('contact_person_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contact Person Name must not exceed 255 characters'),

  body('email_id')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('contact_number')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('address')
    .optional()
    .trim(),

  body('city')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateCityName(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('product_categories')
    .optional()
    .isArray()
    .withMessage('Product categories must be an array'),

  body('payment_terms')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Payment terms must not exceed 255 characters'),

  body('quality_rating')
    .optional()
    .customSanitizer(value => value !== null && value !== undefined ? String(value) : value)
    .trim()
    .isLength({ max: 10 })
    .withMessage('Quality rating must not exceed 10 characters'),

  body('gstn')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateGST(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('pan')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validatePAN(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('bank_details')
    .optional()
    .isObject()
    .withMessage('Bank details must be an object'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Suspended'])
    .withMessage('Invalid status'),

  body('notes')
    .optional()
    .trim(),

  body('lead_time')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Lead time must not exceed 100 characters'),

  body('website')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Website must not exceed 255 characters')
];
