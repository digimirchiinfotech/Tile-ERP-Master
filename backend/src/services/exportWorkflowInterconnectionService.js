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
 * Export Workflow Interconnection Service
 * 
 * This service manages data flow and interconnections across all export-related documents:
 * Proforma Invoice → Export Invoice → Packing List → Annexure → 
 * Invoice Backside → VGM → Shipping Instructions
 * 
 * Ensures:
 * - Data flows seamlessly from one stage to the next
 * - No manual re-entry required
 * - Data integrity and consistency
 * - Complete traceability
 */

import { query as masterQuery } from '../config/database.js';

/**
 * Fetch complete workflow data starting from Proforma Invoice
 */
export const getCompleteWorkflowData = async (proformaInvoiceId, companyId, db) => {
  if (!db) throw new Error('Database context (db) is required for getCompleteWorkflowData');
  const query = db.query.bind(db);
  
  try {
    // Step 1: Get Proforma Invoice data
    // NOTE: Do NOT join to 'companies' table here — it does not exist in physically isolated tenant databases.
    // Company details must be fetched separately via masterQuery if needed by the caller.
    const piResult = await query(
      `SELECT pi.*,
              po.order_no as proforma_order_no
       FROM proforma_invoices pi
       LEFT JOIN proforma_orders po ON pi.proforma_order_id = po.id
       WHERE pi.id = $1 AND pi.company_id = $2`,
      [proformaInvoiceId, companyId]
    );

    if (piResult.rows.length === 0) {
      return { error: 'Proforma invoice not found', status: 404 };
    }

    const proformaData = piResult.rows[0];

    // Step 2: Get Export Invoice data (if exists)
    const eiResult = await query(
      `SELECT ei.*, pi.invoice_no as proforma_invoice_no
       FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       WHERE ei.proforma_invoice_id = $1 AND ei.company_id = $2`,
      [proformaInvoiceId, companyId]
    );

    const exportInvoiceData = eiResult.rows[0] || null;
    const exportInvoiceId = exportInvoiceData?.id;

    // Step 3: Get Packing List data (if export invoice exists)
    let packingListData = null;
    let packingListLines = [];
    if (exportInvoiceId) {
      const plResult = await query(
        `SELECT * FROM packing_lists 
         WHERE export_invoice_id = $1 AND company_id = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [exportInvoiceId, companyId]
      );

      if (plResult.rows.length > 0) {
        packingListData = plResult.rows[0];

        // Get packing list lines
        const plLinesResult = await query(
          `SELECT * FROM packing_list_lines WHERE packing_list_id = $1`,
          [packingListData.id]
        );
        packingListLines = plLinesResult.rows;
      }
    }

    // Step 4: Get Annexure data
    let annexureData = null;
    if (exportInvoiceId) {
      const annexResult = await query(
        `SELECT * FROM export_invoice_annexures 
         WHERE export_invoice_id = $1 AND company_id = $2`,
        [exportInvoiceId, companyId]
      );
      annexureData = annexResult.rows[0] || null;
    }

    // Step 5: Get Invoice Backside data
    let backsideData = null;
    if (exportInvoiceId) {
      const backsideResult = await query(
        `SELECT * FROM invoice_backside 
         WHERE export_invoice_id = $1 AND company_id = $2`,
        [exportInvoiceId, companyId]
      );
      backsideData = backsideResult.rows[0] || null;
    }

    // Step 6: Get VGM document data
    let vgmData = null;
    let vgmContainers = [];
    if (exportInvoiceId) {
      const vgmResult = await query(
        `SELECT * FROM vgm_documents 
         WHERE export_invoice_id = $1 AND company_id = $2`,
        [exportInvoiceId, companyId]
      );

      if (vgmResult.rows.length > 0) {
        vgmData = vgmResult.rows[0];
        const raw = vgmData.containers || vgmData.container_sheet || [];
        try {
          vgmContainers = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          vgmContainers = [];
        }
      }
    }

    // Step 7: Get Shipping Instructions data
    let shippingData = null;
    if (exportInvoiceId) {
      const shippingResult = await query(
        `SELECT * FROM shipping_instructions 
         WHERE export_invoice_id = $1 AND company_id = $2`,
        [exportInvoiceId, companyId]
      );
      shippingData = shippingResult.rows[0] || null;
    }

    return {
      status: 200,
      data: {
        proformaInvoice: proformaData,
        exportInvoice: exportInvoiceData,
        packingList: {
          header: packingListData,
          lines: packingListLines
        },
        annexure: annexureData,
        backside: backsideData,
        vgm: {
          header: vgmData,
          containers: vgmContainers
        },
        shippingInstructions: shippingData,
        workflowStatus: {
          proformaCreated: !!proformaData,
          exportInvoiceCreated: !!exportInvoiceData,
          packingListCreated: !!packingListData,
          annexureCreated: !!annexureData,
          backsideCreated: !!backsideData,
          vgmCreated: !!vgmData,
          shippingInstructionsCreated: !!shippingData
        }
      }
    };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
};

/**
 * Get complete data for a specific export invoice through all downstream stages
 */
export const getExportInvoiceWorkflow = async (exportInvoiceId, companyId, db) => {
  if (!db) throw new Error('Database context (db) is required for getExportInvoiceWorkflow');
  const query = db.query.bind(db);
  
  try {
    const eiResult = await query(
      `SELECT ei.*, pi.invoice_no as proforma_invoice_no, pi.date as proforma_date
       FROM export_invoices ei
       LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
       WHERE ei.id = $1 AND ei.company_id = $2`,
      [exportInvoiceId, companyId]
    );

    if (eiResult.rows.length === 0) {
      return { error: 'Export invoice not found', status: 404 };
    }

    const exportInvoiceData = eiResult.rows[0];

    const [packingListResult, annexureResult, backsideResult, vgmResult, shippingResult] = await Promise.all([
      query(`SELECT *, (SELECT COUNT(*) FROM packing_list_lines WHERE packing_list_id = packing_lists.id) as line_count
             FROM packing_lists WHERE export_invoice_id = $1 AND company_id = $2`, [exportInvoiceId, companyId]),
      query(`SELECT * FROM export_invoice_annexures WHERE export_invoice_id = $1 AND company_id = $2`, [exportInvoiceId, companyId]),
      query(`SELECT * FROM invoice_backside WHERE export_invoice_id = $1 AND company_id = $2`, [exportInvoiceId, companyId]),
      query(`SELECT * FROM vgm_documents WHERE export_invoice_id = $1 AND company_id = $2`, [exportInvoiceId, companyId]),
      query(`SELECT * FROM shipping_instructions WHERE export_invoice_id = $1 AND company_id = $2`, [exportInvoiceId, companyId])
    ]);

    return {
      status: 200,
      data: {
        exportInvoice: exportInvoiceData,
        packingLists: packingListResult.rows,
        annexures: annexureResult.rows,
        backside: backsideResult.rows[0] || null,
        vgm: vgmResult.rows[0] || null,
        shippingInstructions: shippingResult.rows,
        completionStatus: {
          packingListComplete: packingListResult.rows.length > 0,
          annexureComplete: annexureResult.rows.length > 0,
          backsideComplete: backsideResult.rows.length > 0,
          vgmComplete: vgmResult.rows.length > 0,
          shippingInstructionsComplete: shippingResult.rows.length > 0
        }
      }
    };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
};

/**
 * Get data for creating next stage document
 */
export const getDataForNextStage = async (currentStage, documentId, companyId, db) => {
  if (!db) throw new Error('Database context (db) is required for getDataForNextStage');
  const query = db.query.bind(db);
  
  try {
    let inheritedData = {};

    switch (currentStage) {
      case 'proforma_invoice':
        const piResult = await query(
          `SELECT * FROM proforma_invoices WHERE id = $1 AND company_id = $2`,
          [documentId, companyId]
        );
        if (piResult.rows[0]) {
          const pi = piResult.rows[0];
          inheritedData = {
            proforma_invoice_id: pi.id,
            proforma_invoice_no: pi.invoice_no,
            proforma_date: pi.date,
            client_id: pi.client_id,
            client_name: pi.client_name,
            country: pi.country,
            port_of_loading: pi.port_of_loading,
            port_of_discharge: pi.port_of_discharge,
            final_destination: pi.final_destination,
            consignee_details: pi.consignee_details,
            commodity: pi.commodity,
            hs_code: pi.hs_code,
            description_of_goods: pi.description_of_goods,
            quantity: pi.quantity,
            unit: pi.unit,
            unit_price: pi.unit_price,
            total_value: pi.total_value,
            currency: pi.currency,
            inco_term: pi.inco_term,
            payment_terms: pi.payment_terms,
            handling_instructions: pi.handling_instructions,
            shipping_marks: pi.shipping_marks,
            declaration: pi.declaration
          };
        }
        break;

      case 'export_invoice':
        const eiResult = await query(
          `SELECT ei.*, pi.invoice_no as proforma_invoice_no, pi.date as proforma_date, pi.order_id as pi_order_id,
                  c.name as co_name, c.address as co_address, c.iec_no as co_iec
           FROM export_invoices ei
           LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
           LEFT JOIN companies c ON ei.company_id = c.id
           WHERE ei.id = $1 AND ei.company_id = $2`,
          [documentId, companyId]
        );
        if (eiResult.rows[0]) {
          const ei = eiResult.rows[0];
          inheritedData = {
            export_invoice_id: ei.id,
            export_invoice_no: ei.invoice_no,
            export_invoice_date: ei.invoice_date,
            proforma_invoice_no: ei.proforma_invoice_no || ei.pi_no,
            proforma_invoice_id: ei.proforma_invoice_id,
            proforma_invoice_date: ei.proforma_date,
            order_id: ei.order_id || ei.pi_order_id,
            client_name: ei.client_name,
            country: ei.country,
            consignee_details: ei.consignee_details,
            buyer_details: ei.buyer_details,
            port_of_loading: ei.port_of_loading || 'MUNDRA PORT',
            port_of_discharge: ei.port_of_discharge,
            final_destination: ei.final_destination,
            place_of_receipt: ei.place_of_receipt,
            vessel_flight_no: ei.vessel_flight_no,
            pre_carriage_by: ei.pre_carriage_by,
            tariff_code: ei.tariff_code || '69072100',
            buyers_order_no: ei.buyers_order_no,
            buyers_order_date: ei.buyers_order_date,
            payment_terms: ei.payment_terms,
            delivery_terms: ei.delivery_terms,
            pallet_type: ei.pallet_type || 'NORMAL WOODEN PALLETS',
            tiles_back: ei.tiles_back || 'WITH MADE IN INDIA',
            boxes_marking: ei.boxes_marking || 'WITH MADE IN INDIA',
            box_type: ei.box_type || 'NON BRANDED BOXES',
            fumigation: ei.fumigation || 'YES',
            legalisation: ei.legalisation || 'NO',
            made_in_india: ei.made_in_india || 'YES',
            other_instructions: ei.other_instructions,
            total_pallets: ei.pallets,
            total_sqm: ei.total_sqm,
            net_weight: ei.net_weight,
            gross_weight: ei.gross_weight,
            currency: ei.currency || 'INR',
            product_lines: ei.product_lines,
            container_details: ei.container_details,
            company_name: ei.co_name,
            company_address: ei.co_address,
            iec_no: ei.co_iec
          };
        }
        break;

      case 'packing_list':
        const plResult = await query(
          `SELECT pl.*, ei.invoice_no as export_invoice_no, ei.booking_no,
                  ei.port_of_loading as ei_pol, ei.port_of_discharge as ei_pod,
                  ei.final_destination as ei_fd
           FROM packing_lists pl
           LEFT JOIN export_invoices ei ON pl.export_invoice_id = ei.id
           WHERE pl.id = $1 AND pl.company_id = $2`,
          [documentId, companyId]
        );
        if (plResult.rows[0]) {
          const pl = plResult.rows[0];
          inheritedData = {
            packing_list_id: pl.id,
            packing_list_no: pl.packing_list_no,
            export_invoice_id: pl.export_invoice_id,
            export_invoice_no: pl.export_invoice_no,
            booking_no: pl.booking_no,
            total_pallets: pl.total_pallets,
            total_boxes: pl.total_boxes,
            total_sqm: pl.total_sqm,
            total_weight: pl.total_weight,
            gross_weight: pl.total_weight,
            client_name: pl.client_name,
            country: pl.country,
            port_of_loading: pl.ei_pol || pl.port_of_loading,
            port_of_discharge: pl.ei_pod || pl.port_of_discharge,
            final_destination: pl.ei_fd || pl.final_destination,
            container_type: pl.container_type,
            seal_number: pl.seal_number,
            shipping_marks: pl.shipping_marks
          };
        }
        break;

      case 'vgm':
        const vgmResult = await query(
          `SELECT v.*, ei.invoice_no as export_invoice_no, ei.order_id 
           FROM vgm_documents v
           LEFT JOIN export_invoices ei ON v.export_invoice_id = ei.id
           WHERE v.id = $1 AND v.company_id = $2`,
          [documentId, companyId]
        );
        if (vgmResult.rows[0]) {
          const vgm = vgmResult.rows[0];
          inheritedData = {
            vgm_id: vgm.id,
            vgm_no: vgm.vgm_no,
            export_invoice_id: vgm.export_invoice_id,
            export_invoice_no: vgm.export_invoice_no,
            order_id: vgm.order_id,
            gross_weight: vgm.total_vgm_weight,
            net_weight: vgm.total_cargo_weight,
            containers: vgm.containers,
            vgm_method: vgm.vgm_method,
            shipper_name: vgm.shipper_name,
            shipper_iec: vgm.shipper_iec
          };
        }
        break;

      case 'shipping_instruction':
        const siResult = await query(
          `SELECT si.*, ei.invoice_no as export_invoice_no, ei.order_id 
           FROM shipping_instructions si
           LEFT JOIN export_invoices ei ON si.export_invoice_id = ei.id
           WHERE si.id = $1 AND si.company_id = $2`,
          [documentId, companyId]
        );
        if (siResult.rows[0]) {
          const si = siResult.rows[0];
          inheritedData = {
            shipping_instruction_id: si.id,
            si_no: si.si_no,
            export_invoice_id: si.export_invoice_id,
            export_invoice_no: si.export_invoice_no,
            order_id: si.order_id,
            shipper_details: si.shipper_details,
            consignee_details: si.consignee_details,
            notify_party: si.notify_party,
            vessel_name: si.vessel_name,
            voyage_number: si.voyage_number,
            port_of_loading: si.port_of_loading,
            port_of_discharge: si.port_of_discharge,
            container_numbers: si.container_numbers,
            seal_numbers: si.seal_numbers,
            gross_weight: si.gross_weight,
            cbm: si.cbm,
            freight_terms: si.freight_terms
          };
        }
        break;

      default:
        return { error: 'Unknown stage', status: 400 };
    }

    return { status: 200, inheritedData };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
};

/**
 * Sync updates across related documents
 */
export const syncUpdatesAcrossStages = async (documentId, stage, changedFields, companyId, db) => {
  if (!db) throw new Error('Database context (db) is required for syncUpdatesAcrossStages');
  const query = db.query.bind(db);
  
  try {
    const syncLog = { sourceDocument: { id: documentId, stage }, syncedDocuments: [], errors: [] };

    const syncMapping = {
      export_invoice: {
        exportToPackingList: [
          'gross_weight', 'net_weight', 'shipping_marks', 'client_name', 'country', 'total_sqm',
          'total_boxes', 'pallets', 'consignee_details', 'buyer_details', 'buyers_order_no',
          'buyers_order_date', 'tariff_code', 'bl_no', 'bl_date', 'shipping_bill_no',
          'shipping_bill_date', 'final_destination', 'payment_terms', 'delivery_terms',
          'pre_carriage_by', 'place_of_receipt', 'vessel_flight_no', 'port_of_loading',
          'port_of_discharge', 'pallet_type', 'tiles_back', 'boxes_marking', 'box_type',
          'fumigation', 'legalisation', 'other_instructions', 'product_lines',
          'container_details', 'country_of_origin'
        ],
        exportToIGST: [
          'country', 'consignee_details', 'buyer_details', 'payment_terms', 'delivery_terms',
          'port_of_loading', 'port_of_discharge', 'final_destination', 'tariff_code',
          'product_lines', 'pallets', 'total_sqm', 'net_weight', 'gross_weight',
          'pallet_type', 'tiles_back', 'boxes_marking', 'box_type', 'fumigation',
          'legalisation', 'other_instructions', 'shipping_bill_no', 'shipping_bill_date',
          'pre_carriage_by', 'vessel_flight_no', 'place_of_receipt', 'buyers_order_no',
          'buyers_order_date', 'lut_bond_ref', 'lut_date', 'country_of_origin',
          'supply_declaration', 'ftp_incentive_declaration'
        ],
        exportToAnnexure: [
          'shipping_bill_no', 'shipping_bill_date', 'lut_bond_ref', 'total_sqm', 'total_boxes',
          'lut_date', 'invoice_no', 'invoice_date', 'client_name', 'consignee_details',
          'buyer_details', 'vessel_flight_no', 'port_of_loading', 'port_of_discharge',
          'final_destination', 'country', 'country_of_origin', 'tariff_code', 'pallet_type',
          'tiles_back', 'box_type', 'fumigation', 'legalisation', 'other_instructions',
          'pallets', 'net_weight', 'gross_weight', 'container_details', 'product_lines',
          'boxes_marking'
        ],
        exportToBackside: [
          'invoice_no', 'invoice_date', 'client_name', 'consignee_details', 'buyer_details',
          'vessel_flight_no', 'port_of_loading', 'port_of_discharge', 'final_destination',
          'country', 'country_of_origin', 'tariff_code', 'total_pallets', 'total_boxes',
          'total_sqm', 'net_weight', 'gross_weight', 'pallet_type', 'tiles_back',
          'box_type', 'fumigation', 'legalisation', 'other_instructions', 'container_details',
          'shipping_bill_no', 'shipping_bill_date', 'lut_bond_ref', 'lut_date', 'booking_no'
        ],
        exportToVGM: [
          'invoice_no', 'invoice_date', 'booking_no', 'net_weight', 'gross_weight',
          'total_sqm', 'total_boxes', 'pallets', 'vessel_flight_no', 'port_of_loading',
          'port_of_discharge', 'shipping_bill_no', 'shipping_bill_date', 'client_name',
          'country'
        ],
        exportToShipping: [
          'consignee_details', 'vessel_flight_no', 'port_of_loading', 'port_of_discharge',
          'final_destination', 'place_of_receipt', 'booking_no', 'container_details',
          'tariff_code', 'pallets', 'total_boxes', 'total_sqm', 'net_weight',
          'gross_weight', 'shipping_bill_no', 'shipping_bill_date', 'client_name',
          'invoice_no', 'country_of_origin'
        ]
      },
      packing_list: {
        packingToVGM: ['gross_weight', 'net_weight', 'container_type', 'total_pallets', 'total_boxes', 'total_sqm'],
        packingToShipping: ['container_type', 'shipping_marks', 'total_pallets', 'total_boxes', 'total_sqm']
      },
      annexure: {
        annexureToBackside: ['container_details', 'gross_weight', 'net_weight', 'total_sqm', 'total_boxes', 'manufacturer_name', 'manufacturer_address', 'permission_no', 'lut_arn_no', 'lut_date', 'iec_no', 'product_description'],
        annexureToVGM: ['container_details', 'gross_weight', 'net_weight', 'total_sqm', 'total_boxes', 'manufacturer_name', 'manufacturer_address', 'weighbridge_name'],
        annexureToShipping: ['container_details', 'gross_weight', 'net_weight', 'total_sqm', 'total_boxes', 'product_description']
      },
      backside: {
        backsideToVGM: ['container_details', 'gross_weight', 'net_weight', 'total_sqm', 'total_boxes', 'manufacturer_name', 'manufacturer_address', 'weighbridge_name', 'total_pallets']
      },
      vgm: {
        vgmToShipping: ['total_vgm_weight', 'total_cargo_weight', 'container_type', 'container_sheet', 'total_sqm', 'total_boxes', 'total_pallets']
      },
      shipping_instruction: {
        shippingToBillOfLading: ['shipper_details', 'consignee_details', 'notify_party', 'port_of_loading', 'port_of_discharge', 'vessel_name', 'voyage_number', 'container_numbers', 'seal_numbers', 'gross_weight', 'cbm']
      },
      proforma_invoice: {
        piToExportInvoice: ['client_name', 'country', 'consignee_details', 'port_of_loading', 'port_of_discharge', 'total_amount', 'currency', 'product_lines']
      }
    };

    const mapping = syncMapping[stage];
    if (!mapping) return { status: 200, syncLog };

    let sourceData = {};
    const sourceTableName = getTableName(stage);
    const sourceWhere = sourceTableName === 'export_invoices'
      ? `WHERE id = $1 AND company_id = $2`
      : `WHERE (id = $1 OR export_invoice_id = $1) AND company_id = $2`;
    const sourceResult = await query(
      `SELECT * FROM ${sourceTableName} 
       ${sourceWhere} 
       ORDER BY created_at DESC LIMIT 1`,
      [documentId, companyId]
    );

    if (sourceResult.rows.length > 0) {
      sourceData = sourceResult.rows[0];
    }

    if (!sourceData && stage !== 'export_invoice') return { status: 200, syncLog };

    // Resolve export_invoice_id for all stages
    const exportInvoiceId = (stage === 'export_invoice') ? documentId : sourceData.export_invoice_id;
    if (!exportInvoiceId) return { status: 200, syncLog };

    // General Logic for all stages defined in mapping
    for (const [syncKey, fields] of Object.entries(mapping)) {
      const normalizedChangedFields = changedFields.reduce((acc, key) => {
        acc.push(key);
        acc.push(camelToSnake(key));
        return acc;
      }, []);
      const updateFields = fields.filter(f => normalizedChangedFields.includes(f));
      if (updateFields.length === 0) continue;

      // Extract target stage from mapping name (e.g., exportToPackingList -> packing_list)
      const targetStageRaw = syncKey.split('To')[1];
      const targetStage = targetStageRaw.toLowerCase();
      const tableName = getTableName(targetStage);

      // Value mapping adjustments
      const updateClause = updateFields.map((f, i) => {
        let dbCol = camelToSnake(f);
        const idx = i + 1;
        if (targetStage === 'vgm') {
          if (f === 'pallets' || f === 'total_pallets') return `total_pallets = $${idx}`;
          if (f === 'gross_weight') return `gross_weight = $${idx}, total_vgm_weight = $${idx}`;
          if (f === 'net_weight') return `net_weight = $${idx}, total_cargo_weight = $${idx}`;
          if (f === 'container_details') return `container_sheet = $${idx}`;
          if (f === 'vessel_flight_no') return `vessel_name = $${idx}`;
          if (f === 'invoice_no') return `export_invoice_no = $${idx}`;
          if (f === 'booking_no') return `booking_number = $${idx}`;
        }
        if (targetStage === 'shipping') {
          if (f === 'pallets' || f === 'total_pallets') return `total_pallets = $${idx}`;
          if (f === 'consignee_details') return `consignee_details = $${idx}, consignee_name = $${idx}`;
          if (f === 'product_description') return `description_of_goods = $${idx}`;
          if (f === 'container_sheet') return `container_details = $${idx}`;
          if (f === 'invoice_no') return `export_invoice_no = $${idx}`;
          if (f === 'vessel_flight_no') return `vessel_name = $${idx}`;
          if (f === 'place_of_receipt') return `place_of_delivery = $${idx}`;
          if (f === 'tariff_code') return `hs_code = $${idx}`;
          if (f === 'total_boxes') return `total_boxes = $${idx}, total_packages = $${idx}`;
          if (f === 'net_weight') return `net_weight = $${idx}, total_net_weight = $${idx}`;
          if (f === 'gross_weight') return `gross_weight = $${idx}, total_gross_weight = $${idx}`;
        }
        if (targetStage === 'backside') {
          if (f === 'total_boxes') return `total_boxes = $${idx}, total_packages = $${idx}`;
          if (f === 'product_description') return `goods_description = $${idx}`;
          if (f === 'invoice_no') return `invoice_no = $${idx}, export_invoice_no = $${idx}`;
          if (f === 'invoice_date') return `invoice_date = $${idx}, export_invoice_date = $${idx}`;
          if (f === 'vessel_flight_no') return `vessel_name = $${idx}`;
          if (f === 'tariff_code') return `hs_code = $${idx}`;
          if (f === 'pallet_type') return `pallets_type = $${idx}`;
          if (f === 'box_type') return `boxes_type = $${idx}`;
          if (f === 'pallets' || f === 'total_pallets') return `total_pallets = $${idx}`;
          if (f === 'lut_bond_ref') return `lut_arn_no = $${idx}`;
        }
        if (targetStage === 'packinglist') {
          if (f === 'country') return `country_of_origin = $${idx}`;
          if (f === 'consignee_details') return `consignee = $${idx}`;
          if (f === 'buyer_details') return `buyer = $${idx}`;
          if (f === 'shipping_bill_no') return `sb_no = $${idx}`;
          if (f === 'shipping_bill_date') return `sb_date = $${idx}`;
          if (f === 'pallets' || f === 'total_pallets') return `total_pallets = $${idx}`;
          if (f === 'gross_weight') return `gross_weight = $${idx}, total_weight = $${idx}`;
        }
        if (targetStage === 'annexure') {
          if (f === 'invoice_no') return `invoice_no = $${idx}, export_invoice_no = $${idx}`;
          if (f === 'vessel_flight_no') return `vessel_name = $${idx}`;
          if (f === 'tariff_code') return `hs_code = $${idx}`;
          if (f === 'pallet_type') return `pallet_type = $${idx}, pallets_type = $${idx}`;
          if (f === 'box_type') return `boxes_type = $${idx}`;
          if (f === 'pallets' || f === 'total_pallets') return `total_pallets = $${idx}`;
          if (f === 'lut_bond_ref') return `lut_arn_no = $${idx}`;
          if (f === 'total_boxes') return `total_boxes = $${idx}, total_packages = $${idx}`;
        }
        if (targetStage === 'igst') {
          if (f === 'pallets' || f === 'total_pallets') return `total_pallets = $${idx}`;
          if (f === 'total_sqm') return `total_quantity = $${idx}`;
        }
        return `${dbCol} = $${idx}`;
      }).join(', ');

      const updateValues = updateFields.map(f => {
        let val = sourceData[f];
        // When syncing container_details → container_sheet (VGM), group
        // product-level rows into one row per physical container.
        if (f === 'container_details' && (targetStage === 'vgm' || targetStage === 'vgm_documents')) {
          try {
            const rawArr = typeof val === 'string' ? JSON.parse(val) : val;
            if (Array.isArray(rawArr) && rawArr.length > 0) {
              const groups = {};
              rawArr.forEach(c => {
                const cNo = (c.container_no || c.containerNo || c.cont_no || '').trim();
                if (!cNo) return;
                if (!groups[cNo]) {
                  groups[cNo] = { ...c };
                  // Ensure cargo_wt is initialized properly from gross_weight or net_weight if missing
                  if (!groups[cNo].cargo_wt && (groups[cNo].gross_weight || groups[cNo].net_weight)) {
                      groups[cNo].cargo_wt = parseFloat(groups[cNo].gross_weight || groups[cNo].net_weight || 0);
                  }
                } else {
                  groups[cNo].boxes = (groups[cNo].boxes || 0) + (parseInt(c.boxes) || 0);
                  groups[cNo].pallets = (groups[cNo].pallets || 0) + (parseInt(c.pallets) || 0);
                  groups[cNo].total_sqm = parseFloat(((groups[cNo].total_sqm || 0) + (parseFloat(c.total_sqm) || 0)).toFixed(2));
                  groups[cNo].net_weight = parseFloat(((groups[cNo].net_weight || 0) + (parseFloat(c.net_weight) || 0)).toFixed(2));
                  groups[cNo].gross_weight = parseFloat(((groups[cNo].gross_weight || 0) + (parseFloat(c.gross_weight) || 0)).toFixed(2));
                  
                  // Calculate cargo_wt dynamically from the source row's gross/net weight if cargo_wt is missing
                  const sourceCargo = parseFloat(c.cargo_wt || c.gross_weight || c.net_weight || 0);
                  groups[cNo].cargo_wt = parseFloat(((groups[cNo].cargo_wt || 0) + sourceCargo).toFixed(2));
                }
                
                // Always recalculate vgm_weight dynamically based on tare and cargo
                const currentTare = parseFloat(groups[cNo].tare_wt || groups[cNo].tare_weight || 0);
                groups[cNo].vgm_weight = parseFloat(((groups[cNo].cargo_wt || 0) + currentTare).toFixed(2));
              });
              val = Object.values(groups).map((c, i) => ({ ...c, sr_no: i + 1 }));
            }
          } catch (_e) { /* keep original val */ }
        }
        return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
      });
      
      const result = await query(
        `UPDATE ${tableName} SET ${updateClause}, updated_at = CURRENT_TIMESTAMP WHERE export_invoice_id = $${updateFields.length + 1} AND company_id = $${updateFields.length + 2} RETURNING id`,
        [...updateValues, exportInvoiceId, companyId]
      );
      
      syncLog.syncedDocuments.push({ targetStage, recordsUpdated: result.rows.length });
    }

    return { status: 200, syncLog };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
};

function getTableName(stage) {
  const s = String(stage).toLowerCase();
  const tableMap = {
    'proforma_invoice': 'proforma_invoices',
    'proformainvoice': 'proforma_invoices',
    'export_invoice': 'export_invoices',
    'exportinvoice': 'export_invoices',
    'packing_list': 'packing_lists',
    'packinglist': 'packing_lists',
    'vgm': 'vgm_documents',
    'vgm_documents': 'vgm_documents',
    'vgmdocument': 'vgm_documents',
    'shipping': 'shipping_instructions',
    'shipping_instruction': 'shipping_instructions',
    'shippinginstruction': 'shipping_instructions',
    'annexure': 'export_invoice_annexures',
    'export_invoice_annexure': 'export_invoice_annexures',
    'annexuredocument': 'export_invoice_annexures',
    'backside': 'invoice_backside',
    'invoice_backside': 'invoice_backside',
    'invoicebackside': 'invoice_backside',
    'billoflading': 'bill_of_lading',
    'igst': 'igst_invoices',
    'igst_invoice': 'igst_invoices',
    'igstinvoice': 'igst_invoices',
    'igst_invoices': 'igst_invoices'
  };
  return tableMap[s] || s;
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Get workflow completion summary
 */
export const getWorkflowCompletionSummary = async (exportInvoiceId, companyId, db) => {
  if (!db) throw new Error('Database context (db) is required for getWorkflowCompletionSummary');
  const query = db.query.bind(db);
  
  try {
    const result = await query(
      `SELECT 
        ei.id as export_invoice_id, ei.invoice_no, ei.status as export_invoice_status,
        CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as has_packing_list,
        CASE WHEN eia.id IS NOT NULL THEN true ELSE false END as has_annexure,
        CASE WHEN ib.id IS NOT NULL THEN true ELSE false END as has_backside,
        CASE WHEN vgm.id IS NOT NULL THEN true ELSE false END as has_vgm,
        CASE WHEN si.id IS NOT NULL THEN true ELSE false END as has_shipping_instructions,
        COUNT(DISTINCT pl.id) as packing_lists_count,
        COUNT(DISTINCT vgm.id) as vgm_documents_count,
        COUNT(DISTINCT si.id) as shipping_instructions_count
       FROM export_invoices ei
       LEFT JOIN packing_lists pl ON ei.id = pl.export_invoice_id
       LEFT JOIN export_invoice_annexures eia ON ei.id = eia.export_invoice_id
       LEFT JOIN invoice_backside ib ON ei.id = ib.export_invoice_id
       LEFT JOIN vgm_documents vgm ON ei.id = vgm.export_invoice_id
       LEFT JOIN shipping_instructions si ON ei.id = si.export_invoice_id
       WHERE ei.id = $1 AND ei.company_id = $2
       GROUP BY ei.id, ei.invoice_no, ei.status, pl.id, eia.id, ib.id, vgm.id, si.id`,
      [exportInvoiceId, companyId]
    );

    if (result.rows.length === 0) return { error: 'Export invoice not found', status: 404 };

    const summary = result.rows[0];
    const completionPercentage = Math.round(((summary.has_packing_list ? 1 : 0) + (summary.has_annexure ? 1 : 0) + (summary.has_backside ? 1 : 0) + (summary.has_vgm ? 1 : 0) + (summary.has_shipping_instructions ? 1 : 0)) / 5 * 100);

    return {
      status: 200,
      data: {
        ...summary, completionPercentage,
        nextStages: {
          packingList: !summary.has_packing_list ? 'PENDING' : 'COMPLETE',
          annexure: !summary.has_annexure ? 'PENDING' : 'COMPLETE',
          backside: !summary.has_backside ? 'PENDING' : 'COMPLETE',
          vgm: !summary.has_vgm ? 'PENDING' : 'COMPLETE',
          shippingInstructions: !summary.has_shipping_instructions ? 'PENDING' : 'COMPLETE'
        }
      }
    };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
};

export default {
  getCompleteWorkflowData,
  getExportInvoiceWorkflow,
  getDataForNextStage,
  syncUpdatesAcrossStages,
  getWorkflowCompletionSummary
};
