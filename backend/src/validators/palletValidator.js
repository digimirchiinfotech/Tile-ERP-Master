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
import { validateDimension } from '../utils/validators.js';

export const createPalletValidator = [
  body('category')
    .optional()
    .isIn(['Wooden', 'Plastic', 'Metal', 'Cardboard'])
    .withMessage('Invalid pallet category'),

  body('size')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Size must not exceed 100 characters'),

  body('width')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const { isValid, error } = validateDimension(value, 'Width');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('height')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const { isValid, error } = validateDimension(value, 'Height');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('boxes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Boxes must be a positive integer'),

  body('status')
    .optional()
    .isIn(['Available', 'In Use', 'Damaged', 'Under Repair'])
    .withMessage('Invalid status'),

  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),

  body('assigned_client')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Assigned client must not exceed 255 characters'),

  body('notes')
    .optional()
    .trim()
];

export const updatePalletValidator = [
  body('category')
    .optional()
    .isIn(['Wooden', 'Plastic', 'Metal', 'Cardboard'])
    .withMessage('Invalid pallet category'),

  body('size')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Size must not exceed 100 characters'),

  body('width')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const { isValid, error } = validateDimension(value, 'Width');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('height')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const { isValid, error } = validateDimension(value, 'Height');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('boxes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Boxes must be a positive integer'),

  body('status')
    .optional()
    .isIn(['Available', 'In Use', 'Damaged', 'Under Repair'])
    .withMessage('Invalid status'),

  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),

  body('assigned_client')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Assigned client must not exceed 255 characters'),

  body('notes')
    .optional()
    .trim()
];
