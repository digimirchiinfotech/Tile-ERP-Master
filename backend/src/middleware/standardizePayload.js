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

import { convertToSnakeCase } from '../utils/helpers.js';

/**
 * Middleware to standardize incoming request payloads to snake_case.
 * This allows the frontend to send camelCase while the backend controllers
 * strictly use snake_case for database mapping.
 */
export const standardizePayload = (req, res, next) => {
  try {
    // Don't transform FormData (handled by multer) to avoid breaking file uploads
    const contentType = req.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');
    const isValidateImport = req.originalUrl && req.originalUrl.includes('validate-import');

    if (req.body && !isMultipart && typeof req.body === 'object' && !isValidateImport) {
      req.body = convertToSnakeCase(req.body);
    }

    if (req.query && typeof req.query === 'object' && !isValidateImport) {
      req.query = convertToSnakeCase(req.query);
    }

    // We skip req.params as they are defined by route patterns and shouldn't be auto-transformed
    
    next();
  } catch (err) {
    console.error('Payload Standardization Error:', err);
    next(); // Fallback: continue without transformation if it fails
  }
};
