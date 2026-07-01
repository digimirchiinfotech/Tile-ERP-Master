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
  normalizeEmptyToNull 
} from '../utils/helpers.js';

// Calculate performance metrics for a supplier
// Calculate performance metrics for a supplier
const calculatePerformanceMetrics = async (supplierId, companyId, db) => {
  try {
    // Get total orders and purchase value
    const orderMetrics = await db.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_purchase_value,
        MAX(created_at) as last_order_date
      FROM proforma_orders 
      WHERE supplier_id = $1 AND company_id = $2 AND status NOT IN ('Deleted', 'Revised')`,
      [supplierId, companyId]
    );

    return {
      totalOrders: parseInt(orderMetrics.rows[0]?.total_orders || 0),
      totalPurchaseValue: parseFloat(orderMetrics.rows[0]?.total_purchase_value || 0),
      lastOrderDate: orderMetrics.rows[0]?.last_order_date 
        ? new Date(orderMetrics.rows[0].last_order_date).toLocaleDateString('en-GB') 
        : null
    };
  } catch (error) {
    debugLogger.error('Error calculating metrics:', error.message);
    return {
      totalOrders: 0,
      totalPurchaseValue: 0,
      lastOrderDate: null
    };
  }
};

export const getAll = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      status, 
      country, 
      quality_rating 
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`s.company_id IS NULL`);
      } else {
        conditions.push(`s.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(s.name ILIKE $${paramCount} OR s.contact_person_name ILIKE $${paramCount} OR s.email_id ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`s.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (country) {
      conditions.push(`s.country = $${paramCount}`);
      values.push(country);
      paramCount++;
    }

    if (quality_rating) {
      conditions.push(`s.quality_rating = $${paramCount}`);
      values.push(quality_rating);
      paramCount++;
    }

    // Exclude soft-deleted records unless explicitly requesting deleted records
    if (status !== 'Deleted') {
      conditions.push(`s.status != 'Deleted'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM suppliers s ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT 
        s.*,
        COUNT(po.id) as total_orders,
        COALESCE(SUM(po.total_amount), 0) as total_order_value
       FROM suppliers s
       LEFT JOIN proforma_orders po ON s.id = po.supplier_id AND po.status NOT IN ('Deleted', 'Revised')
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.created_at DESC
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
      'Suppliers retrieved successfully'
    );
  } catch (error) {
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

    const result = await req.db.query(
      `SELECT * FROM suppliers ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Supplier not found', 404));
    }

    const supplier = result.rows[0];
    
    // Calculate and attach performance metrics
    const metrics = await calculatePerformanceMetrics(supplier.id, supplier.company_id, req.db);
    const supplierWithMetrics = {
      ...supplier,
      ...metrics
    };

    return successResponse(
      res,
      supplierWithMetrics,
      'Supplier retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const {
      supplier_name, contact_person_name, email_id, contact_number, address, city, country,
      product_categories = [], payment_terms, quality_rating, gstn, pan,
      bank_details, status = 'Active', notes, lead_time, website
    } = req.body;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      client.release();
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    await client.query('BEGIN');

    const supplierId = await generateSequentialId('SUP', 'suppliers', 'supplier_id', companyId, req.db);

    const result = await client.query(
      `INSERT INTO suppliers 
       (company_id, supplier_id, name, contact_person_name, email_id, contact_number, address, 
        city, country, product_categories, payment_terms, quality_rating, gstn, pan,
        bank_details, status, notes, lead_time, website, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, supplierId, supplier_name, normalizeEmptyToNull(contact_person_name), normalizeEmptyToNull(email_id),
        normalizeEmptyToNull(contact_number), normalizeEmptyToNull(address), normalizeEmptyToNull(city), country,
        JSON.stringify(product_categories), normalizeEmptyToNull(payment_terms),
        normalizeEmptyToNull(quality_rating), normalizeEmptyToNull(gstn), normalizeEmptyToNull(pan), 
        bank_details ? JSON.stringify(bank_details) : null,
        status, normalizeEmptyToNull(notes), normalizeEmptyToNull(lead_time), normalizeEmptyToNull(website), req.user.id
      ]
    );

    await client.query('COMMIT');

    // Audit Log
    logAction({
      userId: req.user.id, companyId, action: 'CREATE', entityType: 'supplier',
      entityId: result.rows[0].id, newValue: result.rows[0],
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      result.rows[0],
      'Supplier created successfully',
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
      supplier_name, contact_person_name, email_id, contact_number, address, city, country,
      product_categories, payment_terms, quality_rating, gstn, pan,
      bank_details, status, notes, lead_time, website
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

    const existingSupplier = await client.query(
      `SELECT id FROM suppliers ${whereConditions}`,
      checkParams
    );

    if (existingSupplier.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Supplier not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (supplier_name) {
      updates.push(`name = $${paramCount}`);
      values.push(supplier_name);
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

    if (product_categories) {
      updates.push(`product_categories = $${paramCount}`);
      values.push(JSON.stringify(product_categories));
      paramCount++;
    }

    if (payment_terms !== undefined) {
      updates.push(`payment_terms = $${paramCount}`);
      values.push(normalizeEmptyToNull(payment_terms));
      paramCount++;
    }

    if (quality_rating !== undefined) {
      updates.push(`quality_rating = $${paramCount}`);
      values.push(normalizeEmptyToNull(quality_rating));
      paramCount++;
    }

    if (gstn !== undefined) {
      updates.push(`gstn = $${paramCount}`);
      values.push(normalizeEmptyToNull(gstn));
      paramCount++;
    }

    if (pan !== undefined) {
      updates.push(`pan = $${paramCount}`);
      values.push(normalizeEmptyToNull(pan));
      paramCount++;
    }

    if (bank_details !== undefined) {
      updates.push(`bank_details = $${paramCount}`);
      values.push(bank_details ? JSON.stringify(bank_details) : null);
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

    if (lead_time !== undefined) {
      updates.push(`lead_time = $${paramCount}`);
      values.push(lead_time);
      paramCount++;
    }

    if (website !== undefined) {
      updates.push(`website = $${paramCount}`);
      values.push(normalizeEmptyToNull(website));
      paramCount++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const companyId = req.companyFilter;
    const idParamPosition = paramCount;
    values.push(id);
    paramCount++;
    
    values.push(companyId);
    whereConditions = `WHERE id = $${idParamPosition} AND company_id = $${paramCount}`;

    const result = await client.query(
      `UPDATE suppliers 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    await client.query('COMMIT');

    // Audit Log
    logAction({
      userId: req.user.id, companyId: req.companyFilter, action: 'UPDATE', entityType: 'supplier',
      entityId: id, newValue: result.rows[0],
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      result.rows[0],
      'Supplier updated successfully'
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

    // Check supplier exists (before opening the transaction)
    const existingSupplier = await req.db.query(
      `SELECT id, supplier_id, name FROM suppliers ${whereConditions}`,
      queryParams
    );

    if (existingSupplier.rows.length === 0) {
      client.release();
      return next(new AppError('Supplier not found', 404));
    }

    const supplierRecord = existingSupplier.rows[0];
    const dependencies = [];

    // Run optional dependency checks on pool (req.db), NOT on the transaction client.
    // This prevents a failed query (e.g. missing column) from aborting the transaction.
    try {
      const poResult = await req.db.query(
        `SELECT COUNT(*) as count FROM proforma_orders WHERE supplier_id = $1 AND status != 'Deleted'`,
        [id]
      );
      if (parseInt(poResult.rows[0].count) > 0) {
        dependencies.push({ type: 'Proforma Orders', count: parseInt(poResult.rows[0].count) });
      }
    } catch (e) {
      debugLogger.warn('Optional dependency check (proforma_orders) failed for supplier:', e.message);
    }

    try {
      const qcResult = await req.db.query(
        `SELECT COUNT(*) as count FROM qc_records WHERE supplier_id = $1`,
        [id]
      );
      if (parseInt(qcResult.rows[0].count) > 0) {
        dependencies.push({ type: 'QC Records', count: parseInt(qcResult.rows[0].count) });
      }
    } catch (e) {
      debugLogger.warn('Optional dependency check (qc_records) failed for supplier:', e.message);
    }

    if (dependencies.length > 0 && force !== 'true') {
      client.release();
      const depList = dependencies.map(d => `${d.count} ${d.type}`).join(', ');
      return res.status(409).json({
        success: false,
        message: `Cannot delete supplier "${supplierRecord.name}" because it is referenced by: ${depList}. Use force=true to override.`,
        dependencies,
        supplierId: supplierRecord.supplier_id
      });
    }

    // Now open the transaction for the actual soft-delete
    await client.query('BEGIN');

    queryParams.push('Deleted');
    const result = await client.query(
      `UPDATE suppliers 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING id, supplier_id`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      result.rows[0],
      'Supplier deleted successfully'
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
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
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingSupplier = await client.query(
      `SELECT id, supplier_id FROM suppliers ${whereConditions}`,
      queryParams
    );

    if (existingSupplier.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Supplier not found', 404));
    }

    await client.query(
      `DELETE FROM suppliers ${whereConditions}`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      { id: existingSupplier.rows[0].id, supplier_id: existingSupplier.rows[0].supplier_id },
      'Supplier permanently deleted'
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
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingSupplier = await client.query(
      `SELECT id, status FROM suppliers ${whereConditions}`,
      queryParams
    );

    if (existingSupplier.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Supplier not found', 404));
    }

    const currentStatus = existingSupplier.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await client.query(
      `UPDATE suppliers 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      result.rows[0],
      `Supplier status changed to ${newStatus}`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
