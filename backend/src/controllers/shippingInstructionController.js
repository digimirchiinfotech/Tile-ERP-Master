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
import { successResponse } from '../utils/helpers.js';
import { validateUUID } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateDocumentNumber, previewDocumentNumber } from '../utils/documentNumberGenerator.js';
import { syncUpdatesAcrossStages } from '../services/exportWorkflowInterconnectionService.js';
import { selfHealTenantSchema } from '../services/exportDocumentReferenceService.js';
import { notificationService } from '../services/notificationService.js';

const normalizeRow = (row) => ({
  ...row,
  instructionNo: row.si_no || row.instructionNo || '',
  clientName: row.client_name || row.clientName || '',
  date: row.si_date || row.date || row.created_at,
  bookingNo: row.booking_no || row.bookingNo || '',
  vgmNo: row.vgm_no || row.vgmNo || '',
  piNo: row.pi_no || row.piNo || '',
  piDate: row.pi_date || row.piDate || '',
  invoiceDate: row.ei_invoice_date || row.invoice_date || row.invoiceDate || '',
  exportInvoiceNo: row.export_invoice_no || row.exportInvoiceNo || row.invoice_no || '',
  plNo: row.pl_no || row.plNo || '',
  annexureNo: row.annexure_no || row.annexureNo || '',
  backsideNo: row.backside_no || row.backsideNo || '',
  exporterDetails: row.shipper_details || row.exporterDetails || '',
  consigneeDetails: row.consignee_details || row.consigneeDetails || '',
  notifyParty1: row.notify_party_details || row.notifyParty1 || '',
  notifyParty2: row.notify_party_address || row.notify_party2 || row.notifyParty2 || '',
  vesselName: row.vessel_name || row.vesselName || '',
  voyageNo: row.voyage_no || row.voyageNo || '',
  vessel_voyage: row.vessel_voyage || '',
  etd: row.etd || '',
  pol: row.port_of_loading || row.pol || '',
  pod: row.port_of_discharge || row.pod || '',
  finalDestination: row.final_destination || row.place_of_delivery || row.finalDestination || '',
  blType: row.bl_instruction || row.blType || '',
  bietcNumber: row.bietc_number || row.bietcNumber || '',
  freightPayableAt: row.freight_details || row.freightPayableAt || '',
  hsCode: row.hs_code || row.hsCode || '',
  totalPallets: row.total_pallets || row.totalPallets || 0,
  totalBoxes: row.total_boxes || row.totalBoxes || 0,
  totalSqm: row.total_sqm || row.totalSqm || 0,
  totalNetWeight: row.total_net_weight || row.totalNetWeight || 0,
  totalGrossWeight: row.total_gross_weight || row.totalGrossWeight || 0,
  sbNo: row.shipping_bill_no || row.sbNo || row.ei_sb_no || '',
  sbDate: row.shipping_bill_date || row.sbDate || row.ei_sb_date || '',
  containerDetails: row.container_details || row.containerDetails || row.vgm_containers || [],
  freightForwarder: row.freight_forwarder || row.freightForwarder || row.freight_details || '',
  invoiceReference: row.export_invoice_no || row.invoice_no || row.invoiceReference || '',
  vgmId: row.vgm_id || row.vgm_document_id || null,
  vgmNo: row.vgm_no || row.vgmNo || '',
  urgency: row.urgency || 'Normal',
  status: row.status || 'Draft',
  siDescription: row.description_of_goods || row.descriptionOfGoods || row.siDescription || row.si_description || row.goods_description || row.material_header_description || row.backside_goods || row.backsideGoods || row.annexure_goods || row.annexureGoods || '',
  description_of_goods: row.description_of_goods || row.descriptionOfGoods || row.siDescription || row.si_description || row.goods_description || row.material_header_description || row.backside_goods || row.backsideGoods || row.annexure_goods || row.annexureGoods || '',
  marks_and_nos: row.marks_and_nos || row.marksAndNos || '-',
  countryOfOrigin: row.country_of_origin || row.countryOfOrigin || ''
});

