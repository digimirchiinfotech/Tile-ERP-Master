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

import { processBulkUpdate, processBulkDelete, resourceConfig } from '../services/bulkService.js';
import { AppError } from '../middleware/errorHandler.js';
import { rolePermissions, PERMISSIONS } from '../middleware/rbac.js';

/**
 * Validates whether the current user has permission to perform bulk actions on the requested resource.
 */
const validateBulkPermission = (user, resource) => {
  const config = resourceConfig[resource];
  if (!config) {
    throw new AppError(`Resource ${resource} is not supported for bulk actions`, 400);
  }

  const role = user.role;
  if (['super_admin', 'company_admin', 'admin'].includes(role)) {
    return true; // Admin roles have full access
  }

  const rolePerms = rolePermissions[role] || [];
  if (rolePerms.includes(PERMISSIONS.ALL) || rolePerms.includes(config.permission)) {
    return true;
  }

  throw new AppError(`You do not have permission to perform bulk actions on ${resource}`, 403);
};

export const handleBulkUpdate = async (req, res, next) => {
  try {
    const { resource, ids, action, data } = req.body;
    
    if (!resource || !Array.isArray(ids) || ids.length === 0 || !data) {
      return next(new AppError('Invalid payload: resource, ids array, and data object are required', 400));
    }

    // Dynamic RBAC verification based on resource
    validateBulkPermission(req.user, resource);

    const companyId = req.companyFilter || req.user.companyId;
    const userId = req.user.id;

    // Delegate to service
    const result = await processBulkUpdate(req.db, companyId, userId, resource, ids, data);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const handleBulkDelete = async (req, res, next) => {
  try {
    const { resource, ids } = req.body;
    
    if (!resource || !Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('Invalid payload: resource and ids array are required', 400));
    }

    // Dynamic RBAC verification based on resource
    validateBulkPermission(req.user, resource);

    const companyId = req.companyFilter || req.user.companyId;
    const userId = req.user.id;

    // Delegate to service
    const result = await processBulkDelete(req.db, companyId, userId, resource, ids);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
};
