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

export const createCatalogueValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Catalogue name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Catalogue name must be between 2 and 255 characters'),

  body('description')
    .optional()
    .trim(),

  body('status')
    .optional()
    .isIn(['Draft', 'Active', 'Archived', 'Inactive'])
    .withMessage('Invalid status'),

  body('validity_start')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('validity_end')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

export const updateCatalogueValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Catalogue name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Catalogue name must be between 2 and 255 characters'),

  body('description')
    .optional()
    .trim(),

  body('status')
    .optional()
    .isIn(['Draft', 'Active', 'Archived', 'Inactive'])
    .withMessage('Invalid status'),

  body('validity_start')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('validity_end')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

export const createProductsValidator = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('Products must be a non-empty array'),

  body('products.*.product_id')
    .notEmpty()
    .withMessage('product_id is required for each product')
    .isUUID()
    .withMessage('product_id must be a valid UUID'),

  body('products.*.display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('display_order must be a positive integer'),

  body('products.*.custom_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('custom_price must be a positive number')
];

export const removeProductsValidator = [
  body('product_ids')
    .isArray({ min: 1 })
    .withMessage('product_ids must be a non-empty array'),

  body('product_ids.*')
    .isUUID()
    .withMessage('Each product_id must be a valid UUID')
];

export const updateProductInCatalogueValidator = [
  body('display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('display_order must be a positive integer'),

  body('custom_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('custom_price must be a positive number')
];
