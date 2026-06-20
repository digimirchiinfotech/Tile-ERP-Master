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
import { generateDocumentNumber, previewDocumentNumber } from '../utils/documentNumberGenerator.js';

import { notifyQCFailed, notifyQCCompleted } from '../services/notificationService.js';
import { debugLogger } from '../utils/debugLogger.js';

/**
 * ensureQCBoxTypeColumn is now a no-op.
 * The box_type column is guaranteed to exist via migration:
 * 20260620_qc_schema_hardening.sql
 * Kept as a stub to avoid breaking callers during transition.
 */
const ensureQCBoxTypeColumn = async (_queryFn) => {
  // No-op: column guaranteed by migration
};

const pickBoxTypeFromLines = (productLines = []) => {
  const lines = Array.isArray(productLines) ? productLines : [];
  for (const line of lines) {
    const value = line?.boxType || line?.box_type;
    if (value && value !== 'N/A') return value;
  }
  return null;
};

const enrichProductLinesWithBoxType = (productLines = [], boxType) => {
  if (!boxType || boxType === 'N/A') return productLines;
  const lines = Array.isArray(productLines) ? productLines : [];
  return lines.map((line) => {
    const current = line?.boxType || line?.box_type;
    if (current && current !== 'N/A') return line;
    return { ...line, boxType, box_type: boxType };
  });
};

const resolveBoxTypeFromOrder = async (db, companyId, orderNumber) => {
  if (!orderNumber) return null;
  try {
    const params = [orderNumber];
    let companyClause = '';
    if (companyId) {
      companyClause = ' AND (os.company_id = $2 OR $2 IS NULL)';
      params.push(companyId);
    }
    const { rows } = await db.query(
      `SELECT po.box_type
       FROM master_order_sheets os
       JOIN proforma_orders po ON po.id = os.proforma_order_id
       WHERE (os.production_sheet_no = $1 OR os.po_no = $1 OR os.pi_reference = $1)
       ${companyClause}
       ORDER BY os.created_at DESC
       LIMIT 1`,
      params
    );
    return rows[0]?.box_type || null;
  } catch (err) {
    debugLogger.warn('QCRecordController', 'resolveBoxTypeFromOrder failed', { error: err.message });
    return null;
  }
};

const hydrateQCRecord = async (db, companyId, record) => {
  if (!record) return record;
  let productLines = record.product_lines;
  if (typeof productLines === 'string') {
    try {
      productLines = JSON.parse(productLines);
    } catch {
      productLines = [];
    }
  }
  if (!Array.isArray(productLines)) productLines = [];

  let boxType = record.box_type || pickBoxTypeFromLines(productLines);
  if (!boxType || boxType === 'N/A') {
    boxType = await resolveBoxTypeFromOrder(db, companyId ?? record.company_id, record.order_number);
  }

  if (boxType && boxType !== 'N/A') {
    record.box_type = boxType;
    record.product_lines = enrichProductLinesWithBoxType(productLines, boxType);
  } else {
    record.product_lines = productLines;
  }

  return record;
};

