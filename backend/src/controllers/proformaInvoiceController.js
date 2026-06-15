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
import { syncUpdatesAcrossStages } from '../services/exportWorkflowInterconnectionService.js';
import { notificationService } from '../services/notificationService.js';
import { validateStatusTransition } from '../utils/validateStatusTransition.js';

// Schema enforcement moved to strict database migrations (20260518_schema_hardening_and_rls.sql)

const parseProductId = (id) => {
  if (!id) return null;
  const strId = String(id);
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
  return uuidRegex.test(strId) ? strId : null;
};

/**
 * Self-healing helper: ensures all required columns exist in the tenant's proforma_invoices
 * and proforma_invoice_lines tables. This prevents "column does not exist" errors.
 */
let ensuredSchemas = new Set();

const ensureSchemaExists = async (queryFn, companyId) => {
  const cacheKey = companyId || 'global';
  if (ensuredSchemas.has(cacheKey)) return;
  try {
    const piColumns = [
      { name: 'currency', type: "VARCHAR(50) DEFAULT 'USD ($)'" },
      { name: 'pre_carriage_by', type: 'VARCHAR(255)' },
      { name: 'place_of_receipt', type: 'VARCHAR(255)' },
      { name: 'bl_no', type: 'VARCHAR(100)' },
      { name: 'bl_date', type: 'DATE' },
      { name: 'vessel_flight_no', type: 'VARCHAR(100)' },
      { name: 'sb_no', type: 'VARCHAR(100)' },
      { name: 'sb_date', type: 'DATE' },
      { name: 'exchange_rate', type: 'NUMERIC(15, 6) DEFAULT 1.0' },
      { name: 'is_used', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_converted', type: 'BOOLEAN DEFAULT false' },
      { name: 'linked_document_id', type: 'UUID' },
      { name: 'document_status', type: 'VARCHAR(50) DEFAULT \'Draft\'' },
      { name: 'approval_status', type: 'VARCHAR(50) DEFAULT \'Pending\'' },
      { name: 'approved_by', type: 'UUID' },
      { name: 'approved_at', type: 'TIMESTAMP' },
      { name: 'approval_remarks', type: 'TEXT' },
      { name: 'lc_number', type: 'VARCHAR(255)' },
      { name: 'lc_date', type: 'DATE' },
      { name: 'epcg_no', type: 'VARCHAR(255)' }
    ];

    for (const col of piColumns) {
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'proforma_invoices' 
          AND column_name = $1
        );
      `;
      const { rows } = await queryFn(checkQuery, [col.name]);
      if (!rows[0].exists) {
        debugLogger.info(`[Proforma Schema Self-Healing] Column ${col.name} missing in proforma_invoices. Adding...`);
        await queryFn(`ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      }
    }

    const pilColumns = [
      { name: 'description', type: 'TEXT' },
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

    for (const col of pilColumns) {
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'proforma_invoice_lines' 
          AND column_name = $1
        );
      `;
      const { rows } = await queryFn(checkQuery, [col.name]);
      if (!rows[0].exists) {
        debugLogger.info(`[Proforma Schema Self-Healing] Column ${col.name} missing in proforma_invoice_lines. Adding...`);
        await queryFn(`ALTER TABLE proforma_invoice_lines ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      }
    }

    // Self-heal: Alter packing instruction columns to TYPE TEXT to support long/merged strings
    await queryFn(`
      ALTER TABLE proforma_invoices 
        ALTER COLUMN pallet_type TYPE TEXT,
        ALTER COLUMN tiles_back TYPE TEXT,
        ALTER COLUMN port_of_discharge TYPE TEXT,
        ALTER COLUMN final_destination TYPE TEXT;
    `);
    
    // Self-heal: Drop problematic global FKs from tenant DB
    await queryFn(`
      ALTER TABLE proforma_invoices 
        DROP CONSTRAINT IF EXISTS proforma_invoices_created_by_fkey,
        DROP CONSTRAINT IF EXISTS proforma_invoices_updated_by_fkey;
    `);
    
    ensuredSchemas.add(cacheKey);
  } catch (err) {
    debugLogger.error('[Proforma Schema Self-Healing] Error ensuring schema columns exist:', err.message);
  }
};

/**
 * Get all Proforma Invoices
 * Supports pagination, searching, and status filtering
 * Enforces company-based isolation
 */
