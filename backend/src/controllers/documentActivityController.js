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

import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/helpers.js';
import { insertAuditLog } from '../middleware/auditLog.js';

export const getDocumentTimeline = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const companyId = req.companyFilter;

    // We want to fetch audit logs for this document, and join with users to get names
    let query = `
      SELECT 
        a.action,
        a.created_at as timestamp,
        u.name as user_name,
        u.id as user_id
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.resource_id = $1
    `;
    const params = [id];
    
    if (companyId) {
      query += ` AND a.company_id = $2`;
      params.push(companyId);
    } else {
      query += ` AND a.company_id IS NULL`;
    }

    query += ` ORDER BY a.created_at ASC`;

    const result = await req.db.query(query, params);
    
    return successResponse(res, result.rows, 'Document timeline retrieved');
  } catch (error) {
    next(error);
  }
};

export const recordDocumentAction = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { action } = req.body;
    const companyId = req.companyFilter;

    if (!['PRINT', 'DOWNLOAD'].includes(action)) {
      return next(new AppError('Invalid action type', 400));
    }

    insertAuditLog({
      userId: req.user.id,
      companyId,
      action,
      resourceType: type,
      resourceId: id,
      oldValues: null,
      newValues: null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      method: req.method,
      url: req.originalUrl
    }, req.db);

    return successResponse(res, null, 'Action recorded successfully');
  } catch (error) {
    next(error);
  }
};
