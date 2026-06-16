/* eslint-disable no-useless-catch */
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

/**
 * Export Document Reference Service
 * Manages strict sequential reference validation and auto-fetch for export documents
 * 
 * Document Flow Chain:
 * PI → PO → QC → Export Invoice → Packing List → Annexure → Backside → VGM → Shipping Instructions
 */

/**
 * Get valid Export Invoice references for Packing List creation
 * Returns only finalized/approved Export Invoices without issues
 */
import { masterQuery } from '../config/masterDatabase.js';
import { previewDocumentNumber } from '../utils/documentNumberGenerator.js';
import { debugLogger } from '../utils/debugLogger.js';

// Schema enforcement moved to strict database migrations
let ensuredTenantSchemas = new Set();

export const selfHealTenantSchema = async (db, tenantId = 'global') => {
  const cacheKey = tenantId || 'global';
  if (ensuredTenantSchemas.has(cacheKey)) return;

  try {
    const alterQueries = [
      // export_invoices
      `ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false`,
      `ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false`,
      `ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS linked_document_id UUID`,
      `ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft'`,
      `ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS supply_declaration TEXT`,
      `ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS ftp_incentive_declaration TEXT`,
      `ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS snapshot_data JSONB`,

      // packing_lists
      `ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false`,
      `ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false`,
      `ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS linked_document_id UUID`,
      `ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft'`,
      `ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS snapshot_data JSONB`,

      // export_invoice_annexures
      `ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false`,
      `ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false`,
      `ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS linked_document_id UUID`,
      `ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft'`,
      `ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS c_no VARCHAR(100)`,
      `ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS c_date DATE`,
      `ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS snapshot_data JSONB`,

      // invoice_backside
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS linked_document_id UUID`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft'`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS annexure_id UUID`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS voyage_no VARCHAR(100)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS backside_no VARCHAR(100)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS pi_no VARCHAR(255)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS pl_no VARCHAR(255)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS annexure_invoice_no VARCHAR(100)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS weighbridge_name VARCHAR(255)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS max_permissible_weight NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS cargo_type VARCHAR(50) DEFAULT 'NORMAL'`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS booking_no VARCHAR(100)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS c_no VARCHAR(100)`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS c_date DATE`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS total_sqm NUMERIC DEFAULT 0`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS total_boxes INTEGER DEFAULT 0`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS total_pallets INTEGER DEFAULT 0`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS net_weight NUMERIC DEFAULT 0`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS gross_weight NUMERIC DEFAULT 0`,
      `ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS snapshot_data JSONB`,

      // vgm_documents
      `ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false`,
      `ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false`,
      `ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS linked_document_id UUID`,
      `ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft'`,
      `ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS snapshot_data JSONB`,

      // shipping_instructions
      `ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false`,
      `ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false`,
      `ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS linked_document_id UUID`,
      `ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft'`,
      `ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS snapshot_data JSONB`,
      `ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS snapshot_data JSONB`,
      `ALTER TABLE proforma_orders ADD COLUMN IF NOT EXISTS snapshot_data JSONB`
    ];

    for (const q of alterQueries) {
      try {
        await db.query(q);
      } catch (err) {
        // Ignore column already exists or similar errors
      }
    }
    ensuredTenantSchemas.add(cacheKey);
  } catch (error) {
    console.error('[selfHealTenantSchema] Error:', error);
  }
};



