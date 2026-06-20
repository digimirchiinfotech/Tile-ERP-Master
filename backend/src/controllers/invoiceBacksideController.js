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
import { successResponse, paginationResponse, getPagination } from '../utils/helpers.js';
import { validateUUID } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateDocumentNumber, previewDocumentNumber } from '../utils/documentNumberGenerator.js';
import { syncUpdatesAcrossStages } from '../services/exportWorkflowInterconnectionService.js';
import { notifyRoles } from '../services/notificationService.js';

let ensuredBacksideSchemas = new Set();

const ensureBacksideSchema = async (queryFn, companyId) => {
  // Moved to databaseProvisioning.js to avoid runtime ALTER TABLE locks
};

const validateBacksideInput = (data) => {
  const errors = [];
  if (!data.invoice_date) errors.push('Invoice date is required');
  return { isValid: errors.length === 0, errors };
};

export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    if (!companyId) {
      return successResponse(res, { nextNumber: '', backsideNo: '' }, 'Company context missing');
    }
    const result = await previewDocumentNumber('IB', companyId, req.db);
    return successResponse(res, { nextNumber: result.displayNumber, backsideNo: result.displayNumber }, 'Next number previewed');
  } catch (error) { next(error); }
};

export const getStats = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    if (!companyId) return next(new AppError('Company context required', 400));

    const result = await req.db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Finalized') as ready,
        COUNT(*) FILTER (WHERE status != 'Finalized' OR status IS NULL) as pending
       FROM invoice_backside 
       WHERE company_id = $1 AND deleted_at IS NULL`,
      [companyId]
    );

    return successResponse(res, result.rows[0], 'Stats retrieved successfully');
  } catch (error) { next(error); }
};

export const getAll = async (req, res, next) => {
  try {
    await ensureBacksideSchema(req.db.query, req.companyFilter);
    const { page = 1, limit = 50, search = '', dateFrom = '', dateTo = '' } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let whereConditions = 'ib.deleted_at IS NULL';
    const queryParams = [];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND ib.company_id IS NULL`;
      } else {
        whereConditions += ` AND ib.company_id = $${queryParams.length + 1}`;
        queryParams.push(req.companyFilter);
      }
    }

    if (search) {
      const searchParam = `%${search}%`;
      whereConditions += ` AND (ib.backside_no ILIKE $${queryParams.length + 1} 
                           OR ib.client_name ILIKE $${queryParams.length + 1}
                           OR ei.invoice_no ILIKE $${queryParams.length + 1})`;
      queryParams.push(searchParam);
    }

    if (dateFrom) {
      whereConditions += ` AND ib.invoice_date >= $${queryParams.length + 1}`;
      queryParams.push(dateFrom);
    }
    if (dateTo) {
      whereConditions += ` AND ib.invoice_date <= $${queryParams.length + 1}`;
      queryParams.push(dateTo);
    }

    const countResult = await req.db.query(
      `SELECT COUNT(*) as total 
       FROM invoice_backside ib 
       LEFT JOIN export_invoices ei ON ib.export_invoice_id = ei.id
       WHERE ${whereConditions}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    const result = await req.db.query(
      `SELECT ib.*,
              COALESCE(ib.client_name, ei.client_name) AS client_name,
              ei.invoice_no AS ei_invoice_no,
              ei.invoice_date AS ei_invoice_date,
              ia.annexure_no AS annexure_no
       FROM invoice_backside ib
       LEFT JOIN export_invoices ei ON ib.export_invoice_id = ei.id
       LEFT JOIN export_invoice_annexures ia ON ib.export_invoice_id = ia.export_invoice_id AND ia.deleted_at IS NULL
       WHERE ${whereConditions}
       ORDER BY ib.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, pageLimit, offset]
    );

    return successResponse(res, paginationResponse(result.rows, total, page, limit), 'Invoice backsides retrieved successfully');
  } catch (error) { next(error); }
};

