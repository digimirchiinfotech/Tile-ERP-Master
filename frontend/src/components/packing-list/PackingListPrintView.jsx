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
import { getCompanyConfig } from '../../config/companyConfig';

const PackingListPrintView = forwardRef(({ packingListData }, ref) => {
  if (!packingListData) return null;

  const companyConfig = getCompanyConfig(packingListData?.company_id || packingListData?.companyId);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '.');
  };

  const formatNumber = (num, decimals = 2) => {
    const value = parseFloat(num) || 0;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const exporter = useMemo(() => {
    const ci = packingListData.company_info || packingListData.companyInfo;
    const bd = packingListData.bank_details || packingListData.bankDetails || ci?.bank_details || {};
    if (ci) {
      return {
        name: ci.name || ci.company_name || ci.companyName || companyConfig.exporter.name,
        address: ci.address || ci.company_address || ci.companyAddress || companyConfig.exporter.address,
        iecNo: ci.iec_no || ci.iecNo || companyConfig.exporter.iecNo,
        gstn: ci.gstn || ci.gstin || companyConfig.exporter.gstn,
        bankDetails: {
          accountName: bd.account_name || bd.accountName || bd.account_holder_name || bd.accountHolderName || ci.account_holder_name || ci.accountHolderName || ci.name || companyConfig.bankDetails.accountName,
          accountNumber: bd.account_no || bd.accountNo || bd.account_number || bd.accountNumber || ci.account_number || ci.accountNumber || companyConfig.bankDetails.accountNumber,
          bankName: bd.bank_name || bd.bankName || ci.bank_name || ci.bankName || companyConfig.bankDetails.bankName,
          swiftCode: bd.swift || bd.swift_code || bd.swiftCode || ci.swift_code || ci.swiftCode || companyConfig.bankDetails.swiftCode,
        }
      };
    }
    return {
      name: companyConfig.exporter.name,
      address: companyConfig.exporter.address,
      iecNo: companyConfig.exporter.iecNo,
      gstn: companyConfig.exporter.gstn,
      bankDetails: companyConfig.bankDetails
    };
  }, [packingListData, companyConfig]);

  const productLines = useMemo(() => {
    return Array.isArray(packingListData.productLines || packingListData.product_lines) 
      ? (packingListData.productLines || packingListData.product_lines) 
      : [];
  }, [packingListData]);

  const totalBoxes = productLines.reduce((sum, item) => sum + (parseInt(item.totalBoxes || item.boxes || 0)), 0) || packingListData.total_boxes || packingListData.totalBoxes || 0;
  const totalSqm = productLines.reduce((sum, item) => {
    const lineSqm = item.sqmAuto || item.sqm_auto || (parseFloat(item.sqm || 0) * parseInt(item.totalBoxes || item.boxes || 0));
    return sum + (parseFloat(lineSqm) || 0);
  }, 0) || parseFloat(packingListData.total_sqm || packingListData.totalSqm || 0);
  const totalNetWeight = productLines.reduce((sum, item) => sum + (parseFloat(item.netWeight || item.net_weight || 0)), 0) || parseFloat(packingListData.net_weight || packingListData.netWeight || 0);
  const totalGrossWeight = productLines.reduce((sum, item) => sum + (parseFloat(item.grossWeight || item.gross_weight || 0)), 0) || parseFloat(packingListData.gross_weight || packingListData.grossWeight || 0);

  return (
    <div ref={ref} className="packing-list-print-view">
      <style>{`
        .packing-list-print-view {
          width: 210mm;
          min-height: 100%; height: auto;
          margin: 0 auto;
          padding: 15mm;
          background: #fff;
          font-family: "Times New Roman", Times, serif;
          font-size: 9pt;
          color: #000;
          box-sizing: border-box;
        }

        .packing-title {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 5mm;
          text-transform: uppercase;
        }

        .main-table {
          width: 100%;
          border-collapse: collapse;
        }

        .main-table td {
          border: 1px solid #000;
          padding: 2mm;
          vertical-align: top;
        }

        .section-header {
          font-size: 7pt;
          font-weight: bold;
          margin-bottom: 1mm;
          display: block;
        }

        .shipping-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: -1px;
        }

        .shipping-table td {
          border: 1px solid #000;
          padding: 2mm;
          vertical-align: top;
          font-size: 8pt;
        }

        .product-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: -1px;
        }

        .product-table th,
        .product-table td {
          border: 1px solid #000;
          padding: 2mm 1.5mm;
          text-align: center;
          font-size: 8pt;
          vertical-align: middle;
        }

        .product-table th {
          font-weight: bold;
          font-size: 7pt;
          background-color: #fff;
        }

        .product-table td:first-child {
          text-align: left;
        }

        .total-row {
          font-weight: bold;
        }

        .instruction-section {
          width: 50%;
          vertical-align: top;
          padding: 2mm 3mm;
          font-size: 8pt;
          border: 1px solid #000;
        }

        .bank-details-section {
          width: 50%;
          border: 1px solid #000;
          border-left: none;
          padding: 2mm 3mm;
          font-size: 8pt;
        }

        .weight-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: -1px;
        }

        .weight-table td {
          border: 1px solid #000;
          padding: 2mm;
          font-size: 9pt;
        }

        .signature-section {
          margin-top: 10mm;
          text-align: right;
          font-size: 10pt;
        }

        .company-name {
          font-weight: bold;
          font-size: 12pt;
        }

        .auth-signatory {
          font-weight: bold;
        }

        .pre-wrap { white-space: pre-wrap; }

        @media print {
          body { margin: 0; padding: 0; }
          .packing-list-print-view {
            width: 100% !important;
            padding: 15mm !important;
            margin: 0 !important;
          }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <div className="packing-title">PACKING LIST</div>

      <table className="main-table">
        <tbody>
          <tr>
            <td rowSpan="4" style={{ width: '55%' }}>
              <div style={{ marginBottom: '3mm' }}>
                <span className="section-header">EXPORTER :-</span>
                <strong>{exporter.name}</strong><br />
                <div className="pre-wrap small-text">{exporter.address}</div>
              </div>
              <div style={{ marginBottom: '3mm' }}>
                <span className="section-header">CONSIGNEE :-</span>
                <div className="pre-wrap small-text">{packingListData.consignee || packingListData.consignee_details || packingListData.clientName || packingListData.client_name || '-'}</div>
              </div>
              <div>
                <span className="section-header">BUYER :-</span>
                <div className="pre-wrap small-text">{packingListData.buyer || packingListData.buyer_details || '-'}</div>
              </div>
            </td>
            <td style={{ width: '45%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="section-header">PACKING LIST NO. & DATE</span>
                <strong>{packingListData.packingListNo || packingListData.packing_list_no || '-'} &nbsp; {formatDate(packingListData.date)}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span className="section-header">EXP REFERENCE NO & DT</span>
              <strong>{packingListData.piReference || packingListData.exportInvoiceNo || packingListData.export_invoice_no || '-'} &nbsp; {formatDate(packingListData.exportInvoiceDate || packingListData.invoice_date)}</strong>
              <div style={{ marginTop: '2mm', display: 'flex', gap: '5mm' }}>
                <div><span className="section-header">I.E.C NO:</span> {exporter.iecNo}</div>
                <div><span className="section-header">GSTN:</span> {exporter.gstn}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span className="section-header">BUYER'S ORDER NO. & DATE</span>
              {packingListData.buyersOrderNo || packingListData.buyers_order_no || '-'} &nbsp; {formatDate(packingListData.buyersOrderDate || packingListData.buyers_order_date)}
              <div style={{ marginTop: '2mm' }}>
                <span className="section-header">SHIPMENT TERMS -</span>
                {packingListData.shipmentTerms || packingListData.shipment_terms || packingListData.delivery_terms || packingListData.deliveryTerms || '-'}
              </div>
              <div style={{ marginTop: '1mm' }}>
                <span className="section-header">TARIFF CODE :-</span>
                {packingListData.tariffCode || packingListData.tariff_code || packingListData.hsCode || packingListData.hs_code || '-'}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div style={{ marginBottom: '2mm' }}>
                <span className="section-header">B. L. NO. & DATE</span>
                {packingListData.blNo || packingListData.bl_no || '-'} &nbsp; {formatDate(packingListData.blDate || packingListData.bl_date)}
              </div>
              <div>
                <span className="section-header">S. B. NO. & DATE</span>
                {packingListData.sbNo || packingListData.sb_no || '-'} &nbsp; {formatDate(packingListData.sbDate || packingListData.sb_date)}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="shipping-table">
        <tbody>
          <tr>
            <td style={{ width: '25%' }}>
              <span className="section-header">PRE-CARRIAGE BY</span>
              {packingListData.preCarriageBy || packingListData.pre_carriage_by || '-'}
            </td>
            <td style={{ width: '25%' }}>
              <span className="section-header">PLACE OF RECEIPT</span>
              {packingListData.placeOfReceipt || packingListData.place_of_receipt || '-'}
            </td>
            <td style={{ width: '25%' }}>
              <span className="section-header">COUNTRY OF ORIGIN</span>
              {packingListData.countryOfOrigin || packingListData.country_of_origin || 'INDIA'}
            </td>
            <td style={{ width: '25%' }}>
              <span className="section-header">FINAL DESTINATION</span>
              {packingListData.finalDestination || packingListData.final_destination || packingListData.country || '-'}
            </td>
          </tr>
          <tr>
            <td>
              <span className="section-header">VESSEL / FLIGHT NO.</span>
              {packingListData.vesselFlightNo || packingListData.vessel_flight_no || packingListData.vessel_name || '-'}
            </td>
            <td>
              <span className="section-header">PORT OF LOADING</span>
              {packingListData.portOfLoading || packingListData.port_of_loading || '-'}
            </td>
            <td>
              <span className="section-header">PORT OF DISCHARGE</span>
              {packingListData.portOfDischarge || packingListData.port_of_discharge || '-'}
            </td>
            <td>
              <span className="section-header">PAYMENT TERMS</span>
              {packingListData.paymentTerms || packingListData.payment_terms || '-'}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="product-table">
        <thead>
          <tr>
            <th style={{ width: '45%' }}>MATERIAL DESCRIPTION</th>
            <th style={{ width: '12%' }}>BOXES / SETS</th>
            <th style={{ width: '13%' }}>QUANTITY (SQM)</th>
            <th style={{ width: '15%' }}>NET WEIGHT</th>
            <th style={{ width: '15%' }}>GROSS WEIGHT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="5" style={{ textAlign: 'left', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
              TOTAL {packingListData.totalPallets || packingListData.total_pallets || 0} PALLETS
            </td>
          </tr>
          {productLines.map((item, idx) => {
            const lineSqm = item.sqmAuto || item.sqm_auto || (parseFloat(item.sqm || 0) * parseInt(item.totalBoxes || item.boxes || 0));
            return (
              <tr key={idx}>
                <td style={{ textAlign: 'left' }}>
                  <strong>{item.product || item.product_name || item.productName}</strong>
                </td>
                <td>{item.totalBoxes || item.boxes || 0}</td>
                <td>{formatNumber(lineSqm || 0)}</td>
                <td>{formatNumber(item.netWeight || item.net_weight || 0)}</td>
                <td>{formatNumber(item.grossWeight || item.gross_weight || 0)}</td>
              </tr>
            );
          })}
          <tr className="total-row">
            <td style={{ textAlign: 'left' }}>TOTAL</td>
            <td>{totalBoxes}</td>
            <td>{formatNumber(totalSqm)}</td>
            <td>{formatNumber(totalNetWeight)}</td>
            <td>{formatNumber(totalGrossWeight)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', marginTop: '-1px' }}>
        <div className="instruction-section">
          <span className="section-header" style={{ fontSize: '8pt' }}>SPECIFIC INSTRUCTIONS :-</span>
          1. PALLETS :- {packingListData.palletType || packingListData.pallet_type || 'WITH INDIA'}<br />
          2. MADE IN INDIA :- TILES BACK : {packingListData.madeInIndia || packingListData.made_in_india || 'YES'}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;BOXES : {packingListData.madeInIndia || packingListData.made_in_india || 'YES'}<br />
          3. BOXES :- {packingListData.boxType || packingListData.box_type || '-'}<br />
          4. FUMIGATION :- {packingListData.fumigation || 'YES'}<br />
          5. LEGALISATION :- {packingListData.legalisation || 'NO'}<br />
          6. ANY OTHER INSTRUCTIONS :- {packingListData.otherInstructions || packingListData.other_instructions || '-'}
        </div>
        <div className="bank-details-section">
          <span className="section-header" style={{ fontSize: '8pt' }}>OUR BANK DETAILS :-</span>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', rowGap: '1mm' }}>
            <strong>A/C NAME:</strong> {exporter.bankDetails.accountName}<br />
            <strong>A/C NO.:</strong> {exporter.bankDetails.accountNumber}<br />
            <strong>BANK:</strong> {exporter.bankDetails.bankName}<br />
            <strong>SWIFT:</strong> {exporter.bankDetails.swiftCode}
          </div>
        </div>
      </div>

      <table className="weight-table" style={{ marginTop: '-1px' }}>
        <tbody>
          <tr style={{ fontWeight: 'bold' }}>
            <td style={{ width: '30%' }}>NET WEIGHT</td>
            <td style={{ width: '40%', textAlign: 'center' }}>{formatNumber(totalNetWeight)}</td>
            <td style={{ width: '30%', textAlign: 'right' }}>KGS</td>
          </tr>
          <tr style={{ fontWeight: 'bold' }}>
            <td style={{ width: '30%' }}>GROSS WEIGHT</td>
            <td style={{ width: '40%', textAlign: 'center' }}>{formatNumber(totalGrossWeight)}</td>
            <td style={{ width: '30%', textAlign: 'right' }}>KGS</td>
          </tr>
        </tbody>
      </table>

      <div className="signature-section">
        <div className="company-name">FOR, {exporter.name}</div>
        <div className="auth-signatory">(AUTHORIZED SIGNATORY)</div>
      </div>
    </div>
  );
});

PackingListPrintView.displayName = 'PackingListPrintView';

export default PackingListPrintView;
