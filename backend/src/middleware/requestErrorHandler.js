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
 * Request Error Handling Middleware
 * Catches and properly formats all errors
 */
import { debugLogger } from '../utils/debugLogger.js';

export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error wrapper for route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log error
      if (process.env.NODE_ENV === 'development') {
        debugLogger.error('AsyncHandler', `Async handler error on ${req.method} ${req.path}`, error);
      }
      next(error);
    });
  };
};

export default { catchAsync, asyncHandler };
