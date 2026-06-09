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

export const createShippingInstructionValidator = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('packing_list_id')
    .optional()
    .isUUID()
    .withMessage('Invalid packing list ID format'),

  body('instruction_no')
    .optional()
    .trim(),

  body('booking_no')
    .optional()
    .trim(),

  body('vessel_name')
    .optional()
    .trim(),

  body('voyage_no')
    .optional()
    .trim(),

  body('pol')
    .optional()
    .trim(),

  body('pod')
    .optional()
    .trim(),

  body('final_destination')
    .optional()
    .trim(),

  body('total_gross_weight')
    .optional()
    .isFloat({ min: 0 }),

  body('total_net_weight')
    .optional()
    .isFloat({ min: 0 }),

  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled', 'Confirmed', 'Loading', 'Sent', 'Draft'])
];

export const updateShippingInstructionValidator = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('packing_list_id')
    .optional()
    .isUUID()
    .withMessage('Invalid packing list ID format'),

  body('instruction_no')
    .optional()
    .trim(),

  body('booking_no')
    .optional()
    .trim(),

  body('vessel_name')
    .optional()
    .trim(),

  body('voyage_no')
    .optional()
    .trim(),

  body('pol')
    .optional()
    .trim(),

  body('pod')
    .optional()
    .trim(),

  body('final_destination')
    .optional()
    .trim(),

  body('total_gross_weight')
    .optional()
    .isFloat({ min: 0 }),

  body('total_net_weight')
    .optional()
    .isFloat({ min: 0 }),

  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled', 'Confirmed', 'Loading', 'Sent', 'Draft'])
];
