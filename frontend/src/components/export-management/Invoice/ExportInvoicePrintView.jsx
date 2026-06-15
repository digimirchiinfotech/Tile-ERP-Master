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

import { forwardRef, useMemo } from 'react';
import { getCompanyConfig } from '../../../config/companyConfig';
import { resolveImageUrl } from '../../../utils/urlHelper';
import '../../../styles/print-master.css';
import useSignature from '../../../hooks/useSignature';
import SignatureBlock from '../../shared/SignatureBlock';

const ExportInvoicePrintView = forwardRef(({ invoiceData, boxTypeImageUrl }, ref) => {
  const companyConfig = getCompanyConfig(invoiceData?.company_id || invoiceData?.companyId);
  const { signatureUrl, signatoryName } = useSignature(invoiceData?.signature_snapshot || null);

  const formatDate = (dateString) => {
    if (!dateString) return '-';

    if (typeof dateString === 'string' && dateString.includes(',')) {
      return dateString.split(',').map(d => formatDate(d.trim())).join(', ');
    }

    if (typeof dateString !== 'string') {
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          }).replace(/\//g, '.');
        }
      } catch (e) { }
      return '-';
    }

    const trimmed = dateString.trim();
    if (!trimmed || trimmed === '-' || trimmed.toUpperCase() === 'NA' || trimmed.toUpperCase() === 'N/A' || trimmed.toUpperCase() === 'NONE') return '-';

    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }).replace(/\//g, '.');
    }

    const monthRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})/i;
    const monthMatch = trimmed.match(monthRegex);
    if (monthMatch) {
      const months = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = months[monthMatch[1].toLowerCase()];
      const day = monthMatch[2].padStart(2, '0');
      const year = monthMatch[3];
      return `${day}.${month}.${year}`;
    }

    const ddMmYyyyRegex = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/;
    const ddMmYyyyMatch = trimmed.match(ddMmYyyyRegex);
    if (ddMmYyyyMatch) {
      const day = ddMmYyyyMatch[1].padStart(2, '0');
      const month = ddMmYyyyMatch[2].padStart(2, '0');
      const year = ddMmYyyyMatch[3];
      return `${day}.${month}.${year}`;
    }

    const yyyyMmDdRegex = /^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/;
    const yyyyMmDdMatch = trimmed.match(yyyyMmDdRegex);
    if (yyyyMmDdMatch) {
      const year = yyyyMmDdMatch[1];
      const month = yyyyMmDdMatch[2].padStart(2, '0');
      const day = yyyyMmDdMatch[3].padStart(2, '0');
      return `${day}.${month}.${year}`;
    }

    return trimmed;
  };

  const formatNumber = (num) => {
    const value = parseFloat(num) || 0;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

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

  const productLines = useMemo(() => {
    let linesRaw = invoiceData?.productLines || invoiceData?.product_lines || [];
    if (typeof linesRaw === 'string') {
      try { linesRaw = JSON.parse(linesRaw); } catch (e) { linesRaw = []; }
    }

    return (Array.isArray(linesRaw) ? linesRaw : []).map(line => {
      const isFoc = !!(line.is_foc || line.isFoc);
      const isSanitaryware = line.product_type === 'sanitaryware' || line.productType === 'sanitaryware';
      const boxes = parseInt(line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0, 10);
      const sqm = isSanitaryware ? 0 : parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0);
      const rate = parseFloat(line.rate || line.unit_price || 0);
      const amount = isFoc ? 0 : parseFloat(line.amount || line.total_price || (isSanitaryware ? (boxes * rate) : (sqm * rate)));

      return {
        ...line,
        hsnCode: line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || '',
        productName: line.productName || line.product_name || line.product || line.name || 'Unknown',
        description: line.description || line.productDescription || line.product_description || line.material_description || [line.size, line.surface].filter(Boolean).join(' ') || '',
        totalBoxes: boxes,
        sqmAuto: sqm,
        rate,
        amount
      };
    });
  }, [invoiceData?.productLines, invoiceData?.product_lines]);

  // Compute row-span groups: consecutive rows with same description + rate are merged.
  // For each row: rowSpan > 0 = first row of group (render merged cells), 0 = skip those cells.
  // mergedBoxes / mergedSqm / mergedAmount = summed totals shown on the first row of a group.
  const productLineGroups = useMemo(() => {
    const groups = [];
    let groupStart = 0;
    for (let i = 0; i < productLines.length; i++) {
      if (i === 0) {
        groups[i] = { rowSpan: 1, mergedBoxes: productLines[i].totalBoxes, mergedSqm: productLines[i].sqmAuto, mergedAmount: productLines[i].amount };
        continue;
      }
      const prev = productLines[i - 1];
      const curr = productLines[i];
      const prevKey = `${(prev.description || '').trim()}|${prev.rate}`;
      const currKey = `${(curr.description || '').trim()}|${curr.rate}`;
      if (prevKey === currKey && prevKey !== '|0') {
        groups[groupStart].rowSpan += 1;
        groups[groupStart].mergedBoxes += curr.totalBoxes;
        groups[groupStart].mergedSqm += curr.sqmAuto;
        groups[groupStart].mergedAmount += curr.amount;
        groups[i] = { rowSpan: 0, mergedBoxes: 0, mergedSqm: 0, mergedAmount: 0 };
      } else {
        groupStart = i;
        groups[i] = { rowSpan: 1, mergedBoxes: curr.totalBoxes, mergedSqm: curr.sqmAuto, mergedAmount: curr.amount };
      }
    }
    return groups;
  }, [productLines]);

  const exporter = useMemo(() => {
    const ci = invoiceData?.company_info || invoiceData?.companyInfo;
    if (ci) {
      const bd = ci.bank_details || ci.bankDetails || {};
      const settings = ci.settings || {};
      const globalBank = settings.bank_details || {};

      return {
        name: ci.name || ci.company_name || ci.companyName || companyConfig.exporter.name,
        address: ci.address || ci.company_address || ci.companyAddress || companyConfig.exporter.address,
        iecNo: ci.iec_no || ci.iecNo || companyConfig.exporter.iecNo,
        gstn: ci.gstn || ci.gstin || companyConfig.exporter.gstn,
        logoUrl: ci.logo_url || ci.logoUrl || settings.logo_url,
        lutArnNo: ci.lut_arn_no || ci.lutArnNo || settings.lut_arn_no || settings.lut_bond_ref,
        lutDate: ci.lut_date || ci.lutDate || settings.lut_date,
        exporterRef: invoiceData?.exporter_ref || invoiceData?.exporterRef || ci.exporter_ref || ci.exporterRef || '',
        bankDetails: {
          accountName: bd.account_name || bd.accountName || globalBank.account_name || globalBank.accountName || ci.name || companyConfig.bankDetails.accountName,
          accountNumber: bd.account_no || bd.accountNo || globalBank.account_no || globalBank.accountNo || companyConfig.bankDetails.accountNumber,
          bankName: bd.bank_name || bd.bankName || globalBank.bank_name || globalBank.bankName || companyConfig.bankDetails.bankName,
          bankAddress: bd.bank_address || bd.bankAddress || globalBank.bank_address || globalBank.bankAddress || companyConfig.bankDetails.bankAddress,
          swiftCode: bd.swift || bd.swift_code || bd.swiftCode || globalBank.swift || globalBank.swift_code || globalBank.swiftCode || companyConfig.bankDetails.swiftCode,
        },
        authorizedPerson: ci.authorized_person || ci.authorized_signatory || ci.comp_authorized_person || ci.contact_person_name || companyConfig.exporter.authorizedPerson || ''
      };
    }
    return {
      name: companyConfig.exporter.name,
      address: companyConfig.exporter.address,
      iecNo: companyConfig.exporter.iecNo,
      gstn: companyConfig.exporter.gstn,
      logoUrl: null,
      lutArnNo: null,
      lutDate: null,
      exporterRef: '',
      bankDetails: companyConfig.bankDetails,
      authorizedPerson: companyConfig.exporter.authorizedPerson || ''
    };
  }, [invoiceData?.company_info, invoiceData?.companyInfo, companyConfig]);

  const totalPallets = parseInt(invoiceData?.totalPallets || invoiceData?.pallets || productLines.reduce((sum, p) => sum + parseInt(p.totalPallet || p.total_pallet || p.pallets || 0), 0));
  const totalBoxes = productLines.reduce((sum, p) => sum + (parseInt(p.totalBoxes || p.total_boxes || p.boxes || p.pieces || 0)), 0);
  const totalSQM = productLines.reduce((sum, p) => sum + ((p.product_type === 'sanitaryware' || p.productType === 'sanitaryware') ? 0 : parseFloat(p.sqmAuto || p.sqm_auto || p.sqm || 0)), 0);
  const totalAmount = parseFloat(invoiceData?.totalAmount || invoiceData?.total_amount) || productLines.reduce((sum, p) => sum + (parseFloat(p.amount || 0)), 0);
  const totalNetWeight = parseFloat(invoiceData?.netWeight || invoiceData?.net_weight) || productLines.reduce((sum, p) => sum + (parseFloat(p.netWeight || p.net_weight || 0)), 0);
  const totalGrossWeight = parseFloat(invoiceData?.grossWeight || invoiceData?.gross_weight) || productLines.reduce((sum, p) => sum + (parseFloat(p.grossWeight || p.gross_weight || 0)), 0);

  const amountWhole = Math.floor(totalAmount);
  const amountCents = Math.round((totalAmount - amountWhole) * 100);

  return (
    <div ref={ref} className="invoice-print-view">
      <style>{`
        .invoice-print-view { background: #fff; width: 100%; display: flex; flex-direction: column; align-items: center; }
        
        .print-container {
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          padding: 10mm;
          background: white;
          box-shadow: 0 0 15px rgba(0,0,0,0.15);
          font-family: 'Inter', Arial, sans-serif;
          color: #000;
          box-sizing: border-box;
          position: relative;
        }

        .pi-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .pi-table td { border: 1px solid #000; padding: 0.8mm 1.5mm; vertical-align: top; font-size: 7pt; line-height: 1.2; }

        .product-table { width: 100%; border-collapse: collapse; margin: 0; }
        .product-table th, .product-table td { border: 1px solid #000; padding: 1.2mm 1mm; text-align: center; font-size: 7.2pt; vertical-align: middle; }
        .product-table th { background-color: #f8f9fa; font-weight: bold; font-size: 6.8pt; text-transform: uppercase; }

        .signature-row { text-align: center; font-weight: bold; padding: 22mm 1.5mm 1.5mm 1.5mm !important; font-size: 7.2pt; height: 30mm; border: 1px solid #000; vertical-align: bottom !important; }
        
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body {
            margin: 0;
            padding: 0;
            background-color: white !important;
          }
          .print-container {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            overflow: visible;
          }
        }
      `}</style>

      <div className="print-container">
        <div className="doc-box">
          {/* Main Info Box */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              {/* Header Row */}
              <tr>
                <td colSpan="3" style={{ padding: '2mm 5mm', height: '18mm', borderBottom: '1px solid #000', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 0.5 }}></div>
                    <div style={{ flex: 3, textAlign: 'center' }}>
                      <h1 className="pi-header" style={{ fontSize: '16pt', fontWeight: '800', margin: 0 }}>INVOICE</h1>
                    </div>
                    <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                      {exporter.logoUrl && (
                        <div className="pi-logo">
                          <img src={resolveImageUrl(exporter.logoUrl)} alt="Logo" style={{ maxHeight: '12mm', maxWidth: '45mm', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              {/* Regulatory Banner Row */}
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '0.8mm', borderBottom: '1px solid #000', borderLeft: 'none', borderRight: 'none', borderTop: 'none', background: '#f8f9fa', fontSize: '7.2pt', fontWeight: 'bold' }}>
                  {invoiceData?.supply_declaration || invoiceData?.supplyDeclaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND'}<br />
                  {(exporter.lutArnNo || invoiceData?.lut_bond_ref) && <span style={{ marginRight: '4mm' }}>LUT ARN NO: {exporter.lutArnNo || invoiceData?.lut_bond_ref}</span>}
                  {(exporter.lutDate || invoiceData?.lut_date) && <span>DATE: {formatDate(exporter.lutDate || invoiceData?.lut_date)}</span>}
                  <div style={{ fontSize: '6.2pt', fontWeight: 'normal', marginTop: '0.5mm', textTransform: 'uppercase' }}>{invoiceData?.ftp_incentive_declaration || invoiceData?.ftpIncentiveDeclaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'}</div>
                </td>
              </tr>
              <tr>
                <td rowSpan="4" style={{ width: '50%' }}>
                  <strong>EXPORTER :-</strong><br />
                  <strong>{exporter.name}</strong><br />
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.5mm', fontSize: '6.8pt', color: '#333' }}>{exporter.address}</div>
              <div style={{ 
                borderTop: '1px solid #000', 
                marginTop: '1.5mm', 
                paddingTop: '1.5mm',
                marginLeft: '-1.5mm',
                marginRight: '-1.5mm',
                paddingLeft: '1.5mm',
                paddingRight: '1.5mm'
              }}>
                <strong>CONSIGNEE :-</strong><br />
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '6.8pt', color: '#333' }}>{invoiceData?.consigneeDetails || invoiceData?.consignee_details || 'TO THE ORDER'}</div>
              </div>
              <div style={{ 
                borderTop: '1px solid #000', 
                marginTop: '1.5mm', 
                paddingTop: '1.5mm',
                marginLeft: '-1.5mm',
                marginRight: '-1.5mm',
                paddingLeft: '1.5mm',
                paddingRight: '1.5mm'
              }}>
                <strong>BUYER (IF OTHER THAN CONSIGNEE) :-</strong><br />
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '6.8pt', color: '#333' }}>{invoiceData?.buyerDetails || invoiceData?.buyer_details || 'SAME AS ABOVE'}</div>
              </div>
                </td>
                <td colSpan="2">
                  <strong>INVOICE NO. & DATE</strong><br />
                  <strong style={{ fontSize: '8.5pt' }}>{invoiceData?.invoiceNo || invoiceData?.invoice_no} &nbsp;&nbsp;&nbsp; {formatDate(invoiceData?.invoiceDate || invoiceData?.invoice_date)}</strong>
                </td>
              </tr>
              <tr>
                <td style={{ width: '25%' }}>
                  <strong>EXPORTER REF. / PI NO.</strong><br />
                  {invoiceData?.proformaInvoiceNo || invoiceData?.proforma_invoice_no || '-'}
                  {(invoiceData?.proformaDate || invoiceData?.proforma_date) ? `   ${formatDate(invoiceData?.proformaDate || invoiceData?.proforma_date)}` : ''}
                </td>
                <td style={{ width: '25%' }}>
                  <strong>I.E.C. NO.</strong><br />
                  {exporter.iecNo}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>BUYER'S ORDER NO. & DATE</strong><br />
                  {invoiceData?.buyersOrderNo || invoiceData?.buyers_order_no || '-'}
                  {(invoiceData?.buyersOrderDate || invoiceData?.buyers_order_date) ? `   ${formatDate(invoiceData?.buyersOrderDate || invoiceData?.buyers_order_date)}` : ''}
                </td>
                <td>
                  <strong>GSTIN</strong><br />
                  {exporter.gstn}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>LC NO. & DATE</strong><br />
                  {invoiceData?.lcNumber || invoiceData?.lc_number || '-'}
                  {(invoiceData?.lcDate || invoiceData?.lc_date) ? `   ${formatDate(invoiceData?.lcDate || invoiceData?.lc_date)}` : ''}
                </td>
                <td>
                  <strong>EPCG NO.</strong><br />
                  {invoiceData?.epcgNo || invoiceData?.epcg_no || '-'}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>SHIPMENT TERMS</strong><br />
                  <strong>{invoiceData?.deliveryTerms || invoiceData?.delivery_terms || '-'}</strong>
                </td>
                <td>
                  <strong>TARIFF CODE</strong><br />
                  <strong>{invoiceData?.tariffCode || invoiceData?.tariff_code || '-'}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Logistics Grid */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '25%' }}>
                  <strong>PRE-CARRIAGE BY</strong><br />
                  {invoiceData?.preCarriageBy || invoiceData?.pre_carriage_by || '-'}
                </td>
                <td style={{ width: '25%' }}>
                  <strong>PLACE OF RECEIPT</strong><br />
                  {invoiceData?.placeOfReceipt || invoiceData?.place_of_receipt || '-'}
                </td>
                <td rowSpan="3" style={{ width: '50%' }}>
                  <strong>OUR BANK DETAILS :-</strong>
                  <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginTop: '1mm', fontSize: '7pt' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>A/C NAME:</td><td style={{ border: 'none' }}>{exporter.bankDetails.accountName}</td></tr>
                      <tr><td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>A/C NO.:</td><td style={{ border: 'none' }}>{exporter.bankDetails.accountNumber}</td></tr>
                      <tr><td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>BANK NAME:</td><td style={{ border: 'none' }}>{exporter.bankDetails.bankName}</td></tr>
                      <tr><td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>ADDRESS:</td><td style={{ border: 'none' }}>{exporter.bankDetails.bankAddress}</td></tr>
                      <tr><td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>SWIFT CODE:</td><td style={{ border: 'none' }}>{exporter.bankDetails.swiftCode}</td></tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>VESSEL / FLIGHT NO.</strong><br />
                  {invoiceData?.vesselFlightNo || invoiceData?.vessel_flight_no || '-'}
                </td>
                <td>
                  <strong>PORT OF LOADING</strong><br />
                  {invoiceData?.portOfLoading || invoiceData?.port_of_loading || '-'}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>PORT OF DISCHARGE</strong><br />
                  {invoiceData?.portOfDischarge || invoiceData?.port_of_discharge || '-'}
                </td>
                <td>
                  <strong>FINAL DESTINATION</strong><br />
                  {invoiceData?.finalDestination || invoiceData?.final_destination || invoiceData?.country || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Origin & Payment */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '33.3%' }}>
                  <strong>COUNTRY OF ORIGIN</strong><br />
                  <strong>{invoiceData?.countryOfOrigin || invoiceData?.country_of_origin || '-'}</strong>
                </td>
                <td style={{ width: '33.3%' }}>
                  <strong>FINAL DESTINATION</strong><br />
                  <strong>{invoiceData?.country || invoiceData?.country_of_final_destination || '-'}</strong>
                </td>
                <td style={{ width: '33.4%' }}>
                  <strong>PAYMENT TERMS</strong><br />
                  {invoiceData?.paymentTerms || invoiceData?.payment_terms || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Product Table */}
          <table className="product-table" style={{ border: 'none' }}>
            <thead>
              <tr>
                <th rowSpan="2">MATERIAL DESCRIPTION</th>
                <th rowSpan="2" style={{ width: '80px' }}>HSN CODE</th>
                <th colSpan="2">QUANTITY</th>
                <th rowSpan="2" style={{ width: '85px' }}>RATE FOB<br />USD/SQM</th>
                <th rowSpan="2" style={{ width: '95px' }}>AMOUNT FOB<br />USD</th>
              </tr>
              <tr>
                <th style={{ width: '70px' }}>BOXES</th>
                <th style={{ width: '70px' }}>SQM</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="6" style={{ textAlign: 'left', background: '#f9f9f9', fontWeight: 'bold', paddingLeft: '5mm' }}>
                  TOTAL {totalPallets} PALLETS
                </td>
              </tr>
              {productLines.map((p, i) => {
                const isFoc = !!(p.is_foc || p.isFoc);
                const isSanitaryware = p.product_type === 'sanitaryware' || p.productType === 'sanitaryware';
                const grp = productLineGroups[i] || { rowSpan: 1, mergedBoxes: p.totalBoxes, mergedSqm: p.sqmAuto, mergedAmount: p.amount };

                // Skip rows that are merged into the previous row
                if (grp.rowSpan === 0) return null;

                return (
                  <tr key={i}>
                    <td style={{ textAlign: 'left', paddingLeft: '2mm', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: isFoc ? 'column' : 'row', alignItems: isFoc ? 'flex-start' : 'center', gap: '4px' }}>
                        {isFoc && (
                          <span style={{
                            fontSize: '6.5pt',
                            fontWeight: '900',
                            color: '#d32f2f',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            marginBottom: '1mm'
                          }}>
                            FREE OF COST SAMPLE NO COMMERCIAL VALUE
                          </span>
                        )}
                      </div>
                      {p.description && p.description !== p.productName && p.description.toLowerCase() !== 'name' && p.description.toLowerCase() !== 'unknown' && p.description !== '-' && (
                        <div style={{ fontSize: '6.5pt', fontWeight: 'normal', color: '#555', marginTop: '0.5mm', textAlign: 'left', width: '100%', wordBreak: 'break-word' }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '6.5pt' }}>{p.hsnCode || ''}</td>
                    <td>{grp.mergedBoxes}</td>
                    <td>{isSanitaryware ? '0.00' : formatNumber(grp.mergedSqm)}</td>
                    <td style={{ fontWeight: 'bold' }}>{isFoc ? '0.00' : formatNumber(p.rate || 0)}</td>
                    <td style={{ fontWeight: 'bold' }}>{isFoc ? '0.00' : formatNumber(grp.mergedAmount)}</td>
                  </tr>
                );
              })}
              {/* Packing Details Reference */}
              <tr style={{ height: '8mm' }}>
                <td colSpan="6" style={{ textAlign: 'left', paddingLeft: '5mm', fontWeight: 'bold', borderTop: 'none' }}>
                  PACKING DETAILS AS PER ANNEXURE
                </td>
              </tr>
              <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                <td colSpan="2" style={{ textAlign: 'right', paddingRight: '5mm' }}>TOTAL :-</td>
                <td>{totalBoxes}</td>
                <td>{formatNumber(totalSQM)}</td>
                <td></td>
                <td>{formatNumber(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Smart Consolidated Grid Footer */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              {/* Row 1: Packing Info and Total Value */}
              {/* Combined Grid: Packing Instructions (Left) and Unified Signatory/Value (Right) */}
              <tr>
                <td colSpan="2" style={{ width: '66%', padding: '1mm 2mm', borderBottom: '1px solid #000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1mm', fontSize: '6.8pt', lineHeight: '1.2', textAlign: 'left', flex: 1 }}>
                      <div>
                        <strong>1. PALLETS :-</strong> {invoiceData?.palletType || invoiceData?.pallet_type || 'NORMAL WOODEN PALLETS'}<br />
                        <strong>2. MADE IN INDIA :-</strong><br />
                        &nbsp;&nbsp;TILES BACK: {invoiceData?.tilesBack || invoiceData?.tiles_back || 'YES'}<br />
                        &nbsp;&nbsp;BOXES: {invoiceData?.boxesMarking || invoiceData?.boxes_marking || 'YES'}
                      </div>
                      <div>
                        <strong>3. BOXES :-</strong> {invoiceData?.boxType || invoiceData?.box_type || 'NON BRANDED'}<br />
                        <strong>4. LEGALISATION :-</strong> {invoiceData?.legalisation || 'NO'}<br />
                        <strong>5. FUMIGATION :-</strong> {invoiceData?.fumigation || 'NO'}
                      </div>
                    </div>
                    {boxTypeImageUrl && (
                      <div style={{ marginLeft: '10px', flexShrink: 0, paddingRight: '5px' }}>
                        <img 
                          src={boxTypeImageUrl} 
                          alt="Box Type" 
                          style={{ maxHeight: '60px', maxWidth: '60px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '4px' }} 
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '6.8pt', marginTop: '2mm' }}>
                    <strong>6. OTHER :-</strong> <span style={{ whiteSpace: 'pre-line' }}>{invoiceData?.otherInstructions || invoiceData?.other_instructions || '-'}</span>
                  </div>
                </td>
                <td rowSpan="2" style={{ width: '34%', verticalAlign: 'top', padding: '2mm' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '7pt', marginBottom: '3mm', lineHeight: '1.2', borderBottom: '1px solid #000', paddingBottom: '2mm' }}>
                    TOTAL FOB {invoiceData?.portOfLoading || invoiceData?.port_of_loading || 'MUNDRA'} VALUE :- USD {numberToWords(amountWhole)}
                    {amountCents > 0 ? ` AND CENTS ${numberToWords(amountCents)}` : ''} ONLY.
                  </div>
                  <SignatureBlock
                    signatureUrl={signatureUrl}
                    signatoryName={signatoryName}
                    companyName={exporter.name}
                    style={{ textAlign: 'right' }}
                  />
                </td>
              </tr>
              <tr>
                <td className="signature-row" style={{ width: '33%', verticalAlign: 'top', borderTop: 'none' }}>
                  <div style={{ fontSize: '7pt', marginBottom: '1mm', opacity: 0.8 }}>NET WEIGHT</div>
                  <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>{formatNumber(totalNetWeight)} KGS</div>
                </td>
                <td className="signature-row" style={{ width: '33%', verticalAlign: 'top', borderTop: 'none', borderLeft: '1px solid #000' }}>
                  <div style={{ fontSize: '7pt', marginBottom: '1mm', opacity: 0.8 }}>GROSS WEIGHT</div>
                  <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>{formatNumber(totalGrossWeight)} KGS</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

ExportInvoicePrintView.displayName = 'ExportInvoicePrintView';

export default ExportInvoicePrintView;