const buildValues = (body) => {
  const vname = body.vesselName || body.vessel_name || null;
  const vno = body.voyageNo || body.voyage_no || null;

  // Helper to ensure multi-line text is saved as plain string, but objects are stringified
  const ensureString = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return JSON.stringify(val);
    return val; // If it's already a string, don't re-serialize it
  };

  const ensureJson = (val) => {
    if (!val) return '[]';
    if (typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'string') {
      try {
        JSON.parse(val);
        return val;
      } catch (e) {
        // If it's a plain string, wrap it in an array so it's valid JSON
        return JSON.stringify([val]);
      }
    }
    return '[]';
  };

  return {
    si_no: body.instructionNo || body.instruction_no || body.si_no || null,
    si_date: body.date || body.si_date || null,
    date: body.date || body.si_date || null,
    export_invoice_no: body.exportInvoiceNo || body.export_invoice_no || null,
    booking_no: body.bookingNo || body.booking_no || null,
    vessel_voyage: body.vessel_voyage || body.vesselVoyage || (vname ? `${vname}/${vno || ''}` : null),
    port_of_loading: body.pol || body.port_of_loading || null,
    port_of_discharge: body.pod || body.port_of_discharge || null,
    place_of_delivery: body.finalDestination || body.final_destination || body.place_of_delivery || null,
    shipper_details: ensureString(body.exporterDetails || body.exporter_details || body.shipper_details),
    consignee_details: ensureString(body.consigneeDetails || body.consignee_details || body.consignee_details),
    notify_party_details: body.notifyParty1 || body.notify_party1 || body.notify_party_1 || body.notifyParty || body.notify_party_details || null,
    notify_party_address: body.notifyParty2 || body.notify_party2 || body.notify_party_2 || null,
    container_details: ensureJson(body.containerDetails || body.container_details),
    marks_and_nos: body.marksAndNos || body.marks_and_nos || null,
    description_of_goods: body.siDescription || body.si_description || body.descriptionOfGoods || body.description_of_goods || null,
    total_packages: body.totalBoxes || body.total_boxes || body.total_packages || null,
    gross_weight: body.totalGrossWeight || body.total_gross_weight || body.gross_weight || null,
    net_weight: body.totalNetWeight || body.total_net_weight || body.net_weight || null,
    freight_details: body.freightPayableAt || body.freight_payable_at || body.freightDetails || body.freight_details || null,
    bl_instruction: body.blType || body.bl_type || body.bl_instruction || null,
    status: body.status || 'Draft',
    vessel_name: vname,
    voyage_no: vno,
    etd: body.etd || null,
    hs_code: body.hsCode || body.hs_code || null,
    total_pallets: body.totalPallets || body.total_pallets || null,
    total_boxes: body.totalBoxes || body.total_boxes || null,
    total_sqm: body.totalSqm || body.total_sqm || null,
    total_net_weight: body.totalNetWeight || body.total_net_weight || null,
    total_gross_weight: body.totalGrossWeight || body.total_gross_weight || null,
    bietc_number: body.bietcNumber || body.bietc_number || null,
    shipping_bill_no: body.sbNo || body.sb_no || body.shipping_bill_no || null,
    shipping_bill_date: body.sbDate || body.sb_date || body.shipping_bill_date || null,
    final_destination: body.finalDestination || body.final_destination || null,
    client_name: body.clientName || body.client_name || null,
    urgency: body.urgency || 'Normal',
    vgm_id: body.vgmId || body.vgm_id || null,
    freight_forwarder: body.freightForwarder || body.freight_forwarder || null,
    country_of_origin: body.country_of_origin || body.countryOfOrigin || null,
    pi_no: body.piNo || body.pi_no || null,
    pl_no: body.plNo || body.pl_no || null,
    annexure_no: body.annexureNo || body.annexure_no || null,
    backside_no: body.backsideNo || body.backside_no || null,
    vgm_no: body.vgmNo || body.vgm_no || null
  };
};

