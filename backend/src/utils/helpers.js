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

// Helper functions for common database and response operations

import { generateDocumentNumber } from './documentNumberGenerator.js';

// Generate sequential ID with atomic counter using centralized generator
export const generateSequentialId = async (prefix, tableName, numberColumn, companyId, db, date = new Date()) => {
  const result = await generateDocumentNumber(prefix, companyId, db, date);
  return result.displayNumber;
};

// Generate simple sequential ID without date using centralized generator
export const generateSimpleSequentialId = async (prefix, tableName, numberColumn, companyId, db) => {
  // Pass a date but the generator handles 'isExportStandard' prefixes as non-date-based anyway
  const result = await generateDocumentNumber(prefix, companyId, db);
  return result.displayNumber;
};

// Pagination helper with max limit enforcement
export const getPagination = (page = 1, limit = 25) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  
  const validPage = parsedPage > 0 ? parsedPage : 1;
  const validLimit = Math.min(parsedLimit > 0 ? parsedLimit : 25, 1000);
  
  const offset = (validPage - 1) * validLimit;
  
  return { 
    limit: validLimit, 
    offset 
  };
};

// Build pagination response
export const paginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Normalize empty strings to null while preserving other falsy values
export const normalizeEmptyToNull = (value) => {
  return value === '' ? null : value;
};

// Filter query builder
export const buildWhereClause = (filters, companyId = null) => {
  const conditions = [];
  const values = [];
  let paramCount = 1;

  // Add company filter for multi-tenancy
  if (companyId) {
    conditions.push(`company_id = $${paramCount}`);
    values.push(companyId);
    paramCount++;
  }

  // Add other filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key.includes('_like')) {
        const field = key.replace('_like', '');
        conditions.push(`${field} ILIKE $${paramCount}`);
        values.push(`%${value}%`);
      } else {
        conditions.push(`${key} = $${paramCount}`);
        values.push(value);
      }
      paramCount++;
    }
  });

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
};

// Date helpers
export const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Password generator
export const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Sanitize output (remove sensitive fields)
export const sanitizeUser = (user) => {
  const { password_hash, ...sanitized } = user;
  return sanitized;
};

// Convert camelCase to snake_case
const toSnake = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

// Convert snake_case to camelCase
const toCamel = (str) => {
  return str.replace(/_(.)/g, (match, char) => char.toUpperCase());
};

// Convert object keys from snake_case to camelCase
export const convertToCamelCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' ? convertToCamelCase(item) : item));
  }
  
  // Only recurse on plain objects. Skip Buffers, Dates, and other class instances.
  const isPlainObject = obj.constructor === Object || obj.constructor === undefined;
  if (typeof obj !== 'object' || obj instanceof Date || Buffer.isBuffer(obj) || !isPlainObject) {
    return obj;
  }

  const out = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = toCamel(key);
    
    // Recursive conversion for nested objects and arrays
    if (value !== null && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
      out[newKey] = convertToCamelCase(value);
    } else {
      out[newKey] = value;
    }
  }
  return out;
};

// Convert object keys from camelCase to snake_case
export const convertToSnakeCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' ? convertToSnakeCase(item) : item));
  }
  
  // Only recurse on plain objects. Skip Buffers, Dates, and other class instances.
  const isPlainObject = obj.constructor === Object || obj.constructor === undefined;
  if (typeof obj !== 'object' || obj instanceof Date || Buffer.isBuffer(obj) || !isPlainObject) {
    return obj;
  }

  const out = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = toSnake(key);
    
    // Recursive conversion for nested objects and arrays
    if (value !== null && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
      out[newKey] = convertToSnakeCase(value);
    } else {
      out[newKey] = value;
    }
  }
  return out;
};

// Safe query result access - prevents crashes on empty results
export const getFirstRow = (queryResult) => {
  if (!queryResult || !queryResult.rows || queryResult.rows.length === 0) {
    return null;
  }
  return queryResult.rows[0];
};

// Safe query result access with error handling
export const getFirstRowOrThrow = (queryResult, errorMessage = 'Record not found') => {
  const row = getFirstRow(queryResult);
  if (!row) {
    throw new Error(errorMessage);
  }
  return row;
};

// Success response helper
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: convertToCamelCase(data)
  });
};

// Error response helper
export const errorResponse = (res, message = 'Error', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

/**
 * Redacts sensitive fields from an object (e.g. for logging)
 * @param {Object} data - The data to mask
 * @param {Array} fieldsToMask - List of keys to redact
 * @returns {Object} - A cloned object with masked values
 */
export const maskSensitiveFields = (data, fieldsToMask = ['password', 'token', 'jwt', 'refreshToken', 'secret', 'password_hash', 'old_password']) => {
  if (!data || typeof data !== 'object') return data;
  
  // Clone the object to avoid mutating the original
  const masked = Array.isArray(data) ? [...data] : { ...data };
  
  Object.keys(masked).forEach(key => {
    if (fieldsToMask.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveFields(masked[key], fieldsToMask);
    }
  });
  
  return masked;
};
