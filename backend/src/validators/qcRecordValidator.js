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

export const createQcRecordValidator = [
  body('order_id')
    .optional()
    .isUUID()
    .withMessage('Invalid order ID format'),

  body('order_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Order number must not exceed 100 characters'),

  body('client_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Client name must not exceed 255 characters'),

  body('product_name')
    .optional()
    .trim(),

  // Accept both 'qc_date' and 'inspection_date' for compatibility
  body()
    .custom((value, { req }) => {
      const qcDate = req.body.qc_date || req.body.inspection_date;
      if (!qcDate) {
        throw new Error('QC date is required');
      }
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
      if (!dateRegex.test(qcDate)) {
        throw new Error('Invalid date format');
      }
      // Copy inspection_date to qc_date if needed
      if (!req.body.qc_date && req.body.inspection_date) {
        req.body.qc_date = req.body.inspection_date;
      }
      return true;
    }),

  body('qc_status')
    .optional()
    .isIn(['Pending', 'Passed', 'Failed', 'Under Process', 'Re-inspection Required', 'Active', 'Inactive'])
    .withMessage('Invalid QC status'),

  body('inspection_details')
    .optional()
    .isObject()
    .withMessage('Inspection details must be an object'),

  body('inspection_media')
    .optional()
    .isObject()
    .withMessage('Inspection media must be an object'),

  body('overall_grade')
    .optional()
    .isIn(['A+', 'A', 'B+', 'B', 'C', 'Reject'])
    .withMessage('Invalid overall grade'),

  body('notes')
    .optional()
    .trim(),

  body('inspector')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Inspector name must not exceed 255 characters'),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
];

export const updateQcRecordValidator = [
  body('order_id')
    .optional()
    .isUUID()
    .withMessage('Invalid order ID format'),

  body('order_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Order number must not exceed 100 characters'),

  body('client_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Client name must not exceed 255 characters'),

  body('product_name')
    .optional()
    .trim(),

  body('qc_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('qc_status')
    .optional()
    .isIn(['Pending', 'Passed', 'Failed', 'Under Process', 'Re-inspection Required', 'Active', 'Inactive'])
    .withMessage('Invalid QC status'),

  body('inspection_details')
    .optional()
    .isObject()
    .withMessage('Inspection details must be an object'),

  body('inspection_media')
    .optional()
    .isObject()
    .withMessage('Inspection media must be an object'),

  body('overall_grade')
    .optional()
    .isIn(['A+', 'A', 'B+', 'B', 'C', 'Reject'])
    .withMessage('Invalid overall grade'),

  body('notes')
    .optional()
    .trim(),

  body('inspector')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Inspector name must not exceed 255 characters'),

  body('product_lines')
    .optional()
    .isArray()
    .withMessage('Product lines must be an array')
];
