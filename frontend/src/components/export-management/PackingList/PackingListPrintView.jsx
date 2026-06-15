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

import { useMemo, forwardRef } from 'react';
import { getCompanyConfig } from '../../../config/companyConfig';
import { resolveImageUrl } from '../../../utils/urlHelper';
import '../../../styles/print-master.css';
import useSignature from '../../../hooks/useSignature';
import SignatureBlock from '../../shared/SignatureBlock';

const PackingListPrintView = forwardRef(({ data, boxTypeImageUrl }, ref) => {
  if (!data) return null;

  const companyConfig = getCompanyConfig(data?.company_id || data?.companyId);
  const { signatureUrl, signatoryName } = useSignature(data?.signature_snapshot || null);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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

  const formatNumber = (num, decimals = 2) => {
    const value = parseFloat(num) || 0;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const exporter = useMemo(() => {
    const ci = data.company_info || data.companyInfo || {};

    // Improved bank details resolution: Prefer document-level details only if they are not empty
    const docBank = data.bank_details || data.bankDetails || {};
    const hasDocBank = Object.values(docBank).some(v => v !== null && v !== '');
    const bd = hasDocBank ? docBank : (ci?.bank_details || ci?.bankDetails || {});

    return {
      name: ci.name || ci.company_name || ci.companyName || companyConfig.exporter.name,
      address: ci.address || ci.company_address || ci.companyAddress || companyConfig.exporter.address,
      iecNo: ci.iec_no || ci.iecNo || companyConfig.exporter.iecNo,
      gstn: ci.gstn || ci.gstin || companyConfig.exporter.gstn,
      logoUrl: ci.logo_url || ci.logoUrl,
      bankDetails: {
        accountName: bd.account_name || bd.accountName || bd.account_holder_name || bd.accountHolderName || ci.account_holder_name || ci.accountHolderName || ci.name || companyConfig.bankDetails.accountName,
        accountNumber: bd.account_no || bd.accountNo || bd.account_number || bd.accountNumber || ci.account_number || ci.accountNumber || companyConfig.bankDetails.accountNumber,
        bankName: bd.bank_name || bd.bankName || ci.bank_name || ci.bankName || companyConfig.bankDetails.bankName,
        swiftCode: bd.swift || bd.swift_code || bd.swiftCode || ci.swift_code || ci.swiftCode || companyConfig.bankDetails.swiftCode,
        bankAddress: ci.bank_address || ci.bankAddress || bd.bank_address || bd.bankAddress || companyConfig.bankDetails.bankAddress,
      },
      authorizedPerson: ci.authorized_person || ci.authorized_signatory || ci.comp_authorized_person || ci.contact_person_name || companyConfig.exporter.authorizedPerson || ''
    };
  }, [data, companyConfig]);

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
    let linesRaw = data.productLines || data.product_lines || [];
    if (typeof linesRaw === 'string') {
      try { linesRaw = JSON.parse(linesRaw); } catch (e) { linesRaw = []; }
    }
    return (Array.isArray(linesRaw) ? linesRaw : []).map(line => {
      const isSanitaryware = line.product_type === 'sanitaryware' || line.productType === 'sanitaryware';
      return {
        ...line,
        hsnCode: line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || '',
        description: line.description || line.materialDescription || line.material_description || [line.size, line.surface].filter(Boolean).join(' ') || '',
        totalBoxes: parseInt(line.totalBoxes || line.total_boxes || line.boxes || line.pieces || 0, 10),
        sqmAuto: isSanitaryware ? 0 : parseFloat(line.sqmAuto || line.sqm_auto || line.sqm || 0),
        rate: parseFloat(line.rate || line.unit_price || 0),
        amount: parseFloat(line.amount || line.total_price || 0)
      };
    });
  }, [data]);

  const productLineGroups = useMemo(() => {
    const groups = [];
    let groupStart = 0;
    for (let i = 0; i < productLines.length; i++) {
      if (i === 0) {
        groups[i] = {
          rowSpan: 1,
          mergedBoxes: productLines[i].totalBoxes,
          mergedSqm: productLines[i].sqmAuto,
          mergedNetWeight: parseFloat(productLines[i].netWeight || productLines[i].net_weight || 0),
          mergedGrossWeight: parseFloat(productLines[i].grossWeight || productLines[i].gross_weight || 0)
        };
        continue;
      }
      const prev = productLines[i - 1];
      const curr = productLines[i];
      const prevKey = `${(prev.description || '').trim()}`;
      const currKey = `${(curr.description || '').trim()}`;
      if (prevKey === currKey && prevKey !== '') {
        groups[groupStart].rowSpan += 1;
        groups[groupStart].mergedBoxes += curr.totalBoxes;
        groups[groupStart].mergedSqm += curr.sqmAuto;
        groups[groupStart].mergedNetWeight += parseFloat(curr.netWeight || curr.net_weight || 0);
        groups[groupStart].mergedGrossWeight += parseFloat(curr.grossWeight || curr.gross_weight || 0);
        groups[i] = { rowSpan: 0, mergedBoxes: 0, mergedSqm: 0, mergedNetWeight: 0, mergedGrossWeight: 0 };
      } else {
        groupStart = i;
        groups[i] = {
          rowSpan: 1,
          mergedBoxes: curr.totalBoxes,
          mergedSqm: curr.sqmAuto,
          mergedNetWeight: parseFloat(curr.netWeight || curr.net_weight || 0),
          mergedGrossWeight: parseFloat(curr.grossWeight || curr.gross_weight || 0)
        };
      }
    }
    return groups;
  }, [productLines]);

  const totalBoxes = productLines.reduce((sum, item) => sum + item.totalBoxes, 0) || data.total_boxes || data.totalBoxes || 0;
  const totalSqm = productLines.reduce((sum, item) => sum + item.sqmAuto, 0) || parseFloat(data.total_sqm || data.totalSqm || 0);
  const totalNetWeight = productLines.reduce((sum, item) => sum + (parseFloat(item.netWeight || item.net_weight || 0)), 0) || parseFloat(data.net_weight || data.netWeight || 0);
  const totalGrossWeight = productLines.reduce((sum, item) => sum + (parseFloat(item.grossWeight || item.gross_weight || 0)), 0) || parseFloat(data.gross_weight || data.grossWeight || 0);
  const totalAmount = productLines.reduce((sum, item) => sum + item.amount, 0);

  const amountWhole = Math.floor(totalAmount);
  const amountCents = Math.round((totalAmount - amountWhole) * 100);

  return (
    <div ref={ref} className="print-container">
      <style>{`
        .packing-list-print-view {
          background: white;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          font-size: 7.2pt;
          line-height: 1.2;
          color: black;
          position: relative;
        }

        .packing-list-print-view * {
          box-sizing: border-box;
        }

        .print-h1 {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
          text-align: center;
        }

        .print-logo {
          max-height: 12mm;
          max-width: 40mm;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .print-logo img {
          max-height: 12mm;
          max-width: 40mm;
          object-fit: contain;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0mm;
        }

        .print-table td, .print-table th {
          border: 1px solid #000;
          padding: 1.2mm 2mm;
          vertical-align: top;
          font-size: 7.2pt;
        }

        .print-bold {
          font-weight: bold;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
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
          .no-print {
            display: none !important;
          }
        }
        
        .print-container {
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          padding: 10mm;
          background: white;
          box-shadow: 0 0 15px rgba(0,0,0,0.15);
          font-family: 'Inter', 'Segoe UI', Roboto, sans-serif;
          color: #000;
          box-sizing: border-box;
          position: relative;
        }

        .print-container * {
          box-sizing: border-box;
        }
      `}</style>

      <div className="doc-box">
        {/* Main Document Table */}
        <table className="print-table" style={{ border: 'none' }}>
          <tbody>
            {/* Header Row */}
            <tr>
              <td colSpan="2" style={{ padding: '2mm 5mm', height: '18mm', borderBottom: '1px solid #000' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: 0.5 }}></div>
                  <div className="print-h1" style={{ flex: 3, textAlign: 'center', whiteSpace: 'nowrap', fontSize: '16pt' }}>PACKING LIST</div>
                  <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                    {exporter.logoUrl && (
                      <div className="print-logo">
                        <img
                          src={resolveImageUrl(exporter.logoUrl)}
                          alt="Logo"
                          style={{ maxHeight: '12mm', maxWidth: '45mm', objectFit: 'contain' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
            {/* Top Grid: Exporter and Invoice Details */}
            <tr>
              <td style={{ width: '55%', verticalAlign: 'top', padding: 0 }}>
                <div style={{ padding: '2px 5px', borderBottom: '1px solid #000', minHeight: '15mm' }}>
                  <span className="print-label" style={{ fontSize: '7pt' }}>Exporter :-</span>
                  <div className="print-value print-bold" style={{ fontSize: '8.5pt' }}>{exporter.name}</div>
                  <div className="print-value" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap', lineHeight: 1.1 }}>{exporter.address}</div>
                </div>
                <div style={{ padding: '2px 5px', minHeight: '15mm' }}>
                  <span className="print-label" style={{ fontSize: '7pt' }}>Consignee :-</span>
                  <div className="print-value" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap', lineHeight: 1.1 }}>
                    {data.consignee || data.consigneeDetails || data.consignee_details || 'TO THE ORDER'}
                  </div>
                </div>
              </td>
              <td style={{ width: '45%', verticalAlign: 'top', padding: 0 }}>
                <table className="print-table" style={{ border: 'none', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td colSpan="2" style={{ border: 'none', borderBottom: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Invoice No. & Date</span>
                        <div className="print-value print-bold" style={{ fontSize: '8.5pt' }}>
                          {data.exportInvoiceNo || data.export_invoice_no || data.invoiceNo || data.invoice_no || '-'} / {formatDate(data.exportInvoiceDate || data.invoiceDate || data.invoice_date)}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000', width: '60%', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Pro-forma Invoice No & Date</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>
                          {data.proformaInvoiceNo || data.proforma_invoice_no || '-'} / {formatDate(data.proformaInvoiceDate || data.proforma_invoice_date)}
                        </div>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>I.E.C.NO.</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{exporter.iecNo}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Buyer's Order No. & Date :-</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>
                          {data.buyersOrderNo || data.buyers_order_no || '-'} / {formatDate(data.buyersOrderDate || data.buyers_order_date)}
                        </div>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>GSTN :</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{exporter.gstn}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>LC No. & Date :-</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>
                          {data.lcNumber || data.lc_number || '-'} / {formatDate(data.lcDate || data.lc_date)}
                        </div>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>EPCG No. :</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.epcgNo || data.epcg_no || '-'}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', borderRight: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Shipment Terms -</span>
                        <div className="print-value print-bold" style={{ fontSize: '8.5pt' }}>{data.shipmentTerms || data.shipment_terms || data.deliveryTerms || data.delivery_terms || '-'}</div>
                      </td>
                      <td style={{ border: 'none', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Tariff Code :-</span>
                        <div className="print-value print-bold" style={{ fontSize: '8.5pt' }}>{data.tariffCode || data.tariff_code || data.hsCode || data.hs_code || '-'}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            {/* Middle Grid: Buyer and Origin Details */}
            <tr>
              <td style={{ verticalAlign: 'top', padding: 0 }}>
                <div style={{ padding: '2px 5px', minHeight: '12mm', borderTop: '1px solid #000' }}>
                  <span className="print-label" style={{ fontSize: '7pt' }}>Buyer :-</span>
                  <div className="print-value" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap', lineHeight: 1.1 }}>
                    {data.buyer || data.buyerDetails || data.buyer_details || 'SAME AS CONSIGNEE'}
                  </div>
                </div>
              </td>
              <td style={{ verticalAlign: 'top', padding: 0 }}>
                <table className="print-table" style={{ border: 'none', borderTop: '1px solid #000', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000', width: '50%', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Country of Origin</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.countryOfOrigin || data.country_of_origin || '-'}</div>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Country of Final Destination</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.finalDestination || data.final_destination || data.country || '-'}</div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ border: 'none', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Payment Terms :-</span>
                        <div className="print-value print-bold" style={{ fontSize: '8.5pt', lineHeight: 1.1 }}>{data.paymentTerms || data.payment_terms || '-'}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            {/* Shipping and Bank Grid */}
            <tr>
              <td style={{ verticalAlign: 'top', padding: 0 }}>
                <table className="print-table" style={{ border: 'none', borderTop: '1px solid #000', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000', width: '50%', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Pre-Carriage By :-</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.preCarriageBy || data.pre_carriage_by || '-'}</div>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Place of Receipt</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.placeOfReceipt || data.place_of_receipt || '-'}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Vessel Flight No.:-</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.vesselFlightNo || data.vessel_flight_no || '-'}</div>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Port of Loading</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.portOfLoading || data.port_of_loading || '-'}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', borderRight: '1px solid #000', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Port of Discharge</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.portOfDischarge || data.port_of_discharge || '-'}</div>
                      </td>
                      <td style={{ border: 'none', padding: '2px 5px' }}>
                        <span className="print-label" style={{ fontSize: '7pt' }}>Final Destination</span>
                        <div className="print-value print-bold" style={{ fontSize: '8pt' }}>{data.finalDestination || data.final_destination || '-'}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style={{ verticalAlign: 'top', padding: 0 }}>
                <div style={{ padding: '2px 5px', borderTop: '1px solid #000' }}>
                  <span className="print-label" style={{ fontSize: '7pt' }}>Our Bank Details :-</span>
                  <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginTop: '1mm', fontSize: '8pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', padding: '0.2mm 0', width: '38%', fontWeight: 'bold' }}>A/C Name:</td>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>{exporter.bankDetails.accountName}</td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>A/C No.:</td>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>{exporter.bankDetails.accountNumber}</td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>Bank Name:</td>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>{exporter.bankDetails.bankName}</td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', padding: '0.2mm 0', verticalAlign: 'top', fontWeight: 'bold' }}>Bank Address:</td>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>{exporter.bankDetails.bankAddress}</td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>SWIFT CODE:</td>
                        <td style={{ border: 'none', padding: '0.2mm 0', fontWeight: 'bold' }}>{exporter.bankDetails.swiftCode}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Product Table Section */}
        <div className="print-row border-none" style={{ borderTop: '1px solid #000' }}>
          <table className="print-table" style={{ border: 'none' }}>
            <thead>
              <tr style={{ fontSize: '7pt' }}>
                <th style={{ verticalAlign: 'middle', borderLeft: 'none' }}>MATERIAL DESCRIPTION</th>
                <th style={{ width: '70px', verticalAlign: 'middle' }}>BOXES/SETS</th>
                <th style={{ width: '70px', verticalAlign: 'middle' }}>
                  <div style={{ whiteSpace: 'nowrap' }}>QUANTITY</div>
                  <div style={{ whiteSpace: 'nowrap' }}>(SQM)</div>
                </th>
                <th style={{ width: '90px', verticalAlign: 'middle' }}>
                  <div style={{ whiteSpace: 'nowrap' }}>NET WEIGHT</div>
                  <div style={{ whiteSpace: 'nowrap' }}>(KGS)</div>
                </th>
                <th style={{ width: '90px', borderRight: 'none', verticalAlign: 'middle' }}>
                  <div style={{ whiteSpace: 'nowrap' }}>GROSS WEIGHT</div>
                  <div style={{ whiteSpace: 'nowrap' }}>(KGS)</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" className="text-left print-bold" style={{ backgroundColor: '#f9f9f9', fontSize: '9pt', padding: '1.5mm 6px', lineHeight: 1.2, borderLeft: 'none', borderRight: 'none' }}>
                  TOTAL {data.totalPallets || data.total_pallets || data.pallets || data.total_pallet || 0} PALLETS
                </td>
              </tr>
              {productLines.map((p, i) => {
                const isFoc = !!(p.is_foc || p.isFoc);
                const isSanitaryware = p.product_type === 'sanitaryware' || p.productType === 'sanitaryware';
                const grp = productLineGroups[i];

                // Skip rows that are merged into the previous row
                if (grp.rowSpan === 0) return null;

                return (
                  <tr key={i}>
                    <td className="text-left">
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
                      <div className="print-small" style={{ fontSize: '7pt' }}>
                        {p.description || [p.size, p.surface].filter(Boolean).join(' ')}
                      </div>
                    </td>
                    <td className="text-center">{grp.mergedBoxes}</td>
                    <td className="text-center">{isSanitaryware ? '-' : formatNumber(grp.mergedSqm)}</td>
                    <td className="text-center">{formatNumber(grp.mergedNetWeight)}</td>
                    <td className="text-center" style={{ borderRight: 'none' }}>{formatNumber(grp.mergedGrossWeight)}</td>
                  </tr>
                );
              })}
              {/* Packing Details Reference */}
              <tr style={{ height: '8mm' }}>
                <td colSpan="5" className="text-left print-bold" style={{ paddingLeft: '5mm', borderLeft: 'none', borderRight: 'none' }}>
                  PACKING DETAILS AS PER ANNEXURE
                </td>
              </tr>
              <tr className="print-bold">
                <td colSpan="1" className="text-right" style={{ borderLeft: 'none' }}>TOTAL</td>
                <td className="text-center">{totalBoxes}</td>
                <td className="text-center">{formatNumber(totalSqm)}</td>
                <td className="text-center">{formatNumber(totalNetWeight)}</td>
                <td className="text-center" style={{ borderRight: 'none' }}>{formatNumber(totalGrossWeight)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Smart Consolidated Grid Footer */}
        <div className="print-row border-none" style={{ borderTop: 'none' }}>
          <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
            <tbody>
              {/* Combined Grid: Packing Instructions (Left) and Unified Signatory (Right) */}
              <tr>
                <td colSpan="2" style={{ textAlign: 'left', padding: '1mm 2mm', verticalAlign: 'top', width: '66%', borderBottom: '1px solid #000' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2mm', fontSize: '7pt', lineHeight: '1.2' }}>
                    <div>
                      <strong>1. PALLETS :-</strong> {data.palletType || data.pallet_type || 'NORMAL WOODEN PALLETS'}<br />
                      <strong>2. MADE IN INDIA :-</strong><br />
                      &nbsp;&nbsp;TILES BACK: {data.madeInIndia || 'YES'}<br />
                      &nbsp;&nbsp;BOXES: {data.madeInIndia || 'YES'}
                    </div>
                    <div>
                      <strong>3. BOXES :-</strong> {data.boxType || data.box_type || '-'}
                      {boxTypeImageUrl && (
                        <img 
                          src={boxTypeImageUrl} 
                          alt="Box Type" 
                          style={{ height: '8mm', marginLeft: '4px', verticalAlign: 'middle', borderRadius: '2px' }} 
                        />
                      )}
                      <br />
                      <strong>4. FUMIGATION :-</strong> {data.fumigation || 'YES'}<br />
                      <strong>5. LEGALISATION :-</strong> {data.legalisation || 'NO'}<br />
                      <strong>6. OTHER :-</strong> {data.otherInstructions || '-'}
                    </div>
                  </div>
                </td>
                <td rowSpan="2" style={{ width: '34%', borderLeft: '1px solid #000', verticalAlign: 'top', padding: '2mm' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '7pt', marginBottom: '3mm', lineHeight: '1.2', borderBottom: '1px solid #000', paddingBottom: '2mm' }}>
                    TOTAL FOB {data.portOfLoading || data.port_of_loading || '-'} VALUE :- USD {numberToWords(amountWhole)}
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
              {/* Row 2: Weights */}
              <tr style={{ height: '18mm' }}>
                <td style={{ width: '33%', border: '1px solid #000', borderLeft: 'none', borderTop: 'none', textAlign: 'center', verticalAlign: 'top', padding: '2mm' }}>
                  <div style={{ fontSize: '7pt', marginBottom: '1mm', opacity: 0.8 }}>NET WEIGHT</div>
                  <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>{formatNumber(totalNetWeight)} KGS</div>
                </td>
                <td style={{ width: '33%', border: '1px solid #000', borderTop: 'none', textAlign: 'center', verticalAlign: 'top', padding: '2mm' }}>
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

PackingListPrintView.displayName = 'PackingListPrintView';

export default PackingListPrintView;
