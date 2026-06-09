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

export const createProformaInvoiceValidator = [
  body('date')
    .optional()
    .if(() => true)
    .custom((value, { req }) => {
      const date = req.body.date || req.body.invoice_date;
      if (!date) throw new Error('Date or invoice_date is required');
      return true;
    }),

  body('client_id')
    .optional()
    .custom((value) => {
      if (!value || value === '' || value === null) return true;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('Invalid client ID format - must be a valid UUID');
      }
      return true;
    }),

  body('client_name')
    .optional()
    .custom((value, { req }) => {
      const clientName = req.body.client_name || req.body.name;
      if (!clientName || !clientName.toString().trim()) {
        throw new Error('Client name is required');
      }
      return true;
    }),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('subtotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a positive number'),

  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number'),

  body('tax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax must be a positive number'),

  body('total_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('pallets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Pallets must be a positive integer'),

  body('total_sqm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total SQM must be a positive number'),

  body('status')
    .optional()
    .isIn(['Draft', 'Submitted', 'Sent', 'Accepted', 'Approved', 'Rejected', 'Expired', 'Locked', 'Active', 'Inactive', 'Revised', 'Converted'])
    .withMessage('Invalid status'),

  body('payment_terms')
    .optional()
    .trim(),

  body('delivery_terms')
    .optional()
    .trim(),

  body('port_of_loading')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Port of loading must not exceed 255 characters'),

  body('port_of_discharge')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Port of discharge must not exceed 255 characters'),

  body('validity_days')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Validity days must be a positive integer'),

  body('notes')
    .optional()
    .trim(),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
    .custom((lines) => {
      if (!lines || lines.length === 0) return true;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!line.product_id && !line.product_name && !line.product) {
          throw new Error(`Product line ${i + 1}: product_id, product_name, or product is required`);
        }
        if (line.unit_price !== undefined && line.unit_price < 0) {
          throw new Error(`Product line ${i + 1}: unit_price must be >= 0`);
        }
      }
      return true;
    })
];

export const updateProformaInvoiceValidator = [
  body('date')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      // Accept yyyy-MM-dd or full ISO 8601
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
      if (dateOnly.test(value)) return true;
      const d = new Date(value);
      if (isNaN(d.getTime())) throw new Error('Invalid date format');
      return true;
    }),

  body('client_id')
    .optional()
    .custom((value) => {
      if (!value || value === '' || value === null) return true;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('Invalid client ID format - must be a valid UUID');
      }
      return true;
    }),

  body('client_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Client name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Client name must not exceed 255 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('subtotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a positive number'),

  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number'),

  body('tax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax must be a positive number'),

  body('total_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('pallets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Pallets must be a positive integer'),

  body('total_sqm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total SQM must be a positive number'),

  body('status')
    .optional()
    .isIn(['Draft', 'Submitted', 'Sent', 'Accepted', 'Approved', 'Rejected', 'Expired', 'Locked', 'Active', 'Inactive', 'Revised', 'Converted'])
    .withMessage('Invalid status'),

  body('payment_terms')
    .optional()
    .trim(),

  body('delivery_terms')
    .optional()
    .trim(),

  body('port_of_loading')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Port of loading must not exceed 255 characters'),

  body('port_of_discharge')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Port of discharge must not exceed 255 characters'),

  body('validity_days')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Validity days must be a positive integer'),

  body('notes')
    .optional()
    .trim(),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
    .custom((lines) => {
      if (!lines || lines.length === 0) return true;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!line.product_id && !line.product_name && !line.product) {
          throw new Error(`Product line ${i + 1}: product_id, product_name, or product is required`);
        }
        if (line.unit_price !== undefined && line.unit_price < 0) {
          throw new Error(`Product line ${i + 1}: unit_price must be >= 0`);
        }
      }
      return true;
    })
];

export const convertToOrderValidator = [
  body('supplier_id')
    .optional()
    .isUUID()
    .withMessage('Invalid supplier ID format'),

  body('supplier_name')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required')
    .isLength({ max: 255 })
    .withMessage('Supplier name must not exceed 255 characters'),

  body('production_start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid production start date format'),

  body('production_end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid production end date format'),

  body('expected_delivery')
    .optional()
    .isISO8601()
    .withMessage('Invalid expected delivery date format'),

  body('pallets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Pallets must be a positive integer'),

  body('notes')
    .optional()
    .trim()
];
