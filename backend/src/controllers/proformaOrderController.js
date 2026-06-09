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
import { enrichWithSnapshot } from '../services/documentSnapshotService.js';
import { logAction } from '../services/auditService.js';
import { 
  successResponse, 
  getPagination, 
  paginationResponse 
} from '../utils/helpers.js';
import { generateDocumentNumber, previewDocumentNumber, formatDisplayNumber } from '../utils/documentNumberGenerator.js';
import { validateUUID } from '../utils/validators.js';
import { notifyOrderStatusChange, notifyRoles } from '../services/notificationService.js';

const parseProductId = (id) => {
  if (!id) return null;
  const strId = String(id);
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
  return uuidRegex.test(strId) ? strId : null;
};

let ensuredSchemas = new Set();

const ensureSchemaExists = async (queryFn, companyId) => {
  const cacheKey = companyId || 'global';
  if (ensuredSchemas.has(cacheKey)) return;
  try {
    const poColumns = [
      { name: 'pallet_type', type: 'TEXT' },
      { name: 'tiles_back', type: 'TEXT' },
      { name: 'boxes_marking', type: 'TEXT' },
      { name: 'box_type', type: 'TEXT' },
      { name: 'gst_rate', type: 'NUMERIC(5, 2) DEFAULT 0' },
      { name: 'gst_amount', type: 'NUMERIC(15, 2) DEFAULT 0' },
      { name: 'currency', type: 'VARCHAR(50) DEFAULT \'INR (₹)\'' },
      { name: 'lc_lumber', type: 'VARCHAR(255)' },
      { name: 'lc_date', type: 'DATE' },
      { name: 'epcg_no', type: 'VARCHAR(255)' }
    ];

    for (const col of poColumns) {
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'proforma_orders' 
          AND column_name = $1
        );
      `;
      const { rows } = await queryFn(checkQuery, [col.name]);
      if (!rows[0].exists) {
        await queryFn(`ALTER TABLE proforma_orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      }
    }

    const polColumns = [
      { name: 'product_type', type: "VARCHAR(50) DEFAULT 'tile'" },
      { name: 'sanitaryware_product_id', type: 'UUID' },
      { name: 'model_no', type: 'VARCHAR(255)' },
      { name: 'category', type: 'VARCHAR(255)' },
      { name: 'color', type: 'VARCHAR(255)' },
      { name: 'pieces', type: 'INTEGER DEFAULT 0' },
      { name: 'cartons', type: 'INTEGER DEFAULT 0' },
      { name: 'cbm', type: 'NUMERIC(15, 4) DEFAULT 0' },
      { name: 'is_foc', type: 'BOOLEAN DEFAULT false' }
    ];

    for (const col of polColumns) {
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'proforma_order_lines' 
          AND column_name = $1
        );
      `;
      const { rows } = await queryFn(checkQuery, [col.name]);
      if (!rows[0].exists) {
        await queryFn(`ALTER TABLE proforma_order_lines ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      }
    }

    // Ensure type TEXT
    await queryFn(`
      ALTER TABLE proforma_orders 
        ALTER COLUMN pallet_type TYPE TEXT,
        ALTER COLUMN tiles_back TYPE TEXT,
        ALTER COLUMN boxes_marking TYPE TEXT,
        ALTER COLUMN box_type TYPE TEXT;
    `);
    
    ensuredSchemas.add(cacheKey);
  } catch (err) {
    debugLogger.error('[Proforma Order Schema Self-Healing] Error ensuring schema columns exist:', err.message);
  }
};