export const getAll = async (req, res, next) => {
  try {
    // Self-heal: Ensure schema is correct for this tenant (cached)
    await ensureSchemaExists(req.db.query, req.companyFilter);

    const { 
      page = 1, 
      limit = 50, 
      search, 
      status, 
      client_id,
      date_from,
      date_to,
      unused,
      currentId,
      exclude_revised
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    // Enforce multi-tenancy
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
      conditions.push(`(invoice_no ILIKE $${paramCount} OR client_name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      // Allow comma-separated status lists, and treat the alias 'Approved'
      // as a shorthand that includes multiple final statuses (Approved, Finalized, Ready, Active).
      const requested = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (requested.length > 1) {
        // Use case-insensitive comparison by lowercasing values and comparing with LOWER(status)
        const lowered = requested.map(s => s.toLowerCase());
        const placeholders = lowered.map((_, i) => `$${paramCount + i}`).join(', ');
        conditions.push(`LOWER(status) IN (${placeholders})`);
        values.push(...lowered);
        paramCount += lowered.length;
      } else {
        const single = requested[0];
        if (single && single.toLowerCase() === 'approved') {
          const expanded = ['approved', 'finalized', 'ready', 'active'];
          const placeholders = expanded.map((_, i) => `$${paramCount + i}`).join(', ');
          conditions.push(`LOWER(status) IN (${placeholders})`);
          values.push(...expanded);
          paramCount += expanded.length;
        } else {
          conditions.push(`LOWER(status) = $${paramCount}`);
          values.push(single ? single.toLowerCase() : single);
          paramCount++;
        }
      }
    }

    if (client_id) {
      conditions.push(`client_id = $${paramCount}`);
      values.push(client_id);
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

    if (unused === 'true' || unused === '1') {
      if (currentId && currentId !== 'null' && currentId !== 'undefined') {
        conditions.push(`(id = $${paramCount} OR is_used = FALSE OR is_used IS NULL)`);
        values.push(currentId);
        paramCount++;
      } else {
        conditions.push(`(is_used = FALSE OR is_used IS NULL)`);
      }
    }

    // Exclude historical/revised records from dropdowns & selectors
    if (exclude_revised === 'true' || exclude_revised === '1') {
      conditions.push(`COALESCE(status, 'Draft') != 'Revised'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    let total = 0;
    try {
      const countResult = await req.db.query(
        `SELECT COUNT(*) FROM proforma_invoices ${whereClause}`,
        values
      );
      total = parseInt(countResult.rows[0]?.count || 0);
    } catch (countErr) {
      // If table doesn't exist in global DB, just return 0
      if (countErr.code === '42P01') {
        return successResponse(res, paginationResponse([], 0, page, limit), 'Global proforma invoices table not found');
      }
      throw countErr;
    }

    if (total === 0) {
      return successResponse(res, paginationResponse([], 0, page, limit), 'No proforma invoices found');
    }

    // Get paginated results
    const result = await req.db.query(
      `SELECT * FROM proforma_invoices 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Proforma invoices retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('Error in getAll Proforma Invoices:', error.message);
    // Global context non-critical failure fallback
    if (req.companyFilter === null && error.code === '42P01') {
       return successResponse(res, paginationResponse([], 0, req.query.page || 1, req.query.limit || 50), 'Empty global context');
    }
    next(error);
  }
};

/**
 * Get Proforma Invoice by ID
 */
export const getById = async (req, res, next) => {
  try {
    // Self-heal: Ensure schema is correct for this tenant (cached)
    await ensureSchemaExists(req.db.query, req.companyFilter);

    const { id } = req.params;

    const idValidation = validateUUID(id, 'Invoice ID');
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

    const result = await req.db.query(
      `SELECT * FROM proforma_invoices ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Proforma invoice not found', 404));
    }

    const invoice = result.rows[0];

    // Priority: Return immutable frozen snapshot if document is locked
    if (invoice.is_locked && invoice.snapshot_data) {
      const frozenInvoice = enrichWithSnapshot(invoice, 'PI');
      return successResponse(
        res,
        frozenInvoice,
        'Proforma invoice retrieved successfully (LOCKED)'
      );
    }
    
    // Fetch company details from global DB
    let companyInfo = null;
    if (invoice.company_id) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT * FROM companies WHERE id = $1',
          [invoice.company_id]
        );
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            ...c,
            bank_details: {
              bank_name: c.bank_name || (settings.bank_details && settings.bank_details.bank_name) || c.bankName || '',
              account_name: c.account_holder_name || (settings.bank_details && settings.bank_details.account_name) || c.accountHolderName || c.name || '',
              account_no: c.account_number || (settings.bank_details && settings.bank_details.account_no) || c.accountNumber || '',
              swift_code: c.swift_code || (settings.bank_details && settings.bank_details.swift_code) || c.swiftCode || '',
              bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || c.bankAddress || ''
            },
            // Fallback for flat fields if UI expects them
            bankName: c.bank_name || c.bankName,
            accountHolderName: c.account_holder_name || c.accountHolderName,
            accountNumber: c.account_number || c.accountNumber,
            swiftCode: c.swift_code || c.swiftCode,
            bankAddress: c.bank_address || c.bankAddress
          };
        }
      } catch (err) {
        debugLogger.error('Error fetching company info for PI:', err.message);
      }
    }

    return successResponse(
      res,
      { ...invoice, company_info: companyInfo },
      'Proforma invoice retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create new Proforma Invoice
 * Handles document number generation and totals calculation
 */
export const create = async (req, res, next) => {
  try {
    // SECURITY: Only non-client roles can create proforma invoices
    const allowedRoles = ['super_admin', 'company_admin', 'admin', 'sales_manager', 'sales_executive', 'account', 'export_documents'];
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to create proforma invoices', 403));
    }

    // Self-heal: Ensure schema is correct for this tenant (cached)
    await ensureSchemaExists(req.db.query, req.companyFilter);

    const {
      date, client_id, client_name, country, subtotal, discount, tax,
      total_amount, pallets, total_sqm, status, payment_terms, delivery_terms,
      port_of_loading, port_of_discharge, validity_days, notes, product_lines, tariff_code, supplier_details,
      pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
      consignee_details, buyer_details, final_destination, currency,
      pre_carriage_by, place_of_receipt, bl_no, bl_date, vessel_flight_no, sb_no, sb_date, exchange_rate,
      lc_number, lc_date, epcg_no
    } = req.body;

    // Comprehensive camelCase to snake_case fallbacks for frontend compatibility
    const m_client_id = client_id || req.body.clientId;
    const m_client_name = client_name || req.body.clientName || (req.body.name || 'Unknown Client');
    const m_subtotal = parseFloat(subtotal || req.body.subtotal || 0) || 0;
    const m_discount = parseFloat(discount || req.body.discount || 0) || 0;
    const m_tax = parseFloat(tax || req.body.tax || 0) || 0;
    const m_total_amount = parseFloat(total_amount || req.body.totalAmount || 0) || 0;
    const m_product_lines = Array.isArray(product_lines) && product_lines.length > 0 
      ? product_lines 
      : (Array.isArray(req.body.productLines) ? req.body.productLines : (Array.isArray(req.body.line_items) ? req.body.line_items : []));
    const m_consignee_details = consignee_details || req.body.consigneeDetails;
    const m_buyer_details = buyer_details || req.body.buyerDetails;
    const m_final_destination = final_destination || req.body.finalDestination;
    const m_port_of_loading = port_of_loading || req.body.portOfLoading;
    const m_port_of_discharge = port_of_discharge || req.body.portOfDischarge;
    const m_payment_terms = payment_terms || req.body.paymentTerms;
    const m_delivery_terms = delivery_terms || req.body.deliveryTerms;
    const m_tariff_code = tariff_code || req.body.tariffCode;
    const m_validity_days = validity_days || req.body.validityDays;
    const m_total_sqm = total_sqm || req.body.totalSqm;
    const m_pallets = pallets || req.body.pallets || req.body.totalPallets;
    const m_currency = currency || req.body.currency || 'INR';

    // Accept alternate field names from lightweight test payloads and provide defaults
    const effectiveDate = date || req.body.invoice_date || new Date().toISOString().split('T')[0];
    const effectiveClientName = (m_client_name && m_client_name.toString().trim()) ? m_client_name : 'Unknown Client';
    const effectiveProductLines = m_product_lines;

    const effectivePortOfLoading = (m_port_of_loading || '').toString().trim() || 'MUNDRA PORT';
    const effectiveFinalDestination = (m_final_destination || '').toString().trim() || 'UNKNOWN';
    const effectivePaymentTerms = (m_payment_terms || '').toString().trim() || 'Due on Receipt';
    const effectiveDeliveryTerms = (m_delivery_terms || '').toString().trim() || 'FOB';
    const effectiveTariffCode = (m_tariff_code || '').toString().trim() || '';
    const effectiveValidityDays = parseInt(m_validity_days || 30) || 30;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    // Auto-calculate summary values if missing
    let calculatedPallets = 0;
    let calculatedSqm = 0;
    const lines = Array.isArray(effectiveProductLines) ? effectiveProductLines : [];
    
    if (lines.length > 0) {
      const uniquePallets = new Set();
      lines.forEach(line => {
        const p = parseInt(line.totalPallets || line.total_pallets || line.pallets);
        if (!isNaN(p)) uniquePallets.add(p);
        if (line.sqm) calculatedSqm += parseFloat(line.sqm) || 0;
      });
      calculatedPallets = uniquePallets.size > 0 ? Math.max(...uniquePallets) : 0;
    }

    const finalPallets = m_pallets !== undefined && m_pallets !== null && m_pallets !== '' ? m_pallets : calculatedPallets;
    const finalSqm = m_total_sqm !== undefined && m_total_sqm !== null && m_total_sqm !== '' ? m_total_sqm : calculatedSqm;

    // Generate PI number
    const documentNumber = await generateDocumentNumber('PI', companyId, req.db, new Date(effectiveDate));

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO proforma_invoices 
        (company_id, invoice_no, date, client_id, client_name, country, subtotal, discount, tax,
          total_amount, pallets, total_sqm, status, payment_terms, delivery_terms, port_of_loading,
          port_of_discharge, final_destination, consignee_details, buyer_details, validity_days, notes, product_lines, tariff_code, supplier_details, pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions, currency, 
          pre_carriage_by, place_of_receipt, bl_no, bl_date, vessel_flight_no, sb_no, sb_date, exchange_rate,
          lc_number, lc_date, epcg_no,
          created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          companyId || null, documentNumber.baseNumber, effectiveDate, (m_client_id && m_client_id !== '' ? m_client_id : null), effectiveClientName, country || null, m_subtotal,
          m_discount, m_tax, m_total_amount, finalPallets, finalSqm, status || 'Draft', effectivePaymentTerms,
          effectiveDeliveryTerms, effectivePortOfLoading, port_of_discharge || m_port_of_discharge, effectiveFinalDestination, m_consignee_details, m_buyer_details,
          effectiveValidityDays, notes || null, JSON.stringify(effectiveProductLines), effectiveTariffCode, supplier_details || null,
          pallet_type || 'Normal Wooden Pallet', tiles_back || 'WITH MADE IN INDIA', boxes_marking || 'WITH', box_type || 'NON BRANDED BOXES',
          fumigation || 'YES', legalisation || 'YES', other_instructions || null, m_currency, 
          pre_carriage_by || req.body.preCarriageBy || null, place_of_receipt || req.body.placeOfReceipt || null, 
          bl_no || req.body.blNo || null, bl_date || req.body.blDate || null, 
          vessel_flight_no || req.body.vesselFlightNo || null, 
          sb_no || req.body.sbNo || null, sb_date || req.body.sbDate || null,
          exchange_rate || req.body.exchangeRate || 1,
          lc_number || req.body.lcNumber || null,
          lc_date || req.body.lcDate || null,
          epcg_no || req.body.epcgNo || null,
          req.user.id
        ]
      );

      const proformaId = result.rows[0].id;
      
      if (lines && lines.length > 0) {
        const valueStrings = [];
        const queryParams = [];
        let paramCounter = 1;

        for (const line of lines) {
          valueStrings.push(`($${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++})`);
          queryParams.push(
            proformaId,
            parseProductId(line.product_id || line.productId),
            line.product || line.product_name || line.name || 'Unknown',
            line.size || null,
            line.surface || null,
            line.thickness || null,
            parseInt(line.totalPallets || line.total_pallets || line.pallets || 0) || 0,
            parseInt(line.totalBoxes || line.total_boxes || line.boxes || 0) || 0,
            parseFloat(line.boxWeight || line.box_weight || line.weightPerBox || 0) || 0,
            parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0) || 0,
            parseFloat(line.rate || line.unit_price || line.price || 0) || 0,
            parseFloat(line.amount || 0) || 0,
            parseFloat(line.netWeight || line.net_weight || 0) || 0,
            parseFloat(line.grossWeight || line.gross_weight || 0) || 0,
            line.description || null,
            line.product_type || line.productType || 'tile',
            parseProductId(line.sanitaryware_product_id || line.sanitarywareProductId),
            line.model_no || line.modelNo || null,
            line.category || null,
            line.color || null,
            parseInt(line.pieces || 0) || 0,
            parseInt(line.cartons || 0) || 0,
            parseFloat(line.cbm || 0) || 0,
            line.is_foc || line.isFoc || line.foc || false
          );
        }

        await client.query(`
          INSERT INTO proforma_invoice_lines 
          (proforma_invoice_id, product_id, product_name, size, surface, thickness,
           total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight, description,
           product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc)
          VALUES ${valueStrings.join(', ')}
        `, queryParams);
      }

      await client.query('COMMIT');
      
      await notificationService.notifyRoles(companyId, ['company_admin', 'admin', 'super_admin'], {
        title: 'New Proforma Invoice',
        message: `PI ${documentNumber.baseNumber} created by ${req.user.name || 'a user'}`,
        type: 'info',
        redirect_url: '/invoice-dashboard',
        module: 'PI'
      }, req.db);

      // Audit Log
      logAction({
        userId: req.user.id, companyId, action: 'CREATE', entityType: 'proforma_invoice',
        entityId: result.rows[0].id, newValue: { invoice_no: result.rows[0].invoice_no, total_amount: result.rows[0].total_amount },
        ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
      }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

      return successResponse(res, result.rows[0], 'Proforma invoice created successfully', 201);
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

/**
 * Update existing Proforma Invoice
 */
export const update = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;

    // Self-heal: Ensure schema is correct for this tenant (cached)
    await ensureSchemaExists(req.db.query, req.companyFilter);

    // SECURITY: Only non-client roles can update proforma invoices
    const allowedRoles = ['super_admin', 'company_admin', 'admin', 'sales_manager', 'sales_executive', 'account', 'export_documents'];
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to modify proforma invoices', 403));
    }

    const { id } = req.params;
    const idValidation = validateUUID(id, 'Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const {
      date, client_id, client_name, country, subtotal, discount, tax, total_amount,
      pallets, total_sqm, status, payment_terms, delivery_terms, port_of_loading, port_of_discharge,
      validity_days, notes, product_lines, tariff_code, supplier_details,
      pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
      consignee_details, buyer_details, final_destination, currency,
      pre_carriage_by, place_of_receipt, bl_no, bl_date, vessel_flight_no, sb_no, sb_date, exchange_rate,
      lc_number, lc_date, epcg_no,
      revision_reason
    } = req.body;

    // Map camelCase fields from frontend if snake_case is missing
    const m_validity_days = validity_days !== undefined ? validity_days : req.body.validityDays;
    const m_tariff_code = tariff_code !== undefined ? tariff_code : req.body.tariffCode;
    const m_consignee_details = consignee_details !== undefined ? consignee_details : req.body.consigneeDetails;
    const m_buyer_details = buyer_details !== undefined ? buyer_details : req.body.buyerDetails;
    const m_final_destination = final_destination !== undefined ? final_destination : req.body.finalDestination;
    const m_port_of_loading = port_of_loading !== undefined ? port_of_loading : req.body.portOfLoading;
    const m_port_of_discharge = port_of_discharge !== undefined ? port_of_discharge : req.body.portOfDischarge;
    const m_payment_terms = payment_terms !== undefined ? payment_terms : req.body.paymentTerms;
    const m_delivery_terms = delivery_terms !== undefined ? delivery_terms : req.body.deliveryTerms;
    const m_client_id = client_id !== undefined ? client_id : req.body.clientId;
    const m_client_name = client_name !== undefined ? client_name : req.body.clientName;
    const m_total_sqm = total_sqm !== undefined ? total_sqm : req.body.totalSqm;
    const m_product_lines = Array.isArray(product_lines) && product_lines.length > 0 
      ? product_lines 
      : (Array.isArray(req.body.productLines) ? req.body.productLines : (Array.isArray(req.body.line_items) ? req.body.line_items : null));

    const m_currency = currency !== undefined ? currency : req.body.currency;
    const m_pre_carriage_by = pre_carriage_by !== undefined ? pre_carriage_by : req.body.preCarriageBy;
    const m_place_of_receipt = place_of_receipt !== undefined ? place_of_receipt : req.body.placeOfReceipt;
    const m_bl_no = bl_no !== undefined ? bl_no : req.body.blNo;
    const m_bl_date = bl_date !== undefined ? bl_date : req.body.blDate;
    const m_vessel_flight_no = vessel_flight_no !== undefined ? vessel_flight_no : req.body.vesselFlightNo;
    const m_sb_no = sb_no !== undefined ? sb_no : req.body.sbNo;
    const m_sb_date = sb_date !== undefined ? sb_date : req.body.sbDate;
    const m_exchange_rate = exchange_rate !== undefined ? exchange_rate : req.body.exchangeRate;
    const m_lc_number = lc_number !== undefined ? lc_number : req.body.lcNumber;
    const m_lc_date = lc_date !== undefined ? lc_date : req.body.lcDate;
    const m_epcg_no = epcg_no !== undefined ? epcg_no : req.body.epcgNo;

    // Check ownership & select fields for revision logic
    let ownershipClause = 'WHERE id = $1';
    let queryParams = [id];
    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        ownershipClause += ' AND company_id IS NULL';
      } else {
        ownershipClause += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingInvoice = await req.db.query(
      `SELECT id, status, invoice_no, original_invoice_no, revision_count, company_id FROM proforma_invoices ${ownershipClause}`, 
      queryParams
    );
    if (existingInvoice.rows.length === 0) return next(new AppError('Proforma invoice not found', 404));

    const docStatus = existingInvoice.rows[0].status;
    const isSpecialUser = req.user.role === 'super_admin' || req.user.role === 'company_admin';

    if (docStatus === 'Locked') {
      const downstreamPO = await req.db.query(
        `SELECT order_no FROM proforma_orders WHERE invoice_ref = (SELECT invoice_no FROM proforma_invoices WHERE id = $1) AND company_id = $2 LIMIT 1`,
        [id, req.companyFilter || existingInvoice.rows[0].company_id]
      );
      const reason = downstreamPO.rows.length > 0
        ? ` because it is used in PO ${downstreamPO.rows[0].order_no}`
        : '';
      return next(new AppError(`This document is locked${reason} and cannot be edited. Please unlock it first.`, 403));
    }

    if (docStatus === 'Approved' && !isSpecialUser) {
      return next(new AppError(`This document is approved and cannot be edited`, 403));
    }

    // Validate status transition if status is being changed
    const incomingStatus = req.body.status || req.body.m_status;
    if (incomingStatus && incomingStatus !== docStatus) {
      const transition = validateStatusTransition('proforma_invoice', docStatus, incomingStatus);
      if (!transition.valid) {
        return next(new AppError(transition.reason, 400));
      }
    }

    // Dynamic field mapping & revision calculations
    const baseDocNo = existingInvoice.rows[0].original_invoice_no || existingInvoice.rows[0].invoice_no;
    const nextRevisionCount = (existingInvoice.rows[0].revision_count || 0) + 1;
    const newRevNo = `${baseDocNo}-R${nextRevisionCount}`;
    const effectiveRevisionReason = revision_reason || req.body.revision_reason || 'Updated document details';

    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = {
      date, client_id: m_client_id, client_name: m_client_name, country, subtotal, discount, tax, total_amount,
      pallets, total_sqm: m_total_sqm, payment_terms: m_payment_terms, delivery_terms: m_delivery_terms, 
      port_of_loading: m_port_of_loading, port_of_discharge: m_port_of_discharge,
      validity_days: m_validity_days, notes, tariff_code: m_tariff_code, final_destination: m_final_destination, 
      consignee_details: m_consignee_details, buyer_details: m_buyer_details,
      supplier_details, pallet_type, tiles_back, boxes_marking, box_type, fumigation, 
      legalisation, other_instructions, currency: m_currency,
      pre_carriage_by: m_pre_carriage_by, place_of_receipt: m_place_of_receipt, bl_no: m_bl_no, bl_date: m_bl_date,
      vessel_flight_no: m_vessel_flight_no, sb_no: m_sb_no, sb_date: m_sb_date, exchange_rate: m_exchange_rate,
      lc_number: m_lc_number, lc_date: m_lc_date, epcg_no: m_epcg_no,
      invoice_no: newRevNo,
      revision_no: newRevNo,
      original_invoice_no: baseDocNo,
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

    if (m_product_lines !== null) {
      updates.push(`product_lines = $${paramCount}`);
      values.push(JSON.stringify(m_product_lines));
      paramCount++;
    }

    if (updates.length === 0) return next(new AppError('No fields to update', 400));

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      // 0. Temporarily rename active invoice_no to avoid unique constraint conflict during cloning
      await client.query(
        `UPDATE proforma_invoices SET invoice_no = invoice_no || '-TEMP' WHERE id = $1`,
        [id]
      );

      // 1. Clone the current version to history with status 'Revised'
      const cloneRes = await client.query(
        `INSERT INTO proforma_invoices (
          company_id, invoice_no, date, client_id, client_name, country, subtotal, discount, tax,
          total_amount, pallets, total_sqm, status, payment_terms, delivery_terms, port_of_loading,
          port_of_discharge, final_destination, consignee_details, buyer_details, validity_days, notes, product_lines, tariff_code, supplier_details, pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions, currency, 
          pre_carriage_by, place_of_receipt, bl_no, bl_date, vessel_flight_no, sb_no, sb_date, exchange_rate,
          lc_number, lc_date, epcg_no,
          created_by, updated_by, original_invoice_no, revision_no, revision_count, revised_from_id, revision_reason, created_at, updated_at
        )
        SELECT 
          company_id, REPLACE(invoice_no, '-TEMP', ''), date, client_id, client_name, country, subtotal, discount, tax,
          total_amount, pallets, total_sqm, 'Revised', payment_terms, delivery_terms, port_of_loading,
          port_of_discharge, final_destination, consignee_details, buyer_details, validity_days, notes, product_lines, tariff_code, supplier_details, pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions, currency, 
          pre_carriage_by, place_of_receipt, bl_no, bl_date, vessel_flight_no, sb_no, sb_date, exchange_rate,
          lc_number, lc_date, epcg_no,
          created_by, updated_by, COALESCE(original_invoice_no, REPLACE(invoice_no, '-TEMP', '')), COALESCE(revision_no, REPLACE(invoice_no, '-TEMP', '')), COALESCE(revision_count, 0), revised_from_id, revision_reason, created_at, updated_at
        FROM proforma_invoices
        WHERE id = $1
        RETURNING id`,
        [id]
      );
      const archivedId = cloneRes.rows[0].id;

      // 2. Clone the lines to history associated with archivedId
      await client.query(
        `INSERT INTO proforma_invoice_lines (
          proforma_invoice_id, product_id, product_name, size, surface, thickness,
          total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight, description,
          product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc
        )
        SELECT 
          $2, product_id, product_name, size, surface, thickness,
          total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight, description,
          product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc
        FROM proforma_invoice_lines
        WHERE proforma_invoice_id = $1`,
        [id, archivedId]
      );

      // 3. Append revised_from_id to updates list
      const updatesWithRevisedFrom = [...updates, `revised_from_id = $${paramCount}`];
      const valuesWithRevisedFrom = [...values, archivedId];
      const updateParamCount = paramCount + 1;

      // Append ID and companyFilter to query
      valuesWithRevisedFrom.push(id);
      const finalWhere = req.companyFilter 
        ? `WHERE id = $${updateParamCount} AND company_id = $${updateParamCount + 1}` 
        : `WHERE id = $${updateParamCount} AND company_id IS NULL`;
      
      if (req.companyFilter) {
        valuesWithRevisedFrom.push(req.companyFilter);
      }

      // 4. Update the live active record
      const result = await client.query(
        `UPDATE proforma_invoices SET ${updatesWithRevisedFrom.join(', ')} ${finalWhere} RETURNING *`,
        valuesWithRevisedFrom
      );

      // 5. Recreate active lines from product_lines payload
      if (m_product_lines) {
        await client.query('DELETE FROM proforma_invoice_lines WHERE proforma_invoice_id = $1', [id]);

        if (m_product_lines.length > 0) {
          const valueStrings = [];
          const queryParams = [];
          let paramCounter = 1;

          for (const line of m_product_lines) {
            valueStrings.push(`($${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++})`);
            queryParams.push(
              id,
              parseProductId(line.product_id || line.productId),
              line.product || line.product_name || line.name || 'Unknown',
              line.size || null,
              line.surface || null,
              line.thickness || null,
              parseInt(line.totalPallets || line.total_pallets || line.pallets || 0) || 0,
              parseInt(line.totalBoxes || line.total_boxes || line.boxes || 0) || 0,
              parseFloat(line.boxWeight || line.box_weight || line.weightPerBox || 0) || 0,
              parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0) || 0,
              parseFloat(line.rate || line.unit_price || line.price || 0) || 0,
              parseFloat(line.amount || 0) || 0,
              parseFloat(line.netWeight || line.net_weight || 0) || 0,
              parseFloat(line.grossWeight || line.gross_weight || 0) || 0,
              line.description || null,
              line.product_type || line.productType || 'tile',
              parseProductId(line.sanitaryware_product_id || line.sanitarywareProductId),
              line.model_no || line.modelNo || null,
              line.category || null,
              line.color || null,
              parseInt(line.pieces || 0) || 0,
              parseInt(line.cartons || 0) || 0,
              parseFloat(line.cbm || 0) || 0,
              line.is_foc || line.isFoc || line.foc || false
            );
          }

          await client.query(`
            INSERT INTO proforma_invoice_lines 
            (proforma_invoice_id, product_id, product_name, size, surface, thickness,
             total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight, description,
             product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc)
            VALUES ${valueStrings.join(', ')}
          `, queryParams);
        }
      }

      await client.query('COMMIT');

      // PHASE 1 FIX: Sync PI Revisions to Linked Proforma Orders
      // If the invoice_no was changed (a revision occurred), update linked POs
      const oldInvoiceNo = existingInvoice.rows[0].invoice_no;
      if (newRevNo !== oldInvoiceNo) {
        try {
          const noteText = `\n[AUTO] Linked Proforma Invoice was revised to ${newRevNo}. Please review and sync order quantities.`;
          const poUpdateRes = await req.db.query(
            `UPDATE proforma_orders 
             SET invoice_ref = $1, 
                 status = 'REVISION_REQUIRED',
                 notes = COALESCE(notes, '') || $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE invoice_ref = $3 AND company_id = $4
             RETURNING id, order_no`,
            [newRevNo, noteText, oldInvoiceNo, req.companyFilter || result.rows[0].company_id]
          );

          if (poUpdateRes.rows.length > 0) {
            debugLogger.info('[ProformaInvoice] Marked linked POs as REVISION_REQUIRED:', poUpdateRes.rows.map(r => r.order_no));
            
            // Notify purchase team about the required revision
            await notificationService.notifyRoles(req.companyFilter || result.rows[0].company_id, ['company_admin', 'purchase_manager'], {
              title: 'PO Revision Required',
              message: `Linked PI was revised to ${newRevNo}. Proforma Order ${poUpdateRes.rows[0].order_no} requires review.`,
              type: 'info',
              redirect_url: '/proforma-orders'
            }, req.db);
          }
        } catch (poErr) {
          debugLogger.error('[ProformaInvoice] Failed to sync revision to POs:', poErr.message);
        }
      }

      // Trigger workflow updates
      const changedFields = Object.keys(fields).filter(k => fields[k] !== undefined);
      if (m_product_lines) changedFields.push('product_lines');
      syncUpdatesAcrossStages(id, 'proforma_invoice', changedFields, req.companyFilter || result.rows[0].company_id, req.db).catch(() => {});

      // Add Notification for PI Updated / Revised
      await notificationService.notifyRoles(companyId, ['company_admin', 'admin', 'sales_manager', 'export_documents'], {
        title: newRevNo !== oldInvoiceNo ? 'Proforma Invoice Revised' : 'Proforma Invoice Updated',
        message: `PI ${newRevNo} has been ${newRevNo !== oldInvoiceNo ? 'revised' : 'updated'} by ${req.user.name || 'a user'}`,
        type: newRevNo !== oldInvoiceNo ? 'warning' : 'info',
        redirect_url: `/invoice-management/${id}`,
        module: 'Proforma',
        reference_id: id,
        reference_no: newRevNo,
        priority: 'normal'
      }, req.db);

      // Audit Log
      logAction({
        userId: req.user.id, companyId: req.companyFilter || result.rows[0].company_id, action: 'UPDATE', entityType: 'proforma_invoice',
        entityId: id, newValue: { invoice_no: result.rows[0].invoice_no, total_amount: result.rows[0].total_amount },
        ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
      }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

      return successResponse(res, result.rows[0], 'Proforma invoice updated successfully');
    } catch (txnError) {
      await client.query('ROLLBACK');
      throw txnError;
    } finally {
      client.release();
    }
  } catch (error) {
    debugLogger.error('[ProformaInvoice] Update Error:', error);
    next(error);
  }
};

