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

/**
 * Apply role-specific data filtering to queries
 * Ensures users can only access data permitted by their role
 * 
 * Rules:
 * - client: See only their own data (via client_id)
 * - qc_inspector: See only their own QC records (created_by)
 * - sales_executive: Can be extended to see assigned clients only
 * - All others: Company-level filtering (already handled by filterByCompany middleware)
 */

export const applyRoleDataFilter = (req, conditions, values, paramCount, tableName = '') => {
  const { role, id: userId, clientId, companyId } = req.user;
  const prefix = tableName ? `${tableName}.` : '';
  
  // Client role: Filter by client_id
  if (role === 'client') {
    if (!clientId) {
      // If client user doesn't have client_id mapped, restrict access
      conditions.push('1=0'); // This will return no results
      return { conditions, values, nextParamCount: paramCount };
    }
    conditions.push(`${prefix}client_id = $${paramCount}`);
    values.push(clientId);
    return { conditions, values, nextParamCount: paramCount + 1 };
  }
  
  // QC Inspector: See only their own records (for certain tables)
  if (role === 'qc_inspector' && (tableName === 'qc_records' || !tableName)) {
    conditions.push(`${prefix}created_by = $${paramCount}`);
    values.push(userId);
    return { conditions, values, nextParamCount: paramCount + 1 };
  }
  
  return { conditions, values, nextParamCount: paramCount };
};

/**
 * Check if user can perform delete operation
 * Prevents certain roles from deleting records they shouldn't
 */
export const canDeleteRecord = (req, recordType) => {
  const { role } = req.user;
  
  const deleteRestrictions = {
    qc_records: ['qc_inspector'], // QC Inspector cannot delete QC records
    clients: ['sales_executive'], // Sales Executive should not delete clients
    leads: ['sales_executive'],    // Sales Executive should not delete leads
    users: ['sales_manager', 'sales_executive'], // Non-admin cannot delete users
  };
  
  if (deleteRestrictions[recordType] && deleteRestrictions[recordType].includes(role)) {
    return false;
  }
  
  return true;
};

/**
 * Check if user can modify a specific record
 * Used for update/edit operations
 */
export const canModifyRecord = (req, recordCreatedBy) => {
  const { role, id: userId } = req.user;
  
  // Super admin and company admin can modify any record
  if (['super_admin', 'company_admin', 'admin'].includes(role)) {
    return true;
  }
  
  // QC Inspector can only modify their own records
  if (role === 'qc_inspector' && recordCreatedBy !== userId) {
    return false;
  }
  
  return true;
};

/**
 * Middleware to prevent unauthorized deletions
 */
export const preventUnauthorizedDelete = (recordType) => {
  return (req, res, next) => {
    if (!canDeleteRecord(req, recordType)) {
      return next(new AppError(`Your role (${req.user.role}) cannot delete ${recordType}`, 403));
    }
    next();
  };
};

/**
 * Get role-appropriate query for fetching records
 * Returns the base table name with role-specific annotations
 */
export const getRoleAwareQueryBase = (req, tableName) => {
  const { role } = req.user;
  
  // For client role, might need special handling (e.g., LEFT JOIN to clients table)
  if (role === 'client') {
    // Ensure the table has client_id column
    return `${tableName}`;
  }
  
  return tableName;
};

/**
 * Get restricted fields that a role cannot see
 * Used to filter sensitive data from responses
 */
export const getRestrictionForRole = (req) => {
  const { role } = req.user;
  
  const restrictions = {
    client: {
      hiddenFields: [
        'supplier_contact',
        'internal_notes',
        'credit_limit',
        'payment_history',
        'other_clients_data'
      ]
    },
    qc_inspector: {
      hiddenFields: [
        'cost_analysis', 
        'profit_margin',
        'supplier_details'
      ]
    },
    sales_executive: {
      hiddenFields: [
        'salary_info',
        'commission_data',
        'other_rep_performance'
      ]
    }
  };
  
  return restrictions[role] || { hiddenFields: [] };
};
