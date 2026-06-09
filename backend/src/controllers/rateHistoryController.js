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
import { 
  successResponse, 
  getPagination, 
  paginationResponse 
} from '../utils/helpers.js';

export const saveClientRate = async (req, res, next) => {
  try {
    const { client_name, product_name, rate, currency = 'INR' } = req.body;

    const companyId = req.user.role === 'super_admin' && req.body.company_id 
      ? req.body.company_id 
      : req.user.companyId;

    let whereConditions = 'WHERE company_id = $1 AND client_name = $2 AND product_name = $3 AND supplier_name IS NULL';
    const checkResult = await req.db.query(
      `SELECT * FROM rate_history ${whereConditions}`,
      [companyId, client_name, product_name]
    );

    if (checkResult.rows.length > 0) {
      const existingRate = checkResult.rows[0];
      const result = await req.db.query(
        `UPDATE rate_history 
         SET rate = $1, currency = $2, last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1
         WHERE id = $3
         RETURNING *`,
        [rate, currency, existingRate.id]
      );

      return successResponse(
        res,
        result.rows[0],
        'Client rate updated successfully'
      );
    } else {
      const result = await req.db.query(
        `INSERT INTO rate_history (
          company_id, client_name, product_name, rate, currency
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [companyId, client_name, product_name, rate, currency]
      );

      return successResponse(
        res,
        result.rows[0],
        'Client rate saved successfully',
        201
      );
    }
  } catch (error) {
    next(error);
  }
};

export const getClientRate = async (req, res, next) => {
  try {
    const { clientName, productName } = req.params;

    let whereConditions = 'WHERE client_name = $1 AND product_name = $2 AND supplier_name IS NULL';
    let queryParams = [clientName, productName];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $3';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM rate_history ${whereConditions} ORDER BY last_used DESC LIMIT 1`,
      queryParams
    );

    if (result.rows.length === 0) {
      return successResponse(
        res,
        { rate: 0, currency: 'INR' },
        'No rate history found'
      );
    }

    return successResponse(
      res,
      {
        rate: parseFloat(result.rows[0].rate),
        currency: result.rows[0].currency,
        lastUsed: result.rows[0].last_used,
        usageCount: result.rows[0].usage_count
      },
      'Client rate retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getClientRateHistory = async (req, res, next) => {
  try {
    const { clientName, productName } = req.params;
    const { limit = 10 } = req.query;

    let whereConditions = 'WHERE client_name = $1 AND product_name = $2 AND supplier_name IS NULL';
    let queryParams = [clientName, productName];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $3';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM rate_history 
       ${whereConditions} 
       ORDER BY last_used DESC 
       LIMIT $${queryParams.length + 1}`,
      [...queryParams, limit]
    );

    const history = result.rows.map(row => ({
      rate: parseFloat(row.rate),
      currency: row.currency,
      lastUsed: row.last_used,
      usageCount: row.usage_count,
      createdAt: row.created_at
    }));

    return successResponse(
      res,
      {
        history,
        usageCount: result.rows.length > 0 ? result.rows[0].usage_count : 0,
        lastUsed: result.rows.length > 0 ? result.rows[0].last_used : null
      },
      'Client rate history retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const saveSupplierRate = async (req, res, next) => {
  try {
    const { supplier_name, product_name, rate, currency = 'INR' } = req.body;

    const companyId = req.user.role === 'super_admin' && req.body.company_id 
      ? req.body.company_id 
      : req.user.companyId;

    let whereConditions = 'WHERE company_id = $1 AND supplier_name = $2 AND product_name = $3 AND client_name IS NULL';
    const checkResult = await req.db.query(
      `SELECT * FROM rate_history ${whereConditions}`,
      [companyId, supplier_name, product_name]
    );

    if (checkResult.rows.length > 0) {
      const existingRate = checkResult.rows[0];
      const result = await req.db.query(
        `UPDATE rate_history 
         SET rate = $1, currency = $2, last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1
         WHERE id = $3
         RETURNING *`,
        [rate, currency, existingRate.id]
      );

      return successResponse(
        res,
        result.rows[0],
        'Supplier rate updated successfully'
      );
    } else {
      const result = await req.db.query(
        `INSERT INTO rate_history (
          company_id, supplier_name, product_name, rate, currency
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [companyId, supplier_name, product_name, rate, currency]
      );

      return successResponse(
        res,
        result.rows[0],
        'Supplier rate saved successfully',
        201
      );
    }
  } catch (error) {
    next(error);
  }
};

export const getSupplierRate = async (req, res, next) => {
  try {
    const { supplierName, productName } = req.params;

    let whereConditions = 'WHERE supplier_name = $1 AND product_name = $2 AND client_name IS NULL';
    let queryParams = [supplierName, productName];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $3';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM rate_history ${whereConditions} ORDER BY last_used DESC LIMIT 1`,
      queryParams
    );

    if (result.rows.length === 0) {
      return successResponse(
        res,
        { rate: 0, currency: 'INR' },
        'No rate history found'
      );
    }

    return successResponse(
      res,
      {
        rate: parseFloat(result.rows[0].rate),
        currency: result.rows[0].currency,
        lastUsed: result.rows[0].last_used,
        usageCount: result.rows[0].usage_count
      },
      'Supplier rate retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getSupplierRateHistory = async (req, res, next) => {
  try {
    const { supplierName, productName } = req.params;
    const { limit = 10 } = req.query;

    let whereConditions = 'WHERE supplier_name = $1 AND product_name = $2 AND client_name IS NULL';
    let queryParams = [supplierName, productName];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $3';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM rate_history 
       ${whereConditions} 
       ORDER BY last_used DESC 
       LIMIT $${queryParams.length + 1}`,
      [...queryParams, limit]
    );

    const history = result.rows.map(row => ({
      rate: parseFloat(row.rate),
      currency: row.currency,
      lastUsed: row.last_used,
      usageCount: row.usage_count,
      createdAt: row.created_at
    }));

    return successResponse(
      res,
      {
        history,
        usageCount: result.rows.length > 0 ? result.rows[0].usage_count : 0,
        lastUsed: result.rows.length > 0 ? result.rows[0].last_used : null
      },
      'Supplier rate history retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type,
      name,
      product_name
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (req.hasOwnProperty('companyFilter')) {
      conditions.push(`company_id = $${paramCount}`);
      values.push(req.companyFilter);
      paramCount++;
    }

    if (type === 'client') {
      conditions.push(`client_name IS NOT NULL`);
    } else if (type === 'supplier') {
      conditions.push(`supplier_name IS NOT NULL`);
    }

    if (name) {
      conditions.push(`(client_name ILIKE $${paramCount} OR supplier_name ILIKE $${paramCount})`);
      values.push(`%${name}%`);
      paramCount++;
    }

    if (product_name) {
      conditions.push(`product_name ILIKE $${paramCount}`);
      values.push(`%${product_name}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM rate_history ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT * FROM rate_history 
       ${whereClause}
       ORDER BY last_used DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Rate history retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `DELETE FROM rate_history ${whereConditions} RETURNING *`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Rate history not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Rate history deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingRate = await req.db.query(
      `SELECT id FROM rate_history ${whereConditions}`,
      queryParams
    );

    if (existingRate.rows.length === 0) {
      return next(new AppError('Rate History not found', 404));
    }

    await req.db.query(
      `DELETE FROM rate_history ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingRate.rows[0].id },
      'Rate History permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingRate = await req.db.query(
      `SELECT id, status FROM rate_history ${whereConditions}`,
      queryParams
    );

    if (existingRate.rows.length === 0) {
      return next(new AppError('Rate History not found', 404));
    }

    const currentStatus = existingRate.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE rate_history 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `Rate History status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export default {
  saveClientRate,
  getClientRate,
  getClientRateHistory,
  saveSupplierRate,
  getSupplierRate,
  getSupplierRateHistory,
  getAll,
  remove,
  hardDelete,
  toggleStatus
};
