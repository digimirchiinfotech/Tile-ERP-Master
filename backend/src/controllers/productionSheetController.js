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

export const getProductionSheets = async (req, res, next) => {
  try {
    const { 
      page = 1, limit = 50, search, status, factory_id, po_no, 
      pi_no, customer_id, product_id, date_from, date_to 
    } = req.query;
    
    const { limit: pageLimit, offset } = getPagination(page, limit);
    const companyId = req.companyFilter;

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (companyId) {
      conditions.push(`ps.company_id = $${paramCount}`);
      values.push(companyId);
      paramCount++;
    } else {
      conditions.push(`ps.company_id IS NULL`);
    }

    if (search) {
      conditions.push(`(os.pi_no ILIKE $${paramCount} OR os.production_sheet_no ILIKE $${paramCount} OR f.name ILIKE $${paramCount} OR c.name ILIKE $${paramCount} OR p.name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`ps.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (factory_id) {
      conditions.push(`ps.factory_id = $${paramCount}`);
      values.push(factory_id);
      paramCount++;
    }

    if (po_no) {
      conditions.push(`os.production_sheet_no ILIKE $${paramCount}`);
      values.push(`%${po_no}%`);
      paramCount++;
    }

    if (pi_no) {
      conditions.push(`os.pi_no ILIKE $${paramCount}`);
      values.push(`%${pi_no}%`);
      paramCount++;
    }

    if (customer_id) {
      conditions.push(`ps.customer_id = $${paramCount}`);
      values.push(customer_id);
      paramCount++;
    }

    if (product_id) {
      conditions.push(`ps.product_id = $${paramCount}`);
      values.push(product_id);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) 
      FROM production_sheets ps
      LEFT JOIN order_sheets os ON ps.po_id = os.id
      LEFT JOIN factory_names f ON ps.factory_id = f.id
      LEFT JOIN clients c ON ps.customer_id = c.id
      LEFT JOIN products p ON ps.product_id = p.id
      ${whereClause}
    `;

    const countResult = await req.db.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    values.push(pageLimit, offset);

    const query = `
      SELECT 
        ps.*,
        os.production_sheet_no as po_no,
        os.pi_no as pi_no,
        f.name as factory_name,
        c.name as customer_name,
        p.name as product_name
      FROM production_sheets ps
      LEFT JOIN order_sheets os ON ps.po_id = os.id
      LEFT JOIN factory_names f ON ps.factory_id = f.id
      LEFT JOIN clients c ON ps.customer_id = c.id
      LEFT JOIN products p ON ps.product_id = p.id
      ${whereClause}
      ORDER BY ps.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await req.db.query(query, values);
    res.json(paginationResponse(result.rows, page, pageLimit, totalItems));
  } catch (error) {
    next(error);
  }
};

export const getProductionSheetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    let queryStr = `
      SELECT 
        ps.*,
        os.production_sheet_no as po_no,
        os.pi_no as pi_no,
        f.name as factory_name,
        c.name as customer_name,
        p.name as product_name
      FROM production_sheets ps
      LEFT JOIN order_sheets os ON ps.po_id = os.id
      LEFT JOIN factory_names f ON ps.factory_id = f.id
      LEFT JOIN clients c ON ps.customer_id = c.id
      LEFT JOIN products p ON ps.product_id = p.id
      WHERE ps.id = $1
    `;
    let values = [id];

    if (companyId) {
      queryStr += ` AND ps.company_id = $2`;
      values.push(companyId);
    } else {
      queryStr += ` AND ps.company_id IS NULL`;
    }

    const result = await req.db.query(queryStr, values);

    if (result.rows.length === 0) {
      return next(new AppError('Production sheet not found', 404));
    }

    res.json(successResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

export const getProductionEntries = async (req, res, next) => {
  try {
    const { id } = req.params; // production sheet id
    const companyId = req.companyFilter;

    let queryStr = `
      SELECT pe.*, u.first_name, u.last_name
      FROM production_entries pe
      LEFT JOIN users u ON pe.created_by = u.id
      WHERE pe.production_sheet_id = $1
    `;
    let values = [id];

    if (companyId) {
      queryStr += ` AND pe.company_id = $2`;
      values.push(companyId);
    }

    queryStr += ` ORDER BY pe.production_date DESC, pe.created_at DESC`;

    const result = await req.db.query(queryStr, values);
    res.json(successResponse(result.rows));
  } catch (error) {
    next(error);
  }
};

export const createProductionEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;
    const { production_date, produced_qty, remarks } = req.body;

    if (!produced_qty || isNaN(produced_qty) || produced_qty <= 0) {
      return next(new AppError('Valid produced quantity is required', 400));
    }

    // Begin Transaction
    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch current production sheet
      let psQuery = `SELECT * FROM production_sheets WHERE id = $1`;
      let psValues = [id];
      if (companyId) {
        psQuery += ` AND company_id = $2`;
        psValues.push(companyId);
      }
      
      const psResult = await client.query(psQuery, psValues);
      if (psResult.rows.length === 0) {
        throw new AppError('Production sheet not found', 404);
      }
      const sheet = psResult.rows[0];

      // 2. Insert new entry
      await client.query(
        `INSERT INTO production_entries (company_id, production_sheet_id, production_date, produced_qty, remarks, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, id, production_date || new Date(), produced_qty, remarks, req.user?.id]
      );

      // 3. Recalculate totals
      const newProducedQty = parseFloat(sheet.produced_qty || 0) + parseFloat(produced_qty);
      const requiredQty = parseFloat(sheet.required_qty || 0);
      let newPendingQty = requiredQty - newProducedQty;
      if (newPendingQty < 0) newPendingQty = 0;

      let newStatus = sheet.status;
      if (newProducedQty >= requiredQty) {
        newStatus = 'Production Complete';
      } else if (newProducedQty > 0) {
        newStatus = 'In Production';
      }

      // 4. Update production sheet
      await client.query(
        `UPDATE production_sheets SET 
          produced_qty = $1, 
          pending_qty = $2, 
          status = $3,
          updated_at = NOW()
         WHERE id = $4`,
        [newProducedQty, newPendingQty, newStatus, id]
      );

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          companyId, req.user?.id, 'CREATE_PRODUCTION_ENTRY', 'production_sheets', id,
          JSON.stringify({ old_produced_qty: sheet.produced_qty, new_produced_qty: newProducedQty, entry_qty: produced_qty, remarks }),
          req.ip
        ]
      );

      await client.query('COMMIT');
      res.status(201).json(successResponse({ status: newStatus, produced_qty: newProducedQty, pending_qty: newPendingQty }, 'Production entry added successfully'));
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const createQCInspection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;
    const { decision, comments } = req.body;

    if (!['Approved', 'Rejected'].includes(decision)) {
      return next(new AppError('Decision must be Approved or Rejected', 400));
    }

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      let psQuery = `SELECT * FROM production_sheets WHERE id = $1`;
      let psValues = [id];
      if (companyId) {
        psQuery += ` AND company_id = $2`;
        psValues.push(companyId);
      }
      
      const psResult = await client.query(psQuery, psValues);
      if (psResult.rows.length === 0) {
        throw new AppError('Production sheet not found', 404);
      }
      const sheet = psResult.rows[0];

      // Insert QC Record
      await client.query(
        `INSERT INTO qc_inspections (company_id, production_sheet_id, qc_user, decision, comments)
         VALUES ($1, $2, $3, $4, $5)`,
        [companyId, id, req.user?.id, decision, comments]
      );

      // Update Production Sheet Status
      let newStatus = sheet.status;
      let readyForExport = false;
      let readyDate = null;

      if (decision === 'Approved') {
        newStatus = 'QC Approved';
        
        // Ready for export logic
        const producedQty = parseFloat(sheet.produced_qty || 0);
        const requiredQty = parseFloat(sheet.required_qty || 0);
        
        if (producedQty >= requiredQty) {
          readyForExport = true;
          readyDate = new Date();
          newStatus = 'Ready For Export';
        }
      } else {
        newStatus = 'QC Pending'; // Or some rejection state
      }

      await client.query(
        `UPDATE production_sheets SET 
          qc_status = $1, 
          status = $2,
          ready_for_export = $3,
          ready_date = $4,
          updated_at = NOW()
         WHERE id = $5`,
        [decision, newStatus, readyForExport, readyDate, id]
      );

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          companyId, req.user?.id, 'QC_INSPECTION', 'production_sheets', id,
          JSON.stringify({ decision, comments, new_status: newStatus }),
          req.ip
        ]
      );

      await client.query('COMMIT');
      res.json(successResponse({ status: newStatus, ready_for_export: readyForExport }, 'QC Inspection saved successfully'));
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
