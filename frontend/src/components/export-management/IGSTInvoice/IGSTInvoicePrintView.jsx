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

    const temp = n % 1000;
    if (temp > 0) {
      wordStr = convertWords(temp) + ' ';
    }
    n = Math.floor(n / 1000);
    unitIdx = 1;

    while (n > 0) {
      const divisor = unitIdx === 3 ? 10000000 : 100;
      const segment = n % divisor;
      if (segment > 0) {
        wordStr = convertWords(segment) + ' ' + units[unitIdx] + ' ' + wordStr;
      }
      n = Math.floor(n / divisor);
      unitIdx++;
      if (unitIdx > 3) unitIdx = 3;
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

const IGSTInvoicePrintView = forwardRef(({ data }, ref) => {
  if (!data) return null;

  const doc = data.igstInvoice || data.igst_invoice || data || {};
  const exportInvoice = data.exportInvoice || data.export_invoice || {};
  const companyInfo = data.companyInfo || data.company_info || doc.companyInfo || doc.company_info || {};
  const companyConfig = getCompanyConfig(doc.companyId || doc.company_id);
  const { signatureUrl, signatoryName } = useSignature(doc?.signature_snapshot || data?.signature_snapshot || null);

  const exporter = useMemo(() => {
    const ci = companyInfo || {};
    return {
      name: String(doc.exporterName || doc.exporter_name || ci.name || companyConfig?.exporter?.name || ''),
      address: String(doc.exporterAddress || doc.exporter_address || ci.address || companyConfig?.exporter?.address || ''),
      authorizedPerson: String(ci.authorized_person || ci.authorized_signatory || ci.comp_authorized_person || ci.contact_person_name || companyConfig?.exporter?.authorizedPerson || ''),
      logoUrl: String(ci.logo_url || ci.logoUrl || doc.logoUrl || doc.logo_url || companyConfig?.logoUrl || companyConfig?.logo_url || ''),
      lutArnNo: String(ci.lut_arn_no || ci.lutArnNo || ci.lut_bond_ref || ''),
      lutDate: String(ci.lut_date || ci.lutDate || '')
    };
  }, [doc, companyInfo, companyConfig]);

  const cleanStr = (s) => {
    if (typeof s !== 'string') return null;
    const trimmed = s.trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'na' || trimmed.toLowerCase() === 'n/a') return null;
    return trimmed;
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '.');
  };

  const formatNumber = (num, decimals = 2) => {
    const value = parseFloat(num) || 0;
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const productLines = useMemo(() => {
    const raw = doc.productLines || doc.product_lines || [];
    return Array.isArray(raw) ? raw : [];
  }, [doc.productLines, doc.product_lines]);

  const bank = useMemo(() => {
    const info = companyInfo?.bankDetails || companyInfo?.bank_details || {};
    return {
      bankName: info.bankName || info.bank_name || companyConfig.bankDetails?.bankName || '',
      accountName: info.accountName || info.account_name || companyConfig.bankDetails?.accountName || '',
      accountNo: info.accountNo || info.account_no || companyConfig.bankDetails?.accountNo || '',
      swiftCode: info.swiftCode || info.swift_code || companyConfig.bankDetails?.swiftCode || '',
      bankAddress: info.bankAddress || info.bank_address || companyConfig.bankDetails?.branchName || ''
    };
  }, [companyInfo, companyConfig]);

  return (
    <div ref={ref} className="igst-print-view">
      <style>{`
        .igst-print-view { background: #fff; width: 100%; display: flex; flex-direction: column; align-items: center; }
        
        .print-container {
          width: 210mm;
          min-height: 100%; height: auto;
          margin: 20px auto;
          padding: 10mm;
          background: white;
          box-shadow: 0 0 15px rgba(0,0,0,0.15);
          font-family: 'Inter', Arial, sans-serif;
          color: #000;
          box-sizing: border-box;
          position: relative;
        }

        .pi-table { width: 100%; border-collapse: collapse; margin-bottom: 0; table-layout: fixed; }
        .pi-table th, .pi-table td { border: 1px solid #000; padding: 1.2mm 2mm; vertical-align: top; font-size: 8pt; line-height: 1.3; overflow: visible; word-wrap: break-word; }
        .pi-table th { background-color: #f8f9fa; font-weight: 800; text-transform: uppercase; text-align: center; font-size: 7.5pt; }

        .header-title {
          font-size: 14pt;
          font-weight: 850;
          letter-spacing: 1.5px;
          margin: 0;
          text-align: center;
        }
        
        .small-title {
          font-size: 6.8pt;
          font-weight: 700;
          color: #555;
          text-transform: uppercase;
        }
        
        .value-bold {
          font-weight: 700;
          color: #000;
        }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          body {
            margin: 0;
            padding: 0;
            background-color: white !important;
          }
          .print-container {
            width: 210mm !important;
            min-height: 100% !important; height: auto !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            overflow: visible;
          }
        }
      `}</style>

      <div className="print-container">
        {/* main wrapper with borders */}
        <div style={{ border: '1px solid #000', borderRadius: '4px', overflow: 'hidden' }}>
          
          {/* Header Row */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td colSpan="2" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #000', padding: '3mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1.2 }}>
                      <div className="small-title">EXPORTER REGISTRATION & LUT</div>
                      <div style={{ fontSize: '7.5pt', lineHeight: '1.4' }}>
                        <div>GSTIN: <span className="value-bold">{doc.gstin || '-'}</span></div>
                        <div>IEC: <span className="value-bold">{doc.iecNo || doc.iec_no || '-'}</span></div>
                        <div>LUT NO: <span className="value-bold">{exporter.lutArnNo || doc.lutBondRef || doc.lut_bond_ref || '-'}</span></div>
                        <div>LUT DATE: <span className="value-bold">{(exporter.lutDate || doc.lutDate || doc.lut_date) ? formatDate(exporter.lutDate || doc.lutDate || doc.lut_date) : '-'}</span></div>
                      </div>
                    </div>
                    <div style={{ flex: 1.5, textAlign: 'center' }}>
                      <h1 className="header-title" style={{ margin: 0 }}>IGST INVOICE</h1>
                    </div>
                    <div style={{ flex: 1.2, textAlign: 'right' }}>
                      {exporter.logoUrl && (
                        <img 
                          src={resolveImageUrl(exporter.logoUrl)} 
                          alt="Logo" 
                          style={{ maxHeight: '11mm', maxWidth: '40mm', objectFit: 'contain' }} 
                        />
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan="2" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #000', padding: '1.5mm 2mm', textAlign: 'center', backgroundColor: '#fcfcfc' }}>
                  <div style={{ fontSize: '7.5pt', fontWeight: '800', letterSpacing: '0.5px', color: '#000', textTransform: 'uppercase' }}>
                    {doc?.supply_declaration || doc?.supplyDeclaration || 'SUPPLY MEANT FOR EXPORT WITH PAYMENT OF INTEGRATED TAX UNDER LUT BOND'}
                  </div>
                  <div style={{ fontSize: '6.8pt', fontWeight: '700', letterSpacing: '0.3px', color: '#333', marginTop: '0.5mm', textTransform: 'uppercase' }}>
                    {doc?.ftp_incentive_declaration || doc?.ftpIncentiveDeclaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Exporter, Buyer, Consignee & Document Metadata addresses */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                {/* Exporter Details (Row 1 Left) */}
                <td style={{ width: '50%', borderLeft: 'none', borderRight: '1px solid #000', borderTop: 'none', borderBottom: '1px solid #000', minHeight: '30mm' }}>
                  <div className="small-title">EXPORTER DETAILS:</div>
                  <div style={{ fontSize: '8pt', fontWeight: '800', margin: '1mm 0 0.5mm 0' }}>
                    {String(exporter?.name || '').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '7.5pt', whiteSpace: 'pre-wrap', color: '#333' }}>
                    {exporter.address}
                  </div>
                </td>
                
                {/* Document Metadata Table (Right Column, Spanning both rows) */}
                <td rowSpan="2" style={{ width: '50%', borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: '1px solid #000', padding: 0 }}>
                  <table className="pi-table" style={{ border: 'none', height: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                          <div className="small-title">INVOICE NO:</div>
                          <div className="value-bold" style={{ fontSize: '9.5pt' }}>{doc.igstInvoiceNo || doc.igst_invoice_no}</div>
                        </td>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: 'none' }}>
                          <div className="small-title">DATE OF INVOICE:</div>
                          <div className="value-bold" style={{ fontSize: '9pt' }}>{formatDate(doc.date)}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                          <div className="small-title">EXPORT INVOICE REF:</div>
                          <div className="value-bold">{exportInvoice.invoiceNo || exportInvoice.invoice_no || '-'}</div>
                        </td>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: 'none' }}>
                          <div className="small-title">EXPORT INVOICE DATE:</div>
                          <div className="value-bold">{exportInvoice.invoiceDate || exportInvoice.invoice_date ? formatDate(exportInvoice.invoiceDate || exportInvoice.invoice_date) : '-'}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                          <div className="small-title">PROFORMA INVOICE REF:</div>
                          <div className="value-bold">{doc.pi_no || doc.piNo || '-'}</div>
                        </td>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: 'none' }}>
                          <div className="small-title">TARIFF CODE / HS CODE:</div>
                          <div className="value-bold">{doc.tariff_code || doc.tariffCode || '-'}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                          <div className="small-title">BUYER'S ORDER NO & DATE:</div>
                          <div className="value-bold" style={{ fontSize: '7.5pt' }}>
                            {doc.buyers_order_no || doc.buyersOrderNo || doc.buyer_order_no || doc.buyerOrderNo || '-'}
                            {(doc.buyers_order_date || doc.buyersOrderDate || doc.buyer_order_date || doc.buyerOrderDate) ? ` DT: ${formatDate(doc.buyers_order_date || doc.buyersOrderDate || doc.buyer_order_date || doc.buyerOrderDate)}` : ''}
                          </div>
                        </td>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000', borderRight: 'none' }}>
                          <div className="small-title">COUNTRY OF ORIGIN:</div>
                          <div className="value-bold">{doc.country_of_origin || doc.countryOfOrigin || doc.country || 'INDIA'}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRight: '1px solid #000' }}>
                          <div className="small-title">SHIPMENT TERMS:</div>
                          <div className="value-bold">{doc.deliveryTerms || doc.delivery_terms || doc.shipmentTerms || doc.shipment_terms || '-'}</div>
                        </td>
                        <td style={{ width: '50%', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRight: 'none' }}>
                          <div className="small-title">COUNTRY OF FINAL DESTINATION:</div>
                          <div className="value-bold">{doc.finalDestination || doc.final_destination || doc.country_of_final_destination || '-'}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              
              <tr>
                {/* Consignee, Buyer & Payment Details (Row 2 Left) */}
                <td style={{ width: '50%', borderLeft: 'none', borderRight: '1px solid #000', borderTop: 'none', borderBottom: '1px solid #000', padding: '3mm 2.5mm' }}>
                  <div>
                    <div className="small-title">CONSIGNEE DETAILS:</div>
                    <div style={{ fontSize: '7.5pt', whiteSpace: 'pre-wrap', color: '#333', marginTop: '1mm' }}>
                      {doc.consigneeDetails || doc.consignee_details || 'SAME AS BUYER'}
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #000', marginTop: '2.5mm', paddingTop: '2.5mm', marginLeft: '-2.5mm', marginRight: '-2.5mm', paddingLeft: '2.5mm', paddingRight: '2.5mm' }}>
                    <div className="small-title">BUYER / IMPORTER DETAILS:</div>
                    <div style={{ fontSize: '7.5pt', whiteSpace: 'pre-wrap', fontWeight: '500', color: '#222', marginTop: '1mm' }}>
                      {doc.buyerDetails || doc.buyer_details || '-'}
                    </div>
                  </div>

                  {(doc.payment_terms || doc.paymentTerms) && (
                    <div style={{ fontSize: '7.5pt', borderTop: '1px solid #000', paddingTop: '1.5mm', marginTop: '2.5mm', marginLeft: '-2.5mm', marginRight: '-2.5mm', paddingLeft: '2.5mm', paddingRight: '2.5mm' }}>
                      PAYMENT TERMS: <span className="value-bold">{doc.payment_terms || doc.paymentTerms}</span>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Logistical Grid */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <div className="small-title">VESSEL / FLIGHT NO.</div>
                  <div className="value-bold">{doc.vesselFlightNo || doc.vessel_flight_no || '-'}</div>
                </td>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <div className="small-title">PORT OF LOADING</div>
                  <div className="value-bold">{doc.portOfLoading || doc.port_of_loading || 'MUNDRA PORT'}</div>
                </td>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <div className="small-title">PORT OF DISCHARGE</div>
                  <div className="value-bold">{doc.portOfDischarge || doc.port_of_discharge || '-'}</div>
                </td>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #000' }}>
                  <div className="small-title">FINAL DESTINATION</div>
                  <div className="value-bold">{doc.finalDestination || doc.final_destination || '-'}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <div className="small-title">PRE-CARRIAGE BY</div>
                  <div className="value-bold">{doc.preCarriageBy || doc.pre_carriage_by || '-'}</div>
                </td>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <div className="small-title">PLACE OF RECEIPT</div>
                  <div className="value-bold">{doc.placeOfReceipt || doc.place_of_receipt || '-'}</div>
                </td>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <div className="small-title">SHIPPING BILL NO</div>
                  <div className="value-bold">{doc.shippingBillNo || doc.shipping_bill_no || '-'}</div>
                </td>
                <td style={{ width: '25%', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #000' }}>
                  <div className="small-title">SHIPPING BILL DATE</div>
                  <div className="value-bold">{doc.shippingBillDate || doc.shipping_bill_date ? formatDate(doc.shippingBillDate || doc.shipping_bill_date) : '-'}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Product Items Table */}
          <table className="pi-table" style={{ border: 'none' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ width: '4%', borderTop: 'none', borderLeft: 'none' }}>SR.</th>
                <th style={{ width: '31%', borderTop: 'none', textAlign: 'left' }}>DESCRIPTION OF GOODS</th>
                <th style={{ width: '5%', borderTop: 'none' }}>HSN</th>
                <th style={{ width: '7%', borderTop: 'none' }}>BOXES</th>
                <th style={{ width: '9%', borderTop: 'none' }}>SQM/PCS</th>
                <th style={{ width: '8%', borderTop: 'none' }}>RATE (INR)</th>
                <th style={{ width: '14%', borderTop: 'none' }}>TAXABLE AMT</th>
                <th style={{ width: '5%', borderTop: 'none' }}>IGST %</th>
                <th style={{ width: '17%', borderTop: 'none', borderRight: 'none' }}>IGST AMT</th>
              </tr>
            </thead>
            <tbody>
              {productLines.map((l, index) => {
                const isFoc = !!(l.is_foc || l.isFoc);
                return (
                <tr key={index} style={{ borderBottom: index === productLines.length - 1 ? '1px solid #000' : 'none' }}>
                  <td style={{ textAlign: 'center', borderTop: 'none', borderLeft: 'none', borderBottom: 'none' }}>{index + 1}</td>
                  <td style={{ borderTop: 'none', borderBottom: 'none', textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {isFoc && (
                        <span style={{
                          fontSize: '6.5pt',
                          fontWeight: '900',
                          color: '#d32f2f',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          marginBottom: '0.5mm'
                        }}>
                          FREE OF COST SAMPLE NO COMMERCIAL VALUE
                        </span>
                      )}
                      {l.productName || l.product_name ? (
                        <strong>{l.productName || l.product_name}</strong>
                      ) : (
                        <strong>{l.materialDescription || l.material_description || ''}</strong>
                      )}
                      
                      {((l.materialDescription || l.material_description) && (l.materialDescription || l.material_description) !== (l.productName || l.product_name)) ? (
                        <div style={{ fontSize: '6.5pt', fontWeight: 'normal', color: '#555', marginTop: '0.5mm', wordBreak: 'break-word' }}>
                          {l.materialDescription || l.material_description}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', borderTop: 'none', borderBottom: 'none', whiteSpace: 'nowrap', fontSize: '6.5pt' }}>
                    {l.hsnCode || l.hsn_code || l.hsCode || l.hs_code || doc.tariff_code || doc.tariffCode || ''}
                  </td>
                  <td style={{ textAlign: 'center', borderTop: 'none', borderBottom: 'none', whiteSpace: 'nowrap' }}>
                    {l.boxQuantity || l.box_quantity || '-'}
                  </td>
                  <td style={{ textAlign: 'center', borderTop: 'none', borderBottom: 'none', whiteSpace: 'nowrap' }}>
                    {l.sqm ? formatNumber(l.sqm, 2) : (l.pcs || '-')}
                  </td>
                  <td style={{ textAlign: 'right', borderTop: 'none', borderBottom: 'none', whiteSpace: 'nowrap' }}>
                    {isFoc ? '0.00' : formatNumber(l.rate, 2)}
                  </td>
                  <td style={{ textAlign: 'right', borderTop: 'none', borderBottom: 'none', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {isFoc ? '0.00' : formatNumber(l.taxableAmount || l.taxable_amount, 2)}
                  </td>
                  <td style={{ textAlign: 'center', borderTop: 'none', borderBottom: 'none', whiteSpace: 'nowrap' }}>
                    {l.igstRate || l.igst_rate || '18.00'}%
                  </td>
                  <td style={{ textAlign: 'right', borderTop: 'none', borderBottom: 'none', borderRight: 'none', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {isFoc ? '0.00' : formatNumber(l.igstAmount || l.igst_amount, 2)}
                  </td>
                </tr>
                );
              })}
              {/* Packing Details Reference */}
              <tr style={{ height: '8mm' }}>
                <td colSpan="9" style={{ textAlign: 'left', paddingLeft: '5mm', fontWeight: 'bold', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
                  PACKING DETAILS AS PER ANNEXURE
                </td>
              </tr>
              
              {/* Product summary total row */}
              <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', background: '#f8f9fa' }}>
                <td colSpan="3" style={{ fontWeight: 'bold', borderLeft: 'none' }}>TOTAL:</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {productLines.reduce((sum, l) => sum + parseInt(l.boxQuantity || l.box_quantity || 0), 0)}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {formatNumber(productLines.reduce((sum, l) => sum + parseFloat(l.sqm || l.pcs || 0), 0), 2)}
                </td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 'extrabold', fontSize: '8.5pt', whiteSpace: 'nowrap' }}>
                  ₹{formatNumber(doc.totalBeforeTax || doc.total_before_tax || 0, 2)}
                </td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 'extrabold', fontSize: '8.5pt', borderRight: 'none', whiteSpace: 'nowrap' }}>
                  ₹{formatNumber(doc.totalIgst || doc.total_igst || 0, 2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Packing Details and Summary values */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', borderLeft: 'none', borderRight: '1px solid #000', borderTop: 'none', borderBottom: '1px solid #000', padding: '1mm 2mm' }}>
                  <div className="small-title">PACKING, MARKS & INSTRUCTIONS:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1mm', fontSize: '6.8pt', lineHeight: '1.2', textAlign: 'left', flex: 1 }}>
                      <div>
                        <strong>1. PALLETS :-</strong> {doc.palletType || doc.pallet_type || 'NORMAL WOODEN PALLETS'}<br />
                        <strong>2. MADE IN INDIA :-</strong><br />
                        &nbsp;&nbsp;TILES BACK: {doc.tilesBack || doc.tiles_back || 'YES'}<br />
                        &nbsp;&nbsp;BOXES: {doc.boxesMarking || doc.boxes_marking || 'YES'}
                      </div>
                      <div>
                        <strong>3. BOXES :-</strong> {doc.boxType || doc.box_type || 'NON BRANDED'}<br />
                        <strong>4. FUMIGATION :-</strong> {doc.fumigation || 'YES'}<br />
                        <strong>5. LEGALISATION :-</strong> {doc.legalisation || 'NO'}
                      </div>
                    </div>
                    {/* Add box image if needed, for consistency, wait, IGST Invoice doesn't receive boxTypeImageUrl prop! Let's ignore adding it if it's not passed, but let's check if it IS passed. */}
                  </div>
                  <div style={{ fontSize: '6.8pt', marginTop: '1mm' }}>
                    <strong>6. OTHER :-</strong> {doc.otherInstructions || doc.other_instructions || '-'}
                  </div>
                </td>
                <td style={{ width: '50%', borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: '1px solid #000' }}>
                  <table className="pi-table" style={{ border: 'none' }}>
                    <tbody>
                      <tr>
                        <td style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #000' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt' }}>
                            <span className="value-bold">VALUE BEFORE TAX (INR):</span>
                            <span className="value-bold font-monospace">₹{formatNumber(doc.totalBeforeTax || doc.total_before_tax || 0, 2)}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #000' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt' }}>
                            <span className="value-bold">INTEGRATED GST (18.00%):</span>
                            <span className="value-bold font-monospace">₹{formatNumber(doc.totalIgst || doc.total_igst || 0, 2)}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5pt' }}>
                            <span className="value-bold" style={{ color: '#166534' }}>GRAND TOTAL (INR):</span>
                            <span className="value-bold font-monospace" style={{ fontSize: '10.5pt', color: '#166534' }}>
                              ₹{formatNumber(doc.grandTotal || doc.grand_total || 0, 2)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              
              {/* Weights and Pallets row */}
              <tr>
                <td colSpan="2" style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: '1px solid #000', padding: '2mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '3mm' }}>
                    <div>NET WT: <span className="value-bold">{formatNumber(doc.netWeight || doc.net_weight || 0, 1)} KGS</span></div>
                    <div>GROSS WT: <span className="value-bold">{formatNumber(doc.grossWeight || doc.gross_weight || 0, 1)} KGS</span></div>
                    <div>TOTAL PALLETS: <span className="value-bold">{doc.totalPallets || doc.total_pallets || 0}</span></div>
                    <div>TOTAL QTY: <span className="value-bold">{formatNumber(doc.totalQuantity || doc.total_quantity || 0, 2)} SQM</span></div>
                  </div>
                </td>
              </tr>

              {/* Amount in words */}
              <tr>
                <td colSpan="2" style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: '1px solid #000', padding: '2mm' }}>
                  <div className="small-title">AMOUNT CHARGEABLE IN WORDS:</div>
                  <div className="value-bold" style={{ fontSize: '8.5pt', fontStyle: 'italic', marginTop: '0.5mm' }}>
                    {doc.amountInWords || doc.amount_in_words || amountToWords(doc.grandTotal || doc.grand_total || 0)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Declaration and Signature block */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '55%', borderLeft: 'none', borderRight: '1px solid #000', borderTop: 'none', borderBottom: 'none', padding: '2mm' }}>
                  <div className="small-title">EXPORTER BANK DETAILS:</div>
                  <div style={{ fontSize: '7.5pt', color: '#000', lineHeight: '1.4', marginTop: '0.5mm' }}>
                    <div>BANK NAME: <span className="value-bold">{bank.bankName || '-'}</span></div>
                    <div>A/C HOLDER: <span className="value-bold">{bank.accountName || '-'}</span></div>
                    <div>A/C NUMBER: <span className="value-bold">{bank.accountNo || '-'}</span></div>
                    <div>SWIFT CODE: <span className="value-bold">{bank.swiftCode || '-'}</span></div>
                    <div>BRANCH ADDRESS: <span className="text-muted">{bank.bankAddress || '-'}</span></div>
                  </div>
                </td>
                <td style={{ width: '45%', borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none', padding: '2.5mm', textAlign: 'right' }}>
                  <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '4mm' }}>FOR, {String(exporter?.name || '').toUpperCase()}</div>
                  <SignatureBlock
                    signatureUrl={signatureUrl}
                    signatoryName={signatoryName}
                    companyName={exporter.name}
                    style={{ textAlign: 'right' }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
});

IGSTInvoicePrintView.displayName = 'IGSTInvoicePrintView';

export default IGSTInvoicePrintView;
