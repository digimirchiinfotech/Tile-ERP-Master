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
import { successResponse, errorResponse } from '../utils/helpers.js';

const checkBulkDependencies = async (db, ids, checks) => {
  const allDependencies = {};
  for (const id of ids) {
    const deps = [];
    for (const check of checks) {
      try {
        const result = await db.req.db.query(check.query, [id]);
        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          deps.push({ type: check.type, count });
        }
      } catch (e) {
        debugLogger.error(`Error checking dependencies for ID ${id}, type ${check.type}:`, e.message);
      }
    }
    if (deps.length > 0) {
      allDependencies[id] = deps;
    }
  }
  return allDependencies;
};

export const bulkDeleteClients = async (req, res, next) => {
  try {
    const { ids, force } = req.body;
    const companyId = req.companyFilter;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    if (!force) {
      const deps = await checkBulkDependencies(req.db, ids, [
        { type: 'Proforma Invoices', query: `SELECT COUNT(*) as count FROM proforma_invoices WHERE client_id = $1 AND status != 'Deleted'` },
        { type: 'Export Invoices', query: `SELECT COUNT(*) as count FROM export_invoices WHERE client_id = $1` }
      ]);

      if (Object.keys(deps).length > 0) {
        return res.status(409).json({
          success: false,
          message: `${Object.keys(deps).length} client(s) have dependent records and cannot be deleted. Use force=true to override.`,
          dependencies: deps
        });
      }
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    const result = await req.db.query(
      `UPDATE clients 
       SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { deletedCount: result.rowCount },
      `${result.rowCount} client(s) deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteLeads = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const companyId = req.companyFilter;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    const result = await req.db.query(
      `UPDATE leads 
       SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { deletedCount: result.rowCount },
      `${result.rowCount} lead(s) deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteSuppliers = async (req, res, next) => {
  try {
    const { ids, force } = req.body;
    const companyId = req.companyFilter;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    if (!force) {
      const deps = await checkBulkDependencies(req.db, ids, [
        { type: 'Proforma Orders', query: `SELECT COUNT(*) as count FROM proforma_orders WHERE supplier_id = $1 AND status != 'Deleted'` }
      ]);

      if (Object.keys(deps).length > 0) {
        return res.status(409).json({
          success: false,
          message: `${Object.keys(deps).length} supplier(s) have dependent records and cannot be deleted. Use force=true to override.`,
          dependencies: deps
        });
      }
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    const result = await req.db.query(
      `UPDATE suppliers 
       SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { deletedCount: result.rowCount },
      `${result.rowCount} supplier(s) deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteProducts = async (req, res, next) => {
  try {
    const { ids, force } = req.body;
    const companyId = req.companyFilter;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    if (!force) {
      const deps = await checkBulkDependencies(req.db, ids, [
        { type: 'Proforma Invoices', query: `SELECT COUNT(*) as count FROM proforma_invoices WHERE product_lines::text LIKE '%' || $1 || '%' AND status != 'Deleted'` },
        { type: 'Export Invoices', query: `SELECT COUNT(*) as count FROM export_invoices WHERE product_lines::text LIKE '%' || $1 || '%'` }
      ]);

      if (Object.keys(deps).length > 0) {
        return res.status(409).json({
          success: false,
          message: `${Object.keys(deps).length} product(s) have dependent records and cannot be deleted. Use force=true to override.`,
          dependencies: deps
        });
      }
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    const result = await req.db.query(
      `UPDATE products 
       SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { deletedCount: result.rowCount },
      `${result.rowCount} product(s) deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteCatalogues = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const companyId = req.companyFilter;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    const result = await req.db.query(
      `UPDATE catalogues 
       SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { deletedCount: result.rowCount },
      `${result.rowCount} catalogue(s) deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteInvoices = async (req, res, next) => {
  try {
    const { ids, force } = req.body;
    const companyId = req.companyFilter;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    if (!force) {
      const deps = await checkBulkDependencies(req.db, ids, [
        { type: 'Export Invoices', query: `SELECT COUNT(*) as count FROM export_invoices WHERE proforma_invoice_id = $1` },
        { type: 'Proforma Orders', query: `SELECT COUNT(*) as count FROM proforma_orders WHERE proforma_invoice_id = $1 AND status != 'Deleted'` }
      ]);

      if (Object.keys(deps).length > 0) {
        return res.status(409).json({
          success: false,
          message: `${Object.keys(deps).length} invoice(s) have dependent records and cannot be deleted. Use force=true to override.`,
          dependencies: deps
        });
      }
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    const result = await req.db.query(
      `UPDATE proforma_invoices 
       SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { deletedCount: result.rowCount },
      `${result.rowCount} invoice(s) deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkHardDelete = async (req, res, next) => {
  try {
    const { table, ids, force } = req.body;
    const companyId = req.companyFilter;
    const userRole = req.user?.role;

    if (!['super_admin', 'company_admin'].includes(userRole)) {
      return errorResponse(res, 'Insufficient permissions for hard delete', 403);
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    const validTables = ['clients', 'leads', 'products', 'catalogues', 'proforma_invoices', 'suppliers'];
    if (!validTables.includes(table)) {
      return errorResponse(res, 'Invalid table name', 400);
    }

    if (!force) {
      let checks = [];
      if (table === 'clients') {
        checks = [
          { type: 'Proforma Invoices', query: `SELECT COUNT(*) as count FROM proforma_invoices WHERE client_id = $1 AND status != 'Deleted'` },
          { type: 'Export Invoices', query: `SELECT COUNT(*) as count FROM export_invoices WHERE client_id = $1` }
        ];
      } else if (table === 'products') {
        checks = [
          { type: 'Proforma Invoices', query: `SELECT COUNT(*) as count FROM proforma_invoices WHERE product_lines::text LIKE '%' || $1 || '%' AND status != 'Deleted'` },
          { type: 'Export Invoices', query: `SELECT COUNT(*) as count FROM export_invoices WHERE product_lines::text LIKE '%' || $1 || '%'` }
        ];
      } else if (table === 'suppliers') {
        checks = [
          { type: 'Proforma Orders', query: `SELECT COUNT(*) as count FROM proforma_orders WHERE supplier_id = $1 AND status != 'Deleted'` }
        ];
      } else if (table === 'proforma_invoices') {
        checks = [
          { type: 'Export Invoices', query: `SELECT COUNT(*) as count FROM export_invoices WHERE proforma_invoice_id = $1` }
        ];
      }

      if (checks.length > 0) {
        const deps = await checkBulkDependencies(req.db, ids, checks);
        if (Object.keys(deps).length > 0) {
          return res.status(409).json({
            success: false,
            message: `${Object.keys(deps).length} record(s) have dependent records and cannot be permanently deleted. Use force=true to override.`,
            dependencies: deps
          });
        }
      }
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    let result;
    
    if (table === 'catalogues') {
      await req.db.query(
        `DELETE FROM catalogue_products 
         WHERE catalogue_id IN (SELECT id FROM catalogues 
         WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1})`,
        params
      );
    }

    result = await req.db.query(
      `DELETE FROM ${table} 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { deletedCount: result.rowCount },
      `${result.rowCount} record(s) permanently deleted from ${table}`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkRestore = async (req, res, next) => {
  try {
    const { table, ids } = req.body;
    const companyId = req.companyFilter;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Invalid or empty IDs array', 400);
    }

    const validTables = ['clients', 'leads', 'products', 'catalogues', 'proforma_invoices', 'suppliers'];
    if (!validTables.includes(table)) {
      return errorResponse(res, 'Invalid table name', 400);
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const params = [...ids, companyId];

    const result = await req.db.query(
      `UPDATE ${table} 
       SET status = 'Active', updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND company_id = $${ids.length + 1}`,
      params
    );

    return successResponse(
      res,
      { restoredCount: result.rowCount },
      `${result.rowCount} record(s) restored successfully`
    );
  } catch (error) {
    next(error);
  }
};

export default {
  bulkDeleteClients,
  bulkDeleteLeads,
  bulkDeleteSuppliers,
  bulkDeleteProducts,
  bulkDeleteCatalogues,
  bulkDeleteInvoices,
  bulkHardDelete,
  bulkRestore
};
