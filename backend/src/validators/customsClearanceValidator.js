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

export const createCustomsClearanceValidator = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('shipping_bill_no')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Shipping bill number must not exceed 100 characters'),

  body('bill_of_entry_no')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bill of entry number must not exceed 100 characters'),

  body('cha_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('CHA name must not exceed 255 characters'),

  body('cha_contact')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('CHA contact must not exceed 100 characters'),

  body('port_of_export')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Port of export must not exceed 255 characters'),

  body('destination_country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Destination country must not exceed 100 characters'),

  body('hs_codes')
    .optional()
    .isArray()
    .withMessage('HS codes must be an array'),

  body('total_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total value must be a positive number'),

  body('duty_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duty amount must be a positive number'),

  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Cleared', 'Rejected'])
    .withMessage('Invalid status'),

  body('clearance_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid clearance date format'),

  body('notes')
    .optional()
    .trim()
];

export const updateCustomsClearanceValidator = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('shipping_bill_no')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Shipping bill number must not exceed 100 characters'),

  body('bill_of_entry_no')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bill of entry number must not exceed 100 characters'),

  body('cha_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('CHA name must not exceed 255 characters'),

  body('cha_contact')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('CHA contact must not exceed 100 characters'),

  body('port_of_export')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Port of export must not exceed 255 characters'),

  body('destination_country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Destination country must not exceed 100 characters'),

  body('hs_codes')
    .optional()
    .isArray()
    .withMessage('HS codes must be an array'),

  body('total_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total value must be a positive number'),

  body('duty_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duty amount must be a positive number'),

  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Cleared', 'Rejected'])
    .withMessage('Invalid status'),

  body('clearance_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid clearance date format'),

  body('notes')
    .optional()
    .trim()
];
