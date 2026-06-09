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

export const createProformaOrderValidator = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .custom((value) => {
      if (!value) return false;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return true;
    }),

  body('supplier_id')
    .optional()
    .custom((value) => {
      if (!value || value === '' || value === null) return true;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('Invalid supplier ID format - must be a valid UUID');
      }
      return true;
    }),

  body('supplier_name')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required')
    .isLength({ max: 255 })
    .withMessage('Supplier name must not exceed 255 characters'),

  body('invoice_ref')
    .optional()
    .trim(),

  body('tariff_code')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tariff code must not exceed 100 characters'),

  body('subtotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a positive number'),

  body('total_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('status')
    .optional()
    .isIn(['Draft', 'Pending', 'Submitted', 'Approved', 'Locked', 'Confirmed', 'In Production', 'QC Passed', 'Dispatched', 'Received', 'Active', 'Inactive', 'Revised', 'REVISION_REQUIRED', 'REJECTED'])
    .withMessage('Invalid status'),

  body('qc_status')
    .optional()
    .isIn(['Not Ready', 'Ready', 'Loading', 'Cancel', 'Hold', 'Failed'])
    .withMessage('Invalid QC status'),

  body('production_start_date')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      return true;
    }),

  body('production_end_date')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      return true;
    }),

  body('expected_delivery')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      return true;
    }),

  body('pallets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Pallets must be a positive integer'),

  body('notes')
    .optional()
    .trim(),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
];

export const updateProformaOrderValidator = [
  body('date')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      return true;
    }),

  body('supplier_id')
    .optional()
    .custom((value) => {
      if (!value || value === '' || value === null) return true;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('Invalid supplier ID format - must be a valid UUID');
      }
      return true;
    }),

  body('supplier_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Supplier name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Supplier name must not exceed 255 characters'),

  body('invoice_ref')
    .optional()
    .trim(),

  body('tariff_code')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tariff code must not exceed 100 characters'),

  body('subtotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a positive number'),

  body('total_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('status')
    .optional()
    .isIn(['Draft', 'Pending', 'Submitted', 'Approved', 'Locked', 'Confirmed', 'In Production', 'QC Passed', 'Dispatched', 'Received', 'Active', 'Inactive', 'Revised', 'REVISION_REQUIRED', 'REJECTED'])
    .withMessage('Invalid status'),

  body('qc_status')
    .optional()
    .isIn(['Not Ready', 'Ready', 'Loading', 'Cancel', 'Hold'])
    .withMessage('Invalid QC status'),

  body('production_start_date')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      return true;
    }),

  body('production_end_date')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      return true;
    }),

  body('expected_delivery')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(value)) {
        throw new Error('Date must be in yyyy-MM-dd format');
      }
      return true;
    }),

  body('pallets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Pallets must be a positive integer'),

  body('notes')
    .optional()
    .trim(),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
];

export const updateQcStatusValidator = [
  body('qc_status')
    .notEmpty()
    .withMessage('QC status is required')
    .isIn(['Not Ready', 'Ready', 'Loading', 'Cancel', 'Hold'])
    .withMessage('Invalid QC status')
];
