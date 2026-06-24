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

import { useMemo } from 'react';
import { getCompanyConfig } from '../../../config/companyConfig';
import { resolveImageUrl } from '../../../utils/urlHelper';
import useSignature from '../../../hooks/useSignature';
import SignatureBlock from '../../shared/SignatureBlock';

const ShippingInstructionsPrintView = ({ data }) => {
  const { signatureUrl, signatoryName } = useSignature(data?.signature_snapshot || null);
  if (!data) return null;

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

  const formatNum = (n, d = 2) => {
    const v = parseFloat(n) || 0;
    if (v === 0) return '0.00';
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  const containers = useMemo(() => {
    const raw = data.containerDetails || data.container_details || [];
    const list = Array.isArray(raw) ? raw : [];

    // Auto-heal logic for 1 container document
    const docGrossWt = parseFloat(data.totalGrossWeight || data.total_gross_weight || 0);
    if (list.length === 1 && docGrossWt > 0) {
      return [{
        ...list[0],
        grossWt: docGrossWt,
        gross_weight: docGrossWt
      }];
    }
    return list;
  }, [data.containerDetails, data.container_details, data.totalGrossWeight, data.total_gross_weight]);

  const companyConfig = getCompanyConfig(data?.company_id || data?.companyId);

  const exporter = useMemo(() => {
    const ci = data.company_info || data.companyInfo || {};
    const lines = (data.exporterDetails || data.exporter_details || '').split('\n');
    return {
      name: ci.name || ci.company_name || ci.comp_name || lines[0] || companyConfig.exporter.name,
      address: ci.address || ci.company_address || ci.comp_address || lines.slice(1).join('\n') || companyConfig.exporter.address,
      logoUrl: ci.logo_url || ci.logoUrl || data.logoUrl || data.logo_url || companyConfig.logo_url,
      authorizedPerson: ci.authorized_person || ci.authorized_signatory || ci.comp_authorized_person || ci.contact_person_name || companyConfig.exporter.authorizedPerson || ''
    };
  }, [data, companyConfig]);

  const totals = useMemo(() => {
    return containers.reduce((acc, c) => ({
      boxes: acc.boxes + (parseInt(c.boxes || c.total_boxes || 0) || 0),
      sqm: acc.sqm + (parseFloat(c.sqm || c.total_sqm || 0) || 0),
      netWeight: acc.netWeight + (parseFloat(c.net_weight || c.netWt || 0) || 0),
      grossWeight: acc.grossWeight + (parseFloat(c.gross_weight || c.grossWt || 0) || 0),
      pallets: acc.pallets + (parseInt(c.pallets || c.total_pallets || c.total_pallet || c.totalPallet || 0) || 0)
    }), { boxes: 0, sqm: 0, netWeight: 0, grossWeight: 0, pallets: 0 });
  }, [containers]);

  const containerSummary = useMemo(() => {
    if (containers.length === 0) return '';
    const firstType = containers[0].container_size || containers[0].type || "20'";
    return `${containers.length.toString().padStart(2, '0')}X${firstType} FCL SAID TO CONTAIN ${totals.boxes} BOXES`;
  }, [containers, totals.boxes]);

  return (
    <div className="si-print-wrapper">
      <style>{`
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

        .si-print-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #fff;
        }

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

        .pi-header {
          font-size: 13pt;
          font-weight: 800;
          text-transform: uppercase;
          margin: 0;
          text-align: center;
        }

        .si-label {
          font-weight: bold;
          text-decoration: underline;
          display: block;
          margin-bottom: 0.5mm;
          font-size: 8pt;
        }

        .si-content {
          padding-left: 0mm;
          white-space: pre-wrap;
          font-size: 8.5pt;
        }

        .pi-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
        }

        .pi-table td {
          border: 1px solid #000;
          padding: 1.5mm 2mm;
          font-size: 8.5pt;
          vertical-align: middle;
          line-height: 1.25;
        }

        .si-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0mm;
        }

        .si-table th, .si-table td {
          border: 1px solid #000;
          padding: 1.5mm 1mm;
          text-align: center;
          font-size: 8.5pt;
        }

        .si-table th {
          background-color: #f8f9fa;
          font-weight: bold;
          font-size: 7.5pt;
          text-transform: uppercase;
        }

        .bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      `}</style>

      <div className="print-container">
        <div className="doc-box">
          {/* Main Headers and Addresses */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              {/* Header Row */}
              <tr>
                <td colSpan="3" style={{ padding: '2mm 5mm', height: '18mm', borderBottom: '1px solid #000', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 0.5 }}></div>
                    <div style={{ flex: 3, textAlign: 'center' }}>
                      <h1 className="pi-header" style={{ fontSize: '15pt', fontWeight: '850', margin: 0, letterSpacing: '1px' }}>SHIPPING INSTRUCTIONS</h1>
                    </div>
                    <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                      {exporter.logoUrl && (
                        <div className="si-logo">
                          <img src={resolveImageUrl(exporter.logoUrl)} alt="Logo" style={{ maxHeight: '12mm', maxWidth: '45mm', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              {/* Exporter & Booking */}
              <tr>
                <td colSpan="2" style={{ width: '60%', verticalAlign: 'top', padding: '2mm' }}>
                  <span className="si-label">EXPORTER:-</span>
                  <div className="si-content bold uppercase" style={{ fontSize: '8pt' }}>{exporter.name}</div>
                  <div className="si-content uppercase" style={{ fontSize: '7.5pt', whiteSpace: 'pre-wrap', marginTop: '1mm' }}>{exporter.address}</div>
                </td>
                <td colSpan="1" style={{ width: '40%', verticalAlign: 'top', padding: '2mm' }}>
                  <div className="bold" style={{ fontSize: '8.5pt' }}>BOOKING NO:</div>
                  <div style={{ fontSize: '11pt', fontWeight: '900', marginTop: '1mm' }}>{data.bookingNo || data.booking_no || data.booking_number || '-'}</div>
                </td>
              </tr>
              {/* Consignee */}
              <tr>
                <td colSpan="3" style={{ padding: '2mm', verticalAlign: 'top' }}>
                  <span className="si-label">CONSIGNEE:-</span>
                  <div className="si-content bold uppercase" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap' }}>{data.consigneeDetails || data.consignee_details || '-'}</div>
                </td>
              </tr>
              {/* Notify - I */}
              <tr>
                <td colSpan="3" style={{ padding: '2mm', verticalAlign: 'top' }}>
                  <span className="si-label">NOTIFY - I:-</span>
                  <div className="si-content bold uppercase" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap' }}>{data.notifyParty1 || data.notify_party_1 || '-'}</div>
                </td>
              </tr>
              {/* Notify - II */}
              <tr>
                <td colSpan="3" style={{ padding: '2mm', verticalAlign: 'top' }}>
                  <span className="si-label">NOTIFY - II:-</span>
                  <div className="si-content bold uppercase" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap' }}>{data.notifyParty2 || data.notify_party_2 || '-'}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Logistics Grid */}
          <table className="pi-table" style={{ border: 'none', marginTop: '-1px' }}>
            <tbody>
              <tr>
                <td style={{ width: '33.3%', padding: '1.5mm 2mm' }}><span className="bold">VESSEL / VOYAGE :</span><br />{data.vesselName || data.vessel_name || '-'}</td>
                <td style={{ width: '33.3%', padding: '1.5mm 2mm' }}><span className="bold">ETD :</span><br />{formatDate(data.etd || data.date)}</td>
                <td style={{ width: '33.4%', padding: '1.5mm 2mm' }}><span className="bold">POD :</span><br />{data.pod || data.port_of_discharge || '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '1.5mm 2mm' }}><span className="bold">POL :</span><br />{data.pol || data.port_of_loading || '-'}</td>
                <td colSpan="2" style={{ padding: '1.5mm 2mm' }}><span className="bold">FINAL DESTINATION :</span><br />{data.finalDestination || data.final_destination || '-'}</td>
              </tr>
            </tbody>
          </table>

          {/* Cargo Summary Table */}
          <table className="pi-table" style={{ border: 'none', marginTop: '-1px' }}>
            <tbody>
              <tr>
                <td colSpan="4" style={{ background: '#f8f9fa', padding: '1.5mm 2mm', fontSize: '9pt', fontWeight: 'bold' }}>
                  {containerSummary}
                </td>
              </tr>
              <tr>
                <td colSpan="4" style={{ background: '#f8f9fa', padding: '1.5mm 2mm', fontSize: '9pt', fontWeight: 'bold' }}>
                  TOTAL {data.totalPallets || totals.pallets || 0} PALLETS
                </td>
              </tr>
              <tr>
                <td colSpan="4" style={{ padding: '2mm', fontSize: '9.5pt', fontWeight: 'bold', textTransform: 'uppercase', background: '#fff', whiteSpace: 'pre-wrap', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {(data.siDescription || data.description_of_goods || '-').trim()}
                </td>
              </tr>
              <tr>
                <td className="bold" style={{ width: '25%' }}>HS CODE :-</td>
                <td style={{ width: '25%' }}>{data.hsCode || data.hs_code || '-'}</td>
                <td className="bold" style={{ width: '25%' }}>TOTAL SQM :-</td>
                <td style={{ width: '25%' }}>{formatNum(data.totalSqm || totals.sqm)}</td>
              </tr>
              <tr>
                <td className="bold">TOTAL BOXES :-</td>
                <td>{data.totalBoxes || totals.boxes}</td>
                <td className="bold">TOTAL NET WT:</td>
                <td>{formatNum(data.totalNetWeight || totals.netWeight)} KGS</td>
              </tr>
              <tr>
                <td className="bold">INVOICE NO. :-</td>
                <td>{data.exportInvoiceNo || data.invoice_no || '-'} <span className="bold" style={{ marginLeft: '1mm' }}>DT:</span> {formatDate(data.invoiceDate || data.ei_invoice_date || data.invoice_date)}</td>
                <td className="bold">TOTAL GR. WT:</td>
                <td>{formatNum(data.totalGrossWeight || totals.grossWeight)} KGS</td>
              </tr>
              <tr>
                <td className="bold">SB NO. :-</td>
                <td colSpan="3">{data.sbNo || data.shipping_bill_no || '-'} <span className="bold" style={{ marginLeft: '4mm' }}>DT:</span> {formatDate(data.sbDate || data.shipping_bill_date)}</td>
              </tr>
              <tr>
                <td colSpan="4" style={{ background: '#f8f9fa', padding: '2mm', fontSize: '9.5pt', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>
                  Bill of Lading Type : {data.blType || data.bl_type || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Container Lines Table */}
          <table className="si-table" style={{ border: 'none', marginTop: '-1px' }}>
            <thead>
              <tr>
                <th style={{ width: '12mm' }}>SR.NO</th>
                <th>CONTAINER NO</th>
                <th>SEAL NO</th>
                <th>SQM</th>
                <th>BOXES</th>
                <th>NET. WT.</th>
                <th>GR. WT.</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c, i) => {
                const isFoc = !!(c.isFoc || c.is_foc);
                return (
                  <tr key={i}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{c.container_no || c.containerNo}</td>
                    <td>{c.seal_no || c.sealNo || c.line_seal_no || c.lineSealNo || '-'}</td>
                    <td>{formatNum(c.sqm)}</td>
                    <td>{c.boxes}</td>
                    <td>{formatNum(c.net_weight || c.netWt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {isFoc && (
                          <span style={{
                            fontSize: '5.5pt',
                            color: '#d32f2f',
                            fontWeight: '900',
                            marginBottom: '0.5mm',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                          }}>
                            FREE OF COST SAMPLE NO COMMERCIAL VALUE
                          </span>
                        )}
                        {formatNum(c.gross_weight || c.grossWt)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                <td colSpan="3" style={{ textAlign: 'right', paddingRight: '4mm' }}>TOTAL</td>
                <td>{formatNum(totals.sqm)}</td>
                <td>{totals.boxes}</td>
                <td>{formatNum(totals.netWeight)}</td>
                <td>{formatNum(totals.grossWeight)}</td>
              </tr>
            </tbody>
          </table>

          {/* Signature Section */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '100%', padding: '2mm', textAlign: 'right', border: 'none', borderTop: 'none' }}>
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
};

export default ShippingInstructionsPrintView;