export const getByExportInvoiceId = async (req, res, next) => {
  try {
    await ensureBacksideSchema(req.db.query, req.companyFilter);
    const { exportInvoiceId } = req.params;
    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));
    let whereConditions = 'WHERE ib.export_invoice_id = $1 AND ib.deleted_at IS NULL';
    let queryParams = [exportInvoiceId];
    if (Object.hasOwn(req, 'companyFilter')) { if (req.companyFilter === null) { whereConditions += ' AND ib.company_id IS NULL'; } else { whereConditions += ' AND ib.company_id = $2'; queryParams.push(req.companyFilter); } }
    const result = await req.db.query(
      `SELECT ib.*, 
              COALESCE(ia.annexure_no, ia.invoice_no) as annexure_invoice_no,
              ia.id as ia_annexure_id,
              ei.company_id as ei_company_id,
              ia.company_id as ia_company_id,
              COALESCE(NULLIF(ib.pi_no, ''), ia.pi_reference, pi.invoice_no, '') as inherited_pi_no,
              COALESCE(NULLIF(ib.consignee_details, ''), ia.consignee_details, ei.consignee_details) as inherited_consignee_details,
              COALESCE(NULLIF(ib.lut_arn_no, ''), ia.lut_arn_no, ei.lut_bond_ref) as inherited_lut_arn_no,
              COALESCE(NULLIF(ib.lut_date::text, ''), ia.lut_date::text, ei.lut_date::text)::date as inherited_lut_date,
              COALESCE(NULLIF(ib.shipping_bill_no, ''), ia.shipping_bill_no, ei.shipping_bill_no) as inherited_sb_no,
              COALESCE(NULLIF(ib.shipping_bill_date::text, ''), ia.shipping_bill_date::text, ei.shipping_bill_date::text)::date as inherited_sb_date,
              COALESCE(NULLIF(ib.manufacturer_name, ''), ia.manufacturer_name) as inherited_manufacturer_name,
              COALESCE(NULLIF(ib.manufacturer_address, ''), ia.manufacturer_address) as inherited_manufacturer_address,
              COALESCE(NULLIF(ib.permission_no, ''), ia.permission_no) as inherited_permission_no,
              COALESCE(NULLIF(ib.range_name, ''), ia.range_name) as inherited_range_name,
              COALESCE(NULLIF(ib.division, ''), ia.division) as inherited_division,
              COALESCE(NULLIF(ib.commissionerate, ''), ia.commissionerate) as inherited_commissionerate,
              COALESCE(NULLIF(ib.location_code, ''), ia.location_code) as inherited_location_code,
              COALESCE(ia.container_details, pl.container_details) as inherited_container_details,
              ei.product_lines as inherited_product_details,
              ei.payment_terms as payment_terms,
              ei.tariff_code as tariff_code,
              ei.invoice_no as ei_invoice_no,
              ei.invoice_date as ei_invoice_date,
              ei.updated_at as ei_updated_at
       FROM invoice_backside ib
       LEFT JOIN export_invoice_annexures ia ON ib.export_invoice_id = ia.export_invoice_id AND ia.deleted_at IS NULL
       LEFT JOIN packing_lists pl ON ib.export_invoice_id = pl.export_invoice_id AND pl.deleted_at IS NULL
       LEFT JOIN export_invoices ei ON ib.export_invoice_id = ei.id
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       ${whereConditions}`,
      queryParams
    );
    if (result.rows.length === 0) return successResponse(res, null, 'No invoice backside found');
    const backside = result.rows[0];

    // Robust company identification for multi-tenant data fetching
    const finalCompanyId = backside.company_id || backside.ei_company_id || backside.ia_company_id || req.companyFilter;
    let companyInfo = null;

    if (finalCompanyId) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT id, name, address, iec_no, gstn, pan, logo_url, permission_no, settings FROM companies WHERE id = $1',
          [finalCompanyId]
        );
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            ...c,
            logo_url: c.logo_url || settings.logo_url || '',
            lut_arn_no: c.lut_arn_no || settings.lut_arn_no || settings.lut_bond_ref || '',
            lut_date: c.lut_date || settings.lut_date || '',
            permission_no: c.permission_no || settings.permission_no || '',
            range_name: settings.range_name || '',
            division: settings.division || '',
            commissionerate: settings.commissionerate || '',
            branch_code_no: settings.branch_code_no || '',
            bin_no: settings.bin_no || settings.pan || '',
            location_code: settings.location_code || '',
            bank_details: settings.bank_details || {}
          };
        }
      } catch (err) {
        debugLogger.error('Error fetching company info for Backside:', err.message);
      }
    }

    // Standardized enrichment with exhaustive company-level fallbacks
    const enrichedBackside = {
      ...backside,
      company_id: finalCompanyId,
      annexure_id: backside.annexure_id || backside.ia_annexure_id || null,
      pi_no: backside.pi_no || backside.inherited_pi_no || '',
      consignee_details: backside.consignee_details || backside.inherited_consignee_details || '',
      lut_arn_no: backside.lut_arn_no || backside.inherited_lut_arn_no || companyInfo?.lut_arn_no || '',
      lut_date: backside.lut_date || backside.inherited_lut_date || companyInfo?.lut_date || '',
      iec_no: backside.iec_no || companyInfo?.iec_no || '',
      shipping_bill_no: backside.shipping_bill_no || backside.inherited_sb_no || '',
      shipping_bill_date: backside.shipping_bill_date || backside.inherited_sb_date || '',
      branch_code_no: backside.branch_code_no || companyInfo?.branch_code_no || '',
      bin_no: backside.bin_no || companyInfo?.bin_no || companyInfo?.pan || '',
      permission_no: backside.permission_no || backside.inherited_permission_no || companyInfo?.permission_no || '',
      company_name: companyInfo?.name || backside.company_name || '',
      company_address: companyInfo?.address || backside.company_address || '',
      manufacturer_name: backside.manufacturer_name || backside.inherited_manufacturer_name || companyInfo?.name || '',
      manufacturer_address: backside.manufacturer_address || backside.inherited_manufacturer_address || companyInfo?.address || '',
      factory_address: backside.factory_address || backside.inherited_manufacturer_address || (backside.manufacturer_address || companyInfo?.address) || '',
      range_name: backside.range_name || backside.inherited_range_name || companyInfo?.range_name || '',
      division: backside.division || backside.inherited_division || companyInfo?.division || '',
      commissionerate: backside.commissionerate || backside.inherited_commissionerate || companyInfo?.commissionerate || '',
      location_code: backside.location_code || backside.inherited_location_code || companyInfo?.location_code || '',
      samples_drawn: backside.samples_drawn || 'N.A.',
      container_details: (backside.container_details && backside.container_details.length > 0 && backside.container_details !== '[]') ? backside.container_details : (backside.inherited_container_details || []),
      inherited_product_details: backside.inherited_product_details || '[]',
      company_info: companyInfo
    };

    return successResponse(res, enrichedBackside, 'Invoice backside retrieved successfully');
  } catch (error) { next(error); }
};

