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
import { successResponse, getPagination, paginationResponse } from '../utils/helpers.js';
import { validateUUID } from '../utils/validators.js';
import { enrichWithSnapshot } from '../services/documentSnapshotService.js';
import { generateDocumentNumber, previewDocumentNumber } from '../utils/documentNumberGenerator.js';
import { syncUpdatesAcrossStages } from '../services/exportWorkflowInterconnectionService.js';
import { notificationService } from '../services/notificationService.js';

export const getNextNumber = async (req, res, next) => {
  try {
    let companyId = req.companyFilter;
    let { exportInvoiceId } = req.query;
    if (exportInvoiceId === "") exportInvoiceId = null;

    if (!companyId && exportInvoiceId) {
      const invRes = await req.db.query('SELECT company_id FROM export_invoices WHERE id = $1', [exportInvoiceId]);
      if (invRes.rows.length > 0) {
        companyId = invRes.rows[0].company_id;
      }
    }

    if (!companyId) {
      return successResponse(res, { packing_list_no: '' }, 'Company context missing');
    }
    const gen = await previewDocumentNumber('PL', companyId, req.db);
    return successResponse(res, { packing_list_no: gen.displayNumber }, 'Next number generated');
  } catch (error) { next(error); }
};

export const getByExportInvoiceId = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const params = [exportInvoiceId];
    let whereClause = 'WHERE ei.id = $1';
    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereClause += ' AND ei.company_id IS NULL';
      } else {
        whereClause += ' AND ei.company_id = $2';
        params.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT p.id, p.packing_list_no, p.packing_list_date, p.proforma_invoice_no, p.proforma_date, p.bl_no, p.bl_date,
              p.sb_no, p.sb_date, p.country_of_origin, p.client_name, p.final_destination, p.payment_terms, 
              p.delivery_terms, p.pre_carriage_by, p.place_of_receipt, p.vessel_flight_no, p.port_of_loading, p.port_of_discharge,
              p.bank_details, p.material_description, p.total_pallets, p.total_boxes, p.total_sqm, p.total_amount, 
              p.total_weight, p.net_weight, p.gross_weight, p.pallet_type, p.made_in_india, p.tiles_back, p.boxes_marking, p.box_type,
              p.fumigation, p.legalisation, p.lc_number, p.lc_date, p.epcg_no, p.product_lines, p.container_details,
              p.consignee, p.buyer, p.buyers_order_no, p.buyers_order_date, p.shipment_terms, p.tariff_code, p.status, p.created_at, p.updated_at,
              p.is_locked, p.snapshot_data,
              ei.id as export_invoice_id, ei.invoice_no as inv_invoice_no, ei.invoice_date as inv_invoice_date, ei.client_name as inv_client_name, ei.country as inv_country,
              ei.proforma_invoice_id,
              ei.consignee_details as inv_consignee_details, ei.buyer_details as inv_buyer_details, ei.product_lines as inv_product_lines,
              ei.pallets as inv_pallets, ei.total_sqm as inv_total_sqm,
              ei.net_weight as inv_net_weight, ei.gross_weight as inv_gross_weight,
              ei.port_of_loading as inv_port_of_loading,
              ei.port_of_discharge as inv_port_of_discharge,
              ei.final_destination as inv_final_destination,
              ei.payment_terms as inv_payment_terms,
              ei.delivery_terms as inv_delivery_terms,
              ei.pre_carriage_by as inv_pre_carriage_by,
              ei.place_of_receipt as inv_place_of_receipt,
              ei.vessel_flight_no as inv_vessel_flight_no,
              ei.buyers_order_no as inv_buyers_order_no,
              ei.buyers_order_date as inv_buyers_order_date,
              ei.tariff_code as inv_tariff_code,
              ei.bl_no as inv_bl_no,
              ei.bl_date as inv_bl_date,
              ei.pallet_type as inv_pallet_type,
              ei.tiles_back as inv_tiles_back,
              ei.boxes_marking as inv_boxes_marking,
              ei.box_type as inv_box_type,
              ei.fumigation as inv_fumigation,
              ei.legalisation as inv_legalisation,
              ei.legalisation, ei.lc_number, ei.lc_date, ei.epcg_no,
              ei.lc_number as inv_lc_number, ei.lc_date as inv_lc_date, ei.epcg_no as inv_epcg_no,
              pi.invoice_no as pi_no, pi.date as pi_date,
              a.container_details as annexure_container_details, a.total_pallets as annexure_pallets,
              a.shipping_bill_no as inv_sb_no, a.shipping_bill_date as inv_sb_date,
              ei.country_of_origin as inv_country_of_origin,
              ei.updated_at as ei_updated_at,
              ei.company_id
       FROM export_invoices ei
       LEFT JOIN packing_lists p ON (p.export_invoice_id = ei.id AND p.deleted_at IS NULL)
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       LEFT JOIN export_invoice_annexures a ON (a.export_invoice_id = ei.id AND a.deleted_at IS NULL)
       ${whereClause}`,
      params
    );

    if (result.rows.length === 0) return next(new AppError('Export Invoice not found', 404));
    
    const row = result.rows[0];

    // Priority: Return immutable frozen snapshot if document is locked
    if (row.is_locked && row.snapshot_data) {
      const frozenPL = enrichWithSnapshot(row, 'PACKING_LIST');
      const companyDetails = frozenPL.company_info || {};
      const returnedData = {
        ...frozenPL,
        exists: true,
        product_lines: frozenPL.product_lines || [],
        container_details: frozenPL.shipping_details?.container_details || [],
        bank_details: companyDetails.bank_details || {}
      };
      return successResponse(res, returnedData, 'Packing List retrieved successfully (LOCKED)');
    }

    // Fetch company details separately from global DB
    let companyInfo = {};
    if (row.company_id) {
      try {
        const compRes = await req.db.globalQuery('SELECT name, address, iec_no, gstn, logo_url, bank_name, account_holder_name, account_number, swift_code, branch_name, bank_address, settings FROM companies WHERE id = $1', [row.company_id]);
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            ...c,
            company_name: c.name,
            company_address: c.address,
            company_iec: c.iec_no,
            company_gstn: c.gstn,
            logo_url: c.logo_url,
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
        debugLogger.error('Error fetching company info for PL:', err.message);
      }
    }

    const mergedRow = { ...row, ...companyInfo };
    
    // Parse JSON fields that may come as strings from DB
    const parsed = { ...row };
    if (typeof row.product_lines === 'string') {
      try { parsed.product_lines = JSON.parse(row.product_lines); } catch (e) { parsed.product_lines = []; }
    }
    if (typeof row.inv_product_lines === 'string') {
      try { parsed.inv_product_lines = JSON.parse(row.inv_product_lines); } catch (e) { parsed.inv_product_lines = []; }
    }
    if (typeof row.container_details === 'string') {
      try { parsed.container_details = JSON.parse(row.container_details); } catch (e) { parsed.container_details = []; }
    }
    if (typeof row.bank_details === 'string') {
      try { parsed.bank_details = JSON.parse(row.bank_details); } catch (e) { parsed.bank_details = {}; }
    }
    
    const p = row.id ? row : null;

    const data = {
      ...(p ? {
        ...mergedRow,
        exists: true,
        packing_list_no: p.packing_list_no || '',
        packing_list_date: p.packing_list_date || '',
        proforma_invoice_no: p.proforma_invoice_no || mergedRow.pi_no || '',
        proforma_invoice_id: p.proforma_invoice_id || mergedRow.proforma_invoice_id || null,
        proforma_date: p.proforma_date || mergedRow.pi_date || null,
        iec_no: p.iec_no || mergedRow.company_iec || '',
        gstn: p.gstn || mergedRow.company_gstn || '',
        consignee: p.consignee || '',
        consignee_details: p.consignee || '',
        buyer: p.buyer || '',
        buyer_details: p.buyer || '',
        total_pallets: p.total_pallets || 0,
        net_weight: p.net_weight || 0,
        gross_weight: p.gross_weight || 0,
        bl_no: p.bl_no || '',
        bl_date: p.bl_date || null,
        sb_no: p.sb_no || '',
        sb_date: p.sb_date || null,
        country_of_origin: p.country_of_origin || 'INDIA',
        tariff_code: p.tariff_code || '',
        port_of_loading: p.port_of_loading || '',
        port_of_discharge: p.port_of_discharge || '',
        final_destination: p.final_destination || '',
        payment_terms: p.payment_terms || '',
        delivery_terms: p.delivery_terms || '',
        pre_carriage_by: p.pre_carriage_by || '',
        place_of_receipt: p.place_of_receipt || '',
        vessel_flight_no: p.vessel_flight_no || '',
        buyers_order_no: p.buyers_order_no || '',
        buyers_order_date: p.buyers_order_date || null,
        pallet_type: p.pallet_type || '',
        tiles_back: p.tiles_back || '',
        boxes_marking: p.boxes_marking || '',
        box_type: p.box_type || '',
        fumigation: p.fumigation || '',
        legalisation: p.legalisation || '',
        lc_number: p.lc_number || mergedRow.inv_lc_number || '',
        lc_date: p.lc_date || mergedRow.inv_lc_date || null,
        epcg_no: p.epcg_no || mergedRow.inv_epcg_no || '',

        client_name: p.client_name || ''
      } : {
        ...mergedRow,
        exists: false,
        packing_list_no: mergedRow.inv_invoice_no ? `PL/${mergedRow.inv_invoice_no}` : '',
        packing_list_date: mergedRow.inv_invoice_date || null,
        proforma_invoice_no: mergedRow.inv_proforma_invoice_no || mergedRow.pi_no || '',
        proforma_invoice_id: mergedRow.proforma_invoice_id || null,
        proforma_date: mergedRow.pi_date || null,
        iec_no: mergedRow.company_iec || '',
        gstn: mergedRow.company_gstn || '',
        consignee: mergedRow.inv_consignee_details || 'TO THE ORDER',
        consignee_details: mergedRow.inv_consignee_details || 'TO THE ORDER',
        buyer: mergedRow.inv_buyer_details || 'TO THE ORDER',
        buyer_details: mergedRow.inv_buyer_details || 'TO THE ORDER',
        total_pallets: mergedRow.annexure_pallets || mergedRow.inv_pallets || 0,
        net_weight: mergedRow.inv_net_weight || 0,
        gross_weight: mergedRow.inv_gross_weight || 0,
        bl_no: mergedRow.inv_bl_no || '',
        bl_date: mergedRow.inv_bl_date || null,
        sb_no: mergedRow.inv_sb_no || '',
        sb_date: mergedRow.inv_sb_date || null,
        country_of_origin: mergedRow.inv_country_of_origin || 'INDIA',
        tariff_code: mergedRow.inv_tariff_code || '69072100',
        port_of_loading: mergedRow.inv_port_of_loading || 'MUNDRA PORT',
        port_of_discharge: mergedRow.inv_port_of_discharge || '',
        final_destination: mergedRow.inv_final_destination || '',
        payment_terms: mergedRow.inv_payment_terms || '',
        delivery_terms: mergedRow.inv_delivery_terms || '',
        pre_carriage_by: mergedRow.inv_pre_carriage_by || '',
        place_of_receipt: mergedRow.inv_place_of_receipt || '',
        vessel_flight_no: mergedRow.inv_vessel_flight_no || '',
        buyers_order_no: mergedRow.inv_buyers_order_no || '',
        buyers_order_date: mergedRow.inv_buyers_order_date || null,
        pallet_type: mergedRow.inv_pallet_type || '',
        tiles_back: mergedRow.inv_tiles_back || '',
        boxes_marking: mergedRow.inv_boxes_marking || '',
        box_type: mergedRow.inv_box_type || '',
        fumigation: mergedRow.inv_fumigation || '',
        legalisation: mergedRow.inv_legalisation || '',
        lc_number: mergedRow.inv_lc_number || mergedRow.lc_number || '',
        lc_date: mergedRow.inv_lc_date || mergedRow.lc_date || null,
        epcg_no: mergedRow.inv_epcg_no || mergedRow.epcg_no || '',

        client_name: mergedRow.inv_client_name || ''
      }),
      product_lines: parsed.product_lines || parsed.inv_product_lines || [],
      container_details: parsed.container_details || [],
      bank_details: mergedRow.bank_details || companyInfo.bank_details || {
        account_name: mergedRow.company_name || '',
        account_no: '',
        bank_name: '',
        bank_address: '',
        swift_code: ''
      }
    };

    return successResponse(res, data, 'Packing List retrieved successfully');
  } catch (error) { next(error); }
};

const _toYesNo = (v) => {
  if (v === true || v === 'true' || v === 'YES' || v === 'yes') return 'YES';
  if (v === false || v === 'false' || v === 'NO' || v === 'no') return 'NO';
  return v != null && v !== '' ? v : null;
};

const _buildUpsertParams = (body, exportInvoiceId, companyId, existingNo) => {
  const {
    packing_list_no,
    packing_list_date,
    date,
    iec_no,
    gstn,
    proforma_invoice_no,
    proforma_date,
    consignee,
    consignee_details,
    buyer,
    buyer_details,
    buyers_order_no,
    buyers_order_date,
    shipment_terms,
    tariff_code,
    bl_no,
    bl_date,
    sb_no,
    sb_date,
    country_of_origin,
    country,
    client_name,
    final_destination,
    payment_terms,
    delivery_terms,
    pre_carriage_by,
    place_of_receipt,
    vessel_flight_no,
    port_of_loading,
    port_of_discharge,
    bank_details,
    material_description,
    product_description,
    total_pallets,
    total_boxes,
    total_sqm,
    total_amount,
    total_weight,
    net_weight,
    gross_weight,
    pallet_type,
    made_in_india,
    tiles_back,
    boxes_marking,
    box_type,
    fumigation,
    legalisation,
    lc_number,
    lc_date,
    epcg_no,

    product_lines,
    container_details,
    status
  } = body;

  const coerce = (v) => (v === undefined || v === '' ? null : v);
  
  const coerceDate = (v) => {
    if (!v) return null;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    } catch(e) {
      return null;
    }
  };

  return {
    packing_list_no: coerce(packing_list_no) || existingNo,
    packing_list_date: coerceDate(packing_list_date) || coerceDate(date),
    iec_no: coerce(iec_no),
    gstn: coerce(gstn),
    proforma_invoice_no: coerce(proforma_invoice_no),
    proforma_date: coerceDate(proforma_date),
    consignee: coerce(consignee) || coerce(consignee_details),
    buyer: coerce(buyer) || coerce(buyer_details),
    buyers_order_no: coerce(buyers_order_no),
    buyers_order_date: coerceDate(buyers_order_date),
    shipment_terms: coerce(shipment_terms),
    tariff_code: coerce(tariff_code),
    bl_no: coerce(bl_no),
    bl_date: coerceDate(bl_date),
    sb_no: coerce(sb_no),
    sb_date: coerceDate(sb_date),
    country_of_origin: coerce(country_of_origin) || coerce(country),
    client_name: coerce(client_name),
    final_destination: coerce(final_destination),
    payment_terms: coerce(payment_terms),
    delivery_terms: coerce(delivery_terms),
    pre_carriage_by: coerce(pre_carriage_by),
    place_of_receipt: coerce(place_of_receipt),
    vessel_flight_no: coerce(vessel_flight_no),
    port_of_loading: coerce(port_of_loading),
    port_of_discharge: coerce(port_of_discharge),
    bank_details: bank_details ? JSON.stringify(bank_details) : null,
    material_description: coerce(material_description) || coerce(product_description),
    total_pallets: coerce(total_pallets),
    total_boxes: coerce(total_boxes),
    total_sqm: coerce(total_sqm),
    total_amount: coerce(total_amount),
    total_weight: coerce(total_weight) ?? coerce(net_weight),
    net_weight: coerce(net_weight) ?? coerce(total_weight),
    gross_weight: coerce(gross_weight),
    pallet_type: coerce(pallet_type),
    made_in_india: _toYesNo(made_in_india),
    tiles_back: coerce(tiles_back),
    boxes_marking: coerce(boxes_marking),
    box_type: coerce(box_type),
    fumigation: _toYesNo(fumigation),
    legalisation: _toYesNo(legalisation),
    lc_number: coerce(lc_number),
    lc_date: coerceDate(lc_date),
    epcg_no: coerce(epcg_no),

    product_lines: product_lines ? JSON.stringify(product_lines) : '[]',
    container_details: container_details ? JSON.stringify(container_details) : '[]',
    status: coerce(status)
  };
};

const savePackingContainers = async (client, companyId, exportInvoiceId, containerDetails, productLines) => {
  if (!exportInvoiceId) return;

  // 1. Delete existing container allocations (cascades to packing_items)
  await client.query(
    `DELETE FROM container_allocations WHERE export_invoice_id = $1 AND company_id = $2`,
    [exportInvoiceId, companyId]
  );

  // 2. Fetch Export Invoice Items
  const itemsRes = await client.query(
    `SELECT id, product_id, sku, description FROM export_invoice_items WHERE export_invoice_id = $1 AND company_id = $2`,
    [exportInvoiceId, companyId]
  );
  const invoiceItems = itemsRes.rows;

  // Helper to match item
  const findMatchingItem = (c) => {
    if (invoiceItems.length === 0) return null;
    if (invoiceItems.length === 1) return invoiceItems[0].id;
    
    const productId = c.product_id || c.productId;
    if (productId) {
      const match = invoiceItems.find(item => item.product_id === productId);
      if (match) return match.id;
    }
    
    const desc = (c.material_description || c.description || c.product_name || c.product || '').toLowerCase();
    if (desc) {
      const match = invoiceItems.find(item => 
        (item.description && item.description.toLowerCase().includes(desc)) || 
        (item.sku && item.sku.toLowerCase().includes(desc))
      );
      if (match) return match.id;
    }

    return invoiceItems[0].id;
  };

  const parsedContainers = Array.isArray(containerDetails)
    ? containerDetails
    : (typeof containerDetails === 'string' ? JSON.parse(containerDetails || '[]') : []);

  for (const c of parsedContainers) {
    const containerNo = c.container_no || c.container_number || 'UNKNOWN';
    const sealNo = c.line_seal_no || c.e_seal_no || c.seal_no || c.seal_number || null;
    const type = c.container_type || c.type || null;
    const tareWt = parseFloat(c.tare_weight || 0) || null;
    const maxPayload = parseFloat(c.max_payload || 0) || null;
    const vgmWt = parseFloat(c.vgm_weight || c.gross_weight || 0) || null;

    const allocationRes = await client.query(
      `INSERT INTO container_allocations 
       (company_id, export_invoice_id, container_number, seal_number, container_type, tare_weight, max_payload, vgm_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [companyId, exportInvoiceId, containerNo, sealNo, type, tareWt, maxPayload, vgmWt]
    );

    const allocationId = allocationRes.rows[0].id;
    const itemId = findMatchingItem(c);

    if (itemId) {
      const boxes = parseInt(c.boxes || c.boxes_packed || 0) || 0;
      const pallets = parseInt(c.pallets || c.pallets_used || 0) || 0;
      const grossWt = parseFloat(c.gross_weight || c.gross_wt || 0) || null;
      const netWt = parseFloat(c.net_weight || c.net_wt || 0) || null;

      await client.query(
        `INSERT INTO packing_items 
         (company_id, container_allocation_id, export_invoice_item_id, boxes_packed, pallets_used, gross_weight, net_weight)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [companyId, allocationId, itemId, boxes, pallets, grossWt, netWt]
      );
    }
  }
};

export const createOrUpdate = async (req, res, next) => {
  let client;
  try {
    const { exportInvoiceId } = req.params;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    client = await req.db.getClient();
    await client.query('BEGIN');

    const exportInvoice = await client.query(
      `SELECT company_id FROM export_invoices WHERE id = $1 AND company_id = $2`, [exportInvoiceId, companyId]
    );

    const existing = await client.query('SELECT id, packing_list_no FROM packing_lists WHERE export_invoice_id = $1 AND company_id = $2', [exportInvoiceId, companyId]);

    let resolvedPackingListNo;
    if (existing.rows.length === 0) {
      // Check if this export invoice has already been converted to a Packing List
      const eiCheck = await client.query(
        `SELECT is_used, is_converted, invoice_no FROM export_invoices WHERE id = $1 AND company_id = $2`,
        [exportInvoiceId, companyId]
      );
      if (eiCheck.rows.length > 0) {
        const ei = eiCheck.rows[0];
        if (ei.is_used || ei.is_converted) {
          await client.query('ROLLBACK');
          return next(new AppError(`Export Invoice ${ei.invoice_no} has already been converted to a Packing List.`, 400));
        }
      }

      // For new packing lists, always generate a new number and increment the counter
      const generated = await generateDocumentNumber('PL', companyId, client);
      resolvedPackingListNo = generated.displayNumber;

      // Double-check for uniqueness just in case of race conditions with manual/preview numbers
      const duplicateCheck = await client.query(
        'SELECT id FROM packing_lists WHERE packing_list_no = $1 AND company_id = $2 AND deleted_at IS NULL',
        [resolvedPackingListNo, companyId]
      );
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return next(new AppError(`Generated Packing List number ${resolvedPackingListNo} already exists. Please try again.`, 409));
      }
    } else {
      // For existing packing lists, preserve the original number
      resolvedPackingListNo = existing.rows[0].packing_list_no;
    }

    const p = _buildUpsertParams(req.body, exportInvoiceId, companyId, resolvedPackingListNo);
    // Force the resolved number to prevent frontend overrides during creation/update
    p.packing_list_no = resolvedPackingListNo;

    let result;
    if (existing.rows.length > 0) {
      result = await client.query(
        `UPDATE packing_lists SET
          packing_list_no = $1, packing_list_date = $2, iec_no = $3, gstn = $4,
          proforma_invoice_no = $5, proforma_date = $6, consignee = $7, buyer = $8,
          buyers_order_no = $9, buyers_order_date = $10, shipment_terms = $11, tariff_code = $12,
          bl_no = $13, bl_date = $14, sb_no = $15, sb_date = $16, country_of_origin = $17,
          final_destination = $18, payment_terms = $19, pre_carriage_by = $20, place_of_receipt = $21,
          vessel_flight_no = $22, port_of_loading = $23, port_of_discharge = $24, bank_details = $25,
          material_description = $26, total_pallets = $27, total_boxes = $28, total_sqm = $29,
          net_weight = $30, gross_weight = $31, pallet_type = $32, made_in_india = $33,
          tiles_back = $34, box_type = $35, fumigation = $36, legalisation = $37,
          status = $38, product_lines = $39, container_details = $40,
          total_amount = $41, client_name = $42, delivery_terms = $43, boxes_marking = $44,
          total_weight = $45, lc_number = $46, lc_date = $47, epcg_no = $48, updated_at = CURRENT_TIMESTAMP
        WHERE export_invoice_id = $49 AND company_id = $50 RETURNING *`,
        [
          p.packing_list_no, p.packing_list_date, p.iec_no, p.gstn,
          p.proforma_invoice_no, p.proforma_date, p.consignee, p.buyer,
          p.buyers_order_no, p.buyers_order_date, p.shipment_terms, p.tariff_code,
          p.bl_no, p.bl_date, p.sb_no, p.sb_date, p.country_of_origin,
          p.final_destination, p.payment_terms, p.pre_carriage_by, p.place_of_receipt,
          p.vessel_flight_no, p.port_of_loading, p.port_of_discharge, p.bank_details,
          p.material_description, p.total_pallets, p.total_boxes, p.total_sqm,
          p.net_weight, p.gross_weight, p.pallet_type, p.made_in_india,
          p.status, p.product_lines, p.container_details,
          p.total_amount, p.client_name, p.delivery_terms, p.boxes_marking,
          p.total_weight, p.lc_number, p.lc_date, p.epcg_no, exportInvoiceId, companyId
        ]
      );
    } else {
      result = await client.query(
        `INSERT INTO packing_lists (
          company_id, export_invoice_id, packing_list_no, packing_list_date, iec_no, gstn,
          proforma_invoice_no, proforma_date, consignee, buyer, buyers_order_no, buyers_order_date,
          shipment_terms, tariff_code, bl_no, bl_date, sb_no, sb_date, country_of_origin,
          final_destination, payment_terms, delivery_terms, pre_carriage_by, place_of_receipt, vessel_flight_no,
          port_of_loading, port_of_discharge, bank_details, material_description, total_pallets,
          total_boxes, total_sqm, total_amount, total_weight, net_weight, gross_weight, pallet_type, made_in_india,
          tiles_back, boxes_marking, box_type, fumigation, legalisation, lc_number, lc_date, epcg_no,
          product_lines, container_details, client_name, status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
          $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,
          $39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50
        ) RETURNING *`,
        [
          companyId, exportInvoiceId, p.packing_list_no, p.packing_list_date, p.iec_no, p.gstn,
          p.proforma_invoice_no, p.proforma_date, p.consignee, p.buyer, p.buyers_order_no, p.buyers_order_date,
          p.shipment_terms, p.tariff_code, p.bl_no, p.bl_date, p.sb_no, p.sb_date, p.country_of_origin,
          p.final_destination, p.payment_terms, p.delivery_terms, p.pre_carriage_by, p.place_of_receipt, p.vessel_flight_no,
          p.port_of_loading, p.port_of_discharge, p.bank_details, p.material_description, p.total_pallets,
          p.total_boxes, p.total_sqm, p.total_amount, p.total_weight, p.net_weight, p.gross_weight, p.pallet_type, p.made_in_india,
          p.tiles_back, p.boxes_marking, p.box_type, p.fumigation, p.legalisation, p.lc_number, p.lc_date, p.epcg_no,
          p.product_lines, p.container_details, p.client_name, p.status
        ]
      );

      // Mark the parent Export Invoice as converted
      const packingListId = result.rows[0].id;
      await client.query(
        `UPDATE export_invoices 
          SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
          WHERE id = $2 AND company_id = $3`,
        [packingListId, exportInvoiceId, companyId]
      );
    }

    // Sync to relational tables
    await savePackingContainers(
      client,
      companyId,
      exportInvoiceId,
      p.container_details,
      p.product_lines ? JSON.parse(p.product_lines) : []
    );

    await client.query('COMMIT');
    
    // Sync updates to downstream documents
    const companyIdForSync = companyId || req.companyFilter;
    if (companyIdForSync) {
      const changedKeys = Object.keys(p);
      syncUpdatesAcrossStages(exportInvoiceId, 'packing_list', changedKeys, companyIdForSync, req.db).catch(err => {
      });
    }

    // Notify relevant roles about the new packing list
    if (!existing || existing.rows.length === 0) {
      notificationService.notifyPackingListCreated(companyId, result.rows[0], req.db).catch(err => debugLogger.warn('Notification', err.message));
    }

    return successResponse(res, result.rows[0], 'Packing List saved successfully');
  } catch (error) { 
    if (client) await client.query('ROLLBACK').catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
    next(error); 
  } finally {
    if (client) client.release();
  }
};

export const updateById = async (req, res, next) => {
  let client;
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Packing List ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    client = await req.db.getClient();
    await client.query('BEGIN');

    const existing = await client.query('SELECT id, packing_list_no, export_invoice_id FROM packing_lists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Packing List not found', 404));
    }

    const row = existing.rows[0];
    const p = _buildUpsertParams(req.body, row.export_invoice_id, null, row.packing_list_no);

    const result = await client.query(
      `UPDATE packing_lists SET
        packing_list_no = $1, packing_list_date = $2, iec_no = $3, gstn = $4,
        proforma_invoice_no = $5, proforma_date = $6, consignee = $7, buyer = $8,
        buyers_order_no = $9, buyers_order_date = $10, shipment_terms = $11, tariff_code = $12,
        bl_no = $13, bl_date = $14, sb_no = $15, sb_date = $16, country_of_origin = $17,
        final_destination = $18, payment_terms = $19, pre_carriage_by = $20, place_of_receipt = $21,
        vessel_flight_no = $22, port_of_loading = $23, port_of_discharge = $24, bank_details = $25,
        material_description = $26, total_pallets = $27, total_boxes = $28, total_sqm = $29,
        net_weight = $30, gross_weight = $31, pallet_type = $32, made_in_india = $33,
        tiles_back = $34, box_type = $35, fumigation = $36, legalisation = $37,
        status = $38, product_lines = $39, container_details = $40,
        total_amount = $41, client_name = $42, delivery_terms = $43, boxes_marking = $44,
        total_weight = $45, lc_number = $46, lc_date = $47, epcg_no = $48, updated_at = CURRENT_TIMESTAMP
      WHERE id = $49 RETURNING *`,
      [
        p.packing_list_no, p.packing_list_date, p.iec_no, p.gstn,
        p.proforma_invoice_no, p.proforma_date, p.consignee, p.buyer,
        p.buyers_order_no, p.buyers_order_date, p.shipment_terms, p.tariff_code,
        p.bl_no, p.bl_date, p.sb_no, p.sb_date, p.country_of_origin,
        p.final_destination, p.payment_terms, p.pre_carriage_by, p.place_of_receipt,
        p.vessel_flight_no, p.port_of_loading, p.port_of_discharge, p.bank_details,
        p.material_description, p.total_pallets, p.total_boxes, p.total_sqm,
        p.net_weight, p.gross_weight, p.pallet_type, p.made_in_india,
        p.tiles_back, p.box_type, p.fumigation, p.legalisation,
        p.status, p.product_lines, p.container_details,
        p.total_amount, p.client_name, p.delivery_terms, p.boxes_marking,
        p.total_weight, p.lc_number, p.lc_date, p.epcg_no, id
      ]
    );

    const companyId = req.companyFilter || req.user?.companyId;
    if (row.export_invoice_id && companyId) {
      await savePackingContainers(
        client,
        companyId,
        row.export_invoice_id,
        p.container_details,
        p.product_lines ? JSON.parse(p.product_lines) : []
      );
    }

    await client.query('COMMIT');

    // Sync updates to downstream documents
    if (companyId && row.export_invoice_id) {
      const changedKeys = Object.keys(p);
      syncUpdatesAcrossStages(row.export_invoice_id, 'packing_list', changedKeys, companyId, req.db).catch(err => {
      });
    }

    return successResponse(res, result.rows[0], 'Packing List updated successfully');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const create = async (req, res, next) => {
  let client;
  try {
    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    client = await req.db.getClient();
    await client.query('BEGIN');

    let resolvedPackingListNo;
    if (!req.body.id) {
      // For new packing lists, always generate a new number and increment the counter
      const generated = await generateDocumentNumber('PL', companyId, client);
      resolvedPackingListNo = generated.displayNumber;

      // Uniqueness check
      const duplicateCheck = await client.query(
        'SELECT id FROM packing_lists WHERE packing_list_no = $1 AND company_id = $2 AND deleted_at IS NULL',
        [resolvedPackingListNo, companyId]
      );
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return next(new AppError(`Generated Packing List number ${resolvedPackingListNo} already exists.`, 409));
      }
    } else {
      resolvedPackingListNo = req.body.packing_list_no;
    }

    const exportInvoiceId = req.body.exportInvoiceId || req.body.export_invoice_id || null;
    const p = _buildUpsertParams(req.body, exportInvoiceId, companyId, resolvedPackingListNo);
    p.packing_list_no = resolvedPackingListNo;

    const result = await client.query(
      `INSERT INTO packing_lists (
        company_id, export_invoice_id, packing_list_no, packing_list_date, iec_no, gstn,
        proforma_invoice_no, proforma_date, consignee, buyer, buyers_order_no, buyers_order_date,
        shipment_terms, tariff_code, bl_no, bl_date, sb_no, sb_date, country_of_origin,
        final_destination, payment_terms, delivery_terms, pre_carriage_by, place_of_receipt, vessel_flight_no,
        port_of_loading, port_of_discharge, bank_details, material_description, total_pallets,
        total_boxes, total_sqm, total_amount, total_weight, net_weight, gross_weight, pallet_type, made_in_india,
        tiles_back, boxes_marking, box_type, fumigation, legalisation, lc_number, lc_date, epcg_no,
        product_lines, container_details, client_name, status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,
        $39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50
      ) RETURNING *`,
      [
        companyId, exportInvoiceId, p.packing_list_no, p.packing_list_date, p.iec_no, p.gstn,
        p.proforma_invoice_no, p.proforma_date, p.consignee, p.buyer, p.buyers_order_no, p.buyers_order_date,
        p.shipment_terms, p.tariff_code, p.bl_no, p.bl_date, p.sb_no, p.sb_date, p.country_of_origin,
        p.final_destination, p.payment_terms, p.delivery_terms, p.pre_carriage_by, p.place_of_receipt, p.vessel_flight_no,
        p.port_of_loading, p.port_of_discharge, p.bank_details, p.material_description, p.total_pallets,
        p.total_boxes, p.total_sqm, p.total_amount, p.total_weight, p.net_weight, p.gross_weight, p.pallet_type, p.made_in_india,
        p.tiles_back, p.boxes_marking, p.box_type, p.fumigation, p.legalisation, p.lc_number, p.lc_date, p.epcg_no,
        p.product_lines, p.container_details, p.client_name, p.status
      ]
    );

    if (exportInvoiceId) {
      await savePackingContainers(
        client,
        companyId,
        exportInvoiceId,
        p.container_details,
        p.product_lines ? JSON.parse(p.product_lines) : []
      );
    }

    await client.query('COMMIT');

    return successResponse(res, result.rows[0], 'Packing List created successfully');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);
    const params = [];
    let paramCount = 1;
    let whereClause = 'WHERE p.deleted_at IS NULL';
    
    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereClause += ' AND p.company_id IS NULL';
      } else {
        whereClause += ` AND p.company_id = $${paramCount}`;
        params.push(req.companyFilter);
        paramCount++;
      }
    }
    
    const countResult = await req.db.query(`SELECT COUNT(*) FROM packing_lists p ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    if (total === 0) {
      return successResponse(res, { data: [], total: 0, page: parseInt(page), limit: parseInt(limit) }, 'No packing lists found');
    }

    const result = await req.db.query(
      `SELECT p.*, ei.invoice_no as export_invoice_no, ei.client_name as inv_client_name 
       FROM packing_lists p
       LEFT JOIN export_invoices ei ON p.export_invoice_id = ei.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, pageLimit, offset]
    );
    const rows = result.rows.map(r => {
      const parsed = { ...r };
      // Parse JSON fields that may come as strings from DB
      if (typeof r.product_lines === 'string') {
        try { parsed.product_lines = JSON.parse(r.product_lines); } catch (e) { parsed.product_lines = []; }
      }
      if (typeof r.container_details === 'string') {
        try { parsed.container_details = JSON.parse(r.container_details); } catch (e) { parsed.container_details = []; }
      }
      if (typeof r.bank_details === 'string') {
        try { parsed.bank_details = JSON.parse(r.bank_details); } catch (e) { parsed.bank_details = {}; }
      }
      return {
        ...parsed,
        export_invoice_no: r.export_invoice_no || r.packing_list_no,
        client_name: r.client_name || r.inv_client_name,
        date: r.packing_list_date || r.date,
        total_weight: r.total_weight || r.net_weight || 0
      };
    });
    return successResponse(res, paginationResponse(rows, total, page, limit), 'Packing lists retrieved successfully');
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const params = [id];
    let whereClause = 'WHERE p.id = $1';
    
    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereClause += ' AND p.company_id IS NULL';
      } else {
        whereClause += ' AND p.company_id = $2';
        params.push(req.companyFilter);
      }
    }
    
    const result = await req.db.query(
      `SELECT p.*, ei.invoice_no as export_invoice_no, ei.client_name as inv_client_name,
              ei.invoice_date, ei.consignee_details as inv_consignee_details,
              ei.buyer_details as inv_buyer_details,
              ei.product_lines as inv_product_lines,
              pi.invoice_no as pi_no,
              pi.date as pi_date,
              pi.product_lines as pi_product_lines,
              ei.updated_at as ei_updated_at
       FROM packing_lists p
       LEFT JOIN export_invoices ei ON p.export_invoice_id = ei.id
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       ${whereClause}`,
      params
    );
    if (result.rows.length === 0) return next(new AppError('Packing List not found', 404));
    const row = result.rows[0];
    
    // Parse JSON fields that may come as strings from DB
    const parsed = { ...row };
    if (typeof row.product_lines === 'string') {
      try { parsed.product_lines = JSON.parse(row.product_lines); } catch (e) { parsed.product_lines = []; }
    }
    if (typeof row.inv_product_lines === 'string') {
      try { parsed.inv_product_lines = JSON.parse(row.inv_product_lines); } catch (e) { parsed.inv_product_lines = []; }
    }
    if (typeof row.pi_product_lines === 'string') {
      try { parsed.pi_product_lines = JSON.parse(row.pi_product_lines); } catch (e) { parsed.pi_product_lines = []; }
    }
    if (typeof row.container_details === 'string') {
      try { parsed.container_details = JSON.parse(row.container_details); } catch (e) { parsed.container_details = []; }
    }
    if (typeof row.bank_details === 'string') {
      try { parsed.bank_details = JSON.parse(row.bank_details); } catch (e) { parsed.bank_details = {}; }
    }
    
    const data = {
      ...parsed,
      export_invoice_no: row.export_invoice_no,
      client_name: row.client_name || row.inv_client_name,
      consignee_details: row.consignee || row.inv_consignee_details || '',
      buyer_details: row.buyer || row.inv_buyer_details || '',
      product_lines: parsed.product_lines || parsed.inv_product_lines || [],
      pi_product_lines: parsed.pi_product_lines || [],
      proforma_invoice_no: row.proforma_invoice_no || row.pi_no || '',
      proforma_date: row.proforma_date || row.pi_date || null,
      date: row.packing_list_date || row.invoice_date
    };

    // Enrich product lines with master product data if IDs are present
    if (data.product_lines && Array.isArray(data.product_lines)) {
      try {
        const productIds = data.product_lines
          .map(l => l.product_id || l.productId || l.id)
          .filter(id => id && validateUUID(id).isValid);

        if (productIds.length > 0) {
          const productRes = await req.db.query(
            'SELECT id, name, description, size, surface, category, thickness, company_product_name, factory_product_name FROM products WHERE id = ANY($1)',
            [productIds]
          );
          
          const productMap = {};
          productRes.rows.forEach(p => { productMap[p.id] = p; });

          data.product_lines = data.product_lines.map(l => {
            const master = productMap[l.product_id || l.productId || l.id];
            if (master) {
              // Construct a high-fidelity fallback description if none exists
              const autoDesc = [
                master.category,
                master.company_product_name || master.name,
                master.surface,
                master.size ? (master.thickness ? `${master.size}X${master.thickness}` : master.size) : ''
              ].filter(Boolean).join(' ');

              return {
                ...l,
                productName: l.product_name || l.productName || master.name,
                product_name: l.product_name || l.productName || master.name,
                description: l.description || l.product_description || master.description || autoDesc || '',
                size: l.size || master.size || '',
                surface: l.surface || master.surface || '',
                thickness: l.thickness || master.thickness || ''
              };
            }
            return l;
          });
        }
      } catch (err) {
        debugLogger.error('Error enriching product lines for PL:', err.message);
      }
    }

    // Fetch company details from global DB
    let companyInfo = null;
    if (row.company_id) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT name, address, iec_no, gstn, pan, logo_url, bank_name, account_holder_name, account_number, swift_code, branch_name, bank_address, settings FROM companies WHERE id = $1',
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
            logo_url: c.logo_url,
            bank_details: {
              bank_name: c.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
              account_name: c.account_holder_name || (settings.bank_details && settings.bank_details.account_name) || '',
              account_no: c.account_number || (settings.bank_details && settings.bank_details.account_no) || '',
              swift_code: c.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
              bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
            }
          };
      } catch (err) {
        debugLogger.error('Error fetching company info for PL by ID:', err.message);
      }
    }

    return successResponse(res, { ...data, company_info: companyInfo }, 'Packing List retrieved successfully');
  } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await req.db.query(`UPDATE packing_lists SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id`, [id, req.companyFilter]);
    if (result.rowCount === 0) return next(new AppError('Packing List not found', 404));
    return successResponse(res, null, 'Packing List deleted successfully');
  } catch (error) { next(error); }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Packing List ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const existing = await req.db.query(`SELECT id FROM packing_lists WHERE id = $1 AND company_id = $2`, [id, req.companyFilter]);
    if (existing.rows.length === 0) return next(new AppError('Packing List not found', 404));

    await req.db.query(`DELETE FROM packing_lists WHERE id = $1 AND company_id = $2`, [id, req.companyFilter]);
    return successResponse(res, null, 'Packing List permanently deleted');
  } catch (error) { next(error); }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    const current = await req.db.query(
      'SELECT status FROM packing_lists WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (current.rows.length === 0) {
      return next(new AppError('Packing list not found', 404));
    }

    const currentStatus = current.rows[0].status;
    const newStatus = (currentStatus === 'Completed' || currentStatus === 'Confirmed') ? 'Draft' : 'Completed';

    const result = await req.db.query(
      'UPDATE packing_lists SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
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
        UPDATE packing_lists
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `, [status, id, companyId]);
    } else {
      result = await req.db.query(`
        UPDATE packing_lists
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