export const getValidExportInvoiceReferences = async (companyId, searchTerm = '', currentId = null, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    let sql = `
      SELECT ei.id, ei.invoice_no, ei.invoice_date, ei.client_name, 
             pi.invoice_no AS proforma_invoice_no, ei.total_amount, ei.status, ei.created_at
      FROM export_invoices ei
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      WHERE ei.status IN ('Draft', 'Pending', 'Finalized', 'Approved')
    `;

    const params = [];
    let paramIndex = 1;

    if (companyId) {
      sql += ` AND ei.company_id = $${paramIndex++}`;
      params.push(companyId);
    } else {
      sql += ` AND ei.company_id IS NULL`;
    }

    if (currentId && currentId !== 'null' && currentId !== 'undefined') {
      sql += ` AND (ei.id = $${paramIndex++} OR (ei.is_used = FALSE OR ei.is_used IS NULL))`;
      params.push(currentId);
    } else {
      sql += ` AND (ei.is_used = FALSE OR ei.is_used IS NULL)`;
    }

    if (searchTerm) {
      sql += ` AND (ei.invoice_no ILIKE $${paramIndex} OR ei.client_name ILIKE $${paramIndex})`;
      params.push(`%${searchTerm}%`);
    }

    sql += ` ORDER BY ei.invoice_date DESC LIMIT 100`;

    const result = await db.query(sql, params);
    return result.rows || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get valid Packing List references for Annexure creation
 */
export const getValidPackingListReferences = async (companyId, exportInvoiceId = null, searchTerm = '', currentId = null, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    let sql = `
      SELECT 
        pl.id,
        pl.packing_list_no,
        pl.export_invoice_id,
        pl.status,
        pl.created_at,
        ei.invoice_no,
        ei.client_name
      FROM packing_lists pl
      LEFT JOIN export_invoices ei ON pl.export_invoice_id = ei.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (companyId) {
      sql += ` AND pl.company_id = $${paramIndex++}`;
      params.push(companyId);
    } else {
      sql += ` AND pl.company_id IS NULL`;
    }

    if (currentId && currentId !== 'null' && currentId !== 'undefined') {
      sql += ` AND (pl.id = $${paramIndex++} OR (pl.is_used = FALSE OR pl.is_used IS NULL))`;
      params.push(currentId);
    } else {
      sql += ` AND (pl.is_used = FALSE OR pl.is_used IS NULL)`;
    }

    if (exportInvoiceId && exportInvoiceId !== 'null' && exportInvoiceId !== 'undefined') {
      sql += ` AND pl.export_invoice_id = $${paramIndex++}`;
      params.push(exportInvoiceId);
    }

    if (searchTerm) {
      sql += ` AND (pl.packing_list_no ILIKE $${paramIndex} OR ei.invoice_no ILIKE $${paramIndex})`;
      params.push(`%${searchTerm}%`);
    }

    sql += ` ORDER BY pl.created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    return result.rows || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get valid Annexure references for Invoice Backside creation
 */
export const getValidAnnexureReferences = async (companyId, packingListId = null, searchTerm = '', currentId = null, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    let sql = `
      SELECT 
        ia.id,
        ia.annexure_no,
        ia.export_invoice_id,
        ia.created_at,
        ia.status,
        ei.invoice_no,
        ei.client_name
      FROM export_invoice_annexures ia
      LEFT JOIN export_invoices ei ON ia.export_invoice_id = ei.id
      WHERE ia.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (companyId) {
      sql += ` AND ia.company_id = $${paramIndex++}`;
      params.push(companyId);
    } else {
      sql += ` AND ia.company_id IS NULL`;
    }

    if (currentId && currentId !== 'null' && currentId !== 'undefined') {
      sql += ` AND (ia.id = $${paramIndex++} OR (ia.is_used = FALSE OR ia.is_used IS NULL))`;
      params.push(currentId);
    } else {
      sql += ` AND (ia.is_used = FALSE OR ia.is_used IS NULL)`;
    }

    if (packingListId && packingListId !== 'null' && packingListId !== 'undefined') {
      sql += ` AND ia.packing_list_id = $${paramIndex++}`;
      params.push(packingListId);
    }

    if (searchTerm) {
      sql += ` AND (ia.annexure_no ILIKE $${paramIndex} OR ei.invoice_no ILIKE $${paramIndex})`;
      params.push(`%${searchTerm}%`);
    }

    sql += ` ORDER BY ia.created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    return result.rows || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get valid Invoice Backside references for VGM creation
 */
export const getValidBacksideReferences = async (companyId, annexureId = null, searchTerm = '', exportInvoiceId = null, currentId = null, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    let sql = `
      SELECT 
        ib.id,
        ib.id as "backsideId",
        ib.backside_no,
        ib.backside_no as "backsideNo",
        ei.invoice_no,
        ei.invoice_no as "invoiceNo",
        CONCAT(ib.backside_no, ' (Invoice: ', ei.invoice_no, ')') as "displayLabel",
        ib.created_at,
        ib.status,
        ib.export_invoice_id,
        ib.export_invoice_id as "exportInvoiceId"
      FROM invoice_backside ib
      LEFT JOIN export_invoices ei ON ib.export_invoice_id = ei.id
      WHERE ib.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (companyId) {
      sql += ` AND ib.company_id = $${paramIndex++}`;
      params.push(companyId);
    } else {
      sql += ` AND ib.company_id IS NULL`;
    }

    if (currentId && currentId !== 'null' && currentId !== 'undefined') {
      sql += ` AND (ib.id = $${paramIndex++} OR (ib.is_used = FALSE OR ib.is_used IS NULL))`;
      params.push(currentId);
    } else {
      sql += ` AND (ib.is_used = FALSE OR ib.is_used IS NULL)`;
    }

    if (exportInvoiceId && exportInvoiceId !== 'null' && exportInvoiceId !== 'undefined') {
      sql += ` AND ib.export_invoice_id = $${paramIndex++}`;
      params.push(exportInvoiceId);
    } else if (annexureId && annexureId !== 'null' && annexureId !== 'undefined') {
      sql += ` AND ib.export_invoice_id = (SELECT export_invoice_id FROM export_invoice_annexures WHERE id = $${paramIndex++})`;
      params.push(annexureId);
    }

    if (searchTerm) {
      sql += ` AND (ib.backside_no ILIKE $${paramIndex} OR ei.invoice_no ILIKE $${paramIndex})`;
      params.push(`%${searchTerm}%`);
    }

    sql += ` ORDER BY ib.created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    return result.rows || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get valid VGM references for Shipping Instructions creation
 */
export const getValidVGMReferences = async (companyId, backsideId = null, searchTerm = '', currentId = null, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    let sql = `
      SELECT 
        id,
        vgm_no,
        export_invoice_id,
        created_at,
        status
      FROM vgm_documents
      WHERE deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (companyId) {
      sql += ` AND company_id = $${paramIndex++}`;
      params.push(companyId);
    } else {
      sql += ` AND company_id IS NULL`;
    }

    if (currentId && currentId !== 'null' && currentId !== 'undefined') {
      sql += ` AND (id = $${paramIndex++} OR (is_used = FALSE OR is_used IS NULL))`;
      params.push(currentId);
    } else {
      sql += ` AND (is_used = FALSE OR is_used IS NULL)`;
    }

    if (backsideId && backsideId !== 'null' && backsideId !== 'undefined') {
      sql += ` AND export_invoice_id = (SELECT export_invoice_id FROM invoice_backside WHERE id = $${paramIndex++})`;
      params.push(backsideId);
    }

    if (searchTerm) {
      sql += ` AND vgm_no ILIKE $${paramIndex}`;
      params.push(`%${searchTerm}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    return result.rows || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Auto-fetch data for Packing List from Export Invoice
 */
export const getPackingListInheritedData = async (companyId, exportInvoiceId, db) => {
  try {
    const params = [exportInvoiceId];
    let sql = `
      SELECT 
        ei.*,
        pi.invoice_no as proforma_invoice_no,
        pi.date as proforma_date,
        pi.date as pi_date,
        pi.country
      FROM export_invoices ei
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      WHERE ei.id = $1
    `;

    if (companyId) {
      sql += ` AND ei.company_id = $2`;
      params.push(companyId);
    } else {
      sql += ` AND ei.company_id IS NULL`;
    }

    const result = await db.query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Auto-fetch data for Annexure from Packing List
 */
export const getAnnexureInheritedData = async (companyId, packingListId, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    const params = [packingListId];
    let sql = `
      SELECT 
        pl.*,
        ei.invoice_no as export_invoice_no,
        ei.invoice_date as export_invoice_date,
        ei.invoice_date as invoice_date,
        ei.booking_no as booking_no,
        COALESCE(pl.consignee, ei.consignee_details, pi.consignee_details) as consignee_details,
        COALESCE(pl.buyer, ei.buyer_details, pi.buyer_details) as buyer_details,
        COALESCE(pl.consignee, ei.consignee_details, pi.consignee_details) as consignee,
        COALESCE(pl.buyer, ei.buyer_details, pi.buyer_details) as buyer,
        ei.port_of_loading as port_of_loading,
        ei.port_of_discharge as port_of_discharge,
        ei.final_destination as final_destination,
        ei.pallet_type as pallet_type,
        ei.box_type as box_type,
        ei.boxes_marking as boxes_marking,
        ei.tiles_back as tiles_back,
        ei.fumigation as fumigation,
        ei.legalisation as legalisation,
        ei.other_instructions as other_instructions,
        ei.vessel_flight_no as vessel_flight_no,
        ei.vessel_flight_no as vessel_name,
        ei.lut_bond_ref as ei_lut_bond_ref,
        ei.lut_date as ei_lut_date,
        COALESCE(
          (SELECT string_agg(p.invoice_no, ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          pi.invoice_no
        ) as pi_no,
        COALESCE(
          (SELECT string_agg(p.invoice_no, ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          pi.invoice_no
        ) as pi_reference,
        COALESCE(
          (SELECT string_agg(TO_CHAR(p.date, 'YYYY-MM-DD'), ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          TO_CHAR(pi.date, 'YYYY-MM-DD')
        ) as pi_date,
        COALESCE(
          (SELECT string_agg(TO_CHAR(p.date, 'YYYY-MM-DD'), ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          TO_CHAR(pi.date, 'YYYY-MM-DD')
        ) as proforma_date,
        COALESCE(
          (SELECT string_agg(TO_CHAR(p.date, 'YYYY-MM-DD'), ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          TO_CHAR(pi.date, 'YYYY-MM-DD')
        ) as proforma_invoice_date,
        '' as iec_no,
        '' as company_iec,
        '' as permission_no,
        '' as permission_year,
        '' as lut_arn_no,
        '' as lut_date,
        '' as company_name,
        '' as company_address
      FROM packing_lists pl
      LEFT JOIN export_invoices ei ON pl.export_invoice_id = ei.id
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      WHERE pl.id = $1 AND pl.deleted_at IS NULL
    `;

    if (companyId) {
      sql += ` AND pl.company_id = $2`;
      params.push(companyId);
    } else {
      sql += ` AND pl.company_id IS NULL`;
    }

    const result = await db.query(sql, params);
    const data = result.rows[0];

    if (data) {
      // Apply defaults for common fields if they are missing
      data.box_type = data.box_type || 'NON BRANDED BOXES';
      data.pallet_type = data.pallet_type || 'NORMAL WOODEN PALLETS';
      data.tiles_back = data.tiles_back || 'MADE IN INDIA';
      data.fumigation = data.fumigation || 'YES';
      data.legalisation = data.legalisation || 'NO';
      data.other_instructions = data.other_instructions || 'NO';
      data.made_in_india = data.made_in_india || 'YES';
      data.permission_year = data.permission_year || '2025-26';

      let company = {};
      try {
        const companyResult = await masterQuery('SELECT * FROM companies WHERE id = $1', [data.company_id || companyId]);
        company = companyResult.rows[0] || {};
      } catch (err) {
      }

      data.company_name = company.name || '';
      data.company_address = company.address || '';
      data.permission_no = company.permission_no || '';
      data.permission_year = company.permission_year || data.permission_year;
      data.lut_arn_no = data.ei_lut_bond_ref || company.lut_arn_no || company.lut_bond_ref || '';
      data.lut_date = data.ei_lut_date || company.lut_date || '';
      data.iec_no = company.iec_no || '';
      data.company_iec = company.iec_no || '';

      // Also provide the next annexure number for the frontend
      try {
        const gen = await previewDocumentNumber('ANX', data.company_id || companyId, db);
        data.annexure_no = gen.baseNumber;
      } catch (genErr) {
        debugLogger.warn('ExportDocumentReferenceService', `[ReferenceService] Failed to preview Annexure number: ${genErr.message}`);
      }
    }

    return data || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Auto-fetch data for Invoice Backside from Annexure
 */
export const getBacksideInheritedData = async (companyId, annexureId, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    const params = [annexureId];
    let sql = `
      SELECT 
        ia.id, ia.company_id, ia.export_invoice_id, ia.annexure_no, ia.annexure_type,
        ia.packing_list_id, ia.packing_list_no, ia.invoice_no, ia.invoice_date, ia.pi_reference,
        ia.client_name, COALESCE(pi.consignee_details, ia.consignee_details) as consignee_details, COALESCE(pi.buyer_details, ia.buyer_details) as buyer_details, ia.vessel_name as vessel_flight_no,
        ia.port_of_loading, ia.port_of_discharge, ia.final_destination, ia.country,
        ia.country_of_origin, ia.hs_code, COALESCE(ia.pallet_type, ia.pallets_type) as pallets_type, ia.made_in_india, ia.tiles_back,
        ia.boxes_type, ia.fumigation, ia.legalisation, ia.other_instructions, ia.product_description,
        ia.total_boxes, ia.total_pallets, ia.total_sqm, ia.net_weight, ia.gross_weight,
        ia.sqm_per_box, ia.net_weight_per_box, ia.gross_weight_per_box, ia.shipping_bill_no,
        ia.shipping_bill_date,
        COALESCE(NULLIF(ia.iec_no, ''), '') as iec_no,
        COALESCE(NULLIF(ia.company_name, ''), '') as company_name,
        COALESCE(NULLIF(ia.company_address, ''), '') as company_address,
        COALESCE(NULLIF(ia.c_no, ''), '') as c_no, ia.c_date as c_date,
        ia.examination_date, ia.examining_officer, ia.appraiser_name,
        COALESCE(ei.invoice_no, ia.export_invoice_no, ia.invoice_no, '') as export_invoice_no,
        ei.invoice_date as export_invoice_date,
        COALESCE(
          NULLIF((SELECT string_agg(TO_CHAR(p.date, 'YYYY-MM-DD'), ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id), ''),
          NULLIF(pi.date::text, ''), 
          ''
        ) as pi_date,
        COALESCE(NULLIF(ei.booking_no, ''), '') as booking_no,
        COALESCE(
          NULLIF((SELECT string_agg(p.invoice_no, ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id), ''),
          NULLIF(pi.invoice_no, ''), 
          ia.pi_reference, 
          ''
        ) as pi_no,
        COALESCE(NULLIF(pl.packing_list_no, ''), ia.packing_list_no, '') as pl_no,
        CASE 
          WHEN ia.container_details IS NOT NULL AND jsonb_array_length(ia.container_details) > 0 THEN ia.container_details
          ELSE COALESCE(pl.container_details, '[]'::jsonb)
        END as container_details,
        CASE 
          WHEN ia.product_lines IS NOT NULL AND jsonb_array_length(ia.product_lines) > 0 THEN ia.product_lines
          ELSE COALESCE(pl.product_lines, '[]'::jsonb)
        END as product_lines,
        COALESCE(NULLIF(ia.customs_seal_no, ''), 'N.A.') as customs_seal_no,
        COALESCE(NULLIF(ia.sample_seal_no, ''), 'N.A.') as sample_seal_no,
        COALESCE(NULLIF(ia.location_code, ''), '') as location_code,
        COALESCE(NULLIF(ia.lut_arn_no, ''), NULLIF(ei.lut_bond_ref, ''), '') as lut_arn_no,
        COALESCE(NULLIF(ia.lut_date::text, ''), NULLIF(ei.lut_date::text, ''), NULLIF(pi.lut_date::text, ''), '') as lut_date,
        COALESCE(NULLIF(ia.permission_no, ''), '') as permission_no,
        COALESCE(NULLIF(ia.goods_description_match, ''), 'YES') as goods_description_match,
        COALESCE(NULLIF(ia.samples_drawn, ''), 'N.A.') as samples_drawn,
        COALESCE(NULLIF(ia.declaration_text, ''), '') as declaration_text,
        COALESCE(NULLIF(ia.range_name, ''), '') as range_name,
        COALESCE(NULLIF(ia.division, ''), '') as division,
        COALESCE(NULLIF(ia.commissionerate, ''), '') as commissionerate,
        COALESCE(NULLIF(ia.manufacturer_name, ''), NULLIF(po.supplier_name, ''), '') as manufacturer_name,
        COALESCE(NULLIF(ia.manufacturer_address, ''), NULLIF(s.address, ''), '') as manufacturer_address,
        COALESCE(NULLIF(ia.factory_address, ''), 'AT MORBI') as factory_address
      FROM export_invoice_annexures ia
      LEFT JOIN export_invoices ei ON ia.export_invoice_id = ei.id
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      LEFT JOIN proforma_orders po ON pi.proforma_order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN packing_lists pl ON ia.packing_list_id = pl.id AND pl.deleted_at IS NULL
      WHERE ia.id = $1
    `;

    if (companyId) {
      sql += ` AND ia.company_id = $2`;
      params.push(companyId);
    } else {
      sql += ` AND ia.company_id IS NULL`;
    }

    const result = await db.query(sql, params);
    const data = result.rows[0];

    if (data) {
      let company = {};
      try {
        const companyResult = db.globalQuery ? await db.globalQuery('SELECT * FROM companies WHERE id = $1', [data.company_id || companyId]) : await masterQuery('SELECT * FROM companies WHERE id = $1', [data.company_id || companyId]);
        company = companyResult.rows[0] || {};
      } catch (err) {
      }

      data.company_name = data.company_name || company.name || '';
      data.company_address = data.company_address || company.address || '';
      data.iec_no = company.iec_no || data.iec_no || '';
      data.permission_no = data.permission_no || company.permission_no || (company.settings && company.settings.permission_no) || '';
      data.lut_arn_no = data.lut_arn_no || company.lut_arn_no || (company.settings && company.settings.lut_arn_no) || '';
      data.lut_date = data.lut_date || company.lut_date || (company.settings && company.settings.lut_date) || '';
      
      const settings = company.settings || {};
      data.range_name = data.range_name || settings.range_name || '';
      data.division = data.division || settings.division || '';
      data.commissionerate = data.commissionerate || settings.commissionerate || '';
      data.branch_code_no = data.branch_code_no || settings.branch_code_no || '';
      data.bin_no = data.bin_no || settings.bin_no || company.pan || '';
      data.location_code = data.location_code || settings.location_code || '';
    }

    return data || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Auto-fetch data for VGM from Invoice Backside
 */
export const getVGMInheritedData = async (companyId, backsideId, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    const params = [backsideId];
    let sql = `
      SELECT 
        ib.id as invoice_backside_id, ib.export_invoice_id, ib.company_id, ib.backside_no, ib.booking_no, ib.container_details, 
        COALESCE(ib.company_name, '') as shipper_name,
        COALESCE(ib.iec_no, '') as shipper_iec,
        COALESCE(ib.manufacturer_name, an.manufacturer_name, '') as manufacturer_name,
        COALESCE(ib.manufacturer_address, an.manufacturer_address, '') as manufacturer_address,
        COALESCE(an.annexure_no, ib.annexure_invoice_no, '') as annexure_no,
        COALESCE(
          ib.pi_no,
          (SELECT string_agg(p.invoice_no, ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          pi.invoice_no
        ) as pi_no, 
        COALESCE(
          (SELECT string_agg(TO_CHAR(p.date, 'YYYY-MM-DD'), ', ')
           FROM export_invoice_proforma_links l
           JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
           WHERE l.export_invoice_id = ei.id),
          pi.date::text
        ) as pi_date,
        COALESCE(ib.pl_no, pl.packing_list_no) as pl_no,
        COALESCE(pi.consignee_details, ib.consignee_details, ei.consignee_details, '') as consignee_details,
        ei.invoice_no as export_invoice_no, ei.invoice_date as export_invoice_date,
        ei.client_name, '' as suggested_vgm_no,
        COALESCE(ib.vessel_name, ei.vessel_flight_no, '') as vessel_name, 
        COALESCE(ib.voyage_no, '') as voyage_no,
        ib.port_of_loading, ib.port_of_discharge, ib.final_destination,
        COALESCE(ib.total_sqm, an.total_sqm, pl.total_sqm, 0) as total_sqm,
        COALESCE(ib.total_boxes, an.total_boxes, pl.total_boxes, 0) as total_boxes,
        COALESCE(ib.total_pallets, an.total_pallets, pl.total_pallets, 0) as total_pallets,
        COALESCE(ib.net_weight, an.net_weight, pl.net_weight, 0) as total_cargo_weight,
        COALESCE(ib.gross_weight, an.gross_weight, pl.gross_weight, 0) as total_vgm_weight,
        ib.weighbridge_name, ib.max_permissible_weight, ib.cargo_type,
        'AS PER BELOW DETAILS' as weighing_slip_no, 'AS PER BELOW DETAILS' as weighing_date, 'NA' as un_no_imdg
      FROM invoice_backside ib
      LEFT JOIN export_invoices ei ON ib.export_invoice_id = ei.id
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      LEFT JOIN packing_lists pl ON ei.id = pl.export_invoice_id AND pl.deleted_at IS NULL
      LEFT JOIN (
        SELECT DISTINCT ON (export_invoice_id) 
          export_invoice_id, annexure_no, total_sqm, total_boxes, total_pallets, net_weight, gross_weight,
          manufacturer_name, manufacturer_address
        FROM export_invoice_annexures WHERE deleted_at IS NULL ORDER BY export_invoice_id, created_at DESC
      ) an ON ei.id = an.export_invoice_id
      WHERE ib.id = $1
    `;

    if (companyId) {
      sql += ` AND ib.company_id = $2`;
      params.push(companyId);
    } else {
      sql += ` AND ib.company_id IS NULL`;
    }

    const result = await db.query(sql, params);
    const data = result.rows[0];

    if (data) {
      try {
        // Fetch company details from master database
        const companyResult = await masterQuery(
          'SELECT name, contact_person_name, contact_number, email_id, iec_no FROM companies WHERE id = $1',
          [data.company_id || companyId]
        );
        const company = companyResult.rows[0] || {};

        data.shipper_name = data.shipper_name || company.name || '';
        data.shipper_iec = data.shipper_iec || company.iec_no || '';
        data.authorized_person = data.authorized_person || company.contact_person_name || '';
        data.contact_details = data.contact_details || company.contact_number || company.email_id || '';
      } catch (err) {
      }
    }

    return data || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Auto-fetch data for Shipping Instructions from VGM
 */
export const getShippingInheritedData = async (companyId, vgmId, db) => {
  try {
    await selfHealTenantSchema(db, companyId);
    const vgmResult = await db.query(
      `SELECT * FROM vgm_documents WHERE id = $1 ${companyId ? 'AND company_id = $2' : (companyId === null ? 'AND company_id IS NULL' : '')}`,
      companyId ? [vgmId, companyId] : [vgmId]
    );
    const vgm = vgmResult.rows[0];
    if (!vgm) return null;

    let ei = {};
    if (vgm.export_invoice_id) {
      const eiResult = await db.query(`SELECT * FROM export_invoices WHERE id = $1`, [vgm.export_invoice_id]);
      ei = eiResult.rows[0] || {};
    }

    let ib = {};
    if (vgm.export_invoice_id) {
      const ibResult = await db.query(`SELECT * FROM invoice_backside WHERE export_invoice_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`, [vgm.export_invoice_id]);
      ib = ibResult.rows[0] || {};
    }

    let ia = {};
    if (vgm.export_invoice_id) {
      const iaResult = await db.query(`SELECT * FROM export_invoice_annexures WHERE export_invoice_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`, [vgm.export_invoice_id]);
      ia = iaResult.rows[0] || {};
    }

    let pl = {};
    if (vgm.export_invoice_id) {
      const plResult = await db.query(`SELECT * FROM packing_lists WHERE export_invoice_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`, [vgm.export_invoice_id]);
      pl = plResult.rows[0] || {};
    }

    let pi = {};
    if (vgm.export_invoice_id) {
      const piResult = await db.query(`
        SELECT 
          string_agg(p.invoice_no, ', ') as invoice_no,
          string_agg(TO_CHAR(p.date, 'YYYY-MM-DD'), ', ') as date,
          MAX(p.consignee_details) as consignee_details,
          MAX(p.buyer_details) as buyer_details
        FROM export_invoice_proforma_links l
        JOIN proforma_invoices p ON p.id = l.proforma_invoice_id
        WHERE l.export_invoice_id = $1
      `, [vgm.export_invoice_id]);
      
      if (piResult.rows[0] && piResult.rows[0].invoice_no) {
        pi = piResult.rows[0];
      } else if (ei.proforma_invoice_id) {
        const fallbackPi = await db.query(`SELECT * FROM proforma_invoices WHERE id = $1`, [ei.proforma_invoice_id]);
        pi = fallbackPi.rows[0] || {};
      }
    }

    let c = {};
    try {
      const cResult = await masterQuery(`SELECT * FROM companies WHERE id = $1`, [vgm.company_id || companyId]);
      c = cResult.rows[0] || {};
    } catch (err) {
    }

    const sheet = parseSafe(vgm.container_sheet) || [];
    const conts = parseSafe(vgm.containers) || [];
    // Professional approach: Take the list that has more data (9 vs 7)
    const vgmContainers = (sheet.length >= conts.length) ? sheet : conts;

    const ibContainers = parseSafe(ib.container_details) || [];
    const iaContainers = parseSafe(ia.container_details) || [];
    const plContainers = parseSafe(pl.container_details) || [];

    // Build a lookup map from previous documents (PL, IA, IB) to assist in container data merging


    // PRE-MERGE: Build a lookup map from previous documents (PL, IA, IB)
    const preVgmMap = new Map();
    const buildLookup = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach(c => {
        const cNo = (c.container_no || c.containerNo || c.container_number || '').toString().trim().toUpperCase();
        if (cNo) {
          // If multiple rows exist in PL with same name, we take the last one or merge? 
          // Usually PL has unique ones.
          preVgmMap.set(cNo, { ...preVgmMap.get(cNo), ...c });
        }
      });
    };
    buildLookup(plContainers);
    buildLookup(iaContainers);
    buildLookup(ibContainers);

    // MASTER LIST SELECTION: We prioritize the VGM list if it's longer (9 vs 7 case)
    const masterList = (vgmContainers.length >= plContainers.length) ? vgmContainers : plContainers;
    const isVgmMaster = vgmContainers.length >= plContainers.length;

    // Select the master container list based on completeness (whichever document has more records)


    const finalContainers = masterList.map((mc, idx) => {
      const cNo = (mc.container_no || mc.containerNo || mc.container_number || '').toString().trim().toUpperCase();

      // Find match in our pre-merged lookup
      let existing = {};
      if (cNo) {
        existing = preVgmMap.get(cNo) || {};
        // Partial match fallback if exact match fails
        if (!preVgmMap.has(cNo)) {
          for (let [k, v] of preVgmMap.entries()) {
            if (k.length > 3 && (cNo.startsWith(k) || k.startsWith(cNo))) {
              existing = v;
              break;
            }
          }
        }
      }

      const newNet = parseFloat(mc.net_weight || mc.cargo_wt || mc.cargoWt || mc.netWt || 0);
      const newGross = parseFloat(mc.gross_weight || mc.vgm_weight || mc.vgmWeight || mc.grossWt || 0);
      const prevNet = parseFloat(existing.net_weight || existing.cargo_wt || 0);
      const prevGross = parseFloat(existing.gross_weight || existing.vgm_weight || 0);

      return {
        ...existing,
        ...mc,
        container_no: mc.container_no || mc.containerNo || mc.container_number || existing.container_no || '',
        line_seal_no: mc.line_seal_no || mc.seal_no || mc.sealNo || existing.line_seal_no || '',
        sqm: mc.sqm || mc.total_sqm || mc.totalSqm || existing.sqm || 0,
        boxes: mc.boxes || mc.total_boxes || mc.totalBoxes || existing.boxes || 0,
        net_weight: newNet > 0 ? newNet : prevNet,
        gross_weight: newGross > 0 ? newGross : prevGross
      };
    });

    // If there were any PL containers NOT in the master list, we should optionally append them?
    // But if VGM is master, it's usually complete. 
    // For safety, let's see if we missed anything from PL if PL was longer? (Already handled by masterList selection)


    const formatAddress = (name, addr) => {
      const parts = [name, addr].filter(p => !!p && p.trim() !== '');
      return parts.join('\n');
    };

    const shipper = formatAddress(ib.exporter_name || ib.company_name || c.name, ib.exporter_address || ib.company_address || c.address);
    const consignee = (pi.consignee_details || ia.consignee_details || ib.consignee_details || ei.consignee_details || '').trim();
    const notify1 = (pi.buyer_details || ia.buyer_details || formatAddress(ib.notify_party, ib.notify_party_address) || ei.buyer_details || '').trim();

    // Document Numbers with robust fallbacks
    const piNo = vgm.pi_no || ib.pi_no || ia.pi_reference || pl.proforma_invoice_no || pl.pi_reference || '';
    const plNo = vgm.pl_no || pl.packing_list_no || ib.pl_no || ia.packing_list_no || '';
    const annexureNo = vgm.annexure_no || ia.annexure_no || ib.annexure_invoice_no || '';
    const backsideNo = ib.backside_no || '';

    // Placeholder Cleanup: If any field inherited a literal key name like 'vesselName', nullify it.
    let vesselName = ia.vessel_name || ib.vessel_name || vgm.vessel_name || ei.vessel_flight_no || pl.vessel_flight_no || '';
    if (vesselName === 'vesselName' || vesselName === 'vessel_name') vesselName = '';

    // Robust Calculation of Grand Totals from Merged Containers
    let derivedNet = 0, derivedGross = 0, derivedSqm = 0, derivedBoxes = 0;
    finalContainers.forEach(c => {
      derivedNet += parseFloat(c.net_weight || c.cargo_wt || c.cargoWt || 0);
      derivedGross += parseFloat(c.gross_weight || c.vgm_weight || c.vgmWeight || 0);
      derivedSqm += parseFloat(c.sqm || c.total_sqm || c.totalSqm || 0);
      derivedBoxes += parseInt(c.boxes || c.total_boxes || c.totalBoxes || 0);
    });

    // Remove raw container fields from the spread objects to avoid conflict with the merged container_details
    const cleanVgm = { ...vgm }; delete cleanVgm.container_sheet; delete cleanVgm.containers;
    const cleanIb = { ...ib }; delete cleanIb.container_details;
    const cleanIa = { ...ia }; delete cleanIa.container_details;
    const cleanPl = { ...pl }; delete cleanPl.container_details;

    // Recalculate totals from finalContainers to ensure they are accurate
    let totalNetWeight = 0, totalGrossWeight = 0, totalSqm = 0, totalBoxes = 0, totalPallets = 0;
    finalContainers.forEach(c => {
      totalNetWeight += parseFloat(c.net_weight || 0);
      totalGrossWeight += parseFloat(c.gross_weight || c.vgm_weight || 0);
      totalSqm += parseFloat(c.sqm || 0);
      totalBoxes += parseInt(c.boxes || 0);
      totalPallets += parseInt(c.pallets || 0);
    });

    return {
      ...cleanPl,
      ...cleanIa,
      ...cleanIb,
      ...cleanVgm, // VGM must be last to have highest priority
      id: null,
      vgm_id: vgmId,
      si_no: '',
      si_date: new Date().toISOString().split('T')[0],
      container_details: finalContainers,
      total_net_weight: totalNetWeight,
      total_gross_weight: totalGrossWeight,
      total_sqm: totalSqm,
      total_boxes: totalBoxes,
      total_pallets: totalPallets,
      net_weight: totalNetWeight,
      gross_weight: totalGrossWeight,
      status: 'Draft',



      // Explicit mapping for fields that might have different names in different sources
      booking_no: vgm.booking_number || pl.booking_no || ib.booking_no || ei.booking_no || '',
      vessel_name: vgm.vessel_name || ia.vessel_name || ib.vessel_name || ei.vessel_flight_no || '',
      port_of_loading: vgm.port_of_loading || ia.port_of_loading || ib.port_of_loading || ei.port_of_loading || 'MUNDRA PORT',
      port_of_discharge: vgm.port_of_discharge || ia.port_of_discharge || ib.port_of_discharge || ei.port_of_discharge || '',
      final_destination: vgm.place_of_delivery || ia.final_destination || ib.final_destination || ei.final_destination || '',

      // Parties
      backside_shipper_details: shipper,
      consignee_details: consignee,
      notify_party_details: notify1,

      // Document refs
      export_invoice_no: ei.invoice_no || vgm.export_invoice_no || '',
      export_invoice_date: ei.invoice_date || vgm.invoice_date || null,
      pi_no: piNo,
      pl_no: plNo,
      annexure_no: annexureNo,
      backside_no: backsideNo,

      // Special logic for HS Code as requested: fetch Tariff Code from Invoice

      hs_code: ei.tariff_code || vgm.hs_code || ia.hs_code || '6907',
      country_of_origin: vgm.country_of_origin || ia.country_of_origin || ib.country_of_origin || ei.country_of_origin || 'INDIA',

      // Weights fallback if totals are somehow 0
      total_vgm_weight: totalGrossWeight > 0 ? totalGrossWeight : (vgm.total_vgm_weight || 0),
      description_of_goods: ib.goods_description || ia.product_description || pl.material_description || 'GLAZED PORCELAIN TILES'
    };
  } catch (error) {
    throw error;
  }
};

function parseSafe(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return val;
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : [parsed]; } catch (e) { return null; }
}

function NULLIF(val, target) { return val === target ? null : val; }

/**
 * Validate reference
 */
export const validateExportDocumentReference = async (referenceType, referenceId, companyId, db) => {
  try {
    let sql = '';
    const params = [referenceId];

    switch (referenceType) {
      case 'export_invoice': sql = `SELECT id, status FROM export_invoices WHERE id = $1`; break;
      case 'packing_list': sql = `SELECT id, status FROM packing_lists WHERE id = $1`; break;
      case 'annexure': sql = `SELECT id, status FROM export_invoice_annexures WHERE id = $1`; break;
      case 'backside': sql = `SELECT id, status FROM invoice_backside WHERE id = $1`; break;
      case 'vgm': sql = `SELECT id, status FROM vgm_documents WHERE id = $1`; break;
      default: return { valid: false, reason: 'Invalid type' };
    }

    if (companyId) {
      sql += ` AND company_id = $2`;
      params.push(companyId);
    } else {
      sql += ` AND company_id IS NULL`;
    }

    const result = await db.query(sql, params);
    return { valid: !!result.rows[0] };
  } catch (error) { throw error; }
};

export const getWorkflowChain = async (companyId, exportInvoiceId, db) => {
  try {
    const params = [exportInvoiceId];
    let sql = "SELECT * FROM export_invoices WHERE id = $1 AND deleted_at IS NULL";
    if (companyId) { sql += " AND company_id = $2"; params.push(companyId); }
    else { sql += " AND company_id IS NULL"; }
    const result = await db.query(sql, params);
    return result.rows[0];
  } catch (e) { throw e; }
};
export const getBLInheritedData = async (companyId, exportInvoiceId, db) => {
  try {
    const params = [exportInvoiceId];
    let sql = `
      SELECT 
        ei.*,
        pi.invoice_no as proforma_invoice_no,
        pi.consignee_details,
        pi.buyer_details,
        pi.notify_party_details,
        si.instruction_no as si_no,
        si.si_date,
        si.shipper_details,
        si.vessel_name as si_vessel,
        si.port_of_loading as si_pol,
        si.port_of_discharge as si_pod,
        si.total_gross_weight,
        si.total_packages
      FROM export_invoices ei
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      LEFT JOIN shipping_instructions si ON ei.id = si.export_invoice_id AND si.deleted_at IS NULL
      WHERE ei.id = $1
    `;

    if (companyId) {
      sql += ` AND ei.company_id = $2`;
      params.push(companyId);
    } else {
      sql += ` AND ei.company_id IS NULL`;
    }

    const result = await db.query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};