export const getFallbackData = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const companyId = req.companyFilter;

    // Fetch inheritance chain: Invoice -> Annexure -> Packing List -> Company
    const fallbackSql = `
      SELECT 
        ei.invoice_no as export_invoice_no,
        ei.invoice_date as export_invoice_date,
        ei.client_name,
        ei.consignee_details,
        ei.buyer_details,
        ei.vessel_flight_no as vessel_name,
        ei.port_of_loading,
        ei.port_of_discharge,
        ei.final_destination,
        ei.booking_no,
        ei.net_weight,
        ei.gross_weight,
        ei.iec_no as inv_iec,
        ei.lut_bond_ref as inv_lut_arn,
        ei.lut_date as inv_lut_date,
        ei.shipping_bill_no as inv_sb_no,
        ei.shipping_bill_date as inv_sb_date,
        ia.id as annexure_id,
        ia.annexure_no,
        ia.manufacturer_name,
        ia.manufacturer_address,
        ia.factory_address,
        ia.permission_no,
        ia.lut_arn_no as anx_lut_arn,
        ia.lut_date as anx_lut_date,
        ia.iec_no as anx_iec,
        ia.range_name,
        ia.division,
        ia.commissionerate,
        ia.division_range,
        ia.location_code,
        ia.total_pallets,
        ia.total_boxes,
        ia.total_sqm,
        ia.container_details as anx_container_details,
        ia.product_description as anx_goods_description,
        pl.packing_list_no as pl_no,
        pi.invoice_no as pi_no
      FROM export_invoices ei
      LEFT JOIN export_invoice_annexures ia ON ei.id = ia.export_invoice_id AND ia.deleted_at IS NULL
      LEFT JOIN packing_lists pl ON ei.id = pl.export_invoice_id AND pl.deleted_at IS NULL
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      WHERE ei.id = $1 AND ei.company_id = $2
      ORDER BY ia.created_at DESC NULLS LAST
      LIMIT 1
    `;
    const fallbackRes = await req.db.query(fallbackSql, [exportInvoiceId, companyId]);
    const row = fallbackRes.rows[0] || {};

    let companyInfo = null;
    if (companyId) {
      const compRes = await req.db.globalQuery('SELECT * FROM companies WHERE id = $1', [companyId]);
      if (compRes.rows.length > 0) companyInfo = compRes.rows[0];
    }

    const data = {
      ...row,
      annexure_id: row.annexure_id || null,
      iec_no: row.anx_iec || row.inv_iec || companyInfo?.iec_no || '',
      lut_arn_no: row.anx_lut_arn || row.inv_lut_arn || companyInfo?.lut_arn_no || '',
      lut_date: row.anx_lut_date || row.inv_lut_date || companyInfo?.lut_date || '',
      permission_no: row.permission_no || companyInfo?.permission_no || '',
      shipping_bill_no: row.inv_sb_no || '',
      shipping_bill_date: row.inv_sb_date || null,
      container_details: row.anx_container_details || [],
      goods_description: row.anx_goods_description || '',
      total_pallets: row.total_pallets || 0,
      total_boxes: row.total_boxes || 0,
      total_sqm: row.total_sqm || 0,
      company_name: companyInfo?.name || '',
      company_address: companyInfo?.address || '',
      status: 'Draft'
    };

    return successResponse(res, data, 'Fallback data for new backside retrieved');
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    await ensureBacksideSchema(req.db.query, req.companyFilter);
    const { id } = req.params;
    const idValidation = validateUUID(id, 'Invoice Backside ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));
    let whereConditions = 'WHERE ib.id = $1 AND ib.deleted_at IS NULL';
    let queryParams = [id];
    if (Object.hasOwn(req, 'companyFilter')) { if (req.companyFilter === null) { whereConditions += ' AND ib.company_id IS NULL'; } else { whereConditions += ' AND ib.company_id = $2'; queryParams.push(req.companyFilter); } }
    let result;
    try {
      result = await req.db.query(
        `SELECT ib.*, 
                COALESCE(NULLIF(ib.pi_no, ''), ia.pi_reference, pi.invoice_no, '') as inherited_pi_no,
                COALESCE(NULLIF(ib.shipping_bill_no, ''), ei.shipping_bill_no) as shipping_bill_no,
                COALESCE(NULLIF(ib.shipping_bill_date::text, ''), ei.shipping_bill_date::text)::date as shipping_bill_date,
                COALESCE(NULLIF(ib.vessel_name, ''), ei.vessel_flight_no) as vessel_name,
                COALESCE(NULLIF(ib.port_of_loading, ''), ei.port_of_loading) as port_of_loading,
                COALESCE(NULLIF(ib.port_of_discharge, ''), ei.port_of_discharge) as port_of_discharge,
                COALESCE(NULLIF(ib.final_destination, ''), ei.final_destination) as final_destination,
                COALESCE(NULLIF(ib.client_name, ''), ei.client_name) as client_name,
                COALESCE(NULLIF(ib.consignee_details, ''), ia.consignee_details, ei.consignee_details) as consignee_details,
                COALESCE(NULLIF(ib.buyer_details, ''), ia.buyer_details, ei.buyer_details) as buyer_details,
                ei.payment_terms as payment_terms,
                ei.tariff_code as tariff_code,
                COALESCE(ib.net_weight, ei.net_weight, ia.net_weight) as net_weight,
                COALESCE(ib.gross_weight, ei.gross_weight, ia.gross_weight) as gross_weight,
                COALESCE(NULLIF(ib.iec_no, ''), ia.iec_no) as iec_no,
                COALESCE(NULLIF(ib.lut_arn_no, ''), ia.lut_arn_no, ei.lut_bond_ref) as lut_arn_no,
                COALESCE(NULLIF(ib.lut_date::text, ''), ia.lut_date::text, ei.lut_date::text)::date as lut_date,
                COALESCE(NULLIF(ia.annexure_no, ''), ia.invoice_no) as annexure_invoice_no,
                COALESCE(NULLIF(ib.manufacturer_name, ''), ia.manufacturer_name) as manufacturer_name,
                COALESCE(NULLIF(ib.manufacturer_address, ''), ia.manufacturer_address) as manufacturer_address,
                COALESCE(NULLIF(ib.permission_no, ''), ia.permission_no) as permission_no,
                COALESCE(NULLIF(ib.range_name, ''), ia.range_name) as range_name,
                COALESCE(NULLIF(ib.division, ''), ia.division) as division,
                COALESCE(NULLIF(ib.commissionerate, ''), ia.commissionerate) as commissionerate,
                ib.branch_code_no as branch_code_no,
                ib.bin_no as bin_no,
                COALESCE(NULLIF(ib.location_code, ''), ia.location_code) as location_code,
                COALESCE(ib.total_pallets, ia.total_pallets) as total_pallets,
                COALESCE(ib.total_boxes, ia.total_boxes, ia.total_packages) as total_boxes,
                COALESCE(ib.total_sqm, ia.total_sqm) as total_sqm,
                COALESCE(ib.goods_description, ia.product_description) as goods_description,
                ia.container_details as inherited_container_details,
                ei.invoice_no as ei_invoice_no,
                ei.invoice_date as ei_invoice_date,
                ei.updated_at as ei_updated_at,
                ei.company_id as ei_company_id,
                ia.company_id as ia_company_id,
                ia.id as ia_annexure_id
         FROM invoice_backside ib
         LEFT JOIN export_invoices ei ON ib.export_invoice_id = ei.id
         LEFT JOIN export_invoice_annexures ia ON ib.export_invoice_id = ia.export_invoice_id AND ia.deleted_at IS NULL
         LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
         ${whereConditions}`,
        queryParams
      );
    } catch (sqlError) {
      debugLogger.error('SQL Error in Backside getById:', sqlError.message);
      return next(new AppError(`Database query failed: ${sqlError.message}`, 500));
    }

    if (result.rows.length === 0) return successResponse(res, null, 'No invoice backside found');
    const backside = result.rows[0];

    // Force company_id inheritance
    const finalCompanyId = backside.company_id || backside.ei_company_id || backside.ia_company_id || req.companyFilter;
    let companyInfo = null;

    if (finalCompanyId) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT name, address, iec_no, gstn, pan, logo_url, permission_no, settings FROM companies WHERE id = $1',
          [finalCompanyId]
        );
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            ...c,
            logo_url: c.logo_url || settings.logo_url || '',
            lut_arn_no: c.lut_arn_no || settings.lut_arn_no || settings.lut_bond_ref || '',
            lut_date: c.lut_date || settings.lut_date || '',
            permission_no: c.permission_no || settings.permission_no || '',
            range_name: settings.range_name || '',
            division: settings.division || '',
            commissionerate: settings.commissionerate || '',
            branch_code_no: settings.branch_code_no || '',
            bin_no: settings.bin_no || settings.pan || '',
            location_code: settings.location_code || '',
            bank_details: settings.bank_details || {}
          };
        }
      } catch (err) {
        debugLogger.error('Error fetching company info for Backside by ID:', err.message);
      }
    }

    // Standardized enrichment with exhaustive company-level fallbacks
    const enrichedBackside = {
      ...backside,
      company_id: finalCompanyId,
      annexure_id: backside.annexure_id || backside.ia_annexure_id || null,
      pi_no: backside.pi_no || backside.inherited_pi_no || '',
      iec_no: backside.iec_no || companyInfo?.iec_no || '',
      branch_code_no: backside.branch_code_no || companyInfo?.branch_code_no || '',
      bin_no: backside.bin_no || companyInfo?.bin_no || companyInfo?.pan || '',
      lut_arn_no: backside.lut_arn_no || companyInfo?.lut_arn_no || '',
      lut_date: backside.lut_date || companyInfo?.lut_date || '',
      permission_no: backside.permission_no || companyInfo?.permission_no || '',
      manufacturer_name: backside.manufacturer_name || companyInfo?.name || '',
      manufacturer_address: backside.manufacturer_address || companyInfo?.address || '',
      factory_address: backside.factory_address || (backside.manufacturer_address || companyInfo?.address) || '',
      range_name: backside.range_name || companyInfo?.range_name || '',
      division: backside.division || companyInfo?.division || '',
      commissionerate: backside.commissionerate || companyInfo?.commissionerate || '',
      location_code: backside.location_code || companyInfo?.location_code || '',
      samples_drawn: backside.samples_drawn || 'N.A.',
      container_details: (backside.container_details && backside.container_details.length > 0 && backside.container_details !== '[]') ? backside.container_details : (backside.inherited_container_details || []),
      company_info: companyInfo
    };

    return successResponse(res, enrichedBackside, 'Invoice backside retrieved successfully');
  } catch (error) { next(error); }
};