export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.user.role === 'super_admin' && req.query.company_id 
      ? req.query.company_id 
      : req.user.companyId;

    if (!companyId) {
      return successResponse(res, { qcId: '' }, 'Company context missing');
    }

    const preview = await previewDocumentNumber('QC', companyId, req.db);
    return successResponse(res, { qcId: preview.displayNumber }, 'Next QC ID retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }
    
    const fileUrl = req.file.location || `/uploads/${req.file.filename}`;
    return successResponse(
      res,
      {
        url: fileUrl,
        filename: req.file.filename || req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        name: req.file.originalname
      },
      'File uploaded successfully',
      200
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
      search, 
      qc_status,
      overall_grade,
      inspector,
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

    // SECURITY: QC Inspector can only see their own QC records
    if (req.user.role === 'qc_inspector') {
      conditions.push(`created_by = $${paramCount}`);
      values.push(req.user.id);
      paramCount++;
    }

    if (search) {
      conditions.push(`(qc_id ILIKE $${paramCount} OR order_number ILIKE $${paramCount} OR client_name ILIKE $${paramCount} OR product_name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (qc_status) {
      conditions.push(`qc_status = $${paramCount}`);
      values.push(qc_status);
      paramCount++;
    }

    if (overall_grade) {
      conditions.push(`overall_grade = $${paramCount}`);
      values.push(overall_grade);
      paramCount++;
    }


    if (date_from) {
      conditions.push(`qc_date >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`qc_date <= $${paramCount}`);
      values.push(date_to);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM qc_records ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    await ensureQCBoxTypeColumn(req.db.query);

    const result = await req.db.query(
      `SELECT * FROM qc_records 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    const companyId = Object.hasOwn(req, 'companyFilter') ? req.companyFilter : null;
    const hydratedRows = await Promise.all(
      result.rows.map((row) => hydrateQCRecord(req.db, companyId, { ...row }))
    );

    return successResponse(
      res,
      paginationResponse(hydratedRows, total, page, limit),
      'QC records retrieved successfully'
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
      `SELECT * FROM qc_records ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('QC record not found', 404));
    }

    await ensureQCBoxTypeColumn(req.db.query);
    const companyId = Object.hasOwn(req, 'companyFilter') ? req.companyFilter : null;
    const hydrated = await hydrateQCRecord(req.db, companyId, { ...result.rows[0] });

    return successResponse(
      res,
      hydrated,
      'QC record retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

const saveQCItems = async (client, qcRecordId, companyId, orderId, orderNumber, inspectionDetails, overallGrade) => {
  // 1. Resolve Export Invoice ID
  let exportInvoiceId = null;
  if (orderId) {
    const eiRes = await client.query(
      `SELECT ei.id FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       WHERE (pi.proforma_order_id = $1 OR ei.proforma_invoice_id = $1 OR ei.id = $1) AND ei.company_id = $2
       LIMIT 1`,
      [orderId, companyId]
    );
    if (eiRes.rows.length > 0) {
      exportInvoiceId = eiRes.rows[0].id;
    }
  }
  if (!exportInvoiceId && orderNumber) {
    const eiRes = await client.query(
      `SELECT ei.id FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       LEFT JOIN proforma_orders po ON pi.proforma_order_id = po.id
       WHERE (po.order_no = $1 OR pi.invoice_no = $1 OR ei.invoice_no = $1) AND ei.company_id = $2
       LIMIT 1`,
      [orderNumber, companyId]
    );
    if (eiRes.rows.length > 0) {
      exportInvoiceId = eiRes.rows[0].id;
    }
  }

  // 2. Fetch Export Invoice Items
  let invoiceItems = [];
  if (exportInvoiceId) {
    const itemsRes = await client.query(
      `SELECT id, product_id FROM export_invoice_items WHERE export_invoice_id = $1 AND company_id = $2`,
      [exportInvoiceId, companyId]
    );
    invoiceItems = itemsRes.rows;
  }

  // If no export invoice items exist for this order/invoice, skip QC item insertion.
  // DO NOT fall back to a random item — that would corrupt quality traceability
  // by linking QC results to a completely unrelated product/invoice.
  if (invoiceItems.length === 0) {
    debugLogger.warn('QCRecordController', 'saveQCItems: No matching export invoice items found', {
      qcRecordId, orderId, orderNumber, companyId
    });
    return;
  }

  const exportInvoiceItemId = invoiceItems[0].id;

  // 3. Prepare parameters to insert
  const params = [];
  if (inspectionDetails) {
    if (inspectionDetails.dimensionalCheck) {
      params.push({
        name: 'Dimensional Check',
        expected: 'Pass',
        actual: inspectionDetails.dimensionalCheck,
        status: ['Pass', 'Minor Issues'].includes(inspectionDetails.dimensionalCheck) ? 'PASS' : 'FAIL'
      });
    }
    if (inspectionDetails.surfaceQuality) {
      params.push({
        name: 'Surface Quality',
        expected: 'Good/Excellent',
        actual: inspectionDetails.surfaceQuality,
        status: ['Excellent', 'Good', 'Average'].includes(inspectionDetails.surfaceQuality) ? 'PASS' : 'FAIL'
      });
    }
    if (inspectionDetails.colorConsistency) {
      params.push({
        name: 'Color Consistency',
        expected: 'Consistent',
        actual: inspectionDetails.colorConsistency,
        status: ['Consistent', 'Minor Variation'].includes(inspectionDetails.colorConsistency) ? 'PASS' : 'FAIL'
      });
    }
    if (inspectionDetails.packagingCondition) {
      params.push({
        name: 'Packaging Condition',
        expected: 'Good/Excellent',
        actual: inspectionDetails.packagingCondition,
        status: ['Excellent', 'Good'].includes(inspectionDetails.packagingCondition) ? 'PASS' : 'FAIL'
      });
    }
  }
  if (overallGrade) {
    params.push({
      name: 'Overall Grade',
      expected: 'A/A+',
      actual: overallGrade,
      status: ['A+', 'A', 'B+', 'B', 'C'].includes(overallGrade) ? 'PASS' : 'FAIL'
    });
  }

  // Delete old qc_items first
  await client.query(`DELETE FROM qc_items WHERE qc_record_id = $1`, [qcRecordId]);

  // Insert new qc_items
  if (params.length > 0) {
    const valueStrings = [];
    const queryParams = [];
    let paramCounter = 1;
    for (const p of params) {
      valueStrings.push(`($${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++})`);
      queryParams.push(companyId, qcRecordId, exportInvoiceItemId, p.name, p.expected, p.actual, p.status);
    }
    const query = `
      INSERT INTO qc_items (company_id, qc_record_id, export_invoice_item_id, parameter_name, expected_value, actual_value, status)
      VALUES ${valueStrings.join(', ')}
    `;
    await client.query(query, queryParams);
  }
};

export const create = async (req, res, next) => {
  let client;
  try {
    // Schema columns (box_type, order_sheet_id) and FK constraint changes are
    // now handled by migration 20260620_qc_schema_hardening.sql at startup.
    // Runtime ALTER TABLE calls removed to prevent ACCESS EXCLUSIVE locks.

    const {
      order_id, order_number, client_name, product_name, qc_date,
      qc_status = 'Pending', inspectorId, inspector_id, inspection_details = {}, inspection_media = {},
      overall_grade, notes, product_lines = [], box_type, boxType
    } = req.body;

    const finalInspectorId = inspector_id || inspectorId;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    const documentNumber = await generateDocumentNumber('QC', companyId, req.db);
    const qcId = documentNumber.baseNumber;

    client = await req.db.getClient();
    await client.query('BEGIN');

    // Final safety check for uniqueness
    const duplicateCheck = await client.query(
      'SELECT id FROM qc_records WHERE qc_id = $1 AND company_id = $2',
      [qcId, companyId]
    );
    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return next(new AppError(`Generated QC ID ${qcId} already exists. Please try again.`, 409));
    }

    let resolvedBoxType = box_type || boxType || pickBoxTypeFromLines(product_lines);
    if (!resolvedBoxType || resolvedBoxType === 'N/A') {
      resolvedBoxType = await resolveBoxTypeFromOrder(client, companyId, order_number);
    }
    const enrichedLines = enrichProductLinesWithBoxType(product_lines, resolvedBoxType);

    const result = await client.query(
      `INSERT INTO qc_records 
       (company_id, qc_id, order_id, order_sheet_id, order_number, client_name, product_name,
        qc_date, qc_status, inspector_id, inspection_details, inspection_media, overall_grade,
        notes, product_lines, box_type, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, qcId, order_id || null, order_id || null, order_number || null,
        client_name || null, product_name || null, qc_date, qc_status, finalInspectorId || null,
        JSON.stringify(inspection_details), JSON.stringify(inspection_media),
        overall_grade || null, notes || null,
        JSON.stringify(enrichedLines), resolvedBoxType || null, req.user.id
      ]
    );

    const qcRecordId = result.rows[0].id;
    await saveQCItems(client, qcRecordId, companyId, order_id, order_number, inspection_details, overall_grade);

    if (order_id) {
      const dbStatus = qc_status === 'Passed' ? 'Passed' : (qc_status === 'Failed' ? 'Failed' : 'Pending');
      // Update legacy order_sheets
      client.query(
        `UPDATE order_sheets SET qc_status = $1, qc_date = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3`,
        [dbStatus, order_id, companyId]
      ).catch(() => {});
      
      // Update new master_order_sheet_lines
      client.query(
        `UPDATE master_order_sheet_lines SET qc_status = $1, updated_at = CURRENT_TIMESTAMP WHERE master_order_sheet_id = $2 AND company_id = $3`,
        [dbStatus, order_id, companyId]
      ).catch(() => {});
    }

    await client.query('COMMIT');

    return successResponse(
      res,
      result.rows[0],
      'QC record created successfully',
      201
    );
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const update = async (req, res, next) => {
  let client;
  try {
    // Schema columns (box_type, order_sheet_id) and FK constraint changes are
    // now handled by migration 20260620_qc_schema_hardening.sql at startup.
    // Runtime ALTER TABLE calls removed to prevent ACCESS EXCLUSIVE locks.

    const { id } = req.params;
    const {
      order_id, order_number, client_name, product_name, qc_date, qc_status, inspectorId, inspector_id,
      inspection_details, inspection_media, overall_grade, notes, product_lines, box_type, boxType
    } = req.body;

    const finalInspectorId = inspector_id !== undefined ? inspector_id : inspectorId;
    await ensureQCBoxTypeColumn(req.db.query);

    client = await req.db.getClient();
    await client.query('BEGIN');

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

    const existingRecord = await client.query(
      `SELECT id FROM qc_records ${whereConditions}`,
      checkParams
    );

    if (existingRecord.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('QC record not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (order_id !== undefined) {
      updates.push(`order_id = $${paramCount}`);
      values.push(order_id);
      paramCount++;
      updates.push(`order_sheet_id = $${paramCount}`);
      values.push(order_id);
      paramCount++;
    }

    if (order_number !== undefined) {
      updates.push(`order_number = $${paramCount}`);
      values.push(order_number);
      paramCount++;
    }

    if (client_name !== undefined) {
      updates.push(`client_name = $${paramCount}`);
      values.push(client_name);
      paramCount++;
    }

    if (product_name !== undefined) {
      updates.push(`product_name = $${paramCount}`);
      values.push(product_name);
      paramCount++;
    }

    if (qc_date !== undefined) {
      updates.push(`qc_date = $${paramCount}`);
      values.push(qc_date);
      paramCount++;
    }

    if (qc_status !== undefined) {
      updates.push(`qc_status = $${paramCount}`);
      values.push(qc_status);
      paramCount++;
    }

    if (finalInspectorId !== undefined) {
      updates.push(`inspector_id = $${paramCount}`);
      values.push(finalInspectorId || null);
      paramCount++;
    }

    if (inspection_details !== undefined) {
      updates.push(`inspection_details = $${paramCount}`);
      values.push(JSON.stringify(inspection_details));
      paramCount++;
    }

    if (inspection_media !== undefined) {
      updates.push(`inspection_media = $${paramCount}`);
      values.push(JSON.stringify(inspection_media));
      paramCount++;
    }

    if (overall_grade !== undefined) {
      updates.push(`overall_grade = $${paramCount}`);
      values.push(overall_grade);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    let linesToSave = product_lines;
    if (product_lines !== undefined) {
      const companyId = Object.hasOwn(req, 'companyFilter') ? req.companyFilter : null;
      let resolvedBoxType = box_type || boxType || pickBoxTypeFromLines(product_lines);
      if (!resolvedBoxType || resolvedBoxType === 'N/A') {
        const orderNum = order_number !== undefined
          ? order_number
          : (await client.query(`SELECT order_number FROM qc_records WHERE id = $1`, [id])).rows[0]?.order_number;
        resolvedBoxType = await resolveBoxTypeFromOrder(client, companyId, orderNum);
      }
      if (resolvedBoxType) {
        linesToSave = enrichProductLinesWithBoxType(product_lines, resolvedBoxType);
        updates.push(`box_type = $${paramCount}`);
        values.push(resolvedBoxType);
        paramCount++;
      }
      updates.push(`product_lines = $${paramCount}`);
      values.push(JSON.stringify(linesToSave));
      paramCount++;
    } else if (box_type !== undefined || boxType !== undefined) {
      updates.push(`box_type = $${paramCount}`);
      values.push(box_type || boxType || null);
      paramCount++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
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

    const result = await client.query(
      `UPDATE qc_records 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    const finalRecord = result.rows[0];
    if (finalRecord) {
      await saveQCItems(
        client,
        id,
        finalRecord.company_id,
        finalRecord.order_id,
        finalRecord.order_number,
        finalRecord.inspection_details,
        finalRecord.overall_grade
      );
    }

    await client.query('COMMIT');

    // Trigger notification if QC status changed to Failed
    if (qc_status !== undefined && finalRecord) {
      try {
        if (finalRecord.order_id || finalRecord.order_sheet_id) {
          const sheetId = finalRecord.order_sheet_id || finalRecord.order_id;
          const dbStatus = qc_status === 'Passed' ? 'Passed' : (qc_status === 'Failed' ? 'Failed' : 'Pending');
          
          // Legacy update
          await req.db.query(
            `UPDATE order_sheets SET qc_status = $1, qc_date = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3`,
            [dbStatus, sheetId, finalRecord.company_id]
          ).catch(() => {});
          
          // Master Order Sheet Lines update
          await req.db.query(
            `UPDATE master_order_sheet_lines SET qc_status = $1, updated_at = CURRENT_TIMESTAMP WHERE master_order_sheet_id = $2 AND company_id = $3`,
            [dbStatus, sheetId, finalRecord.company_id]
          ).catch(() => {});
        }

        if (qc_status === 'Failed') {
          notifyQCFailed(req.companyFilter || finalRecord.company_id, finalRecord, notes || 'See QC record for details', req.db);
        } else if (qc_status === 'Passed') {
          notifyQCCompleted(req.companyFilter || finalRecord.company_id, finalRecord, req.db);
        }
      } catch (err) {
        // Don't block QC update if notification fails
      }
    }

    return successResponse(
      res,
      finalRecord,
      'QC record updated successfully'
    );
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const remove = async (req, res, next) => {
  let client;
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

    client = await req.db.getClient();
    await client.query('BEGIN');

    const existingRecord = await client.query(
      `SELECT id FROM qc_records ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('QC record not found', 404));
    }

    const result = await client.query(
      `DELETE FROM qc_records ${whereConditions} RETURNING id, qc_id`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      result.rows[0],
      'QC record deleted successfully'
    );
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const hardDelete = async (req, res, next) => {
  let client;
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

    client = await req.db.getClient();
    await client.query('BEGIN');

    const existingRecord = await client.query(
      `SELECT id, qc_id FROM qc_records ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('QC Record not found', 404));
    }

    await client.query(
      `DELETE FROM qc_records ${whereConditions}`,
      queryParams
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      { id: existingRecord.rows[0].id, qc_id: existingRecord.rows[0].qc_id },
      'QC Record permanently deleted'
    );
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    if (client) client.release();
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

    const existingRecord = await req.db.query(
      `SELECT id, qc_status FROM qc_records ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('QC Record not found', 404));
    }

    const currentStatus = existingRecord.rows[0].qc_status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE qc_records 
       SET qc_status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `QC Record status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return next(new AppError('Status is required', 400));
    }

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

    const existingRecord = await req.db.query(
      `SELECT id, qc_status, order_id, company_id FROM qc_records ${whereConditions}`,
      queryParams
    );

    if (existingRecord.rows.length === 0) {
      return next(new AppError('QC Record not found', 404));
    }

    const qcRecord = existingRecord.rows[0];

    queryParams.push(status);
    const result = await req.db.query(
      `UPDATE qc_records 
       SET qc_status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    // Sync order status if needed
    if ((qcRecord.order_id || qcRecord.order_sheet_id) && (status === 'Finalized' || status === 'Rejected')) {
      try {
        const sheetId = qcRecord.order_sheet_id || qcRecord.order_id;
        const dbStatus = status === 'Finalized' ? 'Passed' : 'Failed';
        
        // Legacy
        await req.db.query(
          `UPDATE order_sheets SET qc_status = $1, qc_date = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3`,
          [dbStatus, sheetId, qcRecord.company_id]
        ).catch(() => {});
        
        // Master Order Sheet Lines
        await req.db.query(
          `UPDATE master_order_sheet_lines SET qc_status = $1, updated_at = CURRENT_TIMESTAMP WHERE master_order_sheet_id = $2 AND company_id = $3`,
          [dbStatus, sheetId, qcRecord.company_id]
        ).catch(() => {});
      } catch (err) {}
    }

    return successResponse(
      res,
      result.rows[0],
      `QC Record status updated to ${status}`
    );
  } catch (error) {
    next(error);
  }
};
