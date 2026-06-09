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
import { validatePassword, validateEmail, validateContactNumber } from '../utils/validators.js';

export const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),

  body()
    .custom((body) => {
      const emailField = body.email || body.email_id;
      if (!emailField) {
        throw new Error('Email is required');
      }
      if (body.email && !body.email_id) {
        body.email_id = body.email;
      }
      return true;
    }),

  body('email_id')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .custom((value) => {
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    })
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom((value) => {
      const { isValid, error } = validatePassword(value);
      if (!isValid) throw new Error(error);
      return true;
    }),

  body('company_id')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID format'),

  // SECURITY: Role field is intentionally removed from registration validator
  // Users cannot set their own role during self-registration
  // Roles are assigned by admins via the users management endpoint

  body('contact_number')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; // Optional field
      const { isValid, error } = validateContactNumber(value);
      if (!isValid) throw new Error(error);
      return true;
    })
];

export const loginValidator = [
  body()
    .custom((body) => {
      const emailOrUsername = body.email || body.email_id || body.username;
      if (!emailOrUsername || emailOrUsername.trim() === '') {
        throw new Error('Email or username is required');
      }
      // Store the login identifier for backend to use
      body.loginIdentifier = emailOrUsername.trim();
      return true;
    }),
  
  body('email_id')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; // Optional if username is provided
      const { isValid } = validateEmail(value);
      // Only validate as email if it looks like an email and is not a local test address
      if (value.includes('@') && !isValid && value !== 'admin@admin') {
        throw new Error('Invalid email format');
      }
      return true;
    })
    .normalizeEmail(),

  body('username')
    .optional()
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const refreshTokenValidator = [
  body()
    .custom((body) => {
      const token = body.refreshToken || body.refresh_token;
      if (!token) {
        throw new Error('Refresh token is required');
      }
      if (body.refresh_token && !body.refreshToken) {
        body.refreshToken = body.refresh_token;
      }
      return true;
    }),
  body('refreshToken')
    .optional()
];

export const forgotPasswordValidator = [
  body('email_id')
    .trim()
    .notEmpty()
    .withMessage('Email ID is required')
    .custom((value) => {
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    })
    .normalizeEmail()
];

export const validateResetTokenValidator = [
  body('email_id')
    .trim()
    .notEmpty()
    .withMessage('Email ID is required')
    .custom((value) => {
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    })
    .normalizeEmail(),

  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
];

export const resetPasswordValidator = [
  body('email_id')
    .trim()
    .notEmpty()
    .withMessage('Email ID is required')
    .custom((value) => {
      const { isValid, error } = validateEmail(value);
      if (!isValid) throw new Error(error);
      return true;
    })
    .normalizeEmail(),

  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),

  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .custom((value) => {
      const { isValid, error } = validatePassword(value);
      if (!isValid) throw new Error(error);
      return true;
    })
];
