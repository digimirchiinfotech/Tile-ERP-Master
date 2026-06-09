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

export const createAccountEntryValidator = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('entry_type')
    .trim()
    .notEmpty()
    .withMessage('Entry type is required')
    .isIn(['Payment Received', 'Payment Made', 'Advance', 'Expense'])
    .withMessage('Invalid entry type'),

  body('party_name')
    .trim()
    .notEmpty()
    .withMessage('Party name is required')
    .isLength({ max: 255 })
    .withMessage('Party name must not exceed 255 characters'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),

  body('payment_method')
    .optional()
    .isIn(['T/T', 'L/C', 'Bank Transfer', 'Check', 'Cash', 'Online Payment'])
    .withMessage('Invalid payment method'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('po_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('PO reference must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['Pending', 'Partial', 'Paid', 'Overdue'])
    .withMessage('Invalid status'),

  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),

  body('notes')
    .optional()
    .trim()
];

export const updateAccountEntryValidator = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('entry_type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Entry type cannot be empty')
    .isIn(['Payment Received', 'Payment Made', 'Advance', 'Expense'])
    .withMessage('Invalid entry type'),

  body('party_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Party name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Party name must not exceed 255 characters'),

  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),

  body('payment_method')
    .optional()
    .isIn(['T/T', 'L/C', 'Bank Transfer', 'Check', 'Cash', 'Online Payment'])
    .withMessage('Invalid payment method'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('po_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('PO reference must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['Pending', 'Partial', 'Paid', 'Overdue'])
    .withMessage('Invalid status'),

  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),

  body('notes')
    .optional()
    .trim()
];