export const getAll = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);
    const { 
      page = 1, 
      limit = 50, 
      search, 
      status,
      qc_status,
      supplier_id,
      date_from,
      date_to,
      exclude_revised
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`po.company_id IS NULL`);
      } else {
        conditions.push(`po.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(po.order_no ILIKE $${paramCount} OR po.supplier_name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`po.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (qc_status) {
      conditions.push(`po.qc_status = $${paramCount}`);
      values.push(qc_status);
      paramCount++;
    }

    if (supplier_id) {
      conditions.push(`po.supplier_id = $${paramCount}`);
      values.push(supplier_id);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`po.date >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`po.date <= $${paramCount}`);
      values.push(date_to);
      paramCount++;
    }

    // Exclude historical/revised records from dropdowns & selectors
    if (exclude_revised === 'true' || exclude_revised === '1') {
      conditions.push(`COALESCE(po.status, 'Draft') != 'Revised'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM proforma_orders po ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    if (total === 0) {
      return successResponse(res, paginationResponse([], 0, page, limit), 'No proforma orders found');
    }

    const result = await req.db.query(
      `SELECT po.*, 
              s.name as supplier_name_ref, s.email_id as supplier_email, s.contact_number as supplier_phone,
              pi.invoice_no as pi_reference, pi.total_amount as pi_amount, pi.status as pi_status,
              pi.client_name as pi_client
       FROM proforma_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN proforma_invoices pi ON po.invoice_ref = pi.invoice_no
       ${whereClause}
       ORDER BY po.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Proforma orders retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);
    const { id } = req.params;

    const idValidation = validateUUID(id, 'Order ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

    let whereConditions = 'WHERE po.id = $1';
    let queryParams = [id];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND po.company_id IS NULL';
      } else {
        whereConditions += ' AND po.company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT po.*, 
              s.name as supplier_name_ref, s.email_id as supplier_email, s.contact_number as supplier_phone,
              s.address as supplier_address, s.city as supplier_city, s.country as supplier_country,
              s.gstn as supplier_gstn, s.contact_person_name as supplier_contact_person,
              pi.invoice_no as pi_reference, pi.total_amount as pi_amount, pi.status as pi_status,
              pi.date as pi_date, pi.client_name as pi_client
       FROM proforma_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN proforma_invoices pi ON po.invoice_ref = pi.invoice_no
       ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Proforma order not found', 404));
    }

    const order = result.rows[0];

    // Priority: Return immutable frozen snapshot if document is locked
    if (order.is_locked && order.snapshot_data) {
      const frozenOrder = enrichWithSnapshot(order, 'PO');
      return successResponse(
        res,
        frozenOrder,
        'Proforma order retrieved successfully (LOCKED)'
      );
    }
    
    // Fetch lines
    const linesRes = await req.db.query(
      `SELECT * FROM proforma_order_lines WHERE proforma_order_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    order.lines = linesRes.rows || [];

    // Fetch company details from global DB
    let companyInfo = null;
    if (order.company_id) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT * FROM companies WHERE id = $1',
          [order.company_id]
        );
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            ...c,
            bank_details: {
              bank_name: c.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
              account_name: c.account_holder_name || (settings.bank_details && settings.bank_details.account_name) || '',
              account_no: c.account_number || (settings.bank_details && settings.bank_details.account_no) || '',
              swift_code: c.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
              bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
            }
          };
        }
      } catch (err) {
        debugLogger.error('Error fetching company info for PO:', err.message);
      }
    }

    // Construct supplier details if missing
    if (!order.supplier_details && order.supplier_name_ref) {
      const lines = [
        order.supplier_name_ref,
        order.supplier_address || '',
        [order.supplier_city, order.supplier_country].filter(Boolean).join(', '),
        order.supplier_gstn ? `GSTIN: ${order.supplier_gstn}` : '',
        order.supplier_contact_person ? `Contact: ${order.supplier_contact_person}` : '',
        order.supplier_phone ? `Phone: ${order.supplier_phone}` : '',
        order.supplier_email ? `E-mail: ${order.supplier_email}` : ''
      ].filter(line => line && line.trim() !== '');
      order.supplier_details = lines.join('\n');
    }

    // Map snake_case to camelCase for frontend compatibility if needed
    order.supplierDetails = order.supplier_details;

    return successResponse(
      res,
      { ...order, company_info: companyInfo },
      'Proforma order retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};
export const create = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);

    const {
      date, supplier_id, supplier_name, invoice_ref, tariff_code, subtotal = 0,
      total_amount = 0, gst_rate = 0, gst_amount = 0, status = 'Draft', qc_status = 'Not Ready',
      production_start_date, production_end_date, expected_delivery,
      pallets, notes, product_lines = [],
      pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
      country, port_of_loading, port_of_discharge, final_destination,
      payment_terms, delivery_schedule, currency,
      lc_lumber, lc_date, epcg_no
    } = req.body;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    // Generate PO number in format: PO/MM/YY/SSS
    const documentNumber = await generateDocumentNumber('PO', companyId, req.db, new Date(date));

    // Sanitize supplier_id: convert empty strings to null, keep valid UUIDs
    const sanitizedSupplierId = (supplier_id && typeof supplier_id === 'string' && supplier_id.trim()) ? supplier_id.trim() : null;

    // Ensure product_lines is properly formatted as JSON array
    let productLinesJSON = [];
    if (product_lines) {
      if (typeof product_lines === 'string') {
        try {
          productLinesJSON = JSON.parse(product_lines);
        } catch (e) {
          return next(new AppError('Invalid product_lines format. Must be valid JSON array.', 400));
        }
      } else if (Array.isArray(product_lines)) {
        productLinesJSON = product_lines;
      } else {
        productLinesJSON = [];
      }
    }

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO proforma_orders 
        (company_id, order_no, date, supplier_id, supplier_name, invoice_ref, tariff_code,
          subtotal, total_amount, gst_rate, gst_amount, status, qc_status, production_start_date,
          production_end_date, expected_delivery, pallets, notes, product_lines,
          pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
          country, port_of_loading, port_of_discharge, final_destination,
          payment_terms, delivery_schedule, currency,
          lc_lumber, lc_date, epcg_no,
          created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          companyId, documentNumber.baseNumber, date, sanitizedSupplierId, supplier_name,
          invoice_ref || null, tariff_code || null, subtotal, total_amount, gst_rate, gst_amount, status, qc_status,
          production_start_date || null, production_end_date || null,
          expected_delivery || null, pallets || null, notes || null,
          JSON.stringify(productLinesJSON),
          pallet_type || 'Normal Wooden Pallet', tiles_back || 'WITH MADE IN INDIA',
          boxes_marking || 'WITH', box_type || 'NON BRANDED BOXES',
          fumigation || 'YES', legalisation || 'YES', other_instructions || null,
          country || null, port_of_loading || 'MUNDRA PORT', port_of_discharge || null, final_destination || null,
          payment_terms || null, delivery_schedule || null, currency || 'INR (₹)',
          lc_lumber || null, lc_date || null, epcg_no || null,
          req.user.id
        ]
      );

      const orderId = result.rows[0].id;

      if (productLinesJSON && productLinesJSON.length > 0) {
        for (const line of productLinesJSON) {
          await client.query(`
            INSERT INTO proforma_order_lines 
            (proforma_order_id, product_id, product_name, size, surface, thickness,
             total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight,
             product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          `, [
            orderId,
            parseProductId(line.product_id || line.productId),
            line.product || line.product_name || line.name || 'Unknown',
            line.size || null,
            line.surface || null,
            line.thickness || null,
            parseInt(line.totalPallets || line.total_pallets || line.pallets || 0) || 0,
            parseInt(line.totalBoxes || line.total_boxes || line.boxes || 0) || 0,
            parseFloat(line.boxWeight || line.box_weight || 0) || 0,
            parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0) || 0,
            parseFloat(line.rate || line.unit_price || line.price || 0) || 0,
            parseFloat(line.amount || 0) || 0,
            parseFloat(line.netWeight || line.net_weight || 0) || 0,
            parseFloat(line.grossWeight || line.gross_weight || 0) || 0,
            line.product_type || line.productType || 'tile',
            line.sanitaryware_product_id || line.sanitarywareProductId || null,
            line.model_no || line.modelNo || null,
            line.category || null,
            line.color || null,
            parseInt(line.pieces || 0) || 0,
            parseInt(line.cartons || 0) || 0,
            parseFloat(line.cbm || 0) || 0,
            !!(line.is_foc || line.isFoc)
          ]);
        }
      }

      await client.query('COMMIT');
      
      notifyRoles(companyId, ['company_admin', 'admin', 'super_admin', 'purchase_manager'], {
        title: 'New Proforma Order',
        message: `PO ${documentNumber.baseNumber} created`,
        type: 'info',
        redirect_url: '/proforma-orders',
        module: 'PO',
        reference_id: orderId,
        reference_type: 'proforma_order'
      }, req.db);

      // Audit Log
      logAction({
        userId: req.user.id, companyId, action: 'CREATE', entityType: 'proforma_order',
        entityId: result.rows[0].id, newValue: { order_no: result.rows[0].order_no, total_amount: result.rows[0].total_amount },
        ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
      }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

      return successResponse(res, result.rows[0], 'Proforma order created successfully', 201);
    } catch (txnErr) {
      await client.query('ROLLBACK');
      throw txnErr;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);
    const { id } = req.params;

    const idValidation = validateUUID(id, 'Order ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

    const {
      date, supplier_id, supplier_name, invoice_ref, tariff_code, subtotal, total_amount,
      gst_rate, gst_amount,
      qc_status, production_start_date, production_end_date,
      expected_delivery, pallets, notes, product_lines,
      pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
      country, port_of_loading, port_of_discharge, final_destination,
      payment_terms, delivery_schedule, currency, status,
      lc_lumber, lc_date, epcg_no,
      revision_reason
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

    const existingOrder = await req.db.query(
      `SELECT id, status, order_no, original_order_no, revision_count, company_id FROM proforma_orders ${whereConditions}`,
      checkParams
    );

    if (existingOrder.rows.length === 0) {
      return next(new AppError('Proforma order not found', 404));
    }

    const docStatus = existingOrder.rows[0].status;
    const isSpecialUser = req.user.role === 'super_admin' || req.user.role === 'company_admin';

    if (docStatus === 'Locked') {
      const downstreamQC = await req.db.query(
        `SELECT qc_id FROM qc_records WHERE order_id = $1 LIMIT 1`,
        [id]
      );
      const reason = downstreamQC.rows.length > 0
        ? ` because it is used in QC ${downstreamQC.rows[0].qc_id}`
        : '';
      return next(new AppError(`This document is locked${reason} and cannot be edited. Please unlock it first.`, 403));
    }

    if (docStatus === 'Approved' && !isSpecialUser) {
      return next(new AppError(`This document is approved and cannot be edited`, 403));
    }

    // Revision calculations & mappings
    const baseDocNo = existingOrder.rows[0].original_order_no || existingOrder.rows[0].order_no;
    const nextRevisionCount = (existingOrder.rows[0].revision_count || 0) + 1;
    const newRevNo = `${baseDocNo}-R${nextRevisionCount}`;
    const effectiveRevisionReason = revision_reason || req.body.revision_reason || 'Updated document details';

    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = {
      date, 
      supplier_id: (supplier_id && typeof supplier_id === 'string' && supplier_id.trim()) ? supplier_id.trim() : null,
      supplier_name, invoice_ref, tariff_code, subtotal, total_amount, gst_rate, gst_amount, qc_status,
      production_start_date: production_start_date === '' ? null : production_start_date,
      production_end_date: production_end_date === '' ? null : production_end_date,
      expected_delivery: expected_delivery === '' ? null : expected_delivery,
      pallets: pallets === '' ? null : pallets, notes, status,
      pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
      country, port_of_loading, port_of_discharge, final_destination,
      payment_terms, delivery_schedule, currency,
      lc_lumber: lc_lumber === '' ? null : lc_lumber,
      lc_date: lc_date === '' ? null : lc_date,
      epcg_no: epcg_no === '' ? null : epcg_no,
      order_no: newRevNo,
      revision_no: newRevNo,
      original_order_no: baseDocNo,
      revision_count: nextRevisionCount,
      revision_reason: effectiveRevisionReason,
      updated_by: req.user.id
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        const finalVal = value === '' ? null : value;
        values.push(finalVal);
        paramCount++;
      }
    });

    if (product_lines !== undefined) {
      updates.push(`product_lines = $${paramCount}`);
      values.push(JSON.stringify(product_lines));
      paramCount++;
    }

    if (updates.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      // 0. Temporarily rename active order_no to avoid unique constraint conflict during cloning
      await client.query(
        `UPDATE proforma_orders SET order_no = order_no || '-TEMP' WHERE id = $1`,
        [id]
      );

      // 1. Clone the current PO to history with status 'Revised'
      const cloneRes = await client.query(
        `INSERT INTO proforma_orders (
          company_id, order_no, date, supplier_id, supplier_name, invoice_ref, tariff_code,
          subtotal, total_amount, gst_rate, gst_amount, status, qc_status, production_start_date,
          production_end_date, expected_delivery, pallets, notes, product_lines,
          pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
          country, port_of_loading, port_of_discharge, final_destination,
          payment_terms, delivery_schedule, currency,
          lc_lumber, lc_date, epcg_no,
          created_by, updated_by, original_order_no, revision_no, revision_count, revised_from_id, revision_reason, created_at, updated_at
        )
        SELECT 
          company_id, REPLACE(order_no, '-TEMP', ''), date, supplier_id, supplier_name, invoice_ref, tariff_code,
          subtotal, total_amount, gst_rate, gst_amount, 'Revised', qc_status, production_start_date,
          production_end_date, expected_delivery, pallets, notes, product_lines,
          pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
          country, port_of_loading, port_of_discharge, final_destination,
          payment_terms, delivery_schedule, currency,
          lc_lumber, lc_date, epcg_no,
          created_by, updated_by, COALESCE(original_order_no, REPLACE(order_no, '-TEMP', '')), COALESCE(revision_no, REPLACE(order_no, '-TEMP', '')), COALESCE(revision_count, 0), revised_from_id, revision_reason, created_at, updated_at
        FROM proforma_orders
        WHERE id = $1
        RETURNING id`,
        [id]
      );
      const archivedId = cloneRes.rows[0].id;

      // 2. Clone the lines to history associated with archivedId
      await client.query(
        `INSERT INTO proforma_order_lines (
          proforma_order_id, product_id, product_name, size, surface, thickness,
          total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight,
          product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc
        )
        SELECT 
          $2, product_id, product_name, size, surface, thickness,
          total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight,
          product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc
        FROM proforma_order_lines
        WHERE proforma_order_id = $1`,
        [id, archivedId]
      );

      // 3. Append revised_from_id to updates list
      const updatesWithRevisedFrom = [...updates, `revised_from_id = $${paramCount}`];
      const valuesWithRevisedFrom = [...values, archivedId];
      const updateParamCount = paramCount + 1;

      // Append ID and companyFilter to query variables
      valuesWithRevisedFrom.push(id);
      const companyId = req.companyFilter;
      valuesWithRevisedFrom.push(companyId);
      const finalWhere = `WHERE id = $${updateParamCount} AND company_id = $${updateParamCount + 1}`;

      // 4. Update the live active PO record
      const result = await client.query(
        `UPDATE proforma_orders 
        SET ${updatesWithRevisedFrom.join(', ')}
        ${finalWhere}
        RETURNING *`,
        valuesWithRevisedFrom
      );

      // 5. Recreate active lines from product_lines payload
      if (product_lines !== undefined) {
        const lines = typeof product_lines === 'string' ? JSON.parse(product_lines) : product_lines;
        await client.query('DELETE FROM proforma_order_lines WHERE proforma_order_id = $1', [id]);

        if (lines && lines.length > 0) {
          for (const line of lines) {
            await client.query(`
              INSERT INTO proforma_order_lines 
              (proforma_order_id, product_id, product_name, size, surface, thickness,
               total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight,
               product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            `, [
              id,
              parseProductId(line.product_id || line.productId),
              line.product || line.product_name || line.name || 'Unknown',
              line.size || null,
              line.surface || null,
              line.thickness || null,
              parseInt(line.totalPallets || line.total_pallets || line.pallets || 0) || 0,
              parseInt(line.totalBoxes || line.total_boxes || line.boxes || 0) || 0,
              parseFloat(line.boxWeight || line.box_weight || 0) || 0,
              parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0) || 0,
              parseFloat(line.rate || line.unit_price || line.price || 0) || 0,
              parseFloat(line.amount || 0) || 0,
              parseFloat(line.netWeight || line.net_weight || 0) || 0,
              parseFloat(line.grossWeight || line.gross_weight || 0) || 0,
              line.product_type || line.productType || 'tile',
              line.sanitaryware_product_id || line.sanitarywareProductId || null,
              line.model_no || line.modelNo || null,
              line.category || null,
              line.color || null,
              parseInt(line.pieces || 0) || 0,
              parseInt(line.cartons || 0) || 0,
              parseFloat(line.cbm || 0) || 0,
              !!(line.is_foc || line.isFoc)
            ]);
          }
        }
      }

      await client.query('COMMIT');
      
      // Trigger notification if status changed
      if (status !== undefined && result.rows[0]) {
        notifyOrderStatusChange(req.companyFilter || result.rows[0].company_id, result.rows[0], status, req.db);
      }

      // Audit Log
      logAction({
        userId: req.user.id, companyId: req.companyFilter || result.rows[0].company_id, action: 'UPDATE', entityType: 'proforma_order',
        entityId: id, newValue: { order_no: result.rows[0].order_no, total_amount: result.rows[0].total_amount },
        ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
      }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

      return successResponse(res, result.rows[0], 'Proforma order updated successfully');
    } catch (txnError) {
      await client.query('ROLLBACK');
      throw txnError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const idValidation = validateUUID(id, 'Order ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

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

    const existingOrder = await req.db.query(
      `SELECT id, status FROM proforma_orders ${whereConditions}`,
      queryParams
    );

    if (existingOrder.rows.length === 0) {
      return next(new AppError('Proforma order not found', 404));
    }

    if (existingOrder.rows[0].status === 'Locked' || existingOrder.rows[0].status === 'Approved') {
      return next(new AppError(`Cannot delete a ${existingOrder.rows[0].status.toLowerCase()} document`, 403));
    }

    const result = await req.db.query(
      `DELETE FROM proforma_orders ${whereConditions} RETURNING id, order_no`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Proforma order deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const updateQcStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { qc_status } = req.body;

    if (!qc_status) {
      return next(new AppError('QC status is required', 400));
    }

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

    const existingOrder = await req.db.query(
      `SELECT id FROM proforma_orders ${whereConditions}`,
      checkParams
    );

    if (existingOrder.rows.length === 0) {
      return next(new AppError('Proforma order not found', 404));
    }

    const values = [qc_status, id];
    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions = `WHERE id = $2 AND company_id IS NULL`;
      } else {
        values.push(req.companyFilter);
        whereConditions = `WHERE id = $2 AND company_id = $3`;
      }
    } else {
      whereConditions = `WHERE id = $2`;
    }

    const result = await req.db.query(
      `UPDATE proforma_orders 
       SET qc_status = $1, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      values
    );

    return successResponse(
      res,
      result.rows[0],
      'QC status updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const idValidation = validateUUID(id, 'Order ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

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

    const existingOrder = await req.db.query(
      `SELECT id, order_no FROM proforma_orders ${whereConditions}`,
      queryParams
    );

    if (existingOrder.rows.length === 0) {
      return next(new AppError('Proforma Order not found', 404));
    }

    await req.db.query(
      `DELETE FROM proforma_orders ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingOrder.rows[0].id, order_no: existingOrder.rows[0].order_no },
      'Proforma Order permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const idValidation = validateUUID(id, 'Order ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

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

    const existingOrder = await req.db.query(
      `SELECT id, status FROM proforma_orders ${whereConditions}`,
      queryParams
    );

    if (existingOrder.rows.length === 0) {
      return next(new AppError('Proforma Order not found', 404));
    }

    const currentStatus = existingOrder.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE proforma_orders 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `Proforma Order status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const idValidation = validateUUID(id, 'Order ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    let whereClause = 'WHERE id = $2';
    const params = [status, id];
    if (req.companyFilter) {
      whereClause = 'WHERE id = $2 AND company_id = $3';
      params.push(req.companyFilter);
    }

    const result = await req.db.query(
      `UPDATE proforma_orders SET status = $1, updated_at = CURRENT_TIMESTAMP ${whereClause} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return next(new AppError('Proforma order not found', 404));
    }

    return successResponse(res, result.rows[0], `Status updated to ${status} successfully`);
  } catch (error) {
    next(error);
  }
};