/**
 * Remove Proforma Invoice
 */
export const remove = async (req, res, next) => {
  try {
    // SECURITY: Only non-client roles can delete proforma invoices
    const allowedRoles = ['super_admin', 'company_admin', 'admin', 'sales_manager', 'sales_executive', 'account', 'export_documents'];
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to delete proforma invoices', 403));
    }

    const { id } = req.params;
    const idValidation = validateUUID(id, 'Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    let where = 'WHERE id = $1';
    let params = [id];
    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        where += ' AND company_id IS NULL';
      } else {
        where += ' AND company_id = $2';
        params.push(req.companyFilter);
      }
    }

    const lockCheck = await req.db.query(`SELECT status FROM proforma_invoices ${where}`, params);
    if (lockCheck.rows.length > 0 && (lockCheck.rows[0].status === 'Locked' || lockCheck.rows[0].status === 'Approved')) {
      return next(new AppError(`Cannot delete a ${lockCheck.rows[0].status.toLowerCase()} document`, 403));
    }

    const result = await req.db.query(`DELETE FROM proforma_invoices ${where} RETURNING id, invoice_no`, params);
    if (result.rows.length === 0) return next(new AppError('Proforma invoice not found', 404));

    return successResponse(res, result.rows[0], 'Proforma invoice deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Permanent Delete
 */
export const hardDelete = async (req, res, next) => { return remove(req, res, next); };

/**
 * Toggle Status
 */
export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    let where = 'WHERE id = $1';
    let params = [id];
    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        where += ' AND company_id IS NULL';
      } else {
        where += ' AND company_id = $2';
        params.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `UPDATE proforma_invoices SET status = CASE WHEN status = 'Active' THEN 'Inactive' ELSE 'Active' END ${where} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return next(new AppError('Proforma invoice not found', 404));
    return successResponse(res, result.rows[0], 'Status toggled successfully');
  } catch (error) { next(error); }
};

/**
 * Convert Proforma Invoice to Order
 */
export const convertToOrder = async (req, res, next) => {
  const client = await req.db.getClient();
  
  try {
    const { id } = req.params;
    const { 
      supplier_id, 
      supplier_name, 
      production_start_date, 
      production_end_date,
      expected_delivery,
      pallets,
      notes 
    } = req.body;

    await client.query('BEGIN');

    const companyId = req.companyFilter;
    let whereConditions = 'WHERE id = $1 AND company_id = $2';
    let queryParams = [id, companyId];

    const invoiceResult = await client.query(
      `SELECT * FROM proforma_invoices ${whereConditions}`,
      queryParams
    );

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Proforma invoice not found', 404));
    }

    const invoice = invoiceResult.rows[0];

    const orderNoResult = await client.query(
      `SELECT COUNT(*) FROM proforma_orders WHERE company_id = $1`,
      [invoice.company_id]
    );
    const count = parseInt(orderNoResult.rows[0].count) + 1;
    const documentNumber = await generateDocumentNumber('PO', invoice.company_id, req.db, new Date());
    const orderNo = documentNumber.baseNumber;

    const orderResult = await client.query(
      `INSERT INTO proforma_orders 
       (company_id, order_no, date, supplier_id, supplier_name, invoice_ref,
        subtotal, total_amount, status, qc_status, production_start_date,
        production_end_date, expected_delivery, pallets, notes, product_lines, created_by,
        pallet_type, tiles_back, boxes_marking, box_type, fumigation, legalisation, other_instructions,
        payment_terms, delivery_schedule, country, port_of_loading, port_of_discharge, final_destination)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
       RETURNING *`,
      [
        invoice.company_id, orderNo, supplier_id || null, supplier_name,
        invoice.invoice_no, invoice.subtotal, invoice.total_amount, 'Draft',
        'Not Ready', production_start_date || null, production_end_date || null,
        expected_delivery || null, pallets || null, notes || null,
        invoice.product_lines, req.user.id,
        invoice.pallet_type, invoice.tiles_back, invoice.boxes_marking,
        invoice.box_type, invoice.fumigation, invoice.legalisation,
        invoice.other_instructions, invoice.payment_terms, invoice.delivery_terms,
        invoice.country, invoice.port_of_loading, invoice.port_of_discharge, invoice.final_destination
      ]
    );

    await client.query(
      `UPDATE proforma_invoices SET status = 'Locked' WHERE id = $1 AND company_id = $2`,
      [id, invoice.company_id]
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      orderResult.rows[0],
      'Proforma order created successfully from invoice',
      201
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Generate next document number for preview
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const idValidation = validateUUID(id, 'Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    let whereClause = 'WHERE id = $1';
    const params = [status, id];
    if (req.companyFilter) {
      whereClause = 'WHERE id = $2 AND company_id = $3';
      params.push(req.companyFilter);
    } else {
      whereClause = 'WHERE id = $2';
    }

    const result = await req.db.query(
      `UPDATE proforma_invoices SET status = $1, updated_at = CURRENT_TIMESTAMP ${whereClause} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return next(new AppError('Proforma invoice not found', 404));
    }

    return successResponse(res, result.rows[0], `Status updated to ${status} successfully`);
  } catch (error) {
    next(error);
  }
};

