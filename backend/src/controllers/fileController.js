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

import path from 'path';
import fs from 'fs';
import { AppError } from '../middleware/errorHandler.js';
import env from '../config/env.js';

/**
 * Securely serves files from the uploads directory
 * Validates that the file belongs to the user's company
 */
export const serveFile = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Strict Input Sanitization
    if (!filename || filename.indexOf('\0') !== -1 || filename.includes('..')) {
      return next(new AppError('Invalid filename parameter', 400));
    }

    const companyId = req.companyFilter || req.user?.companyId;

    // --- TOP LEVEL SAFETY CHECK ---
    // The bypass for /uploads/ has been removed to enforce strict RLS for all media access.
    // Frontend must use SecureImage component for authenticated requests.

    if (!companyId) {
      return next(new AppError('Company context required', 400));
    }

    const filePathPattern = `/uploads/${filename}`;
    const params = [filename, filePathPattern, companyId];

    // Check tenant-specific tables first (Products, QC Records, Catalogues)
    const tenantFileCheckSql = `
      SELECT 1 FROM (
        SELECT jsonb_array_elements(images)->>'url' as path, company_id FROM products
        UNION ALL
        SELECT jsonb_array_elements(images)->>'url' as path, company_id FROM sanitaryware_products
        UNION ALL
        SELECT jsonb_array_elements(photos)->>'url' as path, company_id FROM qc_records
        UNION ALL
        SELECT cover_image_path as path, company_id FROM catalogues
        UNION ALL
        SELECT pdf_file_path as path, company_id FROM catalogues
        UNION ALL
        SELECT signature_path as path, company_id FROM company_signatures
      ) AS tenant_files
      WHERE (path = $1 OR path = $2) AND company_id = $3
      LIMIT 1
    `;

    // Check shared/master tables (Users, Companies)
    const masterFileCheckSql = `
      SELECT 1 FROM (
        SELECT avatar_url as path, company_id FROM users
        UNION ALL
        SELECT logo_url as path, id as company_id FROM companies
        UNION ALL
        SELECT jsonb_array_elements(settings->'logos')->>'url' as path, company_id FROM companies
      ) AS master_files
      WHERE (path = $1 OR path = $2) AND company_id = $3
      LIMIT 1
    `;

    // Robust safety check for database context

    const hasQueryEngine = req.db && typeof req.db.query === 'function';
    
    if (hasQueryEngine) {
      try {
        // Check tenant-specific tables first
        const tenantResult = await req.db.query(tenantFileCheckSql, params);
        if (tenantResult && tenantResult.rows && tenantResult.rows.length > 0) {
          return sendFileResponse(res, filename, next);
        }

        // Fallback to master/shared tables
        const masterResult = await req.db.query(masterFileCheckSql, params);
        if (masterResult && masterResult.rows && (masterResult.rows.length > 0 || req.user?.role === 'super_admin')) {
          return sendFileResponse(res, filename, next);
        }
      } catch (dbError) {
        // Fallback for super_admin if context check fails
        if (req.user?.role === 'super_admin') return sendFileResponse(res, filename, next);
      }
    } else {
      // Critical: Database context missing
    }


    return next(new AppError('Access denied or file not found', 403));
  } catch (error) {
    next(error);
  }
};

const sendFileResponse = (res, filename, next) => {
  const uploadsDir = path.resolve(process.cwd(), env.upload.dir || 'uploads');
  const fullPath = path.resolve(uploadsDir, filename);

  // Securely verify that the resolved path is strictly contained within the uploads directory
  const relative = path.relative(uploadsDir, fullPath);
  const isContained = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (!isContained) {
    return next(new AppError('Access denied or invalid file path', 403));
  }

  if (!fs.existsSync(fullPath)) {
    return next(new AppError('File not found on server', 404));
  }

  res.sendFile(fullPath);
};
