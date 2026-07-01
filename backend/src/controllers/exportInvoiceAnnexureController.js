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
import { successResponse } from '../utils/helpers.js';
import { validateUUID } from '../utils/validators.js';
import { enrichWithSnapshot } from '../services/documentSnapshotService.js';
import { generateDocumentNumber, previewDocumentNumber } from '../utils/documentNumberGenerator.js';
import { syncUpdatesAcrossStages } from '../services/exportWorkflowInterconnectionService.js';
import { notificationService } from '../services/notificationService.js';

const ensureAnnexureSchema = async (queryFn) => {
  // Moved to databaseProvisioning.js to avoid runtime ALTER TABLE locks
};

const safeDateToISO = (val) => {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toISOString().split('T')[0];
};

// ──────────────────────────────────────────────────────────────────────────────
// Helper: convert frontend field names → DB column names
// ──────────────────────────────────────────────────────────────────────────────
const FIELD_MAP = {
  pi_no: 'pi_reference',
  pl_no: 'packing_list_no',
  vessel_flight_no: 'vessel_name',
  country_of_final_destination: 'country',
  material_header_description: 'product_description',
  box_type: 'boxes_type',
  marks_and_numbers: 'boxes_marking',
  iec_no: 'iec_no'
};

// Reverse map: DB column → frontend field name (used in GET responses)
const REVERSE_FIELD_MAP = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([k, v]) => [v, k])
);

// VARCHAR columns that should store 'YES'/'NO'/'MADE IN INDIA' strings
const VARCHAR_BOOL_FIELDS = new Set(['fumigation', 'legalisation', 'made_in_india']);

const toVarCharBool = (v, field) => {
  if (field === 'made_in_india') {
    if (v === true || v === 'YES' || v === 'MADE IN INDIA') return 'YES';
    if (v === false || v === 'NO') return 'NO';
    return v || 'YES';
  }
  if (v === true || v === 'YES') return 'YES';
  if (v === false || v === 'NO') return 'NO';
  return v || 'NO';
};

// DB columns we save (using actual DB names)
const DB_FIELDS = [
  'annexure_no', 'packing_list_id', 'packing_list_no', 'invoice_no', 'invoice_date',
  'pi_reference', 'export_invoice_no', 'client_name', 'consignee_details', 'buyer_details',
  'vessel_name', 'port_of_loading', 'port_of_discharge', 'final_destination',
  'country', 'country_of_origin', 'product_description', 'total_pallets', 'total_boxes',
  'total_sqm', 'net_weight', 'gross_weight', 'pallet_type', 'made_in_india',
  'tiles_back', 'boxes_type', 'fumigation', 'legalisation', 'other_instructions',
  'total_packages', 'boxes_marking',
  'status', 'container_details', 'product_lines',
  'manufacturer_name', 'manufacturer_address', 'factory_address',
  'range_name', 'division', 'commissionerate', 'lut_arn_no', 'lut_date',
  'examination_date', 'examining_officer', 'appraiser_name', 'permission_no',
  'division_range', 'samples_drawn', 'sample_seal_no',
  'company_name', 'company_address', 'shipping_bill_no', 'shipping_bill_date', 'iec_no',
  'c_no', 'c_date'
];

