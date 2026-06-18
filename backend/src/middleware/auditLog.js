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
import { maskSensitiveFields } from '../utils/helpers.js';

const RESOURCE_TABLE_MAP = {
  'client': 'clients',
  'lead': 'leads',
  'supplier': 'suppliers',
  'product': 'products',
  'proforma_invoice': 'proforma_invoices',
  'proforma_order': 'proforma_orders',
  'export_invoice': 'export_invoices',
  'packing_list': 'packing_lists',
  'qc_record': 'qc_records',
  'pallet': 'pallets',
  // Export document suite — previously missing, causing silent audit failures
  'vgm': 'vgm_documents',
  'vgm_document': 'vgm_documents',
  'shipping_instruction': 'shipping_instructions',
  'annexure': 'export_invoice_annexures',
  'export_invoice_annexure': 'export_invoice_annexures',
  'invoice_backside': 'invoice_backside',
  'igst_invoice': 'igst_invoices',
  'client_order': 'client_orders',
  'catalogue': 'catalogues',
  'account_entry': 'account_entries',
  'sanitaryware_product': 'sanitaryware_products',
  'user': 'users',
  'certificate': 'certificates'
};

/**
 * Standard audit log insertion
 * @param {object} data - Log data
 * @param {object} db - Database router (required)
 */
export const insertAuditLog = (data, db) => {
  const { userId, companyId, action, resourceType, resourceId, oldValues, newValues, ipAddress, userAgent, method, url } = data;
  
  if (!db) {
    debugLogger.warn('insertAuditLog called without db context');
    return;
  }

  db.query(
    `INSERT INTO audit_logs (user_id, company_id, action, resource_type, resource_id, changes, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      userId || null,
      companyId || null,
      action,
      resourceType,
      resourceId || null,
      JSON.stringify({ 
        old: maskSensitiveFields(oldValues) || null, 
        new: maskSensitiveFields(newValues) || null,
        _metadata: {
          user_agent: userAgent || null,
          method: method || null,
          url: url || null
        }
      }),
      ipAddress || null
    ]
  ).catch((err) => {
    debugLogger.error('❌ insertAuditLog Error:', err.message);
  });
};

const fetchRecord = async (tableName, id, companyId, db) => {
  try {
    const result = await db.query(
      `SELECT * FROM ${tableName} WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [id, companyId]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
};

const parseResponseBody = (data) => {
  try {
    if (typeof data === 'string') return JSON.parse(data);
    return data;
  } catch {
    return null;
  }
};

/**
 * Audit Middleware Factory
 */
export const createAuditMiddleware = (resourceType, action) => {
  return async (req, res, next) => {
    const tableName = RESOURCE_TABLE_MAP[resourceType];
    let oldRecord = null;

    const db = req.db; // req.db is attached by dbRouter
    if (!db) return next();

    if ((action === 'UPDATE' || action === 'DELETE' || action === 'STATUS_CHANGE') && tableName) {
      const companyId = req.companyFilter || req.user?.companyId;
      const lookupId = req.params.id || req.params.exportInvoiceId || req.params.vgmId || req.params.annexureId || req.params.igstInvoiceId || req.params.shippingInstructionId || req.params.packingListId;
      if (companyId && lookupId) {
        oldRecord = await fetchRecord(tableName, lookupId, companyId, db).catch(() => null);
      }
    }

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode < 400) {
        try {
          const userId = req.user?.id;
          const companyId = req.companyFilter || req.user?.companyId;
          const ipAddress = req.ip;
          const userAgent = req.headers?.['user-agent'] || null;
          const method = req.method;
          const url = req.originalUrl || req.url;
          const parsed = parseResponseBody(body);
          const responseData = parsed?.data || parsed;
          const resourceId = responseData?.id || req.params.id || req.params.exportInvoiceId || req.params.vgmId || req.params.annexureId || req.params.igstInvoiceId || req.params.shippingInstructionId || req.params.packingListId || res.locals?.auditResourceId || null;

          insertAuditLog({
            userId, companyId, action, resourceType, resourceId,
            oldValues: (action === 'STATUS_CHANGE' ? { status: oldRecord?.status } : oldRecord),
            newValues: (action === 'STATUS_CHANGE' ? { status: responseData?.status || req.body?.status } : responseData),
            ipAddress,
            userAgent,
            method,
            url
          }, db);
        } catch {}
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Manual audit log helper
 */
export const auditLog = async (userId, action, resource, resourceId, changes = {}, companyId, db, reqContext = null) => {
  try {
    if (!db) return;
    
    let ipAddress = null;
    let metadata = {};
    
    if (reqContext) {
      ipAddress = reqContext.ip || null;
      metadata = {
        user_agent: reqContext.headers?.['user-agent'] || null,
        method: reqContext.method || null,
        url: reqContext.originalUrl || reqContext.url || null
      };
    }
    
    const enrichedChanges = {
      ...maskSensitiveFields(changes),
      _metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    };

    await db.query(
      `INSERT INTO audit_logs (user_id, company_id, action, resource_type, resource_id, changes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, companyId, action, resource, resourceId, JSON.stringify(enrichedChanges), ipAddress]
    );
  } catch (error) {
    debugLogger.error('Audit log error:', error);
  }
};

/**
 * Controller for retrieving audit logs
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user?.companyId;
    const { resource, dateFrom, dateTo, limit = 100 } = req.query;

    if (!companyId) return res.status(400).json({ success: false, message: 'Context required' });

    let baseQuery = 'SELECT * FROM audit_logs WHERE company_id = $1';
    const params = [companyId];
    let paramIndex = 2;

    if (resource) { baseQuery += ` AND resource_type = $${paramIndex++}`; params.push(resource); }
    if (dateFrom) { baseQuery += ` AND created_at >= $${paramIndex++}`; params.push(dateFrom); }
    if (dateTo) { baseQuery += ` AND created_at <= $${paramIndex++}`; params.push(dateTo); }

    baseQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await req.db.query(baseQuery, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};
