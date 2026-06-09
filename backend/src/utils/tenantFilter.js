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
 * Tenant Filter Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * CRIT-MT-001 FIX: Standardizes the multi-tenant SQL WHERE clause pattern
 * across all controllers. Previously each controller used a different check:
 *
 *   ❌ if ('companyFilter' in req)         ← 'in' returns true even for null
 *   ❌ if (req.hasOwnProperty('companyFilter')) ← same bug as above
 *   ❌ if (req.companyFilter !== undefined) ← doesn't handle null
 *   ✅ Use these helpers everywhere instead
 *
 * Usage:
 *   import { buildTenantWhere, appendTenantClause } from '../utils/tenantFilter.js';
 *
 *   // Option A – Build from scratch:
 *   const { where, values, nextParam } = buildTenantWhere(req, 'ei', 1);
 *   // → { where: 'WHERE ei.company_id = $1', values: [companyId], nextParam: 2 }
 *
 *   // Option B – Append to existing conditions array:
 *   appendTenantClause(req, conditions, values, paramCount, 'ei');
 */

import { AppError } from '../middleware/errorHandler.js';

/**
 * Get the effective company ID from request, or null for super_admin global scope.
 * Throws if a non-super_admin has no tenant context.
 *
 * @param {object} req - Express request
 * @returns {string|null} companyId or null (super_admin global)
 */
export const getCompanyId = (req) => {
  // companyFilter is set by filterByCompany middleware
  // It is a UUID string for regular users, null for super_admin with no company context
  if (req.companyFilter) {
    return req.companyFilter; // Valid UUID — use it
  }

  if (req.user?.role === 'super_admin') {
    return null; // Super admin with no company context — global scope allowed
  }

  throw new AppError('Tenant context missing. Cannot determine company scope.', 403);
};

/**
 * Build a WHERE clause that enforces tenant isolation.
 *
 * @param {object} req            - Express request (must have companyFilter set)
 * @param {string} tableAlias     - SQL table alias (e.g., 'ei', 'pi') or '' for no alias
 * @param {number} startParam     - Starting $N parameter index (default 1)
 * @returns {{ where: string, values: Array, nextParam: number }}
 */
export const buildTenantWhere = (req, tableAlias = '', startParam = 1) => {
  const companyId = getCompanyId(req);
  const col = tableAlias ? `${tableAlias}.company_id` : 'company_id';

  if (companyId) {
    return {
      where: `WHERE ${col} = $${startParam}`,
      values: [companyId],
      nextParam: startParam + 1
    };
  }

  // Super admin global scope — no company filter
  return {
    where: '',
    values: [],
    nextParam: startParam
  };
};

/**
 * Append a tenant isolation condition to an existing conditions array.
 * Mutates conditions and values arrays in place (consistent with controller patterns).
 *
 * @param {object} req            - Express request
 * @param {Array}  conditions     - Mutable array of SQL condition strings
 * @param {Array}  values         - Mutable array of query parameter values
 * @param {number} paramCount     - Current $N parameter counter (pass by ref via object or manage externally)
 * @param {string} tableAlias     - SQL table alias (e.g., 'ei') or '' for no alias
 * @returns {number} Updated paramCount (nextParam)
 */
export const appendTenantClause = (req, conditions, values, paramCount, tableAlias = '') => {
  const companyId = getCompanyId(req);
  const col = tableAlias ? `${tableAlias}.company_id` : 'company_id';

  if (companyId) {
    conditions.push(`${col} = $${paramCount}`);
    values.push(companyId);
    return paramCount + 1;
  }

  // Super admin global — no condition added
  return paramCount;
};

/**
 * Build ownership WHERE clause for a single-record query (getById, update, delete).
 * Returns both the WHERE string and the params array ready to spread into the query.
 *
 * @param {object} req          - Express request
 * @param {string} recordId     - The record's UUID
 * @param {string} idColumn     - Column name for the record ID (default 'id')
 * @param {string} tableAlias   - Table alias or ''
 * @returns {{ where: string, params: Array }}
 */
export const buildOwnershipWhere = (req, recordId, idColumn = 'id', tableAlias = '') => {
  const companyId = getCompanyId(req);
  const idCol = tableAlias ? `${tableAlias}.${idColumn}` : idColumn;
  const companyCol = tableAlias ? `${tableAlias}.company_id` : 'company_id';

  if (companyId) {
    return {
      where: `WHERE ${idCol} = $1 AND ${companyCol} = $2`,
      params: [recordId, companyId]
    };
  }

  // Super admin global scope — match by ID only
  return {
    where: `WHERE ${idCol} = $1`,
    params: [recordId]
  };
};

export default { getCompanyId, buildTenantWhere, appendTenantClause, buildOwnershipWhere };