export const getNextNumber = async (req, res, next) => {
  try {
    // Self-heal: Ensure schema is correct for this tenant
    await ensureSchemaExists(req.db.query);

    const companyId = req.companyFilter;

    if (!companyId) {
      return successResponse(res, { invoiceNo: '' }, 'Company context missing');
    }

    const documentNumber = await previewDocumentNumber('PI', companyId, req.db, new Date());
    return successResponse(res, { invoiceNo: documentNumber.baseNumber }, 'Next number generated');
  } catch (error) { next(error); }
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

    // First fetch the base invoice to get its original number
    const docQuery = await req.db.query(
      `SELECT id, COALESCE(original_invoice_no, invoice_no) as orig_no, company_id 
       FROM proforma_invoices 
       WHERE id = $1 ${companyFilter}`,
      queryParams
    );

    if (docQuery.rows.length === 0) {
      return next(new AppError('Proforma invoice not found', 404));
    }

    const { orig_no, company_id } = docQuery.rows[0];

    // Now select all revisions with that original number or ID
    const historyQuery = await req.db.query(
      `SELECT pi.*, u.name as updated_by_name
       FROM proforma_invoices pi
       LEFT JOIN users u ON pi.updated_by = u.id
       WHERE (pi.company_id = $1 OR (pi.company_id IS NULL AND $1 IS NULL))
         AND (pi.original_invoice_no = $2 OR pi.invoice_no = $2 OR pi.id = $3)
       ORDER BY pi.revision_count DESC, pi.updated_at DESC`,
      [company_id, orig_no, id]
    );

    return successResponse(res, historyQuery.rows, 'Revision history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Multi-Level Approval Workflow
 */
export const approve = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'submit', 'manager_approve', 'accounts_approve', 'final_approve', 'reject'
    const userRole = req.user.role;

    const idValidation = validateUUID(id, 'Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    let ownershipClause = 'WHERE id = $1';
    let queryParams = [id];
    if (companyId) {
      ownershipClause += ' AND company_id = $2';
      queryParams.push(companyId);
    } else {
      ownershipClause += ' AND company_id IS NULL';
    }

    const existingInvoice = await req.db.query(
      `SELECT id, approval_status, status, invoice_no, approval_remarks FROM proforma_invoices ${ownershipClause}`, 
      queryParams
    );

    if (existingInvoice.rows.length === 0) {
      return next(new AppError('Proforma invoice not found', 404));
    }

    const invoice = existingInvoice.rows[0];
    const currentApprovalStatus = invoice.approval_status || 'Pending';
    
    let newApprovalStatus = currentApprovalStatus;
    let newStatus = invoice.status;
    let notificationTitle = 'Approval Update';
    let notificationMessage = '';

    if (action === 'reject') {
      newApprovalStatus = 'Rejected';
      newStatus = 'Draft';
      notificationTitle = 'Proforma Invoice Rejected';
      notificationMessage = `PI ${invoice.invoice_no} was rejected by ${userRole}. Remarks: ${remarks || 'None'}`;
    } else if (action === 'submit') {
      if (currentApprovalStatus !== 'Pending' && currentApprovalStatus !== 'Rejected' && currentApprovalStatus !== 'Draft') {
        return next(new AppError('Invoice is already submitted for approval', 400));
      }
      newApprovalStatus = 'Pending Manager Approval';
      newStatus = 'Under Approval';
      notificationTitle = 'Proforma Invoice Submitted';
      notificationMessage = `PI ${invoice.invoice_no} was submitted for manager approval.`;
    } else if (action === 'manager_approve') {
      if (!['super_admin', 'company_admin', 'sales_manager', 'admin'].includes(userRole)) {
        return next(new AppError('You do not have permission for Manager Approval', 403));
      }
      if (currentApprovalStatus !== 'Pending Manager Approval') {
        return next(new AppError(`Cannot approve at this stage. Current status: ${currentApprovalStatus}`, 400));
      }
      newApprovalStatus = 'Pending Accounts Approval';
      notificationTitle = 'Manager Approved';
      notificationMessage = `PI ${invoice.invoice_no} was approved by Sales Manager and sent to Accounts.`;
    } else if (action === 'accounts_approve') {
      if (!['super_admin', 'company_admin', 'account', 'admin'].includes(userRole)) {
        return next(new AppError('You do not have permission for Accounts Approval', 403));
      }
      if (currentApprovalStatus !== 'Pending Accounts Approval') {
        return next(new AppError(`Cannot approve at this stage. Current status: ${currentApprovalStatus}`, 400));
      }
      newApprovalStatus = 'Pending Final Approval';
      notificationTitle = 'Accounts Approved';
      notificationMessage = `PI ${invoice.invoice_no} was approved by Accounts and sent for Final Approval.`;
    } else if (action === 'final_approve') {
      if (!['super_admin', 'company_admin', 'admin', 'export_documents'].includes(userRole)) {
        return next(new AppError('You do not have permission for Final Approval', 403));
      }
      if (currentApprovalStatus !== 'Pending Final Approval') {
        return next(new AppError(`Cannot approve at this stage. Current status: ${currentApprovalStatus}`, 400));
      }
      newApprovalStatus = 'Approved';
      newStatus = 'Approved';
      notificationTitle = 'Proforma Invoice Fully Approved';
      notificationMessage = `PI ${invoice.invoice_no} has received Final Approval.`;
    } else {
      return next(new AppError('Invalid approval action', 400));
    }

    const updatedRemarks = remarks 
      ? `[${new Date().toISOString()}] ${userRole}: ${remarks}\n${invoice.approval_remarks || ''}`
      : invoice.approval_remarks;

    const result = await req.db.query(
      `UPDATE proforma_invoices 
       SET approval_status = $1, 
           status = $2, 
           approved_by = $3, 
           approved_at = CURRENT_TIMESTAMP, 
           approval_remarks = $4 
       ${ownershipClause} RETURNING *`,
      [newApprovalStatus, newStatus, req.user.id, updatedRemarks, ...queryParams]
    );

    // Auto-Generate Order Sheets on Final Approval
    if (action === 'final_approve' && result.rows.length > 0) {
      try {
        const activePi = result.rows[0];
        const linesRes = await req.db.query(
          `SELECT * FROM proforma_invoice_lines WHERE proforma_invoice_id = $1`,
          [activePi.id]
        );
        
        const effectiveCompanyId = companyId || activePi.company_id;

        if (linesRes.rows.length > 0) {
          const psDocNumber = await generateDocumentNumber('PS', effectiveCompanyId, req.db, new Date());
          
          for (const line of linesRes.rows) {
            await req.db.query(
              `INSERT INTO order_sheets (
                company_id, proforma_invoice_id, proforma_invoice_line_id,
                pi_no, client_id, supplier_id, product_id, size, surface, design,
                product_category, thickness, box_pcs, box_weight,
                required_sqm, status, priority, production_sheet_no
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
              )`,
              [
                effectiveCompanyId, activePi.id, line.id,
                activePi.invoice_no, activePi.client_id, null, line.product_id, line.size, line.surface, 
                line.model_no || line.color,
                line.category, line.thickness, 
                line.pieces || 0, line.box_weight || 0,
                line.sqm_auto || 0,
                'Pending', 'Medium', psDocNumber.baseNumber
              ]
            );
          }
        }
      } catch (osError) {
        // Log but don't fail the approval if order sheet generation fails
        debugLogger.error('[ProformaInvoice] Order Sheet generation failed:', osError.message);
      }
    }

    // Notify relevant roles
    let notifyRoles = ['company_admin', 'super_admin'];
    if (newApprovalStatus === 'Pending Manager Approval') notifyRoles.push('sales_manager');
    if (newApprovalStatus === 'Pending Accounts Approval') notifyRoles.push('account');

    await notificationService.notifyRoles(companyId || null, notifyRoles, {
      title: notificationTitle,
      message: notificationMessage,
      type: action === 'reject' ? 'error' : 'success',
      redirect_url: '/invoice-management',
      module: 'PI'
    }, req.db);

    return successResponse(res, result.rows[0], `Invoice ${action.replace('_', ' ')} processed successfully`);
  } catch (error) {
    next(error);
  }
};

