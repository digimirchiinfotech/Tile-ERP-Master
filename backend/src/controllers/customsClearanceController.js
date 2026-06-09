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
      status
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`company_id IS NULL`);
      } else {
        conditions.push(`company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(clearance_no ILIKE $${paramCount} OR port_of_origin ILIKE $${paramCount} OR port_of_destination ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM customs_clearance ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT * FROM customs_clearance 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Customs clearance records retrieved successfully'
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

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM customs_clearance ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Customs clearance record not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Customs clearance record retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      port_of_origin, port_of_destination, hs_code, clearance_date,
      clearance_authority, status = 'Pending', document_checklist = {}, notes
    } = req.body;

    const companyId = req.user.role === 'super_admin' && req.body.company_id 
      ? req.body.company_id 
      : req.user.companyId;

    const clearanceNo = await generateSequentialId('CC', 'customs_clearance', 'clearance_no', companyId, req.db);

    const result = await req.db.query(
      `INSERT INTO customs_clearance 
       (company_id, clearance_no, export_invoice_id, port_of_origin, port_of_destination,
        hs_code, clearance_date, clearance_authority, status, document_checklist, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, clearanceNo, req.body.export_invoice_id || null, port_of_origin || null,
        port_of_destination || null, hs_code || null, clearance_date || null,
        clearance_authority || null, status, JSON.stringify(document_checklist),
        notes || null, req.user.id
      ]
    );

    return successResponse(
      res,
      result.rows[0],
      'Customs clearance record created successfully',
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
      port_of_origin, port_of_destination, hs_code, clearance_date,
      clearance_authority, status, document_checklist, notes
    } = req.body;

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        checkParams.push(req.companyFilter);
      }
    }

    const existingRecord = await req.db.query(
      `SELECT id FROM customs_clearance ${whereConditions}`,
      checkParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('Customs clearance record not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (port_of_origin !== undefined) {
      updates.push(`port_of_origin = $${paramCount}`);
      values.push(port_of_origin);
      paramCount++;
    }

    if (port_of_destination !== undefined) {
      updates.push(`port_of_destination = $${paramCount}`);
      values.push(port_of_destination);
      paramCount++;
    }

    if (hs_code !== undefined) {
      updates.push(`hs_code = $${paramCount}`);
      values.push(hs_code);
      paramCount++;
    }

    if (clearance_date !== undefined) {
      updates.push(`clearance_date = $${paramCount}`);
      values.push(clearance_date);
      paramCount++;
    }

    if (clearance_authority !== undefined) {
      updates.push(`clearance_authority = $${paramCount}`);
      values.push(clearance_authority);
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
    if (req.hasOwnProperty('companyFilter')) {
      values.push(req.companyFilter);
      whereConditions = `WHERE id = $${paramCount} AND company_id = $${paramCount + 1}`;
    } else {
      whereConditions = `WHERE id = $${paramCount}`;
    }

    const result = await req.db.query(
      `UPDATE customs_clearance 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    return successResponse(
      res,
      result.rows[0],
      'Customs clearance record updated successfully'
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
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingRecord = await req.db.query(
      `SELECT id FROM customs_clearance ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('Customs clearance record not found', 404));
    }

    const result = await req.db.query(
      `DELETE FROM customs_clearance ${whereConditions} RETURNING id, clearance_no`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Customs clearance record deleted successfully'
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
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingRecord = await req.db.query(
      `SELECT id, clearance_no FROM customs_clearance ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('Customs clearance record not found', 404));
    }

    await req.db.query(
      `DELETE FROM customs_clearance ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingRecord.rows[0].id, clearance_no: existingRecord.rows[0].clearance_no },
      'Customs clearance record permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};
