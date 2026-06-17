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
import { generateDocumentNumber, previewDocumentNumber } from '../utils/documentNumberGenerator.js';

// Number to Words converter helper
function amountToWords(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return '';
  const num = Math.floor(amount);
  const paise = Math.round((amount - num) * 100);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const units = ['', 'Thousand', 'Lakh', 'Crore'];

  function convertWords(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertWords(n % 100) : '');
  }

  function getIndianWords(n) {
    if (n === 0) return 'Zero';
    let wordStr = '';
    let unitIdx = 0;
    
    // Process thousand (3 digits)
    let temp = n % 1000;
    if (temp > 0) {
      wordStr = convertWords(temp) + ' ';
    }
    n = Math.floor(n / 1000);
    unitIdx = 1;

    // Process Lakhs, Crores (2 digits group in India)
    while (n > 0) {
      let divisor = unitIdx === 3 ? 10000000 : 100; // Handle larger numbers if crores exceed 100
      let segment = n % divisor;
      if (segment > 0) {
        wordStr = convertWords(segment) + ' ' + units[unitIdx] + ' ' + wordStr;
      }
      n = Math.floor(n / divisor);
      unitIdx++;
      if (unitIdx > 3) unitIdx = 3; // cap at crore
    }

    return wordStr.trim();
  }

  let finalWords = 'INR ' + getIndianWords(num);
  if (paise > 0) {
    finalWords += ' and ' + convertWords(paise) + ' Paise';
  }
  finalWords += ' Only';
  return finalWords;
}

// Schema enforcement moved to strict database migrations (20260518_schema_hardening_and_rls.sql)

let ensuredSchemas = new Set();

const ensureSchemaExists = async (queryFn, companyId) => {
  const cacheKey = companyId || 'global';
  if (ensuredSchemas.has(cacheKey)) return;
  try {
    const columns = [
      { name: 'delivery_terms', type: 'TEXT' },
      { name: 'payment_terms', type: 'TEXT' },
      { name: 'other_instructions', type: 'TEXT' },
      { name: 'supply_declaration', type: 'TEXT' },
      { name: 'ftp_incentive_declaration', type: 'TEXT' },
      { name: 'buyer_details', type: 'TEXT' },
      { name: 'consignee_details', type: 'TEXT' },
      { name: 'port_of_loading', type: 'TEXT' },
      { name: 'port_of_discharge', type: 'TEXT' },
      { name: 'vessel_flight_no', type: 'TEXT' },
      { name: 'pre_carriage_by', type: 'TEXT' },
      { name: 'place_of_receipt', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'final_destination', type: 'TEXT' }
    ];

    for (const col of columns) {
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'igst_invoices' 
          AND column_name = $1
        );
      `;
      const { rows } = await queryFn(checkQuery, [col.name]);
      if (!rows[0].exists) {
        await queryFn(`ALTER TABLE igst_invoices ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      }
    }
  } catch (err) {
    debugLogger.error('[IGST Schema Self-Healing] Error ensuring schema columns exist:', err.message);
  }
};

/**
 * Fetch IGST Invoice by Export Invoice ID or generate fallback inheritance data
 */
