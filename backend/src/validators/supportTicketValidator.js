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

export const createSupportTicketValidator = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 255 })
    .withMessage('Subject must not exceed 255 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),

  body('category')
    .optional()
    .isIn(['Bug Report', 'Feature Request', 'Technical Support', 'Billing', 'General Inquiry', 'Login Issue', 'Account Issue', 'Data Issue', 'Performance Issue'])
    .withMessage('Invalid category'),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid priority'),

  body('status')
    .optional()
    .isIn(['Open', 'In Progress', 'Resolved', 'Closed'])
    .withMessage('Invalid status'),

  body('assigned_to')
    .optional()
    .isUUID()
    .withMessage('Invalid assigned user ID format')
];

export const updateSupportTicketValidator = [
  body('subject')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Subject must not exceed 255 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),

  body('category')
    .optional()
    .isIn(['Bug Report', 'Feature Request', 'Technical Support', 'Billing', 'General Inquiry', 'Login Issue', 'Account Issue', 'Data Issue', 'Performance Issue'])
    .withMessage('Invalid category'),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid priority'),

  body('status')
    .optional()
    .isIn(['Open', 'In Progress', 'Resolved', 'Closed'])
    .withMessage('Invalid status'),

  body('assigned_to')
    .optional()
    .isUUID()
    .withMessage('Invalid assigned user ID format'),

  body('resolved_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid resolved date format')
];
