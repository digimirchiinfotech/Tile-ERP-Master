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

// Explicit permission matrix
const roleModuleAccess = {
  account: ['finance', 'export-invoices', 'payments'],
  sales_manager: ['leads', 'clients', 'proforma-invoices']
};

// Middleware factory to check if a module is enabled for the current company
export const checkModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      // Keep bypass only for super_admin and company_admin
      if (req.user && ['super_admin', 'company_admin'].includes(req.user.role)) {
        return next();
      }

      // Check explicit permission matrix for specific roles
      if (req.user && roleModuleAccess[req.user.role] !== undefined) {
        if (!roleModuleAccess[req.user.role].includes(moduleName)) {
          return next(new AppError('Role does not have access to this module', 403));
        }
      } else if (req.user && !['super_admin', 'company_admin'].includes(req.user.role)) {
        // FAIL-CLOSED: If role is not in the matrix and not an admin, deny access.
        return next(new AppError('Role is not authorized for any modules', 403));
      }

      // Determine company id securely from the authenticated token ONLY
      const companyId = req.user?.company_id || req.user?.companyId;
      
      if (!companyId) {
        // If there's no company context in the token (e.g. super_admin global view), let it pass
        // Or if the system requires a company, it should be enforced by the auth middleware
        return next();
      }

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