export const getByExportInvoiceId = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);
    const { exportInvoiceId } = req.params;
    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const companyId = req.companyFilter || req.user?.companyId;

    // 1. Get existing IGST Invoice if any
    const existingRes = await req.db.query(
      `SELECT * FROM igst_invoices 
       WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [exportInvoiceId, companyId]
    );

    const igstInvoice = existingRes.rows.length > 0 ? existingRes.rows[0] : null;

    // 2. Fetch data from the linked Export Invoice + related docs (packing list, annexure)
    const fallbackSql = `
      SELECT 
        ei.invoice_no as ei_invoice_no,
        ei.invoice_date as ei_invoice_date,
        ei.vessel_flight_no as ei_vessel,
        ei.booking_no as ei_booking_no,
        ei.port_of_loading as ei_port_of_loading,
        ei.port_of_discharge as ei_port_of_discharge,
        ei.final_destination as ei_final_destination,
        ei.pre_carriage_by as ei_pre_carriage,
        ei.place_of_receipt as ei_place_of_receipt,
        ei.shipping_bill_no as ei_sb_no,
        ei.shipping_bill_date as ei_sb_date,
        ei.box_type as ei_box_type,
        ei.pallet_type as ei_pallet_type,
        ei.tiles_back as ei_tiles_back,
        ei.boxes_marking as ei_boxes_marking,
        ei.fumigation as ei_fumigation,
        ei.legalisation as ei_legalisation,
        ei.consignee_details as ei_consignee_details,
        ei.buyer_details as ei_buyer_details,
        ei.product_lines as ei_product_lines,
        ei.pallets as ei_pallets,
        ei.total_sqm as ei_total_sqm,
        ei.net_weight as ei_net_weight,
        ei.gross_weight as ei_gross_weight,
        cl.client_name as client_name,
        ei.country_of_origin as country_of_origin,
        pl.packing_list_no as pl_no,
        an.annexure_no as annexure_no,
        ei.currency as ei_currency,
        ei.exchange_rate as ei_exchange_rate,
        ei.lut_bond_ref as ei_lut_bond_ref,
        ei.lut_date as ei_lut_date,
        pi.invoice_no as pi_no,
        ei.tariff_code as ei_tariff_code,
        ei.buyers_order_no as ei_buyers_order_no,
        ei.buyers_order_date as ei_buyers_order_date,
        ei.payment_terms as ei_payment_terms,
        ei.other_instructions as ei_other_instructions,
        ei.delivery_terms as ei_delivery_terms,
        ei.supply_declaration as supply_declaration,
        ei.ftp_incentive_declaration as ftp_incentive_declaration
      FROM export_invoices ei
      LEFT JOIN clients cl ON ei.client_id = cl.id AND cl.company_id = ei.company_id
      LEFT JOIN packing_lists pl ON ei.id = pl.export_invoice_id AND pl.company_id = ei.company_id AND pl.deleted_at IS NULL
      LEFT JOIN export_invoice_annexures an ON ei.id = an.export_invoice_id AND an.company_id = ei.company_id AND an.deleted_at IS NULL
      LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id
      WHERE ei.id = $1 AND ei.company_id = $2
      ORDER BY pl.created_at DESC, an.created_at DESC
      LIMIT 1
    `;
    
    const fallbackRes = await req.db.query(fallbackSql, [exportInvoiceId, companyId]);
    if (fallbackRes.rows.length === 0) {
      return next(new AppError('Linked Export Invoice not found.', 404));
    }
    const row = fallbackRes.rows[0];

    // 3. Fetch current company settings & details from master DB
    let companyInfo = {};
    if (companyId && req.db?.globalQuery) {
      try {
        const compRes = await req.db.globalQuery(
          'SELECT * FROM companies WHERE id = $1',
          [companyId]
        );
        if (compRes.rows.length > 0) {
          const c = compRes.rows[0];
          const settings = c.settings || {};
          companyInfo = {
            ...c,
            exporter_name: c.name,
            exporter_address: c.address,
            gstin: c.gstn,
            iec_no: c.iec_no,
            lut_bond_ref: c.lut_arn_no || settings.lut_arn_no || settings.lut_no || '',
            lut_date: c.lut_date || settings.lut_date || null,
            bank_details: {
              bank_name: c.bank_name || settings.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
              account_name: c.account_holder_name || settings.account_name || (settings.bank_details && settings.bank_details.account_name) || '',
              account_no: c.account_number || settings.account_no || (settings.bank_details && settings.bank_details.account_no) || '',
              swift_code: c.swift_code || settings.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
              bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
            }
          };
        }
      } catch (err) {
        debugLogger.error('Error fetching company info for IGST Invoice:', err.message);
      }
    }

    // 4. Generate next number if creating a new one
    let nextIgstNo = '';
    if (!igstInvoice) {
      try {
        const preview = await previewDocumentNumber('IGST', companyId, req.db);
        nextIgstNo = preview.displayNumber;
      } catch (e) {
        debugLogger.error('Failed to preview next IGST number:', e.message);
        nextIgstNo = `IGST/${row.ei_invoice_no}`;
      }
    }

    // 5. Build/Inherit product lines list
    // Make sure we carry Box Quantity, PCS, SQM, Rate, Taxable Amount, IGST %, IGST Amount, and Total Amount
    let productLines = [];
    const exchangeRate = parseFloat(row.ei_exchange_rate || 87.35274);
    const isUSD = (row.ei_currency || '').toUpperCase() === 'USD';

    if (igstInvoice) {
      const rawLines = row.ei_product_lines || [];
      const eiLines = Array.isArray(typeof rawLines === 'string' ? JSON.parse(rawLines) : rawLines) ? (typeof rawLines === 'string' ? JSON.parse(rawLines) : rawLines) : [];

      productLines = (igstInvoice.product_lines || []).map((l, index) => {
        const sqm = parseFloat(l.sqm || 0);
        const pcs = parseInt(l.pcs || l.box_quantity || 0);
        const rate = parseFloat(l.rate || 0);
        const usdRate = parseFloat(l.usd_rate || l.usdRate || (isUSD ? (rate / exchangeRate) : 0));
        
        let isFoc = l.is_foc || l.isFoc || false;
        if (!isFoc && eiLines[index]) {
          isFoc = eiLines[index].is_foc || eiLines[index].isFoc || false;
        }

        return {
          ...l,
          is_foc: isFoc,
          usd_rate: usdRate,
          exchange_rate: parseFloat(l.exchange_rate || l.exchangeRate || exchangeRate)
        };
      });
    } else {
      const rawLines = row.ei_product_lines || [];
      const parsedLines = typeof rawLines === 'string' ? JSON.parse(rawLines) : rawLines;
      
      if (Array.isArray(parsedLines)) {
        productLines = parsedLines.map(l => {
          const sqm = parseFloat(l.sqm_auto || l.sqmAuto || l.total_sqm || l.totalSqm || l.sqm || 0);
          const pcs = parseInt(l.total_boxes || l.totalBoxes || l.boxes || l.pcs || 0);
          const rawRate = parseFloat(l.rate || l.unit_price || l.unitPrice || 0);
          
          const usdRate = isUSD ? rawRate : parseFloat(l.usd_rate || l.usdRate || (rawRate / exchangeRate));
          const rate = isUSD ? parseFloat((usdRate * exchangeRate).toFixed(2)) : rawRate;

          // Taxable Amount directly calculated using exact USD rate and Exchange Rate
          const taxableAmount = isUSD
            ? ((sqm > 0 ? sqm : pcs) * usdRate * exchangeRate)
            : (sqm > 0 ? (sqm * rate) : (pcs * rate));

          const igstPercent = 18.00; // default 18%
          const igstAmt = taxableAmount * (igstPercent / 100);
          const totalAmt = taxableAmount + igstAmt;

          const product = l.product || l.product_name || l.productName || l.name || '';
          const size = l.size || l.dimensions || '';
          const surface = l.surface || l.finish || '';
          
          let materialDescription = l.material_description || l.materialDescription || l.description || l.product_description || l.productDescription || '';
          if (!materialDescription && product) {
            materialDescription = `${product} ${size} ${surface}`.trim();
          }

          return {
            product_id: l.product_id || l.productId || null,
            product_name: product || materialDescription || '',
            material_description: materialDescription || product || '',
            is_foc: l.is_foc || l.isFoc || false,
            box_quantity: parseInt(l.total_boxes || l.totalBoxes || l.boxes || l.box_quantity || l.boxQuantity || 0),
            pcs: pcs,
            sqm: sqm,
            usd_rate: usdRate,
            exchange_rate: exchangeRate,
            rate: rate,
            taxable_amount: parseFloat(taxableAmount.toFixed(2)),
            igst_percentage: igstPercent,
        igst_rate: igstPercent,
            igst_amount: parseFloat(igstAmt.toFixed(2)),
            total_amount: parseFloat(totalAmt.toFixed(2))
          };
        });
      }
    }

    // 6. Assemble complete fallback/existing object
    const combinedData = igstInvoice ? {
      ...igstInvoice,
      pi_no: igstInvoice.pi_no || row.pi_no || '',
      tariff_code: igstInvoice.tariff_code || row.ei_tariff_code || '',
      buyers_order_no: igstInvoice.buyers_order_no || row.ei_buyers_order_no || '',
      buyers_order_date: igstInvoice.buyers_order_date || row.ei_buyers_order_date || null,
      country_of_origin: igstInvoice.country_of_origin || row.country_of_origin || 'INDIA',
      payment_terms: igstInvoice.payment_terms || row.ei_payment_terms || '',
      delivery_terms: igstInvoice.delivery_terms || row.ei_delivery_terms || '',
      other_instructions: igstInvoice.other_instructions || row.ei_other_instructions || '',
      supply_declaration: igstInvoice.supply_declaration || row.supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND',
      ftp_incentive_declaration: igstInvoice.ftp_incentive_declaration || row.ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"',
      product_lines: productLines,
      exchange_rate: parseFloat(igstInvoice.exchange_rate || igstInvoice.exchangeRate || row.ei_exchange_rate || 87.35274),
      currency: igstInvoice.currency || row.ei_currency || 'USD'
    } : {
      id: null,
      igst_invoice_no: nextIgstNo,
      date: new Date().toISOString().split('T')[0],
      export_invoice_id: exportInvoiceId,
      status: 'Draft',
      
      // Inherited GST fields
      gstin: companyInfo.gstin || '',
      iec_no: companyInfo.iec_no || '',
      lut_bond_ref: row.ei_lut_bond_ref || companyInfo.lut_bond_ref || '',
      lut_date: row.ei_lut_date || companyInfo.lut_date || null,
      exporter_name: companyInfo.exporter_name || '',
      exporter_address: companyInfo.exporter_address || '',
      pi_no: row.pi_no || '',
      tariff_code: row.ei_tariff_code || '',
      buyers_order_no: row.ei_buyers_order_no || '',
      buyers_order_date: row.ei_buyers_order_date || null,
      country_of_origin: row.country_of_origin || 'INDIA',
      payment_terms: row.ei_payment_terms || '',
      delivery_terms: row.ei_delivery_terms || '',
      other_instructions: row.ei_other_instructions || '',
      supply_declaration: row.supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND',
      ftp_incentive_declaration: row.ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"',
      
      // Buyer / Consignee details
      buyer_details: row.ei_buyer_details || '',
      consignee_details: row.ei_consignee_details || '',
      country: row.country_of_origin || 'INDIA',
      final_destination: row.ei_final_destination || '',
      
      // Shipping Details
      port_of_loading: row.ei_port_of_loading || 'MUNDRA PORT',
      port_of_discharge: row.ei_port_of_discharge || '',
      vessel_flight_no: row.ei_vessel || '',
      pre_carriage_by: row.ei_pre_carriage || '',
      place_of_receipt: row.ei_place_of_receipt || '',
      shipping_bill_no: row.ei_sb_no || '',
      shipping_bill_date: row.ei_sb_date || null,

      // Exchange Info
      exchange_rate: parseFloat(row.ei_exchange_rate || 87.35274),
      currency: row.ei_currency || 'USD',

      // Product list
      product_lines: productLines,

      // Packing details
      pallet_type: row.ei_pallet_type || '',
      tiles_back: row.ei_tiles_back || '',
      box_type: row.ei_box_type || '',
      boxes_marking: row.ei_boxes_marking || '',
      fumigation: row.ei_fumigation || '',
      legalisation: row.ei_legalisation || '',

      // Weight summary
      net_weight: parseFloat(row.ei_net_weight || 0),
      gross_weight: parseFloat(row.ei_gross_weight || 0),
      total_pallets: parseInt(row.ei_pallets || 0),
      total_quantity: parseFloat(row.ei_total_sqm || 0)
    };

    // Calculate totals dynamically for safety
    let totalBeforeTax = 0;
    let totalIgst = 0;
    let grandTotal = 0;
    let totalQty = 0;

    productLines.forEach(l => {
      totalBeforeTax += parseFloat(l.taxable_amount || 0);
      totalIgst += parseFloat(l.igst_amount || 0);
      grandTotal += parseFloat(l.total_amount || 0);
      totalQty += parseFloat(l.sqm || l.pcs || 0);
    });

    combinedData.total_before_tax = parseFloat(totalBeforeTax.toFixed(2));
    combinedData.taxable_amount = parseFloat(totalBeforeTax.toFixed(2));
    combinedData.total_igst = parseFloat(totalIgst.toFixed(2));
    combinedData.igst_amount = parseFloat(totalIgst.toFixed(2));
    combinedData.grand_total = parseFloat(grandTotal.toFixed(2));
    combinedData.total_amount_after_tax = parseFloat(grandTotal.toFixed(2));
    combinedData.amount_in_words = amountToWords(combinedData.grand_total);
    if (!combinedData.total_quantity || combinedData.total_quantity === 0) {
      combinedData.total_quantity = totalQty;
    }

    const response = {
      igst_invoice: combinedData,
      export_invoice: {
        id: exportInvoiceId,
        invoice_no: row.ei_invoice_no,
        invoice_date: row.ei_invoice_date
      },
      company_info: companyInfo
    };

    return successResponse(res, response, 'IGST Invoice details retrieved successfully');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in getByExportInvoiceId:`, error);
    next(error);
  }
};

