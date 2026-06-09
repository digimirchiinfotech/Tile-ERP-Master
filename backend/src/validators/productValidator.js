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
import { validateDimension, validateNumeric, validateRequiredType } from '../utils/validators.js';

export const createProductValidator = [
  body('product_code')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Product code must not exceed 100 characters'),

  body('item_ref')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Item reference must not exceed 100 characters'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isString()
    .withMessage('Product name must be a string')
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters')
    .custom((value) => {
      const typeCheck = validateRequiredType(value, 'string', 'Product Name');
      if (!typeCheck.isValid) throw new Error(typeCheck.error);
      return true;
    }),

  body('description')
    .optional({ checkFalsy: true })
    .trim(),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),

  body('size')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Size must not exceed 100 characters'),

  body('surface')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Surface must not exceed 100 characters'),

  body('thickness')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateDimension(value, 'Thickness');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('sqm_per_box')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'SQM per box', min: 0.01, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('boxes_per_pallet')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Boxes per pallet must be a positive integer'),

  body('box_weight')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Box weight', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('factory_price')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Factory price', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('selling_price')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Selling price', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('hs_code')
    .trim()
    .notEmpty()
    .withMessage('HS code is required')
    .isLength({ max: 50 })
    .withMessage('HS code must not exceed 50 characters'),

  body('images')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Images must be an array'),

  body('status')
    .optional({ checkFalsy: true })
    .isIn(['Active', 'Inactive', 'Discontinued'])
    .withMessage('Invalid status'),

  body('factory_name')
    .trim()
    .notEmpty()
    .withMessage('Factory name is required')
    .isLength({ max: 255 })
    .withMessage('Factory name must not exceed 255 characters'),

  body('factory_product_name')
    .trim()
    .notEmpty()
    .withMessage('Factory product name is required')
    .isLength({ max: 255 })
    .withMessage('Factory product name must not exceed 255 characters'),

  body('company_product_name')
    .trim()
    .notEmpty()
    .withMessage('Company product name is required')
    .isLength({ max: 255 })
    .withMessage('Company product name must not exceed 255 characters'),

  body('catalogue_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Catalogue name must not exceed 255 characters'),

  body('application')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Application must not exceed 255 characters'),

  body('box_pcs')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const intValue = parseInt(value, 10);
      if (isNaN(intValue)) throw new Error('Box pcs must be a number');
      if (intValue < 0) throw new Error('Box pcs must be 0 or greater');
      return true;
    }),

  body('default_boxes_per_kathali')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const intValue = parseInt(value, 10);
      if (isNaN(intValue)) throw new Error('Default boxes per kathali must be a number');
      if (intValue < 0) throw new Error('Default boxes per kathali must be 0 or greater');
      return true;
    }),

  body('default_per_box_weight')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Default per box weight', min: 0.01, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('default_per_pallet_weight')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Default per pallet weight', min: 0.01, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('base_price')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Base price', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('margin')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Margin', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('pdfs')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('PDFs must be an array')
];

export const updateProductValidator = [
  body('product_code')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Product code must not exceed 100 characters'),

  body('item_ref')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Item reference must not exceed 100 characters'),

  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),

  body('description')
    .optional({ checkFalsy: true })
    .trim(),

  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),

  body('size')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Size must not exceed 100 characters'),

  body('surface')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Surface must not exceed 100 characters'),

  body('thickness')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateDimension(value, 'Thickness');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('sqm_per_box')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'SQM per box', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('boxes_per_pallet')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Boxes per pallet must be a positive integer'),

  body('box_weight')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Box weight', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('factory_price')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Factory price', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('selling_price')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Selling price', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('hs_code')
    .trim()
    .notEmpty()
    .withMessage('HS code is required')
    .isLength({ max: 50 })
    .withMessage('HS code must not exceed 50 characters'),

  body('images')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Images must be an array'),

  body('status')
    .optional({ checkFalsy: true })
    .isIn(['Active', 'Inactive', 'Discontinued'])
    .withMessage('Invalid status'),

  body('factory_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Factory name must not exceed 255 characters'),

  body('factory_product_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Factory product name must not exceed 255 characters'),

  body('company_product_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company product name must not exceed 255 characters'),

  body('catalogue_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Catalogue name must not exceed 255 characters'),

  body('application')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Application must not exceed 255 characters'),

  body('box_pcs')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const intValue = parseInt(value, 10);
      if (isNaN(intValue)) throw new Error('Box pcs must be a number');
      if (intValue < 0) throw new Error('Box pcs must be 0 or greater');
      return true;
    }),

  body('default_boxes_per_kathali')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const intValue = parseInt(value, 10);
      if (isNaN(intValue)) throw new Error('Default boxes per kathali must be a number');
      if (intValue < 0) throw new Error('Default boxes per kathali must be 0 or greater');
      return true;
    }),

  body('default_per_box_weight')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Default per box weight', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('default_per_pallet_weight')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error} = validateNumeric(value, { fieldName: 'Default per pallet weight', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('base_price')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Base price', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('margin')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateNumeric(value, { fieldName: 'Margin', min: 0, allowDecimals: true });
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('pdfs')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('PDFs must be an array')
];
