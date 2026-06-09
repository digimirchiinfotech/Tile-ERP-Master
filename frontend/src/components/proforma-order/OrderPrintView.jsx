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
import { formatPrice } from '../../utils/formatters.js';
import { resolveImageUrl } from '../../utils/urlHelper';
import useSignature from '../../hooks/useSignature';
import SignatureBlock from '../shared/SignatureBlock';

const OrderPrintView = forwardRef(({ orderData, boxTypeImageUrl }, ref) => {
  const companyConfig = getCompanyConfig(orderData?.company_id || orderData?.companyId);
  const { signatureUrl, signatoryName } = useSignature(orderData?.signature_snapshot || null);

  const exporter = useMemo(() => {
    const ci = orderData?.company_info || orderData?.companyInfo;
    if (ci) {
      const bd = ci.bank_details || ci.bankDetails || {};
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
          bankAddress: ci.bank_address || ci.bankAddress || bd.bank_address || bd.bankAddress || ci.branch_name || ci.branchName || companyConfig.bankDetails.bankAddress,
          swiftCode: bd.swift || bd.swift_code || bd.swiftCode || ci.swift_code || ci.swiftCode || companyConfig.bankDetails.swiftCode,
        }
      };
    }
    return {
      name: companyConfig.exporter.name,
      address: companyConfig.exporter.address,
      iecNo: companyConfig.exporter.iecNo,
      gstn: companyConfig.exporter.gstn,
      logoUrl: null,
      bankDetails: companyConfig.bankDetails
    };
  }, [orderData?.company_info, orderData?.companyInfo, companyConfig]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '.');
  };

  const formatNumber = (num) => {
    return num ? num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : '0.00';
  };

  const numberToWords = (num) => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const scale = ['', 'THOUSAND', 'LAC', 'CRORE'];

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
    let level = 0;
    let first = true;

    while (num > 0) {
      const divisor = first ? 1000 : 100;
      first = false;

      const segment = num % divisor;
      num = Math.floor(num / divisor);

      if (segment !== 0) {
        result = convertHundreds(segment) + (scale[level] ? scale[level] + ' ' : '') + result;
      }
      level++;
    }

    return result.trim();
  };

  const totalAmount = orderData?.subtotal || orderData?.totalAmount || (orderData?.subtotal === undefined ? orderData?.total_amount : 0) || 0;
  const gstRate = parseFloat(orderData?.gst_rate !== undefined ? orderData.gst_rate : (orderData?.gstRate !== undefined ? orderData.gstRate : 0));
  const gstAmount = orderData?.gst_amount !== undefined ? orderData.gst_amount : (orderData?.gstAmount !== undefined ? orderData.gstAmount : (totalAmount * (gstRate / 100)));
  const poValue = orderData?.poValue || orderData?.total_amount || (totalAmount + gstAmount);

  const products = orderData?.productLines || orderData?.product_lines || [];
  const totalPallets = products.reduce((sum, p) => sum + (parseFloat(p.totalPallet || p.total_pallet || p.pallets || 0)), 0) || 0;
  const totalBoxes = products.reduce((sum, p) => sum + (parseFloat((p.productType === 'sanitaryware' || p.product_type === 'sanitaryware') ? (p.pieces || p.totalBoxes || 0) : (p.totalBoxes || p.total_boxes || p.boxes || 0))), 0) || 0;
  const totalSQM = products.reduce((sum, p) => sum + (parseFloat(p.sqmAuto || p.sqm_auto || p.sqm || 0)), 0) || 0;
  const totalNetWeight = products.reduce((sum, p) => sum + (parseFloat(p.netWeight || p.net_weight || 0)), 0) || 0;
  const totalGrossWeight = products.reduce((sum, p) => sum + (parseFloat(p.grossWeight || p.gross_weight || 0)), 0) || 0;

  return (
    <div ref={ref} className="order-print-view">
      <style>{`
        .order-print-view {
          background: #f8f9fa;
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
        }

        .order-page {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
          background: white;
          margin-bottom: 10mm;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
          position: relative;
          color: #000;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 8pt;
          line-height: 1.3;
        }

        .order-print-view * {
          box-sizing: border-box;
        }

        .po-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          min-height: 14mm;
          padding: 1mm 0;
          border-bottom: 1.5px solid #000;
          margin-bottom: 2mm;
        }

        .po-header {
          font-size: 16pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
          text-align: center;
          white-space: nowrap;
        }

        .po-logo {
          max-height: 10mm;
          max-width: 40mm;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .po-logo img {
          max-height: 10mm;
          max-width: 40mm;
          object-fit: contain;
        }

        .po-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
        }

        .po-table td {
          border: 1px solid #000;
          padding: 1mm 1.5mm;
          vertical-align: top;
          font-size: 7.5pt;
        }

        .product-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }

        .product-table th,
        .product-table td {
          border: 1px solid #000;
          padding: 1mm;
          text-align: center;
          font-size: 7.5pt;
          vertical-align: middle;
        }

        .product-table th {
          background-color: #f8f9fa;
          font-weight: bold;
          font-size: 7pt;
          text-transform: uppercase;
        }

        .product-image {
          width: 14mm;
          height: 14mm;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }

        .total-row {
          font-weight: bold;
          background-color: #f8f9fa;
        }

        .buyer-section {
          width: 50%;
        }

        .order-ref-section {
          width: 25%;
        }

        .sc-ref-section {
          width: 25%;
        }

        .compliance-text {
          font-size: 6.5pt;
          line-height: 1.2;
          text-align: justify;
          padding: 1mm 2mm !important;
        }

        .instructions-section {
          border: 1px solid #000;
          padding: 2mm 3mm;
          font-size: 8pt;
          text-align: left;
        }

        .amount-words-cell {
          text-align: left;
          font-weight: bold;
          font-size: 8pt;
          padding: 3mm !important;
        }

        .signature-row {
          text-align: center;
          font-weight: bold;
          padding: 30mm 2mm 2mm 2mm !important;
          font-size: 8pt;
          vertical-align: bottom !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm !important;
          }

          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }

          .order-print-view {
            width: 100%;
            background: white;
            padding: 0;
            margin: 0;
          }

          .order-page {
            width: 190mm !important;
            min-height: 277mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            border: 1px solid #000;
          }

          .order-page:last-child {
            page-break-after: auto;
          }

          .no-print {
            display: none !important;
          }
        }

        @media screen {
          .order-page {
            border: 1px solid #ddd;
          }
        }
      `}</style>

      <div className="order-page">
        {/* Header */}
        <div className="po-header-container">
        <div style={{ flex: 0.5 }}></div>
        <div style={{ flex: 3, textAlign: 'center' }}>
          <h1 className="po-header" style={{ fontSize: '16pt', margin: 0 }}>PURCHASE ORDER</h1>
        </div>
        <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
          {exporter.logoUrl && (
            <div className="po-logo">
              <img
                src={resolveImageUrl(exporter.logoUrl)}
                alt="Logo"
                style={{ maxHeight: '10mm', maxWidth: '45mm', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Info Section */}
      <table className="po-table">
        <tbody>
          <tr>
            <td rowSpan="4" className="buyer-section">
              <div style={{ marginBottom: '2mm' }}>
                <strong>BUYER:-</strong><br />
                <br />
                <strong>{exporter.name}</strong><br />
                {exporter.address.split('\n').map((line, i) => (
                  <span key={i}>{line}<br /></span>
                ))}
                <strong>GSTN : {exporter.gstn}</strong>
              </div>

              <div style={{ borderTop: '1px solid #000', paddingTop: '1.5mm', marginTop: '1.5mm' }}>
                <strong>SUPPLIER:</strong><br />
                <br />
                {(orderData?.supplierDetails || orderData?.supplier_details) ? (
                  (orderData.supplierDetails || orderData.supplier_details).split('\n').map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))
                ) : (
                  <>
                    <strong>{orderData?.supplier || orderData?.supplier_name || 'NO SUPPLIER DETAILS'}</strong><br />
                    <span className="text-muted small">Please update supplier details in the order form.</span>
                  </>
                )}
              </div>
            </td>
            <td className="order-ref-section">
              <strong>PURCHASE ORDER NO. & DATE</strong><br /><br />
              <strong>{orderData?.orderNo || ''} Dt.{formatDate(orderData?.date)}</strong>
              {(orderData?.revision_no || orderData?.revisionNo) && (
                <div style={{ marginTop: '1.5mm', fontSize: '6.5pt', color: '#444' }}>
                  <strong>REVISION NO:</strong> {orderData?.revision_no || orderData?.revisionNo} &nbsp;&nbsp;&nbsp;
                  <strong>REV DATE:</strong> {orderData?.updated_at || orderData?.updatedAt ? formatDate(orderData.updated_at || orderData.updatedAt) : formatDate(orderData?.date)}
                </div>
              )}
            </td>
            <td className="sc-ref-section">
              <strong>SC REF. NO.</strong><br /><br />
              <strong>{orderData?.scRefNo || orderData?.pi_reference || orderData?.piReference || 'N/A'}</strong>
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <strong>DELIVERY TERMS:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {orderData?.deliverySchedule || 'EX-FACTORY'}
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <strong>PAYMENT TERMS:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {orderData?.paymentTerms || 'AGAINST FACTORY INVOICE'}
            </td>
          </tr>
          <tr>
            <td colSpan="2" className="compliance-text">
              PRODUCTS MANUFACTURED & SUPPLIED BY THE SUPPLIER SHALL CONFIRM & COMPLY IN ALL DIMENSIONAL, PHYSICAL & CHEMICAL PARAMETERS TO THE REQUIREMENTS, STANDARDS & SPECIFICATIONS AS PRESCRIBED IN THE BS EN ISO 14411 STANDARDS. IN THE EVENT THAT THE PRODUCTS DELIVERED DO NOT CONFIRM TO THE SPECIFICATIONS AS AGREED, THE SUPPLIER SHALL BE LIABLE TO THE BUYER IN RESPECT OF ANY CLAIMS AND EXPENSES ENSUING FROM JUSTIFIED LIABILITIES TO RECOURSE AND ADDITIONAL COSTS ARISING THEREFROM (E.G. BREAKAGE, REPLACEMENT, REDUCTION IN PURCHASE PRICE AND COSTS FOR RESTORING TO ORIGINAL CONDITION, COSTS FOR PROCESSING COMPLAINTS, CONTRACTUAL PENALTIES, COST OF RESORTING AND/OR REPACKAGING, ETC). ALL OTHER REASONS OF DEFECT, INCLUDING BREAKAGES AND SURFACE CHIPPING QUANTITY WILL BE FULLY BORNE BY THE SELLER.
            </td>
          </tr>
        </tbody>
      </table>

      {/* Product Table */}
      <table className="product-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>MATERIAL DESCRIPTION</th>
            <th style={{ width: '15%' }}>DESIGN IMAGE</th>
            <th style={{ width: '10%' }}>FACTORY PRODUCT NAME</th>
            <th style={{ width: '6%' }}>HSN<br />CODE</th>
            <th style={{ width: '6%' }}>NO OF<br />PALLETS</th>
            <th style={{ width: '9%' }}>QUANTITY<br />BOXES</th>
            <th style={{ width: '10%' }}>QUANTITY<br />(SQM)</th>
            <th style={{ width: '8%' }}>RATE PER<br />BOX</th>
            <th style={{ width: '8%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {(orderData?.productLines || orderData?.product_lines) && (orderData.productLines || orderData.product_lines).length > 0 ? (
            (orderData.productLines || orderData.product_lines).map((product, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'left', fontSize: '7pt', padding: '2mm' }}>
                  <strong>{product.product || product.productName || product.itemDescription || product.product_name || ''}</strong><br />
                  {(product.description || product.productDescription || product.product_description) && (
                    <div style={{ fontSize: '6.5pt', marginTop: '1mm', fontStyle: 'italic', color: '#333' }}>
                      {product.description || product.productDescription || product.product_description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1mm' }}>
                  {product.image && (
                    <img src={product.image} alt={product.product} className="product-image" />
                  )}
                </td>
                <td>{product.factoryProductName || product.factory_product_name || product.itemRef || product.item_ref || product.factoryReference || ''}</td>
                <td style={{ fontSize: '6.5pt' }}>{product.hsnCode || product.hsn_code || ''}</td>
                <td>{product.totalPallets || product.totalPallet || product.total_pallets || product.total_pallet || product.pallets || 0}</td>
                <td>{(product.productType === 'sanitaryware' || product.product_type === 'sanitaryware') ? (product.pieces || 0) : (product.totalBoxes || product.total_boxes || product.boxes || 0)}</td>
                <td>{formatNumber(product.sqmAuto || product.sqm_auto || product.sqm || 0)}</td>
                <td>{formatNumber(product.rate || 0)}</td>
                <td>{formatNumber(product.amount || 0)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '10mm' }}>
                No product lines available
              </td>
            </tr>
          )}
          {/* Totals Rows inside product-table for perfect alignment */}
          <tr className="total-row">
            <td colSpan="4" style={{ textAlign: 'right', padding: '1.5mm', fontSize: '7.5pt' }}><strong>TOTAL</strong></td>
            <td><strong>{totalPallets}</strong></td>
            <td><strong>{totalBoxes}</strong></td>
            <td><strong>{formatNumber(totalSQM)}</strong></td>
            <td></td>
            <td style={{ textAlign: 'center' }}><strong>{formatNumber(totalAmount)}</strong></td>
          </tr>
          <tr className="total-row">
            <td colSpan="8" style={{ textAlign: 'right', fontWeight: 'bold' }}>
              GST @ {gstRate.toFixed(2)} %
            </td>
            <td style={{ textAlign: 'center' }}>
              <strong>{formatNumber(gstAmount)}</strong>
            </td>
          </tr>
          <tr className="total-row">
            <td colSpan="8" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '8pt' }}>
              PO VALUE ({orderData?.currency || 'INR (₹)'})
            </td>
            <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '8pt' }}>
              <strong>{formatNumber(poValue)}</strong>
            </td>
          </tr>
          <tr className="total-row">
            <td colSpan="5" rowSpan="3" className="instructions-section" style={{ borderTop: '1px solid #000', padding: '3mm', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div><strong>1. PALLETS :-</strong> {orderData?.palletType || ''} {orderData?.notes || orderData?.pallet_details || ''}</div>
                  <div><strong>2. MADE IN INDIA :-</strong></div>
                  <div style={{ paddingLeft: '20px' }}><strong>TILES BACK :-</strong> {orderData?.tilesBack || 'MADE IN INDIA'}</div>
                  <div style={{ paddingLeft: '20px' }}><strong>BOXES :-</strong> {orderData?.boxesMarking || 'MADE IN INDIA'}</div>
                  <div>
                    <strong>3. BOXES :-</strong> {orderData?.boxType || ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px' }}>
                    <span><strong>4. LEGALISATION :-</strong> {orderData?.legalisation || 'NO'}</span>
                    <span><strong>5. FUMIGATION :-</strong> {orderData?.fumigation || 'YES'}</span>
                  </div>
                  {orderData?.otherInstructions && (
                    <>
                      <div><strong>6. OTHER INSTRUCTIONS :-</strong></div>
                      <div style={{ whiteSpace: 'pre-wrap', paddingLeft: '20px' }}>{orderData.otherInstructions}</div>
                    </>
                  )}
                </div>
                {boxTypeImageUrl && (
                  <div style={{ marginLeft: '10px', flexShrink: 0, paddingRight: '5px' }}>
                    <img src={boxTypeImageUrl} alt="Box" style={{ maxHeight: '60px', maxWidth: '60px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '4px' }} />
                  </div>
                )}
              </div>
            </td>
            <td colSpan="4" className="amount-words-cell" style={{ borderTop: '1px solid #000', borderLeft: '1px solid #000', verticalAlign: 'middle', textAlign: 'center', padding: '3mm' }}>
              <strong>AMOUNT IN WORDS :- {numberToWords(Math.floor(poValue))} {poValue > 0 && Math.round((poValue % 1) * 100) > 0 ? `AND ${numberToWords(Math.round((poValue % 1) * 100))} PAISA` : ''} ONLY.</strong>
            </td>
          </tr>
          <tr className="total-row">
            <td colSpan="2" style={{ borderLeft: '1px solid #000', padding: '1.5mm 2mm', borderTop: '1px solid #000' }}><strong>NET WEIGHT</strong></td>
            <td style={{ textAlign: 'center', borderTop: '1px solid #000' }}><strong>{formatNumber(totalNetWeight)}</strong></td>
            <td style={{ textAlign: 'right', paddingRight: '2mm', borderTop: '1px solid #000' }}><strong>KGS</strong></td>
          </tr>
          <tr className="total-row">
            <td colSpan="2" style={{ borderLeft: '1px solid #000', padding: '1.5mm 2mm', borderTop: '1px solid #000' }}><strong>GROSS WEIGHT</strong></td>
            <td style={{ textAlign: 'center', borderTop: '1px solid #000' }}><strong>{formatNumber(totalGrossWeight)}</strong></td>
            <td style={{ textAlign: 'right', paddingRight: '2mm', borderTop: '1px solid #000' }}><strong>KGS</strong></td>
          </tr>
        </tbody>
      </table>


      {/* Company Names */}
      <table className="po-table">
        <tbody>
          <tr>
            <td style={{ width: '50%', textAlign: 'left', padding: '2mm' }}>
              <strong>FOR, {orderData?.supplier || orderData?.supplierDetails?.split('\n')[0] || 'SUPPLIER NAME'}</strong>
            </td>
            <td style={{ width: '50%', textAlign: 'right', padding: '2mm' }}>
              <strong>FOR, {exporter.name}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature Section */}
      <table className="po-table">
        <tbody>
          <tr>
            <td className="signature-row" style={{ width: '25%' }}>
              (AUTHORIZED SIGNATORY)
            </td>
            <td className="signature-row" style={{ width: '25%' }}>
              (PREPARED BY)
            </td>
            <td className="signature-row" style={{ width: '25%' }}>
              (CHECKED BY)
            </td>
            <td style={{ width: '25%', verticalAlign: 'bottom', padding: '2mm 3mm 2mm 2mm', textAlign: 'right', border: '1px solid #000' }}>
              <SignatureBlock
                signatureUrl={signatureUrl}
                signatoryName={signatoryName}
                companyName={exporter.name}
              />
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
});

OrderPrintView.displayName = 'OrderPrintView';

export default OrderPrintView;




