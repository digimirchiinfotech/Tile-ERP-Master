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

export const createPostShipmentDocValidator = [
  body('shipment_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Shipment reference must not exceed 100 characters'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('submission_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid submission date format'),

  body('submitted_to')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Submitted to must not exceed 255 characters'),

  body('courier_service')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Courier service must not exceed 255 characters'),

  body('tracking_number')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Tracking number must not exceed 255 characters'),

  body('expected_delivery')
    .optional()
    .isISO8601()
    .withMessage('Invalid expected delivery date format'),

  body('payment_method')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment method must not exceed 100 characters'),

  body('payment_status')
    .optional()
    .isIn(['Pending', 'Paid', 'Partial', 'Overdue'])
    .withMessage('Invalid payment status'),

  body('status')
    .optional()
    .isIn(['Pending', 'Submitted', 'Delivered', 'Rejected'])
    .withMessage('Invalid status'),

  body('document_checklist')
    .optional(),

  body('notes')
    .optional()
    .trim()
];

export const updatePostShipmentDocValidator = [
  body('shipment_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Shipment reference must not exceed 100 characters'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('submission_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid submission date format'),

  body('submitted_to')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Submitted to must not exceed 255 characters'),

  body('courier_service')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Courier service must not exceed 255 characters'),

  body('tracking_number')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Tracking number must not exceed 255 characters'),

  body('expected_delivery')
    .optional()
    .isISO8601()
    .withMessage('Invalid expected delivery date format'),

  body('payment_method')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment method must not exceed 100 characters'),

  body('payment_status')
    .optional()
    .isIn(['Pending', 'Paid', 'Partial', 'Overdue'])
    .withMessage('Invalid payment status'),

  body('status')
    .optional()
    .isIn(['Pending', 'Submitted', 'Delivered', 'Rejected'])
    .withMessage('Invalid status'),

  body('document_checklist')
    .optional(),

  body('notes')
    .optional()
    .trim()
];
