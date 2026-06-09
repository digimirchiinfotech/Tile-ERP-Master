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
import { validateEmail, validatePassword, validateContactNumber, validateUsername, validateName } from '../utils/validators.js';

export const createUserValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .custom((value) => {
      const { isValid, error } = validateName(value, 'Name');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('email_id')
    .trim()
    .notEmpty()
    .withMessage('Email ID is required')
    .custom((value) => {
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom((value) => {
      const { isValid, error } = validatePassword(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('contact_number')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['super_admin', 'company_admin', 'admin', 'sales_manager', 'sales_executive', 'qc', 'qc_inspector', 'account', 'purchase_manager', 'inventory_manager', 'production_manager', 'administration', 'export_documents', 'client'])
    .withMessage('Invalid role'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must not exceed 100 characters'),

  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation must not exceed 100 characters'),

  body('employee_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Employee ID must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Suspended'])
    .withMessage('Invalid status'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
];

export const updateUserValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateName(value, 'Name');
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('email_id')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email ID cannot be empty')
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('password')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validatePassword(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('contact_number')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('role')
    .optional()
    .isIn(['super_admin', 'company_admin', 'admin', 'sales_manager', 'sales_executive', 'qc', 'qc_inspector', 'account', 'purchase_manager', 'inventory_manager', 'production_manager', 'administration', 'export_documents', 'client'])
    .withMessage('Invalid role'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must not exceed 100 characters'),

  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation must not exceed 100 characters'),

  body('employee_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Employee ID must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Suspended'])
    .withMessage('Invalid status'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
];
