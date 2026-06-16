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

export const bulkAction = async (req, res, next) => {
  try {
    const { ids, action, table } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('No IDs provided', 400));
    }

    const allowedTables = ['clients', 'products', 'leads', 'proforma_invoices'];
    if (!allowedTables.includes(table)) {
      return next(new AppError('Invalid table for bulk action', 400));
    }

    const companyId = Object.hasOwn(req, 'companyFilter') ? req.companyFilter : req.user?.companyId;

    let sql;
    let params = [ids, companyId];

    switch (action) {
      case 'delete':
        sql = `UPDATE ${table} SET status = 'Deleted' WHERE id = ANY($1) AND company_id = $2`;
        break;
      case 'activate':
        sql = `UPDATE ${table} SET status = 'Active' WHERE id = ANY($1) AND company_id = $2`;
        break;
      case 'deactivate':
        sql = `UPDATE ${table} SET status = 'Inactive' WHERE id = ANY($1) AND company_id = $2`;
        break;
      default:
        return next(new AppError('Invalid action', 400));
    }

    const result = await req.db.query(sql, params);

    res.json({
      success: true,
      message: `${action} performed on ${result.rowCount} items`,
      count: result.rowCount
    });
  } catch (error) {
    next(error);
  }
};
