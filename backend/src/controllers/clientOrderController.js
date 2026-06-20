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
import { AppError } from '../middleware/errorHandler.js';
import { 
  successResponse, 
  getPagination, 
  paginationResponse,
  getFirstRow
} from '../utils/helpers.js';

const CLIENT_ORDER_COLUMNS = `
  co.id,
  co.order_no,
  co.date,
  co.client_id,
  co.invoice_ref,
  co.total_amount,
  co.status,
  co.payment_status,
  co.delivery_status,
  co.expected_delivery,
  co.tracking_number,
  co.product_lines,
  co.shipping_address,
  co.country,
  co.notes,
  co.created_at,
  co.updated_at,
  c.client_name,
  c.contact_person_name as contact_person,
  c.country as client_country
`;

/**
 * Self-healing helper: ensures client_orders table exists and has all required columns.
 */
const ensureClientOrderTableExists = async (db) => {
  // Moved to databaseProvisioning.js to avoid runtime ALTER TABLE locks
};

export const getAll = async (req, res, next) => {
  try {
    // Ensure table exists before querying
    await ensureClientOrderTableExists(req.db);

    const { page = 1, limit = 50, search, status } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter !== null) {
        conditions.push(`co.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
      // If companyFilter is null, Super Admin sees everything (no company condition)
    } else if (req.user.role !== 'super_admin') {
      conditions.push(`co.company_id = $${paramCount}`);
      values.push(req.user.companyId);
      paramCount++;
    }

    // SECURITY: Client users only see their own orders
    if (req.user.role === 'client') {
      // Client users must have a client_id set in their profile
      if (!req.user.clientId) {
        return successResponse(
          res,
          paginationResponse([], 0, page, limit),
          'No orders found - client profile not configured'
        );
      }
      conditions.push(`co.client_id = $${paramCount}`);
      values.push(req.user.clientId);
      paramCount++;
    }

    if (search) {
      conditions.push(`(co.order_no ILIKE $${paramCount} OR co.invoice_ref ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`co.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    } else {
      conditions.push(`co.status != 'Deleted'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM client_orders co ${whereClause}`,
      values
    );
    const total = parseInt(getFirstRow(countResult)?.count || 0);

    if (total === 0) {
      return successResponse(
        res,
        paginationResponse([], 0, page, limit),
        'No client orders found'
      );
    }

    const result = await req.db.query(
      `SELECT ${CLIENT_ORDER_COLUMNS} FROM client_orders co 
       LEFT JOIN clients c ON co.client_id = c.id
       ${whereClause}
       ORDER BY co.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Client orders retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    // Ensure table exists before querying
    await ensureClientOrderTableExists(req.db);

    const { id } = req.params;

    let whereConditions = 'WHERE co.id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter !== null) {
        whereConditions += ' AND co.company_id = $2';
        queryParams.push(req.companyFilter);
      }
    } else if (req.user.role !== 'super_admin') {
      whereConditions += ' AND co.company_id = $2';
      queryParams.push(req.user.companyId);
    }

    // SECURITY: Client users only access their own orders
    if (req.user.role === 'client') {
      if (!req.user.clientId) {
        return next(new AppError('Client profile not configured', 403));
      }
      whereConditions += ` AND co.client_id = $${queryParams.length + 1}`;
      queryParams.push(req.user.clientId);
    }

    const result = await req.db.query(
      `SELECT ${CLIENT_ORDER_COLUMNS} FROM client_orders co LEFT JOIN clients c ON co.client_id = c.id ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Client order not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Client order retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getByClientId = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let whereConditions = 'WHERE co.client_id = $1';
    let queryParams = [clientId];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter !== null) {
        whereConditions += ' AND co.company_id = $2';
        queryParams.push(req.companyFilter);
      }
    } else if (req.user.role !== 'super_admin') {
      whereConditions += ' AND co.company_id = $2';
      queryParams.push(req.user.companyId);
    }

    // SECURITY: Client users only access their own client ID
    if (req.user.role === 'client') {
      if (!req.user.clientId || req.user.clientId !== clientId) {
        return next(new AppError('You cannot access orders for this client', 403));
      }
    }

    whereConditions += ' AND co.status != \'Deleted\'';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM client_orders co ${whereConditions}`,
      queryParams
    );
    const total = parseInt(getFirstRow(countResult)?.count || 0);

    if (total === 0) {
      return successResponse(
        res,
        paginationResponse([], 0, page, limit),
        'No client orders found'
      );
    }

    const result = await req.db.query(
      `SELECT ${CLIENT_ORDER_COLUMNS} FROM client_orders co 
       LEFT JOIN clients c ON co.client_id = c.id
       ${whereConditions}
       ORDER BY co.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Client orders retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    // Ensure table exists before creation
    await ensureClientOrderTableExists(req.db);

    const { 
      order_no, date, client_id, invoice_ref, total_amount, 
      status, payment_status, delivery_status, expected_delivery,
      tracking_number, product_lines, shipping_address, country, notes
    } = req.body;
    
    const company_id = req.companyFilter || req.user?.companyId || req.user?.company_id;

    if (!company_id) {
      return next(new AppError('Company context is required to create a client order.', 400));
    }

    // Auto-generate order_no if not provided
    let finalOrderNo = order_no;
    if (!finalOrderNo) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const countResult = await req.db.query(
        `SELECT COUNT(*) FROM client_orders WHERE company_id = $1`,
        [company_id]
      );
      const seq = String(parseInt(countResult.rows[0]?.count || 0) + 1).padStart(3, '0');
      finalOrderNo = `CO/${yy}/${mm}/${seq}`;
    }

    const result = await req.db.query(
      `INSERT INTO client_orders (
        company_id, order_no, date, client_id, invoice_ref, total_amount, 
        status, payment_status, delivery_status, expected_delivery,
        tracking_number, product_lines, shipping_address, country, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING *`,
      [
        company_id, finalOrderNo, date || new Date(), client_id || null, invoice_ref || null, total_amount || 0,
        status || 'Pending', payment_status || 'Unpaid', delivery_status || 'Pending', expected_delivery || null,
        tracking_number || null, JSON.stringify(product_lines || []), shipping_address || null, country || null, notes || null
      ]
    );

    return successResponse(res, result.rows[0], 'Client order created successfully', 201);
  } catch (error) {
    debugLogger.error('Error creating client order:', error.message, error.stack);
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      order_no, date, client_id, invoice_ref, total_amount, 
      status, payment_status, delivery_status, expected_delivery,
      tracking_number, product_lines, shipping_address, country, notes
    } = req.body;

    const result = await req.db.query(
      `UPDATE client_orders SET
        order_no = COALESCE($1, order_no),
        date = COALESCE($2, date),
        client_id = COALESCE($3, client_id),
        invoice_ref = COALESCE($4, invoice_ref),
        total_amount = COALESCE($5, total_amount),
        status = COALESCE($6, status),
        payment_status = COALESCE($7, payment_status),
        delivery_status = COALESCE($8, delivery_status),
        expected_delivery = COALESCE($9, expected_delivery),
        tracking_number = COALESCE($10, tracking_number),
        product_lines = COALESCE($11, product_lines),
        shipping_address = COALESCE($12, shipping_address),
        country = COALESCE($13, country),
        notes = COALESCE($14, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 RETURNING *`,
      [
        order_no, date, client_id, invoice_ref, total_amount,
        status, payment_status, delivery_status, expected_delivery,
        tracking_number, product_lines ? JSON.stringify(product_lines) : null, 
        shipping_address, country, notes, id
      ]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Client order not found', 404));
    }

    return successResponse(res, result.rows[0], 'Client order updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      "UPDATE client_orders SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Client order not found', 404));
    }

    return successResponse(res, null, 'Client order deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await req.db.query(
      'UPDATE client_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Client order not found', 404));
    }

    return successResponse(res, result.rows[0], 'Order status updated successfully');
  } catch (error) {
    next(error);
  }
};
