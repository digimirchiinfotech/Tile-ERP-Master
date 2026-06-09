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

import { body, param, query as queryValidator } from 'express-validator';

// =====================================================
// SUBSCRIPTION PLAN VALIDATORS
// =====================================================

export const createPlanValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Plan name is required')
    .isLength({ max: 100 })
    .withMessage('Plan name must not exceed 100 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),

  body('duration_type')
    .optional()
    .isIn(['days', 'months', 'years', 'day', 'month', 'year'])
    .withMessage('Duration type must be days, months, or years'),

  body('features')
    .optional()
    .custom((value) => {
      if (Array.isArray(value) || typeof value === 'object') return true;
      throw new Error('Features must be an array or object');
    }),

  body('max_users')
    .optional()
    .isInt({ min: -1 })
    .withMessage('Max users must be -1 (unlimited) or positive integer'),

  body('max_companies')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max companies must be a positive integer'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive')
];

export const updatePlanValidator = [
  param('id')
    .isInt()
    .withMessage('Invalid plan ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Plan name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Plan name must not exceed 100 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),

  body('duration_type')
    .optional()
    .isIn(['days', 'months', 'years', 'day', 'month', 'year'])
    .withMessage('Duration type must be days, months, or years'),

  body('features')
    .optional()
    .custom((value) => {
      if (Array.isArray(value) || typeof value === 'object') return true;
      throw new Error('Features must be an array or object');
    }),

  body('max_users')
    .optional()
    .isInt({ min: -1 })
    .withMessage('Max users must be -1 (unlimited) or positive integer'),

  body('max_companies')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max companies must be a positive integer'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive')
];

export const getPlanValidator = [
  param('id')
    .isInt()
    .withMessage('Invalid plan ID')
];

export const deletePlanValidator = [
  param('id')
    .isInt()
    .withMessage('Invalid plan ID')
];

export const getAllPlansValidator = [
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  queryValidator('search')
    .optional()
    .trim(),

  queryValidator('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive')
];

// =====================================================
// COMPANY SUBSCRIPTION VALIDATORS
// =====================================================

export const createSubscriptionValidator = [
  body('company_id')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID'),

  body('plan_id')
    .notEmpty()
    .withMessage('Plan ID is required')
    .isInt()
    .withMessage('Invalid plan ID'),

  body('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('end_date')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format'),

  body('next_payment')
    .optional()
    .isISO8601()
    .withMessage('Invalid next payment date format'),

  body('status')
    .optional()
    .isIn(['Active', 'Expired', 'Cancelled', 'Trial'])
    .withMessage('Status must be Active, Expired, Cancelled, or Trial'),

  body('payment_method')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Payment method must not exceed 50 characters'),

  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
];

export const updateSubscriptionValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid subscription ID'),

  body('plan_id')
    .optional()
    .isInt()
    .withMessage('Invalid plan ID'),

  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),

  body('next_payment')
    .optional()
    .isISO8601()
    .withMessage('Invalid next payment date format'),

  body('status')
    .optional()
    .isIn(['Active', 'Expired', 'Cancelled', 'Trial'])
    .withMessage('Status must be Active, Expired, Cancelled, or Trial'),

  body('payment_method')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Payment method must not exceed 50 characters'),

  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
];

export const getSubscriptionValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid subscription ID')
];

export const cancelSubscriptionValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid subscription ID')
];

export const getAllSubscriptionsValidator = [
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  queryValidator('search')
    .optional()
    .trim(),

  queryValidator('status')
    .optional()
    .isIn(['Active', 'Expired', 'Cancelled', 'Trial'])
    .withMessage('Status must be Active, Expired, Cancelled, or Trial'),

  queryValidator('company_id')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID')
];
