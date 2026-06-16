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
  generateSequentialId, 
  getPagination, 
  paginationResponse 
} from '../utils/helpers.js';

export const getAll = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      cert_type,
      status
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`company_id IS NULL`);
      } else {
        conditions.push(`company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(cert_no ILIKE $${paramCount} OR certification_body ILIKE $${paramCount} OR issuing_authority ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (cert_type) {
      conditions.push(`cert_type = $${paramCount}`);
      values.push(cert_type);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM certificates ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT * FROM certificates 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Certificates retrieved successfully'
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
      `SELECT * FROM certificates ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Certificate not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Certificate retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      cert_type, issued_date, expiry_date, issuing_authority, certification_body,
      product_category, compliance_standard, test_results = {},
      status = 'Pending', document_checklist = {}, notes
    } = req.body;

    const companyId = req.user.role === 'super_admin' && req.body.company_id 
      ? req.body.company_id 
      : req.user.companyId;

    const certNo = await generateSequentialId('CERT', 'certificates', 'cert_no', companyId, req.db);

    const result = await req.db.query(
      `INSERT INTO certificates 
       (company_id, cert_no, cert_type, export_invoice_id, issued_date, expiry_date,
        issuing_authority, certification_body, product_category, compliance_standard,
        test_results, status, document_checklist, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, certNo, cert_type || null, req.body.export_invoice_id || null,
        issued_date || null, expiry_date || null, issuing_authority || null,
        certification_body || null, product_category || null, compliance_standard || null,
        JSON.stringify(test_results), status, JSON.stringify(document_checklist),
        notes || null, req.user.id
      ]
    );

    return successResponse(
      res,
      result.rows[0],
      'Certificate created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      cert_type, issued_date, expiry_date, issuing_authority, certification_body,
      product_category, compliance_standard, test_results, status, document_checklist, notes
    } = req.body;

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

    const existingRecord = await req.db.query(
      `SELECT id FROM certificates ${whereConditions}`,
      checkParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('Certificate not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (cert_type !== undefined) {
      updates.push(`cert_type = $${paramCount}`);
      values.push(cert_type);
      paramCount++;
    }

    if (issued_date !== undefined) {
      updates.push(`issued_date = $${paramCount}`);
      values.push(issued_date);
      paramCount++;
    }

    if (expiry_date !== undefined) {
      updates.push(`expiry_date = $${paramCount}`);
      values.push(expiry_date);
      paramCount++;
    }

    if (issuing_authority !== undefined) {
      updates.push(`issuing_authority = $${paramCount}`);
      values.push(issuing_authority);
      paramCount++;
    }

    if (certification_body !== undefined) {
      updates.push(`certification_body = $${paramCount}`);
      values.push(certification_body);
      paramCount++;
    }

    if (product_category !== undefined) {
      updates.push(`product_category = $${paramCount}`);
      values.push(product_category);
      paramCount++;
    }

    if (compliance_standard !== undefined) {
      updates.push(`compliance_standard = $${paramCount}`);
      values.push(compliance_standard);
      paramCount++;
    }

    if (test_results !== undefined) {
      updates.push(`test_results = $${paramCount}`);
      values.push(JSON.stringify(test_results));
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (document_checklist !== undefined) {
      updates.push(`document_checklist = $${paramCount}`);
      values.push(JSON.stringify(document_checklist));
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    if (updates.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    if (Object.hasOwn(req, 'companyFilter')) {
      values.push(req.companyFilter);
      whereConditions = `WHERE id = $${paramCount} AND company_id = $${paramCount + 1}`;
    } else {
      whereConditions = `WHERE id = $${paramCount}`;
    }

    const result = await req.db.query(
      `UPDATE certificates 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    return successResponse(
      res,
      result.rows[0],
      'Certificate updated successfully'
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

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingRecord = await req.db.query(
      `SELECT id FROM certificates ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('Certificate not found', 404));
    }

    const result = await req.db.query(
      `DELETE FROM certificates ${whereConditions} RETURNING id, cert_no`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Certificate deleted successfully'
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

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingRecord = await req.db.query(
      `SELECT id, cert_no FROM certificates ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('Certificate not found', 404));
    }

    await req.db.query(
      `DELETE FROM certificates ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingRecord.rows[0].id, cert_no: existingRecord.rows[0].cert_no },
      'Certificate permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};
