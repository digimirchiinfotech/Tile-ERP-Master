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

import { debugLogger } from '../utils/debugLogger.js';
/**
 * Audit Service
 * Logs system actions for auditing and security tracking.
 * Always writes to the shared/global database so audit trails are centralized.
 */

/**
 * Log a system action
 * @param {object} params - Log parameters
 * @param {object} db - Context-aware database router (req.db)
 */
export const logAction = async ({ userId, companyId, action, entityType, entityId, details, oldValue, newValue, ipAddress, userAgent, method, url }, db) => {
  try {
    if (!db) {
       debugLogger.warn('AuditService: logAction called without db context - audit log skipped');
       return;
    }

    const changesPayload = {
      ...details,
      old_value: oldValue || null,
      new_value: newValue || null,
      _metadata: {
        user_agent: userAgent || null,
        method: method || null,
        url: url || null
      }
    };

    // Use globalQuery to always write to the shared DB where audit_logs lives
    const queryFn = db.globalQuery || db.query;
    await queryFn(
      `INSERT INTO audit_logs (user_id, company_id, action, resource_type, resource_id, changes, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, companyId, action, entityType, entityId ? String(entityId) : null, JSON.stringify(changesPayload), ipAddress || null]
    );
  } catch (error) {
    // Never throw from audit logging - it's non-critical
    debugLogger.error('AuditService: Failed to log action:', error.message);
  }
};

