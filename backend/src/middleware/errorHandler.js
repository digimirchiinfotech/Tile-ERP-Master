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

import fs from 'fs';
import path from 'path';
import env from '../config/env.js';
import { debugLogger } from '../utils/debugLogger.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  // Defensive CORS header injection to prevent backend errors from being masked as CORS blockages
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = env.frontend_url 
      ? env.frontend_url.split(',').map(u => u.trim().replace(/\/$/, '')) 
      : [];
    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    const isVercelPreview = normalizedOrigin.endsWith('.vercel.app');
    
    if (allowedOrigins.includes(normalizedOrigin) || isVercelPreview) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  const statusCode = error.statusCode || error.status || err.statusCode || err.status || 500;
  
  if (statusCode === 500) {
    try {
      const logPath = path.join(process.cwd(), 'test_error.log');
      fs.appendFileSync(logPath, new Date().toISOString() + '\\n' + (err.stack || err.message) + '\\n\\n');
    } catch (e) {}
  }

  // Always log to console server-side
  debugLogger.error('ErrorHandler', `[${req.method}] ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
    body: req.body,
    user: req.user?.id
  });

  // Handle malformed JSON from body-parser
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload'
    });
  }

  // Sequelize / Database Errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path;
    return res.status(409).json({
      success: false,
      message: err.errors[0]?.message || 'Database validation error',
      field: field
    });
  }

  // PostgreSQL duplicate key
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate field value entered. Record already exists.'
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: req.method === 'DELETE' ? 'Cannot delete: this record is referenced by other data.' : `Validation Error: Invalid reference. (${err.message})`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please login again.'
    });
  }

  // Express Validator Errors (assuming they are passed with an errors array)
  if (err.errors && Array.isArray(err.errors)) {
    const fieldError = err.errors[0];
    return res.status(400).json({
      success: false,
      message: fieldError.msg || 'Validation Error',
      field: fieldError.param || fieldError.path
    });
  }

  // Document Lock Errors
  if (err.message && err.message.toLowerCase().includes('locked')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  // Standard 500 Server Error - Temporarily expose details for debugging
  if (statusCode === 500) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please contact administrator. Error: ' + (error.message || err.message)
    });
  }

  // Default response for other caught operational errors
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Server Error'
  });
};

export { AppError, errorHandler as default };
