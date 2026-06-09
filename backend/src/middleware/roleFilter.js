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
 * Role-based data filtering middleware
 * Frontend permissions control access - this middleware just logs role for debugging
 * All data filtering is done at company level via filterByCompany middleware
 */
export const applyRoleFilter = async (req, res, next) => {
  try {
    // Store role in request for logging/debugging
    req.userRole = req.user?.role;
    
    // All authenticated users can access their company's data
    // Data filtering by company_id is handled by filterByCompany middleware
    // Role-specific permission restrictions are handled on the frontend
    next();
  } catch (error) {
    next(error);
  }
};

export default applyRoleFilter;
