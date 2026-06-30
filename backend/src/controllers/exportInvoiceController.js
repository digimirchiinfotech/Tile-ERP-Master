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
import { generateDocumentNumber, previewDocumentNumber } from '../utils/documentNumberGenerator.js';
import { validateUUID } from '../utils/validators.js';
import { notificationService } from '../services/notificationService.js';
import { syncUpdatesAcrossStages } from '../services/exportWorkflowInterconnectionService.js';
import { createReceivableFromInvoice } from '../services/accountLedgerIntegrationService.js';
import { syncInventoryFromInvoice } from '../services/inventoryIntegrationService.js';
import { validateStatusTransition } from '../utils/validateStatusTransition.js';

export function mergeUniqueFieldValues(values, separator = ' | ') {
  if (!Array.isArray(values)) return '';
  const uniqueVals = [];
  const trimmedSep = separator.trim();

  for (const val of values) {
    if (val === undefined || val === null) continue;

    const strVal = String(val).trim();
    if (!strVal || strVal === '-' || strVal.toUpperCase() === 'N/A') continue;

    // Split by newlines first
    const lines = strVal.split(/\r?\n/);
    for (const line of lines) {
      if (separator === '\n') {
        const trimmed = line.trim();
        if (trimmed && trimmed !== '-' && trimmed.toUpperCase() !== 'N/A' && !uniqueVals.includes(trimmed)) {
          uniqueVals.push(trimmed);
        }
      } else {
        // Split by the separator string
        const parts = line.split(trimmedSep);
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed && trimmed !== '-' && trimmed.toUpperCase() !== 'N/A' && !uniqueVals.includes(trimmed)) {
            uniqueVals.push(trimmed);
          }
        }
      }
    }
  }

  return uniqueVals.join(separator);
}


