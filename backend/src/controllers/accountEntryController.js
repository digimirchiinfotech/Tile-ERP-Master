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
  paginationResponse,
  getFirstRow
} from '../utils/helpers.js';
import { generateDocumentNumber } from '../utils/documentNumberGenerator.js';

export const getAll = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      entry_type,
      status,
      payment_method,
      date_from,
      date_to
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      conditions.push(`company_id = $${paramCount}`);
      values.push(req.companyFilter);
      paramCount++;
    }

    if (search) {
      conditions.push(`(entry_no ILIKE $${paramCount} OR party_name ILIKE $${paramCount} OR invoice_ref ILIKE $${paramCount} OR po_ref ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (entry_type) {
      conditions.push(`entry_type = $${paramCount}`);
      values.push(entry_type);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (payment_method) {
      conditions.push(`payment_method = $${paramCount}`);
      values.push(payment_method);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`date >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`date <= $${paramCount}`);
      values.push(date_to);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM account_entries ${whereClause}`,
      values
    );
    const countRow = getFirstRow(countResult);
    const total = parseInt(countRow?.count || 0);

    const result = await req.db.query(
      `SELECT * FROM account_entries 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Account entries retrieved successfully'
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
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM account_entries ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Account entry not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Account entry retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      date, 
      entry_type, type,
      party_name, partyName,
      amount, 
      payment_method, payment_mode, paymentMode,
      invoice_ref, invoice_no, invoiceNo,
      po_ref, poRef,
      status = 'Pending', 
      due_date, dueDate,
      notes, remarks
    } = req.body;

    const resolvedEntryType = entry_type || type;
    const resolvedPartyName = party_name || partyName;
    const resolvedPaymentMethod = payment_method || payment_mode || paymentMode;
    const resolvedInvoiceRef = invoice_ref || invoice_no || invoiceNo;
    const resolvedPoRef = po_ref || poRef;
    const resolvedDueDate = due_date || dueDate;
    const resolvedNotes = notes || remarks;

    const companyId = req.user.role === 'super_admin' && req.body.company_id 
      ? req.body.company_id 
      : req.user.companyId;

    const documentNumber = await generateDocumentNumber('ACC', companyId, req.db);
    const entryNo = documentNumber.baseNumber;

    const result = await req.db.query(
      `INSERT INTO account_entries 
       (company_id, entry_no, date, entry_type, party_name, amount, payment_method,
        invoice_ref, po_ref, status, due_date, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, entryNo, date, resolvedEntryType, resolvedPartyName, amount,
        resolvedPaymentMethod || null, resolvedInvoiceRef || null, resolvedPoRef || null,
        status, resolvedDueDate || null, resolvedNotes || null, req.user.id
      ]
    );

    return successResponse(
      res,
      result.rows[0],
      'Account entry created successfully',
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
      date, 
      entry_type, type,
      party_name, partyName,
      amount, 
      payment_method, payment_mode, paymentMode,
      invoice_ref, invoice_no, invoiceNo,
      po_ref, poRef,
      status, 
      due_date, dueDate,
      notes, remarks
    } = req.body;

    const resolvedEntryType = entry_type !== undefined ? entry_type : type;
    const resolvedPartyName = party_name !== undefined ? party_name : partyName;
    const resolvedPaymentMethod = payment_method !== undefined ? payment_method : (payment_mode !== undefined ? payment_mode : paymentMode);
    const resolvedInvoiceRef = invoice_ref !== undefined ? invoice_ref : (invoice_no !== undefined ? invoice_no : invoiceNo);
    const resolvedPoRef = po_ref !== undefined ? po_ref : poRef;
    const resolvedDueDate = due_date !== undefined ? due_date : dueDate;
    const resolvedNotes = notes !== undefined ? notes : remarks;

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        checkParams.push(req.companyFilter);
      }
    }

    const existingEntry = await req.db.query(
      `SELECT id FROM account_entries ${whereConditions}`,
      checkParams
    );

    if (existingEntry.rows.length === 0) {
      return next(new AppError('Account entry not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (date !== undefined) {
      updates.push(`date = $${paramCount}`);
      values.push(date);
      paramCount++;
    }

    if (resolvedEntryType !== undefined) {
      updates.push(`entry_type = $${paramCount}`);
      values.push(resolvedEntryType);
      paramCount++;
    }

    if (resolvedPartyName !== undefined) {
      updates.push(`party_name = $${paramCount}`);
      values.push(resolvedPartyName);
      paramCount++;
    }

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`);
      values.push(amount);
      paramCount++;
    }

    if (resolvedPaymentMethod !== undefined) {
      updates.push(`payment_method = $${paramCount}`);
      values.push(resolvedPaymentMethod);
      paramCount++;
    }

    if (resolvedInvoiceRef !== undefined) {
      updates.push(`invoice_ref = $${paramCount}`);
      values.push(resolvedInvoiceRef);
      paramCount++;
    }

    if (resolvedPoRef !== undefined) {
      updates.push(`po_ref = $${paramCount}`);
      values.push(resolvedPoRef);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (due_date !== undefined) {
      updates.push(`due_date = $${paramCount}`);
      values.push(due_date);
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
      `UPDATE account_entries 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    return successResponse(
      res,
      result.rows[0],
      'Account entry updated successfully'
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
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingEntry = await req.db.query(
      `SELECT id FROM account_entries ${whereConditions}`,
      queryParams
    );

    if (existingEntry.rows.length === 0) {
      return next(new AppError('Account entry not found', 404));
    }

    const result = await req.db.query(
      `DELETE FROM account_entries ${whereConditions} RETURNING id, entry_no`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Account entry deleted successfully'
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
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingEntry = await req.db.query(
      `SELECT id, entry_no FROM account_entries ${whereConditions}`,
      queryParams
    );

    if (existingEntry.rows.length === 0) {
      return next(new AppError('Account Entry not found', 404));
    }

    await req.db.query(
      `DELETE FROM account_entries ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingEntry.rows[0].id, entry_no: existingEntry.rows[0].entry_no },
      'Account Entry permanently deleted'
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

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingEntry = await req.db.query(
      `SELECT id, status FROM account_entries ${whereConditions}`,
      queryParams
    );

    if (existingEntry.rows.length === 0) {
      return next(new AppError('Account Entry not found', 404));
    }

    const currentStatus = existingEntry.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE account_entries 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `Account Entry status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const getInvoicesByPartyName = async (req, res, next) => {
  try {
    const { partyName } = req.query;

    if (!partyName) {
      return next(new AppError('Party name is required', 400));
    }

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`inv.company_id IS NULL`);
      } else {
        conditions.push(`inv.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    conditions.push(`(TRIM(c.name) ILIKE $\${paramCount} OR TRIM(inv.client_name) ILIKE $\${paramCount} OR TRIM(inv.party_name) ILIKE $\${paramCount})`);
    values.push(`%${partyName.trim()}%`);
    paramCount++;
    
    // Only fetch finalized/locked invoices
    conditions.push('inv.is_locked = true');

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = `
       (SELECT inv.id, inv.invoice_no, CAST(inv.invoice_date AS TEXT) as date, CAST(inv.total_amount AS NUMERIC) as total_amount, 'Export' as type 
        FROM export_invoices inv
        LEFT JOIN clients c ON inv.client_id = c.id
        ${whereClause}
       )
       UNION ALL
       (SELECT inv.id, inv.invoice_no, CAST(inv.date AS TEXT) as date, CAST(inv.total_amount AS NUMERIC) as total_amount, 'Proforma' as type 
        FROM proforma_invoices inv
        LEFT JOIN clients c ON inv.client_id = c.id
        ${whereClause}
       )
       ORDER BY date DESC`;

    const result = await req.db.query(sql, values);

    return successResponse(
      res,
      result.rows,
      'Invoices retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};
export const getSummary = async (req, res, next) => {
  try {
    let whereClause = '';
    let values = [];
    
    if (Object.hasOwn(req, 'companyFilter')) {
      whereClause = 'WHERE company_id = $1';
      values.push(req.companyFilter);
    }

    const statsResult = await req.db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'Receivable' THEN amount ELSE 0 END), 0) as total_receivables,
        COALESCE(SUM(CASE WHEN entry_type = 'Payable' THEN amount ELSE 0 END), 0) as total_payables,
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count
       FROM account_entries 
       ${whereClause}`,
      values
    );

    const stats = statsResult.rows[0];

    return successResponse(
      res,
      {
        totalReceivables: parseFloat(stats.total_receivables),
        totalPayables: parseFloat(stats.total_payables),
        paidInvoices: parseInt(stats.paid_count),
        overdueInvoices: parseInt(stats.overdue_count),
        upcomingDues: parseInt(stats.pending_count)
      },
      'Account summary retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};