/**
 * Create or Update IGST Invoice
 */
export const createOrUpdate = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);
    const { exportInvoiceId } = req.params;
    const body = req.body;

    const idValidation = validateUUID(exportInvoiceId, 'Export Invoice ID');
    if (!idValidation.isValid) return next(new AppError(idValidation.error, 400));

    const companyId = req.companyFilter || req.user?.companyId;
    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    // Check if an IGST Invoice already exists for this Export Invoice
    const existing = await req.db.query(
      `SELECT id, igst_invoice_no FROM igst_invoices 
       WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [exportInvoiceId, companyId]
    );

    let isUpdate = false;
    let targetId = null;
    let finalIgstNo = body.igst_invoice_no || body.igstInvoiceNo;

    if (existing.rows.length > 0) {
      isUpdate = true;
      targetId = existing.rows[0].id;
      finalIgstNo = existing.rows[0].igst_invoice_no;
    }

    // If new record, generate a fresh sequential document number atomically
    if (!isUpdate || !targetId) {
      const gen = await generateDocumentNumber('IGST', companyId, req.db);
      finalIgstNo = gen.displayNumber;

      // Uniqueness check for safety
      const dupCheck = await req.db.query(
        'SELECT id FROM igst_invoices WHERE igst_invoice_no = $1 AND company_id = $2 AND deleted_at IS NULL',
        [finalIgstNo, companyId]
      );
      if (dupCheck.rows.length > 0) {
        return next(new AppError(`Generated IGST Invoice No. ${finalIgstNo} already exists.`, 409));
      }
    }

    // Validate and enforce correct IGST dynamic calculations
    const productLines = body.product_lines || [];
    let totalBeforeTax = 0;
    let totalIgst = 0;
    let grandTotal = 0;
    let totalQty = 0;

    const parsedProductLines = productLines.map(l => {
      const sqm = parseFloat(l.sqm || 0);
      const pcs = parseInt(l.pcs || l.box_quantity || 0);
      const rate = parseFloat(l.rate || 0);
      
      const usdRate = parseFloat(l.usd_rate || l.usdRate || 0);
      const exchangeRate = parseFloat(l.exchange_rate || l.exchangeRate || body.exchange_rate || 87.35274);
      
      let taxableAmount = 0;
      if (usdRate > 0 && exchangeRate > 0) {
        taxableAmount = sqm > 0 ? (sqm * usdRate * exchangeRate) : (pcs * usdRate * exchangeRate);
      } else {
        taxableAmount = sqm > 0 ? (sqm * rate) : (pcs * rate);
      }

      const igstPercent = parseFloat(l.igst_percentage || l.igst_percent || l.igst_rate || 18.00);
      const igstAmt = taxableAmount * (igstPercent / 100);
      const totalAmt = taxableAmount + igstAmt;

      totalBeforeTax += taxableAmount;
      totalIgst += igstAmt;
      grandTotal += totalAmt;
      totalQty += sqm > 0 ? sqm : pcs;

      return {
        ...l,
        sqm,
        pcs,
        usd_rate: usdRate,
        exchange_rate: exchangeRate,
        rate,
        taxable_amount: parseFloat(taxableAmount.toFixed(2)),
        igst_rate: igstPercent,
        igst_amount: parseFloat(igstAmt.toFixed(2)),
        total_amount: parseFloat(totalAmt.toFixed(2))
      };
    });

    const calculatedBeforeTax = parseFloat(totalBeforeTax.toFixed(2));
    const calculatedIgst = parseFloat(totalIgst.toFixed(2));
    const calculatedGrandTotal = parseFloat(grandTotal.toFixed(2));
    const calculatedWords = amountToWords(calculatedGrandTotal);

    const fields = {
      igst_invoice_no: finalIgstNo,
      pi_no: body.pi_no || '',
      tariff_code: body.tariff_code || '',
      buyers_order_no: body.buyers_order_no || body.buyer_order_no || '',
      buyers_order_date: body.buyers_order_date || body.buyer_order_date || null,
      country_of_origin: body.country_of_origin || body.country || 'INDIA',
      payment_terms: body.payment_terms || '',
      delivery_terms: body.delivery_terms || body.deliveryTerms || '',
      other_instructions: body.other_instructions || '',
      date: body.date || new Date().toISOString().split('T')[0],
      status: body.status || 'Draft',
      gstin: body.gstin || '',
      iec_no: body.iec_no || '',
      lut_bond_ref: body.lut_bond_ref || '',
      lut_date: body.lut_date || null,
      exporter_name: body.exporter_name || '',
      exporter_address: body.exporter_address || '',
      supply_declaration: body.supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND',
      ftp_incentive_declaration: body.ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"',
      buyer_details: body.buyer_details || '',
      consignee_details: body.consignee_details || '',
      country: body.country || 'INDIA',
      final_destination: body.final_destination || '',
      port_of_loading: body.port_of_loading || 'MUNDRA PORT',
      port_of_discharge: body.port_of_discharge || '',
      vessel_flight_no: body.vessel_flight_no || '',
      pre_carriage_by: body.pre_carriage_by || '',
      place_of_receipt: body.place_of_receipt || '',
      shipping_bill_no: body.shipping_bill_no || '',
      shipping_bill_date: body.shipping_bill_date || null,
      product_lines: JSON.stringify(parsedProductLines),
      pallet_type: body.pallet_type || '',
      tiles_back: body.tiles_back || '',
      box_type: body.box_type || '',
      boxes_marking: body.boxes_marking || '',
      fumigation: body.fumigation || '',
      legalisation: body.legalisation || '',
      net_weight: parseFloat(body.net_weight || 0),
      gross_weight: parseFloat(body.gross_weight || 0),
      total_pallets: parseInt(body.total_pallets || 0),
      total_quantity: parseFloat(body.total_quantity || totalQty || 0),
      taxable_amount: calculatedBeforeTax,
      igst_rate: parsedProductLines.length > 0 ? parsedProductLines[0].igst_rate : 18.00,
      igst_amount: calculatedIgst,
      total_amount_after_tax: calculatedGrandTotal,
      total_before_tax: calculatedBeforeTax,
      total_igst: calculatedIgst,
      grand_total: calculatedGrandTotal,
      amount_in_words: calculatedWords,
      remarks: body.remarks || ''
    };

    let result;
    if (isUpdate && targetId) {
      // Perform Update
      const setClause = Object.keys(fields).map((k, i) => `${k} = $${i + 1}`).join(', ');
      const sql = `
        UPDATE igst_invoices 
        SET ${setClause}, updated_at = NOW(), deleted_at = NULL 
        WHERE id = $${Object.keys(fields).length + 1} AND company_id = $${Object.keys(fields).length + 2}
        RETURNING *
      `;
      result = await req.db.query(sql, [...Object.values(fields), targetId, companyId]);

      // Write Audit Log
      try {
        await req.db.query(
          `INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, changes)
           VALUES ($1, $2, 'Update', 'igst_invoice', $3, $4)`,
          [companyId, req.user?.id, targetId, JSON.stringify(fields)]
        );
      } catch (err) {}
    } else {
      // Perform Insert
      const columns = ['company_id', 'export_invoice_id', 'created_by', ...Object.keys(fields)].join(', ');
      const placeholders = ['company_id', 'export_invoice_id', 'created_by', ...Object.keys(fields)].map((_, i) => `$${i + 1}`).join(', ');
      const sql = `
        INSERT INTO igst_invoices (${columns}) 
        VALUES (${placeholders}) 
        RETURNING *
      `;
      result = await req.db.query(sql, [companyId, exportInvoiceId, req.user?.id, ...Object.values(fields)]);

      // Write Audit Log
      try {
        await req.db.query(
          `INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, changes)
           VALUES ($1, $2, 'Create', 'igst_invoice', $3, $4)`,
          [companyId, req.user?.id, result.rows[0].id, JSON.stringify(fields)]
        );
      } catch (err) {}
    }

    return successResponse(res, result.rows[0], 'IGST Invoice saved successfully');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in createOrUpdate:`, error);
    next(error);
  }
};

