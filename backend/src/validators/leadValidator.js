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
import { validateEmail, validateContactNumber, validateCityName } from '../utils/validators.js';

export const createLeadValidator = [
  body('company_name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),

  body('contact_person_name')
    .trim()
    .notEmpty()
    .withMessage('Contact Person Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Contact Person Name must be between 2 and 255 characters'),

  body('email_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('contact_number')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('address')
    .optional({ nullable: true })
    .trim(),

  body('city')
    .optional({ nullable: true })
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

  body('source')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source must not exceed 100 characters'),

  body('priority')
    .optional({ nullable: true })
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Invalid priority'),

  body('status')
    .optional({ nullable: true })
    .isIn(['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'])
    .withMessage('Invalid status'),

  body('product_interest')
    .optional({ nullable: true })
    .trim(),

  body('expected_value')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Expected value must be a positive number'),

  body('timeline')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timeline must not exceed 100 characters'),

  body('assigned_to')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid assigned user ID format'),

  body('notes')
    .optional({ nullable: true })
    .trim()
];

export const updateLeadValidator = [
  body('company_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),

  body('contact_person_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact Person Name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Contact Person Name must be between 2 and 255 characters'),

  body('email_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('contact_number')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('address')
    .optional({ nullable: true })
    .trim(),

  body('city')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateCityName(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('country')
    .optional({ nullable: true })
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('source')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source must not exceed 100 characters'),

  body('priority')
    .optional({ nullable: true })
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Invalid priority'),

  body('status')
    .optional({ nullable: true })
    .isIn(['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'])
    .withMessage('Invalid status'),

  body('product_interest')
    .optional({ nullable: true })
    .trim(),

  body('expected_value')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Expected value must be a positive number'),

  body('timeline')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timeline must not exceed 100 characters'),

  body('assigned_to')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid assigned user ID format'),

  body('notes')
    .optional({ nullable: true })
    .trim()
];