export const getByExportInvoiceId = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const companyId = req.companyFilter || req.user?.companyId;
    // Self-heal before retrieval
    await selfHealTenantSchema(req.db, companyId);

    // Try to get existing Shipping Instruction
    const result = await req.db.query(
      `SELECT si.*, 
               ei.invoice_no as export_invoice_no, 
               ei.invoice_date as ei_invoice_date,
               ei.client_name,
               pi.invoice_no as pi_no,
               pi.date as pi_date,
               COALESCE(si.booking_no, ei.booking_no) as booking_no,
               COALESCE(si.port_of_loading, ei.port_of_loading) as port_of_loading,
               COALESCE(si.port_of_discharge, ei.port_of_discharge) as port_of_discharge,
               COALESCE(si.final_destination, ei.final_destination) as final_destination,
               COALESCE(si.vessel_name, ei.vessel_flight_no) as vessel_name,
               COALESCE(si.vgm_no, v.vgm_no) as vgm_no,
               COALESCE(si.pl_no, pl.packing_list_no) as pl_no,
               COALESCE(si.annexure_no, an.annexure_no) as annexure_no,
               COALESCE(si.backside_no, ib.backside_no) as backside_no,
               ei.product_lines as inherited_product_details,
               COALESCE(v.container_sheet, an.container_details, pl.container_details) as inherited_container_details
        FROM shipping_instructions si
        LEFT JOIN export_invoices ei ON si.export_invoice_id = ei.id
        LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
        LEFT JOIN vgm_documents v ON v.export_invoice_id = ei.id AND v.deleted_at IS NULL
        LEFT JOIN packing_lists pl ON pl.export_invoice_id = ei.id AND pl.deleted_at IS NULL
        LEFT JOIN invoice_backside ib ON ib.export_invoice_id = ei.id AND ib.deleted_at IS NULL
        LEFT JOIN export_invoice_annexures an ON an.export_invoice_id = ei.id AND an.deleted_at IS NULL
        WHERE si.export_invoice_id = $1 AND si.deleted_at IS NULL
        ${req.companyFilter ? `AND si.company_id = $2` : (req.hasOwnProperty('companyFilter') ? `AND si.company_id IS NULL` : '')}`,
      req.companyFilter ? [exportInvoiceId, req.companyFilter] : [exportInvoiceId]
    );

    if (result.rows.length > 0) {
      const si = result.rows[0];
      // Fetch company details from global DB
      let companyInfo = null;
      if (si.company_id) {
        try {
          const compRes = await req.db.globalQuery(
            'SELECT * FROM companies WHERE id = $1',
            [si.company_id]
          );
          if (compRes.rows.length > 0) {
            const c = compRes.rows[0];
            const settings = c.settings || {};
            companyInfo = {
              ...c,
              logo_url: c.logo_url || settings.logo_url || '',
              bank_details: {
                bank_name: c.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
                account_name: c.account_holder_name || (settings.bank_details && settings.bank_details.account_name) || '',
                account_no: c.account_number || (settings.bank_details && settings.bank_details.account_no) || '',
                swift_code: c.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
                bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
              },
              range_name: c.range_name || settings.range_name || '',
              division: c.division || settings.division || '',
              commissionerate: c.commissionerate || settings.commissionerate || ''
            };
          }
        } catch (err) {
          debugLogger.error('Error fetching company info for SI:', err.message);
        }
      }
      return successResponse(res, { ...normalizeRow(si), company_info: companyInfo }, 'SI retrieved');
    }

    // If no SI, construct fallback from VGM > Packing List > Export Invoice
    const fallbackResult = await req.db.query(
      `SELECT ei.invoice_no as export_invoice_no, 
              ei.invoice_date as ei_invoice_date,
              COALESCE(ei.booking_no, ib.booking_no, v.booking_number) as booking_no, 
              COALESCE(ei.vessel_flight_no, ib.vessel_name) as vessel_voyage,
              COALESCE(ei.port_of_loading, ib.port_of_loading) as port_of_loading,
              COALESCE(ei.port_of_discharge, ib.port_of_discharge) as port_of_discharge,
              COALESCE(ei.final_destination, ib.final_destination) as place_of_delivery,
              COALESCE(ei.consignee_details, ib.consignee_details) as consignee_details,
              COALESCE(ei.buyer_details, ib.buyer_details) as buyer_details,
              ei.boxes_marking as marks_and_nos,
              pi.invoice_no as pi_no, pi.date as pi_date,
              ei.company_id,
              v.id as vgm_id, v.vgm_no, 
              COALESCE(v.container_sheet, v.containers, ib.container_details, pl.container_details) as vgm_containers,
              pl.packing_list_no as pl_no, 
              an.annexure_no as annexure_no,
              an.product_description as annexure_goods,
              ib.backside_no as backside_no,
              ib.goods_description as backside_goods,
              ei.country_of_origin as ei_country_of_origin,
              ei.product_lines as inherited_product_details
       FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       LEFT JOIN vgm_documents v ON v.export_invoice_id = ei.id AND v.deleted_at IS NULL
       LEFT JOIN packing_lists pl ON pl.export_invoice_id = ei.id AND pl.deleted_at IS NULL
       LEFT JOIN invoice_backside ib ON ib.export_invoice_id = ei.id AND ib.deleted_at IS NULL
       LEFT JOIN export_invoice_annexures an ON ei.id = an.export_invoice_id AND an.deleted_at IS NULL
       WHERE ei.id = $1 ${req.companyFilter ? `AND ei.company_id = $2` : (req.hasOwnProperty('companyFilter') ? `AND ei.company_id IS NULL` : '')}`,
      req.companyFilter ? [exportInvoiceId, req.companyFilter] : [exportInvoiceId]
    );

    if (fallbackResult.rows.length === 0) return successResponse(res, null, 'SI not found');

    const row = fallbackResult.rows[0];

    // Fetch company details separately from global DB
    let companyInfo = {};
    if (row.company_id) {
      try {
        const compRes = await req.db.globalQuery('SELECT name, address, iec_no, gstn, logo_url, lut_arn_no, lut_date, permission_no, bank_name, account_holder_name, account_number, swift_code, branch_name, bank_address, settings FROM companies WHERE id = $1', [row.company_id]);
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          companyInfo = {
            company_name: c.name,
            company_address: c.address,
            company_iec: c.iec_no,
            company_gstn: c.gstn,
            logo_url: c.logo_url || (c.settings && c.settings.logo_url) || '',
            lut_arn_no: c.lut_arn_no || '',
            lut_date: c.lut_date || '',
            permission_no: c.permission_no || '',
            bank_details: {
              bank_name: c.bank_name || '',
              account_name: c.account_holder_name || '',
              account_no: c.account_number || '',
              swift_code: c.swift_code || '',
              bank_address: c.bank_address || c.branch_name || ''
            },
            range_name: c.range_name || (c.settings && c.settings.range_name) || '',
            division: c.division || (c.settings && c.settings.division) || '',
            commissionerate: c.commissionerate || (c.settings && c.settings.commissionerate) || ''
          };
        }
      } catch (err) {
        debugLogger.error('Error fetching company info for SI:', err.message);
      }
    }

    const mergedRow = { ...row, ...companyInfo };

    // Construct Shipper Details from Company Info
    const shipper_details = `${mergedRow.company_name || ''}\n${mergedRow.company_address || ''}\nIEC: ${mergedRow.company_iec || ''}\nGSTN: ${mergedRow.company_gstn || ''}`;

    // Prefer containers from VGM, then Packing List
    let containers = [];
    const rawContainers = row.vgm_containers || row.pl_containers || [];
    try {
      containers = typeof rawContainers === 'string' ? JSON.parse(rawContainers) : rawContainers;
    } catch (e) { debugLogger.error('Error parsing containers for SI fallback:', e); }

    const fallbackData = normalizeRow({
      si_no: '',
      si_date: new Date().toISOString().split('T')[0],
      export_invoice_no: mergedRow.export_invoice_no,
      pi_no: mergedRow.pi_no,
      pi_date: mergedRow.pi_date,
      pl_no: mergedRow.pl_no,
      annexure_no: mergedRow.annexure_no,
      backside_no: mergedRow.backside_no,
      vgm_no: mergedRow.vgm_no,
      inherited_product_details: mergedRow.inherited_product_details,
      inherited_container_details: containers,
      booking_no: mergedRow.booking_no,
      vessel_voyage: mergedRow.vessel_voyage,
      port_of_loading: mergedRow.port_of_loading,
      port_of_discharge: mergedRow.port_of_discharge,
      place_of_delivery: mergedRow.place_of_delivery,
      shipper_details: shipper_details,
      consignee_details: mergedRow.consignee_details || 'TO THE ORDER',
      notify_party_details: mergedRow.buyer_details || 'SAME AS CONSIGNEE',
      container_details: containers,
      description_of_goods: mergedRow.backside_goods || mergedRow.annexure_goods || 'GLAZED PORCELAIN TILES',
      marks_and_nos: mergedRow.marks_and_nos || '-',
      client_name: mergedRow.client_name,
      countryOfOrigin: mergedRow.ei_country_of_origin || 'INDIA',
      company_id: mergedRow.company_id
    });
    return successResponse(res, { ...fallbackData, company_info: companyInfo }, 'SI fallback retrieved');
  } catch (error) { next(error); }
};


