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
import { validateEmail, validateContactNumber, validateCityName, validateGST, validatePAN, validateIEC, validateRequiredType } from '../utils/validators.js';

export const createClientValidator = [
  // Accept both 'name' and 'client_name' for compatibility
  body('client_name')
    .optional()
    .if((value, { req }) => !req.body.client_name && req.body.name)
    .trim()
    .custom((value, { req }) => {
      // If client_name is not provided, use name from body
      if (!req.body.client_name && !req.body.name) {
        throw new Error('Client name is required');
      }
      return true;
    }),
  
  body('name')
    .optional()
    .trim()
    .custom((value, { req }) => {
      // Copy name to client_name if client_name is empty
      if (value && !req.body.client_name) {
        req.body.client_name = value;
      }
      return true;
    }),

  body()
    .custom((value, { req }) => {
      const client_name = req.body.client_name || req.body.name;
      if (!client_name || client_name.trim() === '') {
        throw new Error('Client name is required');
      }
      if (client_name.length < 2 || client_name.length > 255) {
        throw new Error('Client name must be between 2 and 255 characters');
      }
      const typeCheck = validateRequiredType(client_name, 'string', 'Client Firm Name');
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

  body()
    .custom((value, { req }) => {
      const country = req.body?.country;
      if (!country || (typeof country === 'string' && country.trim() === '')) {
        throw new Error('Country is required');
      }
      return true;
    }),

  body('country')
    .if((value) => value)
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('business_type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Business type must not exceed 100 characters'),

  body('credit_limit')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      return typeof value === 'string' ? parseFloat(value) : value;
    })
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num < 0) throw new Error('Credit limit must be a positive number');
      return true;
    }),

  body('credit_days')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      return typeof value === 'string' ? parseInt(value, 10) : value;
    })
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = typeof value === 'string' ? parseInt(value, 10) : value;
      if (isNaN(num) || num < 0) throw new Error('Credit days must be a positive integer');
      return true;
    }),

  body('assigned_salesperson')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '' || value === null) return true;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) throw new Error('Invalid salesperson ID format');
      return true;
    }),

  body('status')
    .optional()
    .isString()
    .withMessage('Status must be a string')
    .isIn(['Active', 'Inactive', 'Suspended'])
    .withMessage('Invalid status'),

  body('notes')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Notes must be a string')
    .trim(),

  body('consignee_details')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Consignee details must be a string'),

  body('buyer_details')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Buyer details must be a string'),

  body('port_of_loading')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Port of loading must be a string')
    .isLength({ max: 255 })
    .withMessage('Port of loading must not exceed 255 characters'),

  body('port_of_discharge')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Port of discharge must be a string')
    .isLength({ max: 255 })
    .withMessage('Port of discharge must not exceed 255 characters'),

  body('final_destination')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Final destination must be a string')
    .isLength({ max: 255 })
    .withMessage('Final destination must not exceed 255 characters'),

  body('currency')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Currency must be a string')
    .isLength({ max: 50 })
    .withMessage('Currency must not exceed 50 characters')
];

export const updateClientValidator = [
  body('client_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Client name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Client name must be between 2 and 255 characters'),

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

  body('business_type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Business type must not exceed 100 characters'),

  body('credit_limit')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      return typeof value === 'string' ? parseFloat(value) : value;
    })
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num < 0) throw new Error('Credit limit must be a positive number');
      return true;
    }),

  body('credit_days')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      return typeof value === 'string' ? parseInt(value, 10) : value;
    })
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = typeof value === 'string' ? parseInt(value, 10) : value;
      if (isNaN(num) || num < 0) throw new Error('Credit days must be a positive integer');
      return true;
    }),

  body('assigned_salesperson')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '' || value === null) return true;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) throw new Error('Invalid salesperson ID format');
      return true;
    }),

  body('status')
    .optional()
    .isString()
    .withMessage('Status must be a string')
    .isIn(['Active', 'Inactive', 'Suspended'])
    .withMessage('Invalid status'),

  body('notes')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Notes must be a string')
    .trim(),

  body('consignee_details')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Consignee details must be a string'),

  body('buyer_details')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Buyer details must be a string'),

  body('port_of_loading')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Port of loading must be a string')
    .isLength({ max: 255 })
    .withMessage('Port of loading must not exceed 255 characters'),

  body('port_of_discharge')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Port of discharge must be a string')
    .isLength({ max: 255 })
    .withMessage('Port of discharge must not exceed 255 characters'),

  body('final_destination')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Final destination must be a string')
    .isLength({ max: 255 })
    .withMessage('Final destination must not exceed 255 characters'),

  body('currency')
    .optional({ nullable: true })
    .customSanitizer((value) => value === null ? '' : value)
    .isString()
    .withMessage('Currency must be a string')
    .isLength({ max: 50 })
    .withMessage('Currency must not exceed 50 characters')
];