export const getAll = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      date_from,
      date_to
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (req.companyFilter !== undefined) {
      if (req.companyFilter === null) {
        conditions.push(`ei.company_id IS NULL`);
      } else {
        conditions.push(`ei.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(ei.invoice_no ILIKE $${paramCount} OR ei.client_name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`ei.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`ei.invoice_date >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`ei.invoice_date <= $${paramCount}`);
      values.push(date_to);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM export_invoices ei ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    if (total === 0) {
      return successResponse(res, paginationResponse([], 0, page, limit), 'No export invoices found');
    }

    const result = await req.db.query(
      `SELECT ei.*, 
              COALESCE(
                (SELECT string_agg(p.invoice_no, ', ')
                 FROM export_invoice_proforma_links l
                 JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
                 WHERE l.export_invoice_id = ei.id),
                pi.invoice_no
              ) as proforma_invoice_no,
              (SELECT packing_list_no FROM packing_lists pl WHERE pl.export_invoice_id = ei.id AND pl.deleted_at IS NULL LIMIT 1) as pl_no,
              (SELECT annexure_no FROM export_invoice_annexures ann WHERE ann.export_invoice_id = ei.id AND ann.deleted_at IS NULL LIMIT 1) as annexure_no,
              (SELECT vgm_no FROM vgm_documents vgm WHERE vgm.export_invoice_id = ei.id AND vgm.deleted_at IS NULL LIMIT 1) as vgm_no,
              (SELECT si_no FROM shipping_instructions si WHERE si.export_invoice_id = ei.id AND si.deleted_at IS NULL LIMIT 1) as si_no,
              (SELECT backside_no FROM invoice_backside ib WHERE ib.export_invoice_id = ei.id AND ib.deleted_at IS NULL LIMIT 1) as backside_no
       FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       ${whereClause}
       ORDER BY ei.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Export invoices retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const idValidation = validateUUID(id, 'Export Invoice ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

    let whereConditions = 'WHERE ei.id = $1';
    let queryParams = [id];

    if ('companyFilter' in req) {
      whereConditions += ' AND ei.company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const result = await req.db.query(
      `SELECT 
        ei.*,
        COALESCE(
          (SELECT string_agg(p.invoice_no, ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          pi.invoice_no
        ) as proforma_invoice_no,
        COALESCE(
          (SELECT string_agg(TO_CHAR(p.date, 'YYYY-MM-DD'), ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          TO_CHAR(pi.date, 'YYYY-MM-DD')
        ) as proforma_date,
        COALESCE(
          (SELECT max(p.updated_at)
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          pi.updated_at
        ) as pi_updated_at,
        (SELECT array_agg(proforma_invoice_id) FROM export_invoice_proforma_links WHERE export_invoice_id = ei.id) as proforma_invoice_ids,
        (SELECT packing_list_no FROM packing_lists pl WHERE pl.export_invoice_id = ei.id AND pl.deleted_at IS NULL LIMIT 1) as pl_no
       FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Export invoice not found', 404));
    }

    let invoice = result.rows[0];

    // Priority: Return immutable frozen snapshot if document is locked
    if (invoice.is_locked && invoice.snapshot_data) {
      const frozenInvoice = enrichWithSnapshot(invoice, 'EXPORT_INVOICE');
      return successResponse(
        res,
        frozenInvoice,
        'Export invoice retrieved successfully (LOCKED)'
      );
    }

    let companyInfo = null;
    try {
      const companyId = invoice.company_id || req.companyFilter;
      if (companyId) {
        const companyResult = await req.db.globalQuery(
          'SELECT * FROM companies WHERE id = $1',
          [companyId]
        );
        if (companyResult.rows.length > 0) {
          const company = companyResult.rows[0];
          const settings = company.settings || {};
          const bank = settings.bank_details || {};
          companyInfo = {
            ...company,
            bank_details: {
              bank_name: company.bank_name || bank.bank_name || bank.bankName || '',
              account_name: company.account_holder_name || bank.account_name || bank.accountName || company.name || '',
              account_no: company.account_number || bank.account_no || bank.accountNumber || '',
              swift_code: company.swift_code || bank.swift_code || bank.swiftCode || '',
              bank_address: company.bank_address || company.branch_name || bank.bank_address || bank.bankAddress || ''
            },
            range_name: company.range_name || settings.range_name || '',
            division: company.division || settings.division || '',
            commissionerate: company.commissionerate || settings.commissionerate || ''
          };
        }
      }
    } catch (companyErr) {
      debugLogger.error('Error fetching company info for Export Invoice:', companyErr.message);
    }

    invoice.company_info = companyInfo;

    // If proforma_invoice_no is null but proforma_invoice_id exists, fetch it separately
    if (!invoice.proforma_invoice_no && invoice.proforma_invoice_id) {
      try {
        const piParams = [invoice.proforma_invoice_id];
        let piQuery = `SELECT invoice_no FROM proforma_invoices WHERE id = $1`;
        if ('companyFilter' in req) {
          if (req.companyFilter === null) {
            piQuery += ` AND company_id IS NULL`;
          } else {
            piQuery += ` AND company_id = $2`;
            piParams.push(req.companyFilter);
          }
        }
        const piResult = await req.db.query(piQuery, piParams);
        if (piResult.rows.length > 0) {
          invoice.proforma_invoice_no = piResult.rows[0].invoice_no;
        }
      } catch (piError) {
        debugLogger.warn('Could not fetch proforma invoice number:', piError.message);
      }
    }

    // Ensure all fields are present, even if null
    const enrichedInvoice = {
      ...invoice,
      proforma_invoice_no: invoice.proforma_invoice_no || null,
      consignee_details: invoice.consignee_details || null,
      buyer_details: invoice.buyer_details || null,
      port_of_loading: invoice.port_of_loading || null,
      port_of_discharge: invoice.port_of_discharge || null,
      final_destination: invoice.final_destination || null,
      payment_terms: invoice.payment_terms || null,
      delivery_terms: invoice.delivery_terms || null,
      product_lines: Array.isArray(invoice.product_lines) ? invoice.product_lines : []
    };

    return successResponse(
      res,
      enrichedInvoice,
      'Export invoice retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getFromProforma = async (req, res, next) => {
  try {
    const { proformaId } = req.params;
    const proformaIds = proformaId.split(',').map(id => id.trim()).filter(id => id);

    for (const id of proformaIds) {
      const idValidation = validateUUID(id, 'Proforma Invoice ID');
      if (!idValidation.isValid) {
        return next(new AppError(idValidation.error, 400));
      }
    }

    if (proformaIds.length === 0) {
      return next(new AppError('No Proforma Invoice ID provided', 400));
    }

    let whereConditions = 'WHERE pi.id = ANY($1::uuid[])';
    let queryParams = [proformaIds];

    if ('companyFilter' in req) {
      whereConditions += ' AND pi.company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const proformaResult = await req.db.query(
      `SELECT pi.* FROM proforma_invoices pi ${whereConditions}`,
      queryParams
    );

    if (proformaResult.rows.length !== proformaIds.length) {
      return next(new AppError('One or more Proforma Invoices not found', 404));
    }

    const proformas = proformaResult.rows;

    // Validation for multi-select
    if (proformas.length > 1) {
      const reference = proformas[0];

      const checkMismatch = (val1, val2) => (val1 || '').trim() !== (val2 || '').trim();

      const mismatches = proformas.some(p =>
        checkMismatch(p.consignee_details, reference.consignee_details) ||
        checkMismatch(p.buyer_details, reference.buyer_details) ||
        checkMismatch(p.port_of_loading, reference.port_of_loading) ||
        checkMismatch(p.port_of_discharge, reference.port_of_discharge) ||
        checkMismatch(p.final_destination, reference.final_destination)
      );

      if (mismatches) {
        return next(new AppError(
          `Selected Proforma Invoices cannot be merged.\n\nThe following fields must be identical across all selected PIs:\n• Consignee Details\n• Buyer Details\n• Port of Loading\n• Port of Discharge\n• Final Destination`,
          400
        ));
      }
    }

    const baseProforma = proformas[0];

    // Merge totals and product lines
    let mergedProductLines = [];
    let totalPallets = 0;
    let totalSqm = 0;
    let totalAmount = 0;
    let totalNetWeight = 0;
    let totalGrossWeight = 0;

    // Create combined invoice numbers and dates string
    const invoiceNos = proformas.map(p => p.invoice_no).filter(Boolean).join(', ');
    const proformaDates = proformas.map(p => {
      if (!p.date) return '';
      const d = new Date(p.date);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : String(p.date).split(' ')[0];
    }).filter(Boolean).join(', ');

    proformas.forEach(p => {
      if (Array.isArray(p.product_lines)) {
        mergedProductLines = [...mergedProductLines, ...p.product_lines];
      }
      totalPallets += parseFloat(p.pallets || 0);
      totalSqm += parseFloat(p.total_sqm || 0);
      totalAmount += parseFloat(p.total_amount || 0);
      totalNetWeight += parseFloat(p.net_weight || 0);
      totalGrossWeight += parseFloat(p.gross_weight || 0);
    });

    const proforma = {
      ...baseProforma,
      invoice_no: invoiceNos,
      date: proformaDates,
      product_lines: mergedProductLines,
      pallets: totalPallets,
      total_sqm: totalSqm,
      total_amount: totalAmount,
      net_weight: totalNetWeight,
      gross_weight: totalGrossWeight,

      // Merged Packing Instructions fields
      pallet_type: mergeUniqueFieldValues(proformas.map(p => p.pallet_type)),
      tiles_back: mergeUniqueFieldValues(proformas.map(p => p.tiles_back)),
      boxes_marking: mergeUniqueFieldValues(proformas.map(p => p.boxes_marking)),
      box_type: mergeUniqueFieldValues(proformas.map(p => p.box_type)),
      fumigation: mergeUniqueFieldValues(proformas.map(p => p.fumigation)),
      legalisation: mergeUniqueFieldValues(proformas.map(p => p.legalisation)),
      other_instructions: mergeUniqueFieldValues(proformas.map(p => p.other_instructions), '\n'),

      lc_number: mergeUniqueFieldValues(proformas.map(p => p.lc_number)),
      lc_date: proformas.map(p => p.lc_date).find(d => d) || null,
      epcg_no: mergeUniqueFieldValues(proformas.map(p => p.epcg_no)),

      // For multi-select, keep array of ids in a new field if needed
      proforma_invoice_ids: proformas.map(p => p.id)
    };

    let companyDetails = null;
    try {
      const companyId = proforma.company_id || req.companyFilter;
      if (companyId) {
        const companyResult = await req.db.globalQuery(
          'SELECT name, address, iec_no, gstn, pan, settings, lut_arn_no, lut_date FROM companies WHERE id = $1',
          [companyId]
        );
        if (companyResult.rows.length > 0) {
          const company = companyResult.rows[0];
          const settings = company.settings || {};
          companyDetails = {
            name: company.name,
            address: company.address,
            iec_no: company.iec_no,
            gstn: company.gstn,
            pan: company.pan,
            bank_details: settings.bank_details || {},
            lut_arn_no: company.lut_arn_no,
            lut_date: company.lut_date
          };
        }
      }
    } catch (companyError) {
      debugLogger.warn('Failed to fetch company details for export invoice:', companyError.message);
    }

    // Merge company details into proforma object for backward compatibility
    if (companyDetails) {
      proforma.company_name = companyDetails.name;
      proforma.company_address = companyDetails.address;
      proforma.iec_no = companyDetails.iec_no;
      proforma.gstn = companyDetails.gstn;
      proforma.company_info = companyDetails;
      proforma.lut_arn_no = companyDetails.lut_arn_no;
      proforma.lut_date = companyDetails.lut_date;
    }

    // If it's a single PI, check if it already exists
    if (proformaIds.length === 1) {
      const existingParams = [proformaIds[0]];
      let existingQuery = `SELECT * FROM export_invoices WHERE proforma_invoice_id = $1`;
      if ('companyFilter' in req) {
        if (req.companyFilter === null) {
          existingQuery += ` AND company_id IS NULL`;
        } else {
          existingQuery += ` AND company_id = $2`;
          existingParams.push(req.companyFilter);
        }
      }
      const existingExport = await req.db.query(existingQuery, existingParams);

      if (existingExport.rows.length > 0) {
        return successResponse(
          res,
          {
            ...existingExport.rows[0],
            proforma_invoice_no: existingExport.rows[0].proforma_invoice_no || proforma.invoice_no,
            proforma_date: proforma.date ? (
              typeof proforma.date === 'string' && proforma.date.includes(',')
                ? proforma.date
                : (proforma.date instanceof Date ? proforma.date.toISOString().split('T')[0] : String(proforma.date).split('T')[0].split(' ')[0])
            ) : null,
            proforma_data: proforma,
            already_exists: true
          },
          'Export invoice already exists for this proforma'
        );
      }
    } else {
      // For multiple PIs, we could optionally check if any are already linked in the junction table
      const linkCheckQuery = `
        SELECT proforma_invoice_id 
        FROM export_invoice_proforma_links 
        WHERE proforma_invoice_id = ANY($1::uuid[])
      `;
      const linkCheck = await req.db.query(linkCheckQuery, [proformaIds]);
      if (linkCheck.rows.length > 0) {
        return next(new AppError('One or more selected Proforma Invoices are already converted.', 400));
      }
    }

    const companyId = req.companyFilter;
    if (!companyId) {
      return next(new AppError('Company context is required.', 400));
    }

    // Use a default system UUID for super_admin without company
    const effectiveCompanyId = companyId || proforma.company_id || '00000000-0000-0000-0000-000000000000';
    const nextNumber = await generateDocumentNumber('EXP', effectiveCompanyId, req.db, new Date());

    const exportInvoiceData = {
      proforma_invoice_id: proformaIds.length === 1 ? proforma.id : null,
      proforma_invoice_ids: proformaIds,
      invoice_no: nextNumber.baseNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      proforma_invoice_no: proforma.invoice_no,
      proforma_date: proforma.date ? (
        typeof proforma.date === 'string' && proforma.date.includes(',')
          ? proforma.date
          : (proforma.date instanceof Date ? proforma.date.toISOString().split('T')[0] : String(proforma.date).split('T')[0].split(' ')[0])
      ) : null,
      booking_no: proforma.booking_no || '',
      client_name: proforma.client_name,
      client_id: proforma.client_id,
      country: proforma.country,
      consignee_details: proforma.consignee_details || '',
      buyer_details: proforma.buyer_details || '',
      payment_terms: proforma.payment_terms || '',
      delivery_terms: proforma.delivery_terms || '',
      port_of_loading: proforma.port_of_loading || '',
      port_of_discharge: proforma.port_of_discharge || '',
      final_destination: proforma.final_destination || '',
      tariff_code: proforma.tariff_code || '69072100',
      product_lines: proforma.product_lines || [],
      pallets: proforma.pallets || 0,
      total_sqm: proforma.total_sqm || 0,
      total_amount: proforma.total_amount || 0,
      pallet_type: proforma.pallet_type || 'NORMAL WOODEN PALLETS',
      tiles_back: proforma.tiles_back || 'WITH MADE IN INDIA',
      boxes_marking: proforma.boxes_marking || 'WITH',
      box_type: proforma.box_type || 'NON BRANDED BOXES',
      fumigation: proforma.fumigation || 'YES',
      legalisation: proforma.legalisation || 'NO',
      other_instructions: proforma.other_instructions || '',
      net_weight: proforma.net_weight || 0,
      gross_weight: proforma.gross_weight || 0,
      bl_no: '',
      bl_date: null,
      shipping_bill_no: '',
      shipping_bill_date: null,
      lut_bond_ref: proforma.lut_arn_no || '',
      pre_carriage_by: '',
      vessel_flight_no: '',
      place_of_receipt: '',
      buyers_order_no: '',
      buyers_order_date: null,
      status: 'Draft',
      currency: 'USD',
      exchange_rate: 1,
      is_locked: false,
      company_name: proforma.company_name,
      company_address: proforma.company_address,
      iec_no: proforma.iec_no,
      gstn: proforma.gstn,
      lut_date: proforma.lut_date || null,
      order_id: proforma.order_id || proforma.proforma_order_id,
      lc_number: proforma.lc_number || '',
      lc_date: proforma.lc_date ? (
        typeof proforma.lc_date === 'string' && proforma.lc_date.includes(',')
          ? proforma.lc_date
          : (proforma.lc_date instanceof Date ? proforma.lc_date.toISOString().split('T')[0] : String(proforma.lc_date).split('T')[0].split(' ')[0])
      ) : null,
      epcg_no: proforma.epcg_no || '',
      already_exists: false
    };

    return successResponse(
      res,
      exportInvoiceData,
      'Export invoice data prepared from proforma'
    );
  } catch (error) {
    next(error);
  }
};

export const getFullFromProforma = async (req, res, next) => {
  try {
    const { proformaId } = req.params;

    // Allow passing either a UUID proforma ID or an invoice number (e.g., PI/01/26/019)
    let proformaResult;
    const idIsUUID = validateUUID(proformaId, 'Proforma Invoice ID').isValid;
    if (idIsUUID) {
      const piParams = [proformaId];
      let piQuery = `SELECT pi.* FROM proforma_invoices pi WHERE pi.id = $1`;
      if ('companyFilter' in req) {
        piQuery += ` AND pi.company_id = $2`;
        piParams.push(req.companyFilter);
      }
      proformaResult = await req.db.query(piQuery, piParams);
    } else {
      const piParams = [proformaId];
      let piQuery = `SELECT pi.* FROM proforma_invoices pi WHERE pi.invoice_no = $1`;
      if ('companyFilter' in req) {
        piQuery += ` AND pi.company_id = $2`;
        piParams.push(req.companyFilter);
      }
      proformaResult = await req.db.query(piQuery, piParams);
    }

    if (proformaResult.rows.length === 0) {
      return next(new AppError('Proforma invoice not found', 404));
    }

    const proforma = proformaResult.rows[0];

    // Fetch company details separately to avoid cross-DB join issues
    let companyDetails = { name: '', address: '', iec_no: '', gstn: '', contact_number: '' };
    try {
      const companyId = proforma.company_id || req.companyFilter;
      if (companyId) {
        const companyResult = await req.db.globalQuery(
          'SELECT name as company_name, address as company_address, iec_no, gstn, contact_number as company_phone, logo_url, bank_name, account_holder_name, account_number, swift_code, branch_name, bank_address, lut_arn_no, lut_date FROM companies WHERE id = $1',
          [companyId]
        );
        if (companyResult.rows.length > 0) {
          companyDetails = companyResult.rows[0];
        }
      }
    } catch (companyError) {
      debugLogger.warn('Failed to fetch company details for full export bundle:', companyError.message);
    }

    Object.assign(proforma, companyDetails);

    const companyId = req.companyFilter;
    if (!companyId) {
      return next(new AppError('Company context is required.', 400));
    }

    const effectiveCompanyId = companyId || proforma.company_id || '00000000-0000-0000-0000-000000000000';
    const nextNumber = await previewDocumentNumber('EXP', effectiveCompanyId, req.db, new Date());
    const plPreview = await previewDocumentNumber('PL', effectiveCompanyId, req.db, new Date());
    const vgmPreview = await previewDocumentNumber('VGM', effectiveCompanyId, req.db, new Date());
    const siPreview = await previewDocumentNumber('SI', effectiveCompanyId, req.db, new Date());
    const anxPreview = await previewDocumentNumber('ANX', effectiveCompanyId, req.db, new Date());

    const exportInvoiceDefaults = {
      proforma_invoice_id: proforma.id,
      invoice_no: nextNumber.baseNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      proforma_invoice_no: proforma.invoice_no,
      proforma_date: proforma.date ? (proforma.date instanceof Date ? proforma.date.toISOString().split('T')[0] : String(proforma.date).split('T')[0].split(' ')[0]) : null,
      booking_no: proforma.booking_no || '',
      client_name: proforma.client_name,
      client_id: proforma.client_id,
      country: proforma.country,
      consignee_details: proforma.consignee_details || '',
      buyer_details: proforma.buyer_details || '',
      payment_terms: proforma.payment_terms || '',
      delivery_terms: proforma.delivery_terms || '',
      port_of_loading: proforma.port_of_loading || '',
      port_of_discharge: proforma.port_of_discharge || '',
      final_destination: proforma.final_destination || '',
      tariff_code: proforma.tariff_code || '69072100',
      product_lines: proforma.product_lines || [],
      pallets: proforma.pallets || 0,
      total_sqm: proforma.total_sqm || 0,
      total_amount: proforma.total_amount || 0,
      pallet_type: proforma.pallet_type || 'NORMAL WOODEN PALLETS',
      tiles_back: proforma.tiles_back || 'WITH MADE IN INDIA',
      boxes_marking: proforma.boxes_marking || 'WITH',
      box_type: proforma.box_type || 'NON BRANDED BOXES',
      fumigation: proforma.fumigation || 'YES',
      legalisation: proforma.legalisation || 'NO',
      other_instructions: proforma.other_instructions || '',
      net_weight: proforma.net_weight || 0,
      gross_weight: proforma.gross_weight || 0,
      bl_no: proforma.bl_no || '',
      bl_date: proforma.bl_date || null,
      shipping_bill_no: proforma.sb_no || proforma.shipping_bill_no || '',
      shipping_bill_date: proforma.sb_date || proforma.shipping_bill_date || null,
      lut_bond_ref: proforma.lut_arn_no || proforma.lut_bond_ref || '',
      pre_carriage_by: proforma.pre_carriage_by || '',
      vessel_flight_no: proforma.vessel_flight_no || '',
      place_of_receipt: proforma.place_of_receipt || '',
      buyers_order_no: proforma.buyers_order_no || '',
      buyers_order_date: proforma.buyers_order_date || null,
      status: 'Draft',
      currency: 'USD',
      exchange_rate: 1,
      is_locked: false,
      company_name: proforma.company_name,
      company_address: proforma.company_address,
      iec_no: proforma.iec_no,
      gstn: proforma.gstn,
      country_of_origin: 'INDIA',
      lc_number: proforma.lc_number || '',
      lc_date: proforma.lc_date ? (proforma.lc_date instanceof Date ? proforma.lc_date.toISOString().split('T')[0] : String(proforma.lc_date).split('T')[0].split(' ')[0]) : null,
      epcg_no: proforma.epcg_no || '',
      already_exists: false
    };

    const annexureDefaults = {
      id: null,
      export_invoice_id: null,
      annexure_no: anxPreview.baseNumber,
      shipping_bill_no: '',
      shipping_bill_date: null,
      manufacturer_name: '',
      manufacturer_address: '',
      survey_no: '',
      examination_date: null,
      permission_no: '',
      permission_year: '',
      lut_date: proforma.lut_date || null,
      exists: false
    };

    const packingDefaults = {
      exists: false,
      packing_list_no: plPreview.baseNumber,
      packing_list_date: exportInvoiceDefaults.invoice_date,
      consignee: exportInvoiceDefaults.consignee_details || 'TO THE ORDER',
      buyer: exportInvoiceDefaults.buyer_details || exportInvoiceDefaults.consignee_details || 'TO THE ORDER',
      total_pallets: annexureDefaults.total_pallets || exportInvoiceDefaults.pallets || 0,
      net_weight: annexureDefaults.net_weight || proforma.net_weight || 0,
      gross_weight: annexureDefaults.gross_weight || proforma.gross_weight || 0,
      sb_no: '',
      sb_date: null,
      tariff_code: exportInvoiceDefaults.tariff_code || '69072100'
    };

    const vgmDefaults = {
      exists: false,
      vgm_no: vgmPreview.baseNumber,
      vgm: null,
      hs_code: exportInvoiceDefaults.tariff_code || '6907',
      country_of_origin: exportInvoiceDefaults.country || 'INDIA',
      product_description: 'GLAZED PORCELAIN TILES MATT 60X120X1 SQM PBX',
      total_boxes: 0,
      pallets_type: 'NORMAL WOODEN PALLETS',
      made_in_india: 'MADE IN INDIA',
      tiles_back: exportInvoiceDefaults.tiles_back || 'MADE IN INDIA',
      boxes_type: exportInvoiceDefaults.box_type || 'NON BRANDED BOXES',
      fumigation: exportInvoiceDefaults.fumigation || 'YES',
      legalisation: exportInvoiceDefaults.legalisation || 'NO',
      other_instructions: exportInvoiceDefaults.other_instructions || 'NO',
      export_invoice: {
        id: null,
        invoice_no: exportInvoiceDefaults.invoice_no,
        invoice_date: exportInvoiceDefaults.invoice_date,
        client_name: exportInvoiceDefaults.client_name,
        country: exportInvoiceDefaults.country,
        consignee_details: exportInvoiceDefaults.consignee_details,
        gross_weight: annexureDefaults.gross_weight,
        net_weight: annexureDefaults.net_weight,
        product_lines: exportInvoiceDefaults.product_lines,
        booking_no: exportInvoiceDefaults.booking_no
      },
      company: {
        name: exportInvoiceDefaults.company_name,
        address: exportInvoiceDefaults.company_address,
        iec_no: exportInvoiceDefaults.iec_no
      },
      container_details: annexureDefaults.container_details,
      annexure_gross_weight: annexureDefaults.gross_weight
    };

    const shippingDefaults = {
      exists: false,
      si_no: siPreview.baseNumber,
      date: null,
      packing_list_id: null,
      invoice_ref: exportInvoiceDefaults.invoice_no,
      shipper_details: {},
      consignee_details: exportInvoiceDefaults.consignee_details || {},
      vessel_name: '',
      voyage_number: '',
      booking_number: exportInvoiceDefaults.booking_no || '',
      carrier_name: '',
      port_of_loading: exportInvoiceDefaults.port_of_loading || '',
      port_of_discharge: exportInvoiceDefaults.port_of_discharge || '',
      final_destination: exportInvoiceDefaults.final_destination || '',
      container_type: '',
      container_count: 0,
      container_numbers: [],
      seal_numbers: [],
      gross_weight: annexureDefaults.gross_weight,
      net_weight: annexureDefaults.net_weight,
      cbm: null,
      freight_terms: null,
      special_instructions: null,
      total_boxes: null,
      total_pallets: annexureDefaults.total_pallets
    };

    const bundle = {
      proforma,
      export_invoice: exportInvoiceDefaults,
      annexure: annexureDefaults,
      packing_list: packingDefaults,
      vgm: vgmDefaults,
      shipping_instruction: shippingDefaults
    };

    // Auto-update or create linked documents if they don't exist
    // This ensures data flow across the entire chain

    return successResponse(res, bundle, 'Full export bundle prepared from proforma');
  } catch (error) {
    next(error);
  }
};

// Schema enforcement moved to strict database migrations (20260518_schema_hardening_and_rls.sql)

export const create = async (req, res, next) => {
  try {
    const {
      proforma_invoice_id, invoice_date, client_name, client_id, country,
      consignee_details, buyer_details, payment_terms, delivery_terms,
      port_of_loading, port_of_discharge, final_destination, tariff_code,
      product_lines, pallets, total_sqm, total_amount, pallet_type,
      tiles_back, boxes_marking, box_type, fumigation, legalisation,
      other_instructions, bl_no, bl_date, shipping_bill_no, shipping_bill_date, lut_bond_ref,
      pre_carriage_by, vessel_flight_no, place_of_receipt, net_weight, gross_weight,
      buyers_order_no, buyers_order_date, booking_no, lut_date, country_of_origin,
      supply_declaration, ftp_incentive_declaration, lc_number, lc_date, epcg_no
    } = req.body;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    const m_delivery_terms = (delivery_terms !== undefined ? delivery_terms : req.body.deliveryTerms || '').toString().trim().toUpperCase();
    if (m_delivery_terms) {
      const VALID_INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
      const isValidIncoterm = VALID_INCOTERMS.some(term => m_delivery_terms.startsWith(term));
      if (!isValidIncoterm) {
        return next(new AppError(`Invalid delivery term: ${m_delivery_terms}. Must start with a valid INCOTERM (e.g., FOB, CIF, EXW).`, 400));
      }
    }


    const piIdsToCheck = req.body.proforma_invoice_ids && req.body.proforma_invoice_ids.length > 0
      ? req.body.proforma_invoice_ids
      : (proforma_invoice_id ? [proforma_invoice_id] : []);

    if (piIdsToCheck.length > 0) {
      const piCheck = await req.db.query(
        `SELECT is_used, is_converted, invoice_no, approval_status, status FROM proforma_invoices WHERE id = ANY($1::uuid[]) AND company_id = $2`,
        [piIdsToCheck, companyId]
      );
      for (const pi of piCheck.rows) {
        if (pi.is_used || pi.is_converted) {
          return next(new AppError(`Proforma Invoice ${pi.invoice_no} has already been converted to an Export Invoice.`, 400));
        }
        // Accept if either the approval workflow status is 'Approved' OR the regular status is 'Approved'/'Locked'
        // (PIs created before the approval workflow have approval_status='Pending' by default)
        const isApprovalApproved = pi.approval_status === 'Approved';
        const isStatusApproved = ['Approved', 'Locked', 'Finalized', 'Ready', 'Active'].includes(pi.status);
        if (!isApprovalApproved && !isStatusApproved) {
          return next(new AppError(`Proforma Invoice ${pi.invoice_no} has not been fully approved yet. (Status: ${pi.status}, Approval Workflow: ${pi.approval_status || 'N/A'})`, 403));
        }
      }
    }

    const documentNumber = await generateDocumentNumber('EXP', companyId, req.db, new Date(invoice_date));

    // Final uniqueness check
    const duplicateCheck = await req.db.query(
      'SELECT id FROM export_invoices WHERE invoice_no = $1 AND company_id = $2 AND deleted_at IS NULL',
      [documentNumber.baseNumber, companyId]
    );
    if (duplicateCheck.rows.length > 0) {
      return next(new AppError(`Generated Export Invoice number ${documentNumber.baseNumber} already exists.`, 409));
    }

    const overrideStockCheck = req.body.override_stock_check === true && req.user?.role === 'company_admin';
    
    // Inventory Check
    if (product_lines && product_lines.length > 0 && !overrideStockCheck) {
      for (const line of product_lines) {
        const prodId = line.product_id || line.productId;
        const requiredQty = parseFloat(line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0) || 0;
        
        if (prodId && requiredQty > 0) {
          try {
            const stockCheckRes = await req.db.query(
              `SELECT SUM(boxes_available) as total_available 
               FROM stock_balances 
               WHERE company_id = $1 AND product_id = $2`,
              [companyId, prodId]
            );
            const available = parseFloat(stockCheckRes.rows[0]?.total_available || 0);
            if (available < requiredQty) {
              return next(new AppError(`Insufficient stock for product ${line.product || line.product_name || 'Unknown'}. Required: ${requiredQty}, Available: ${available}`, 400));
            }
          } catch (e) {
            // Ignore if view doesn't exist yet for backwards compatibility during migration
          }
        }
      }
    }

    let invoice_currency = req.body.invoice_currency || 'USD';
    let forex_rate = parseFloat(req.body.forex_rate) || 83.50;
    let total_amount_fcy = parseFloat(req.body.total_amount_fcy) || 0;
    let total_amount_inr = parseFloat(req.body.total_amount_inr) || 0;
    let customs_assessable_value = parseFloat(req.body.customs_assessable_value) || 0;

    if (invoice_currency !== 'INR' && total_amount_fcy > 0) {
      total_amount_inr = total_amount_fcy * forex_rate;
    } else if (invoice_currency === 'INR') {
      total_amount_inr = total_amount_fcy || total_amount;
    }

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      // Removed dangerous runtime ALTER TABLE. Schema should be handled in databaseProvisioning.js
      const result = await client.query(
        `INSERT INTO export_invoices 
        (company_id, proforma_invoice_id, invoice_no, invoice_date, client_name, client_id,
          country, consignee_details, buyer_details, payment_terms, delivery_terms,
          port_of_loading, port_of_discharge, final_destination, tariff_code,
          product_lines, pallets, total_sqm, total_amount, pallet_type, tiles_back,
          boxes_marking, box_type, fumigation, legalisation, other_instructions,
          bl_no, bl_date, booking_no, shipping_bill_no, shipping_bill_date, lut_bond_ref, pre_carriage_by,
          vessel_flight_no, place_of_receipt, net_weight, gross_weight,
          buyers_order_no, buyers_order_date, status, created_by, created_at, updated_at,
          currency, exchange_rate, is_locked, lut_date, country_of_origin,
          supply_declaration, ftp_incentive_declaration, lc_number, lc_date, epcg_no,
          invoice_currency, forex_rate, total_amount_fcy, total_amount_inr, customs_assessable_value)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                $42, $43, $44, $45, $46, $47, $48, $49, $50, $51,
                $52, $53, $54, $55, $56)
        RETURNING *`,
        [
          companyId,                                    // $1
          proforma_invoice_id || null,                  // $2
          documentNumber.baseNumber,                    // $3
          invoice_date,                                 // $4
          client_name,                                  // $5
          client_id || null,                            // $6
          country || null,                              // $7
          consignee_details || null,                    // $8
          buyer_details || null,                        // $9
          payment_terms || null,                        // $10
          delivery_terms || null,                       // $11
          port_of_loading || null,                      // $12
          port_of_discharge || null,                    // $13
          final_destination || null,                    // $14
          tariff_code || null,                          // $15
          JSON.stringify(product_lines || []),          // $16
          pallets || 0,                                 // $17
          total_sqm || 0,                               // $18
          total_amount || 0,                            // $19
          pallet_type || 'Normal Wooden Pallet',        // $20
          tiles_back || 'WITH MADE IN INDIA',           // $21
          boxes_marking || 'WITH',                      // $22
          box_type || 'NON BRANDED BOXES',              // $23
          fumigation || 'YES',                          // $24
          legalisation || 'NO',                         // $25
          other_instructions || null,                   // $26
          bl_no || null,                                // $27
          bl_date || null,                              // $28
          booking_no || null,                           // $29
          shipping_bill_no || null,                     // $30
          shipping_bill_date || null,                   // $31
          lut_bond_ref || null,                         // $32
          pre_carriage_by || null,                      // $33
          vessel_flight_no || null,                     // $34
          place_of_receipt || null,                     // $35
          net_weight || 0,                              // $36
          gross_weight || 0,                            // $37
          buyers_order_no || null,                      // $38
          buyers_order_date || null,                    // $39
          req.body.status || 'Draft',                   // $40
          req.user?.id || null,                         // $41
          req.body.currency || 'USD',                   // $42
          req.body.exchange_rate || 1,                  // $43
          req.body.is_locked || false,                  // $44
          lut_date || null,                             // $45
          country_of_origin || 'INDIA',                 // $46
          supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND', // $47
          ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"', // $48
          lc_number || null,                            // $49
          lc_date || null,                              // $50
          epcg_no || null,                              // $51
          invoice_currency,                             // $52
          forex_rate,                                   // $53
          total_amount_fcy,                             // $54
          total_amount_inr,                             // $55
          customs_assessable_value                      // $56
        ]
      );

      const exportId = result.rows[0].id;

      if (product_lines && product_lines.length > 0) {
        const valueStrings = [];
        const queryParams = [];
        let paramCounter = 1;
        
        for (const line of product_lines) {
          valueStrings.push(`($${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++})`);
          
          queryParams.push(
            exportId,
            line.product_id || line.productId || null,
            line.product || line.product_name || line.name || 'Unknown',
            line.size || null,
            line.surface || null,
            line.thickness || null,
            parseInt(line.totalPallets || line.total_pallets || line.pallets || 0) || 0,
            parseInt(line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0) || 0,
            parseFloat(line.boxWeight || line.box_weight || line.perBoxWeight || line.per_box_weight || line.weightPerSqm || line.weight_per_sqm || 0) || 0,
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
          );
        }
        
        const query = `
          INSERT INTO export_invoice_lines 
          (export_invoice_id, product_id, product_name, size, surface, thickness,
           total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight,
           product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc)
          VALUES ${valueStrings.join(', ')}
        `;
        await client.query(query, queryParams);

        // Normalize and insert into export_invoice_items (Phase 2 Relational Transition)
        const itemValueStrings = [];
        const itemQueryParams = [];
        let itemParamCounter = 1;
        for (const line of product_lines) {
          itemValueStrings.push(`($${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++})`);
          
          itemQueryParams.push(
            companyId,
            exportId,
            line.product_id || line.productId || null,
            line.sku || null,
            line.product || line.product_name || line.name || 'Unknown',
            parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0) || 0,
            parseFloat(line.rate || line.unit_price || line.price || 0) || 0,
            parseFloat(line.amount || 0) || 0,
            line.hsn_code || line.hsnCode || null,
            parseFloat(line.netWeight || line.net_weight || 0) || 0,
            parseFloat(line.grossWeight || line.gross_weight || 0) || 0
          );
        }
        

        const itemQuery = `
          INSERT INTO export_invoice_items 
          (company_id, export_invoice_id, product_id, sku, description, quantity, unit_price, total_amount, hsn_code, net_weight, gross_weight)
          VALUES ${itemValueStrings.join(', ')}
        `;
        await client.query(itemQuery, itemQueryParams);

        // Deduct inventory
        if (!overrideStockCheck) {
          const txValueStrings = [];
          const txQueryParams = [];
          let txParamCounter = 1;
          for (const line of product_lines) {
            const prodId = line.product_id || line.productId;
            const requiredQty = parseFloat(line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0) || 0;
            const requiredSqm = parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0) || 0;
            
            if (prodId && requiredQty > 0) {
              txValueStrings.push(`($${txParamCounter++}, $${txParamCounter++}, $${txParamCounter++}, $${txParamCounter++}, $${txParamCounter++}, $${txParamCounter++}, $${txParamCounter++}, $${txParamCounter++}, CURRENT_DATE)`);
              txQueryParams.push(companyId, prodId, 'GDN', 'Export Invoice', exportId, documentNumber.baseNumber, requiredQty, requiredSqm);
            }
          }
          if (txValueStrings.length > 0) {
            try {
              await client.query(`
                INSERT INTO stock_transactions 
                (company_id, product_id, transaction_type, reference_type, reference_id, reference_number, boxes_quantity, sqm_quantity, transaction_date)
                VALUES ${txValueStrings.join(', ')}
              `, txQueryParams);
            } catch (e) {
              // Ignore if table doesn't exist
            }
          }
        }
      }

      if (req.body.proforma_invoice_ids && Array.isArray(req.body.proforma_invoice_ids) && req.body.proforma_invoice_ids.length > 0) {
        const piIds = req.body.proforma_invoice_ids;
        
        // Batch insert links
        const linkValueStrings = [];
        const linkParams = [];
        let pCount = 1;
        for (const pi_id of piIds) {
          linkValueStrings.push(`($${pCount++}, $${pCount++}, $${pCount++})`);
          linkParams.push(exportId, pi_id, companyId);
        }
        await client.query(`
          INSERT INTO export_invoice_proforma_links (export_invoice_id, proforma_invoice_id, company_id)
          VALUES ${linkValueStrings.join(', ')}
          ON CONFLICT (export_invoice_id, proforma_invoice_id) DO NOTHING
        `, linkParams);

        // Batch update proforma invoices
        await client.query(
          `UPDATE proforma_invoices 
           SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
           WHERE id = ANY($2::uuid[])`,
          [exportId, piIds]
        );
      } else if (proforma_invoice_id) {
        await client.query(`
          INSERT INTO export_invoice_proforma_links (export_invoice_id, proforma_invoice_id, company_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (export_invoice_id, proforma_invoice_id) DO NOTHING
        `, [exportId, proforma_invoice_id, companyId]);

        await client.query(
          `UPDATE proforma_invoices 
           SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
           WHERE id = $2`,
          [exportId, proforma_invoice_id]
        );
      }

      await client.query('COMMIT');

      // Audit Log Entry
      logAction({
        userId: req.user.id, companyId, action: 'CREATE', entityType: 'export_invoice',
        entityId: result.rows[0].id, newValue: { invoice_no: result.rows[0].invoice_no, total_amount: result.rows[0].total_amount },
        ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
      }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

      // Notify relevant roles about the new export invoice
      notificationService.notifyExportInvoiceCreated(companyId, result.rows[0], req.db).catch(err =>
        debugLogger.error('[Notification] Export Invoice notification error:', err.message)
      );

      // Automated Account Integration - Unify with update logic
      const activeStatuses = ['Finalized', 'Dispatched', 'Confirmed', 'Sent'];
      if (req.body.status && activeStatuses.includes(req.body.status)) {
        createReceivableFromInvoice(result.rows[0], req.db).catch(err =>
          debugLogger.error('[LedgerSync] Failed to sync new invoice:', err.message)
        );
      }

      // Fetch enriched record for response
      const enrichedRes = await req.db.query(
        `SELECT ei.*, pi.invoice_no as proforma_invoice_no, pi.date as proforma_date
         FROM export_invoices ei
         LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
         WHERE ei.id = $1`,
        [exportId]
      );

      let createdInvoice = enrichedRes.rows[0];

      // Fetch live company info
      let companyInfo = {};
      try {
        const companyResult = await req.db.globalQuery(
          'SELECT *, settings FROM companies WHERE id = $1',
          [companyId]
        );
        if (companyResult.rows.length > 0) {
          const company = companyResult.rows[0];
          const settings = company.settings || {};
          const bank = settings.bank_details || {};
          companyInfo = {
            ...company,
            bank_details: {
              bank_name: company.bank_name || bank.bank_name || bank.bankName || '',
              account_name: company.account_holder_name || bank.account_name || bank.accountName || company.name || '',
              account_no: company.account_number || bank.account_no || bank.accountNumber || '',
              swift_code: company.swift_code || bank.swift_code || bank.swiftCode || '',
              bank_address: company.bank_address || company.branch_name || bank.bank_address || bank.bankAddress || ''
            }
          };
        }
      } catch (e) {
        debugLogger.error('Error fetching company info in Export Invoice Create:', e.message);
      }
      createdInvoice.company_info = companyInfo;

      return successResponse(res, createdInvoice, 'Export invoice created successfully', 201);
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

export const update = async (req, res, next) => {
  let client;
  try {
    const { id } = req.params;
    const companyId = req.companyFilter || req.user?.companyId;

    if (!companyId) {
      return next(new AppError('Company context is required.', 400));
    }

    client = await req.db.getClient();
    await client.query('BEGIN');

    // SECURITY FIX: Enforce document locking to prevent unauthorized modifications
    const lockCheck = await client.query(
      `SELECT is_locked, is_used FROM export_invoices WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (lockCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Export invoice not found or unauthorized', 404));
    }

    if (lockCheck.rows[0].is_locked) {
      await client.query('ROLLBACK');
      return next(new AppError('Cannot update a locked export invoice. Please unlock it first.', 403));
    }

    // Validate status transition if status is being changed
    if (req.body.status !== undefined) {
      const currentDoc = await client.query(
        `SELECT status FROM export_invoices WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
      if (currentDoc.rows.length > 0) {
        const transition = validateStatusTransition('export_invoice', currentDoc.rows[0].status, req.body.status);
        if (!transition.valid) {
          await client.query('ROLLBACK');
          return next(new AppError(transition.reason, 400));
        }
      }
    }
    const fieldsToTrack = [
      'invoice_date', 'client_name', 'country', 'consignee_details', 'buyer_details',
      'payment_terms', 'delivery_terms', 'port_of_loading', 'port_of_discharge',
      'final_destination', 'tariff_code', 'product_lines', 'pallets', 'total_sqm',
      'total_amount', 'pallet_type', 'tiles_back', 'boxes_marking', 'box_type',
      'fumigation', 'legalisation', 'other_instructions', 'shipping_bill_no',
      'shipping_bill_date', 'lut_bond_ref', 'pre_carriage_by', 'vessel_flight_no',
      'place_of_receipt', 'net_weight', 'gross_weight', 'buyers_order_no',
      'buyers_order_date', 'booking_no', 'status', 'currency', 'exchange_rate', 'is_locked', 'lut_date', 'country_of_origin',
      'supply_declaration', 'ftp_incentive_declaration', 'bl_no', 'bl_date',
      'lc_number', 'lc_date', 'epcg_no'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const field of fieldsToTrack) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        const raw = req.body[field];
        const value = raw === '' ? null : (field === 'product_lines' ? JSON.stringify(raw) : raw);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    let whereClause = `WHERE id = $${paramCount}`;
    paramCount++;
    values.push(companyId);
    whereClause += ` AND company_id = $${paramCount}`;

    const result = await client.query(
      `UPDATE export_invoices SET ${updates.join(', ')} ${whereClause} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Export invoice not found or unauthorized', 404));
    }

    // Handle separate lines table if product_lines provided
    if (req.body.product_lines !== undefined) {
      const lines = Array.isArray(req.body.product_lines) ? req.body.product_lines : JSON.parse(req.body.product_lines || '[]');
      await client.query('DELETE FROM export_invoice_lines WHERE export_invoice_id = $1', [id]);
      await client.query('DELETE FROM export_invoice_items WHERE export_invoice_id = $1', [id]);

      if (lines && lines.length > 0) {
        const valueStrings = [];
        const queryParams = [];
        let paramCounter = 1;

        for (const line of lines) {
          valueStrings.push(`($${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++}, $${paramCounter++})`);
          
          queryParams.push(
            id,
            line.product_id || line.productId || null,
            line.product || line.product_name || line.name || 'Unknown',
            line.size || null,
            line.surface || null,
            line.thickness || null,
            parseInt(line.totalPallets || line.total_pallets || line.pallets || 0) || 0,
            parseInt(line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0) || 0,
            parseFloat(line.boxWeight || line.box_weight || line.perBoxWeight || line.per_box_weight || line.weightPerSqm || line.weight_per_sqm || 0) || 0,
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
            !!(line.is_foc || line.isFoc || line.foc)
          );
        }

        const query = `
          INSERT INTO export_invoice_lines 
          (export_invoice_id, product_id, product_name, size, surface, thickness,
           total_pallets, total_boxes, box_weight, sqm_auto, rate, amount, net_weight, gross_weight,
           product_type, sanitaryware_product_id, model_no, category, color, pieces, cartons, cbm, is_foc)
          VALUES ${valueStrings.join(', ')}
        `;
        await client.query(query, queryParams);

        // Normalize and insert into export_invoice_items (Phase 2 Relational Transition)
        const itemValueStrings = [];
        const itemQueryParams = [];
        let itemParamCounter = 1;
        for (const line of lines) {
          itemValueStrings.push(`($${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++}, $${itemParamCounter++})`);
          
          itemQueryParams.push(
            companyId,
            id,
            line.product_id || line.productId || null,
            line.sku || null,
            line.product || line.product_name || line.name || 'Unknown',
            parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0) || 0,
            parseFloat(line.rate || line.unit_price || line.price || 0) || 0,
            parseFloat(line.amount || 0) || 0,
            line.hsn_code || line.hsnCode || null,
            parseFloat(line.netWeight || line.net_weight || 0) || 0,
            parseFloat(line.grossWeight || line.gross_weight || 0) || 0
          );
        }
        
        const itemQuery = `
          INSERT INTO export_invoice_items 
          (company_id, export_invoice_id, product_id, sku, description, quantity, unit_price, total_amount, hsn_code, net_weight, gross_weight)
          VALUES ${itemValueStrings.join(', ')}
        `;
        await client.query(itemQuery, itemQueryParams);
      }
    }

    await client.query('COMMIT');

    // Trigger background sync
    const changedFields = updates.map(u => u.split(' = ')[0]);
    syncUpdatesAcrossStages(id, 'export_invoice', changedFields, companyId, req.db).catch(() => { });

    // Audit Log Entry
    logAction({
      userId: req.user.id, companyId, action: 'UPDATE', entityType: 'export_invoice',
      entityId: id, newValue: { invoice_no: result.rows[0].invoice_no, total_amount: result.rows[0].total_amount },
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    // Automated Account Integration - Match frontend statuses
    const activeStatuses = ['Finalized', 'Dispatched', 'Confirmed', 'Sent'];
    if (req.body.status && activeStatuses.includes(req.body.status)) {
      createReceivableFromInvoice(result.rows[0], req.db).catch(err =>
        debugLogger.error('[LedgerSync] Failed to sync updated invoice:', err.message)
      );
    }

    // Auto Inventory Integration
    if (req.body.status === 'Dispatched' || req.body.status === 'Shipped') {
      try {
        const linesResult = await req.db.query('SELECT * FROM export_invoice_lines WHERE export_invoice_id = $1', [id]);
        await syncInventoryFromInvoice(result.rows[0], linesResult.rows, req);
      } catch (err) {
        debugLogger.error('[InventorySync] Failed to sync inventory for invoice:', err.message);
      }
    }

    // Fetch enriched record for response (includes company_info and proforma details)
    const enrichedRes = await req.db.query(
      `SELECT ei.*, pi.invoice_no as proforma_invoice_no, pi.date as proforma_date
       FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       WHERE ei.id = $1 AND ei.company_id = $2`,
      [id, companyId]
    );

    let updatedInvoice = enrichedRes.rows[0];

    // Fetch live company info for the response
    let companyInfo = {};
    try {
      const companyResult = await req.db.globalQuery(
        'SELECT name, address, iec_no, gstn, settings, lut_arn_no, lut_date FROM companies WHERE id = $1',
        [companyId]
      );
      if (companyResult.rows.length > 0) {
        const company = companyResult.rows[0];
        companyInfo = {
          name: company.name,
          address: company.address,
          iec_no: company.iec_no,
          gstn: company.gstn,
          lut_arn_no: company.lut_arn_no,
          lut_date: company.lut_date,
          bank_details: (company.settings || {}).bank_details || {}
        };
      }
    } catch (e) { }
    updatedInvoice.company_info = companyInfo;

    return successResponse(res, updatedInvoice, 'Export invoice updated successfully');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const remove = async (req, res, next) => {
  let client;

  try {
    const { id } = req.params;
    const { force } = req.query;

    const idValidation = validateUUID(id, 'Export Invoice ID');
    if (!idValidation.isValid) {
      return next(new AppError(idValidation.error, 400));
    }

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if ('companyFilter' in req) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const preCheck = await req.db.query(
      `SELECT id, invoice_no, is_locked FROM export_invoices ${whereConditions}`,
      queryParams
    );

    if (preCheck.rows.length === 0) {
      return next(new AppError('Export invoice not found', 404));
    }

    if (preCheck.rows[0].is_locked) {
      return next(new AppError('Cannot delete a locked export invoice. Please unlock it first.', 403));
    }

    const invoiceRecord = preCheck.rows[0];

    if (force !== 'true') {
      const dependencies = [];

      try {
        const plParams = [id];
        let plQuery = `SELECT COUNT(*) as count FROM packing_lists WHERE export_invoice_id = $1`;
        if ('companyFilter' in req) {
          if (req.companyFilter === null) {
            plQuery += ` AND company_id IS NULL`;
          } else {
            plQuery += ` AND company_id = $2`;
            plParams.push(req.companyFilter);
          }
        }
        const plResult = await req.db.query(plQuery, plParams);
        if (parseInt(plResult.rows[0].count) > 0) {
          dependencies.push({ type: 'Packing Lists', count: parseInt(plResult.rows[0].count) });
        }
      } catch (e) {
      }

      try {
        const annParams = [id];
        let annQuery = `SELECT COUNT(*) as count FROM export_invoice_annexures WHERE export_invoice_id = $1`;
        if ('companyFilter' in req) {
          if (req.companyFilter === null) {
            annQuery += ` AND company_id IS NULL`;
          } else {
            annQuery += ` AND company_id = $2`;
            annParams.push(req.companyFilter);
          }
        }
        const annResult = await req.db.query(annQuery, annParams);
        if (parseInt(annResult.rows[0].count) > 0) {
          dependencies.push({ type: 'Annexures', count: parseInt(annResult.rows[0].count) });
        }
      } catch (e) {
      }

      try {
        const ibParams = [id];
        let ibQuery = `SELECT COUNT(*) as count FROM invoice_backside WHERE export_invoice_id = $1`;
        if ('companyFilter' in req) {
          if (req.companyFilter === null) {
            ibQuery += ` AND company_id IS NULL`;
          } else {
            ibQuery += ` AND company_id = $2`;
            ibParams.push(req.companyFilter);
          }
        }
        const ibResult = await req.db.query(ibQuery, ibParams);
        if (parseInt(ibResult.rows[0].count) > 0) {
          dependencies.push({ type: 'Invoice Backsides', count: parseInt(ibResult.rows[0].count) });
        }
      } catch (e) {
      }

      try {
        const vgmParams = [id];
        let vgmQuery = `SELECT COUNT(*) as count FROM vgm_documents WHERE export_invoice_id = $1`;
        if ('companyFilter' in req) {
          if (req.companyFilter === null) {
            vgmQuery += ` AND company_id IS NULL`;
          } else {
            vgmQuery += ` AND company_id = $2`;
            vgmParams.push(req.companyFilter);
          }
        }
        const vgmResult = await req.db.query(vgmQuery, vgmParams);
        if (parseInt(vgmResult.rows[0].count) > 0) {
          dependencies.push({ type: 'VGM Documents', count: parseInt(vgmResult.rows[0].count) });
        }
      } catch (e) {
      }

      try {
        const siParams = [id];
        let siQuery = `SELECT COUNT(*) as count FROM shipping_instructions WHERE export_invoice_id = $1`;
        if ('companyFilter' in req) {
          if (req.companyFilter === null) {
            siQuery += ` AND company_id IS NULL`;
          } else {
            siQuery += ` AND company_id = $2`;
            siParams.push(req.companyFilter);
          }
        }
        const siResult = await req.db.query(siQuery, siParams);
        if (parseInt(siResult.rows[0].count) > 0) {
          dependencies.push({ type: 'Shipping Instructions', count: parseInt(siResult.rows[0].count) });
        }
      } catch (e) {
      }

      if (dependencies.length > 0) {
        const depList = dependencies.map(d => `${d.count} ${d.type}`).join(', ');
        return res.status(409).json({
          success: false,
          message: `Cannot delete export invoice "${invoiceRecord.invoice_no}" because it has linked documents: ${depList}. All linked documents will be deleted. Use force=true to confirm deletion.`,
          dependencies,
          invoiceNo: invoiceRecord.invoice_no
        });
      }
    }

    client = await req.db.getClient();
    await client.query('BEGIN');

    // Check if invoice exists
    const checkResult = await client.query(
      `SELECT id FROM export_invoices ${whereConditions}`,
      queryParams
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      if (client) client.release();
      return next(new AppError('Export invoice not found', 404));
    }

    const invoiceId = checkResult.rows[0].id;

    // Delete in cascading order to respect foreign key constraints
    // 1. Delete shipping instruction line items first (with SAVEPOINT for optional table)
    try {
      await client.query('SAVEPOINT sp_containers');
      await client.query('DELETE FROM shipping_instruction_containers WHERE shipping_instruction_id IN (SELECT id FROM shipping_instructions WHERE export_invoice_id = $1)', [invoiceId]);
      await client.query('RELEASE SAVEPOINT sp_containers');
    } catch (e) {
      try {
        await client.query('ROLLBACK TO SAVEPOINT sp_containers');
      } catch (rollbackErr) { }
    }

    // 2. Delete shipping instructions
    try {
      await client.query('DELETE FROM shipping_instructions WHERE export_invoice_id = $1', [invoiceId]);
    } catch (e) { }

    // 3. Delete invoice backside
    try {
      await client.query('DELETE FROM invoice_backside WHERE export_invoice_id = $1', [invoiceId]);
    } catch (e) { }

    // 4. Delete VGM line items first
    try {
      await client.query('SAVEPOINT sp_vgm_lines');
      await client.query('DELETE FROM vgm_line_items WHERE vgm_id IN (SELECT id FROM vgm_documents WHERE export_invoice_id = $1)', [invoiceId]);
      await client.query('RELEASE SAVEPOINT sp_vgm_lines');
    } catch (e) {
      try { await client.query('ROLLBACK TO SAVEPOINT sp_vgm_lines'); } catch (rollbackErr) { }
    }

    // 5. Delete VGM records
    try {
      await client.query('DELETE FROM vgm_documents WHERE export_invoice_id = $1', [invoiceId]);
    } catch (e) { }

    // 6. Delete export invoice annexure
    try {
      await client.query('DELETE FROM export_invoice_annexures WHERE export_invoice_id = $1', [invoiceId]);
    } catch (e) { }

    // 7. Delete packing list line items first
    try {
      await client.query('SAVEPOINT sp_packing_lines');
      await client.query('DELETE FROM packing_list_lines WHERE packing_list_id IN (SELECT id FROM packing_lists WHERE export_invoice_id = $1)', [invoiceId]);
      await client.query('RELEASE SAVEPOINT sp_packing_lines');
    } catch (e) {
      try { await client.query('ROLLBACK TO SAVEPOINT sp_packing_lines'); } catch (rollbackErr) { }
    }

    // 8. Delete packing lists related to this invoice
    try {
      await client.query('DELETE FROM packing_lists WHERE export_invoice_id = $1', [invoiceId]);
    } catch (e) { }
    // 9. Delete the export invoice itself
    const result = await client.query(
      `DELETE FROM export_invoices ${whereConditions} RETURNING id, invoice_no`,
      queryParams
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      if (client) client.release();
      return next(new AppError('Failed to delete export invoice', 500));
    }

    await client.query('COMMIT');

    return successResponse(
      res,
      result.rows[0],
      'Export invoice and all related records deleted successfully'
    );
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
      }
    }
    next(error);
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseErr) {
      }
    }
  }
};

export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.user.role === 'super_admin' && req.query.company_id
      ? req.query.company_id
      : req.user.companyId;

    if (!companyId) {
      return next(new AppError('Company context missing', 400));
    }

    const documentNumber = await previewDocumentNumber('EXP', companyId, req.db, new Date());

    return successResponse(
      res,
      {
        invoiceNo: documentNumber.baseNumber,
        displayNumber: documentNumber.displayNumber,
        serialNumber: documentNumber.serialNumber,
        monthYear: documentNumber.monthYear
      },
      'Next export invoice number generated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    const current = await req.db.query(
      'SELECT status FROM export_invoices WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (current.rows.length === 0) {
      return next(new AppError('Export invoice not found', 404));
    }

    const currentStatus = current.rows[0].status;
    const newStatus = (currentStatus === 'Completed' || currentStatus === 'Confirmed') ? 'Draft' : 'Completed';

    const result = await req.db.query(
      'UPDATE export_invoices SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
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
        UPDATE export_invoices
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `, [status, id, companyId]);
    } else {
      result = await req.db.query(`
        UPDATE export_invoices
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id IS NULL
        RETURNING *
      `, [status, id]);
    }

    if (result.rows.length === 0) {
      return next(new AppError('Document not found', 404));
    }

    // Auto Inventory Integration
    if (status === 'Dispatched' || status === 'Shipped') {
      try {
        const linesResult = await req.db.query('SELECT * FROM export_invoice_lines WHERE export_invoice_id = $1', [id]);
        await syncInventoryFromInvoice(result.rows[0], linesResult.rows, req);
      } catch (err) {
        debugLogger.error('[InventorySync] Failed to sync inventory for invoice status update:', err.message);
      }
    }

    return successResponse(res, result.rows[0], `Status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};
