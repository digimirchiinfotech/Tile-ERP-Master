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

/**
 * Input Validation & Sanitization Middleware
 * Prevents common injection attacks and sanitizes user input
 */

import { validationResult, body } from 'express-validator';
import xss from 'xss';
import fs from 'fs';
import { debugLogger } from '../utils/debugLogger.js';

/**
 * Recursively sanitize an object/array against XSS.
 * Handles: strings, arrays, nested plain objects.
 * Skips: null, undefined, numbers, booleans, Dates, Buffers.
 * @param {*} value - Value to sanitize
 * @returns {*} Sanitized value
 */
const deepSanitize = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') {
    const sanitized = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = deepSanitize(value[key]);
      }
    }
    return sanitized;
  }
  // numbers, booleans — safe as-is
  return value;
};

export const sanitizeInput = (req, res, next) => {
  // For PDF generation: apply targeted sanitization that strips dangerous tags
  // (script, iframe, object, embed) while preserving valid HTML for rendering.
  // We do NOT skip sanitization entirely — that would allow XSS/SSRF injection.
  if (req.originalUrl && req.originalUrl.includes('/api/pdf/generate')) {
    if (req.body && typeof req.body === 'object') {
      const pdfSanitize = (value) => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'string') {
          // Strip dangerous tags and javascript: protocols but keep valid HTML
          return value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^>]*>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, 'data-blocked=');
        }
        if (Array.isArray(value)) return value.map(pdfSanitize);
        if (typeof value === 'object') {
          const sanitized = {};
          for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
              sanitized[key] = pdfSanitize(value[key]);
            }
          }
          return sanitized;
        }
        return value;
      };
      req.body = pdfSanitize(req.body);
    }
    return next();
  }

  // Sanitize body recursively (catches nested product_lines, JSON fields, etc.)
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  // Sanitize query params (string values only, shallow)
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
    // Explicitly handle empty string IDs to prevent Postgres UUID parse crashes globally
    if (req.query.id === "") {
      req.query.id = null;
    }
  }
  next();
};

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    debugLogger.error('Validation', 'Input validation failed', {
      url: req.originalUrl,
      method: req.method,
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query
    });
    console.error('Validation Error:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Common validation rules
 */
export const validateEmail = () => {
  return body('email_id')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail();
};

export const validatePassword = () => {
  return body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character');
};

export const validateString = (field, minLength = 2, maxLength = 255) => {
  return body(field)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
    .matches(/^[a-zA-Z0-9\s\-.,@#$%&'()]*$/)
    .withMessage(`${field} contains invalid characters`);
};

export const validateUUID = (field = 'id') => {
  return body(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`);
};

export const validateNumber = (field, min = 0, max = 999999999) => {
  return body(field)
    .isInt({ min, max })
    .withMessage(`${field} must be a number between ${min} and ${max}`);
};

export const validateDate = (field) => {
  return body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date`);
};

export const validateEnum = (field, allowedValues) => {
  return body(field)
    .isIn(allowedValues)
    .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`);
};

export const preventParameterPollution = (req, res, next) => {
  // Remove duplicate query parameters
  const seen = new Set();
  for (const key in req.query) {
    if (seen.has(key)) {
      delete req.query[key];
    }
    seen.add(key);
  }
  next();
};

export const zodInterceptor = (schema) => (req, res, next) => {
  try {
    // Parse and coerce the data strictly before it reaches the DB layer
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    const errorMsg = error.errors ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : error.message;
    debugLogger.error('Validation', 'Zod boundary validation failed', errorMsg);
    return res.status(400).json({
      success: false,
      message: 'Strict Type Validation failed',
      errors: error.errors
    });
  }
};

export default { sanitizeInput, preventParameterPollution, zodInterceptor };