export const createOrUpdate = async (req, res, next) => {
  try {
    await ensureBacksideSchema(req.db.query, req.companyFilter);
    const { exportInvoiceId } = req.params;
    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));
    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }
    const existingResult = await req.db.query('SELECT id, backside_no FROM invoice_backside WHERE export_invoice_id = $1 AND company_id = $2', [exportInvoiceId, companyId]);
    const body = req.body;
    const validation = validateBacksideInput(body);
    if (!validation.isValid) return next(new AppError(`Validation failed: ${validation.errors.join('; ')}`, 400));

    const anxRow = await req.db.query(
      'SELECT id, is_used, is_converted, annexure_no FROM export_invoice_annexures WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [exportInvoiceId, companyId]
    );
    if (anxRow.rows.length === 0) {
      return next(new AppError('An Annexure must be created before you can create an Invoice Backside.', 400));
    }

    let backsideNo;
    if (existingResult.rows.length === 0) {
      // Check if this Annexure has already been converted to an Invoice Backside
      const anx = anxRow.rows[0];
      if (anx.is_used || anx.is_converted) {
        return next(new AppError(`Annexure ${anx.annexure_no} has already been converted to an Invoice Backside.`, 400));
      }

      // NEW RECORD: Always generate a fresh sequential number on the backend
      const generated = await generateDocumentNumber('IB', companyId, req.db);
      backsideNo = generated.displayNumber;
    } else {
      // UPDATE: Preserve the original number assigned during creation
      backsideNo = existingResult.rows[0].backside_no;
    }

    // Unique list of fields to avoid "column specified more than once" error
    const fields = [
      'backside_no', 'invoice_no', 'invoice_date', 'pi_no', 'pl_no', 'annexure_invoice_no', 'export_invoice_no',
      'client_name', 'consignee_details', 'buyer_details', 'vessel_name', 'port_of_loading',
      'port_of_discharge', 'final_destination', 'status', 'container_details',
      'range_name', 'division', 'commissionerate', 'c_no', 'c_date', 'shipping_bill_no', 'shipping_bill_date',
      'manufacturer_name', 'manufacturer_address', 'factory_address', 'examination_date', 'examining_officer',
      'appraiser_name', 'division_range', 'location_code', 'total_packages', 'total_boxes', 'total_sqm', 'package_type', 'total_pallets',
      'is_description_match', 'goods_description_match', 'samples_drawn', 'sample_seal_no', 'customs_seal_no', 'permission_no',
      'goods_description', 'declaration_text', 'lut_arn_no', 'lut_date', 'net_weight', 'gross_weight', 'iec_no', 'branch_code_no', 'bin_no',
      'company_name', 'company_address', 'booking_no', 'weighbridge_name', 'max_permissible_weight', 'cargo_type', 'country_of_origin',
      'annexure_id'
    ];

    const bodyWithNo = {
      ...body,
      backside_no: backsideNo,
      invoice_no: body.invoice_no || backsideNo,
      total_boxes: body.total_boxes || body.total_packages || 0,
      total_sqm: body.total_sqm || 0
    };

    // Strict Aggregation Phase
    const aggregateContainers = (list) => {
        if (!list || !Array.isArray(list)) return [];
        const groups = {};
        list.forEach(c => {
            const cNo = (c.container_no || c.containerNo || c.container_number || c.cont_no || '').trim();
            const sNo = (c.sealNo || c.seal_no || c.line_seal_no || '').trim();
            const eNo = (c.e_seal_no || '').trim();
            const key = cNo ? `${cNo}|${sNo}|${eNo}` : Math.random().toString(); // Don't group empty containers
            
            if (!groups[key]) {
                groups[key] = { ...c };
            } else {
                groups[key].total_sqm = parseFloat(((groups[key].total_sqm || 0) + (parseFloat(c.total_sqm) || 0)).toFixed(2));
                groups[key].boxes = (groups[key].boxes || 0) + (parseInt(c.boxes) || 0);
                groups[key].pallets = (groups[key].pallets || 0) + (parseInt(c.pallets) || 0);
                groups[key].net_weight = parseFloat(((groups[key].net_weight || 0) + (parseFloat(c.net_weight) || 0)).toFixed(2));
                groups[key].gross_weight = parseFloat(((groups[key].gross_weight || 0) + (parseFloat(c.gross_weight) || 0)).toFixed(2));
            }
        });
        return Object.values(groups).map((c, idx) => ({ ...c, sr_no: idx + 1 }));
    };

    const values = fields.map(f => {
      if (f === 'container_details') return JSON.stringify(aggregateContainers(bodyWithNo[f] || []));
      const val = bodyWithNo[f];
      if (val === undefined || val === '' || val === null) return null;
      return val;
    });

    let result;
    if (existingResult.rows.length > 0) {
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      result = await req.db.query(`UPDATE invoice_backside SET ${setClause}, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE export_invoice_id = $${fields.length + 1} AND company_id = $${fields.length + 2} RETURNING *`, [...values, exportInvoiceId, companyId]);
    } else {
      const fixedCols = ['company_id', 'export_invoice_id', 'created_by', ...fields];
      const cols = fixedCols.join(', ');
      const placeholders = fixedCols.map((_, i) => `$${i + 1}`).join(', ');
      result = await req.db.query(`INSERT INTO invoice_backside (${cols}) VALUES (${placeholders}) RETURNING *`, [companyId, exportInvoiceId, req.user?.id, ...values]);

      // Mark the parent Annexure as converted
      const backsideId = result.rows[0].id;
      const anxId = anxRow.rows[0].id;
      await req.db.query(
        `UPDATE export_invoice_annexures 
         SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
         WHERE id = $2 AND company_id = $3`,
        [backsideId, anxId, companyId]
      );

      // Trigger notification for new backside
      notifyRoles(companyId, ['company_admin', 'admin', 'super_admin', 'export_manager'], {
        title: 'Invoice Backside Created',
        message: `Backside ${backsideNo} generated for Export Invoice ${bodyWithNo.export_invoice_no || ''}`,
        type: 'success',
        redirect_url: `/export-invoice-form?invoiceId=${exportInvoiceId}`,
        module: 'Invoice Backside',
        reference_id: backsideId,
        reference_type: 'invoice_backside',
        priority: 'normal'
      }, req.db);
    }
    const changedFields = Object.keys(body);
    syncUpdatesAcrossStages(result.rows[0].id, 'backside', changedFields, companyId, req.db).catch(() => { });

    return successResponse(res, result.rows[0], 'Invoice backside saved successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const companyId = req.companyFilter;
    if (!companyId) return next(new AppError('Company context required', 400));
    const result = await req.db.query(
      `UPDATE invoice_backside SET deleted_at = CURRENT_TIMESTAMP WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING *`,
      [exportInvoiceId, companyId]
    );
    if (result.rows.length === 0) return next(new AppError('Invoice backside not found', 404));
    return successResponse(res, result.rows[0], 'Deleted successfully');
  } catch (error) { next(error); }
};

export const removeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;
    if (!companyId) return next(new AppError('Company context required', 400));
    const result = await req.db.query(
      `UPDATE invoice_backside SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING *`,
      [id, companyId]
    );
    if (result.rows.length === 0) return next(new AppError('Invoice backside not found', 404));
    return successResponse(res, result.rows[0], 'Deleted successfully');
  } catch (error) { next(error); }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;

    const current = await req.db.query(
      'SELECT status FROM invoice_backside WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (current.rows.length === 0) {
      return next(new AppError('Invoice backside not found', 404));
    }

    const currentStatus = current.rows[0].status;
    const newStatus = (currentStatus === 'Completed' || currentStatus === 'Confirmed' || currentStatus === 'Finalized') ? 'Draft' : 'Finalized';

    const result = await req.db.query(
      'UPDATE invoice_backside SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
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
        UPDATE invoice_backside
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `, [status, id, companyId]);
    } else {
      result = await req.db.query(`
        UPDATE invoice_backside
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
