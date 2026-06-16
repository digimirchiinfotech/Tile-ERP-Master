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
import { logAction } from '../services/auditService.js';
import { 
  successResponse, 
  generateSequentialId, 
  getPagination, 
  paginationResponse,
  normalizeEmptyToNull,
  getFirstRow
} from '../utils/helpers.js';

export const getAll = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      status, 
      country, 
      assigned_salesperson 
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    // SECURITY: Client role users cannot access this endpoint
    // They should only see their own profile via /api/clients/:id (enforced below)
    if (req.user.role === 'client') {
      return successResponse(
        res,
        paginationResponse([], 0, page, limit),
        'Access denied - clients cannot view list'
      );
    }

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`c.company_id IS NULL`);
      } else {
        conditions.push(`c.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(c.client_name ILIKE $${paramCount} OR c.contact_person_name ILIKE $${paramCount} OR c.email_id ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`c.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (country) {
      conditions.push(`c.country = $${paramCount}`);
      values.push(country);
      paramCount++;
    }

    if (assigned_salesperson) {
      conditions.push(`c.assigned_salesperson = $${paramCount}`);
      values.push(assigned_salesperson);
      paramCount++;
    }

    // Exclude soft-deleted records unless explicitly requesting deleted records
    if (status !== 'Deleted') {
      conditions.push(`c.status != 'Deleted'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    let total = 0;
    try {
      const countResult = await req.db.query(
        `SELECT COUNT(*) FROM clients c ${whereClause}`,
        values
      );
      const countRow = getFirstRow(countResult);
      total = parseInt(countRow?.count || 0);
    } catch (countErr) {
      if (countErr.code === '42P01') {
        return successResponse(res, paginationResponse([], 0, page, limit), 'Global clients table not found');
      }
      throw countErr;
    }

    const result = await req.db.query(
      `SELECT 
        c.*,
        COUNT(pi.id) as total_orders,
        COALESCE(SUM(pi.total_amount), 0) as total_order_value
       FROM clients c
       LEFT JOIN proforma_invoices pi ON c.id = pi.client_id AND pi.status NOT IN ('Deleted', 'Revised')
       ${whereClause}
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    // Normalize counts to numbers
    const processedRows = result.rows.map(row => ({
      ...row,
      total_orders: parseInt(row.total_orders || 0),
      total_order_value: parseFloat(row.total_order_value || 0)
    }));

    return successResponse(
      res,
      paginationResponse(processedRows, total, page, limit),
      'Clients retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('Error in getAll Clients:', error.message);
    if (req.companyFilter === null && error.code === '42P01') {
       return successResponse(res, paginationResponse([], 0, req.query.page || 1, req.query.limit || 50), 'Empty global context');
    }
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    // SECURITY: Client role users can only view their own profile
    if (req.user.role === 'client') {
      if (!req.user.clientId || req.user.clientId !== id) {
        return next(new AppError('You can only view your own profile', 403));
      }
    }

    const result = await req.db.query(
      `SELECT * FROM clients ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Client not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Client retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const {
      client_name, contact_person_name, email_id, contact_number, address, city, country,
      business_type, credit_limit = 0, credit_days = 0,
      assigned_salesperson, status = 'Active', notes, consignee_details, buyer_details,
      port_of_loading = 'MUNDRA PORT', port_of_discharge, final_destination, currency = 'INR'
    } = req.body;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      client.release();
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    await client.query('BEGIN');
    
    // Pass the actual client to generateSequentialId if it accepts it, otherwise it's fine since we are in a transaction.
    // Wait, generateSequentialId takes req.db, we'll just pass req.db
    const clientId = await generateSequentialId('CLI', 'clients', 'client_id', companyId, req.db);

    const result = await client.query(
      `INSERT INTO clients 
       (company_id, client_id, name, client_name, contact_person_name, email, email_id, contact_number, address, 
        city, country, business_type, credit_limit, credit_days,
        assigned_salesperson, status, notes, consignee_details, buyer_details, port_of_loading, port_of_discharge, final_destination, currency, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, clientId, client_name, normalizeEmptyToNull(contact_person_name), normalizeEmptyToNull(email_id),
        normalizeEmptyToNull(contact_number), normalizeEmptyToNull(address), normalizeEmptyToNull(city), country, normalizeEmptyToNull(business_type),
        credit_limit || 0, credit_days || 0,
        normalizeEmptyToNull(assigned_salesperson), status || 'Active', normalizeEmptyToNull(notes), normalizeEmptyToNull(consignee_details), normalizeEmptyToNull(buyer_details),
        port_of_loading || 'MUNDRA PORT', normalizeEmptyToNull(port_of_discharge), normalizeEmptyToNull(final_destination), currency || 'INR', req.user.id
      ]
    );

    await client.query('COMMIT');

    // Audit Log
    logAction({
      userId: req.user.id, companyId, action: 'CREATE', entityType: 'client',
      entityId: result.rows[0].id, newValue: result.rows[0],
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      result.rows[0],
      'Client created successfully',
      201
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const update = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const { id } = req.params;
    const {
      client_name, contact_person_name, email_id, contact_number, address, city, country,
      business_type, credit_limit, credit_days,
      assigned_salesperson, status, notes, consignee_details, buyer_details,
      port_of_loading, port_of_discharge, final_destination, currency
    } = req.body;

    await client.query('BEGIN');

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        checkParams.push(req.companyFilter);
      }
    }

    const existingClient = await client.query(
      `SELECT id FROM clients ${whereConditions}`,
      checkParams
    );

    if (existingClient.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Client not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (client_name) {
      updates.push(`client_name = $${paramCount}`);
      values.push(client_name);
      paramCount++;
    }

    if (contact_person_name !== undefined) {
      updates.push(`contact_person_name = $${paramCount}`);
      values.push(normalizeEmptyToNull(contact_person_name));
      paramCount++;
    }

    if (email_id !== undefined) {
      updates.push(`email_id = $${paramCount}`);
      values.push(normalizeEmptyToNull(email_id));
      paramCount++;
    }

    if (contact_number !== undefined) {
      updates.push(`contact_number = $${paramCount}`);
      values.push(normalizeEmptyToNull(contact_number));
      paramCount++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(normalizeEmptyToNull(address));
      paramCount++;
    }

    if (city !== undefined) {
      updates.push(`city = $${paramCount}`);
      values.push(normalizeEmptyToNull(city));
      paramCount++;
    }

    if (country) {
      updates.push(`country = $${paramCount}`);
      values.push(country);
      paramCount++;
    }

    if (business_type !== undefined) {
      updates.push(`business_type = $${paramCount}`);
      values.push(normalizeEmptyToNull(business_type));
      paramCount++;
    }

    if (credit_limit !== undefined) {
      updates.push(`credit_limit = $${paramCount}`);
      values.push(credit_limit);
      paramCount++;
    }

    if (credit_days !== undefined) {
      updates.push(`credit_days = $${paramCount}`);
      values.push(credit_days);
      paramCount++;
    }

    if (assigned_salesperson !== undefined) {
      updates.push(`assigned_salesperson = $${paramCount}`);
      values.push(normalizeEmptyToNull(assigned_salesperson));
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(normalizeEmptyToNull(notes));
      paramCount++;
    }

    if (consignee_details !== undefined) {
      updates.push(`consignee_details = $${paramCount}`);
      values.push(normalizeEmptyToNull(consignee_details));
      paramCount++;
    }

    if (buyer_details !== undefined) {
      updates.push(`buyer_details = $${paramCount}`);
      values.push(normalizeEmptyToNull(buyer_details));
      paramCount++;
    }

    if (port_of_loading !== undefined) {
      updates.push(`port_of_loading = $${paramCount}`);
      values.push(port_of_loading || 'MUNDRA PORT');
      paramCount++;
    }

    if (port_of_discharge !== undefined) {
      updates.push(`port_of_discharge = $${paramCount}`);
      values.push(normalizeEmptyToNull(port_of_discharge));
      paramCount++;
    }

    if (final_destination !== undefined) {
      updates.push(`final_destination = $${paramCount}`);
      values.push(normalizeEmptyToNull(final_destination));
      paramCount++;
    }

    if (currency !== undefined) {
      updates.push(`currency = $${paramCount}`);
      values.push(currency || 'INR');
      paramCount++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const companyId = req.companyFilter;
    values.push(id);
    values.push(companyId);
    whereConditions = `WHERE id = $${paramCount} AND company_id = $${paramCount + 1}`;

    const result = await client.query(
      `UPDATE clients 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    await client.query('COMMIT');

    // Audit Log
    logAction({
      userId: req.user.id, companyId: req.companyFilter, action: 'UPDATE', entityType: 'client',
      entityId: id, newValue: result.rows[0],
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      result.rows[0],
      'Client updated successfully'
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const remove = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const { id } = req.params;
    const { force } = req.query;

    await client.query('BEGIN');

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingClient = await client.query(
      `SELECT id, client_id, client_name FROM clients ${whereConditions}`,
      queryParams
    );

    if (existingClient.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Client not found', 404));
    }

    const clientRecord = existingClient.rows[0];
    const dependencies = [];

    const piResult = await client.query(
      `SELECT COUNT(*) as count FROM proforma_invoices WHERE client_id = $1 AND status != 'Deleted'`,
      [id]
    );
    if (parseInt(piResult.rows[0].count) > 0) {
      dependencies.push({ type: 'Proforma Invoices', count: parseInt(piResult.rows[0].count) });
    }

    try {
      const poResult = await client.query(
        `SELECT COUNT(*) as count FROM proforma_orders WHERE client_id = $1 AND status != 'Deleted'`,
        [id]
      );
      if (parseInt(poResult.rows[0].count) > 0) {
        dependencies.push({ type: 'Proforma Orders', count: parseInt(poResult.rows[0].count) });
      }
      } catch (e) {
        debugLogger.warn('Optional dependency check (proforma_orders) failed:', e.message);
      }

    try {
      const eiResult = await client.query(
        `SELECT COUNT(*) as count FROM export_invoices WHERE client_id = $1`,
        [id]
      );
      if (parseInt(eiResult.rows[0].count) > 0) {
        dependencies.push({ type: 'Export Invoices', count: parseInt(eiResult.rows[0].count) });
      }
      } catch (e) {
        debugLogger.warn('Optional dependency check (export_invoices) failed:', e.message);
      }

    if (dependencies.length > 0 && force !== 'true') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Cannot delete client "${clientRecord.client_name}" because it is referenced by: ${dependencies.map(d => `${d.count} ${d.type}`).join(', ')}. Use force=true to override.`,
        dependencies,
        clientId: clientRecord.client_id
      });
    }

    queryParams.push('Deleted');
    const result = await client.query(
      `UPDATE clients 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING id, client_id`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      result.rows[0],
      'Client deleted successfully'
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const hardDelete = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingClient = await client.query(
      `SELECT id, client_id FROM clients ${whereConditions}`,
      queryParams
    );

    if (existingClient.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Client not found', 404));
    }

    await client.query(
      `DELETE FROM clients ${whereConditions}`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      { id: existingClient.rows[0].id, client_id: existingClient.rows[0].client_id },
      'Client permanently deleted'
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const toggleStatus = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingClient = await client.query(
      `SELECT id, status FROM clients ${whereConditions}`,
      queryParams
    );

    if (existingClient.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Client not found', 404));
    }

    const currentStatus = existingClient.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await client.query(
      `UPDATE clients 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      result.rows[0],
      `Client status changed to ${newStatus}`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
