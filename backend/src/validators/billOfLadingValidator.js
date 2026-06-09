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
import { validateSealNumber } from '../utils/validators.js';

export const createBillOfLadingValidator = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('bl_type')
    .optional()
    .isIn(['Original', 'Copy', 'Telex Release', 'Express Release', 'Sea Waybill'])
    .withMessage('Invalid BL type'),

  body('carrier_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Carrier name must not exceed 255 characters'),

  body('vessel_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Vessel name must not exceed 255 characters'),

  body('voyage_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Voyage number must not exceed 100 characters'),

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

  body('shipper_details')
    .optional(),

  body('consignee_details')
    .optional(),

  body('notify_party')
    .optional(),

  body('container_numbers')
    .optional()
    .isArray()
    .withMessage('Container numbers must be an array'),

  body('seal_numbers')
    .optional()
    .isArray()
    .withMessage('Seal numbers must be an array')
    .custom((seals) => {
      if (!Array.isArray(seals) || seals.length === 0) return true;
      for (const seal of seals) {
        const { isValid, error } = validateSealNumber(seal);
        if (!isValid) throw new Error(`Invalid seal number: ${error}`);
      }
      return true;
    }),

  body('gross_weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Gross weight must be a positive number'),

  body('cbm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('CBM must be a positive number'),

  body('freight_terms')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Freight terms must not exceed 100 characters'),

  body('freight_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Freight amount must be a positive number'),

  body('status')
    .optional()
    .isIn(['Pending', 'Issued', 'Surrendered', 'Released'])
    .withMessage('Invalid status')
];

export const updateBillOfLadingValidator = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('bl_type')
    .optional()
    .isIn(['Original', 'Copy', 'Telex Release', 'Express Release', 'Sea Waybill'])
    .withMessage('Invalid BL type'),

  body('carrier_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Carrier name must not exceed 255 characters'),

  body('vessel_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Vessel name must not exceed 255 characters'),

  body('voyage_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Voyage number must not exceed 100 characters'),

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

  body('shipper_details')
    .optional(),

  body('consignee_details')
    .optional(),

  body('notify_party')
    .optional(),

  body('container_numbers')
    .optional()
    .isArray()
    .withMessage('Container numbers must be an array'),

  body('seal_numbers')
    .optional()
    .isArray()
    .withMessage('Seal numbers must be an array')
    .custom((seals) => {
      if (!Array.isArray(seals) || seals.length === 0) return true;
      for (const seal of seals) {
        const { isValid, error } = validateSealNumber(seal);
        if (!isValid) throw new Error(`Invalid seal number: ${error}`);
      }
      return true;
    }),

  body('gross_weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Gross weight must be a positive number'),

  body('cbm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('CBM must be a positive number'),

  body('freight_terms')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Freight terms must not exceed 100 characters'),

  body('freight_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Freight amount must be a positive number'),

  body('status')
    .optional()
    .isIn(['Pending', 'Issued', 'Surrendered', 'Released'])
    .withMessage('Invalid status')
];
