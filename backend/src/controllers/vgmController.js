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
import { selfHealTenantSchema } from '../services/exportDocumentReferenceService.js';
import { notificationService } from '../services/notificationService.js';

export const getByExportInvoiceId = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const cleanStr = (s) => {
      if (typeof s !== 'string') return null;
      const t = s.trim();
      if (!t || t === '-' || t.toLowerCase() === 'na' || t.toLowerCase() === 'n/a' || t.toLowerCase() === 'none') return null;
      return t;
    };
    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const companyId = req.companyFilter || req.user?.companyId;
    // Ensure schema is up to date for this tenant
    await selfHealTenantSchema(req.db, companyId);

    const companyFilterValue = req.companyFilter;
    const isSuperAdmin = req.user?.role === 'super_admin' && companyFilterValue === null;

    let existingWhere = 'v.export_invoice_id = $1 AND v.deleted_at IS NULL';
    const queryParams = [exportInvoiceId];

    if (!isSuperAdmin && req.hasOwnProperty('companyFilter')) {
      if (companyFilterValue === null) {
        existingWhere += ' AND v.company_id IS NULL';
      } else {
        existingWhere += ' AND v.company_id = $2';
        queryParams.push(companyFilterValue);
      }
    }

    // 1. Get existing VGM if any
    const existingRes = await req.db.query(
      `SELECT v.id, v.vgm_no, v.status, v.export_invoice_id, v.company_id,
              v.shipper_name, v.shipper_iec, v.contact_details, v.booking_number,
              v.weighbridge_name, v.cargo_type, v.un_no_imdg, v.max_permissible_weight,
              v.client_name, v.export_invoice_no, v.invoice_date, v.pi_no, v.pl_no, v.annexure_no,
              v.vessel_name, v.voyage_no, v.port_of_loading, v.country_of_origin,
              v.container_no, v.container_size, v.weighing_slip_no, v.weighing_date,
              COALESCE(v.container_sheet, v.containers) AS container_sheet,
              COALESCE(v.vgm_date, v.document_date) AS vgm_date,
              COALESCE(v.authorized_person, v.authorized_signatory) AS authorized_person,
              COALESCE(v.weighing_method, v.vgm_method) AS weighing_method,
              v.is_locked, v.snapshot_data
       FROM vgm_documents v
       WHERE ${existingWhere}
       LIMIT 1`,
      queryParams
    );

    const vgm = existingRes.rows.length > 0 ? existingRes.rows[0] : null;

    // Priority: Return immutable frozen snapshot if document is locked
    if (vgm && vgm.is_locked && vgm.snapshot_data) {
      const frozenVGM = enrichWithSnapshot(vgm, 'VGM');
      const returnedData = {
        vgm: {
          ...frozenVGM,
          containers: frozenVGM.container_sheet || []
        },
        export_invoice: {
          id: exportInvoiceId,
          invoice_no: frozenVGM.export_invoice_no,
          invoice_date: frozenVGM.invoice_date,
          pi_no: frozenVGM.pi_no,
          pl_no: frozenVGM.pl_no,
          annexure_no: frozenVGM.annexure_no,
          booking_no: frozenVGM.booking_no || frozenVGM.booking_number || ''
        },
        company_info: {
          ...frozenVGM.company_info,
          name: frozenVGM.shipper_name || frozenVGM.company_info?.name || '',
          iec_no: frozenVGM.shipper_iec || frozenVGM.company_info?.iec_no || '',
          phone: frozenVGM.contact_details || frozenVGM.company_info?.phone || '',
          authorized_person: frozenVGM.authorized_person || frozenVGM.company_info?.authorized_person || '',
          comp_authorized_person: frozenVGM.authorized_person || '',
          comp_contact: frozenVGM.contact_details || ''
        }
      };
      return successResponse(res, returnedData, 'VGM data retrieved successfully (LOCKED)');
    }

    // 2. Fetch the "God Object" (Inheritance data from all related docs)
    let fallbackWhere = 'ei.id = $1';
    const fallbackParams = [exportInvoiceId];

    if (!isSuperAdmin && req.hasOwnProperty('companyFilter')) {
      if (companyFilterValue === null) {
        fallbackWhere += ' AND ei.company_id IS NULL';
      } else {
        fallbackWhere += ' AND ei.company_id = $2';
        fallbackParams.push(companyFilterValue);
      }
    }

    const fallbackSql = `
      SELECT 
        ei.invoice_no as ei_invoice_no,
        ei.invoice_date as ei_invoice_date,
        ei.vessel_flight_no as ei_vessel,
        ei.booking_no as ei_booking_no,
        ei.port_of_loading as ei_port_of_loading,
        ei.box_type as ei_box_type,
        ei.pallet_type as ei_pallet_type,
        pi.invoice_no as pi_no,
        pi.date as pi_date,
        pl.packing_list_no as pl_no,
        pl.box_type as pl_box_type,
        pl.pallet_type as pl_pallet_type,
        pl.container_details as pl_containers,
        an.annexure_no as annexure_no,
        an.boxes_type as an_box_type,
        an.pallet_type as an_pallet_type,
        an.shipping_bill_no as an_sb_no,
        an.shipping_bill_date as an_sb_date,
        an.container_details as an_containers,
        ib.id as backside_id,
        ib.backside_no,
        ib.pi_no as backside_pi_no,
        COALESCE(ib.vessel_name, ei.vessel_flight_no) as vessel_name,
        '' as voyage_no,
        COALESCE(ib.booking_no, ei.booking_no) as backside_booking_no,
        COALESCE(ib.port_of_loading, ei.port_of_loading) as backside_port_of_loading,
        COALESCE(ib.container_details, an.container_details, pl.container_details) as backside_containers,
        COALESCE(ib.company_name, '') as backside_shipper_name,
        COALESCE(ib.iec_no, '') as backside_shipper_iec,
        '' as backside_contact,
        COALESCE(ib.weighbridge_name, '') as backside_weighbridge,
        COALESCE(ib.manufacturer_name, an.manufacturer_name, '') as backside_manufacturer_name,
        COALESCE(ib.manufacturer_address, an.manufacturer_address, '') as backside_manufacturer_address,
        COALESCE(an.boxes_type, pl.box_type, ei.box_type) as backside_box_type,
        COALESCE(an.pallet_type, pl.pallet_type, ei.pallet_type) as backside_pallet_type,
        ib.gross_weight as backside_gross_wt,
        cl.client_name as client_name,
        ei.country_of_origin as ei_country_of_origin,
        ei.port_of_discharge as ei_port_of_discharge,
        ei.final_destination as ei_final_destination,
        ei.tariff_code as ei_tariff_code,
        ei.buyers_order_no as pi_buyers_order_no,
        ei.product_lines as inherited_product_details,
        ei.updated_at as ei_updated_at,
        ei.company_id as company_id,
        an.product_description as an_product_description
      FROM export_invoices ei
      LEFT JOIN clients cl ON ei.client_id = cl.id AND cl.company_id = ei.company_id
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      LEFT JOIN packing_lists pl ON ei.id = pl.export_invoice_id AND pl.company_id = ei.company_id AND pl.deleted_at IS NULL
      LEFT JOIN export_invoice_annexures an ON ei.id = an.export_invoice_id AND an.company_id = ei.company_id AND an.deleted_at IS NULL
      LEFT JOIN invoice_backside ib ON ei.id = ib.export_invoice_id AND ib.company_id = ei.company_id AND ib.deleted_at IS NULL
      WHERE ${fallbackWhere}
      ORDER BY ib.created_at DESC, an.created_at DESC, pl.created_at DESC
      LIMIT 1
    `;
    const fallbackRes = await req.db.query(fallbackSql, fallbackParams);
    const row = fallbackRes.rows[0] || {};

    // 2.2 Fetch company details from master DB
    let companyInfo = {};
    try {
      const effectiveCompanyId = vgm?.company_id || row.company_id || req.companyFilter;
      if (effectiveCompanyId && req.db?.globalQuery) {
        const compRes = await req.db.globalQuery('SELECT name, address, iec_no, gstn, logo_url, contact_person_name, contact_number, email_id, settings FROM companies WHERE id = $1', [effectiveCompanyId]);
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            ...c,
            comp_name: c.name,
            comp_iec: c.iec_no,
            comp_authorized_person: c.contact_person_name || settings.authorized_signatory || settings.authorized_person || '',
            comp_contact: c.contact_number || c.email_id || settings.contact_no || ''
          };
        }
      }
    } catch (err) {
      debugLogger.error('Error fetching company info for VGM:', err.message);
    }

    const mergedRow = { ...row, ...companyInfo };

    // 2.5 Document number logic
    let nextVgmNo = '';
    if (!vgm) {
      try {
        const companyId = req.companyFilter || row.company_id || null;
        if (companyId) {
          const preview = await previewDocumentNumber('VGM', companyId, req.db);
          nextVgmNo = preview.displayNumber;
        }
      } catch (e) {
        debugLogger.error('[VGM Controller] Fallback number preview failed:', e.message);
      }
      if (!nextVgmNo) {
        nextVgmNo = row.ei_invoice_no ? (row.ei_invoice_no.startsWith('VGM/') ? row.ei_invoice_no : `VGM/${row.ei_invoice_no}`) : '';
      }
    }

    // 2.3 Parse existing container data
    let existingContainers = [];
    if (vgm) {
      const rawSheet = vgm.container_sheet || vgm.containers;
      if (typeof rawSheet === 'string' && rawSheet.trim()) {
        try { existingContainers = JSON.parse(rawSheet); } catch (e) { existingContainers = []; }
      } else if (Array.isArray(rawSheet)) {
        existingContainers = rawSheet;
      }
    }

    // 2.4 Construct fallback containers
    const getTareBySize = (size) => {
      if (!size) return 2300;
      const s = String(size).toUpperCase();
      if (s.includes('40')) return s.includes('HC') ? 3900 : 3800;
      if (s.includes('20')) return 2300;
      return 2300;
    };

    let fallbackContainers = [];
    try {
      const raw = row.backside_containers || [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        // Group by container_no first — backside/annexure stores product-level
        // rows (multiple products per container).  We must aggregate them into
        // one row per physical container so that smart-merge matches correctly.
        const groups = {};
        parsed
          .filter(c => c.container_no || c.containerNo || c.cont_no)
          .forEach(c => {
            const cNo = (c.container_no || c.containerNo || c.cont_no || c.contNo || c.container_number || '').trim();
            if (!cNo) return;

            const cargo = parseFloat(c.cargo_wt || c.cargo_weight || c.net_weight || c.netWeight || c.netWt || 0) || 0;
            const tare = parseFloat(c.tare_weight || c.tare_wt || c.tareWt || getTareBySize(c.container_size || c.type || c.size)) || 0;

            if (!groups[cNo]) {
              groups[cNo] = {
                container_no: cNo,
                line_seal_no: c.line_seal_no || c.seal_no || c.sealNo || '',
                e_seal_no: c.e_seal_no || c.eseal_no || c.esealNo || '',
                type: c.container_size || c.containerSize || c.type || c.size || "20'",
                cargo_wt: cargo,
                tare_wt: tare,
                vgm_weight: cargo + tare,
                weighing_slip_no: c.weighing_slip_no || c.slip_no || c.slipNo || 'AS PER BELOW DETAILS',
                weighing_date: c.weighing_date || c.slip_no_date || c.slipNoDate || 'AS PER BELOW DETAILS'
              };
            } else {
              groups[cNo].cargo_wt = parseFloat((groups[cNo].cargo_wt + cargo).toFixed(2));
              groups[cNo].vgm_weight = parseFloat((groups[cNo].cargo_wt + groups[cNo].tare_wt).toFixed(2));
              // Keep first non-empty seal values
              if (!groups[cNo].line_seal_no && (c.line_seal_no || c.seal_no || c.sealNo)) {
                groups[cNo].line_seal_no = c.line_seal_no || c.seal_no || c.sealNo;
              }
              if (!groups[cNo].e_seal_no && (c.e_seal_no || c.eseal_no || c.esealNo)) {
                groups[cNo].e_seal_no = c.e_seal_no || c.eseal_no || c.esealNo;
              }
            }
          });
        fallbackContainers = Object.values(groups);
      }
    } catch (e) {
      debugLogger.warn('VGM data inheritance: failed to parse fallback containers:', e.message);
    }

    // Smart Merge: If existing containers have 0 weights but fallback has them, use fallback
    let finalContainers = existingContainers;
    if (existingContainers.length > 0 && fallbackContainers.length > 0) {
      finalContainers = existingContainers.map(ec => {
        const matchingFallback = fallbackContainers.find(fc => fc.container_no === ec.container_no);
        if (matchingFallback) {
          const defaultTare = getTareBySize(ec.container_size || ec.type || ec.size);
          const ecTare = parseFloat(ec.tare_wt) || 0;
          const fbTare = parseFloat(matchingFallback.tare_wt) || 0;
          
          // Use existing tare if > 0. Otherwise fallback tare, else default.
          let finalTare = ecTare > 0 ? ecTare : (fbTare > 0 ? fbTare : defaultTare);

          const ecCargo = parseFloat(ec.cargo_wt) || 0;
          const fbCargo = parseFloat(matchingFallback.cargo_wt) || 0;

          // Prefer existing cargo_wt (user edited in VGM). If 0, then use fallback.
          let finalCargo = ecCargo > 0 ? ecCargo : fbCargo;

          // Recompute VGM Weight if tare or cargo changed, or use existing vgm_weight
          let finalVgmWt = (parseFloat(ec.vgm_weight) || 0) > 0 ? parseFloat(ec.vgm_weight) : matchingFallback.vgm_weight;
          if (finalTare !== ecTare || finalCargo !== ecCargo || finalVgmWt === 0 || !finalVgmWt) {
              finalVgmWt = (finalCargo + finalTare).toFixed(2);
          }

          return {
            ...matchingFallback, // Take everything from fallback
            ...ec, // Override with existing if existing has real values
            cargo_wt: finalCargo,
            tare_wt: finalTare,
            vgm_weight: finalVgmWt,
            weighing_slip_no: cleanStr(ec.weighing_slip_no) && ec.weighing_slip_no !== 'AS PER BELOW DETAILS' ? ec.weighing_slip_no : matchingFallback.weighing_slip_no,
            weighing_date: cleanStr(ec.weighing_date) && ec.weighing_date !== 'AS PER BELOW DETAILS' ? ec.weighing_date : matchingFallback.weighing_date
          };
        }
        return ec;
      });
    } else if (finalContainers.length === 0) {
      finalContainers = fallbackContainers;
    }

    // 3. Combine Logic
    const combinedData = vgm ? {
      ...vgm,
      id: vgm.id,
      vgm_no: cleanStr(vgm.vgm_no) || (mergedRow.ei_invoice_no ? `VGM/${mergedRow.ei_invoice_no}` : ''),
      vgm_date: vgm.vgm_date || new Date().toISOString().split('T')[0],
      export_invoice_no: cleanStr(vgm.export_invoice_no) || mergedRow.ei_invoice_no || '',
      invoice_date: vgm.invoice_date || mergedRow.ei_invoice_date || '',
      pi_no: cleanStr(vgm.pi_no) || mergedRow.pi_no || mergedRow.backside_pi_no || '',
      pi_date: vgm.pi_date || mergedRow.pi_date || '',
      pl_no: cleanStr(vgm.pl_no) || mergedRow.pl_no || '',
      annexure_no: cleanStr(vgm.annexure_no) || mergedRow.annexure_no || '',
      booking_number: cleanStr(vgm.booking_number) || mergedRow.backside_booking_no || mergedRow.ei_booking_no || '',
      booking_no: cleanStr(vgm.booking_no) || cleanStr(vgm.booking_number) || mergedRow.backside_booking_no || mergedRow.ei_booking_no || '',
      vessel_name: cleanStr(vgm.vessel_name) || mergedRow.vessel_name || mergedRow.ei_vessel || '',
      port_of_loading: cleanStr(vgm.port_of_loading) || mergedRow.backside_port_of_loading || mergedRow.ei_port_of_loading || '',
      container_sheet: finalContainers,
      shipper_name: cleanStr(vgm.shipper_name) || mergedRow.backside_shipper_name || mergedRow.comp_name || '',
      shipper_iec: cleanStr(vgm.shipper_iec) || mergedRow.backside_shipper_iec || mergedRow.comp_iec || '',
      contact_details: cleanStr(vgm.contact_details) || mergedRow.comp_contact || mergedRow.backside_contact || '',
      authorized_person: cleanStr(vgm.authorized_person) || mergedRow.comp_authorized_person || '',
      weighbridge_name: cleanStr(vgm.weighbridge_name) || mergedRow.backside_weighbridge || (mergedRow.backside_manufacturer_name ? `${mergedRow.backside_manufacturer_name}\n${mergedRow.backside_manufacturer_address}` : ''),
      container_no: cleanStr(vgm.container_no) || 'AS PER ATTACHMENT',
      container_size: cleanStr(vgm.container_size) || (finalContainers.length > 0 ? finalContainers[0].type : '20\''),
      max_permissible_weight: cleanStr(vgm.max_permissible_weight) || '30480.00',
      weighing_slip_no: cleanStr(vgm.weighing_slip_no) || (finalContainers.length > 0 ? finalContainers[0].weighing_slip_no : 'AS PER BELOW DETAILS'),
      weighing_date: cleanStr(vgm.weighing_date) || (finalContainers.length > 0 ? finalContainers[0].weighing_date : 'AS PER BELOW DETAILS'),
      product_description: cleanStr(vgm.product_description) || 'AS PER ATTACHMENT',
      port_of_discharge: cleanStr(vgm.port_of_discharge) || mergedRow.ei_port_of_discharge || '',
      final_destination: cleanStr(vgm.final_destination) || mergedRow.ei_final_destination || '',
      country_of_origin: cleanStr(vgm.country_of_origin) || mergedRow.ei_country_of_origin || '',
      tariff_code: cleanStr(vgm.tariff_code) || mergedRow.ei_tariff_code || '',
      buyers_order_no: cleanStr(vgm.buyers_order_no) || mergedRow.pi_buyers_order_no || '',
      iec_no: mergedRow.comp_iec || '',
      gstn: mergedRow.gstn || '',
      company_info: companyInfo,
      inherited_product_details: mergedRow.inherited_product_details || '[]',
      status: vgm.status || 'Draft',
      export_invoice_id: exportInvoiceId
    } : {
      id: null,
      vgm_no: nextVgmNo,
      vgm_date: new Date().toISOString().split('T')[0],
      export_invoice_no: mergedRow.ei_invoice_no || '',
      invoice_date: mergedRow.ei_invoice_date || '',
      pi_no: mergedRow.pi_no || mergedRow.backside_pi_no || '',
      pl_no: mergedRow.pl_no || '',
      annexure_no: mergedRow.annexure_no || '',
      booking_number: mergedRow.backside_booking_no || mergedRow.ei_booking_no || '',
      booking_no: mergedRow.backside_booking_no || mergedRow.ei_booking_no || '',
      vessel_name: mergedRow.vessel_name || mergedRow.ei_vessel || '',
      port_of_loading: mergedRow.backside_port_of_loading || mergedRow.ei_port_of_loading || '',
      container_sheet: finalContainers,
      shipper_name: mergedRow.backside_shipper_name || mergedRow.comp_name || '',
      shipper_iec: mergedRow.backside_shipper_iec || mergedRow.comp_iec || '',
      contact_details: mergedRow.comp_contact || mergedRow.backside_contact || '',
      authorized_person: mergedRow.comp_authorized_person || '',
      weighbridge_name: mergedRow.backside_weighbridge || (mergedRow.backside_manufacturer_name ? `${mergedRow.backside_manufacturer_name}\n${mergedRow.backside_manufacturer_address}` : ''),
      weighing_method: 'METHOD-1',
      cargo_type: 'NORMAL',
      un_no_imdg: 'NA',
      product_description: 'AS PER ATTACHMENT',
      container_no: 'AS PER ATTACHMENT',
      container_size: finalContainers.length > 0 ? finalContainers[0].type : 'TEU',
      max_permissible_weight: '30480.00',
      weighing_slip_no: 'AS PER BELOW DETAILS',
      weighing_date: 'AS PER BELOW DETAILS',
      status: 'Draft',
      inherited_product_details: mergedRow.inherited_product_details || '[]',
      export_invoice_id: exportInvoiceId
    };

    const responseData = {
      vgm: {
        ...combinedData,
        id: vgm?.id || null,
        containers: combinedData.container_sheet
      },
      export_invoice: {
        id: exportInvoiceId,
        invoice_no: combinedData.export_invoice_no,
        invoice_date: combinedData.invoice_date,
        pi_no: combinedData.pi_no,
        pl_no: combinedData.pl_no,
        annexure_no: combinedData.annexure_no,
        booking_no: combinedData.booking_no || combinedData.booking_number || ''
      },
      company_info: {
        ...companyInfo,
        name: combinedData.shipper_name || companyInfo.comp_name || companyInfo.name || '',
        iec_no: combinedData.shipper_iec || companyInfo.comp_iec || companyInfo.iec_no || '',
        phone: combinedData.contact_details || companyInfo.comp_contact || companyInfo.contact_number || '',
        authorized_person: combinedData.authorized_person || companyInfo.comp_authorized_person || companyInfo.contact_person_name || '',
        comp_authorized_person: combinedData.authorized_person || companyInfo.comp_authorized_person || '',
        comp_contact: combinedData.contact_details || companyInfo.comp_contact || ''
      }
    };

    return successResponse(res, responseData, 'VGM data retrieved with full fallbacks');
  } catch (error) {
    debugLogger.error(`[VGM Controller] Error in getByExportInvoiceId for ${req.params.exportInvoiceId}:`, error);
    next(error);
  }
};