/**
 * Get all IGST Invoices for dashboard list
 */
export const getAll = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = 'i.deleted_at IS NULL';
    const queryParams = [];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND i.company_id IS NULL`;
      } else {
        whereConditions += ` AND i.company_id = $${queryParams.length + 1}`;
        queryParams.push(req.companyFilter);
      }
    }

    if (search) {
      const searchParam = `%${search}%`;
      whereConditions += ` AND (i.igst_invoice_no ILIKE $${queryParams.length + 1} 
                           OR ei.invoice_no ILIKE $${queryParams.length + 1}
                           OR i.exporter_name ILIKE $${queryParams.length + 1})`;
      queryParams.push(searchParam);
    }

    const countResult = await req.db.query(
      `SELECT COUNT(*) as total 
       FROM igst_invoices i
       LEFT JOIN export_invoices ei ON i.export_invoice_id = ei.id
       WHERE ${whereConditions}`, 
      queryParams
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    const result = await req.db.query(`
      SELECT i.*, 
             ei.invoice_no as export_invoice_no, 
             ei.invoice_date as export_invoice_date
      FROM igst_invoices i
      LEFT JOIN export_invoices ei ON i.export_invoice_id = ei.id
      WHERE ${whereConditions}
      ORDER BY i.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    const parsedLimit = parseInt(limit) || 50;
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return successResponse(res, {
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parsedLimit,
      totalPages
    }, 'IGST Invoices list retrieved successfully');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in getAll:`, error);
    next(error);
  }
};

/**
 * Get single IGST Invoice by ID
 */
export const getById = async (req, res, next) => {
  try {
    await ensureSchemaExists(req.db.query, req.companyFilter);
    const { id } = req.params;
    const companyId = req.companyFilter || req.user?.companyId;

    const result = await req.db.query(
      `SELECT i.*, 
              ei.invoice_no as export_invoice_no,
              ei.invoice_date as export_invoice_date
       FROM igst_invoices i
       LEFT JOIN export_invoices ei ON i.export_invoice_id = ei.id
       WHERE i.id = $1 AND i.company_id = $2 AND i.deleted_at IS NULL`,
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('IGST Invoice not found', 404));
    }

    const igstInvoice = result.rows[0];

    // Fetch company global details for printing/view fallback
    let companyInfo = null;
    try {
      const compRes = await req.db.globalQuery(
        'SELECT * FROM companies WHERE id = $1',
        [companyId]
      );
      if (compRes.rows.length > 0) {
        const c = compRes.rows[0];
        const settings = c.settings || {};
        companyInfo = {
          ...c,
          bank_details: {
            bank_name: c.bank_name || settings.bank_name || (settings.bank_details && settings.bank_details.bank_name) || '',
            account_name: c.account_holder_name || settings.account_name || (settings.bank_details && settings.bank_details.account_name) || '',
            account_no: c.account_number || settings.account_no || (settings.bank_details && settings.bank_details.account_no) || '',
            swift_code: c.swift_code || settings.swift_code || (settings.bank_details && settings.bank_details.swift_code) || '',
            bank_address: c.bank_address || c.branch_name || (settings.bank_details && settings.bank_details.bank_address) || ''
          }
        };
      }
    } catch (err) {}

    return successResponse(res, { ...igstInvoice, company_info: companyInfo }, 'IGST Invoice retrieved successfully');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in getById:`, error);
    next(error);
  }
};

