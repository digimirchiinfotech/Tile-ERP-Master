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

import { saveAs } from 'file-saver';
import { formatDisplayDate } from './formatters.js';
import { getCompanyConfig } from '../config/companyConfig';
import { generateEnterpriseFilename } from './fileNamingUtils';

export const exportProductDetailsToXLSX = async (documentData, moduleType, boxTypeImageUrl = null) => {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Product Details'); // Removed frozen panes

    if (!documentData) {
      console.warn('exportProductDetailsToXLSX called with empty data');
      return false;
    }

    // Automatically flatten/unwrap data if nested within module-specific keys
    let flatData = { ...documentData };
    const unwraps = ['igst_invoice', 'vgm', 'packing_list', 'annexure', 'export_invoice', 'shipping_instruction', 'invoice_backside', 'proforma_invoice', 'proforma_order'];
    unwraps.forEach(key => {
      if (documentData[key] && typeof documentData[key] === 'object') {
        flatData = { ...flatData, ...documentData[key] };
      }
    });
    documentData = flatData;

    // Helper: Normalize product data
    const parseProducts = (data, key) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    };

    const tileProducts = parseProducts(documentData.product_lines || documentData.productLines || documentData.products || documentData.product_details || documentData.inherited_product_details || documentData.productDetails);
    const sanitaryProducts = parseProducts(documentData.sanitary_products || documentData.sanitaryProducts || documentData.inherited_sanitary_products);
    const containers = parseProducts(documentData.containers || documentData.container_sheet || documentData.container_details || documentData.containerDetails);
    
    const docNo = documentData.igst_invoice_no || documentData.igstInvoiceNo || documentData.invoice_no || documentData.invoiceNo || documentData.exp_no || documentData.vgm_no || documentData.instructionNo || documentData.si_no || documentData.backside_no || documentData.annexure_no || documentData.packing_list_no || 'Document';
    const clientName = documentData.client_name || documentData.clientName || documentData.exporter_name || 'N/A';
    const date = documentData.invoice_date || documentData.vgm_date || documentData.date || documentData.created_at || documentData.packing_list_date;

    const numberToWords = (num) => {
      const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
      const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
      const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
      const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

      if (num === 0) return 'ZERO';

      const convertHundreds = (n) => {
        let result = '';
        if (n >= 100) {
          result += ones[Math.floor(n / 100)] + ' HUNDRED ';
          n %= 100;
        }
        if (n >= 20) {
          result += tens[Math.floor(n / 10)] + ' ';
          n %= 10;
        } else if (n >= 10) {
          result += teens[n - 10] + ' ';
          return result;
        }
        if (n > 0) {
          result += ones[n] + ' ';
        }
        return result;
      };

      let result = '';
      let scaleIndex = 0;
      let remaining = Math.floor(num);

      while (remaining > 0) {
        const segment = remaining % 1000;
        remaining = Math.floor(remaining / 1000);
        if (segment !== 0) {
          result = convertHundreds(segment) + (scales[scaleIndex] ? scales[scaleIndex] + ' ' : '') + result;
        }
        scaleIndex++;
      }

      return result.trim();
    };

    // --- Header Section ---
    const applyBorder = (r, c) => {
      const cell = sheet.getCell(r, c);
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    };

    const parseJSON = (data) => {
      if (!data) return {};
      if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return {}; }
      }
      return data;
    };

    const companyConfig = getCompanyConfig(documentData?.company_id || documentData?.companyId);
    const ci = parseJSON(documentData.company_info || documentData.companyInfo);

    const exporterName = ci.name || ci.company_name || ci.companyName || documentData.company_name || documentData.companyName || companyConfig.exporter.name || 'Exporter Name';
    const exporterAddress = ci.address || ci.company_address || ci.companyAddress || documentData.company_address || documentData.companyAddress || companyConfig.exporter.address || 'Exporter Address';
    const iecNo = ci.iec_no || ci.iecNo || documentData.iec_no || documentData.iecNo || companyConfig.exporter.iecNo || '-';
    const gstn = ci.gstn || ci.gstin || documentData.gstn || documentData.gstin || companyConfig.exporter.gstn || '-';
    
    const consignee = documentData.consignee_details || documentData.consigneeDetails || documentData.consignee || 'TO THE ORDER';
    const buyer = documentData.buyer_details || documentData.buyerDetails || documentData.buyer || 'SAME AS ABOVE';
    
    const invNo = documentData.igst_invoice_no || documentData.igstInvoiceNo || documentData.invoice_no || documentData.invoiceNo || documentData.exp_no || documentData.expNo || documentData.vgm_no || documentData.vgmNo || documentData.si_no || documentData.siNo || documentData.annexure_no || documentData.annexureNo || documentData.packing_list_no || documentData.packingListNo || documentData.po_no || documentData.proforma_order_no || documentData.proformaOrderNo || '-';
    const invDate = formatDisplayDate(documentData.invoice_date || documentData.invoiceDate || documentData.vgm_date || documentData.vgmDate || documentData.date || documentData.created_at || documentData.createdAt || documentData.packing_list_date);
    
    const piNo = documentData.pi_no || documentData.piNo || documentData.proforma_invoice_no || documentData.proformaInvoiceNo || documentData.exporter_ref || documentData.exporterRef || '-';
    const piDate = formatDisplayDate(documentData.pi_date || documentData.piDate || documentData.proforma_date || documentData.proformaDate);
    
    const buyerOrderNo = documentData.buyers_order_no || documentData.buyersOrderNo || documentData.buyer_order_no || documentData.buyerOrderNo || '-';
    const buyerOrderDate = formatDisplayDate(documentData.buyers_order_date || documentData.buyersOrderDate || documentData.buyer_order_date || documentData.buyerOrderDate);
    
    const deliveryTerms = documentData.delivery_terms || documentData.deliveryTerms || '-';
    const tariffCode = documentData.tariff_code || documentData.tariffCode || '-';
    
    const preCarriage = documentData.pre_carriage_by || documentData.preCarriageBy || '-';
    const receiptPlace = documentData.place_of_receipt || documentData.placeOfReceipt || '-';
    const vessel = documentData.vessel_flight_no || documentData.vesselFlightNo || documentData.vessel_name || documentData.vesselName || '-';
    const pol = documentData.port_of_loading || documentData.portOfLoading || '-';
    const pod = documentData.port_of_discharge || documentData.portOfDischarge || '-';
    const dest = documentData.final_destination || documentData.finalDestination || documentData.country || '-';
    const origin = documentData.country_of_origin || documentData.countryOfOrigin || '-';
    const paymentTerms = documentData.payment_terms || documentData.paymentTerms || '-';

    const bd = parseJSON(ci.bank_details || ci.bankDetails || documentData.bank_details || documentData.bankDetails || {});
    const settings = parseJSON(ci.settings || {});
    const globalBank = parseJSON(settings.bank_details || settings.bankDetails || {});

    const accName = bd.account_name || bd.accountName || globalBank.account_name || globalBank.accountName || ci.name || ci.company_name || ci.companyName || companyConfig.bankDetails?.accountName || '-';
    const accNo = bd.account_no || bd.accountNo || globalBank.account_no || globalBank.accountNo || companyConfig.bankDetails?.accountNumber || '-';
    const bankName = bd.bank_name || bd.bankName || globalBank.bank_name || globalBank.bankName || companyConfig.bankDetails?.bankName || '-';
    const bankAddr = bd.bank_address || bd.bankAddress || globalBank.bank_address || globalBank.bankAddress || companyConfig.bankDetails?.bankAddress || '-';
    const swift = bd.swift || bd.swift_code || bd.swiftCode || globalBank.swift || globalBank.swift_code || globalBank.swiftCode || companyConfig.bankDetails?.swiftCode || '-';

    // Logo Processing
    let logoImageId = null;
    try {
      let logoUrl = ci.logo_url || ci.logoUrl || settings.logo_url || settings.logoUrl || companyConfig.exporter?.logoUrl;
      if (logoUrl) {
        if (logoUrl.startsWith('/')) {
          const apiBase = import.meta.env?.VITE_API_URL || '';
          logoUrl = `${apiBase}${logoUrl}`;
        }
        const response = await fetch(logoUrl);
        if (response.ok) {
          const imageBuffer = await response.arrayBuffer();
          const extension = logoUrl.split('.').pop().toLowerCase();
          let extensionType = 'png';
          if (['jpg', 'jpeg'].includes(extension)) extensionType = 'jpeg';
          
          logoImageId = workbook.addImage({
            buffer: imageBuffer,
            extension: extensionType,
          });
        }
      }
    } catch (err) {
      console.warn("Could not load logo for Excel", err);
    }

    // Box Type Image Processing
    let boxImageId = null;
    try {
      if (boxTypeImageUrl) {
        let fetchUrl = boxTypeImageUrl;
        if (fetchUrl.startsWith('/')) {
          const apiBase = import.meta.env?.VITE_API_URL || '';
          fetchUrl = `${apiBase}${fetchUrl}`;
        }
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const imageBuffer = await response.arrayBuffer();
          const extension = fetchUrl.split('.').pop().toLowerCase();
          let extensionType = 'png';
          if (['jpg', 'jpeg'].includes(extension)) extensionType = 'jpeg';
          
          boxImageId = workbook.addImage({
            buffer: imageBuffer,
            extension: extensionType,
          });
        }
      }
    } catch (err) {
      console.warn("Could not load box image for Excel", err);
    }

    // ─────────────────────────────────────────────────────────────────
    // VGM: Dedicated Layout — 6 columns, consistent throughout
    // Info rows:      A=SR | B:D merged=DETAILS | E:F merged=PARTICULARS
    // Container rows: A=ContainerNo | B=Type | C=Cargo | D=Tare | E=VGM | F=Slip
    // ─────────────────────────────────────────────────────────────────
    if (moduleType === 'VGM' || moduleType === 'vgm') {
      // Single column-width definition — used for entire sheet
      sheet.columns = [
        { width: 20 },  // A: SR NO / Container No
        { width: 14 },  // B: DETAILS part / Type-Size
        { width: 14 },  // C: DETAILS part / Cargo Wt
        { width: 14 },  // D: DETAILS part / Tare Wt
        { width: 16 },  // E: PARTICULARS / VGM Weight
        { width: 22 },  // F: PARTICULARS / Slip No & Date
      ];

      const B = { style: 'thin' };
      const brd = { top: B, left: B, bottom: B, right: B };
      const setBorder = (row, col) => { sheet.getCell(row, col).border = brd; };

      // helpers
      const setCell = (row, col, value, opts = {}) => {
        const cell = sheet.getCell(row, col);
        cell.value = value;
        if (opts.bold !== undefined) cell.font = { bold: opts.bold, size: opts.size || 10 };
        else if (opts.size) cell.font = { size: opts.size };
        if (opts.italic) cell.font = { italic: true, size: opts.size || 9 };
        if (opts.color) cell.font = { ...(cell.font || {}), color: { argb: opts.color } };
        if (opts.bg)   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
        if (opts.align) cell.alignment = { ...opts.align, wrapText: true };
        cell.border = brd;
        return cell;
      };

      const mergeRow = (row, c1, c2) => {
        sheet.mergeCells(`${c1}${row}:${c2}${row}`);
      };
      const mergeRows = (r1, c1, r2, c2) => {
        sheet.mergeCells(`${c1}${r1}:${c2}${r2}`);
      };

      let r = 1;

      // ── Row 1: Title ───────────────────────────────────────────────
      mergeRow(r, 'A', 'F');
      setCell(r, 1, 'VERIFIED GROSS MASS (VGM)', {
        bold: true, size: 16,
        align: { horizontal: 'center', vertical: 'middle' }
      });
      sheet.getRow(r).height = 36;
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, { tl: { col: 4.8, row: 0.1 }, ext: { width: 90, height: 30 } });
      }
      r++;

      // ── Row 2: Section Header ──────────────────────────────────────
      mergeRow(r, 'A', 'F');
      setCell(r, 1, 'INFORMATION ABOUT VERIFIED GROSS MASS OF CONTAINER', {
        bold: true, size: 10,
        align: { horizontal: 'center', vertical: 'middle' }
      });
      sheet.getRow(r).height = 20;
      r++;

      // ── Row 3: Column Headers (info layout) ───────────────────────
      setCell(r, 1, 'SR\nNO.', { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'B', 'D');
      setCell(r, 2, 'DETAILS OF INFORMATION', { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      // NOTE: do NOT setBorder on slave cells (C,D) — ExcelJS handles merged border via master
      mergeRow(r, 'E', 'F');
      setCell(r, 5, 'PARTICULARS', { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      // NOTE: do NOT setBorder on slave cell F — handled by master E
      sheet.getRow(r).height = 24;
      r++;

      // ── Pull VGM values ────────────────────────────────────────────
      const vgmShipperName   = documentData.shipper_name   || documentData.shipperName   || exporterName;
      const vgmShipperIec    = documentData.shipper_iec    || documentData.shipperIec    || documentData.iec_no || iecNo;
      const vgmAuthPerson    = documentData.authorized_person || documentData.authorizedPerson || '-';
      const vgmContact       = documentData.contact_details || documentData.contactDetails || '-';
      const vgmContainerNo   = documentData.container_no   || documentData.containerNo   || 'AS PER ATTACHMENT';
      const vgmContainerSize = documentData.container_size  || documentData.containerSize  || "20'";
      const vgmMaxWeight     = documentData.max_permissible_weight || documentData.maxPermissibleWeight || '30,480.00 KGS';
      const vgmWeighbridge   = documentData.weighbridge_name || documentData.weighbridgeName || '-';
      const vgmMethod        = documentData.weighing_method  || documentData.weighingMethod  || 'METHOD-1';
      const vgmWeighDate     = documentData.weighing_date   || documentData.weighingDate   || 'AS PER BELOW DETAILS';
      const vgmSlipNo        = documentData.weighing_slip_no || documentData.weighingSlipNo || 'AS PER BELOW DETAILS';
      const vgmCargoType     = documentData.cargo_type  || documentData.cargoType  || 'NORMAL';
      const vgmUnNo          = documentData.un_no_imdg  || documentData.unNoImdg   || 'N/A';
      const vgmBookingNo     = documentData.booking_number || documentData.bookingNumber || documentData.booking_no || '-';
      const vgmGoodsDesc     = documentData.product_description || documentData.productDescription || documentData.goods_description || '-';

      // ── Helper: add one info row (SR | DETAILS | PARTICULARS) ─────
      const addInfo = (sr, label, value, mandatory = false, rowH = 22) => {
        // SR NO col A
        setCell(r, 1, sr + (mandatory ? '*' : ''), {
          bold: mandatory, size: 9,
          align: { horizontal: 'center', vertical: 'middle' }
        });
        // DETAILS cols B:D merged — set master only, skip slave cells C,D
        mergeRow(r, 'B', 'D');
        setCell(r, 2, label, { bold: true, size: 9, align: { horizontal: 'left', vertical: 'middle' } });
        // PARTICULARS cols E:F merged — set master only, skip slave cell F
        mergeRow(r, 'E', 'F');
        setCell(r, 5, value || '', { bold: true, size: 10, align: { horizontal: 'center', vertical: 'middle' } });
        sheet.getRow(r).height = rowH;
        r++;
      };

      // ── Rows 1–15 ─────────────────────────────────────────────────
      addInfo(1,  'NAME OF THE SHIPPER', vgmShipperName, true);
      addInfo(2,  'SHIPPER REGISTRATION / LICENSE NO. ( IEC NO/CIN NO )**', vgmShipperIec, true);
      addInfo(3,  'NAME AND DESIGNATION OF OFFICIAL OF THE SHIPPER AUTHORIZED TO SIGN DOCUMENT', vgmAuthPerson, true, 32);
      addInfo(4,  '24 X 7 CONTACT DETAILS OF AUTHORIZED OFFICIAL OF SHIPPER', vgmContact, true);
      addInfo(5,  'CONTAINER NO.', vgmContainerNo, true);
      addInfo(6,  'CONTAINER SIZE ( TEU/FEU/OTHER )', vgmContainerSize, true);
      addInfo(7,  'MAXIMUM PERMISSIBLE WEIGHT OF CONTAINER AS PER THE CSC PLATE', vgmMaxWeight, true, 32);
      addInfo(8,  'WEIGHBRIDGE REGISTRATION NO. & ADDRESS OF WEIGHBRIDGE', vgmWeighbridge, true);
      addInfo(9,  'VERIFIED GROSS MASS OF CONTAINER ( METHOD-1 / METHOD-2 )', vgmMethod, true);
      addInfo(10, 'DATE AND TIME OF WEIGHING', formatDisplayDate(vgmWeighDate) || vgmWeighDate, true);
      addInfo(11, 'WEIGHING SLIP NO.', vgmSlipNo, true);
      addInfo(12, 'TYPE ( NORMAL/REEFER/HAZARDOUS/OTHERS )', vgmCargoType);
      addInfo(13, 'IF HAZARDOUS UN NO. IMDG CLASS', vgmUnNo);
      addInfo(14, 'BOOKING NUMBER', vgmBookingNo);
      addInfo(15, 'DESCRIPTION OF GOODS', vgmGoodsDesc);

      // ── Blank spacer row ──────────────────────────────────────────
      r++;

      // ── ATTACHED CONTAINER SHEET header ───────────────────────────
      mergeRow(r, 'A', 'F');
      setCell(r, 1, 'ATTACHED CONTAINER SHEET', {
        bold: true, size: 11, bg: 'FF000000', color: 'FFFFFFFF',
        align: { horizontal: 'center', vertical: 'middle' }
      });
      // NOTE: do NOT setBorder on slave cells B-F of this merged row
      sheet.getRow(r).height = 22;
      r++;

      // ── Container column headers ───────────────────────────────────
      const cHdrs = ['CONTAINER NO.', 'TYPE /\nSIZE', 'CARGO WT.\n(KGS)', 'TARE WT.\n(KGS)', 'VGM WEIGHT\n(KGS)', 'SLIP NO.\n& DATE'];
      cHdrs.forEach((h, i) => {
        setCell(r, i + 1, h, {
          bold: true, size: 9,
          align: { horizontal: 'center', vertical: 'middle' }
        });
      });
      sheet.getRow(r).height = 28;
      r++;

      // ── Container data ────────────────────────────────────────────
      const vgmContainers = containers.length > 0 ? containers : (() => {
        let cs = documentData.container_sheet || documentData.containers;
        if (typeof cs === 'string') { try { cs = JSON.parse(cs); } catch { cs = []; } }
        return Array.isArray(cs) ? cs : [];
      })();

      // Tare weight lookup by container size (mirrors backend getTareBySize)
      const getTareBySize = (sz) => {
        if (!sz) return 2300;
        const s = String(sz).toUpperCase();
        if (s.includes('40')) return s.includes('HC') ? 3900 : 3800;
        if (s.includes('20')) return 2300;
        return 2300;
      };

      let totCargo = 0, totTare = 0, totVgm = 0;

      vgmContainers.forEach(c => {
        const cargo  = parseFloat(c.cargo_wt || c.cargo_weight || c.cargoWeight || c.net_weight || c.netWeight || c.netWt || c.net_wt || c.cargo_weight || c.cargo_wt || c.cargoWeight || 0);
        const rawTare = parseFloat(c.tare_wt || c.tare_weight || c.tareWeight || 0);
        const type   = (c.type || c.container_size || c.containerSize || c.size || "20'").toUpperCase();
        // Use stored tare if >0, otherwise estimate from size (same as backend)
        const tare   = rawTare > 0 ? rawTare : getTareBySize(type);
        const storedVgm = parseFloat(c.vgm_weight || c.vgmWeight || 0);
        // VGM Weight = max(stored, cargo+tare)
        const vgmW  = storedVgm > 0 ? storedVgm : (cargo + tare);
        totCargo += cargo; totTare += tare; totVgm += vgmW;

        const slipCands = [c.slip_no, c.slipNo, c.weighing_slip_no, c.weighingSlipNo, documentData.weighing_slip_no];
        const sNo = slipCands.find(s => s && s !== 'AS PER BELOW DETAILS' && s !== '-') || vgmSlipNo;
        const dateCands = [c.slip_no_date, c.slipNoDate, c.weighing_date, c.weighingDate, documentData.weighing_date];
        const sDateRaw = dateCands.find(s => s && s !== 'AS PER BELOW DETAILS' && s !== '-') || '';
        const slipInfo = [sNo, sDateRaw ? formatDisplayDate(sDateRaw) : ''].filter(Boolean).join('\n');

        const dataRow = sheet.addRow([c.container_no || c.containerNo || '-', type, cargo, tare, vgmW, slipInfo]);
        dataRow.eachCell((cell, col) => {
          cell.border = brd;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.font = { size: 10, bold: true };
          if ([3, 4, 5].includes(col)) cell.numFmt = '#,##0.00';
        });
        sheet.getRow(r).height = 22;
        r++;
      });

      // ── Totals row (Removed to match screenshot) ───────────────────
      // The screenshot does not have a totals row for the containers.

      // ── Footer: Footnotes (A:C) | Signature (D:F) ─────────────────
      r++;
      const footerR = r;
      mergeRows(footerR, 'A', footerR + 1, 'C');
      setCell(footerR, 1,
        '* Indicates mandatory fields.\n** Registrations/license number of the shipper in IEC (Import Export Code) format issued by Director General of Foreign Trade (DGFT) or CIN No. issued by Ministry of Corporate Affairs, Govt. of India.',
        { italic: true, size: 7.5, align: { horizontal: 'left', vertical: 'top' } }
      );
      // Only set border on master cells (A), not slaves (B,C)

      mergeRows(footerR, 'D', footerR + 1, 'F');
      const vgmDateStr = formatDisplayDate(vgmWeighDate) || vgmWeighDate || date;
      setCell(footerR, 4, `SIGNATURE OF AUTHORIZED PERSON OF SHIPPER\n\n\n\n\n\nFOR, ${vgmShipperName}\n(AUTHORIZED SIGNATORY)\nDATE: ${vgmDateStr}`, {
        bold: true, size: 9, align: { horizontal: 'center', vertical: 'top' }
      });
      // Only set border on master cell (D), not slaves (E,F)

      sheet.getRow(footerR).height = 60;
      sheet.getRow(footerR + 1).height = 60;

      // ── Save ───────────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = generateEnterpriseFilename({
        moduleName: 'VGM_DOCUMENT', documentNo: docNo,
        clientName, date, extension: 'xlsx', isProductExport: true
      });
      saveAs(new Blob([buffer]), filename);
      return true;
    }
    // ─────────────────────────────────────────────────────────────────
    // IGST INVOICE: Dedicated Layout
    // ─────────────────────────────────────────────────────────────────
    else if (moduleType === 'IGST Invoice' || moduleType === 'IGST INVOICE' || moduleType === 'igst_invoice') {
      sheet.columns = [
        { width: 5 },   // A: SR.
        { width: 45 },  // B: DESCRIPTION OF GOODS
        { width: 12 },  // C: HSN
        { width: 10 },  // D: BOXES
        { width: 12 },  // E: SQM/PCS
        { width: 12 },  // F: RATE (INR)
        { width: 15 },  // G: TAXABLE AMT
        { width: 10 },  // H: IGST %
        { width: 15 },  // I: IGST AMT
      ];

      const doc = documentData.igstInvoice || documentData.igst_invoice || documentData || {};
      const exportInvoice = documentData.exportInvoice || documentData.export_invoice || {};
      const productLinesArr = parseProducts(doc.productLines || doc.product_lines);
      
      const B = { style: 'thin' };
      const brd = { top: B, left: B, bottom: B, right: B };
      const setBorder = (r, c) => {
        const cell = sheet.getCell(r, c);
        cell.border = brd;
        return cell;
      };

      const setCell = (row, col, value, opts = {}) => {
        const cell = sheet.getCell(row, col);
        cell.value = value;
        if (opts.bold !== undefined) cell.font = { bold: opts.bold, size: opts.size || 8 };
        else if (opts.size) cell.font = { size: opts.size };
        if (opts.italic) cell.font = { ...cell.font, italic: true };
        if (opts.align) cell.alignment = { ...opts.align, wrapText: true };
        if (opts.color) cell.font = { ...(cell.font || {}), color: { argb: opts.color } };
        if (opts.bg)   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
        cell.border = brd;
        return cell;
      };

      const mergeRow = (r1, c1, r2, c2) => {
        sheet.mergeCells(`${c1}${r1}:${c2}${r2}`);
      };

      let r = 1;

      // Row 1: Header
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, `EXPORTER REGISTRATION & LUT\nGSTIN: ${doc.gstin || '-'}\nIEC: ${doc.iecNo || doc.iec_no || '-'}\nLUT NO: ${doc.lutBondRef || doc.lut_bond_ref || '-'}\nLUT DATE: ${formatDisplayDate(doc.lutDate || doc.lut_date)}`, { bold: true, size: 7, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'E', r, 'G');
      setCell(r, 5, 'IGST INVOICE', { bold: true, size: 16, align: { horizontal: 'center', vertical: 'middle' } });
      
      mergeRow(r, 'H', r, 'I');
      setCell(r, 8, '', { align: { horizontal: 'center', vertical: 'middle' } });
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, { tl: { col: 7.2, row: 0.1 }, ext: { width: 120, height: 40 } });
      }
      sheet.getRow(r).height = 50;
      r++;

      // Row 2: Declaration
      mergeRow(r, 'A', r, 'I');
      setCell(r, 1, `${doc.supply_declaration || doc.supplyDeclaration || 'SUPPLY MEANT FOR EXPORT WITH PAYMENT OF INTEGRATED TAX UNDER LUT BOND'}\n${doc.ftp_incentive_declaration || doc.ftpIncentiveDeclaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'}`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 30;
      r++;

      // Rows 3-7: Exporter vs Metadata
      const exporterBlockRowStart = r;
      mergeRow(exporterBlockRowStart, 'A', exporterBlockRowStart + 2, 'E');
      setCell(exporterBlockRowStart, 1, `EXPORTER DETAILS:\n${exporterName}\n${exporterAddress}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });

      mergeRow(exporterBlockRowStart + 3, 'A', exporterBlockRowStart + 4, 'E');
      setCell(exporterBlockRowStart + 3, 1, `CONSIGNEE DETAILS:\n${consignee}\n\nBUYER / IMPORTER DETAILS:\n${buyer}\n\nPAYMENT TERMS: ${paymentTerms}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });

      // Right side 5 rows
      const rightRows = [
        [ 'INVOICE NO:\n' + (doc.igstInvoiceNo || doc.igst_invoice_no || '-'), 'DATE OF INVOICE:\n' + formatDisplayDate(doc.date) ],
        [ 'EXPORT INVOICE REF:\n' + (exportInvoice.invoiceNo || exportInvoice.invoice_no || '-'), 'EXPORT INVOICE DATE:\n' + formatDisplayDate(exportInvoice.invoiceDate || exportInvoice.invoice_date) ],
        [ 'PROFORMA INVOICE REF:\n' + (doc.pi_no || doc.piNo || '-'), 'TARIFF CODE / HS CODE:\n' + (doc.tariff_code || doc.tariffCode || '-') ],
        [ 'BUYER\'S ORDER NO & DATE:\n' + (doc.buyers_order_no || doc.buyersOrderNo || '-') + ' DT: ' + formatDisplayDate(doc.buyers_order_date || doc.buyersOrderDate), 'COUNTRY OF ORIGIN:\n' + (doc.country_of_origin || doc.countryOfOrigin || doc.country || 'INDIA') ],
        [ 'SHIPMENT TERMS:\n' + (doc.deliveryTerms || doc.delivery_terms || '-'), 'COUNTRY OF FINAL DESTINATION:\n' + (doc.finalDestination || doc.final_destination || '-') ]
      ];

      rightRows.forEach((rowPair, idx) => {
        const curR = exporterBlockRowStart + idx;
        mergeRow(curR, 'F', curR, 'G');
        setCell(curR, 6, rowPair[0], { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
        mergeRow(curR, 'H', curR, 'I');
        setCell(curR, 8, rowPair[1], { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
        sheet.getRow(curR).height = 35;
      });
      r += 5;

      // Row 8: Logistics 1
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, `VESSEL / FLIGHT NO.\n${vessel}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'E');
      setCell(r, 4, `PORT OF LOADING\n${pol}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'F', r, 'G');
      setCell(r, 6, `PORT OF DISCHARGE\n${pod}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'H', r, 'I');
      setCell(r, 8, `FINAL DESTINATION\n${dest}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 9: Logistics 2
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, `PRE-CARRIAGE BY\n${preCarriage}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'E');
      setCell(r, 4, `PLACE OF RECEIPT\n${receiptPlace}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'F', r, 'G');
      setCell(r, 6, `SHIPPING BILL NO\n${doc.shippingBillNo || doc.shipping_bill_no || '-'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'H', r, 'I');
      setCell(r, 8, `SHIPPING BILL DATE\n${formatDisplayDate(doc.shippingBillDate || doc.shipping_bill_date)}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 10: Table Headers
      const headers = ['SR.', 'DESCRIPTION OF GOODS', 'HSN', 'BOXES', 'SQM/PCS', 'RATE (INR)', 'TAXABLE AMT', 'IGST %', 'IGST AMT'];
      headers.forEach((h, i) => {
        setCell(r, i + 1, h, { bold: true, size: 8, bg: 'FFF8F9FA', align: { horizontal: 'center', vertical: 'middle' } });
      });
      sheet.getRow(r).height = 25;
      r++;

      // Products
      let totalBoxes = 0;
      let totalSqm = 0;
      const prodStartRow = r;
      productLinesArr.forEach((p, index) => {
        const isFoc = !!(p.is_foc || p.isFoc);
        const name = p.productName || p.product_name || p.materialDescription || p.material_description || '';
        const desc = p.materialDescription || p.material_description || '';
        let finalDesc = (isFoc ? 'FREE OF COST SAMPLE NO COMMERCIAL VALUE\n' : '') + (name !== desc && desc ? `${name}\n${desc}` : name);
        
        const factoryProductName = p.factoryProductName || p.factory_product_name;
        const pallets = p.pallets || p.totalPallets || p.total_pallets || p.no_of_pallets || p.noOfPallets;
        if (factoryProductName && factoryProductName !== '-' && factoryProductName !== name) finalDesc += `\nFACTORY PROD: ${factoryProductName}`;
        if (pallets && pallets !== '0' && pallets !== 0) finalDesc += `\nPALLETS: ${pallets}`;
        
        const boxes = parseInt(p.boxQuantity || p.box_quantity || 0, 10);
        const sqm = parseFloat(p.sqm || p.pcs || 0);
        totalBoxes += boxes;
        totalSqm += sqm;

        setCell(r, 1, index + 1, { align: { horizontal: 'center', vertical: 'top' } });
        setCell(r, 2, finalDesc, { bold: true, align: { horizontal: 'left', vertical: 'top' } });
        setCell(r, 3, p.hsnCode || p.hsn_code || p.hsCode || p.hs_code || (tariffCode !== '-' ? tariffCode : ''), { align: { horizontal: 'center', vertical: 'top' } });
        setCell(r, 4, boxes, { align: { horizontal: 'center', vertical: 'top' } });
        setCell(r, 5, sqm, { align: { horizontal: 'center', vertical: 'top' } });
        
        const rateCell = setCell(r, 6, isFoc ? 0 : parseFloat(p.rate || 0), { align: { horizontal: 'right', vertical: 'top' } });
        rateCell.numFmt = '#,##0.00';
        
        const taxCell = setCell(r, 7, isFoc ? 0 : parseFloat(p.taxableAmount || p.taxable_amount || 0), { bold: true, align: { horizontal: 'right', vertical: 'top' } });
        taxCell.numFmt = '#,##0.00';
        
        setCell(r, 8, `${parseFloat(p.igst_percentage || p.igst_rate || p.igstRate || '18.00').toFixed(2)}%`, { align: { horizontal: 'center', vertical: 'top' } });
        
        const igstAmtCell = setCell(r, 9, isFoc ? 0 : parseFloat(p.igstAmount || p.igst_amount || 0), { bold: true, align: { horizontal: 'right', vertical: 'top' } });
        igstAmtCell.numFmt = '#,##0.00';

        sheet.getRow(r).height = 40;
        r++;
      });

      // Packing Reference
      mergeRow(r, 'A', r, 'I');
      setCell(r, 1, 'PACKING DETAILS AS PER ANNEXURE', { bold: true, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // Totals
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, 'TOTAL:', { bold: true, align: { horizontal: 'right', vertical: 'middle' }, bg: 'FFF8F9FA' });
      setCell(r, 4, { formula: `SUM(D${prodStartRow}:D${r-1})`, result: totalBoxes }, { bold: true, align: { horizontal: 'center', vertical: 'middle' }, bg: 'FFF8F9FA' });
      
      const totSqmCell = setCell(r, 5, { formula: `SUM(E${prodStartRow}:E${r-1})`, result: totalSqm }, { bold: true, align: { horizontal: 'center', vertical: 'middle' }, bg: 'FFF8F9FA' });
      totSqmCell.numFmt = '#,##0.00';
      
      setCell(r, 6, '', { bg: 'FFF8F9FA' });
      
      const totTaxCell = setCell(r, 7, { formula: `SUM(G${prodStartRow}:G${r-1})`, result: parseFloat(doc.totalBeforeTax || doc.total_before_tax || 0) }, { bold: true, align: { horizontal: 'right', vertical: 'middle' }, bg: 'FFF8F9FA' });
      totTaxCell.numFmt = '#,##0.00';
      
      setCell(r, 8, '', { bg: 'FFF8F9FA' });
      
      const totIgstCell = setCell(r, 9, { formula: `SUM(I${prodStartRow}:I${r-1})`, result: parseFloat(doc.totalIgst || doc.total_igst || 0) }, { bold: true, align: { horizontal: 'right', vertical: 'middle' }, bg: 'FFF8F9FA' });
      totIgstCell.numFmt = '#,##0.00';
      
      sheet.getRow(r).height = 25;
      r++;

      // Packing & Summary (3 rows block)
      const sumStart = r;
      mergeRow(sumStart, 'A', sumStart + 2, 'F');
      setCell(sumStart, 1, `PACKING, MARKS & INSTRUCTIONS:\n1. PALLETS :- ${doc.palletType || doc.pallet_type || 'NORMAL WOODEN PALLETS'}    3. BOXES :- ${doc.boxType || doc.box_type || 'NON BRANDED'}\n2. MADE IN INDIA :-                4. FUMIGATION :- ${doc.fumigation || 'YES'}\n   TILES BACK: ${doc.tilesBack || doc.tiles_back || 'YES'}                 5. LEGALISATION :- ${doc.legalisation || 'NO'}\n   BOXES: ${doc.boxesMarking || doc.boxes_marking || 'YES'}                      6. OTHER :- ${doc.otherInstructions || doc.other_instructions || '-'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      if (boxImageId !== null) {
        sheet.addImage(boxImageId, {
          tl: { col: 4.8, row: sumStart - 0.8 }, // Align right side of A-F merge
          ext: { width: 50, height: 50 }
        });
      }
      
      mergeRow(sumStart, 'G', sumStart, 'H');
      setCell(sumStart, 7, 'VALUE BEFORE TAX (INR):', { bold: true, align: { horizontal: 'left', vertical: 'middle' } });
      const val1 = setCell(sumStart, 9, { formula: `G${r-2}`, result: parseFloat(doc.totalBeforeTax || doc.total_before_tax || 0) }, { bold: true, align: { horizontal: 'right', vertical: 'middle' } });
      val1.numFmt = '#,##0.00';
      sheet.getRow(sumStart).height = 25;

      mergeRow(sumStart + 1, 'G', sumStart + 1, 'H');
      setCell(sumStart + 1, 7, 'INTEGRATED GST (18.00%):', { bold: true, align: { horizontal: 'left', vertical: 'middle' } });
      const val2 = setCell(sumStart + 1, 9, { formula: `I${r-3}`, result: parseFloat(doc.totalIgst || doc.total_igst || 0) }, { bold: true, align: { horizontal: 'right', vertical: 'middle' } });
      val2.numFmt = '#,##0.00';
      sheet.getRow(sumStart + 1).height = 25;

      mergeRow(sumStart + 2, 'G', sumStart + 2, 'H');
      setCell(sumStart + 2, 7, 'GRAND TOTAL (INR):', { bold: true, size: 10, align: { horizontal: 'left', vertical: 'middle' }, color: 'FF166534' });
      const val3 = setCell(sumStart + 2, 9, { formula: `I${sumStart} + I${sumStart + 1}`, result: parseFloat(doc.grandTotal || doc.grand_total || 0) }, { bold: true, size: 10, align: { horizontal: 'right', vertical: 'middle' }, color: 'FF166534' });
      val3.numFmt = '#,##0.00';
      sheet.getRow(sumStart + 2).height = 25;
      r += 3;

      // Weights
      mergeRow(r, 'A', r, 'I');
      setCell(r, 1, `NET WT: ${parseFloat(doc.netWeight || doc.net_weight || 0).toFixed(1)} KGS        GROSS WT: ${parseFloat(doc.grossWeight || doc.gross_weight || 0).toFixed(1)} KGS        TOTAL PALLETS: ${doc.totalPallets || doc.total_pallets || 0}        TOTAL QTY: ${parseFloat(doc.totalQuantity || doc.total_quantity || 0).toFixed(2)} SQM`, { bold: true, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // Amount in words
      mergeRow(r, 'A', r, 'I');
      setCell(r, 1, `AMOUNT CHARGEABLE IN WORDS:\n${doc.amountInWords || doc.amount_in_words || numberToWords(doc.grandTotal || doc.grand_total || 0)}`, { bold: true, italic: true, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 35;
      r++;

      // Bank & Signature
      mergeRow(r, 'A', r + 1, 'E');
      setCell(r, 1, `EXPORTER BANK DETAILS:\nBANK NAME: ${bankName}\nA/C HOLDER: ${accName}\nA/C NUMBER: ${accNo}\nSWIFT CODE: ${swift}\nBRANCH ADDRESS: ${bankAddr}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'F', r + 1, 'I');
      setCell(r, 6, `FOR, ${exporterName}\n\n\n\n\nAUTHORIZED SIGNATORY`, { bold: true, align: { horizontal: 'center', vertical: 'top' } });
      sheet.getRow(r).height = 40;
      sheet.getRow(r + 1).height = 40;

      // Ensure all borders are drawn inside merged regions
      for (let row = 1; row <= r + 1; row++) {
        for (let col = 1; col <= 9; col++) {
          const cell = sheet.getCell(row, col);
          if (!cell.border) cell.border = brd;
        }
      }

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = generateEnterpriseFilename({
        moduleName: 'IGST-INVOICE',
        documentNo: docNo,
        clientName: clientName,
        date: date,
        extension: 'xlsx',
        isProductExport: true
      });
      saveAs(new Blob([buffer]), filename);
      return true;
    }
    // ─────────────────────────────────────────────────────────────────
    // PACKING LIST: Dedicated Layout
    // ─────────────────────────────────────────────────────────────────
    else if (moduleType === 'Packing List' || moduleType === 'PACKING LIST' || moduleType === 'packing_list') {
      sheet.columns = [
        { width: 45 },  // A: MATERIAL DESCRIPTION
        { width: 12 },  // B: BOXES/SETS
        { width: 15 },  // C: QUANTITY (SQM)
        { width: 15 },  // D: NET WEIGHT (KGS)
        { width: 15 },  // E: GROSS WEIGHT (KGS)
      ];

      const doc = documentData.packingList || documentData.packing_list || documentData || {};
      const allProducts = [...tileProducts, ...sanitaryProducts];
      
      const B_style = { style: 'thin' };
      const brd = { top: B_style, left: B_style, bottom: B_style, right: B_style };
      const setCell = (row, col, value, opts = {}) => {
        const cell = sheet.getCell(row, col);
        cell.value = value;
        if (opts.bold !== undefined) cell.font = { bold: opts.bold, size: opts.size || 8 };
        else if (opts.size) cell.font = { size: opts.size };
        if (opts.italic) cell.font = { ...cell.font, italic: true };
        if (opts.align) cell.alignment = { ...opts.align, wrapText: true };
        if (opts.color) cell.font = { ...(cell.font || {}), color: { argb: opts.color } };
        if (opts.bg)   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
        cell.border = brd;
        return cell;
      };

      const mergeRow = (r1, c1, r2, c2) => {
        sheet.mergeCells(`${c1}${r1}:${c2}${r2}`);
      };

      let r = 1;

      // Row 1: Header
      mergeRow(r, 'A', r, 'E');
      setCell(r, 1, 'PACKING LIST', { bold: true, size: 16, align: { horizontal: 'center', vertical: 'middle' } });
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, { tl: { col: 3.8, row: 0.1 }, ext: { width: 120, height: 40 } });
      }
      sheet.getRow(r).height = 50;
      r++;

      // Row 2-3: Exporter & Inv No
      mergeRow(r, 'A', r+1, 'B');
      setCell(r, 1, `EXPORTER:-\n${exporterName}\n${exporterAddress}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'C', r, 'E');
      setCell(r, 3, `INVOICE NO. & DATE\n${invNo} / ${invDate}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 25;
      
      mergeRow(r+1, 'C', r+1, 'D');
      setCell(r+1, 3, `PRO-FORMA INVOICE NO & DATE\n${piNo} / ${piDate}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r+1, 5, `I.E.C. NO.\n${iecNo}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r+1).height = 25;
      r += 2;

      // Row 4-5: Consignee & Buyer Order
      mergeRow(r, 'A', r+1, 'B');
      setCell(r, 1, `CONSIGNEE:-\n${consignee}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, `BUYER'S ORDER NO. & DATE:-\n${buyerOrderNo} / ${buyerOrderDate}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r, 5, `GSTN:\n${gstn}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 25;

      mergeRow(r+1, 'C', r+1, 'D');
      setCell(r+1, 3, `SHIPMENT TERMS:-\n${deliveryTerms}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r+1, 5, `TARIFF CODE:-\n${tariffCode}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r+1).height = 25;
      r += 2;

      // Row 6-7: Buyer & Origin/Dest + Payment Terms
      mergeRow(r, 'A', r+1, 'B');
      setCell(r, 1, `BUYER:-\n${buyer}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });

      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, `COUNTRY OF ORIGIN\n${origin}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r, 5, `COUNTRY OF FINAL DESTINATION\n${dest}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 25;

      mergeRow(r+1, 'C', r+1, 'E');
      setCell(r+1, 3, `PAYMENT TERMS:-\n${paymentTerms}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r+1).height = 25;
      r += 2;

      // Row 8-10: Logistics & Bank
      setCell(r, 1, `PRE-CARRIAGE BY :-\n${preCarriage}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r, 2, `PLACE OF RECEIPT\n${receiptPlace}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'C', r+2, 'E');
      setCell(r, 3, `OUR BANK DETAILS:-\nA/C Name: ${accName}\nA/C No.: ${accNo}\nBank Name: ${bankName}\nBank Address: ${bankAddr}\nSWIFT CODE: ${swift}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;

      setCell(r+1, 1, `VESSEL FLIGHT NO:-\n${vessel}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r+1, 2, `PORT OF LOADING\n${pol}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r+1).height = 30;

      setCell(r+2, 1, `PORT OF DISCHARGE\n${pod}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r+2, 2, `FINAL DESTINATION\n${dest}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r+2).height = 30;
      r += 3;

      // Table Headers
      const headers = ['MATERIAL DESCRIPTION', 'BOXES/SETS', 'QUANTITY\n(SQM)', 'NET WEIGHT\n(KGS)', 'GROSS WEIGHT\n(KGS)'];
      headers.forEach((h, i) => {
        setCell(r, i + 1, h, { bold: true, size: 8, bg: 'FFF8F9FA', align: { horizontal: 'center', vertical: 'middle' } });
      });
      sheet.getRow(r).height = 30;
      r++;

      // Pallets total header
      const totalPallets = doc.totalPallets || doc.total_pallets || documentData.totalPallets || documentData.total_pallets || '-';
      mergeRow(r, 'A', r, 'E');
      setCell(r, 1, `TOTAL ${totalPallets} PALLETS`, { bold: true, size: 9, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // Products
      let tBoxes = 0, tSqm = 0, tNet = 0, tGross = 0;
      allProducts.forEach(p => {
        const isSanitaryware = p.product_type === 'sanitaryware' || p.productType === 'sanitaryware' || p.type === 'sanitaryware' || p.item_name;
        const name = p.productName || p.product_name || p.materialDescription || p.material_description || p.item_name || '';
        const desc = p.materialDescription || p.material_description || p.description || p.productDescription || '';
        const finalDesc = (name !== desc && desc ? `${name}\n${desc}` : name);
        
        const boxes = parseInt(p.boxQuantity || p.box_quantity || p.boxes || p.pieces || p.pcs || p.totalBoxes || p.total_boxes || 0, 10);
        const sqm = isSanitaryware ? 0 : parseFloat(p.sqmAuto || p.sqm_auto || p.sqm || 0);
        const net = parseFloat(p.netWeight || p.net_weight || 0);
        const gross = parseFloat(p.grossWeight || p.gross_weight || 0);

        tBoxes += boxes;
        tSqm += sqm;
        tNet += net;
        tGross += gross;

        setCell(r, 1, finalDesc, { bold: true, align: { horizontal: 'left', vertical: 'top' } });
        setCell(r, 2, boxes, { align: { horizontal: 'center', vertical: 'top' } });
        
        const sqCell = setCell(r, 3, sqm || '-', { align: { horizontal: 'center', vertical: 'top' } });
        if(sqm) sqCell.numFmt = '#,##0.00';
        
        const netCell = setCell(r, 4, net, { align: { horizontal: 'center', vertical: 'top' } });
        netCell.numFmt = '#,##0.00';

        const grossCell = setCell(r, 5, gross, { align: { horizontal: 'center', vertical: 'top' } });
        grossCell.numFmt = '#,##0.00';

        sheet.getRow(r).height = 35;
        r++;
      });

      // Packing Reference
      mergeRow(r, 'A', r, 'E');
      setCell(r, 1, 'PACKING DETAILS AS PER ANNEXURE', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // Totals
      setCell(r, 1, 'TOTAL', { bold: true, align: { horizontal: 'center', vertical: 'middle' } });
      setCell(r, 2, tBoxes, { bold: true, align: { horizontal: 'center', vertical: 'middle' } });
      const tsCell = setCell(r, 3, tSqm, { bold: true, align: { horizontal: 'center', vertical: 'middle' } });
      tsCell.numFmt = '#,##0.00';
      const tnCell = setCell(r, 4, tNet, { bold: true, align: { horizontal: 'center', vertical: 'middle' } });
      tnCell.numFmt = '#,##0.00';
      const tgCell = setCell(r, 5, tGross, { bold: true, align: { horizontal: 'center', vertical: 'middle' } });
      tgCell.numFmt = '#,##0.00';
      sheet.getRow(r).height = 25;
      r++;

      // Footer - instructions and signature
      const palletType = doc.palletType || doc.pallet_type || documentData.pallet_type || 'MADE IN INDIA';
      const tilesBack = doc.tilesBack || doc.tiles_back || documentData.tiles_back || 'YES';
      const boxesMarking = doc.boxesMarking || doc.boxes_marking || documentData.boxes_marking || 'YES';
      const boxType = doc.boxType || doc.box_type || documentData.box_type || 'NON BRANDED BOXES';
      const fumigation = doc.fumigation || documentData.fumigation || 'YES';
      const legalisation = doc.legalisation || documentData.legalisation || 'NO';
      const otherInstr = doc.otherInstructions || doc.other_instructions || documentData.other_instructions || '-';

      const amountWhole = Math.floor(documentData.totalAmountAll || documentData.grandTotal || documentData.grand_total || documentData.total_amount || 0);
      const amountCents = Math.round(((documentData.totalAmountAll || documentData.grandTotal || documentData.grand_total || documentData.total_amount || 0) - amountWhole) * 100);
      let amountWords = 'USD ' + numberToWords(amountWhole);
      if(amountCents > 0) amountWords += ' AND CENTS ' + numberToWords(amountCents);
      amountWords += ' ONLY.';

      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, `1. PALLETS :- ${palletType}\n2. MADE IN INDIA :-\n   TILES BACK: ${tilesBack}\n   BOXES: ${boxesMarking}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      setCell(r, 3, `3. BOXES :- ${boxType}\n4. FUMIGATION :- ${fumigation}\n5. LEGALISATION :- ${legalisation}\n6. OTHER :- ${otherInstr}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });

      mergeRow(r, 'D', r+1, 'E');
      setCell(r, 4, `TOTAL FOR MUNDRA VALUE :- ${amountWords}\n\n\n                      FOR, ${exporterName}\n\n\n\n\n\n                      (AUTHORIZED SIGNATORY)`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 80;

      mergeRow(r+1, 'A', r+1, 'B');
      setCell(r+1, 1, `NET WEIGHT\n\n${parseFloat(documentData.netWeight || documentData.net_weight || documentData.netWt || documentData.net_wt || tNet || 0).toFixed(2)} KGS`, { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      
      setCell(r+1, 3, `GROSS WEIGHT\n\n${parseFloat(documentData.grossWeight || documentData.gross_weight || documentData.grossWt || documentData.gross_wt || tGross || 0).toFixed(2)} KGS`, { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r+1).height = 60;
      r += 1;

      // Ensure all borders are drawn inside merged regions
      for (let row = 1; row <= r; row++) {
        for (let col = 1; col <= 5; col++) {
          const cell = sheet.getCell(row, col);
          if (!cell.border) cell.border = brd;
        }
      }

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = generateEnterpriseFilename({
        moduleName: 'PACKING-LIST',
        documentNo: docNo,
        clientName: clientName,
        date: date,
        extension: 'xlsx',
        isProductExport: true
      });
      saveAs(new Blob([buffer]), filename);
      return true;
    }
    // ─────────────────────────────────────────────────────────────────
    // EXPORT INVOICE ANNEXURE: Dedicated Layout
    // ─────────────────────────────────────────────────────────────────
    else if (['Annexure', 'ANNEXURE', 'annexure', 'Export Invoice Annexure'].includes(moduleType)) {
      sheet.columns = [
        { width: 5 },   // A: SR.
        { width: 14 },  // B: CONTAINER NO.
        { width: 14 },  // C: LINE SEAL
        { width: 14 },  // D: E-SEAL
        { width: 32 },  // E: MATERIAL DESCRIPTION
        { width: 10 },  // F: PALLET NO.
        { width: 12 },  // G: PALLET DETAIL
        { width: 10 },  // H: SQM
        { width: 10 },  // I: BOX
        { width: 12 },  // J: GROSS WT
      ];

      const doc = documentData.annexure || documentData || {};
      const B_style = { style: 'thin' };
      const brd = { top: B_style, left: B_style, bottom: B_style, right: B_style };

      const setCell = (row, col, value, opts = {}) => {
        const cell = sheet.getCell(row, col);
        cell.value = value;
        if (opts.bold !== undefined) cell.font = { bold: opts.bold, size: opts.size || 8 };
        else if (opts.size) cell.font = { size: opts.size };
        if (opts.italic) cell.font = { ...cell.font, italic: true };
        if (opts.align) cell.alignment = { ...opts.align, wrapText: true };
        if (opts.color) cell.font = { ...(cell.font || {}), color: { argb: opts.color } };
        if (opts.bg)   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
        cell.border = brd;
        return cell;
      };

      const mergeRow = (r1, c1, r2, c2) => { sheet.mergeCells(`${c1}${r1}:${c2}${r2}`); };

      let r = 1;

      // 1. Header
      mergeRow(r, 'A', r, 'J');
      setCell(r, 1, 'INVOICE ANNEXURE\nCONTAINER & PACKING DETAILS', { bold: true, size: 12, align: { horizontal: 'center', vertical: 'middle' } });
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, { tl: { col: 8.5, row: 0.1 }, ext: { width: 100, height: 35 } });
      }
      sheet.getRow(r).height = 40;
      r++;

      // 2. Exporter / Dates
      mergeRow(r, 'A', r+2, 'D');
      setCell(r, 1, `EXPORTER :-\n${exporterName}\n${exporterAddress}\n\nIEC: ${iecNo || 'N/A'}    PAN: ${doc.bin_no || doc.binNo || gstn?.slice(2, 12) || 'N/A'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'E', r, 'J');
      const eInvNo = doc.export_invoice_no || doc.invoice_no || invNo || '-';
      const eInvDate = formatDisplayDate(doc.export_invoice_date || doc.invoice_date || invDate) || '-';
      setCell(r, 5, `ANNEXURE TO INVOICE INVOICE NO. & DATE\n${eInvNo}   ${eInvDate}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 25;
      r++;

      mergeRow(r, 'E', r, 'J');
      setCell(r, 5, `CONSIGNEE\n${doc.consignee_details || doc.consigneeDetails || consignee || 'TO THE ORDER'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      mergeRow(r, 'E', r, 'J');
      setCell(r, 5, `BUYER\n${doc.buyer_details || doc.buyerDetails || buyer || 'TO THE ORDER'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // 3. Vessel / Loading / Origin / Dest
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, 'VESSEL FLIGHT NO.', { bold: true, size: 7, bg: 'FFF8F9FA' });
      setCell(r, 4, 'PORT OF LOADING', { bold: true, size: 7, bg: 'FFF8F9FA' });
      mergeRow(r, 'E', r, 'H');
      setCell(r, 5, 'COUNTRY OF ORIGIN', { bold: true, size: 7, bg: 'FFF8F9FA' });
      mergeRow(r, 'I', r, 'J');
      setCell(r, 9, 'COUNTRY OF FINAL DESTINATION', { bold: true, size: 7, bg: 'FFF8F9FA' });
      sheet.getRow(r).height = 20;
      r++;

      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, doc.vessel_flight_no || doc.vesselFlightNo || vessel || '-', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      setCell(r, 4, doc.port_of_loading || doc.portOfLoading || pol || '-', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'E', r+2, 'H');
      setCell(r, 5, doc.country_of_origin || doc.countryOfOrigin || origin || '-', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'I', r+2, 'J');
      const finDestCountry = (doc.country_of_final_destination && doc.country_of_final_destination !== 'country') ? doc.country_of_final_destination :
                           (doc.countryOfFinalDestination && doc.countryOfFinalDestination !== 'country') ? doc.countryOfFinalDestination :
                           (doc.country && doc.country !== 'country') ? doc.country : '-';
      setCell(r, 9, finDestCountry, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, 'PORT OF DISCHARGE', { bold: true, size: 7, bg: 'FFF8F9FA' });
      setCell(r, 4, 'FINAL DESTINATION', { bold: true, size: 7, bg: 'FFF8F9FA' });
      sheet.getRow(r).height = 20;
      r++;

      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, doc.port_of_discharge || doc.portOfDischarge || pod || '-', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      setCell(r, 4, doc.final_destination || doc.finalDestination || dest || '-', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 4. Product Header
      mergeRow(r, 'A', r, 'J');
      setCell(r, 1, doc.material_header_description || doc.materialHeaderDescription || doc.product_description || doc.productDescription || doc.product_category || 'GLAZED PORCELAIN TILES', { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // 5. Table Headers
      const headers = ['SR.', 'CONTAINER NO.', 'LINE SEAL', 'E-SEAL', 'MATERIAL DESCRIPTION', 'PALLET NO.', 'PALLET DETAIL', 'SQM', 'BOX', 'GROSS WT'];
      headers.forEach((h, i) => {
        setCell(r, i + 1, h, { bold: true, size: 7, bg: 'FFF8F9FA', align: { horizontal: 'center', vertical: 'middle' } });
      });
      sheet.getRow(r).height = 25;
      r++;

      // 6. Data
      let containerArr = [];
      if (doc.container_details || doc.containerDetails) {
        let cs = doc.container_details || doc.containerDetails;
        if (typeof cs === 'string') { try { cs = JSON.parse(cs); } catch { cs = []; } }
        containerArr = Array.isArray(cs) ? cs : [];
      } else if (containers && containers.length > 0) {
        containerArr = containers;
      }

      let cSqm = 0, cBox = 0, cGr = 0;
      containerArr.forEach((c, idx) => {
        const sq = parseFloat(c.sqm || c.total_sqm || c.totalSqm || 0);
        const bx = parseInt(c.boxes || c.total_boxes || c.box || c.boxQuantity || 0, 10);
        const gr = parseFloat(c.gross_weight || c.grossWeight || c.grossWt || c.gross_wt || c.vgm_weight || c.vgmWeight || 0);
        
        cSqm += sq; cBox += bx; cGr += gr;

        setCell(r, 1, idx + 1, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 2, c.container_no || c.containerNo || '-', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 3, c.line_seal_no || c.lineSealNo || '-', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 4, c.e_seal_no || c.eSealNo || '-', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });

        const isFoc = !!(c.is_foc || c.isFoc);
        let desc = '';
        if (isFoc) desc += 'FREE OF COST SAMPLE NO COMMERCIAL VALUE\n';
        const pName = c.product_name || c.productName || '';
        const mDesc = c.material_description || c.materialDescription || '';
        if (pName && pName.toLowerCase() !== 'unknown' && pName.toLowerCase() !== 'name') {
          desc += pName + '\n';
        }
        if (mDesc && mDesc !== pName && mDesc.toLowerCase() !== 'name' && mDesc.toLowerCase() !== 'unknown' && mDesc !== '-') {
          desc += mDesc;
        }
        setCell(r, 5, desc.trim(), { size: 7, align: { horizontal: 'left', vertical: 'top' } });
        
        setCell(r, 6, c.pallet_no || c.palletNo || c.pallet_detail || c.palletDetail || c.pallet || '-', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 7, c.detail || c.details || '-', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        
        const cSq = setCell(r, 8, sq, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        cSq.numFmt = '#,##0.00';
        setCell(r, 9, bx, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        const cGrs = setCell(r, 10, gr, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        cGrs.numFmt = '#,##0.00';
        
        sheet.getRow(r).height = 35;
        r++;
      });

      // 7. Total Row
      mergeRow(r, 'A', r, 'F');
      setCell(r, 1, 'TOTAL :-', { bold: true, size: 8, align: { horizontal: 'right', vertical: 'middle' }, bg: 'FFF8F9FA' });
      setCell(r, 7, doc.total_pallets || doc.totalPallets || '-', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' }, bg: 'FFF8F9FA' });
      const tSq = setCell(r, 8, cSqm, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' }, bg: 'FFF8F9FA' });
      tSq.numFmt = '#,##0.00';
      setCell(r, 9, cBox, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' }, bg: 'FFF8F9FA' });
      const tGrs = setCell(r, 10, cGr, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' }, bg: 'FFF8F9FA' });
      tGrs.numFmt = '#,##0.00';
      sheet.getRow(r).height = 20;
      r++;

      // 8. Footer (Instructions & Signature)
      mergeRow(r, 'A', r+1, 'D');
      setCell(r, 1, `1. PALLETS :- ${doc.pallet_type || doc.palletType || 'NORMAL WOODEN PALLETS'}\n2. MADE IN INDIA :-\n   TILES BACK: ${doc.tiles_back || doc.tilesBack || 'MADE IN INDIA'}\n   BOXES: ${doc.marks_and_numbers || doc.marksAndNumbers || doc.made_in_india || doc.madeInIndia || 'MADE IN INDIA'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });

      mergeRow(r, 'E', r+1, 'G');
      setCell(r, 5, `3. BOXES :- ${doc.box_type || doc.boxType || 'NON BRANDED BOXES'}\n4. FUMIGATION :- ${doc.fumigation || 'YES'}\n5. LEGALISATION :- ${doc.legalisation || 'NO'}\n6. OTHER :- ${doc.other_instructions || doc.otherInstructions || 'NO'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });

      mergeRow(r, 'H', r+2, 'J');
      setCell(r, 8, `FOR, ${exporterName}\n\n\n\n(AUTHORIZED SIGNATORY)`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'top' } });
      sheet.getRow(r).height = 40;
      r += 2; // (rows r and r+1 are merged for instructions, so advance by 2 for the next section on cols 1-7)

      // 9. Weights Footer
      mergeRow(r, 'A', r, 'D');
      const tNet = parseFloat(doc.netWeight || doc.net_weight || 0);
      setCell(r, 1, `NET WEIGHT\n${tNet.toFixed(2)} KGS`, { bold: true, size: 10, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'E', r, 'G');
      setCell(r, 5, `GROSS WEIGHT\n${cGr.toFixed(2)} KGS`, { bold: true, size: 10, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Borders
      for (let row = 1; row < r; row++) {
        for (let col = 1; col <= 10; col++) {
          const cell = sheet.getCell(row, col);
          if (!cell.border) cell.border = brd;
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = generateEnterpriseFilename({ moduleName: 'INVOICE-ANNEXURE', documentNo: docNo, clientName, date, extension: 'xlsx', isProductExport: true });
      saveAs(new Blob([buffer]), filename);
      return true;
    }
    // ─────────────────────────────────────────────────────────────────
    // INVOICE BACKSIDE (ANNEXURE): Dedicated Layout
    // ─────────────────────────────────────────────────────────────────
    else if (['Invoice Backside', 'INVOICE BACKSIDE', 'invoice_backside'].includes(moduleType)) {
      sheet.columns = [
        { width: 7 },   // A: SR.NO.
        { width: 14 },  // B: CONTAINER NO.
        { width: 14 },  // C: SEAL NO.
        { width: 14 },  // D: E SEAL NO.
        { width: 10 },   // E: SIZE
        { width: 10 },  // F: SQM
        { width: 11 },  // G: BOXES/PCS
        { width: 12 },  // H: NET WEIGHT
        { width: 12 },  // I: GROSS WEIGHT
      ];

      const doc = documentData.invoiceBackside || documentData.annexure || documentData || {};
      const B_style = { style: 'thin' };
      const brd = { top: B_style, left: B_style, bottom: B_style, right: B_style };
      
      const setCell = (row, col, value, opts = {}) => {
        const cell = sheet.getCell(row, col);
        cell.value = value;
        if (opts.bold !== undefined) cell.font = { bold: opts.bold, size: opts.size || 8 };
        else if (opts.size) cell.font = { size: opts.size };
        if (opts.italic) cell.font = { ...cell.font, italic: true };
        if (opts.align) cell.alignment = { ...opts.align, wrapText: true };
        if (opts.color) cell.font = { ...(cell.font || {}), color: { argb: opts.color } };
        if (opts.bg)   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
        cell.border = brd;
        return cell;
      };

      const mergeRow = (r1, c1, r2, c2) => {
        sheet.mergeCells(`${c1}${r1}:${c2}${r2}`);
      };

      let r = 1;

      // 1. Header
      mergeRow(r, 'A', r, 'I');
      setCell(r, 1, 'ANNEXURE\nOFFICE OF THE SUPERINTENDENT OF CENTRAL GST', { bold: true, size: 12, align: { horizontal: 'center', vertical: 'middle' } });
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, { tl: { col: 7.5, row: 0.1 }, ext: { width: 100, height: 35 } });
      }
      sheet.getRow(r).height = 40;
      r++;

      // 2. Range/Division
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, `RANGE : ${doc.range || 'SFD'}\nCOMMISSIONERATE : ${doc.commissionerate || 'DF'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'I');
      setCell(r, 5, `DIVISION : ${doc.division || 'SDF'}`, { bold: true, size: 8, align: { horizontal: 'right', vertical: 'top' } });
      sheet.getRow(r).height = 25;
      r++;

      // 3. C.NO / Dates
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, 'C.NO.', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, 'DATE\n-', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'E', r, 'G');
      setCell(r, 5, 'SHIPPING BILL NO.\n(TO BE GIVEN BY C.H.)', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'H', r, 'I');
      setCell(r, 8, 'DATE\n-', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 25;
      r++;

      // 4. Exporter
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, '1 NAME OF EXPORTER', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, `${exporterName}\n${exporterAddress}`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // 5-7. IEC
      mergeRow(r, 'A', r+2, 'C');
      setCell(r, 1, '2 (A) I.E.CODE NO.\n   (B) BRANCH CODE NO.\n   (C) BIN NO.', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, `I.E.C.NO.${iecNo}`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r+1, 'D', r+1, 'I');
      setCell(r+1, 4, 'N/A', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r+2, 'D', r+2, 'I');
      setCell(r+2, 4, 'N/A', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      r += 3;

      // 8. Manufacturer
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, '3 NAME OF THE MANUFACTURER\n(DIFFERENT FROM THE EXPORTER)', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, `${exporterName}\n${exporterAddress}`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // 9. Factory Address
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, '4 FACTORY ADDRESS', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, 'AT MORBI\nAS ABOVE', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // 10. Date of exam
      const examDate = formatDisplayDate(doc.examination_date || date) || '-';
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, '5 DATE OF EXAMINATION', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, examDate, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      r++;

      // 11. Examining officer 1
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, '6 NAME AND DESIGNATION OF THE EXAMINING\nOFFICER / INSPECTOR / EO / PO', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, 'SELF SEALING', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // 12. Examining officer 2
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, '7 NAME AND DESIGNATION OF THE EXAMINING\nOFFICER / APPRAISER / SUPERINTENDENT', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, 'SELF SEALING', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // 13-14. Commissionerate
      mergeRow(r, 'A', r+1, 'C');
      setCell(r, 1, '8 (A) NAME OF COMMISERATE / DIVISION / RANGE\n   (B) LOCATION CODE', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, 'SELF SEALING', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r+1, 'D', r+1, 'I');
      setCell(r+1, 4, 'N/A', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      r += 2;

      // 15-18. Particulars
      const eInvNo = doc.export_invoice_no || doc.invoice_no || invNo || '-';
      const eInvDate = formatDisplayDate(doc.export_invoice_date || doc.invoice_date || invDate) || '-';
      const tPallets = doc.total_pallets || doc.totalPallets || documentData.totalPallets || '-';
      const tBoxesStr = doc.total_boxes || doc.totalBoxes || documentData.totalBoxes || '-';
      
      mergeRow(r, 'A', r+3, 'C');
      setCell(r, 1, '9 PARTICULARS OF EXPORT INVOICE\n(a) EXPORT INVOICE No\n(b) TOTAL No. OF PACKAGES\n(c) NAME AND ADDRESS OF THE CONSIGNEE ABROAD', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      setCell(r, 4, eInvNo, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, eInvDate, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      setCell(r, 7, 'BOXES', { bold: true, size: 7, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'H', r, 'I');
      setCell(r, 8, `TOTAL ${tPallets}\nPALLETS`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      mergeRow(r, 'D', r, 'I');
      setCell(r, 4, tBoxesStr, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      r++;

      mergeRow(r, 'D', r+1, 'I');
      setCell(r, 4, consignee, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r += 2;

      // 19. Goods desc
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, '(A) IS THE DESCRIPTION OF THE GOODS THE QUANTITY\nAND THERE VALUE AS PER PARTICULARS\nFURNISHED IN THE EXPORT INVOICE', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'I');
      setCell(r, 5, 'YES', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 30;
      r++;

      // 20. Samples drawn
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, '(B) WHETHER SAMPLES IS DRAWN FOR BEING', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'I');
      setCell(r, 5, 'N.A.', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      r++;

      // 21. Sample seal
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, '(C) IF YES THE NO. OF THE SEAL OF THE\nPACKAGE CONTAINING THE SAMPLE', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'I');
      setCell(r, 5, 'N.A.', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 22. Custom seal
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, 'CENTRAL EXCISE / CUSTOM SEAL NO.\n(A) FOR NON CONTAINERISED CARGO\nNO.OF PACKAGES', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'I');
      setCell(r, 5, 'N.A.', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 30;
      r++;

      // 23. Containerised cargo
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, '(II) FOR CONTAINERISED CARGO', { bold: true, size: 7, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'I');
      setCell(r, 5, 'AS PER ATTACHMENT', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      r++;

      // 24. Table headers
      const headers = ['SR.NO.', 'CONTAINER NO.', 'SEAL NO.', 'E SEAL NO.', 'SIZE', 'SQM', 'BOXES / PCS', 'NET WEIGHT', 'GROSS WEIGHT'];
      headers.forEach((h, i) => {
        setCell(r, i + 1, h, { bold: true, size: 7, align: { horizontal: 'center', vertical: 'middle' } });
      });
      sheet.getRow(r).height = 25;
      r++;

      // 25. Containers
      let containerArr = [];
      if (doc.container_details || doc.containerDetails) {
        let cs = doc.container_details || doc.containerDetails;
        if (typeof cs === 'string') { try { cs = JSON.parse(cs); } catch { cs = []; } }
        containerArr = Array.isArray(cs) ? cs : [];
      } else if (containers && containers.length > 0) {
        containerArr = containers;
      }

      let tSqm = 0, tBox = 0, tNet = 0, tGross = 0;
      containerArr.forEach((c, i) => {
        const sq = parseFloat(c.sqm || c.total_sqm || 0);
        const bx = parseInt(c.boxes || c.total_boxes || c.box || c.boxQuantity || 0, 10);
        const nt = parseFloat(c.net_weight || c.netWeight || c.netWt || c.net_wt || c.cargo_weight || c.cargo_wt || c.cargoWeight || 0);
        const gr = parseFloat(c.gross_weight || c.grossWeight || c.grossWt || c.gross_wt || c.vgm_weight || c.vgmWeight || 0);
        
        tSqm += sq; tBox += bx; tNet += nt; tGross += gr;

        setCell(r, 1, i + 1, { size: 7, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 2, c.container_no || c.containerNo || '-', { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 3, c.line_seal_no || c.lineSealNo || c.seal_no || c.sealNo || '-', { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 4, c.e_seal_no || c.eSealNo || '-', { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 5, c.size || c.container_size || c.containerSize || "20'", { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        
        const sc = setCell(r, 6, sq, { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        sc.numFmt = '#,##0.00';
        setCell(r, 7, bx, { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        
        const nc = setCell(r, 8, nt, { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        nc.numFmt = '#,##0.00';
        const gc = setCell(r, 9, gr, { size: 8, bold: true, align: { horizontal: 'center', vertical: 'middle' } });
        gc.numFmt = '#,##0.00';
        
        sheet.getRow(r).height = 20;
        r++;
      });

      // Total row
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, '', { bg: 'FFF8F9FA' });
      setCell(r, 5, 'TOTAL :-', { bold: true, size: 8, bg: 'FFF8F9FA', align: { horizontal: 'right', vertical: 'middle' } });
      const ts = setCell(r, 6, tSqm, { bold: true, size: 8, bg: 'FFF8F9FA', align: { horizontal: 'center', vertical: 'middle' } });
      ts.numFmt = '#,##0.00';
      setCell(r, 7, tBox, { bold: true, size: 8, bg: 'FFF8F9FA', align: { horizontal: 'center', vertical: 'middle' } });
      const tn = setCell(r, 8, tNet, { bold: true, size: 8, bg: 'FFF8F9FA', align: { horizontal: 'center', vertical: 'middle' } });
      tn.numFmt = '#,##0.00';
      const tg = setCell(r, 9, tGross, { bold: true, size: 8, bg: 'FFF8F9FA', align: { horizontal: 'center', vertical: 'middle' } });
      tg.numFmt = '#,##0.00';
      sheet.getRow(r).height = 20;
      r++;

      // Permission
      mergeRow(r, 'A', r, 'I');
      setCell(r, 1, `PERMISSION NO.      ${doc.permission_no || doc.permissionNo || 'DGGDF'}`, { bold: true, size: 9, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // Examined text
      mergeRow(r, 'A', r, 'I');
      const arnDateStr = doc.lut_date || doc.lutDate ? formatDisplayDate(doc.lut_date || doc.lutDate) : '23.02.2026';
      setCell(r, 1, `EXAMINED THE EXPORT GOODS COVERED UNDER THIS INVOICE , DESCRIPTION OF THE GOODS WITH REFERENCE TO DUTY DRAWBACK SCHEDULE .\n WEIGHT ARE AS UNDER\n EXPORT UNDER LUT ARN BOND NO. F. NO : - ${doc.lut_bond_ref || doc.lutBondRef || 'AD240225056221K'} DT. ${arnDateStr}`, { bold: true, size: 7, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 40;
      r++;

      // Final Weights Footer
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, `NET WEIGHT   ${parseFloat(documentData.netWeight || documentData.net_weight || documentData.netWt || documentData.net_wt || tNet || 0).toFixed(2)}`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      setCell(r, 4, 'KGS', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'G');
      setCell(r, 5, `GROSS WEIGHT   ${parseFloat(documentData.grossWeight || documentData.gross_weight || documentData.grossWt || documentData.gross_wt || tGross || 0).toFixed(2)}`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'H', r, 'I');
      setCell(r, 8, 'KGS', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // Ensure all borders are drawn inside merged regions
      for (let row = 1; row < r; row++) {
        for (let col = 1; col <= 9; col++) {
          const cell = sheet.getCell(row, col);
          if (!cell.border) cell.border = brd;
        }
      }

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = generateEnterpriseFilename({
        moduleName: 'INVOICE-BACKSIDE',
        documentNo: docNo,
        clientName: clientName,
        date: date,
        extension: 'xlsx',
        isProductExport: true
      });
      saveAs(new Blob([buffer]), filename);
      return true;
    }
    // ─────────────────────────────────────────────────────────────────
    // END INVOICE BACKSIDE — all other modules continue below
    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
    // EXPORT INVOICE: Dedicated Layout
    // ─────────────────────────────────────────────────────────────────
    else if (['Export Invoice', 'EXPORT INVOICE', 'export_invoice', 'Invoice', 'INVOICE'].includes(moduleType)) {
      sheet.columns = [
        { width: 45 },  // A: MATERIAL DESCRIPTION
        { width: 15 },  // B: HSN
        { width: 15 },  // C: BOXES
        { width: 15 },  // D: SQM
        { width: 20 },  // E: RATE
        { width: 25 },  // F: AMOUNT
      ];

      const doc = documentData.exportInvoice || documentData.export_invoice || documentData || {};
      const B_style = { style: 'thin' };
      const brd = { top: B_style, left: B_style, bottom: B_style, right: B_style };

      const setCell = (row, col, value, opts = {}) => {
        const cell = sheet.getCell(row, col);
        cell.value = value;
        if (opts.bold !== undefined) cell.font = { bold: opts.bold, size: opts.size || 8 };
        else if (opts.size) cell.font = { size: opts.size };
        if (opts.italic) cell.font = { ...cell.font, italic: true };
        if (opts.align) cell.alignment = { ...opts.align, wrapText: true };
        if (opts.color) cell.font = { ...(cell.font || {}), color: { argb: opts.color } };
        if (opts.bg)   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
        cell.border = brd;
        return cell;
      };

      const mergeRow = (r1, c1, r2, c2) => { sheet.mergeCells(`${c1}${r1}:${c2}${r2}`); };

      let r = 1;

      // Row 1: Title & Logo
      mergeRow(r, 'A', r, 'F');
      setCell(r, 1, 'INVOICE', { bold: true, size: 16, align: { horizontal: 'center', vertical: 'middle' } });
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, { tl: { col: 4.8, row: 0.1 }, ext: { width: 100, height: 35 } });
      }
      sheet.getRow(r).height = 35;
      r++;

      // Row 2: Declaration
      mergeRow(r, 'A', r, 'F');
      setCell(r, 1, `${doc.supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND'}\n${doc.ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'}`, { bold: true, size: 7, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 25;
      r++;

      // Row 3: Exporter vs Inv No
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, `EXPORTER :-\n${exporterName}\n${exporterAddress}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'F');
      setCell(r, 4, `INVOICE NO. & DATE\n${invNo}    ${invDate}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 45;
      r++;

      // Row 4: Consignee vs PI / IEC
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, `CONSIGNEE :-\n${consignee}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r, 4, `EXPORTER REF. / PI NO.\n${piNo}    ${piDate}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, `I.E.C. NO.\n${iecNo}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 40;
      r++;

      // Row 5: Buyer vs Buyer Order / GSTIN
      mergeRow(r, 'A', r+1, 'C');
      setCell(r, 1, `BUYER (IF OTHER THAN CONSIGNEE) :-\n${buyer}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r, 4, `BUYER'S ORDER NO. & DATE\n${buyerOrderNo}    ${buyerOrderDate}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, `GSTIN\n${gstn}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 6: (Right side of Buyer)
      setCell(r, 4, `SHIPMENT TERMS\n${deliveryTerms}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, `TARIFF CODE\n${tariffCode}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 7: Pre-carriage / Place of receipt / Bank
      setCell(r, 1, `PRE-CARRIAGE BY\n${preCarriage}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'B', r, 'C');
      setCell(r, 2, `PLACE OF RECEIPT\n${receiptPlace}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r+2, 'F');
      setCell(r, 4, `OUR BANK DETAILS :-\nA/C NAME: ${accName}\nA/C NO.: ${accNo}\nBANK NAME: ${bankName}\nADDRESS: ${bankAddr}\nSWIFT CODE: ${swift}`, { bold: false, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 8: Vessel / POL
      setCell(r, 1, `VESSEL / FLIGHT NO.\n${vessel}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'B', r, 'C');
      setCell(r, 2, `PORT OF LOADING\n${pol}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 9: POD / Final Dest
      setCell(r, 1, `PORT OF DISCHARGE\n${pod}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'B', r, 'C');
      setCell(r, 2, `FINAL DESTINATION\n${dest}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 10: Origin / Dest / Payment Terms
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, `COUNTRY OF ORIGIN\n${origin}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, `FINAL DESTINATION\n${dest}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, `PAYMENT TERMS\n${paymentTerms}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // Row 11: Products Table Headers
      mergeRow(r, 'A', r+1, 'A');
      setCell(r, 1, 'MATERIAL DESCRIPTION', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'B', r+1, 'B');
      setCell(r, 2, 'HSN CODE', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, 'QUANTITY', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'E', r+1, 'E');
      setCell(r, 5, 'RATE FOR USD/SQM', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'F', r+1, 'F');
      setCell(r, 6, 'AMOUNT FOR USD', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 15;
      r++;
      setCell(r, 3, 'BOXES', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      setCell(r, 4, 'SQM', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 15;
      r++;

      // Total Pallets
      const tPallets = doc.total_pallets || doc.totalPallets || documentData.totalPallets || '0';
      mergeRow(r, 'A', r, 'F');
      setCell(r, 1, `TOTAL ${tPallets} PALLETS`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // Product Rows
      const allProductsRaw = [...tileProducts, ...sanitaryProducts];
      let tBox = 0, tSqm = 0, tAmt = 0;
      
      allProductsRaw.forEach((p) => {
        const isFoc = !!(p.is_foc || p.isFoc);
        const isSan = p.product_type === 'sanitaryware' || p.productType === 'sanitaryware' || p.type === 'sanitaryware';
        const bx = parseInt(p.totalBoxes || p.total_boxes || p.boxes || p.pieces || 0, 10);
        const sq = isSan ? 0 : parseFloat(p.sqmAuto || p.sqm_auto || p.sqm || 0);
        const rt = parseFloat(p.rate || p.unit_price || p.price || 0);
        const am = isFoc ? 0 : parseFloat(p.amount || p.total_price || (isSan ? (bx * rt) : (sq * rt)));
        
        tBox += bx; tSqm += sq; tAmt += am;

        const name = p.product || p.product_name || p.name || 'Unknown';
        const desc = p.description || p.productDescription || p.materialDescription || '';
        let finalDesc = (isFoc ? 'FREE OF COST SAMPLE NO COMMERCIAL VALUE\n' : '');
        finalDesc += (desc && desc !== name && desc !== '-') ? `${name}\n${desc}` : name;

        setCell(r, 1, finalDesc.trim(), { size: 8, align: { horizontal: 'left', vertical: 'middle' } });
        setCell(r, 2, p.hsnCode || p.hsn_code || p.hsCode || p.hs_code || '', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 3, bx, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        
        const c4 = setCell(r, 4, isSan ? 0 : sq, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        c4.numFmt = '#,##0.00';
        
        const c5 = setCell(r, 5, isFoc ? 0 : rt, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        c5.numFmt = '#,##0.00';
        
        const c6 = setCell(r, 6, am, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        c6.numFmt = '#,##0.00';
        
        sheet.getRow(r).height = 30;
        r++;
      });

      // Packing Ref
      mergeRow(r, 'A', r, 'F');
      setCell(r, 1, 'PACKING DETAILS AS PER ANNEXURE', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // Total Row
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, 'TOTAL :-', { bold: true, size: 8, align: { horizontal: 'right', vertical: 'middle' } });
      setCell(r, 3, tBox, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      const tS = setCell(r, 4, tSqm, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      tS.numFmt = '#,##0.00';
      setCell(r, 5, '', { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      const tA = setCell(r, 6, tAmt, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      tA.numFmt = '#,##0.00';
      sheet.getRow(r).height = 20;
      r++;

      // Footer
      const palletType = documentData.pallet_type || 'NORMAL WOODEN PALLETS';
      const tilesBack = documentData.tiles_back || 'MADE IN INDIA';
      const boxesMarking = documentData.boxes_marking || 'DESIGN BY SPAIN';
      const boxType = documentData.box_type || 'NON BRANDED BOXES';
      const fumigation = documentData.fumigation || 'YES';
      const legalisation = documentData.legalisation || 'NO';
      const otherInstr = documentData.other_instructions || '-';

      const amountWhole = Math.floor(tAmt);
      const amountCents = Math.round((tAmt - amountWhole) * 100);
      const amountWords = `TOTAL FOR MUNDRA VALUE :- USD ${numberToWords(amountWhole)}${amountCents > 0 ? ` AND CENTS ${numberToWords(amountCents)}` : ''} ONLY.`;

      mergeRow(r, 'A', r+1, 'D');
      setCell(r, 1, `1. PALLETS :- ${palletType}\n2. MADE IN INDIA :-\n   TILES BACK: ${tilesBack}\n   BOXES: ${boxesMarking}\n3. BOXES :- ${boxType}\n4. FUMIGATION :- ${fumigation}\n5. LEGALISATION :- ${legalisation}\n6. OTHER :- ${otherInstr}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      
      mergeRow(r, 'E', r+1, 'F');
      setCell(r, 5, `${amountWords}\n\n\nFOR, ${exporterName}\n\n\n\n(AUTHORIZED SIGNATORY)`, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'top' } });
      
      sheet.getRow(r).height = 40;
      sheet.getRow(r+1).height = 40;
      r += 2;

      // Final Weights
      const tNet = parseFloat(documentData.net_weight || documentData.netWeight || documentData.netWt || documentData.net_wt || 0);
      const tGross = parseFloat(documentData.gross_weight || documentData.grossWeight || documentData.grossWt || documentData.gross_wt || 0);
      
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, `NET WEIGHT\n${tNet.toFixed(2)} KGS`, { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      mergeRow(r, 'D', r, 'F');
      setCell(r, 4, `GROSS WEIGHT\n${tGross.toFixed(2)} KGS`, { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 30;
      r++;

      // Borders
      for (let row = 1; row < r; row++) {
        for (let col = 1; col <= 6; col++) {
          const cell = sheet.getCell(row, col);
          if (!cell.border) cell.border = brd;
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = generateEnterpriseFilename({ moduleName: 'EXPORT-INVOICE', documentNo: docNo, clientName, date, extension: 'xlsx', isProductExport: true });
      saveAs(new Blob([buffer]), filename);
      return true;
    }

    // ─────────────────────────────────────────────────────────────────
    // SHIPPING INSTRUCTIONS: Dedicated Layout
    // ─────────────────────────────────────────────────────────────────
    else if (['Shipping Instructions', 'SHIPPING INSTRUCTIONS', 'shipping_instructions'].includes(moduleType)) {
      sheet.columns = [
        { width: 8 },   // A: SR.NO
        { width: 16 },  // B: CONTAINER NO
        { width: 16 },  // C: SEAL NO
        { width: 14 },  // D: SQM
        { width: 12 },  // E: BOXES
        { width: 16 },  // F: NET. WT.
        { width: 16 },  // G: GR. WT.
      ];

      const doc = documentData.shipping_instructions || documentData.shippingInstructions || documentData || {};
      const B_style = { style: 'thin' };
      const brd = { top: B_style, left: B_style, bottom: B_style, right: B_style };

      const setCell = (row, col, value, opts = {}) => {
        const cell = sheet.getCell(row, col);
        cell.value = value;
        if (opts.bold !== undefined) cell.font = { bold: opts.bold, size: opts.size || 8 };
        else if (opts.size) cell.font = { size: opts.size };
        if (opts.italic) cell.font = { ...cell.font, italic: true };
        if (opts.align) cell.alignment = { ...opts.align, wrapText: true };
        if (opts.bg)   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
        cell.border = brd;
        return cell;
      };

      const mergeRow = (r1, c1, r2, c2) => { sheet.mergeCells(`${c1}${r1}:${c2}${r2}`); };

      let r = 1;

      // 1. Header
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, 'SHIPPING INSTRUCTIONS', { bold: true, size: 14, align: { horizontal: 'center', vertical: 'middle' } });
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, { tl: { col: 5.5, row: 0.1 }, ext: { width: 100, height: 35 } });
      }
      sheet.getRow(r).height = 40;
      r++;

      // 2. Exporter & Booking No
      mergeRow(r, 'A', r, 'D');
      setCell(r, 1, `EXPORTER:-\n${exporterName}\n${exporterAddress}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'E', r, 'G');
      setCell(r, 5, `BOOKING NO:\n${doc.booking_no || doc.bookingNo || '-'}`, { bold: true, size: 9, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 60;
      r++;

      // 3. Consignee
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, `CONSIGNEE :-\n${consignee}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 50;
      r++;

      // 4. Notify I
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, `NOTIFY - I :-\n${doc.notifyParty1 || doc.notify_party_1 || doc.notify_party || doc.notifyParty || '-'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 45;
      r++;

      // 5. Notify II
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, `NOTIFY - II :-\n${doc.notifyParty2 || doc.notify_party_2 || '-'}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // 6. Vessel / ETD / POD
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, `VESSEL / VOYAGE :\n${vessel}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'D', r, 'F');
      setCell(r, 4, `ETD :\n${doc.etd ? formatDisplayDate(doc.etd) : (formatDisplayDate(doc.vgm_date || doc.date || doc.created_at) || '-')}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      setCell(r, 7, `POD :\n${pod}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // 7. POL / Final Dest
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, `POL :\n${pol}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      mergeRow(r, 'C', r, 'G');
      setCell(r, 3, `FINAL DESTINATION :\n${dest}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });
      sheet.getRow(r).height = 30;
      r++;

      // 8. Container Size summary
      const firstContSize = containers.length > 0 ? (containers[0].size || containers[0].container_size || "20'") : "20'";
      const contCount = String(containers.length).padStart(2, '0');
      const allProductsRaw = [...tileProducts, ...sanitaryProducts];
      const totBx = parseInt(doc.total_boxes || doc.totalBoxes || documentData.total_boxes || documentData.totalBoxes || 0, 10);
      
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, `${contCount}X${firstContSize} FCL SAID TO CONTAIN ${totBx} BOXES`, { bold: true, size: 9, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 9. Total Pallets
      const tp = doc.totalPallets || doc.total_pallets || documentData.totalPallets || documentData.total_pallets || '0';
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, `TOTAL ${tp} PALLETS`, { bold: true, size: 9, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 10. Material summary
      const firstProd = doc.description_of_goods || doc.siDescription || doc.goods_description || doc.material_header_description || doc.product_description || (allProductsRaw.length > 0 ? (allProductsRaw[0].product || allProductsRaw[0].product_name || allProductsRaw[0].name || '') : '');
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, firstProd || 'PRODUCT DESCRIPTION', { bold: true, size: 9, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 11. HS / SQM
      const hsn = doc.hs_code || doc.hsCode || doc.tariff_code || doc.tariffCode || (allProductsRaw.length > 0 ? (allProductsRaw[0].hsnCode || allProductsRaw[0].hsn_code || allProductsRaw[0].hsCode || allProductsRaw[0].hs_code || '') : '');
      const sqTotal = parseFloat(doc.total_sqm || doc.totalSqm || documentData.total_sqm || documentData.totalSqm || 0);
      
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, 'HS CODE :-', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, hsn, { bold: false, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, 'TOTAL SQM :-', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      setCell(r, 7, sqTotal.toFixed(2), { bold: false, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 12. Boxes / Net Wt
      const netTotal = parseFloat(documentData.net_weight || documentData.netWeight || documentData.netWt || documentData.net_wt || 0);
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, 'TOTAL BOXES :-', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, totBx, { bold: false, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, 'TOTAL NET WT:', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      setCell(r, 7, `${netTotal.toFixed(2)} KGS`, { bold: false, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 13. Inv No / Gross Wt
      const grTotal = parseFloat(documentData.gross_weight || documentData.grossWeight || documentData.grossWt || documentData.gross_wt || 0);
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, 'INVOICE NO. :-', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'C', r, 'D');
      setCell(r, 3, `${invNo}   DT: ${invDate}`, { bold: false, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'E', r, 'F');
      setCell(r, 5, 'TOTAL GR. WT:', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      setCell(r, 7, `${grTotal.toFixed(2)} KGS`, { bold: false, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 14. SB No
      const sbNo = doc.sb_no || doc.sbNo || '-';
      const sbDate = doc.sb_date || doc.sbDate ? formatDisplayDate(doc.sb_date || doc.sbDate) : '-';
      mergeRow(r, 'A', r, 'B');
      setCell(r, 1, 'SB NO. :-', { bold: true, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      mergeRow(r, 'C', r, 'G');
      setCell(r, 3, `${sbNo}   DT: ${sbDate}`, { bold: false, size: 8, align: { horizontal: 'left', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 15. BL Type
      const blType = doc.bill_of_lading_type || doc.bl_type || doc.blType || 'SBL';
      mergeRow(r, 'A', r, 'G');
      setCell(r, 1, `BILL OF LADING TYPE : ${blType.toUpperCase()}`, { bold: true, size: 9, align: { horizontal: 'center', vertical: 'middle' } });
      sheet.getRow(r).height = 20;
      r++;

      // 16. Container Headers
      const headers = ['SR.NO', 'CONTAINER NO', 'SEAL NO', 'SQM', 'BOXES', 'NET. WT.', 'GR. WT.'];
      headers.forEach((h, i) => {
        setCell(r, i + 1, h, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      });
      sheet.getRow(r).height = 25;
      r++;

      // 17. Containers Data
      let cSqm = 0, cBox = 0, cNet = 0, cGr = 0;
      containers.forEach((c, idx) => {
        const sq = parseFloat(c.sqm || c.total_sqm || c.totalSqm || 0);
        const bx = parseInt(c.boxes || c.total_boxes || c.box || c.boxQuantity || 0, 10);
        const nt = parseFloat(c.net_weight || c.netWeight || c.netWt || c.net_wt || c.cargo_weight || c.cargo_wt || c.cargoWeight || c.netWt || c.net_wt || c.cargo_weight || c.cargo_wt || c.cargoWeight || 0);
        const gr = parseFloat(c.gross_weight || c.grossWeight || c.grossWt || c.gross_wt || c.vgm_weight || c.vgmWeight || c.grossWt || c.gross_wt || c.vgm_weight || c.vgmWeight || 0);
        
        cSqm += sq; cBox += bx; cNet += nt; cGr += gr;

        setCell(r, 1, idx + 1, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        setCell(r, 2, c.container_no || c.containerNo || '-', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        
        const sealNo = [c.line_seal_no || c.lineSealNo || c.seal_no || c.sealNo, c.e_seal_no || c.eSealNo].filter(s => s && s !== '-').join(' / ');
        setCell(r, 3, sealNo || '-', { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        
        const cSq = setCell(r, 4, sq, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        cSq.numFmt = '#,##0.00';
        
        setCell(r, 5, bx, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        
        const cNt = setCell(r, 6, nt, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        cNt.numFmt = '#,##0.00';
        
        const cGrs = setCell(r, 7, gr, { size: 8, align: { horizontal: 'center', vertical: 'middle' } });
        cGrs.numFmt = '#,##0.00';
        
        sheet.getRow(r).height = 20;
        r++;
      });

      // 18. Container Totals
      mergeRow(r, 'A', r, 'C');
      setCell(r, 1, 'TOTAL', { bold: true, size: 8, align: { horizontal: 'right', vertical: 'middle' } });
      const tSqCell = setCell(r, 4, cSqm, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      tSqCell.numFmt = '#,##0.00';
      setCell(r, 5, cBox, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      const tNtCell = setCell(r, 6, cNet, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      tNtCell.numFmt = '#,##0.00';
      const tGrCell = setCell(r, 7, cGr, { bold: true, size: 8, align: { horizontal: 'center', vertical: 'middle' } });
      tGrCell.numFmt = '#,##0.00';
      sheet.getRow(r).height = 25;
      r++;

      // Draw all borders
      for (let row = 1; row < r; row++) {
        for (let col = 1; col <= 7; col++) {
          const cell = sheet.getCell(row, col);
          if (!cell.border) cell.border = brd;
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = generateEnterpriseFilename({ moduleName: 'SHIPPING-INSTRUCTIONS', documentNo: docNo, clientName, date, extension: 'xlsx', isProductExport: true });
      saveAs(new Blob([buffer]), filename);
      return true;
    }

    // Supply Declaration (Only for Invoices)

    if (!['Packing List', 'PACKING LIST', 'VGM', 'Shipping Instructions', 'SHIPPING INSTRUCTIONS', 'Annexure', 'ANNEXURE', 'Invoice Backside', 'INVOICE BACKSIDE', 'IGST Invoice', 'IGST INVOICE', 'igst_invoice'].includes(moduleType)) {
      sheet.mergeCells('A1:F1');
      const declaration = sheet.getCell('A1');
      declaration.value = (documentData.supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND') + '\n' +
        (documentData.ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"');
      declaration.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      declaration.font = { bold: true, size: 8 };
      sheet.getRow(1).height = 30;
    }

    // Title
    sheet.mergeCells('A2:F2');
    const title = sheet.getCell('A2');
    title.value = (moduleType || 'INVOICE').toUpperCase();
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    title.font = { bold: true, size: 16 };
    sheet.getRow(2).height = 25;

    // Exporter Info (A3:C3)
    sheet.mergeCells('A3:C3');
    const exporterCell = sheet.getCell('A3');
    exporterCell.value = `EXPORTER :-\n${exporterName}\n${exporterAddress}`;
    exporterCell.alignment = { vertical: 'top', wrapText: true };
    exporterCell.font = { size: 10 };

    if (logoImageId) {
      sheet.addImage(logoImageId, {
        tl: { col: 2, row: 2.1 }, // Col C (0-indexed 2), Row 3 (0-indexed 2)
        ext: { width: 100, height: 40 }
      });
    }

    // Inv No & Date (D3:F3)
    sheet.mergeCells('D3:F3');
    const docTypeLabel = (moduleType || 'INVOICE').toUpperCase();
    sheet.getCell('D3').value = `${docTypeLabel} NO. & DATE\n${invNo}    ${invDate}`;
    sheet.getCell('D3').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('D3').font = { bold: true };

    // Consignee (A4:C4)
    sheet.mergeCells('A4:C4');
    const consigneeCell = sheet.getCell('A4');
    consigneeCell.value = `CONSIGNEE :-\n${consignee}`;
    consigneeCell.alignment = { vertical: 'top', wrapText: true };
    consigneeCell.font = { size: 10 };

    // PI No (D4) / IEC (E4:F4)
    sheet.getCell('D4').value = `EXPORTER REF. / PI NO.\n${piNo}    ${piDate}`;
    sheet.getCell('D4').alignment = { vertical: 'top', wrapText: true };
    sheet.mergeCells('E4:F4');
    sheet.getCell('E4').value = `I.E.C. NO.\n${iecNo}`;
    sheet.getCell('E4').alignment = { vertical: 'top', wrapText: true };

    // Buyer (A5:C5)
    sheet.mergeCells('A5:C5');
    const buyerCell = sheet.getCell('A5');
    buyerCell.value = `BUYER (IF OTHER THAN CONSIGNEE) :-\n${buyer}`;
    buyerCell.alignment = { vertical: 'top', wrapText: true };
    buyerCell.font = { size: 10 };

    // Buyer Order (D5) / GSTIN (E5:F5)
    sheet.getCell('D5').value = `BUYER'S ORDER NO. & DATE\n${buyerOrderNo}    ${buyerOrderDate}`;
    sheet.getCell('D5').alignment = { vertical: 'top', wrapText: true };
    sheet.mergeCells('E5:F5');
    sheet.getCell('E5').value = `GSTIN\n${gstn}`;
    sheet.getCell('E5').alignment = { vertical: 'top', wrapText: true };

    // Logistics Row 6
    sheet.getCell('A6').value = `PRE-CARRIAGE BY\n${preCarriage}`;
    sheet.getCell('A6').alignment = { vertical: 'top', wrapText: true };
    sheet.mergeCells('B6:C6');
    sheet.getCell('B6').value = `PLACE OF RECEIPT\n${receiptPlace}`;
    sheet.getCell('B6').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('D6').value = `SHIPMENT TERMS\n${deliveryTerms}`;
    sheet.getCell('D6').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('D6').font = { bold: true };
    sheet.mergeCells('E6:F6');
    sheet.getCell('E6').value = `TARIFF CODE\n${tariffCode}`;
    sheet.getCell('E6').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('E6').font = { bold: true };

    // Logistics Row 7
    sheet.getCell('A7').value = `VESSEL / FLIGHT NO.\n${vessel}`;
    sheet.getCell('A7').alignment = { vertical: 'top', wrapText: true };
    sheet.mergeCells('B7:D7');
    sheet.getCell('B7').value = `PORT OF LOADING\n${pol}`;
    sheet.getCell('B7').alignment = { vertical: 'top', wrapText: true };
    
    // Bank Details
    sheet.mergeCells('E7:F9');
    sheet.getCell('E7').value = `OUR BANK DETAILS :-\nA/C NAME: ${accName}\nA/C NO.: ${accNo}\nBANK NAME: ${bankName}\nADDRESS: ${bankAddr}\nSWIFT CODE: ${swift}`;
    sheet.getCell('E7').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('E7').font = { size: 9 };

    // Logistics Row 8
    sheet.getCell('A8').value = `PORT OF DISCHARGE\n${pod}`;
    sheet.getCell('A8').alignment = { vertical: 'top', wrapText: true };
    sheet.mergeCells('B8:D8');
    sheet.getCell('B8').value = `FINAL DESTINATION\n${dest}`;
    sheet.getCell('B8').alignment = { vertical: 'top', wrapText: true };

    // Logistics Row 9
    sheet.getCell('A9').value = `COUNTRY OF ORIGIN\n${origin}`;
    sheet.getCell('A9').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('A9').font = { bold: true };
    sheet.mergeCells('B9:D9');
    sheet.getCell('B9').value = `FINAL DESTINATION\n${dest}`;
    sheet.getCell('B9').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('B9').font = { bold: true };

    // Payment Terms (Row 10)
    sheet.mergeCells('A10:D10'); // Leave blank
    sheet.mergeCells('E10:F10');
    sheet.getCell('E10').value = `PAYMENT TERMS\n${paymentTerms}`;
    sheet.getCell('E10').alignment = { vertical: 'top', wrapText: true };
    sheet.getCell('E10').font = { bold: true };

    // Apply borders to header cells properly ignoring missing cells inside merged ranges
    const applyBorderToRange = (r, startCol, endCol) => {
      const cell = sheet.getCell(r, startCol);
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    };

    // Row 3
    applyBorderToRange(3, 1, 3); // A3:C3
    applyBorderToRange(3, 4, 6); // D3:F3
    // Row 4
    applyBorderToRange(4, 1, 3); // A4:C4
    applyBorderToRange(4, 4, 4); // D4
    applyBorderToRange(4, 5, 6); // E4:F4
    // Row 5
    applyBorderToRange(5, 1, 3); // A5:C5
    applyBorderToRange(5, 4, 4); // D5
    applyBorderToRange(5, 5, 6); // E5:F5
    // Row 6
    applyBorderToRange(6, 1, 1); // A6
    applyBorderToRange(6, 2, 3); // B6:C6
    applyBorderToRange(6, 4, 4); // D6
    applyBorderToRange(6, 5, 6); // E6:F6
    // Row 7
    applyBorderToRange(7, 1, 1); // A7
    applyBorderToRange(7, 2, 4); // B7:D7
    applyBorderToRange(7, 5, 6); // E7:F9
    // Row 8
    applyBorderToRange(8, 1, 1); // A8
    applyBorderToRange(8, 2, 4); // B8:D8
    // Row 9
    applyBorderToRange(9, 1, 1); // A9
    applyBorderToRange(9, 2, 4); // B9:D9
    // Row 10
    applyBorderToRange(10, 1, 4); // A10:D10
    applyBorderToRange(10, 5, 6); // E10:F10

    // Set heights to accommodate text dynamically
    sheet.getRow(3).height = Math.max(45, (exporterName.length + exporterAddress.length) / 50 * 15 + 20);
    sheet.getRow(4).height = Math.max(45, consignee.length / 50 * 15 + 20);
    sheet.getRow(5).height = Math.max(45, buyer.length / 50 * 15 + 20);
    sheet.getRow(6).height = 40;
    sheet.getRow(7).height = 30;
    sheet.getRow(8).height = 30;
    sheet.getRow(9).height = 30;
    sheet.getRow(10).height = 30;

    let currentRow = 12;

    // --- Products Processing (Matching Print View Logic) ---
    // Combine tile and sanitary products
    const allProductsRaw = [...tileProducts, ...sanitaryProducts];

    const productLines = allProductsRaw.map(line => {
      const isFoc = !!(line.is_foc || line.isFoc);
      const isSanitaryware = line.product_type === 'sanitaryware' || line.productType === 'sanitaryware' || line.type === 'sanitaryware' || line.item_name;
      const boxes = parseInt(line.totalBoxes || line.total_boxes || line.boxes || line.pieces || line.cartons || line.pcs || 0, 10);
      const sqm = isSanitaryware ? 0 : parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0);
      const rate = parseFloat(line.rate || line.unit_price || line.price || 0);
      const amount = isFoc ? 0 : parseFloat(line.amount || line.total_price || (isSanitaryware ? (boxes * rate) : (sqm * rate)));

      const productName = line.product || line.product_name || line.name || line.item_name || line.type || 'Unknown';
      const description = line.description || line.productDescription || line.materialDescription || [line.size, line.surface, line.color].filter(Boolean).join(' ') || '';
      
      let finalDescription = '';
      if (isFoc) finalDescription += 'FREE OF COST SAMPLE NO COMMERCIAL VALUE\n';
      
      if (description && description !== productName && description.toLowerCase() !== 'name' && description.toLowerCase() !== 'unknown' && description !== '-') {
        finalDescription += `${productName}\n${description}`;
      } else {
        finalDescription += productName;
      }

      // Append Factory Product Name and Pallets universally if they exist to prevent missing data
      const factoryProductName = line.factoryProductName || line.factory_product_name;
      const pallets = line.pallets || line.totalPallets || line.total_pallets || line.no_of_pallets || line.noOfPallets;
      if (factoryProductName && factoryProductName !== '-' && factoryProductName !== productName) finalDescription += `\nFACTORY PROD: ${factoryProductName}`;
      if (pallets && pallets !== '0' && pallets !== 0) finalDescription += `\nPALLETS: ${pallets}`;

      return {
        ...line,
        isFoc,
        isSanitaryware,
        hsnCode: line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || '',
        finalDescription: finalDescription.trim(),
        totalBoxes: boxes,
        sqmAuto: sqm,
        rate,
        amount
      };
    });

    const groups = [];
    let groupStart = 0;
    for (let i = 0; i < productLines.length; i++) {
      if (i === 0) {
        groups[i] = { 
          rowSpan: 1, 
          mergedBoxes: productLines[i].totalBoxes, 
          mergedSqm: productLines[i].sqmAuto, 
          mergedAmount: productLines[i].amount,
          mergedNetWeight: parseFloat(productLines[i].netWeight || productLines[i].net_weight || 0),
          mergedGrossWeight: parseFloat(productLines[i].grossWeight || productLines[i].gross_weight || 0)
        };
        continue;
      }
      const prev = productLines[i - 1];
      const curr = productLines[i];
      const prevKey = `${prev.finalDescription}|${prev.rate}`;
      const currKey = `${curr.finalDescription}|${curr.rate}`;
      if (prevKey === currKey && prevKey !== '|0') {
        groups[groupStart].rowSpan += 1;
        groups[groupStart].mergedBoxes += curr.totalBoxes;
        groups[groupStart].mergedSqm += curr.sqmAuto;
        groups[groupStart].mergedAmount += curr.amount;
        groups[groupStart].mergedNetWeight += parseFloat(curr.netWeight || curr.net_weight || 0);
        groups[groupStart].mergedGrossWeight += parseFloat(curr.grossWeight || curr.gross_weight || 0);
        groups[i] = { rowSpan: 0, mergedBoxes: 0, mergedSqm: 0, mergedAmount: 0, mergedNetWeight: 0, mergedGrossWeight: 0 };
      } else {
        groupStart = i;
        groups[i] = { 
          rowSpan: 1, 
          mergedBoxes: curr.totalBoxes, 
          mergedSqm: curr.sqmAuto, 
          mergedAmount: curr.amount,
          mergedNetWeight: parseFloat(curr.netWeight || curr.net_weight || 0),
          mergedGrossWeight: parseFloat(curr.grossWeight || curr.gross_weight || 0)
        };
      }
    }

    if (productLines.length > 0) {
      sheet.mergeCells(`A${currentRow}:F${currentRow}`);
      const headerTitle = sheet.getCell(`A${currentRow}`);
      headerTitle.value = 'PRODUCT LIST';
      headerTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
      headerTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;

      // Row 1 of headers
      sheet.getCell(`A${currentRow}`).value = 'MATERIAL DESCRIPTION';
      sheet.getCell(`B${currentRow}`).value = moduleType === 'Packing List' ? 'BOXES/PCS' : 'HSN CODE';
      sheet.getCell(`C${currentRow}`).value = moduleType === 'Packing List' ? 'QUANTITY (SQM)' : 'QUANTITY';
      if (moduleType === 'Packing List') {
        sheet.getCell(`D${currentRow}`).value = 'NET WEIGHT (KGS)';
        sheet.getCell(`E${currentRow}`).value = 'GROSS WEIGHT (KGS)';
        sheet.getCell(`F${currentRow}`).value = 'PALLETS';
      } else {
        sheet.getCell(`E${currentRow}`).value = 'RATE FOB USD/SQM';
        sheet.getCell(`F${currentRow}`).value = 'AMOUNT FOB USD';
      }
      
      // Merge cells for headers that span 2 rows
      sheet.mergeCells(`A${currentRow}:A${currentRow+1}`);
      if (moduleType === 'Packing List') {
        sheet.mergeCells(`B${currentRow}:B${currentRow+1}`);
        sheet.mergeCells(`C${currentRow}:C${currentRow+1}`);
        sheet.mergeCells(`D${currentRow}:D${currentRow+1}`);
        sheet.mergeCells(`E${currentRow}:E${currentRow+1}`);
        sheet.mergeCells(`F${currentRow}:F${currentRow+1}`);
      } else {
        sheet.mergeCells(`B${currentRow}:B${currentRow+1}`);
        sheet.mergeCells(`C${currentRow}:D${currentRow}`); // QUANTITY spans 2 columns
        sheet.mergeCells(`E${currentRow}:E${currentRow+1}`);
        sheet.mergeCells(`F${currentRow}:F${currentRow+1}`);

        // Row 2 of headers
        sheet.getCell(`C${currentRow+1}`).value = 'BOXES/PCS';
        sheet.getCell(`D${currentRow+1}`).value = 'SQM';
      }

      // Style headers
      for (let r = currentRow; r <= currentRow + 1; r++) {
        const row = sheet.getRow(r);
        row.font = { bold: true };
        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          applyBorder(r, c);
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
      }
      currentRow += 2;

      let totalBoxesAll = 0;
      let totalSqmAll = 0;
      let totalAmountAll = 0;
      let totalNetWeightAll = 0;
      let totalGrossWeightAll = 0;

      productLines.forEach((p, i) => {
        const grp = groups[i];
        if (grp.rowSpan === 0) return; // Skip merged rows

        totalBoxesAll += grp.mergedBoxes;
        totalSqmAll += grp.mergedSqm;
        totalAmountAll += grp.mergedAmount;
        totalNetWeightAll += grp.mergedNetWeight;
        totalGrossWeightAll += grp.mergedGrossWeight;

        const rowData = moduleType === 'Packing List'
          ? [
              p.finalDescription,
              grp.mergedBoxes,
              p.isSanitaryware ? 0 : grp.mergedSqm,
              grp.mergedNetWeight,
              grp.mergedGrossWeight,
              p.pallets || p.totalPallets || p.total_pallets || '-'
            ]
          : [
              p.finalDescription,
              p.hsnCode,
              grp.mergedBoxes,
              p.isSanitaryware ? 0 : grp.mergedSqm,
              p.isFoc ? 0 : p.rate,
              p.isFoc ? 0 : grp.mergedAmount
            ];

        const row = sheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          applyBorder(row.number, colNumber);
          cell.alignment = { vertical: 'middle' };
          
          if (colNumber === 1) cell.alignment.wrapText = true;
          
          if ([3, 4, 5, 6].includes(colNumber)) {
            cell.alignment.horizontal = 'right';
            if (colNumber === 5 || colNumber === 6) {
              cell.numFmt = '#,##0.00';
            } else if (colNumber === 4) {
              cell.numFmt = '#,##0.00'; 
            } else {
              cell.numFmt = '#,##0';
            }
          } else {
            cell.alignment.horizontal = 'left';
          }
        });
        currentRow++;
      });

      // Total Row
      const totalRowData = moduleType === 'Packing List'
        ? ['TOTAL :-', totalBoxesAll, totalSqmAll, totalNetWeightAll, totalGrossWeightAll, '']
        : ['TOTAL :-', '', totalBoxesAll, totalSqmAll, '', totalAmountAll];
      const totalRow = sheet.addRow(totalRowData);
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        applyBorder(totalRow.number, colNumber);
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if ([3, 4, 5, 6].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (colNumber === 6) cell.numFmt = '#,##0.00';
          if (colNumber === 4) cell.numFmt = '#,##0.00';
          if (colNumber === 3) cell.numFmt = '#,##0';
        }
      });
      sheet.mergeCells(`A${currentRow}:B${currentRow}`);
      currentRow++;

      // Footer details (Logistics/Packing + Signatory)
      currentRow++;
      
      const palletType = documentData.pallet_type || 'NORMAL WOODEN PALLETS';
      const tilesBack = documentData.tiles_back || 'YES';
      const boxesMarking = documentData.boxes_marking || 'YES';
      const boxType = documentData.box_type || 'NON BRANDED';
      const fumigation = documentData.fumigation || 'YES';
      const legalisation = documentData.legalisation || 'NO';
      const otherInstr = documentData.other_instructions || '-';

      const amountWhole = Math.floor(totalAmountAll);
      const amountCents = Math.round((totalAmountAll - amountWhole) * 100);
      const amountWords = `TOTAL FOB VALUE :- USD ${numberToWords(amountWhole)}${amountCents > 0 ? ` AND CENTS ${numberToWords(amountCents)}` : ''} ONLY.`;

      sheet.mergeCells(`A${currentRow}:D${currentRow+1}`);
      sheet.getCell(`A${currentRow}`).value = `1. PALLETS :- ${palletType}\n2. MADE IN INDIA :-\n   TILES BACK: ${tilesBack}\n   BOXES: ${boxesMarking}\n3. BOXES :- ${boxType}\n4. FUMIGATION :- ${fumigation}\n5. LEGALISATION :- ${legalisation}\n6. OTHER :- ${otherInstr}`;
      sheet.getCell(`A${currentRow}`).alignment = { vertical: 'top', wrapText: true };
      sheet.getCell(`A${currentRow}`).font = { size: 9 };

      if (boxImageId !== null) {
        sheet.addImage(boxImageId, {
          tl: { col: 2.8, row: currentRow - 0.8 }, // Align right side of A-D merge
          ext: { width: 50, height: 50 }
        });
      }
      
      sheet.mergeCells(`E${currentRow}:F${currentRow+1}`);
      sheet.getCell(`E${currentRow}`).value = `${amountWords}\n\nFOR, ${exporterName}\n\n\n(AUTHORIZED SIGNATORY)`;
      sheet.getCell(`E${currentRow}`).alignment = { vertical: 'top', horizontal: 'right', wrapText: true };
      sheet.getCell(`E${currentRow}`).font = { bold: true };

      for (let r = currentRow; r <= currentRow + 1; r++) {
        for (let c = 1; c <= 6; c++) {
          applyBorder(r, c);
        }
      }
      sheet.getRow(currentRow).height = 40;
      sheet.getRow(currentRow+1).height = 40;
      currentRow += 2;

      // Weights row
      let netWeight = parseFloat(documentData.net_weight || documentData.netWeight || documentData.netWt || documentData.net_wt || 0);
      let grossWeight = parseFloat(documentData.gross_weight || documentData.grossWeight || documentData.grossWt || documentData.gross_wt || 0);
      
      // Fallback to aggregated totals if document level weights are missing or zero
      if (netWeight === 0) netWeight = totalNetWeightAll;
      if (grossWeight === 0) grossWeight = totalGrossWeightAll;

      sheet.mergeCells(`A${currentRow}:C${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = `NET WEIGHT\n${netWeight.toFixed(2)} KGS`;
      sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      sheet.getCell(`A${currentRow}`).font = { bold: true };

      sheet.mergeCells(`D${currentRow}:F${currentRow}`);
      sheet.getCell(`D${currentRow}`).value = `GROSS WEIGHT\n${grossWeight.toFixed(2)} KGS`;
      sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      sheet.getCell(`D${currentRow}`).font = { bold: true };

      for (let c = 1; c <= 6; c++) {
        applyBorder(currentRow, c);
      }
      sheet.getRow(currentRow).height = 40;
    } else if (containers.length > 0 && ['VGM', 'Shipping Instructions', 'SHIPPING INSTRUCTIONS'].includes(moduleType)) {
      currentRow++;
      sheet.mergeCells(`A${currentRow}:F${currentRow}`);
      const headerTitle = sheet.getCell(`A${currentRow}`);
      headerTitle.value = 'CONTAINER LIST';
      headerTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
      headerTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;

      sheet.getCell(`A${currentRow}`).value = 'CONTAINER NO.';
      sheet.getCell(`B${currentRow}`).value = 'TYPE / SIZE';
      sheet.getCell(`C${currentRow}`).value = 'CARGO WT. (KGS)';
      sheet.getCell(`D${currentRow}`).value = 'TARE WT. (KGS)';
      sheet.getCell(`E${currentRow}`).value = 'VGM WEIGHT (KGS)';
      sheet.getCell(`F${currentRow}`).value = 'SLIP NO. & DATE';

      const row = sheet.getRow(currentRow);
      row.font = { bold: true };
      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        applyBorder(currentRow, c);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
      currentRow++;

      containers.forEach(c => {
        const cargo = parseFloat(c.cargo_wt || c.cargo_weight || c.cargoWeight || 0);
        const tare = parseFloat(c.tare_wt || c.tare_weight || c.tareWeight || 0);
        const total = parseFloat(c.vgm_weight || c.vgmWeight || 0);
        const type = (c.type || c.container_size || c.containerSize || c.size || "20'").toUpperCase();

        let finalTare = tare;
        let finalCargo = cargo;
        let finalTotal = total;

        if (finalTotal > 0 && (finalTare === 0 || finalCargo === 0)) {
          if (finalTare === 0) {
            finalTare = type.includes('40') ? (type.includes('HC') ? 3900 : 3800) : 2300;
          }
          if (finalCargo === 0) {
            finalCargo = Math.max(0, finalTotal - finalTare);
          }
        } else if (finalCargo > 0 && finalTare > 0 && finalTotal === 0) {
          finalTotal = finalCargo + finalTare;
        }

        const candidateNos = [c.slip_no, c.slipNo, c.weighing_slip_no, c.weighingSlipNo, documentData.weighing_slip_no, documentData.weighingSlipNo];
        const sNo = candidateNos.map(n => typeof n === 'string' ? n.trim() : n).find(n => n && n !== 'AS PER BELOW DETAILS' && n !== '-') || '';
        const candidateDates = [c.slip_no_date, c.slipNoDate, c.weighing_date, c.weighingDate, documentData.weighing_date, documentData.weighingDate];
        const sDateRaw = candidateDates.map(d => typeof d === 'string' ? d.trim() : d).find(d => d && d !== 'AS PER BELOW DETAILS' && d !== '-') || '';
        const sDate = sDateRaw ? formatDisplayDate(sDateRaw) : '';
        const slipInfo = [sNo, sDate].filter(Boolean).join('\n');

        const rowData = [
          c.container_no || c.containerNo || 'N/A',
          type,
          finalCargo,
          finalTare,
          finalTotal,
          slipInfo
        ];
        
        const dataRow = sheet.addRow(rowData);
        dataRow.eachCell((cell, colNumber) => {
          applyBorder(dataRow.number, colNumber);
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if ([3, 4, 5].includes(colNumber)) {
            cell.numFmt = '#,##0.00';
          }
        });
        currentRow++;
      });

      // VGM Totals Row
      const vgmTotalCargo = containers.reduce((s, c) => s + parseFloat(c.cargo_wt || c.cargo_weight || c.cargoWeight || 0), 0);
      const vgmTotalTare  = containers.reduce((s, c) => s + parseFloat(c.tare_wt || c.tare_weight || c.tareWeight || 0), 0);
      const vgmTotalVgm   = containers.reduce((s, c) => s + parseFloat(c.vgm_weight || c.vgmWeight || 0), 0);

      const vgmTotalsRow = sheet.addRow(['TOTAL :-', '', vgmTotalCargo || documentData.total_cargo_weight || 0, vgmTotalTare || documentData.total_tare_weight || 0, vgmTotalVgm || documentData.total_vgm_weight || documentData.gross_weight || 0, '']);
      vgmTotalsRow.font = { bold: true };
      vgmTotalsRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        applyBorder(vgmTotalsRow.number, colNumber);
        if (colNumber === 1) cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if ([3, 4, 5].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
        }
      });
      sheet.mergeCells(`A${currentRow}:B${currentRow}`);
      currentRow++;

      // VGM Footer — Authorized Signatory + Weight Summary
      currentRow++;
      const authorizedPerson = documentData.authorized_person || documentData.authorizedPerson || documentData.authorized_signatory || exporterName;
      const weighbridgeName  = documentData.weighbridge_name || documentData.weighbridgeName || '-';
      const weighingMethod   = documentData.weighing_method || documentData.weighingMethod || 'METHOD-1';

      sheet.mergeCells(`A${currentRow}:D${currentRow + 1}`);
      sheet.getCell(`A${currentRow}`).value = `WEIGHING METHOD :- ${weighingMethod}\nWEIGHBRIDGE NAME :- ${weighbridgeName}`;
      sheet.getCell(`A${currentRow}`).alignment = { vertical: 'top', wrapText: true };
      sheet.getCell(`A${currentRow}`).font = { size: 9 };

      sheet.mergeCells(`E${currentRow}:F${currentRow + 1}`);
      sheet.getCell(`E${currentRow}`).value = `FOR, ${exporterName}\n\n\n(${authorizedPerson || 'AUTHORIZED SIGNATORY'})`;
      sheet.getCell(`E${currentRow}`).alignment = { vertical: 'top', horizontal: 'right', wrapText: true };
      sheet.getCell(`E${currentRow}`).font = { bold: true };

      for (let r = currentRow; r <= currentRow + 1; r++) {
        for (let c = 1; c <= 6; c++) { applyBorder(r, c); }
      }
      sheet.getRow(currentRow).height = 40;
      sheet.getRow(currentRow + 1).height = 40;
      currentRow += 2;

      // VGM Weight Summary row
      const vgmNetWt   = parseFloat(documentData.net_weight || documentData.netWeight || documentData.netWt || documentData.net_wt || documentData.total_cargo_weight || vgmTotalCargo || 0);
      const vgmGrossWt = parseFloat(documentData.gross_weight || documentData.grossWeight || documentData.grossWt || documentData.gross_wt || documentData.total_vgm_weight || vgmTotalVgm || 0);

      sheet.mergeCells(`A${currentRow}:C${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = `NET WEIGHT\n${vgmNetWt.toFixed(2)} KGS`;
      sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      sheet.getCell(`A${currentRow}`).font = { bold: true };

      sheet.mergeCells(`D${currentRow}:F${currentRow}`);
      sheet.getCell(`D${currentRow}`).value = `GROSS WEIGHT (VGM)\n${vgmGrossWt.toFixed(2)} KGS`;
      sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      sheet.getCell(`D${currentRow}`).font = { bold: true };

      for (let c = 1; c <= 6; c++) { applyBorder(currentRow, c); }
      sheet.getRow(currentRow).height = 40;
    } else if (containers.length > 0 && !['VGM', 'Shipping Instructions', 'SHIPPING INSTRUCTIONS'].includes(moduleType)) {
      currentRow++;
      sheet.mergeCells(`A${currentRow}:F${currentRow}`);
      const headerTitle = sheet.getCell(`A${currentRow}`);
      headerTitle.value = 'CONTAINER DETAILS';
      headerTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
      headerTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;

      sheet.getCell(`A${currentRow}`).value = 'CONTAINER NO.';
      sheet.getCell(`B${currentRow}`).value = 'SEALS (LINE / E-SEAL)';
      sheet.getCell(`C${currentRow}`).value = 'PRODUCT';
      sheet.getCell(`D${currentRow}`).value = 'SQM';
      sheet.getCell(`E${currentRow}`).value = 'BOXES';
      sheet.getCell(`F${currentRow}`).value = 'GROSS WT (KGS)';

      const row = sheet.getRow(currentRow);
      row.font = { bold: true };
      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        applyBorder(currentRow, c);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
      currentRow++;

      let totalSqm = 0;
      let totalBoxes = 0;
      let totalGross = 0;

      containers.forEach(c => {
        const sqm = parseFloat(c.sqm || c.total_sqm || c.totalSqm || 0);
        const boxes = parseInt(c.boxes || c.total_boxes || c.box || 0, 10);
        const gross = parseFloat(c.gross_weight || c.grossWeight || c.grossWt || c.gross_wt || c.vgm_weight || c.vgmWeight || 0);

        totalSqm += sqm;
        totalBoxes += boxes;
        totalGross += gross;

        const seals = [c.line_seal_no || c.lineSealNo || c.seal_no || c.sealNo, c.e_seal_no || c.eSealNo].filter(s => s && s !== '-').join(' / ');
        const product = c.product_name || c.product || c.productName || c.material_description || '-';

        const rowData = [
          c.container_no || c.containerNo || '-',
          seals || '-',
          product,
          sqm,
          boxes,
          gross
        ];
        
        const dataRow = sheet.addRow(rowData);
        dataRow.eachCell((cell, colNumber) => {
          applyBorder(dataRow.number, colNumber);
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          if ([4, 6].includes(colNumber)) {
            cell.numFmt = '#,##0.00';
            cell.alignment.horizontal = 'right';
          }
          if (colNumber === 5) {
            cell.numFmt = '#,##0';
            cell.alignment.horizontal = 'right';
          }
        });
        currentRow++;
      });

      // Total Row
      const totalRow = sheet.addRow(['TOTAL :-', '', '', totalSqm, totalBoxes, totalGross]);
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        applyBorder(totalRow.number, colNumber);
        if (colNumber === 1) cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if ([4, 5, 6].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if ([4, 6].includes(colNumber)) cell.numFmt = '#,##0.00';
          if (colNumber === 5) cell.numFmt = '#,##0';
        }
      });
      sheet.mergeCells(`A${currentRow}:C${currentRow}`);
      currentRow++;

      // Custom Footer for Invoice Backside / Container Lists
      currentRow++;
      const palletType = documentData.pallet_type || 'NORMAL WOODEN PALLETS';
      const tilesBack = documentData.tiles_back || 'YES';
      const boxesMarking = documentData.boxes_marking || 'YES';
      const boxType = documentData.box_type || 'NON BRANDED';
      const fumigation = documentData.fumigation || 'YES';
      const legalisation = documentData.legalisation || 'NO';
      const otherInstr = documentData.other_instructions || '-';

      sheet.mergeCells(`A${currentRow}:D${currentRow+1}`);
      sheet.getCell(`A${currentRow}`).value = `1. PALLETS :- ${palletType}\n2. MADE IN INDIA :-\n   TILES BACK: ${tilesBack}\n   BOXES: ${boxesMarking}\n3. BOXES :- ${boxType}\n4. FUMIGATION :- ${fumigation}\n5. LEGALISATION :- ${legalisation}\n6. OTHER :- ${otherInstr}`;
      sheet.getCell(`A${currentRow}`).alignment = { vertical: 'top', wrapText: true };
      sheet.getCell(`A${currentRow}`).font = { size: 9 };

      if (boxImageId !== null) {
        sheet.addImage(boxImageId, {
          tl: { col: 2.8, row: currentRow - 0.8 }, // Align right side of A-D merge
          ext: { width: 50, height: 50 }
        });
      }

      sheet.mergeCells(`E${currentRow}:F${currentRow+1}`);
      sheet.getCell(`E${currentRow}`).value = `FOR, ${exporterName}\n\n\n(AUTHORIZED SIGNATORY)`;
      sheet.getCell(`E${currentRow}`).alignment = { vertical: 'top', horizontal: 'right', wrapText: true };
      sheet.getCell(`E${currentRow}`).font = { bold: true };

      for (let r = currentRow; r <= currentRow + 1; r++) {
        for (let c = 1; c <= 6; c++) {
          applyBorder(r, c);
        }
      }
      sheet.getRow(currentRow).height = 40;
      sheet.getRow(currentRow+1).height = 40;
      currentRow += 2;

      // Weights row
      const netW = parseFloat(documentData.net_weight || documentData.netWeight || documentData.netWt || documentData.net_wt || totalGross || 0);
      const grossW = parseFloat(documentData.gross_weight || documentData.grossWeight || documentData.grossWt || documentData.gross_wt || totalGross || 0);

      sheet.mergeCells(`A${currentRow}:C${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = `NET WEIGHT\n${netW.toFixed(2)} KGS`;
      sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      sheet.getCell(`A${currentRow}`).font = { bold: true };

      sheet.mergeCells(`D${currentRow}:F${currentRow}`);
      sheet.getCell(`D${currentRow}`).value = `GROSS WEIGHT\n${grossW.toFixed(2)} KGS`;
      sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      sheet.getCell(`D${currentRow}`).font = { bold: true };

      for (let c = 1; c <= 6; c++) {
        applyBorder(currentRow, c);
      }
    }

    // Auto-adjust column widths
    sheet.columns = [
      { width: 45 }, // Material Description
      { width: 15 }, // HSN
      { width: 15 }, // Boxes
      { width: 15 }, // SQM
      { width: 20 }, // Rate
      { width: 25 }  // Amount
    ];

    // Generate Excel File
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Extract data for filename
    // docNo is already defined at the top of the function
    // docNo, clientName, and date are already defined at the top of the function

    // Enterprise File Naming
    const filename = generateEnterpriseFilename({
      moduleName: moduleType || 'EXPORT',
      documentNo: docNo,
      clientName: clientName,
      date: date,
      extension: 'xlsx',
      isProductExport: true
    });
    
    saveAs(new Blob([buffer]), filename);

    return true;
  } catch (error) {
    console.error('Export Product XLSX Error:', error);
    throw error;
  }
};

