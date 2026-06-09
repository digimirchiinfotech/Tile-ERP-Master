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

export const createPackingListValidator = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('pi_reference')
    .optional()
    .isUUID()
    .withMessage('Invalid PI reference format'),

  body('po_reference')
    .optional()
    .isUUID()
    .withMessage('Invalid PO reference format'),

  body('client_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Client name must not exceed 255 characters'),

  body('supplier_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Supplier name must not exceed 255 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim()
    .isIn(['Warehouse A', 'Warehouse B', 'Warehouse C', 'Factory Floor', 'Shipping Dock'])
    .withMessage('Invalid location'),

  body('total_pallets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total pallets must be a positive integer'),

  body('total_boxes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total boxes must be a positive integer'),

  body('total_sqm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total SQM must be a positive number'),

  body('total_weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total weight must be a positive number'),

  body('status')
    .optional()
    .isIn(['Pending', 'Ready for Dispatch', 'Dispatched', 'On Hold'])
    .withMessage('Invalid status'),

  body('shipping_details')
    .optional()
    .isObject()
    .withMessage('Shipping details must be an object'),

  body('packing_instructions')
    .optional()
    .trim(),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
];

export const updatePackingListValidator = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('pi_reference')
    .optional()
    .isUUID()
    .withMessage('Invalid PI reference format'),

  body('po_reference')
    .optional()
    .isUUID()
    .withMessage('Invalid PO reference format'),

  body('client_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Client name must not exceed 255 characters'),

  body('supplier_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Supplier name must not exceed 255 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim()
    .isIn(['Warehouse A', 'Warehouse B', 'Warehouse C', 'Factory Floor', 'Shipping Dock'])
    .withMessage('Invalid location'),

  body('total_pallets')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total pallets must be a positive integer'),

  body('total_boxes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total boxes must be a positive integer'),

  body('total_sqm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total SQM must be a positive number'),

  body('total_weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total weight must be a positive number'),

  body('status')
    .optional()
    .isIn(['Pending', 'Ready for Dispatch', 'Dispatched', 'On Hold'])
    .withMessage('Invalid status'),

  body('shipping_details')
    .optional()
    .isObject()
    .withMessage('Shipping details must be an object'),

  body('packing_instructions')
    .optional()
    .trim(),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
];