export const createOrUpdate = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const companyId = req.companyFilter || req.user?.companyId;
    // Self-heal before save
    await selfHealTenantSchema(req.db, companyId);

    const body = req.body;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    const invoiceRes = await req.db.query(
      `SELECT id FROM export_invoices WHERE id = $1 AND company_id = $2`,
      [exportInvoiceId, companyId]
    );
    if (invoiceRes.rows.length === 0) {
      return next(new AppError('Export Invoice not found', 404));
    }

    const existing = await req.db.query(
      `SELECT id, si_no, deleted_at FROM shipping_instructions WHERE export_invoice_id = $1 AND company_id = $2`,
      [exportInvoiceId, companyId]
    );

    const vgmRow = await req.db.query(
      'SELECT id, is_used, is_converted, vgm_no FROM vgm_documents WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [exportInvoiceId, companyId]
    );
    if (vgmRow.rows.length === 0) {
      return next(new AppError('A VGM must be created before you can create a Shipping Instruction.', 400));
    }

    let siNo;
    if (existing.rows.length === 0) {
      // Check if this VGM has already been converted to a Shipping Instruction
      const vgm = vgmRow.rows[0];
      if (vgm.is_used || vgm.is_converted) {
        return next(new AppError(`VGM ${vgm.vgm_no} has already been converted to a Shipping Instruction.`, 400));
      }

      // New SI - always generate a fresh sequential number on the backend
      const gen = await generateDocumentNumber('SI', companyId, req.db);
      siNo = gen.displayNumber;

      // Final uniqueness check
      const duplicateCheck = await req.db.query(
        'SELECT id FROM shipping_instructions WHERE si_no = $1 AND company_id = $2 AND deleted_at IS NULL',
        [siNo, companyId]
      );
      if (duplicateCheck.rows.length > 0) {
        return next(new AppError(`Generated SI number ${siNo} already exists.`, 409));
      }
    } else {
      siNo = existing.rows[0].si_no;
    }
    body.instructionNo = siNo;
    body.si_no = siNo;

    const v = buildValues(body);

    const fields = Object.keys(v);
    const values = Object.values(v);

    let result;
    try {
      if (existing.rows.length > 0) {
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        result = await req.db.query(
          `UPDATE shipping_instructions SET ${setClause}, deleted_at = NULL, updated_at = NOW() 
           WHERE export_invoice_id = $${fields.length + 1} 
           AND company_id = $${fields.length + 2} 
           RETURNING *`,
          [...values, exportInvoiceId, companyId]
        );
      } else {
        const cols = ['company_id', 'export_invoice_id', 'created_by', ...fields].join(', ');
        const placeholders = ['company_id', 'export_invoice_id', 'created_by', ...fields].map((_, i) => `$${i + 1}`).join(', ');
        result = await req.db.query(
          `INSERT INTO shipping_instructions (${cols}) VALUES (${placeholders}) RETURNING *`,
          [companyId, exportInvoiceId, req.user?.id, ...values]
        );

        // Mark the parent VGM as converted
        const siId = result.rows[0].id;
        const vgmId = vgmRow.rows[0].id;
        await req.db.query(
          `UPDATE vgm_documents 
           SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
           WHERE id = $2 AND company_id = $3`,
          [siId, vgmId, companyId]
        );
      }
      const changedFields = Object.keys(body);
      syncUpdatesAcrossStages(result.rows[0].id, 'shipping_instruction', changedFields, companyId, req.db).catch(() => { });

      // Notify on new SI creation
      if (existing.rows.length === 0) {
        notificationService.notifyShippingInstructionsCreated(companyId, result.rows[0], req.db).catch(() => {});
      }

      return successResponse(res, normalizeRow(result.rows[0]), 'SI saved');
    } catch (dbError) {
      debugLogger.error('DATABASE ERROR DURING SI SAVE:', dbError.message);
      debugLogger.error('Values attempted:', JSON.stringify(v, null, 2));
      throw dbError;
    }
  } catch (error) {
    debugLogger.error('CRITICAL SI SAVE ERROR:', error);
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const body = req.body;
    const exportInvoiceId = body.exportInvoiceId || body.export_invoice_id;
    const companyId = req.companyFilter || req.user?.companyId;

    let vgmRow = null;
    if (exportInvoiceId) {
      vgmRow = await req.db.query(
        'SELECT id, is_used, is_converted, vgm_no FROM vgm_documents WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [exportInvoiceId, companyId]
      );
      if (vgmRow.rows.length === 0) {
        return next(new AppError('A VGM must be created before you can create a Shipping Instruction.', 400));
      }
      const vgm = vgmRow.rows[0];
      if (vgm.is_used || vgm.is_converted) {
        return next(new AppError(`VGM ${vgm.vgm_no} has already been converted to a Shipping Instruction.`, 400));
      }
    }

    const v = buildValues(body);
    const fields = Object.keys(v);
    const values = Object.values(v);

    let cols, placeholders, params;
    if (exportInvoiceId) {
      cols = ['company_id', 'export_invoice_id', 'created_by', ...fields].join(', ');
      placeholders = ['company_id', 'export_invoice_id', 'created_by', ...fields].map((_, i) => `$${i + 1}`).join(', ');
      params = [companyId, exportInvoiceId, req.user?.id, ...values];
    } else {
      cols = ['company_id', 'created_by', ...fields].join(', ');
      placeholders = ['company_id', 'created_by', ...fields].map((_, i) => `$${i + 1}`).join(', ');
      params = [companyId, req.user?.id, ...values];
    }

    const result = await req.db.query(`INSERT INTO shipping_instructions (${cols}) VALUES (${placeholders}) RETURNING *`, params);

    if (exportInvoiceId && vgmRow && vgmRow.rows.length > 0) {
      const siId = result.rows[0].id;
      const vgmId = vgmRow.rows[0].id;
      await req.db.query(
        `UPDATE vgm_documents 
         SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
         WHERE id = $2 AND company_id = $3`,
        [siId, vgmId, companyId]
      );
    }

    return successResponse(res, normalizeRow(result.rows[0]), 'SI created');
  } catch (error) { debugLogger.error(error); next(error); }
};

