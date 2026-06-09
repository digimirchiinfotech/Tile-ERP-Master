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

import { validateUUID } from '../utils/validators.js';

export const TABLE_MAP = {
  PI: 'proforma_invoices',
  PROFORMA_INVOICE: 'proforma_invoices',
  PO: 'proforma_orders',
  PROFORMA_ORDER: 'proforma_orders',
  EXPORT_INVOICE: 'export_invoices',
  PACKING_LIST: 'packing_lists',
  ANNEXURE: 'export_invoice_annexures',
  VGM: 'vgm_documents',
  SHIPPING_INSTRUCTION: 'shipping_instructions',
  INVOICE_BACKSIDE: 'invoice_backside',
  IGST_INVOICE: 'igst_invoices',
  QC: 'qc_records'
};

/**
 * Compile a comprehensive historical snapshot for any document type.
 * Freezes company details, client details, bank details, product lines (enriched),
 * taxes, totals, shipping, packing, qc, signatures, terms, and calculations.
 */
export async function createSnapshot(db, documentType, documentId, companyId, userId) {
  const tableName = TABLE_MAP[documentType];
  if (!tableName) throw new Error(`Invalid document type: ${documentType}`);

  // Fetch the document row
  let docQuery = `SELECT * FROM ${tableName} WHERE id = $1`;
  let queryParams = [documentId];
  if (companyId) {
    docQuery += ` AND company_id = $2`;
    queryParams.push(companyId);
  } else {
    docQuery += ` AND company_id IS NULL`;
  }

  const docResult = await db.query(docQuery, queryParams);
  if (docResult.rows.length === 0) {
    throw new Error(`Document not found: ${documentType} with ID ${documentId}`);
  }
  const doc = docResult.rows[0];

  // Initialize snapshot components
  let companyDetails = {};
  let bankDetails = {};
  let clientDetails = {};
  let productLines = [];
  let taxes = {};
  let totals = {};
  let shippingDetails = {};
  let packingDetails = {};
  let qcDetails = {};
  let termsConditions = {};
  let calculations = {};

  // 1. Fetch Company & Bank Details from global database
  const effectiveCompanyId = doc.company_id || companyId;
  if (effectiveCompanyId && validateUUID(effectiveCompanyId).isValid) {
    try {
      const companyRes = await db.globalQuery(
        `SELECT *, settings FROM companies WHERE id = $1`,
        [effectiveCompanyId]
      );
      if (companyRes.rows.length > 0) {
        const company = companyRes.rows[0];
        companyDetails = {
          id: company.id,
          name: company.name,
          address: company.address,
          city: company.city,
          state: company.state,
          country: company.country,
          iec_no: company.iec_no,
          gstn: company.gstn,
          pan: company.pan,
          logo_url: company.logo_url,
          contact_number: company.contact_number,
          contact_person_name: company.contact_person_name,
          email_id: company.email_id,
          website: company.website,
          industry: company.industry,
          range_name: company.range_name || (company.settings && company.settings.range_name) || '',
          division: company.division || (company.settings && company.settings.division) || '',
          commissionerate: company.commissionerate || (company.settings && company.settings.commissionerate) || '',
        };

        const settings = company.settings || {};
        const bank = settings.bank_details || {};
        bankDetails = {
          bank_name: company.bank_name || bank.bank_name || bank.bankName || '',
          account_name: company.account_holder_name || bank.account_name || bank.accountName || company.name || '',
          account_no: company.account_number || bank.account_no || bank.accountNumber || '',
          swift_code: company.swift_code || bank.swift_code || bank.swiftCode || '',
          bank_address: company.bank_address || company.branch_name || bank.bank_address || bank.bankAddress || ''
        };
      }
    } catch (err) {
      console.error(`[SNAPSHOT] Failed to fetch company details:`, err.message);
    }
  }

  // 2. Fetch Client Details
  const clientId = doc.client_id || doc.clientId;
  if (clientId && validateUUID(clientId).isValid) {
    try {
      const clientRes = await db.query(
        `SELECT * FROM clients WHERE id = $1`,
        [clientId]
      );
      if (clientRes.rows.length > 0) {
        const client = clientRes.rows[0];
        clientDetails = {
          id: client.id,
          client_id: client.client_id,
          name: client.name,
          client_name: client.client_name,
          email: client.email,
          email_id: client.email_id,
          contact_person_name: client.contact_person_name,
          contact_number: client.contact_number,
          address: client.address,
          city: client.city,
          country: client.country,
          consignee_details: client.consignee_details,
          buyer_details: client.buyer_details,
          currency: client.currency
        };
      }
    } catch (err) {
      console.error(`[SNAPSHOT] Failed to fetch client details:`, err.message);
    }
  } else {
    // Fallback: Populate from document flat fields
    clientDetails = {
      client_name: doc.client_name || doc.clientName || '',
      country: doc.country || '',
      consignee_details: doc.consignee_details || doc.consignee || '',
      buyer_details: doc.buyer_details || doc.buyer || ''
    };
  }

  // 3. Fetch Product Lines
  // Some tables use a relational lines table, some store as JSON. Let's do both.
  if (documentType === 'PI') {
    try {
      const linesRes = await db.query(
        `SELECT * FROM proforma_invoice_lines WHERE proforma_invoice_id = $1`,
        [documentId]
      );
      if (linesRes.rows.length > 0) {
        productLines = linesRes.rows;
      }
    } catch (err) {
      console.error(`[SNAPSHOT] Failed to fetch PI lines:`, err.message);
    }
  } else if (documentType === 'PO') {
    try {
      const linesRes = await db.query(
        `SELECT * FROM proforma_order_lines WHERE proforma_order_id = $1`,
        [documentId]
      );
      if (linesRes.rows.length > 0) {
        productLines = linesRes.rows;
      }
    } catch (err) {
      // ignore
    }
  } else if (documentType === 'EXPORT_INVOICE') {
    try {
      const linesRes = await db.query(
        `SELECT * FROM export_invoice_lines WHERE export_invoice_id = $1`,
        [documentId]
      );
      if (linesRes.rows.length > 0) {
        productLines = linesRes.rows;
      }
    } catch (err) {
      // ignore
    }
  }

  // If productLines is empty, fallback to the document's `product_lines` column
  if ((!productLines || productLines.length === 0) && doc.product_lines) {
    if (typeof doc.product_lines === 'string') {
      try { productLines = JSON.parse(doc.product_lines); } catch (e) { productLines = []; }
    } else if (Array.isArray(doc.product_lines)) {
      productLines = doc.product_lines;
    }
  }

  // Enrich product lines with master products details at this exact moment
  if (Array.isArray(productLines) && productLines.length > 0) {
    try {
      const productIds = productLines
        .map(l => l.product_id || l.productId)
        .filter(id => id && validateUUID(id).isValid);
      
      if (productIds.length > 0) {
        const productRes = await db.query(
          `SELECT id, name, description, size, surface, thickness, category, company_product_name, factory_product_name, hsn_code FROM products WHERE id = ANY($1)`,
          [productIds]
        );
        const productMap = {};
        productRes.rows.forEach(p => { productMap[p.id] = p; });

        productLines = productLines.map(line => {
          const pid = line.product_id || line.productId;
          const master = productMap[pid];
          if (master) {
            return {
              ...line,
              hsn_code: line.hsn_code || master.hsn_code || '',
              product_name: line.product_name || line.productName || master.name || '',
              description: line.description || master.description || '',
              size: line.size || master.size || '',
              surface: line.surface || master.surface || '',
              thickness: line.thickness || master.thickness || '',
              category: line.category || master.category || ''
            };
          }
          return line;
        });
      }
    } catch (err) {
      console.error(`[SNAPSHOT] Failed to enrich product lines:`, err.message);
    }
  }

  // 4. Map Totals
  totals = {
    subtotal: parseFloat(doc.subtotal || 0),
    discount: parseFloat(doc.discount || 0),
    tax: parseFloat(doc.tax || doc.tax_amount || doc.igst_amount || doc.cgst_amount || doc.sgst_amount || 0),
    total_amount: parseFloat(doc.total_amount || doc.totalAmount || 0),
    total_sqm: parseFloat(doc.total_sqm || doc.totalSqm || 0),
    total_pallets: parseFloat(doc.pallets || doc.total_pallets || doc.totalPallets || 0),
    net_weight: parseFloat(doc.net_weight || doc.netWeight || 0),
    gross_weight: parseFloat(doc.gross_weight || doc.grossWeight || 0),
    total_boxes: parseInt(doc.total_boxes || doc.totalBoxes || 0)
  };

  // 5. Map Taxes
  taxes = {
    tax_rate: parseFloat(doc.tax_rate || doc.igst_rate || 0),
    tax_amount: parseFloat(doc.tax || doc.tax_amount || doc.igst_amount || 0),
    cgst_rate: parseFloat(doc.cgst_rate || 0),
    cgst_amount: parseFloat(doc.cgst_amount || 0),
    sgst_rate: parseFloat(doc.sgst_rate || 0),
    sgst_amount: parseFloat(doc.sgst_amount || 0),
    gstn: doc.gstn || companyDetails.gstn || '',
    lut_arn_no: doc.lut_bond_ref || doc.lut_arn_no || companyDetails.lut_arn_no || '',
    lut_date: doc.lut_date || companyDetails.lut_date || null
  };

  // 6. Map Shipping Details
  shippingDetails = {
    port_of_loading: doc.port_of_loading || '',
    port_of_discharge: doc.port_of_discharge || '',
    final_destination: doc.final_destination || '',
    pre_carriage_by: doc.pre_carriage_by || '',
    place_of_receipt: doc.place_of_receipt || '',
    vessel_flight_no: doc.vessel_flight_no || doc.vessel_name || '',
    booking_no: doc.booking_no || doc.booking_number || '',
    bl_no: doc.bl_no || '',
    bl_date: doc.bl_date || null,
    shipping_bill_no: doc.shipping_bill_no || doc.sb_no || '',
    shipping_bill_date: doc.shipping_bill_date || doc.sb_date || null,
    buyers_order_no: doc.buyers_order_no || '',
    buyers_order_date: doc.buyers_order_date || null,
    container_details: doc.container_details ? (typeof doc.container_details === 'string' ? JSON.parse(doc.container_details) : doc.container_details) : []
  };

  // 7. Map Packing Details
  packingDetails = {
    pallet_type: doc.pallet_type || '',
    box_type: doc.box_type || '',
    tiles_back: doc.tiles_back || '',
    boxes_marking: doc.boxes_marking || '',
    fumigation: doc.fumigation || '',
    legalisation: doc.legalisation || '',
    other_instructions: doc.other_instructions || '',
    net_weight: parseFloat(doc.net_weight || doc.netWeight || 0),
    gross_weight: parseFloat(doc.gross_weight || doc.grossWeight || 0),
    total_pallets: parseFloat(doc.pallets || doc.total_pallets || doc.totalPallets || 0)
  };

  // 8. Map QC Details (if QC Document)
  if (documentType === 'QC') {
    qcDetails = {
      inspector_id: doc.inspector_id,
      inspector_name: doc.inspector_name,
      inspection_date: doc.inspection_date,
      passed_boxes: doc.passed_boxes,
      failed_boxes: doc.failed_boxes,
      defect_details: doc.defect_details ? (typeof doc.defect_details === 'string' ? JSON.parse(doc.defect_details) : doc.defect_details) : {},
      qc_status: doc.status || doc.qc_status || ''
    };
  }

  // 9. Terms and Conditions
  termsConditions = {
    payment_terms: doc.payment_terms || '',
    delivery_terms: doc.delivery_terms || '',
    notes: doc.notes || '',
    validity_days: parseInt(doc.validity_days || 0)
  };

  // 10. Calculations
  calculations = {
    currency: doc.currency || 'USD',
    exchange_rate: parseFloat(doc.exchange_rate || 1),
    subtotal: parseFloat(doc.subtotal || 0),
    discount: parseFloat(doc.discount || 0),
    tax: parseFloat(doc.tax || doc.tax_amount || doc.igst_amount || 0),
    total_amount: parseFloat(doc.total_amount || doc.totalAmount || 0)
  };

  // Build the complete snapshot structure
  const snapshot = {
    company_details: companyDetails,
    client_details: clientDetails,
    bank_details: bankDetails,
    product_lines: productLines,
    taxes: taxes,
    totals: totals,
    shipping_details: shippingDetails,
    packing_details: packingDetails,
    qc_details: qcDetails,
    signatures: doc.signatures ? (typeof doc.signatures === 'string' ? JSON.parse(doc.signatures) : doc.signatures) : {},
    terms_conditions: termsConditions,
    calculations: calculations,
    original_document_metadata: {
      document_type: documentType,
      document_id: documentId,
      document_no: doc.invoice_no || doc.order_no || doc.packing_list_no || doc.annexure_no || doc.vgm_no || doc.si_no || doc.backside_no || doc.qc_no || '',
      created_at: doc.created_at,
      created_by: doc.created_by,
      frozen_at: new Date().toISOString()
    }
  };

  return snapshot;
}