/**
 * Remove IGST Invoice (Soft delete)
 */
export const remove = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const companyId = req.companyFilter || req.user?.companyId;

    const result = await req.db.query(
      `UPDATE igst_invoices SET deleted_at = NOW() 
       WHERE export_invoice_id = $1 AND company_id = $2
       RETURNING id`,
      [exportInvoiceId, companyId]
    );

    if (result.rowCount === 0) return next(new AppError('IGST Invoice not found', 404));

    // Write Audit Log
    try {
      await req.db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id)
         VALUES ($1, $2, 'Delete', 'igst_invoice', $3)`,
        [companyId, req.user?.id, result.rows[0].id]
      );
    } catch (err) {}

    res.locals.auditResourceId = result.rows[0]?.id;
    return successResponse(res, null, 'IGST Invoice deleted successfully');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in remove:`, error);
    next(error);
  }
};

/**
 * Remove IGST Invoice by Primary Key ID
 */
export const removeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter || req.user?.companyId;

    const result = await req.db.query(
      `UPDATE igst_invoices SET deleted_at = NOW() 
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [id, companyId]
    );

    if (result.rowCount === 0) return next(new AppError('IGST Invoice not found', 404));

    // Write Audit Log
    try {
      await req.db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id)
         VALUES ($1, $2, 'Delete', 'igst_invoice', $3)`,
        [companyId, req.user?.id, id]
      );
    } catch (err) {}

    res.locals.auditResourceId = result.rows[0]?.id;
    return successResponse(res, null, 'IGST Invoice deleted successfully');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in removeById:`, error);
    next(error);
  }
};

/**
 * Get Next sequential IGST Invoice Number preview
 */
export const getNextNumber = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user?.companyId;
    if (!companyId) {
      return successResponse(res, { igstInvoiceNo: '' }, 'Company context missing');
    }
    
    const result = await previewDocumentNumber('IGST', companyId, req.db);
    return successResponse(res, { igstInvoiceNo: result.displayNumber }, 'Next IGST number retrieved');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in getNextNumber:`, error);
    next(error);
  }
};