export const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = 's.deleted_at IS NULL';
    const queryParams = [];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND s.company_id IS NULL`;
      } else {
        whereConditions += ` AND s.company_id = $${queryParams.length + 1}`;
        queryParams.push(req.companyFilter);
      }
    }

    if (search) {
      const searchParam = `%${search}%`;
      whereConditions += ` AND (s.si_no ILIKE $${queryParams.length + 1} 
                           OR ei.invoice_no ILIKE $${queryParams.length + 1}
                           OR ei.client_name ILIKE $${queryParams.length + 1})`;
      queryParams.push(searchParam);
    }

    const countResult = await req.db.query(
      `SELECT COUNT(*) as total 
       FROM shipping_instructions s
       LEFT JOIN export_invoices ei ON s.export_invoice_id = ei.id
       WHERE ${whereConditions}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    if (total === 0) {
      return successResponse(res, {
        data: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit)
      }, 'No shipping instructions found');
    }

    const result = await req.db.query(`
      SELECT s.*,
             ei.invoice_no as export_invoice_no,
             ei.client_name,
             COALESCE(s.vgm_no, v.vgm_no) as vgm_no
      FROM shipping_instructions s
      LEFT JOIN export_invoices ei ON s.export_invoice_id = ei.id
      LEFT JOIN vgm_documents v ON v.export_invoice_id = ei.id AND v.deleted_at IS NULL
      WHERE ${whereConditions}
      ORDER BY s.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    return successResponse(res, {
      data: result.rows.map(normalizeRow),
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    }, 'SI list retrieved');
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Shipping Instruction ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const result = await req.db.query(`
      SELECT s.*,
             ei.invoice_no as export_invoice_no,
             ei.invoice_date as ei_invoice_date,
             ei.shipping_bill_no as ei_sb_no,
             ei.shipping_bill_date as ei_sb_date,
             ei.client_name,
             pi.invoice_no as pi_no,
             pi.date as pi_date,
             COALESCE(s.booking_no, ei.booking_no) as booking_no,
             COALESCE(s.port_of_loading, ei.port_of_loading) as port_of_loading,
             COALESCE(s.port_of_discharge, ei.port_of_discharge) as port_of_discharge,
             COALESCE(s.final_destination, ei.final_destination) as final_destination,
             COALESCE(s.vessel_name, ei.vessel_flight_no) as vessel_name,
             COALESCE(s.vgm_no, v.vgm_no) as vgm_no,
             COALESCE(s.pl_no, pl.packing_list_no) as pl_no,
             COALESCE(s.annexure_no, an.annexure_no) as annexure_no,
             COALESCE(s.backside_no, ib.backside_no) as backside_no
      FROM shipping_instructions s
      LEFT JOIN export_invoices ei ON s.export_invoice_id = ei.id
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      LEFT JOIN vgm_documents v ON v.export_invoice_id = ei.id AND v.deleted_at IS NULL
      LEFT JOIN packing_lists pl ON pl.export_invoice_id = ei.id AND pl.deleted_at IS NULL
      LEFT JOIN invoice_backside ib ON ib.export_invoice_id = ei.id AND ib.deleted_at IS NULL
      LEFT JOIN export_invoice_annexures an ON an.export_invoice_id = ei.id AND an.deleted_at IS NULL
      WHERE s.id = $1 AND s.deleted_at IS NULL
      ${req.companyFilter ? `AND s.company_id = $2` : (req.hasOwnProperty('companyFilter') ? `AND s.company_id IS NULL` : '')}
    `, req.companyFilter ? [id, req.companyFilter] : [id]);

    if (result.rows.length === 0) return next(new AppError('Shipping Instruction not found', 404));
    const si = result.rows[0];

    // Fetch company details from global DB
    let companyInfo = null;
    if (si.company_id) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT name, address, iec_no, gstn, pan, logo_url, lut_arn_no, lut_date, permission_no, bank_name, account_holder_name, account_number, swift_code, branch_name, bank_address, settings FROM companies WHERE id = $1',
          [si.company_id]
        );
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            name: c.name,
            address: c.address,
            iec_no: c.iec_no,
            gstn: c.gstn,
            pan: c.pan,
            logo_url: c.logo_url || settings.logo_url || '',
            lut_arn_no: c.lut_arn_no || '',
            lut_date: c.lut_date || '',
            permission_no: c.permission_no || '',
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
        debugLogger.error('Error fetching company info for SI by ID:', err.message);
      }
    }

    return successResponse(res, { ...normalizeRow(si), company_info: companyInfo }, 'SI retrieved');
  } catch (error) { next(error); }
};

export const updateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Shipping Instruction ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const v = buildValues(req.body);
    const fields = Object.keys(v);
    const values = Object.values(v);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

    const result = await req.db.query(
      `UPDATE shipping_instructions SET ${setClause}, updated_at = NOW() 
       WHERE id = $${fields.length + 1} AND deleted_at IS NULL 
       AND company_id = $${fields.length + 2} 
       RETURNING *`,
      [...values, id, req.companyFilter]
    );

    if (result.rows.length === 0) return next(new AppError('Shipping Instruction not found', 404));
    return successResponse(res, normalizeRow(result.rows[0]), 'SI updated');
  } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try {
    const { exportInvoiceId, id } = req.params;
    const filterParam = req.companyFilter ? ` AND company_id = $2` : '';
    if (id) {
      await req.db.query(`UPDATE shipping_instructions SET deleted_at = NOW() WHERE id = $1${filterParam}`, req.companyFilter ? [id, req.companyFilter] : [id]);
    } else {
      const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
      if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));
      await req.db.query(`UPDATE shipping_instructions SET deleted_at = NOW() WHERE export_invoice_id = $1${filterParam}`, req.companyFilter ? [exportInvoiceId, req.companyFilter] : [exportInvoiceId]);
    }
    res.locals.auditResourceId = result.rows[0]?.id;
    return successResponse(res, null, 'Deleted');
  } catch (error) { next(error); }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Shipping Instruction ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const filterParam = req.companyFilter ? ` AND company_id = $2` : '';
    const existing = await req.db.query(`SELECT id FROM shipping_instructions WHERE id = $1${filterParam}`, req.companyFilter ? [id, req.companyFilter] : [id]);
    if (existing.rows.length === 0) return next(new AppError('Shipping Instruction not found', 404));

    await req.db.query(`DELETE FROM shipping_instructions WHERE id = $1${filterParam}`, req.companyFilter ? [id, req.companyFilter] : [id]);
    res.locals.auditResourceId = result.rows[0]?.id;
    return successResponse(res, null, 'Shipping Instruction permanently deleted');
  } catch (error) { next(error); }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Shipping Instruction ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const filterParam = req.companyFilter ? ` AND company_id = $2` : '';
    const current = await req.db.query(`SELECT status FROM shipping_instructions WHERE id = $1 AND deleted_at IS NULL${filterParam}`, req.companyFilter ? [id, req.companyFilter] : [id]);
    if (current.rows.length === 0) return next(new AppError('Shipping Instruction not found', 404));

    const currentStatus = current.rows[0].status;
    const newStatus = (currentStatus === 'Completed' || currentStatus === 'Confirmed') ? 'Draft' : 'Completed';

    const result = await req.db.query(
      `UPDATE shipping_instructions SET status = $1, updated_at = NOW() WHERE id = $2${filterParam} RETURNING *`,
      req.companyFilter ? [newStatus, id, req.companyFilter] : [newStatus, id]
    );
    return successResponse(res, normalizeRow(result.rows[0]), 'Status toggled');
  } catch (error) { next(error); }
};

export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user?.companyId;
    if (!companyId) {
      return successResponse(res, { siNo: '' }, 'Company context missing');
    }

    const result = await previewDocumentNumber('SI', companyId, req.db);
    return successResponse(res, { siNo: result.displayNumber }, 'Next SI number retrieved');
  } catch (error) { next(error); }
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
        UPDATE shipping_instructions
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `, [status, id, companyId]);
    } else {
      result = await req.db.query(`
        UPDATE shipping_instructions
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