export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;

    if (!companyId) {
      return successResponse(res, { orderNo: '', displayNumber: '', serialNumber: '', monthYear: '' }, 'Company context missing');
    }

    const documentNumber = await previewDocumentNumber('PO', companyId, req.db, new Date());

    return successResponse(
      res,
      { 
        orderNo: documentNumber.baseNumber,
        displayNumber: documentNumber.displayNumber,
        serialNumber: documentNumber.serialNumber,
        monthYear: documentNumber.monthYear
      },
      'Next order number generated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getRevisionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Document ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

    let companyFilter = '';
    let queryParams = [id];
    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        companyFilter = 'AND company_id IS NULL';
      } else {
        companyFilter = 'AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    // First fetch the base order to get its original number
    const docQuery = await req.db.query(
      `SELECT id, COALESCE(original_order_no, order_no) as orig_no, company_id 
       FROM proforma_orders 
       WHERE id = $1 ${companyFilter}`,
      queryParams
    );

    if (docQuery.rows.length === 0) {
      return next(new AppError('Proforma order not found', 404));
    }

    const { orig_no, company_id } = docQuery.rows[0];

    // Now select all revisions with that original number or ID
    const historyQuery = await req.db.query(
      `SELECT po.*, u.name as updated_by_name
       FROM proforma_orders po
       LEFT JOIN users u ON po.updated_by = u.id
       WHERE (po.company_id = $1 OR (po.company_id IS NULL AND $1 IS NULL))
         AND (po.original_order_no = $2 OR po.order_no = $2 OR po.id = $3)
       ORDER BY po.revision_count DESC, po.updated_at DESC`,
      [company_id, orig_no, id]
    );

    return successResponse(res, historyQuery.rows, 'Revision history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