const buildDbValues = (body) => {
  // Remap frontend field names to DB column names first
  const remapped = { ...body };
  for (const [frontKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (frontKey in remapped) {
      if (!(dbKey in remapped) || remapped[dbKey] == null || remapped[dbKey] === '') {
        remapped[dbKey] = remapped[frontKey];
      }
      delete remapped[frontKey];
    }
  }

  return DB_FIELDS.map(col => {
    let v = remapped[col];
    if (col === 'container_details' || col === 'product_lines') {
      return JSON.stringify(Array.isArray(v) ? v : []);
    }
    if (VARCHAR_BOOL_FIELDS.has(col)) {
      return toVarCharBool(v, col);
    }

    // Safely parse date fields to avoid Postgres syntax errors
    if (['invoice_date', 'lut_date', 'examination_date', 'shipping_bill_date', 'c_date'].includes(col) && v) {
      try {
        // Check if it's already a valid YYYY-MM-DD
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          return v;
        }
        const d = new Date(v);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        } else {
          return null;
        }
      } catch (e) {
        return null;
      }
    }

    return (v === undefined || v === '') ? null : v;
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /  – list all
// ──────────────────────────────────────────────────────────────────────────────
export const getAll = async (req, res, next) => {
  try {
    await ensureAnnexureSchema(req.db.query);
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE (a.deleted_at IS NULL)';
    let params = [];

    if (req.companyFilter !== undefined) {
      if (req.companyFilter === null) {
        where += ' AND a.company_id IS NULL';
      } else {
        where += ` AND a.company_id = $${params.length + 1}`;
        params.push(req.companyFilter);
      }
    }

    if (search) {
      const searchParam = '%' + search + '%';
      where += ` AND (
        a.invoice_no ILIKE $${params.length + 1}
        OR a.client_name ILIKE $${params.length + 1}
        OR a.annexure_no ILIKE $${params.length + 1}
        OR a.export_invoice_no ILIKE $${params.length + 1}
        OR a.packing_list_no ILIKE $${params.length + 1}
      )`;
      params.push(searchParam);
    }

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM export_invoice_annexures a ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    if (total === 0) {
      return successResponse(
        res,
        { data: [], total: 0, page: parseInt(page), limit: parseInt(limit) },
        'No annexures found'
      );
    }

    // Use COALESCE on stored columns – avoid JOIN on packing_lists which can
    // produce duplicate rows when an invoice has more than one packing list.
    const result = await req.db.query(
      `SELECT 
              a.id,
              a.id               AS annexure_id,
              a.export_invoice_id,
              a.annexure_no,
              a.invoice_no,
              a.invoice_date,
              a.client_name,
              a.total_boxes,
              a.total_sqm,
              a.net_weight,
              a.gross_weight,
              a.port_of_loading,
              a.port_of_discharge,
              a.final_destination,
              a.status,
              a.status AS annexure_status,
              a.is_locked,
              a.created_at,
              a.packing_list_no,
              COALESCE(a.export_invoice_no, a.invoice_no, ei.invoice_no) as export_invoice_no
       FROM export_invoice_annexures a
       LEFT JOIN export_invoices ei ON a.export_invoice_id = ei.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return successResponse(
      res,
      {
        data: result.rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      },
      'Annexure list retrieved'
    );
  } catch (error) { next(error); }
};


// ──────────────────────────────────────────────────────────────────────────────
// GET /export-invoice/:exportInvoiceId  – enriched fetch for the form
// ──────────────────────────────────────────────────────────────────────────────
export const getByExportInvoiceId = async (req, res, next) => {
  try {
    await ensureAnnexureSchema(req.db.query);
    const { exportInvoiceId } = req.params;
    const { annexureId } = req.query;

    const uv = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!uv.isValid) return next(new AppError(uv.error || 'Invalid exportInvoiceId', 400));

    // Support fetching a specific annexure if ID is provided
    let annexureCondition = 'WHERE export_invoice_id = ei.id AND deleted_at IS NULL';
    let params = [exportInvoiceId];
    let nextParam = 2;

    if (annexureId && validateUUID(annexureId).isValid) {
      annexureCondition = `WHERE id = $${nextParam} AND export_invoice_id = ei.id AND deleted_at IS NULL`;
      params.push(annexureId);
      nextParam++;
    }

    const companyFilter = Object.hasOwn(req, 'companyFilter')
      ? (req.companyFilter === null
        ? (req.user?.role === 'super_admin' ? '' : 'AND ei.company_id IS NULL')
        : `AND ei.company_id = $${nextParam}`)
      : '';

    if (req.companyFilter !== null && req.companyFilter !== undefined) {
      params.push(req.companyFilter);
    }


    const result = await req.db.query(
      `SELECT a.*,
              ei.invoice_no as inv_export_invoice_no, ei.invoice_date as inv_export_invoice_date,
              ei.client_name as inv_client_name, ei.country as inv_country, 
              ei.consignee_details as inv_consignee_details, ei.buyer_details as inv_buyer_details,
              ei.port_of_loading as inv_port_of_loading, 
              ei.port_of_discharge as inv_port_of_discharge,
              ei.final_destination as inv_final_destination,
              ei.vessel_flight_no as inv_vessel_flight_no,
              ei.product_lines as inv_product_lines,
              NULL as inv_product_description,
              ei.total_sqm as inv_total_sqm, ei.total_amount as inv_total_amount,
              ei.net_weight as inv_net_weight, ei.gross_weight as inv_gross_weight,
              ei.pallets as inv_pallets,
              ei.box_type as inv_box_type, ei.pallet_type as inv_pallet_type,
              ei.tiles_back as inv_tiles_back, ei.boxes_marking as inv_marks,
              ei.fumigation as inv_fumigation, ei.legalisation as inv_legalisation,
              ei.other_instructions as inv_instructions,
              ei.booking_no as inv_booking_no,
              ei.lut_bond_ref as inv_lut_bond_ref,
              ei.lut_date as inv_lut_date,
              NULL as inv_iec_no,
              ei.country_of_origin as inv_country_of_origin,
              pi.lut_date as pi_lut_date,
              pi.id as proforma_id, pi.date as pi_date, pi.date as proforma_date,
              pi.invoice_no as pi_no,
              pl.id as pl_packing_list_id, pl.packing_list_no as pl_packing_list_no, pl.packing_list_date as pl_packing_list_date,
              pl.total_boxes as pl_total_boxes, pl.total_sqm as pl_total_sqm,
              pl.net_weight as pl_net_weight, pl.gross_weight as pl_gross_weight,
              pl.product_lines as pl_product_lines, pl.container_details as pl_container_details,
              pl.consignee as pl_consignee, pl.buyer as pl_buyer,
              s.name as inv_manufacturer_name, s.address as inv_manufacturer_address,
              ei.updated_at as ei_updated_at,
              ei.company_id
        FROM export_invoices ei
        LEFT JOIN LATERAL (
          SELECT * FROM export_invoice_annexures 
          ${annexureCondition}
          ORDER BY created_at DESC LIMIT 1
        ) a ON true
        LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
        LEFT JOIN proforma_orders po ON pi.proforma_order_id = po.id
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN LATERAL (
          SELECT * FROM packing_lists
          WHERE export_invoice_id = ei.id AND deleted_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        ) pl ON true
        WHERE ei.id = $1
        ${companyFilter}`,
      params
    );


    if (result.rows.length === 0) return next(new AppError('Export Invoice not found', 404));

    const row = result.rows[0];

    // Priority: Return immutable frozen snapshot if document is locked
    if (row.is_locked && row.snapshot_data) {
      const frozenANX = enrichWithSnapshot(row, 'ANNEXURE');
      const companyDetails = frozenANX.company_info || {};
      const returnedData = {
        ...frozenANX,
        company_info: companyDetails,
        product_lines: frozenANX.product_lines || [],
        container_details: frozenANX.shipping_details?.container_details || []
      };
      return successResponse(res, returnedData, 'Annexure retrieved successfully (LOCKED)');
    }

    // Fetch company details separately from global DB
    let companyInfo = {};
    if (row.company_id) {
      try {
        const compRes = await req.db.globalQuery('SELECT * FROM companies WHERE id = $1', [row.company_id]);
        const c = compRes.rows[0];
        const settings = c.settings || {};
        companyInfo = {
          ...c,
          lut_arn_no: c.lut_arn_no || (settings.lut_arn_no) || (settings.lut_bond_ref) || '',
          lut_date: c.lut_date || (settings.lut_date) || '',
          permission_no: c.permission_no || (settings.permission_no) || '',
          range_name: settings.range_name || '',
          division: settings.division || '',
          commissionerate: settings.commissionerate || '',
          bank_details: {
            bank_name: c.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
            account_name: c.account_holder_name || (settings.bank_details && settings.bank_details.account_name) || '',
            account_no: c.account_number || (settings.bank_details && settings.bank_details.account_no) || '',
            swift_code: c.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
            bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
          }
        };
        // Map to legacy names if needed by template
        companyInfo.co_name = companyInfo.name;
        companyInfo.co_address = companyInfo.address;
        companyInfo.company_iec = companyInfo.iec_no;
      } catch (err) {
        debugLogger.error('Error fetching company info for Annexure:', err.message);
      }
    }

    // IMPORTANT: row.id = a.id (annexure UUID or NULL if no annexure yet).
    // We must check hasAnnexure BEFORE merging companyInfo, because
    // companyInfo.id (company UUID) would overwrite row.id and make
    // hasAnnexure always true — causing the form to always read from
    // an empty/missing annexure record instead of company defaults.
    const hasAnnexure = !!row.id;

    const mergedRow = {
      ...companyInfo,         // company defaults (lowest priority)
      ...row,                 // SQL row data takes precedence (includes saved annexure fields)
      id: row.id,             // always keep annexure id (null if new, not company id)
      company_id: row.company_id, // always keep export invoice company_id
      // Explicit company fallback fields (used when annexure fields are empty)
      co_name: row.co_name || companyInfo.name || '',
      co_address: row.co_address || companyInfo.address || '',
      company_iec: row.company_iec || companyInfo.iec_no || '',
      comp_lut_arn_no: row.comp_lut_arn_no || companyInfo.lut_arn_no || '',
      comp_lut_date: row.comp_lut_date || companyInfo.lut_date || null,
    };
    const a = hasAnnexure ? mergedRow : null;

    // Next sequence peek if new
    let annexureNo = mergedRow.annexure_no || '';
    if (!annexureNo && !hasAnnexure) {
      try {
        const gen = await previewDocumentNumber('ANX', mergedRow.company_id, req.db);
        annexureNo = gen.baseNumber;
      } catch (genErr) {
      }
    }

    const data = a ? {
      ...mergedRow,
      annexure_no: a.annexure_no || '',
      export_invoice_no: a.export_invoice_no || '',
      pi_no: a.pi_reference || '',
      pl_no: a.packing_list_no || '',
      invoice_no: a.invoice_no || '',
      invoice_date: a.invoice_date || '',
      client_name: a.client_name || '',
      consignee_details: a.consignee_details || row.pl_consignee || row.inv_consignee_details || '',
      buyer_details: a.buyer_details || row.pl_buyer || row.inv_buyer_details || '',
      vessel_flight_no: a.vessel_name || row.inv_vessel_flight_no || '',
      port_of_loading: (a.port_of_loading && a.port_of_loading.trim()) ? a.port_of_loading : (row.inv_port_of_loading || ''),
      port_of_discharge: (a.port_of_discharge && a.port_of_discharge.trim()) ? a.port_of_discharge : (row.inv_port_of_discharge || ''),
      final_destination: (a.final_destination && a.final_destination.trim()) ? a.final_destination : (row.inv_final_destination || ''),
      country_of_origin: (a.country_of_origin && a.country_of_origin.trim()) ? a.country_of_origin : (row.inv_country_of_origin || 'INDIA'),
      country_of_final_destination: (a.country && a.country.trim()) ? a.country : (row.inv_country || ''),
      material_header_description: a.product_description || row.inv_product_description || '',
      total_pallets: a.total_pallets || row.inv_pallets || 0,
      total_boxes: a.total_boxes || row.pl_total_boxes || 0,
      total_sqm: a.total_sqm || row.pl_total_sqm || 0,
      net_weight: a.net_weight || row.pl_net_weight || 0,
      gross_weight: a.gross_weight || row.pl_gross_weight || 0,
      pallet_type: a.pallet_type || row.inv_pallet_type || '',
      box_type: a.boxes_type || row.inv_box_type || '',
      fumigation: a.fumigation || row.inv_fumigation || '',
      legalisation: a.legalisation || row.inv_legalisation || '',
      tiles_back: a.tiles_back || row.inv_tiles_back || '',
      made_in_india: a.made_in_india || 'YES',
      other_instructions: a.other_instructions || row.inv_instructions || '',
      marks_and_numbers: a.boxes_marking || row.inv_marks || '',
      total_packages: a.total_packages || 0,
      iec_no: a.iec_no || a.company_iec || row.inv_iec_no || companyInfo.iec_no || '',
      lut_arn_no: a.lut_arn_no || row.inv_lut_bond_ref || companyInfo.lut_arn_no || '',
      lut_date: a.lut_date || row.inv_lut_date || (companyInfo.lut_date ? companyInfo.lut_date.split('T')[0] : '') || '',
      product_lines: (Array.isArray(a.product_lines) ? a.product_lines : []),
      container_details: (function () {
        let containers = a.container_details;
        if (typeof containers === 'string') {
          try { containers = JSON.parse(containers); } catch (e) { containers = []; }
        }
        if ((!containers || containers.length === 0) && row.pl_container_details) {
          try {
            containers = typeof row.pl_container_details === 'string' ? JSON.parse(row.pl_container_details) : row.pl_container_details;
          } catch (e) { containers = []; }
        }
        return Array.isArray(containers) ? containers : [];
      })(),
      company_name: a.company_name || row.co_name || '',
      company_address: a.company_address || row.co_address || '',
      booking_no: a.booking_no || row.inv_booking_no || '',
      manufacturer_name: a.manufacturer_name || row.inv_manufacturer_name || '',
      manufacturer_address: a.manufacturer_address || row.inv_manufacturer_address || '',
      factory_address: a.factory_address || 'AT MORBI',
      shipping_bill_no: row.shipping_bill_no || '',
      shipping_bill_date: safeDateToISO(row.shipping_bill_date),
      pi_date: safeDateToISO(row.pi_date || row.proforma_date),
      proforma_date: safeDateToISO(row.pi_date || row.proforma_date),
      export_invoice_date: safeDateToISO(row.inv_export_invoice_date),
      permission_no: a.permission_no || '',
    } : {
      ...row,
      annexure_no: annexureNo || '',
      export_invoice_no: row.inv_export_invoice_no || '',
      booking_no: row.inv_booking_no || '',
      manufacturer_name: row.inv_manufacturer_name || '',
      manufacturer_address: row.inv_manufacturer_address || '',
      factory_address: 'AT MORBI',
      pi_no: row.pi_no || row.inv_pi_no || '',
      pl_no: row.pl_packing_list_no || '',
      invoice_no: row.inv_export_invoice_no || '',
      invoice_date: row.inv_export_invoice_date || '',
      client_name: row.inv_client_name || '',
      consignee_details: row.pl_consignee || row.inv_consignee_details || '',
      buyer_details: row.pl_buyer || row.inv_buyer_details || '',
      vessel_flight_no: row.inv_vessel_flight_no || '',
      port_of_loading: row.inv_port_of_loading || 'MUNDRA PORT',
      port_of_discharge: row.inv_port_of_discharge || '',
      final_destination: row.inv_final_destination || '',
      country_of_origin: 'INDIA',
      country_of_final_destination: row.inv_country || '',
      material_header_description: row.inv_product_description || '',
      total_pallets: row.inv_pallets || 0,
      total_boxes: row.pl_total_boxes || 0,
      total_sqm: row.pl_total_sqm || 0,
      net_weight: row.pl_net_weight || 0,
      gross_weight: row.pl_gross_weight || 0,
      pallet_type: row.inv_pallet_type || 'NORMAL WOODEN PALLETS',
      box_type: row.inv_box_type || 'NON BRANDED BOXES',
      fumigation: row.inv_fumigation || 'YES',
      legalisation: row.inv_legalisation || 'NO',
      tiles_back: row.inv_tiles_back || 'MADE IN INDIA',
      made_in_india: 'YES',
      other_instructions: row.inv_instructions || 'NO',
      marks_and_numbers: row.inv_marks || '',
      total_packages: row.pl_total_boxes || 0,
      product_lines: (Array.isArray(row.pl_product_lines) && row.pl_product_lines.length ? row.pl_product_lines
        : (Array.isArray(row.inv_product_lines) && row.inv_product_lines.length ? row.inv_product_lines : [])),
      container_details: (function () {
        let containers = row.pl_container_details || [];
        if (typeof containers === 'string') {
          try { containers = JSON.parse(containers); } catch (e) { containers = []; }
        }
        return Array.isArray(containers) ? containers : [];
      })(),
      company_name: row.co_name || mergedRow.co_name || mergedRow.name || '',
      company_address: row.co_address || mergedRow.co_address || mergedRow.address || '',
      iec_no: row.company_iec || mergedRow.company_iec || mergedRow.iec_no || '',
      shipping_bill_no: '',
      shipping_bill_date: safeDateToISO(row.shipping_bill_date),
      lut_arn_no: row.inv_lut_bond_ref || row.comp_lut_arn_no || mergedRow.lut_arn_no || '',
      lut_date: safeDateToISO(row.inv_lut_date || row.pi_lut_date || row.comp_lut_date || mergedRow.lut_date),
      pi_date: safeDateToISO(row.pi_date || row.proforma_date),
      proforma_date: safeDateToISO(row.pi_date || row.proforma_date),
      export_invoice_date: safeDateToISO(row.inv_export_invoice_date),
      permission_no: '',
    };

    data.company_info = companyInfo;

    return successResponse(res, data, 'Annexure retrieved');
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /annexure/:annexureId
// ──────────────────────────────────────────────────────────────────────────────
export const getByAnnexureId = async (req, res, next) => {
  try {
    await ensureAnnexureSchema(req.db.query);
    const { annexureId } = req.params;
    const uv = validateUUID(annexureId, 'Annexure ID');
    if (!uv.isValid) return next(new AppError(uv.error || 'Invalid annexureId', 400));

    const result = await req.db.query(
      `SELECT a.*,
              COALESCE(a.pi_reference, pi.invoice_no) AS pi_no,
              pi.date AS pi_date, pi.date AS proforma_date,
              ei.invoice_date AS export_invoice_date,
              ei.invoice_no AS inv_no, ei.invoice_date AS inv_date, ei.client_name AS inv_client,
              ei.consignee_details AS inv_consignee_details, ei.buyer_details AS inv_buyer_details,
              ei.box_type as inv_box_type, ei.pallet_type as inv_pallet_type,
              ei.tiles_back as inv_tiles_back, ei.boxes_marking as inv_marks,
              ei.fumigation as inv_fumigation, ei.legalisation as inv_legalisation,
              ei.other_instructions as inv_instructions,
              ei.vessel_flight_no as inv_vessel_flight_no,
              ei.lut_bond_ref as inv_lut_bond_ref, ei.lut_date as inv_lut_date,
              pi.lut_date as pi_lut_date,
              ei.port_of_loading as inv_port_of_loading,
              ei.port_of_discharge as inv_port_of_discharge,
              ei.final_destination as inv_final_destination,
              ei.country as inv_country,
              ei.country_of_origin as inv_country_of_origin,
              ei.updated_at as ei_updated_at
       FROM export_invoice_annexures a
       LEFT JOIN export_invoices ei ON a.export_invoice_id = ei.id
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       WHERE a.id = $1`,
      [annexureId]
    );


    if (result.rows.length === 0) return next(new AppError('Annexure not found', 404));
    const row = result.rows[0];

    // Priority: Return immutable frozen snapshot if document is locked
    if (row.is_locked && row.snapshot_data) {
      const frozenANX = enrichWithSnapshot(row, 'ANNEXURE');
      return successResponse(res, frozenANX, 'Annexure retrieved successfully (LOCKED)');
    }

    // Fetch company details from global DB
    let companyInfo = null;
    if (row.company_id) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT name, address, iec_no, gstn, pan, logo_url, settings FROM companies WHERE id = $1',
          [row.company_id]
        );
        const c = compRes.rows[0];
        const settings = c.settings || {};
        companyInfo = {
          name: c.name,
          address: c.address,
          iec_no: c.iec_no,
          gstn: c.gstn,
          pan: c.pan,
          logo_url: c.logo_url || (settings.logo_url) || '',
          lut_arn_no: (settings.lut_arn_no) || (settings.lut_bond_ref) || '',
          lut_date: (settings.lut_date) || '',
          permission_no: (settings.permission_no) || '',
          settings: settings,
          bank_details: {
            bank_name: c.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
            account_name: c.account_holder_name || (settings.bank_details && settings.bank_details.account_name) || '',
            account_no: c.account_number || (settings.bank_details && settings.bank_details.account_no) || '',
            swift_code: c.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
            bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
          }
        };
      } catch (err) {
        debugLogger.error('Error fetching company info for Annexure by ID:', err.message);
      }
    }

    return successResponse(res, {
      ...row,
      invoice_no: row.invoice_no || row.inv_no,
      export_invoice_no: row.export_invoice_no || row.inv_no || '',
      client_name: row.client_name || row.inv_client,
      material_header_description: row.product_description || '',
      country_of_final_destination: (row.country_of_final_destination && row.country_of_final_destination.trim() && row.country_of_final_destination !== 'country') ? row.country_of_final_destination : (row.inv_country && row.inv_country !== 'country' ? row.inv_country : ''),
      country_of_origin: (row.country_of_origin && row.country_of_origin.trim()) ? row.country_of_origin : (row.inv_country_of_origin || 'INDIA'),
      box_type: row.boxes_type || row.inv_box_type || '',
      pallet_type: row.pallet_type || row.inv_pallet_type || '',
      tiles_back: row.tiles_back || row.inv_tiles_back || '',
      marks_and_numbers: row.boxes_marking || row.inv_marks || '',
      fumigation: row.fumigation || row.inv_fumigation || '',
      legalisation: row.legalisation || row.inv_legalisation || '',
      other_instructions: row.other_instructions || row.inv_instructions || '',
      vessel_flight_no: row.vessel_name || row.inv_vessel_flight_no || '',
      port_of_loading: (row.port_of_loading && row.port_of_loading.trim()) ? row.port_of_loading : (row.inv_port_of_loading || ''),
      port_of_discharge: (row.port_of_discharge && row.port_of_discharge.trim()) ? row.port_of_discharge : (row.inv_port_of_discharge || ''),
      final_destination: (row.final_destination && row.final_destination.trim()) ? row.final_destination : (row.inv_final_destination || ''),
      range_name: row.range_name || companyInfo?.settings?.range_name || '',
      division: row.division || companyInfo?.settings?.division || '',
      commissionerate: row.commissionerate || companyInfo?.settings?.commissionerate || '',
      iec_no: row.iec_no || (companyInfo?.iec_no) || '',
      lut_arn_no: row.lut_arn_no || row.inv_lut_bond_ref || (companyInfo?.lut_arn_no) || '',
      lut_date: safeDateToISO(row.lut_date || row.inv_lut_date || row.pi_lut_date || companyInfo?.lut_date),
      permission_no: row.permission_no || (companyInfo?.permission_no) || '',
      pi_date: (row.pi_date || row.proforma_date || '')?.toString?.()?.split('T')[0] || '',
      export_invoice_date: (row.export_invoice_date || '')?.toString?.()?.split('T')[0] || '',
      company_info: companyInfo
    }, 'Annexure retrieved');
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /export-invoice/:exportInvoiceId  (create or update)
// ──────────────────────────────────────────────────────────────────────────────
export const createOrUpdate = async (req, res, next) => {
  try {
    await ensureAnnexureSchema(req.db.query);
    const { exportInvoiceId } = req.params;
    const uv = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!uv.isValid) return next(new AppError(uv.error || 'Invalid exportInvoiceId', 400));

    const body = req.body;

    const eiRow = await req.db.query(
      'SELECT company_id, invoice_no, total_sqm, net_weight, gross_weight FROM export_invoices WHERE id = $1',
      [exportInvoiceId]
    );
    if (eiRow.rows.length === 0) return next(new AppError('Export Invoice not found', 404));
    const companyId = eiRow.rows[0].company_id;

    const existing = await req.db.query(
      'SELECT id, annexure_no FROM export_invoice_annexures WHERE export_invoice_id = $1 AND deleted_at IS NULL',
      [exportInvoiceId]
    );

    const plRow = await req.db.query(
      'SELECT id, is_used, is_converted, packing_list_no, total_boxes, total_sqm, net_weight, gross_weight FROM packing_lists WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [exportInvoiceId, companyId]
    );
    if (plRow.rows.length === 0) {
      return next(new AppError('A Packing List must be created before you can create an Annexure.', 400));
    }

    // --- Item 6: Invoice vs Annexure Quantity Sync ---
    // Cross-reference quantities and weights between Export Invoice / Packing List and Annexure
    const pl = plRow.rows[0];
    const ei = eiRow.rows[0];
    
    const plBoxes = parseFloat(pl.total_boxes) || 0;
    const plSqm = parseFloat(pl.total_sqm) || parseFloat(ei.total_sqm) || 0;
    const plNet = parseFloat(pl.net_weight) || parseFloat(ei.net_weight) || 0;
    const plGross = parseFloat(pl.gross_weight) || parseFloat(ei.gross_weight) || 0;

    const formBoxes = parseFloat(body.total_boxes) || 0;
    const formSqm = parseFloat(body.total_sqm) || 0;
    const formNet = parseFloat(body.net_weight) || 0;
    const formGross = parseFloat(body.gross_weight) || 0;

    const tolerance = 0.5; // Small tolerance for floating point variations
    const syncErrors = [];

    if (plBoxes > 0 && Math.abs(plBoxes - formBoxes) > tolerance) syncErrors.push(`Total Boxes (${formBoxes} vs ${plBoxes})`);
    if (plSqm > 0 && Math.abs(plSqm - formSqm) > tolerance) syncErrors.push(`Total SQM (${formSqm} vs ${plSqm})`);
    if (plNet > 0 && Math.abs(plNet - formNet) > tolerance) syncErrors.push(`Net Weight (${formNet} vs ${plNet})`);
    if (plGross > 0 && Math.abs(plGross - formGross) > tolerance) syncErrors.push(`Gross Weight (${formGross} vs ${plGross})`);

    if (syncErrors.length > 0) {
      return next(new AppError(`Invoice/Annexure Sync Error: The following quantities do not match the parent Export Invoice / Packing List: ${syncErrors.join(', ')}. Please ensure data integrity before proceeding.`, 400));
    }
    // ------------------------------------------------

    let annexureNo;
    if (existing.rows.length === 0) {
      // Check if this Packing List has already been converted to an Annexure
      const pl = plRow.rows[0];
      if (pl.is_used || pl.is_converted) {
        return next(new AppError(`Packing List ${pl.packing_list_no} has already been converted to an Annexure.`, 400));
      }

      // New annexure — always generate via counter to prevent duplicates
      const gen = await generateDocumentNumber('ANX', companyId, req.db);
      annexureNo = gen.displayNumber;
    } else {
      // Existing annexure — keep the stored number
      annexureNo = existing.rows[0].annexure_no;
    }

    const bodyWithNo = { ...body, annexure_no: annexureNo };
    const values = buildDbValues(bodyWithNo);

    let result;
    if (existing.rows.length > 0) {
      const setClause = DB_FIELDS.map((col, i) => `${col} = $${i + 1}`).join(', ');
      result = await req.db.query(
        `UPDATE export_invoice_annexures
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE export_invoice_id = $${DB_FIELDS.length + 1}
          RETURNING *`,
        [...values, exportInvoiceId]
      );
    } else {
      const cols = ['company_id', 'export_invoice_id', 'annexure_type', ...DB_FIELDS].join(', ');
      const ph = ['company_id', 'export_invoice_id', 'annexure_type', ...DB_FIELDS]
        .map((_, i) => `$${i + 1}`).join(', ');
      result = await req.db.query(
        `INSERT INTO export_invoice_annexures (${cols}) VALUES (${ph}) RETURNING *`,
        [companyId, exportInvoiceId, 'PACKING_ANNEXURE', ...values]
      );

      // Mark the parent Packing List as converted
      const annexureId = result.rows[0].id;
      const plId = plRow.rows[0].id;
      await req.db.query(
        `UPDATE packing_lists 
         SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
         WHERE id = $2 AND company_id = $3`,
        [annexureId, plId, companyId]
      );
    }
    // Trigger background sync
    const changedFields = Object.keys(body);
    syncUpdatesAcrossStages(result.rows[0].id, 'annexure', changedFields, companyId, req.db).catch(() => { });

    // Notify about the new annexure
    if (existing.rows.length === 0) {
      notificationService.notifyAnnexureCreated(companyId, result.rows[0], req.db).catch(err => debugLogger.warn('Notification', err.message));
    }

    return successResponse(res, result.rows[0], 'Annexure saved');
  } catch (error) { next(error); }
};


// ──────────────────────────────────────────────────────────────────────────────
// DELETE /export-invoice/:exportInvoiceId
// ──────────────────────────────────────────────────────────────────────────────
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const identifier = id;

    if (!identifier) return next(new AppError('No identifier provided for deletion', 400));

    // Support deleting by either the Annexure ID (id) or the Parent Invoice ID (export_invoice_id)
    const companyFilter = req.companyFilter || req.user?.companyId;
    const filterClause = companyFilter ? ` AND company_id = $2` : '';
    const params = companyFilter ? [identifier, companyFilter] : [identifier];

    const result = await req.db.query(
      `UPDATE export_invoice_annexures 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE (id = $1 OR export_invoice_id = $1)${filterClause}
       RETURNING id`,
      params
    );

    if (result.rowCount === 0) return next(new AppError('Annexure not found', 404));

    res.locals.auditResourceId = result.rows[0]?.id;
    return successResponse(res, null, 'Annexure deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /next-number
// ──────────────────────────────────────────────────────────────────────────────
export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.user?.companyId || (req.user?.role === 'super_admin' ? (req.query.company_id || req.body.company_id || req.headers['x-company-id']) : null);
    if (!companyId) {
      return successResponse(res, { annexureNo: '' }, 'Company context missing');
    }

    const gen = await previewDocumentNumber('ANX', companyId, req.db);
    return successResponse(res, { annexureNo: gen.baseNumber }, 'Next number retrieved');
  } catch (error) { next(error); }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    const current = await req.db.query(
      'SELECT status FROM export_invoice_annexures WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (current.rows.length === 0) {
      return next(new AppError('Annexure not found', 404));
    }

    const currentStatus = current.rows[0].status;
    const newStatus = (currentStatus === 'Completed' || currentStatus === 'Confirmed') ? 'Draft' : 'Completed';

    const result = await req.db.query(
      'UPDATE export_invoice_annexures SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
      [newStatus, id, companyId]
    );

    return successResponse(res, result.rows[0], `Status updated to ${newStatus}`);
  } catch (error) {
    next(error);
  }
};


export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.companyFilter || req.user?.companyId;

    if (!status) return next(new AppError('Status is required', 400));

    let result;
    if (companyId) {
      result = await req.db.query(`
        UPDATE export_invoice_annexures
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `, [status, id, companyId]);
    } else {
      result = await req.db.query(`
        UPDATE export_invoice_annexures
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id IS NULL
        RETURNING *
      `, [status, id]);
    }

    if (result.rows.length === 0) {
      return next(new AppError('Document not found', 404));
    }

    return successResponse(res, result.rows[0], `Status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};