/**
 * Get general dashboard statistics for IGST Invoices
 */
export const getStats = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user?.companyId;
    
    const statsQuery = await req.db.query(
      `SELECT 
         COUNT(*) as total_count,
         SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft_count,
         SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
         SUM(grand_total) as total_value
       FROM igst_invoices
       WHERE company_id = $1 AND deleted_at IS NULL`,
      [companyId]
    );

    const stats = statsQuery.rows[0] || {};
    return successResponse(res, {
      totalCount: parseInt(stats.total_count || 0),
      draftCount: parseInt(stats.draft_count || 0),
      approvedCount: parseInt(stats.approved_count || 0),
      totalValue: parseFloat(stats.total_value || 0)
    }, 'IGST Invoice stats retrieved successfully');
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in getStats:`, error);
    next(error);
  }
};

/**
 * Toggle Status between Draft and Approved
 */
export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter || req.user?.companyId;

    const current = await req.db.query(
      'SELECT status FROM igst_invoices WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (current.rows.length === 0) {
      return next(new AppError('IGST Invoice not found', 404));
    }

    const currentStatus = current.rows[0].status;
    const newStatus = (currentStatus === 'Approved') ? 'Draft' : 'Approved';

    const result = await req.db.query(
      'UPDATE igst_invoices SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
      [newStatus, id, companyId]
    );

    // Audit Log
    try {
      await req.db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, changes)
         VALUES ($1, $2, 'Update', 'igst_invoice', $3, $4)`,
        [companyId, req.user?.id, id, JSON.stringify({ status: newStatus })]
      );
    } catch (err) {}

    return successResponse(res, result.rows[0], `Status updated to ${newStatus}`);
  } catch (error) {
    debugLogger.error(`[IGST Invoice Controller] Error in toggleStatus:`, error);
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
        UPDATE igst_invoices
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `, [status, id, companyId]);
    } else {
      result = await req.db.query(`
        UPDATE igst_invoices
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
