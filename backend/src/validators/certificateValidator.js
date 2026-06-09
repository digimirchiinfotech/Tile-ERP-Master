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

export const createCertificateValidator = [
  body('certificate_type')
    .trim()
    .notEmpty()
    .withMessage('Certificate type is required')
    .isLength({ max: 100 })
    .withMessage('Certificate type must not exceed 100 characters'),

  body('issue_date')
    .notEmpty()
    .withMessage('Issue date is required')
    .isISO8601()
    .withMessage('Invalid issue date format'),

  body('expiry_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('bl_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('BL reference must not exceed 100 characters'),

  body('issuing_authority')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Issuing authority must not exceed 255 characters'),

  body('status')
    .optional()
    .isIn(['Applied', 'In Progress', 'Issued', 'Rejected', 'Expired'])
    .withMessage('Invalid status'),

  body('fees')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fees must be a positive number'),

  body('document_url')
    .optional()
    .trim(),

  body('notes')
    .optional()
    .trim()
];

export const updateCertificateValidator = [
  body('certificate_type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Certificate type cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Certificate type must not exceed 100 characters'),

  body('issue_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid issue date format'),

  body('expiry_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format'),

  body('invoice_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice reference must not exceed 100 characters'),

  body('bl_ref')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('BL reference must not exceed 100 characters'),

  body('issuing_authority')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Issuing authority must not exceed 255 characters'),

  body('status')
    .optional()
    .isIn(['Applied', 'In Progress', 'Issued', 'Rejected', 'Expired'])
    .withMessage('Invalid status'),

  body('fees')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fees must be a positive number'),

  body('document_url')
    .optional()
    .trim(),

  body('notes')
    .optional()
    .trim()
];