/**
 * Retrieve locked snapshot.
 */
export async function getLockedSnapshot(db, documentType, documentId, companyId) {
  const tableName = TABLE_MAP[documentType];
  if (!tableName) throw new Error(`Invalid document type: ${documentType}`);

  let query = `SELECT snapshot_data, is_locked FROM ${tableName} WHERE id = $1`;
  let params = [documentId];
  if (companyId) {
    query += ` AND company_id = $2`;
    params.push(companyId);
  } else {
    query += ` AND company_id IS NULL`;
  }

  const result = await db.query(query, params);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  if (row.is_locked && row.snapshot_data) {
    return typeof row.snapshot_data === 'string' ? JSON.parse(row.snapshot_data) : row.snapshot_data;
  }
  return null;
}

/**
 * Take a queried live record, check if it's locked, and enrich/merge the snapshot
 * details over the live database row so it behaves as an absolute historical freeze.
 */
export function enrichWithSnapshot(doc, documentType) {
  if (!doc || !doc.is_locked || !doc.snapshot_data) {
    return doc;
  }

  const snapshot = typeof doc.snapshot_data === 'string' ? JSON.parse(doc.snapshot_data) : doc.snapshot_data;

  // Support both old and new formats of snapshots dynamically
  const rawCompany = snapshot.company_details || snapshot.company_info || {};
  const rawBank = snapshot.bank_details || rawCompany.bank_details || {};
  const rawClient = snapshot.client_details || snapshot.client_info || {};

  const companyInfo = (snapshot.company_details || snapshot.company_info) ? {
    ...rawCompany,
    bank_details: {
      bank_name: rawBank.bank_name || rawBank.bankName || rawCompany.bank_name || rawCompany.bankName || '',
      account_name: rawBank.account_name || rawBank.accountName || rawBank.account_holder_name || rawBank.accountHolderName || rawCompany.account_holder_name || rawCompany.accountHolderName || rawCompany.account_name || rawCompany.accountName || rawCompany.name || '',
      account_no: rawBank.account_no || rawBank.accountNo || rawBank.account_number || rawBank.accountNumber || rawCompany.account_number || rawCompany.accountNumber || rawCompany.account_no || rawCompany.accountNo || '',
      swift_code: rawBank.swift_code || rawBank.swiftCode || rawBank.swift || rawCompany.swift_code || rawCompany.swiftCode || rawCompany.swift || '',
      bank_address: rawBank.bank_address || rawBank.bankAddress || rawCompany.bank_address || rawCompany.bankAddress || rawCompany.branch_name || rawCompany.branchName || ''
    },
    // Add flat fields on company_info directly for older or legacy UI components
    bankName: rawBank.bank_name || rawBank.bankName || rawCompany.bank_name || rawCompany.bankName || '',
    accountHolderName: rawBank.account_name || rawBank.accountName || rawBank.account_holder_name || rawBank.accountHolderName || rawCompany.account_holder_name || rawCompany.accountHolderName || rawCompany.account_name || rawCompany.accountName || rawCompany.name || '',
    accountNumber: rawBank.account_no || rawBank.accountNo || rawBank.account_number || rawBank.accountNumber || rawCompany.account_number || rawCompany.accountNumber || rawCompany.account_no || rawCompany.accountNo || '',
    swiftCode: rawBank.swift_code || rawBank.swiftCode || rawBank.swift || rawCompany.swift_code || rawCompany.swiftCode || rawCompany.swift || '',
    bankAddress: rawBank.bank_address || rawBank.bankAddress || rawCompany.bank_address || rawCompany.bankAddress || rawCompany.branch_name || rawCompany.branchName || ''
  } : null;

  // Create a base merged object
  const merged = {
    ...doc,
    company_info: companyInfo || doc.company_info,
    // Fallback company properties that might be on the root of some documents
    company_name: rawCompany.name || rawCompany.company_name || doc.company_name,
    company_address: rawCompany.address || rawCompany.company_address || doc.company_address,
    iec_no: rawCompany.iec_no || rawCompany.iecNo || doc.iec_no,
    gstn: rawCompany.gstn || rawCompany.gstin || doc.gstn,
    pan: rawCompany.pan || doc.pan,

    // Client/Buyer details
    client_name: rawClient.client_name || rawClient.name || doc.client_name,
    consignee_details: rawClient.consignee_details || rawClient.consignee || doc.consignee_details || doc.consignee,
    buyer_details: rawClient.buyer_details || rawClient.buyer || doc.buyer_details || doc.buyer,

    // Product lines
    product_lines: snapshot.product_lines || doc.product_lines || [],

    // Totals
    subtotal: snapshot.calculations?.subtotal ?? doc.subtotal,
    discount: snapshot.calculations?.discount ?? doc.discount,
    tax: snapshot.calculations?.tax ?? doc.tax ?? doc.tax_amount,
    total_amount: snapshot.calculations?.total_amount ?? doc.total_amount ?? doc.totalAmount,
    total_sqm: snapshot.totals?.total_sqm ?? doc.total_sqm ?? doc.totalSqm,
    pallets: snapshot.totals?.total_pallets ?? doc.pallets ?? doc.total_pallets,
    net_weight: snapshot.totals?.net_weight ?? doc.net_weight ?? doc.netWeight,
    gross_weight: snapshot.totals?.gross_weight ?? doc.gross_weight ?? doc.grossWeight,
    total_boxes: snapshot.totals?.total_boxes ?? doc.total_boxes ?? doc.totalBoxes,

    // Shipping
    port_of_loading: snapshot.shipping_details?.port_of_loading ?? doc.port_of_loading,
    port_of_discharge: snapshot.shipping_details?.port_of_discharge ?? doc.port_of_discharge,
    final_destination: snapshot.shipping_details?.final_destination ?? doc.final_destination,
    pre_carriage_by: snapshot.shipping_details?.pre_carriage_by ?? doc.pre_carriage_by,
    place_of_receipt: snapshot.shipping_details?.place_of_receipt ?? doc.place_of_receipt,
    vessel_flight_no: snapshot.shipping_details?.vessel_flight_no ?? doc.vessel_flight_no ?? doc.vessel_name,
    vessel_name: snapshot.shipping_details?.vessel_flight_no ?? doc.vessel_flight_no ?? doc.vessel_name,
    booking_no: snapshot.shipping_details?.booking_no ?? doc.booking_no ?? doc.booking_number,
    booking_number: snapshot.shipping_details?.booking_no ?? doc.booking_no ?? doc.booking_number,
    bl_no: snapshot.shipping_details?.bl_no ?? doc.bl_no,
    bl_date: snapshot.shipping_details?.bl_date ?? doc.bl_date,
    shipping_bill_no: snapshot.shipping_details?.shipping_bill_no ?? doc.shipping_bill_no ?? doc.sb_no,
    shipping_bill_date: snapshot.shipping_details?.shipping_bill_date ?? doc.shipping_bill_date ?? doc.sb_date,
    sb_no: snapshot.shipping_details?.shipping_bill_no ?? doc.shipping_bill_no ?? doc.sb_no,
    sb_date: snapshot.shipping_details?.shipping_bill_date ?? doc.shipping_bill_date ?? doc.sb_date,
    buyers_order_no: snapshot.shipping_details?.buyers_order_no ?? doc.buyers_order_no,
    buyers_order_date: snapshot.shipping_details?.buyers_order_date ?? doc.buyers_order_date,

    // Packing
    pallet_type: snapshot.packing_details?.pallet_type ?? doc.pallet_type,
    box_type: snapshot.packing_details?.box_type ?? doc.box_type,
    tiles_back: snapshot.packing_details?.tiles_back ?? doc.tiles_back,
    boxes_marking: snapshot.packing_details?.boxes_marking ?? doc.boxes_marking,
    fumigation: snapshot.packing_details?.fumigation ?? doc.fumigation,
    legalisation: snapshot.packing_details?.legalisation ?? doc.legalisation,
    other_instructions: snapshot.packing_details?.other_instructions ?? doc.other_instructions,

    // Terms
    payment_terms: snapshot.terms_conditions?.payment_terms ?? doc.payment_terms,
    delivery_terms: snapshot.terms_conditions?.delivery_terms ?? doc.delivery_terms,

    // QC (for QC doc type specifically)
    ...(documentType === 'QC' ? {
      inspector_id: snapshot.qc_details?.inspector_id ?? doc.inspector_id,
      inspector_name: snapshot.qc_details?.inspector_name ?? doc.inspector_name,
      inspection_date: snapshot.qc_details?.inspection_date ?? doc.inspection_date,
      passed_boxes: snapshot.qc_details?.passed_boxes ?? doc.passed_boxes,
      failed_boxes: snapshot.qc_details?.failed_boxes ?? doc.failed_boxes,
      defect_details: snapshot.qc_details?.defect_details ?? doc.defect_details,
      status: snapshot.qc_details?.qc_status ?? doc.status
    } : {})
  };

  return merged;
}
