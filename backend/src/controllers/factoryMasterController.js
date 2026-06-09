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
import { successResponse, paginationResponse, getPagination } from '../utils/helpers.js';

export const getAllFactories = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);
    const companyId = req.companyFilter;

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (companyId) {
      conditions.push(`company_id = $${paramCount}`);
      values.push(companyId);
      paramCount++;
    } else {
      conditions.push(`company_id IS NULL`);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR factory_code ILIKE $${paramCount} OR email_id ILIKE $${paramCount} OR contact_person ILIKE $${paramCount})`);
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
      `SELECT COUNT(*) FROM factory_names ${whereClause}`,
      values
    );
    const totalItems = parseInt(countResult.rows[0].count);

    values.push(pageLimit, offset);
    
    const result = await req.db.query(
      `SELECT * FROM factory_names 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    res.json(paginationResponse(result.rows, page, pageLimit, totalItems));
  } catch (error) {
    next(error);
  }
};

export const getFactoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    let queryStr = `SELECT * FROM factory_names WHERE id = $1`;
    let values = [id];

    if (companyId) {
      queryStr += ` AND company_id = $2`;
      values.push(companyId);
    } else {
      queryStr += ` AND company_id IS NULL`;
    }

    const result = await req.db.query(queryStr, values);

    if (result.rows.length === 0) {
      return next(new AppError('Factory not found', 404));
    }

    res.json(successResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

export const createFactory = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { 
      name, location, contact_number, email_id, status = 'Active',
      contact_person, gst_number, factory_code, factory_type, 
      manufacturing_capacity, preferred_supplier
    } = req.body;

    if (!name) {
      return next(new AppError('Factory name is required', 400));
    }

    const result = await req.db.query(
      `INSERT INTO factory_names (
        company_id, name, location, contact_number, email_id, status,
        contact_person, gst_number, factory_code, factory_type,
        manufacturing_capacity, preferred_supplier, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        companyId, name, location, contact_number, email_id, status,
        contact_person, gst_number, factory_code, factory_type,
        manufacturing_capacity, preferred_supplier, req.user?.id
      ]
    );

    res.status(201).json(successResponse(result.rows[0], 'Factory created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateFactory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;
    const { 
      name, location, contact_number, email_id, status,
      contact_person, gst_number, factory_code, factory_type, 
      manufacturing_capacity, preferred_supplier
    } = req.body;

    let checkQuery = `SELECT * FROM factory_names WHERE id = $1`;
    let checkValues = [id];
    if (companyId) {
      checkQuery += ` AND company_id = $2`;
      checkValues.push(companyId);
    } else {
      checkQuery += ` AND company_id IS NULL`;
    }

    const checkResult = await req.db.query(checkQuery, checkValues);
    if (checkResult.rows.length === 0) {
      return next(new AppError('Factory not found', 404));
    }

    const result = await req.db.query(
      `UPDATE factory_names SET 
        name = COALESCE($1, name),
        location = COALESCE($2, location),
        contact_number = COALESCE($3, contact_number),
        email_id = COALESCE($4, email_id),
        status = COALESCE($5, status),
        contact_person = COALESCE($6, contact_person),
        gst_number = COALESCE($7, gst_number),
        factory_code = COALESCE($8, factory_code),
        factory_type = COALESCE($9, factory_type),
        manufacturing_capacity = COALESCE($10, manufacturing_capacity),
        preferred_supplier = COALESCE($11, preferred_supplier),
        updated_at = NOW()
      WHERE id = $12 ${companyId ? 'AND company_id = $13' : 'AND company_id IS NULL'}
      RETURNING *`,
      companyId 
        ? [name, location, contact_number, email_id, status, contact_person, gst_number, factory_code, factory_type, manufacturing_capacity, preferred_supplier, id, companyId]
        : [name, location, contact_number, email_id, status, contact_person, gst_number, factory_code, factory_type, manufacturing_capacity, preferred_supplier, id]
    );

    res.json(successResponse(result.rows[0], 'Factory updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteFactory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    let queryStr = `DELETE FROM factory_names WHERE id = $1`;
    let values = [id];

    if (companyId) {
      queryStr += ` AND company_id = $2`;
      values.push(companyId);
    } else {
      queryStr += ` AND company_id IS NULL`;
    }

    queryStr += ` RETURNING *`;

    const result = await req.db.query(queryStr, values);

    if (result.rows.length === 0) {
      return next(new AppError('Factory not found', 404));
    }

    res.json(successResponse(null, 'Factory deleted successfully'));
  } catch (error) {
    if (error.code === '23503') {
      return next(new AppError('Cannot delete factory because it is referenced in other records', 409));
    }
    next(error);
  }
};
