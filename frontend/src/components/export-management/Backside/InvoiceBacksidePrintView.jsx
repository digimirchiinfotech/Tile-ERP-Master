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

const InvoiceBacksidePrintView = forwardRef(({ data }, ref) => {
  const companyConfig = getCompanyConfig(data?.company_id || data?.companyId);
  const { signatureUrl, signatoryName } = useSignature(data?.signature_snapshot || null);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
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
    const ci = data?.company_info || data?.companyInfo;
    return {
      name: data?.company_name || data?.companyName || ci?.name || ci?.company_name || ci?.companyName || companyConfig.exporter.name,
      address: data?.company_address || data?.companyAddress || ci?.address || ci?.company_address || ci?.companyAddress || companyConfig.exporter.address,
      iecNo: data?.iec_no || data?.iecNo || ci?.iec_no || ci?.iecNo || companyConfig.exporter.iecNo,
      gstn: ci?.gstn || ci?.gstin || companyConfig.exporter.gstn,
      logoUrl: ci?.logo_url || ci?.logoUrl,
      lutArnNo: ci?.lut_arn_no || ci?.lutArnNo || ci?.lut_bond_ref || '',
      lutDate: ci?.lut_date || ci?.lutDate || ''
    };
  }, [data, companyConfig]);

  const containerDetails = useMemo(() => {
    let containers = data?.container_details || data?.inherited_container_details || [];
    if (typeof containers === 'string') {
      try { containers = JSON.parse(containers); } catch (e) { containers = []; }
    }
    if (!containers || containers.length === 0) return [];

    const parsedContainers = containers.map(curr => ({
      ...curr,
      container_no: curr.container_no || curr.containerNo || '-',
      line_seal_no: curr.line_seal_no || curr.lineSealNo || curr.seal_no || curr.sealNo || '-',
      e_seal_no: curr.e_seal_no || curr.eSealNo || '-',
      product_name: curr.product_name || curr.product || curr.productName || curr.material_description || '-',
      size: curr.size || curr.type || "20'",
      total_sqm: parseFloat(curr.total_sqm || curr.sqm || curr.totalSqm || 0),
      box: parseInt(curr.box || curr.boxes || curr.totalBoxes || 0, 10),
      net_weight: parseFloat(curr.net_weight || curr.netWeight || 0),
      gross_weight: parseFloat(curr.gross_weight || curr.grossWeight || 0)
    }));

    // Group by Container No, Seal No, and E-Seal No to match the Backside Form logic
    const groups = {};
    parsedContainers.forEach(c => {
      const key = `${c.container_no}-${c.line_seal_no}-${c.e_seal_no}`;
      if (!groups[key]) {
        groups[key] = { ...c };
      } else {
        groups[key].total_sqm += c.total_sqm;
        groups[key].box += c.box;
        groups[key].net_weight += c.net_weight;
        groups[key].gross_weight += c.gross_weight;
      }
    });

    return Object.values(groups);
  }, [data?.container_details, data?.inherited_container_details]);

  const totalSQM = containerDetails.reduce((sum, c) => sum + c.total_sqm, 0) || parseFloat(data?.total_sqm || data?.totalSqm) || 0;
  const totalBoxes = containerDetails.reduce((sum, c) => sum + c.box, 0) || parseInt(data?.total_boxes || data?.total_packages || data?.totalBoxes) || 0;
  const totalPallets = data?.total_pallets || data?.totalPallets || data?.pallets || 0;
  const totalNetWeight = containerDetails.reduce((sum, c) => sum + c.net_weight, 0) || parseFloat(data?.net_weight || data?.netWeight) || 0;
  const totalGrossWeight = containerDetails.reduce((sum, c) => sum + c.gross_weight, 0) || parseFloat(data?.gross_weight || data?.grossWeight) || 0;

  const containerRowSpans = useMemo(() => {
    const spans = [];
    let currentStart = 0;

    for (let i = 0; i < containerDetails.length; i++) {
      if (i === 0) {
        spans[i] = 1;
        continue;
      }

      const prev = containerDetails[i - 1];
      const curr = containerDetails[i];

      const prevKey = `${prev.container_no}-${prev.line_seal_no}-${prev.e_seal_no}`;
      const currKey = `${curr.container_no}-${curr.line_seal_no}-${curr.e_seal_no}`;

      if (prevKey === currKey) {
        spans[currentStart] += 1;
        spans[i] = 0;
      } else {
        currentStart = i;
        spans[i] = 1;
      }
    }
    return spans;
  }, [containerDetails]);

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

        .pi-table { width: 100%; border-collapse: collapse; margin-bottom: 0; table-layout: fixed; }
        .pi-table td { border: 1px solid #000; padding: 1.2mm 2mm; vertical-align: top; font-size: 7.2pt; line-height: 1.25; }
        
        .label-bold { font-weight: 700; font-size: 6.8pt; text-transform: uppercase; color: #333; }
        .value-bold { font-weight: 700; font-size: 8.2pt; color: #000; }

        .nested-grid { width: 100%; border-collapse: collapse; height: 100%; }
        .nested-grid td { border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm !important; height: 10mm; vertical-align: middle; }
        .nested-grid tr:last-child td { border-bottom: none !important; }

        .container-table { width: 100%; border-collapse: collapse; margin-top: 0; }
        .container-table th, .container-table td { border: 1px solid #000; padding: 1mm 0.8mm; text-align: center; font-size: 7pt; }
        .container-table th { background: #f8f9fa; font-weight: 800; text-transform: uppercase; font-size: 6.5pt; }

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
            overflow: hidden;
          }
        }
      `}</style>

      <div className="print-container">
        <div className="doc-box">
          {/* Annexure Header Section */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td colSpan="4" style={{ padding: '2mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ flex: 3, textAlign: 'center' }}>
                      <div className="label-bold" style={{ fontSize: '11pt', letterSpacing: '1px' }}>ANNEXURE</div>
                      <div className="label-bold" style={{ fontSize: '9.5pt', marginTop: '0.5mm' }}>OFFICE OF THE SUPERINTENDENT OF CENTRAL GST</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      {exporter.logoUrl && (
                        <div className="pi-logo">
                          <img src={resolveImageUrl(exporter.logoUrl)} alt="Logo" style={{ maxHeight: '12mm', maxWidth: '45mm', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan="2" style={{ width: '50%', borderRight: 'none' }}>
                  <div><span className="label-bold">RANGE :</span> <span className="value-bold">{data?.range_name || data?.rangeName || 'N/A'}</span></div>
                  <div style={{ marginTop: '1mm' }}><span className="label-bold">COMMISSIONERATE :</span> <span className="value-bold">{data?.commissionerate || 'N/A'}</span></div>
                </td>
                <td colSpan="2" style={{ width: '50%', borderLeft: 'none', verticalAlign: 'top' }}>
                  <div style={{ textAlign: 'right' }}><span className="label-bold">DIVISION :</span> <span className="value-bold">{data?.division || 'N/A'}</span></div>
                </td>
              </tr>
              <tr style={{ height: '8mm' }}>
                <td style={{ width: '15%' }}><span className="label-bold" style={{ fontSize: '6pt' }}>C.No.</span><br /><span className="value-bold">{data?.c_no || data?.cNo || ''}</span></td>
                <td style={{ width: '15%' }}><span className="label-bold" style={{ fontSize: '6pt' }}>DATE</span><br /><span className="value-bold">{formatDate(data?.c_date || data?.cDate)}</span></td>
                <td style={{ width: '55%' }}><span className="label-bold" style={{ fontSize: '6pt' }}>SHIPPING BILL No.<br />(TO BE GIVEN BY C.H.)</span><br /><span className="value-bold">{data?.shipping_bill_no || data?.shippingBillNo || ''}</span></td>
                <td style={{ width: '15%' }}><span className="label-bold" style={{ fontSize: '6pt' }}>DATE</span><br /><span className="value-bold">{formatDate(data?.shipping_bill_date || data?.shippingBillDate)}</span></td>
              </tr>
            </tbody>
          </table>

          {/* Numbered Info Grid */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '40%', padding: '1.5mm 3mm' }} className="label-bold">1 NAME OF EXPORTER</td>
                <td className="value-bold" style={{ textAlign: 'center', padding: '1.5mm' }}>
                  <div style={{ fontSize: '9.5pt' }}>{exporter.name}</div>
                  <div style={{ fontWeight: 'normal', fontSize: '7.2pt' }}>{exporter.address}</div>
                </td>
              </tr>
              <tr>
                <td className="label-bold">
                  2 (a) I.E.CODE No.<br />
                  &nbsp;&nbsp;&nbsp;(b) BRANCH CODE No.<br />
                  &nbsp;&nbsp;&nbsp;(c) BIN No.
                </td>
                <td className="value-bold" style={{ textAlign: 'center', padding: 0 }}>
                  <div style={{ borderBottom: '1px solid #000', padding: '1mm' }}>{exporter.iecNo ? `I.E.C.NO.${exporter.iecNo}` : 'N/A'}</div>
                  <div style={{ borderBottom: '1px solid #000', padding: '1mm' }}>{data?.branch_code_no || data?.branchCodeNo || 'N/A'}</div>
                  <div style={{ padding: '1mm' }}>{data?.bin_no || data?.binNo || 'N/A'}</div>
                </td>
              </tr>
              <tr>
                <td className="label-bold">
                  3 NAME OF THE MANUFACTURER<br />
                  <span style={{ fontSize: '5.5pt', fontWeight: 'normal' }}>(DIFFERENCE FROM THE EXPORTER)</span>
                </td>
                <td className="value-bold" style={{ textAlign: 'center' }}>
                  <div>{data?.manufacturer_name || data?.manufacturerName || 'N/A'}</div>
                  <div style={{ fontWeight: 'normal', fontSize: '7pt' }}>{data?.manufacturer_address || data?.manufacturerAddress || 'N/A'}</div>
                </td>
              </tr>
              <tr>
                <td className="label-bold">4 FACTORY ADDRESS</td>
                <td className="value-bold" style={{ textAlign: 'center' }}>
                  <div>{data?.factory_address || data?.factoryAddress || 'N/A'}</div>
                  <div style={{ fontSize: '6.5pt', fontWeight: 'normal' }}>AS ABOVE</div>
                </td>
              </tr>
              <tr>
                <td className="label-bold">5 DATE OF EXAMINATION</td>
                <td className="value-bold" style={{ textAlign: 'center' }}>{formatDate(data?.examination_date || data?.examinationDate || data?.ei_invoice_date || data?.eiInvoiceDate)}</td>
              </tr>
              <tr>
                <td className="label-bold">6 NAME AND DESIGNATION OF THE EXAMINING OFFICER / INSPECTOR / EO / PO</td>
                <td className="value-bold" style={{ textAlign: 'center' }}>{data?.examining_officer || data?.examiningOfficer || 'SELF SEALING'}</td>
              </tr>
              <tr>
                <td className="label-bold">7 NAME AND DESIGNATION OF THE EXAMINING OFFICER / APPRAISER / SUPERINTENDENT</td>
                <td className="value-bold" style={{ textAlign: 'center' }}>{data?.appraiser_name || data?.appraiserName || 'SELF SEALING'}</td>
              </tr>
              <tr>
                <td className="label-bold">
                  8 (a) NAME OF COMMISERATE / DIVISION / RANGE<br />
                  &nbsp;&nbsp;&nbsp;(b) LOCATION CODE
                </td>
                <td className="value-bold" style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', padding: '1mm' }}>{data?.division_range || data?.divisionRange || 'SELF SEALING'}</div>
                  <div style={{ padding: '1mm' }}>{data?.location_code || data?.locationCode || 'N/A'}</div>
                </td>
              </tr>
              <tr>
                <td className="label-bold" style={{ verticalAlign: 'middle' }}>
                  9 PARTICULARS OF EXPORT INVOICE<br />
                  <span style={{ fontSize: '6pt', textTransform: 'none', fontWeight: 'normal' }}>
                    (a) EXPORT INVOICE No<br />
                    (b) TOTAL No. OF PACKAGES<br />
                    (c) NAME AND ADDRESS OF THE CONSIGNEE ABROAD
                  </span>
                </td>
                <td style={{ padding: 0 }}>
                  <table className="nested-grid">
                    <tbody>
                      <tr>
                        <td style={{ padding: 0 }}>
                          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                            <div className="value-bold" style={{ width: '35%', borderRight: '1px solid #000', textAlign: 'center' }}>{data?.ei_invoice_no || data?.eiInvoiceNo || data?.export_invoice_no || data?.exportInvoiceNo || data?.invoice_no || data?.invoiceNo || 'N/A'}</div>
                            <div className="value-bold" style={{ width: '25%', borderRight: '1px solid #000', textAlign: 'center' }}>{formatDate(data?.ei_invoice_date || data?.eiInvoiceDate || data?.invoice_date || data?.invoiceDate)}</div>
                            <div className="label-bold" style={{ width: '20%', borderRight: '1px solid #000', textAlign: 'center' }}>BOXES</div>
                            <div className="value-bold" style={{ width: '20%', textAlign: 'center' }}>TOTAL {totalPallets} PALLETS</div>
                          </div>
                        </td>
                      </tr>
                      <tr><td className="value-bold" style={{ textAlign: 'center' }}>{totalBoxes}</td></tr>
                      <tr style={{ height: '12mm' }}><td className="value-bold" style={{ fontSize: '7.5pt', fontWeight: 'normal', textAlign: 'center' }}></td></tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td className="label-bold">
                  (a) IS THE DESCRIPTION OF THE GOODS THE QUANTITY<br />
                  AND THERE VALUE AS PER PARTICULARS<br />
                  FURNISHED IN THE EXPORT INVOICE
                </td>
                <td className="value-bold" style={{ textAlign: 'center', verticalAlign: 'middle' }}>{data?.goods_description_match || data?.goodsDescriptionMatch || 'YES'}</td>
              </tr>
              <tr>
                <td className="label-bold">(b)WHETHER SAMPLES IS DRAWN FOR BEING</td>
                <td className="value-bold" style={{ textAlign: 'center' }}>{data?.samples_drawn || data?.samplesDrawn || 'N.A.'}</td>
              </tr>
              <tr>
                <td className="label-bold">
                  (c) IF YES THE No. OF THE SEAL OF THE<br />
                  PACKAGE CONTAINING THE SAMPLE
                </td>
                <td className="value-bold" style={{ textAlign: 'center' }}>{data?.sample_seal_no || data?.sampleSealNo || 'N.A.'}</td>
              </tr>
              <tr>
                <td className="label-bold">
                  CENTRAL EXCISE / CUSTOM SEAL No.<br />
                  (a) FOR NON CONTAINERIZED CARGO<br />
                  No.OF PACKAGES
                </td>
                <td className="value-bold" style={{ textAlign: 'center' }}>
                  {data?.customs_seal_no || data?.customsSealNo || '-'}
                </td>
              </tr>
              <tr>
                <td className="label-bold">(b) FOR CONTAINERAISED CARGO</td>
                <td className="value-bold" style={{ textAlign: 'center', fontSize: '7.5pt', padding: '1mm 2mm', wordBreak: 'break-word' }}>
                  {containerDetails && containerDetails.length > 0
                    ? 'AS PER ATTACHMENT'
                    : (data?.customs_seal_no || data?.customsSealNo || '-')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Container Details Table */}
          <table className="container-table" style={{ border: 'none' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>SR.No.</th>
                <th style={{ width: '100px' }}>CONTAINER NO.</th>
                <th style={{ width: '90px' }}>SEAL NO.</th>
                <th style={{ width: '100px' }}>E SEAL NO.</th>
                <th style={{ width: '50px' }}>SIZE</th>
                <th style={{ width: '80px' }}>SQM</th>
                <th style={{ width: '80px' }}>BOXES/ PCS</th>
                <th style={{ width: '90px' }}>NET WEIGHT</th>
                <th style={{ width: '90px' }}>GROSS WEIGHT</th>
              </tr>
            </thead>
            <tbody>
              {containerDetails.map((c, i) => (
                <tr key={i}>
                  {containerRowSpans[i] > 0 && (
                    <>
                      <td rowSpan={containerRowSpans[i]} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        {containerRowSpans.slice(0, i + 1).filter(span => span > 0).length}
                      </td>
                      <td rowSpan={containerRowSpans[i]} className="value-bold" style={{ verticalAlign: 'middle' }}>{c.container_no}</td>
                      <td rowSpan={containerRowSpans[i]} className="value-bold" style={{ verticalAlign: 'middle' }}>{c.line_seal_no}</td>
                      <td rowSpan={containerRowSpans[i]} className="value-bold" style={{ verticalAlign: 'middle' }}>{c.e_seal_no}</td>
                    </>
                  )}
                  <td className="value-bold">{c.size}</td>
                  <td className="value-bold">{formatNumber(c.total_sqm)}</td>
                  <td className="value-bold">{c.box}</td>
                  <td className="value-bold">{formatNumber(c.net_weight)}</td>
                  <td className="value-bold">{formatNumber(c.gross_weight)}</td>
                </tr>
              ))}
              <tr className="value-bold" style={{ background: '#f8f9fa' }}>
                <td colSpan="5" style={{ textAlign: 'right', paddingRight: '2mm' }}>TOTAL :-</td>
                <td>{formatNumber(totalSQM)}</td>
                <td>{totalBoxes}</td>
                <td>{formatNumber(totalNetWeight)}</td>
                <td>{formatNumber(totalGrossWeight)}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer Permission & Examined Sections */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2mm 3mm' }}>
                  <span className="label-bold" style={{ fontSize: '8.5pt', marginRight: '5mm' }}>PERMISSION No.</span>
                  <span className="value-bold" style={{ fontSize: '9pt' }}>{data?.permission_no || data?.permissionNo || '-'}</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '2mm 3mm', fontSize: '7pt', lineHeight: '1.4' }}>
                  <div style={{ fontWeight: '700', textTransform: 'uppercase' }}>
                    EXAMINED THE EXPORT GOODS COVERED UNDER THIS INVOICE ,DESCRIPTION OF THE GOODS WITH REFERENCE TO DUTY DRAWBACK SCHEDULE .<br />
                    WEIGHT ARE AS UNDER<br />
                    EXPORT UNDER LUT ARN BOND NO. F. NO : - {exporter.lutArnNo || data?.lut_arn_no || data?.lutArnNo || '-'} DT. {formatDate(exporter.lutDate || data?.lut_date || data?.lutDate) || '-'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Final Weights & Signature row */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', padding: 0, borderRight: '1px solid #000', borderBottom: '1px solid #000', borderLeft: 'none', borderTop: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td className="label-bold" style={{ width: '120px', padding: '1.5mm', textAlign: 'right', border: 'none' }}>NET WEIGHT</td>
                        <td className="value-bold" style={{ padding: '1.5mm', border: 'none' }}>{formatNumber(totalNetWeight)}</td>
                        <td className="label-bold" style={{ width: '80px', padding: '1.5mm', border: 'none' }}>KGS</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td style={{ width: '50%', padding: 0, borderRight: 'none', borderBottom: '1px solid #000', borderLeft: 'none', borderTop: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td className="label-bold" style={{ width: '120px', padding: '1.5mm', textAlign: 'right', border: 'none' }}>GROSS WEIGHT</td>
                        <td className="value-bold" style={{ padding: '1.5mm', border: 'none' }}>{formatNumber(totalGrossWeight)}</td>
                        <td className="label-bold" style={{ width: '80px', padding: '1.5mm', border: 'none' }}>KGS</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td colSpan="2" style={{ padding: '2mm', textAlign: 'right', border: 'none', borderTop: 'none' }}>
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

InvoiceBacksidePrintView.displayName = 'InvoiceBacksidePrintView';

export default InvoiceBacksidePrintView;
