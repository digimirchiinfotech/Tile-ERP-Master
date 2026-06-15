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
import { resolveImageUrl } from '../../utils/urlHelper';
import useSignature from '../../hooks/useSignature';
import SignatureBlock from '../shared/SignatureBlock';

const InvoicePrintView = forwardRef(({ invoiceData, products: masterProducts = [], boxTypeImageUrl }, ref) => {
  const companyConfig = getCompanyConfig(invoiceData?.company_id || invoiceData?.companyId);
  const { signatureUrl, signatoryName } = useSignature(invoiceData?.signature_snapshot || null);

  const exporter = useMemo(() => {
    const ci = invoiceData?.company_info || invoiceData?.companyInfo;
    if (ci) {
      const bd = ci.bank_details || ci.bankDetails || {};
      return {
        name: ci.name || ci.company_name || ci.companyName || companyConfig.exporter.name,
        address: ci.address || ci.company_address || ci.companyAddress || companyConfig.exporter.address,
        iecNo: ci.iec_no || ci.iecNo || companyConfig.exporter.iecNo,
        gstn: ci.gstn || ci.gstin || companyConfig.exporter.gstn,
        logoUrl: ci.logo_url || ci.logoUrl,
        bankDetails: {
          accountName: bd.account_name || bd.accountName || bd.account_holder_name || bd.accountHolderName || ci.account_holder_name || ci.accountHolderName || ci.account_name || ci.accountName || ci.name || companyConfig.bankDetails.accountName,
          accountNumber: bd.account_no || bd.accountNo || bd.account_number || bd.accountNumber || ci.account_number || ci.accountNumber || ci.account_no || ci.accountNo || companyConfig.bankDetails.accountNumber,
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
  }, [invoiceData?.company_info, invoiceData?.companyInfo, companyConfig]);

  const PRODUCTS_PER_PAGE = 5; // Reduced from 10 to ensure the footer fits on A4
  const productPages = useMemo(() => {
    const products = invoiceData?.productLines || invoiceData?.product_lines || [];
    const enrichedProducts = products.map(p => {
      // If factoryProductName is missing, try to find it in masterProducts
      if (!p.factoryProductName && !p.factory_product_name && masterProducts.length > 0) {
        const masterProd = masterProducts.find(mp =>
          (mp.name === (p.product || p.productName || p.product_name)) ||
          (mp.productCode === (p.itemRef || p.product_code)) ||
          (mp.product_code === (p.itemRef || p.product_code))
        );
        if (masterProd) {
          return {
            ...p,
            factoryProductName: masterProd.factoryProductName || masterProd.factory_product_name || p.factoryProductName
          };
        }
      }
      return p;
    });

    const pages = [];
    for (let i = 0; i < enrichedProducts.length; i += PRODUCTS_PER_PAGE) {
      pages.push(enrichedProducts.slice(i, i + PRODUCTS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  }, [invoiceData?.productLines, invoiceData?.product_lines, masterProducts]);

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
    return num ? num.toLocaleString('en-US', {
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

  const totalAmount = invoiceData?.totalAmount || invoiceData?.total_amount || 0;
  const products = invoiceData?.productLines || invoiceData?.product_lines || [];
  const totalPallets = products.reduce((sum, p) => sum + (parseFloat(p.totalPallet || p.total_pallet || p.pallets || 0)), 0) || 0;
  const totalBoxes = products.reduce((sum, p) => sum + (parseFloat((p.product_type === 'sanitaryware' || p.productType === 'sanitaryware') ? (p.pieces || p.totalBoxes || 0) : (p.totalBoxes || p.total_boxes || p.boxes || 0))), 0) || 0;
  const totalSQM = products.reduce((sum, p) => sum + (parseFloat(p.sqmAuto || p.sqm_auto || p.sqm || 0)), 0) || 0;
  const totalNetWeight = products.reduce((sum, p) => sum + (parseFloat(p.netWeight || p.net_weight || 0)), 0) || 0;
  const totalGrossWeight = products.reduce((sum, p) => sum + (parseFloat(p.grossWeight || p.gross_weight || 0)), 0) || 0;

  return (
    <div ref={ref} className="invoice-print-view">
      <style>{`
        .invoice-print-view {
          background: #f8f9fa;
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
        }

        .invoice-page {
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
        }

        .invoice-print-view * {
          box-sizing: border-box;
        }

        .pi-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          min-height: 18mm;
          padding: 2mm 0;
          border-bottom: 1.5px solid #000;
          margin-bottom: 2mm;
        }

        .pi-header {
          font-size: 16pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
          text-align: center;
          white-space: nowrap;
        }

        .pi-logo {
          max-height: 12mm;
          max-width: 40mm;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        
        .pi-logo img {
          max-height: 12mm;
          max-width: 40mm;
          object-fit: contain;
        }

        .pi-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
        }

        .pi-table td {
          border: 1px solid #000;
          padding: 0.8mm 1.5mm;
          vertical-align: top;
          font-size: 7pt;
          line-height: 1.2;
        }

        .exporter-section {
          width: 50%;
        }

        .invoice-ref-section {
          width: 50%;
        }

        .exporter-details {
          width: 25%;
        }

        .compliance-text {
          font-size: 6.5pt;
          line-height: 1.4;
          text-align: justify;
        }

        .shipping-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
        }

        .shipping-table td {
          border: 1px solid #000;
          padding: 0.8mm 1.5mm;
          vertical-align: top;
          font-size: 7pt;
        }

        .product-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }

        .product-table th,
        .product-table td {
          border: 1px solid #000;
          padding: 1.5mm 1mm;
          text-align: center;
          font-size: 7.5pt;
          vertical-align: middle;
        }

        .product-table th {
          background-color: #f8f9fa;
          font-weight: bold;
          font-size: 7pt;
          line-height: 1.2;
          text-transform: uppercase;
        }
        
        .product-table .rate-cell {
          font-size: 9pt;
          font-weight: bold;
          white-space: nowrap;
        }

        .product-table td:first-child {
          text-align: left;
          padding-left: 2mm;
        }

        .product-image {
          width: 18mm;
          height: 18mm;
          object-fit: contain;
          display: block;
          margin: 0 auto;
          background: #fff;
        }

        .total-row {
          font-weight: bold;
          background-color: #f8f9fa;
        }

        .bank-details-box {
          border: 1px solid #000;
          padding: 2mm 3mm;
          margin: 0;
          font-size: 7.5pt;
          line-height: 1.4;
          text-align: left;
        }

        .instructions-section {
          font-size: 7.2pt;
          line-height: 1.5;
          padding: 2mm 3mm !important;
          text-align: left;
        }

        .signature-row {
          text-align: center;
          font-weight: bold;
          padding: 30mm 2mm 2mm 2mm !important;
          font-size: 7pt;
          vertical-align: bottom !important;
        }

        .amount-words-cell {
          text-align: left;
          font-weight: bold;
          font-size: 7.5pt;
          line-height: 1.4;
          padding: 3mm !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm !important;
          }
          
          body, html {
            height: auto !important;
            overflow: visible !important;
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ensure standard flow to respect page margins */
          .invoice-print-view {
            width: 100%;
            background: white;
            padding: 0;
            margin: 0;
            display: block !important;
          }
          
          .invoice-page {
            width: 200mm !important;
            max-width: 200mm !important;
            min-height: 287mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            border: none !important;
            box-sizing: border-box !important;
          }
          
          .invoice-page:last-child {
            page-break-after: auto;
          }

          .no-print {
            display: none !important;
          }
        }

        @media screen {
          .invoice-page {
            border: 1px solid #ddd;
          }
        }
      `}</style>

      <div className="invoice-page">
        <div className="pi-header-container">
        <div style={{ flex: 0.5 }}></div>
        <div style={{ flex: 3, textAlign: 'center' }}>
          <h1 className="pi-header" style={{ fontSize: '16pt', margin: 0 }}>PRO-FORMA INVOICE</h1>
        </div>
        <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
          {exporter.logoUrl && (
            <div className="pi-logo">
              <img
                src={resolveImageUrl(exporter.logoUrl)}
                alt="Logo"
                style={{ maxHeight: '12mm', maxWidth: '45mm', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Info Section - Top Row */}
      <table className="pi-table">
        <tbody>
          <tr>
            <td rowSpan="4" className="exporter-section">
              <strong>EXPORTER :-</strong><br />
              <strong>{exporter.name}</strong>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '6.8pt', color: '#333', marginTop: '0.5mm', lineHeight: '1.25' }}>{exporter.address}</div>
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
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '6.8pt', color: '#333', marginTop: '0.5mm', lineHeight: '1.25' }}>
                  {invoiceData?.consignee_details || invoiceData?.consigneeDetails || invoiceData?.consignee || 'TO THE ORDER'}
                </div>
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
                <strong>BUYER :-</strong><br />
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '6.8pt', color: '#333', marginTop: '0.5mm', lineHeight: '1.25' }}>
                  {invoiceData?.buyer_details || invoiceData?.buyerDetails || invoiceData?.buyer || 'SAME AS ABOVE'}
                </div>
              </div>
            </td>
            <td className="invoice-ref-section" colSpan="2">
              <strong>PRO-FORMA INVOICE NO. & DATE</strong><br /><br />
              <strong>{invoiceData?.invoiceNo || invoiceData?.invoice_no || ''} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formatDate(invoiceData?.date)}</strong>
              {(invoiceData?.revision_no || invoiceData?.revisionNo) && (
                <div style={{ marginTop: '1.5mm', fontSize: '6.5pt', color: '#444' }}>
                  <strong>REVISION NO:</strong> {invoiceData?.revision_no || invoiceData?.revisionNo} &nbsp;&nbsp;&nbsp;
                  <strong>REV DATE:</strong> {invoiceData?.updated_at || invoiceData?.updatedAt ? formatDate(invoiceData.updated_at || invoiceData.updatedAt) : formatDate(invoiceData?.date)}
                </div>
              )}
            </td>
          </tr>
          <tr>
            <td className="exporter-details" colSpan="1" style={{ width: '25%' }}>
              <strong>I.E.C.NO.{exporter.iecNo}</strong><br />
              <br />
              <strong>GSTN : {exporter.gstn}</strong>
            </td>
            <td className="exporter-details" colSpan="1" style={{ width: '25%' }}>
              <strong>L/C NO. & DATE :<br/>{invoiceData?.lcNumber || invoiceData?.lc_number || ''} {invoiceData?.lcDate || invoiceData?.lc_date ? `DT. ${formatDate(invoiceData.lcDate || invoiceData.lc_date)}` : ''}</strong><br />
              <div style={{ marginTop: '1mm' }}>
                <strong>EPCG NO. : {invoiceData?.epcgNo || invoiceData?.epcg_no || ''}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <strong>BUYER'S ORDER NO. & DATE</strong><br />
              {invoiceData?.buyerOrderNo || invoiceData?.buyer_order_no || ''} {invoiceData?.buyerOrderDate || invoiceData?.buyer_order_date ? formatDate(invoiceData.buyerOrderDate || invoiceData.buyer_order_date) : ''}
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <strong>SHIPMENT TERMS - {invoiceData?.deliveryTerms || invoiceData?.delivery_terms || companyConfig.defaults.deliveryTerms}</strong><br />
              <br />
              <strong>TARIFF CODE :- {invoiceData?.tariffCode || invoiceData?.tariff_code || companyConfig.defaults.tariffCode}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Shipping and Bank Details */}
      <table className="shipping-table">
        <tbody>
          <tr>
            <td style={{ width: '25%' }}>
              <strong>PRE-CARRIAGE BY</strong><br />
              {invoiceData?.pre_carriage_by || invoiceData?.preCarriageBy || ''}
            </td>
            <td style={{ width: '25%' }}>
              <strong>PLACE OF RECEIPT BY PRE-CARRIER</strong><br />
              {invoiceData?.place_of_receipt || invoiceData?.placeOfReceipt || ''}
            </td>
            <td rowSpan="3" style={{ width: '50%', verticalAlign: 'top', padding: '3mm' }}>
              <strong>OUR BANK DETAILS :-</strong>
              <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginTop: '2mm', fontSize: '7pt' }}>
                <tbody>
                  <tr>
                    <td style={{ border: 'none', padding: '0.5mm 0', width: '38%', fontWeight: 'bold' }}>ACCOUNT NAME :-</td>
                    <td style={{ border: 'none', padding: '0.5mm 0' }}>{exporter.bankDetails.accountName}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '0.5mm 0', fontWeight: 'bold' }}>ACCOUNT NUMBER :-</td>
                    <td style={{ border: 'none', padding: '0.5mm 0' }}>{exporter.bankDetails.accountNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '0.5mm 0', fontWeight: 'bold' }}>BANK NAME :-</td>
                    <td style={{ border: 'none', padding: '0.5mm 0' }}>{exporter.bankDetails.bankName}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '0.5mm 0', verticalAlign: 'top', fontWeight: 'bold' }}>BANK ADDRESS :-</td>
                    <td style={{ border: 'none', padding: '0.5mm 0' }}>{exporter.bankDetails.bankAddress}</td>
                  </tr>
                  <tr style={{ height: '2mm' }}><td colSpan="2" style={{ border: 'none' }}></td></tr>
                  <tr>
                    <td style={{ border: 'none', padding: '0.5mm 0', fontWeight: 'bold' }}>SWIFT CODE :-</td>
                    <td style={{ border: 'none', padding: '0.5mm 0' }}>{exporter.bankDetails.swiftCode}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style={{ width: '25%' }}>
              <strong>VESSEL FLIGHT NO.</strong><br />
              {invoiceData?.vessel_flight_no || invoiceData?.vesselFlightNo || ''}
            </td>
            <td style={{ width: '25%' }}>
              <strong>PORT OF LOADING</strong><br />
              {invoiceData?.port_of_loading || invoiceData?.portOfLoading || companyConfig.defaults.portOfLoading}
            </td>
          </tr>
          <tr>
            <td style={{ width: '25%' }}>
              <strong>PORT OF DISCHARGE</strong><br />
              {invoiceData?.port_of_discharge || invoiceData?.portOfDischarge || ''}
            </td>
            <td style={{ width: '25%' }}>
              <strong>FINAL DESTINATION</strong><br />
              {invoiceData?.final_destination || invoiceData?.finalDestination || invoiceData?.country || ''}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Country and Payment Details */}
      <table className="pi-table">
        <tbody>
          <tr>
            <td style={{ width: '33.33%', textAlign: 'left', padding: '3mm' }}>
              <strong>COUNTRY OF ORIGIN OF GOODS</strong><br />
              <strong style={{ fontSize: '8pt' }}>{companyConfig.defaults.countryOfOrigin}</strong>
            </td>
            <td style={{ width: '33.33%', textAlign: 'left', padding: '3mm' }}>
              <strong>COUNTRY OF FINAL DESTINATION</strong><br />
              <strong style={{ fontSize: '8pt' }}>{invoiceData?.finalDestination || invoiceData?.final_destination || invoiceData?.country || ''}</strong>
            </td>
            <td style={{ width: '33.34%', textAlign: 'left', padding: '3mm' }}>
              <strong>PAYMENT TERMS</strong><br />
              {invoiceData?.paymentTerms || companyConfig.defaults.paymentTerms}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Product Table - First Page */}
      <table className="product-table">
        <thead>
          <tr>
            <th rowSpan="2" style={{ width: '20%' }}>ITEM DESCRIPTION</th>
            <th rowSpan="2" style={{ width: '15%' }}>DESIGN IMAGE</th>
            <th rowSpan="2" style={{ width: '11%' }}>FACTORY PRODUCT NAME</th>
            <th rowSpan="2" style={{ width: '6%' }}>HSN<br />CODE</th>
            <th rowSpan="2" style={{ width: '6%' }}>NO. OF<br />PALLETS</th>
            <th colSpan="2" style={{ width: '12%' }}>QUANTITY</th>
            <th rowSpan="2" style={{ width: '14%' }}>RATE<br />FOB {invoiceData?.currency || 'USD'}</th>
            <th rowSpan="2" style={{ width: '16%' }}>AMOUNT<br />FOB {invoiceData?.currency || 'USD'}</th>
          </tr>
          <tr>
            <th style={{ width: '6%', fontSize: '6.5pt' }}>SQM.</th>
            <th style={{ width: '6%', fontSize: '6.5pt' }}>BOX</th>
          </tr>
        </thead>
        <tbody>
          {productPages[0] && productPages[0].length > 0 ? (
            productPages[0].map((product, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'left', fontSize: '7pt', padding: '2mm' }}>
                  <strong>{product.product || product.productName || product.itemDescription || product.product_name || ''}</strong><br />
                  {product.grade && <span> {product.grade}</span>}
                  {(product.description || product.product_description || product.productDescription) && (
                    <div style={{ fontSize: '6.5pt', marginTop: '1mm', fontStyle: 'italic', color: '#333' }}>
                      {product.description || product.product_description || product.productDescription}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1mm' }}>
                  {product.image && (
                    <img src={product.image} alt={product.product} className="product-image" />
                  )}
                </td>
                <td>{product.factoryProductName || product.factory_product_name || product.itemRef || ''}</td>
                <td style={{ fontSize: '6.5pt' }}>{product.hsnCode || product.hsn_code || ''}</td>
                <td>{product.totalPallet || 0}</td>
                <td>{formatNumber(product.sqmAuto || 0)}</td>
                <td>{(product.product_type === 'sanitaryware' || product.productType === 'sanitaryware') ? (product.pieces || 0) : (product.totalBoxes || 0)}</td>
                <td className="rate-cell">{formatNumber(product.rate || 0)}</td>
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
          {productPages.length === 1 && (
            <tr className="total-row">
              <td colSpan="4" style={{ textAlign: 'center' }}><strong>TOTAL :-</strong></td>
              <td><strong>{totalPallets}</strong></td>
              <td><strong>{formatNumber(totalSQM)}</strong></td>
              <td><strong>{totalBoxes}</strong></td>
              <td></td>
              <td><strong>{formatNumber(totalAmount)}</strong></td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Closing sections only appear if this is a single-page invoice */}
      {productPages.length === 1 && (
        <>
          {/* Instructions, Total Amount and Weights */}
          <table className="pi-table">
            <tbody>
              <tr>
                <td rowSpan="3" style={{ width: '50%' }} className="instructions-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <strong>1.PALLETS :-</strong> {invoiceData?.palletType || 'PINE WOOD EURO PALLET WITH HEAVY DUTY PLASTIC COVER'}<br />
                      <strong>2.MADE IN INDIA :-</strong><br />
                      &nbsp;&nbsp;<strong>TILES BACK :-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.tilesBack || ''}<br />
                      &nbsp;&nbsp;<strong>BOXES :-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.boxesMarking || 'MADE IN INDIA'}<br />
                      <strong>3.BOXES :-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.boxType || 'MAVERICK BRAND BOX'}<br />
                      <strong>4.LEGALISATION:-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.legalisation || 'NO'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>5.FUMIGATION :-</strong> {invoiceData?.fumigation || 'YES'}<br />
                      <strong>6. OTHER INSTRUCTIONS :-</strong><br />
                      {invoiceData?.otherInstructions || ''}
                    </div>
                    {boxTypeImageUrl && (
                      <div style={{ marginLeft: '10px', flexShrink: 0, paddingRight: '5px' }}>
                        <img src={boxTypeImageUrl} alt="Box" style={{ maxHeight: '60px', maxWidth: '60px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '4px' }} />
                      </div>
                    )}
                  </div>
                </td>
                <td colSpan="3" className="amount-words-cell" style={{ borderBottom: '1px solid #000' }}>
                  <strong>TOTAL FOB MUNDRA VALUE : - {invoiceData?.currency || 'USD'} {numberToWords(Math.floor(totalAmount))} {totalAmount > 0 && Math.round((totalAmount % 1) * 100) > 0 ? `AND CENTS ${numberToWords(Math.round((totalAmount % 1) * 100))}` : ''} ONLY.</strong>
                </td>
              </tr>
              <tr>
                <td style={{ width: '25%', borderBottom: '1px solid #000' }}><strong>NET WEIGHT</strong></td>
                <td style={{ width: '15%', textAlign: 'center', borderBottom: '1px solid #000' }}><strong>{formatNumber(totalNetWeight)}</strong></td>
                <td style={{ width: '10%', textAlign: 'right', borderBottom: '1px solid #000' }}><strong>KGS</strong></td>
              </tr>
              <tr>
                <td style={{ width: '25%' }}><strong>GROSS WEIGHT</strong></td>
                <td style={{ width: '15%', textAlign: 'center' }}><strong>{formatNumber(totalGrossWeight)}</strong></td>
                <td style={{ width: '10%', textAlign: 'right' }}><strong>KGS</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Company Names */}
          <table className="pi-table">
            <tbody>
              <tr>
                <td style={{ width: '50%', textAlign: 'left', padding: '2mm' }}>
                  <strong>FOR ,{invoiceData?.client || invoiceData?.client_name || invoiceData?.clientName || invoiceData?.buyer_details?.split('\n')[0] || invoiceData?.buyerDetails?.split('\n')[0] || invoiceData?.buyer?.split('\n')[0] || invoiceData?.consignee_details?.split('\n')[0] || invoiceData?.consigneeDetails?.split('\n')[0] || invoiceData?.consignee?.split('\n')[0] || 'CLIENT NAME'}</strong>
                </td>
                <td style={{ width: '50%', textAlign: 'right', padding: '2mm' }}>
                  <strong>FOR ,{exporter.name}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature Section */}
          <table className="pi-table">
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
                <td style={{ width: '25%', verticalAlign: 'bottom', padding: '2mm 3mm 2mm 2mm', textAlign: 'right' }}>
                  <SignatureBlock
                    signatureUrl={signatureUrl}
                    signatoryName={signatoryName}
                    companyName={exporter.name}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}
      </div>

      {/* Additional Pages for Products Beyond First 10 */}
      {productPages.length > 1 && productPages.slice(1).map((pageProducts, pageIndex) => {
        const pageNumber = pageIndex + 2;
        const isLastPage = pageIndex === productPages.length - 2;

        const pageTotal = pageProducts.reduce((acc, p) => ({
          pallets: acc.pallets + (p.totalPallet || 0),
          boxes: acc.boxes + ((p.product_type === 'sanitaryware' || p.productType === 'sanitaryware') ? (p.pieces || 0) : (p.totalBoxes || 0)),
          sqm: acc.sqm + (p.sqmAuto || 0),
          amount: acc.amount + (p.amount || 0),
        }), { pallets: 0, boxes: 0, sqm: 0, amount: 0 });

        return (
          <div key={pageIndex} className="invoice-page">
            <div className="pi-header">PRO-FORMA INVOICE (Continued - Page {pageNumber})</div>

            <table className="pi-table" style={{ marginBottom: '2mm' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2mm' }}>
                    <strong>Invoice No:</strong> {invoiceData?.invoiceNo || ''} &nbsp;&nbsp;&nbsp;
                    <strong>Date:</strong> {formatDate(invoiceData?.date)} &nbsp;&nbsp;&nbsp;
                    {(invoiceData?.revision_no || invoiceData?.revisionNo) && (
                      <>
                        <strong>Revision No:</strong> {invoiceData?.revision_no || invoiceData?.revisionNo} &nbsp;&nbsp;&nbsp;
                      </>
                    )}
                    <strong>Client:</strong> {invoiceData?.client || ''}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="product-table">
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: '20%' }}>ITEM DESCRIPTION</th>
                  <th rowSpan="2" style={{ width: '15%' }}>DESIGN IMAGE</th>
                  <th rowSpan="2" style={{ width: '11%' }}>FACTORY PRODUCT NAME</th>
                  <th rowSpan="2" style={{ width: '6%' }}>HSN<br />CODE</th>
                  <th rowSpan="2" style={{ width: '6%' }}>NO. OF<br />PALLETS</th>
                  <th colSpan="2" style={{ width: '12%' }}>QUANTITY</th>
                  <th rowSpan="2" style={{ width: '14%' }}>RATE<br />FOB {invoiceData?.currency || 'USD'}</th>
                  <th rowSpan="2" style={{ width: '16%' }}>AMOUNT<br />FOB {invoiceData?.currency || 'USD'}</th>
                </tr>
                <tr>
                  <th style={{ width: '6%', fontSize: '6.5pt' }}>SQM.</th>
                  <th style={{ width: '6%', fontSize: '6.5pt' }}>BOX</th>
                </tr>
              </thead>
              <tbody>
                {pageProducts.map((product, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'left', fontSize: '7pt', padding: '2mm' }}>
                      <strong>{product.product || product.productName || product.itemDescription || product.product_name || ''}</strong><br />
                      {product.grade && <span> {product.grade}</span>}
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
                    <td>{product.factoryProductName || product.factory_product_name || product.itemRef || product.item_ref || ''}</td>
                    <td style={{ fontSize: '6.5pt' }}>{product.hsnCode || product.hsn_code || ''}</td>
                    <td>{product.totalPallets || product.totalPallet || product.total_pallets || product.total_pallet || product.pallets || 0}</td>
                    <td>{formatNumber(product.sqmAuto || product.sqm_auto || product.sqm || 0)}</td>
                    <td>{(product.product_type === 'sanitaryware' || product.productType === 'sanitaryware') ? (product.pieces || 0) : (product.totalBoxes || product.total_boxes || product.boxes || 0)}</td>
                    <td className="rate-cell">{formatNumber(product.rate || 0)}</td>
                    <td>{formatNumber(product.amount || 0)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan="4" style={{ textAlign: 'center' }}><strong>PAGE {pageNumber} SUBTOTAL :-</strong></td>
                  <td><strong>{pageTotal.pallets}</strong></td>
                  <td><strong>{formatNumber(pageTotal.sqm)}</strong></td>
                  <td><strong>{pageTotal.boxes}</strong></td>
                  <td></td>
                  <td><strong>{formatNumber(pageTotal.amount)}</strong></td>
                </tr>
                {isLastPage && (
                  <tr className="total-row" style={{ backgroundColor: '#f0f0f0' }}>
                    <td colSpan="4" style={{ textAlign: 'center' }}><strong>GRAND TOTAL :-</strong></td>
                    <td><strong>{totalPallets}</strong></td>
                    <td><strong>{formatNumber(totalSQM)}</strong></td>
                    <td><strong>{totalBoxes}</strong></td>
                    <td></td>
                    <td><strong>{formatNumber(totalAmount)}</strong></td>
                  </tr>
                )}
              </tbody>
            </table>

            {isLastPage && (
              <>
                <table className="pi-table">
                  <tbody>
                    <tr>
                      <td rowSpan="3" style={{ width: '50%' }} className="instructions-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <strong>1.PALLETS :-</strong> {invoiceData?.palletType || 'PINE WOOD EURO PALLET WITH HEAVY DUTY PLASTIC COVER'}<br />
                            <strong>2.MADE IN INDIA :-</strong><br />
                            &nbsp;&nbsp;<strong>TILES BACK :-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.tilesBack || ''}<br />
                            &nbsp;&nbsp;<strong>BOXES :-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.boxesMarking || 'MADE IN INDIA'}<br />
                            <strong>3.BOXES :-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.boxType || 'MAVERICK BRAND BOX'}<br />
                            <strong>4.LEGALISATION:-</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {invoiceData?.legalisation || 'NO'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>5.FUMIGATION :-</strong> {invoiceData?.fumigation || 'YES'}<br />
                            <strong>6. OTHER INSTRUCTIONS :-</strong><br />
                            {invoiceData?.otherInstructions || ''}
                          </div>
                          {boxTypeImageUrl && (
                            <div style={{ marginLeft: '10px', flexShrink: 0, paddingRight: '5px' }}>
                              <img src={boxTypeImageUrl} alt="Box" style={{ maxHeight: '60px', maxWidth: '60px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '4px' }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td colSpan="3" className="amount-words-cell" style={{ borderBottom: '1px solid #000' }}>
                        <strong>TOTAL FOB MUNDRA VALUE : - {invoiceData?.currency || 'USD'} {numberToWords(Math.floor(totalAmount))} {totalAmount > 0 && Math.round((totalAmount % 1) * 100) > 0 ? `AND CENTS ${numberToWords(Math.round((totalAmount % 1) * 100))}` : ''} ONLY.</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ width: '25%', borderBottom: '1px solid #000' }}><strong>NET WEIGHT</strong></td>
                      <td style={{ width: '15%', textAlign: 'center', borderBottom: '1px solid #000' }}><strong>{formatNumber(totalNetWeight)}</strong></td>
                      <td style={{ width: '10%', textAlign: 'right', borderBottom: '1px solid #000' }}><strong>KGS</strong></td>
                    </tr>
                    <tr>
                      <td style={{ width: '25%' }}><strong>GROSS WEIGHT</strong></td>
                      <td style={{ width: '15%', textAlign: 'center' }}><strong>{formatNumber(totalGrossWeight)}</strong></td>
                      <td style={{ width: '10%', textAlign: 'right' }}><strong>KGS</strong></td>
                    </tr>
                  </tbody>
                </table>

                <table className="pi-table">
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'left', padding: '2mm' }}>
                        <strong>FOR ,{invoiceData?.buyer_details?.split('\n')[0] || invoiceData?.buyerDetails?.split('\n')[0] || invoiceData?.buyer?.split('\n')[0] || invoiceData?.consignee_details?.split('\n')[0] || invoiceData?.consigneeDetails?.split('\n')[0] || invoiceData?.consignee?.split('\n')[0] || invoiceData?.client || invoiceData?.client_name || 'CLIENT NAME'}</strong>
                      </td>
                      <td style={{ width: '50%', textAlign: 'right', padding: '2mm' }}>
                        <strong>FOR ,{exporter.name}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table className="pi-table">
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
                      <td className="signature-row" style={{ width: '25%' }}>
                        (AUTHORIZED SIGNATORY)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
});

InvoicePrintView.displayName = 'InvoicePrintView';

export default InvoicePrintView;