export const createOrUpdate = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const body = req.body;

    // Validate UUID first
    const uv = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!uv.isValid) {
      return next(new AppError(uv.error, 400));
    }

    const companyId = req.companyFilter || req.user?.companyId;
    // Ensure schema is up to date for this tenant
    await selfHealTenantSchema(req.db, companyId);

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    const vgmNo = body.vgm_no || body.vgmNo;
    const existing = await req.db.query(
      `SELECT id, vgm_no, export_invoice_id, deleted_at FROM vgm_documents 
       WHERE (export_invoice_id = $1 OR vgm_no = $2) 
       AND company_id = $3`,
      [exportInvoiceId, vgmNo, companyId]
    );

    let targetId = null;
    let isUpdate = false;

    if (existing.rows.length > 0) {
      const matchInvoice = existing.rows.find(r => r.export_invoice_id === exportInvoiceId);
      const matchNo = existing.rows.find(r => r.vgm_no === vgmNo);

      if (matchInvoice) {
        isUpdate = true;
        targetId = matchInvoice.id;

        // Also check if the requested vgmNo is taken by a DIFFERENT record
        if (matchNo && matchNo.id !== targetId) {
          return res.status(400).json({
            success: false,
            message: `VGM Number '${vgmNo}' is already assigned to another document.`
          });
        }
      } else if (matchNo) {
        return res.status(400).json({
          success: false,
          message: `VGM Number '${vgmNo}' is already assigned to another document. Please use a unique number.`
        });
      }
    }

    const ibRow = await req.db.query(
      'SELECT id, is_used, is_converted, backside_no FROM invoice_backside WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [exportInvoiceId, companyId]
    );
    if (ibRow.rows.length === 0) {
      return next(new AppError('An Invoice Backside must be created before you can create a VGM.', 400));
    }

    let finalVgmNo;
    if (!isUpdate || !targetId) {
      // Check if this Invoice Backside has already been converted to a VGM
      const ib = ibRow.rows[0];
      if (ib.is_used || ib.is_converted) {
        return next(new AppError(`Invoice Backside ${ib.backside_no} has already been converted to a VGM.`, 400));
      }

      // NEW RECORD: Always generate a fresh sequential number on the backend
      const gen = await generateDocumentNumber('VGM', companyId, req.db);
      finalVgmNo = gen.displayNumber;

      // Final uniqueness check
      const duplicateCheck = await req.db.query(
        'SELECT id FROM vgm_documents WHERE vgm_no = $1 AND company_id = $2 AND deleted_at IS NULL',
        [finalVgmNo, companyId]
      );
      if (duplicateCheck.rows.length > 0) {
        return next(new AppError(`Generated VGM number ${finalVgmNo} already exists.`, 409));
      }
    } else {
      // UPDATE: Preserve the original number assigned during creation
      finalVgmNo = existing.rows.find(r => r.id === targetId).vgm_no;
    }

    const containerJson = JSON.stringify(body.container_sheet || body.containers || []);

    const fields = [
      'vgm_no', 'vgm_date', 'export_invoice_no', 'shipper_name', 'shipper_iec',
      'authorized_person', 'contact_details', 'max_permissible_weight',
      'weighbridge_name', 'weighing_method', 'cargo_type', 'un_no_imdg',
      'booking_number', 'container_sheet', 'containers', 'invoice_backside_id', 'status',
      'pi_no', 'pl_no', 'annexure_no', 'invoice_date', 'weighing_slip_no', 'weighing_date',
      'total_cargo_weight', 'total_tare_weight', 'total_vgm_weight', 'gross_weight', 'client_name',
      'total_sqm', 'total_boxes', 'total_pallets', 'vessel_name', 'voyage_no', 'port_of_loading',
      'country_of_origin', 'container_no', 'container_size'
    ];


    let totalCargo = parseFloat(body.total_cargo_weight || body.totalCargoWeight || 0);
    let totalTare = parseFloat(body.total_tare_weight || body.totalTareWeight || 0);
    let totalVgm = parseFloat(body.total_vgm_weight || body.totalVgmWeight || 0);

    if (totalCargo === 0 && Array.isArray(body.container_sheet)) {
      body.container_sheet.forEach(c => {
        totalCargo += parseFloat(c.cargo_wt || c.cargoWt || 0);
        totalTare += parseFloat(c.tare_wt || c.tareWt || 0);
        totalVgm += parseFloat(c.vgm_weight || c.vgmWeight || 0);
      });
    }

    const values = fields.map(f => {
      let val;
      if (f === 'vgm_no') val = finalVgmNo;
      else if (f === 'container_sheet' || f === 'containers') val = containerJson;
      else if (f === 'total_cargo_weight') val = totalCargo;
      else if (f === 'total_tare_weight') val = totalTare;
      else if (f === 'total_vgm_weight' || f === 'gross_weight') val = totalVgm;
      else if (f === 'total_sqm') val = parseFloat(body.total_sqm || body.totalSqm || 0);
      else if (f === 'total_boxes') val = parseInt(body.total_boxes || body.totalBoxes || 0);
      else if (f === 'total_pallets') val = parseInt(body.total_pallets || body.totalPallets || 0);
      else if (f === 'max_permissible_weight') {
        // Accept string values from master data (e.g. '21000 KG') as well as numbers
        const rawVal = body[f] !== undefined ? body[f] : body.maxPermissibleWeight;
        val = (rawVal !== undefined && rawVal !== '' && rawVal !== null) ? String(rawVal) : null;
      }
      else if (f === 'invoice_backside_id') {
        const ibVal = body[f] || body.invoiceBacksideId;
        val = (!ibVal || ibVal === '' || ibVal === 'undefined' || ibVal === 'null') ? null : ibVal;
      }
      else {

        const camelKey = f.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        val = body[f] !== undefined ? body[f] : body[camelKey];
        if (val === undefined || val === '') val = null;
      }
      return val;
    });

    let result;
    if (isUpdate && targetId) {
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const sql = `UPDATE vgm_documents SET ${setClause}, deleted_at = NULL, updated_at = NOW() 
          WHERE id = $${fields.length + 1}
          AND company_id = $${fields.length + 2}
          RETURNING *`;
      result = await req.db.query(sql, [...values, targetId, companyId]);
    } else {
      const columns = ['company_id', 'export_invoice_id', 'created_by', ...fields].join(', ');
      const placeholders = ['company_id', 'export_invoice_id', 'created_by', ...fields].map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO vgm_documents (${columns}) VALUES (${placeholders}) RETURNING *`;
      result = await req.db.query(sql, [companyId, exportInvoiceId, req.user?.id, ...values]);

      // Mark the parent Invoice Backside as converted
      const vgmId = result.rows[0].id;
      const ibId = ibRow.rows[0].id;
      await req.db.query(
        `UPDATE invoice_backside 
         SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
         WHERE id = $2 AND company_id = $3`,
        [vgmId, ibId, companyId]
      );
    }

    // Trigger cascading sync
    const changedFields = Object.keys(body);
    syncUpdatesAcrossStages(result.rows[0].id, 'vgm', changedFields, companyId, req.db).catch(() => { });

    // Notify on new VGM creation
    if (!isUpdate) {
      notificationService.notifyVGMCreated(companyId, result.rows[0], req.db).catch(() => {});
    }

    return successResponse(res, result.rows[0], 'VGM saved');
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = 'v.deleted_at IS NULL';
    const queryParams = [];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND v.company_id IS NULL`;
      } else {
        whereConditions += ` AND v.company_id = $${queryParams.length + 1}`;
        queryParams.push(req.companyFilter);
      }
    }

    if (search) {
      const searchParam = `%${search}%`;
      whereConditions += ` AND (v.vgm_no ILIKE $${queryParams.length + 1} 
                           OR ei.invoice_no ILIKE $${queryParams.length + 1}
                           OR cl.client_name ILIKE $${queryParams.length + 1}
                           OR v.client_name ILIKE $${queryParams.length + 1})`;
      queryParams.push(searchParam);
    }

    const countResult = await req.db.query(
      `SELECT COUNT(*) as total 
       FROM vgm_documents v
       LEFT JOIN export_invoices ei ON v.export_invoice_id = ei.id
       LEFT JOIN clients cl ON ei.client_id = cl.id
       WHERE ${whereConditions}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    const parsedLimit = parseInt(limit) || 50;
    
    if (total === 0) {
      return successResponse(res, {
        data: [],
        total: 0,
        page: parseInt(page),
        limit: parsedLimit,
        totalPages: 1
      }, 'No VGMs found');
    }

    const result = await req.db.query(`
      SELECT v.*, 
             ei.invoice_no, 
             ei.invoice_date,
             ib.backside_no,
             COALESCE(cl.client_name, v.client_name) as client_name,
             v.total_vgm_weight as gross_weight,
             jsonb_array_length(COALESCE(v.container_sheet, '[]'::jsonb)) as container_count
      FROM vgm_documents v
      LEFT JOIN export_invoices ei ON v.export_invoice_id = ei.id
      LEFT JOIN invoice_backside ib ON ib.id = COALESCE(
        v.invoice_backside_id, 
        (SELECT id FROM invoice_backside WHERE export_invoice_id = v.export_invoice_id AND (company_id = v.company_id OR (company_id IS NULL AND v.company_id IS NULL)) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)
      )
      LEFT JOIN clients cl ON ei.client_id = cl.id
      WHERE ${whereConditions}
      ORDER BY v.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return successResponse(res, {
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parsedLimit,
      totalPages
    }, 'VGM list retrieved');
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `SELECT v.*, 
              ei.invoice_no as export_invoice_no,
              ei.updated_at as ei_updated_at,
              ib.backside_no
       FROM vgm_documents v
       LEFT JOIN export_invoices ei ON v.export_invoice_id = ei.id
       LEFT JOIN invoice_backside ib ON v.invoice_backside_id = ib.id
       WHERE v.id = $1 AND v.deleted_at IS NULL
       ${req.companyFilter ? `AND v.company_id = $2` : (req.hasOwnProperty('companyFilter') ? `AND v.company_id IS NULL` : '')}`,
      req.companyFilter ? [id, req.companyFilter] : [id]
    );
    if (result.rows.length === 0) return next(new AppError('VGM not found', 404));
    const vgm = result.rows[0];

    // Priority: Return immutable frozen snapshot if document is locked
    if (vgm.is_locked && vgm.snapshot_data) {
      const frozenVGM = enrichWithSnapshot(vgm, 'VGM');
      return successResponse(res, frozenVGM, 'VGM retrieved (LOCKED)');
    }

    // Fetch company details from global DB
    let companyInfo = null;
    if (vgm.company_id) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT name, address, iec_no, gstn, pan, settings FROM companies WHERE id = $1',
          [vgm.company_id]
        );
        const c = compRes.rows[0];
        const settings = c.settings || {};
        companyInfo = {
          ...c,
          name: c.name,
          address: c.address,
          iec_no: c.iec_no,
          gstn: c.gstn,
          pan: c.pan,
          bank_details: {
            bank_name: c.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
            account_name: c.account_holder_name || (settings.bank_details && settings.bank_details.account_name) || '',
            account_no: c.account_number || (settings.bank_details && settings.bank_details.account_no) || '',
            swift_code: c.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
            bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
          }
        };
      } catch (err) {
        debugLogger.error('Error fetching company info for VGM by ID:', err.message);
      }
    }

    return successResponse(res, { ...vgm, company_info: companyInfo }, 'VGM retrieved');
  } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try {
    const { id, exportInvoiceId } = req.params;
    const identifier = id || exportInvoiceId;

    if (!identifier) return next(new AppError('No identifier provided for deletion', 400));

    // Try deleting by export_invoice_id first, then by id
    const result = await req.db.query(
      `UPDATE vgm_documents SET deleted_at = NOW() 
       WHERE (export_invoice_id = $1 OR id = $1)
       ${req.companyFilter ? `AND company_id = $2` : (req.hasOwnProperty('companyFilter') ? `AND company_id IS NULL` : '')}
       RETURNING id`,
      req.companyFilter ? [identifier, req.companyFilter] : [identifier]
    );

    if (result.rowCount === 0) return next(new AppError('VGM not found', 404));

    res.locals.auditResourceId = result.rows[0]?.id;
    return successResponse(res, null, 'VGM deleted successfully');
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
        UPDATE vgm_documents
        SET status = $1, updated_at = NOW()
        WHERE (id = $2 OR export_invoice_id = $2)
        AND company_id = $3
        RETURNING *
      `, [status, id, companyId]);
    } else {
      result = await req.db.query(`
        UPDATE vgm_documents
        SET status = $1, updated_at = NOW()
        WHERE (id = $2 OR export_invoice_id = $2)
        AND company_id IS NULL
        RETURNING *
      `, [status, id]);
    }

    if (result.rows.length === 0) {
      return next(new AppError('VGM record not found', 404));
    }

    return successResponse(res, result.rows[0], `Status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user?.companyId;
    if (!companyId) {
      return successResponse(res, { vgmNo: '' }, 'Company context missing');
    }

    const result = await previewDocumentNumber('VGM', companyId, req.db);
    return successResponse(res, { vgmNo: result.displayNumber }, 'Next VGM number retrieved');
  } catch (error) { next(error); }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    const current = await req.db.query(
      'SELECT status FROM vgm_documents WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (current.rows.length === 0) {
      return next(new AppError('VGM not found', 404));
    }

    const currentStatus = current.rows[0].status;
    const newStatus = (currentStatus === 'Completed' || currentStatus === 'Confirmed' || currentStatus === 'Finalized') ? 'Draft' : 'Finalized';

    const result = await req.db.query(
      'UPDATE vgm_documents SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
      [newStatus, id, companyId]
    );

    return successResponse(res, result.rows[0], `Status updated to ${newStatus}`);
  } catch (error) {
    next(error);
  }
};
