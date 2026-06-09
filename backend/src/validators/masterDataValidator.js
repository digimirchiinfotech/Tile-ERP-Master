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

import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/inputValidation.js';

const VALID_TYPES = [
  'factoryNames', 'catalogueNames', 'categories', 'sizes', 'surfaces', 'thickness', 
  'applications', 'ports', 'shippingLines', 'currencies', 'portsOfLoading', 
  'portsOfDischarge', 'finalDestinations', 'countries', 'cities', 'palletTypes', 
  'tilesBack', 'boxesMarking', 'boxTypes', 'deliveryTerms', 'paymentTerms', 
  'tariffCodes', 'palletCategories', 'warehouseLocations', 'shipping-lines', 'thicknesses',
  'authorizedSignatories', 'contactDetails', 'maxPermissibleWeights',
  'sanitarywareCategories', 'sanitarywareBrands', 'sanitarywareCollections',
  'sanitarywareMaterialTypes', 'sanitarywareColors', 'sanitarywareShapes',
  'sanitarywareFlushTypes', 'sanitarywareTrapTypes', 'sanitarywareMountTypes',
  'sanitarywareSeatCoverTypes', 'sanitarywarePackagingTypes', 'sanitarywareFinishTypes',
  'sanitarywareDimensionStandards', 'sanitarywareContainerCapacityRules'
];

// Validation regex patterns
const THICKNESS_REGEX = /^(?:\d+(?:\.\d*)?\s*(?:mm|cm)?|\d+(?:\.\d*)?)$/i; // allow number with optional unit mm/cm
const SIZE_REGEX = /^\d+(\.\d+)?\s?[xX]\s?\d+(\.\d+)?\s?(cm|mm)?$/i;
const SURFACE_REGEX = /^[A-Za-z\s]+$/;
const APPLICATION_REGEX = /^[A-Za-z\s]+$/;
const CURRENCY_REGEX = /^[A-Z]+$/;

export const validateCreateMasterData = [
  param('type')
    .isIn(VALID_TYPES)
    .withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}`),
  body('value')
    .trim()
    .notEmpty()
    .withMessage('Value is required')
    .custom(async (value, { req }) => {
      const type = req.params.type;
      
      switch(type) {
        case 'thickness': {
          // Use backend util for stricter validation if available
          try {
            const { parseThickness, validateThickness } = await import('../utils/validators.js');
            const res = validateThickness(value, 'Thickness');
            if (!res.isValid) throw new Error(res.error || 'Invalid thickness');
          } catch (err) {
            // fallback to regex if import fails
            if (!THICKNESS_REGEX.test(value)) {
              throw new Error('Thickness format: number or number + unit (e.g., "8", "8 mm", "1.2 cm")');
            }
          }
        }
          break;
        case 'sizes':
          if (!SIZE_REGEX.test(value)) {
            throw new Error('Size format: number x number, optionally with unit (e.g., "60 x 60", "60 x 60 cm")');
          }
          break;
        case 'surfaces':
          if (!SURFACE_REGEX.test(value)) {
            throw new Error('Surface: alphabetic characters only (e.g., "Glossy", "Matte")');
          }
          break;
        case 'applications':
        case 'categories':
          if (!APPLICATION_REGEX.test(value)) {
            throw new Error(`${type === 'categories' ? 'Category' : 'Application'}: alphabetic characters and spaces only`);
          }
          break;
        case 'currencies':
          if (!CURRENCY_REGEX.test(value)) {
            throw new Error('Currency: uppercase letters only (e.g., "USD", "EUR", "INR")');
          }
          if (value.length > 10) {
            throw new Error('Currency code max 10 characters');
          }
          break;
        default:
          if (value.length > 255) {
            throw new Error('Value must not exceed 255 characters');
          }
      }
      return true;
    }),
  validateRequest,
];

export const validateUpdateMasterData = [
  param('type')
    .isIn(VALID_TYPES)
    .withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}`),
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  body('value')
    .optional()
    .trim()
    .custom(async (value, { req }) => {
      if (!value) return true;
      const type = req.params.type;
      
      switch(type) {
        case 'thickness': {
          try {
            const { validateThickness } = await import('../utils/validators.js');
            const res = validateThickness(value, 'Thickness');
            if (!res.isValid) throw new Error(res.error || 'Invalid thickness');
          } catch (err) {
            if (!THICKNESS_REGEX.test(value)) {
              throw new Error('Thickness format: number or number + unit (e.g., "8", "8 mm", "1.2 cm")');
            }
          }
        }
          break;
        case 'sizes':
          if (!SIZE_REGEX.test(value)) {
            throw new Error('Size format: number x number, optionally with unit (e.g., "60 x 60", "60 x 60 cm")');
          }
          break;
        case 'surfaces':
          if (!SURFACE_REGEX.test(value)) {
            throw new Error('Surface: alphabetic characters only (e.g., "Glossy", "Matte")');
          }
          break;
        case 'applications':
        case 'categories':
          if (!APPLICATION_REGEX.test(value)) {
            throw new Error(`${type === 'categories' ? 'Category' : 'Application'}: alphabetic characters and spaces only`);
          }
          break;
        case 'currencies':
          if (!CURRENCY_REGEX.test(value)) {
            throw new Error('Currency: uppercase letters only (e.g., "USD", "EUR", "INR")');
          }
          break;
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),
  validateRequest,
];
