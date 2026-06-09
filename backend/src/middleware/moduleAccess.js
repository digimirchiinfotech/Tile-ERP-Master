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

import { AppError } from './errorHandler.js';

// Middleware factory to check if a module is enabled for the current company
export const checkModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      // Allow super admins and company admins to bypass module checks
      if (req.user && ['super_admin', 'company_admin', 'admin'].includes(req.user.role)) return next();

      // Determine company id
      const companyId = req.user?.company_id || req.user?.companyId || req.params?.companyId || req.params?.id || req.query?.companyId || req.body?.companyId;
      if (!companyId) return next();

      // Use req.db.query which is context-aware
      const result = await req.db.query(
        `SELECT is_enabled FROM module_access WHERE company_id = $1 AND module_name = $2 LIMIT 1`,
        [companyId, moduleName]
      );

      const isEnabled = result.rows[0]?.is_enabled === true;
      if (!isEnabled) return next(new AppError('Module not enabled for this company', 403));

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default checkModuleAccess;
