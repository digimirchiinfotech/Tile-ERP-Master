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

const VGMPrintView = forwardRef(({ data }, ref) => {
  if (!data) return null;

  const vgm = data.vgm || data || {};
  const exportInvoice = data.export_invoice || data.exportInvoice || {};
  const companyInfo = data.company_info || data.companyInfo || {};
  const companyConfig = getCompanyConfig(vgm?.company_id || vgm?.companyId);
  const { signatureUrl, signatoryName } = useSignature(vgm?.signature_snapshot || data?.signature_snapshot || null);

  const cleanStr = (s) => {
    if (typeof s !== 'string') return null;
    const trimmed = s.trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'na' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'none') return null;
    return trimmed;
  };

  const shipper = useMemo(() => {
    const ci = companyInfo;
    const v = vgm;
    return {
      name: cleanStr(v.shipper_name) || cleanStr(v.shipperName) || cleanStr(ci?.comp_name) || cleanStr(ci?.compName) || cleanStr(ci?.name) || cleanStr(ci?.company_name) || cleanStr(ci?.companyName) || companyConfig.exporter.name,
      address: cleanStr(v.shipper_address) || cleanStr(v.shipperAddress) || cleanStr(ci?.address) || cleanStr(ci?.company_address) || cleanStr(ci?.companyAddress) || companyConfig.exporter.address,
      iecNo: cleanStr(v.shipper_iec) || cleanStr(v.shipperIec) || cleanStr(ci?.comp_iec) || cleanStr(ci?.compIec) || cleanStr(ci?.iec_no) || cleanStr(ci?.iecNo) || companyConfig.exporter.iecNo,
      contact: cleanStr(v.contact_details) || cleanStr(v.contactDetails) || cleanStr(ci?.comp_contact) || cleanStr(ci?.compContact) || cleanStr(ci?.phone) || cleanStr(ci?.contact_number) || cleanStr(ci?.contactNumber) || cleanStr(ci?.phone_no) || cleanStr(ci?.phoneNo) || companyConfig.exporter.phone || '-',
      authorizedPerson: cleanStr(v.authorized_person) || cleanStr(v.authorizedPerson) || cleanStr(ci?.comp_authorized_person) || cleanStr(ci?.compAuthorizedPerson) || cleanStr(ci?.authorized_signatory) || cleanStr(ci?.authorizedSignatory) || cleanStr(ci?.contact_person_name) || cleanStr(ci?.contactPersonName) || companyConfig.exporter.authorizedPerson || '-',
      logoUrl: ci?.logo_url || ci?.logoUrl
    };
  }, [vgm, companyInfo, companyConfig]);

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'AS PER BELOW DETAILS' || dateString === '-') return '-';
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

  const vgmContainers = useMemo(() => {
    const raw = vgm.container_sheet || vgm.containers || [];
    const items = Array.isArray(raw) ? raw : [];

    return items.map(c => {
      // Safely parse numbers (match exportMapper fallback logic: cargo -> gross -> net)
      const parsedCargo = parseFloat(c.cargo_wt || c.cargo_weight || c.cargoWeight || c.gross_weight || c.grossWeight || c.net_weight || c.netWeight || 0);
      const parsedTare = parseFloat(c.tare_wt || c.tare_weight || c.tareWeight || 0);
      const parsedTotal = parseFloat(c.vgm_weight || c.vgmWeight || 0);
      const type = (c.type || c.container_size || c.containerSize || c.size || "20'").toUpperCase();

      let finalTare = parsedTare;
      const finalCargo = parsedCargo;
      let finalTotal = parsedTotal;

      // If VGM weight is completely missing, calculate it once
      if (finalTotal === 0 && (finalCargo > 0 || finalTare > 0)) {
        finalTotal = finalCargo + finalTare;
      }

      // If Tare weight is missing but VGM and Cargo exist, infer the Tare mathematically
      if (finalTare === 0 && finalTotal > 0 && finalCargo > 0 && finalTotal >= finalCargo) {
        finalTare = finalTotal - finalCargo;
      }

      return {
        ...c,
        cargo_wt: finalCargo,
        tare_wt: finalTare,
        vgm_weight: finalTotal,
        displayType: type
      };
    });
  }, [vgm.container_sheet, vgm.containers]);

  const containerSizeSummary = useMemo(() => {
    if (!vgmContainers.length) return cleanStr(vgm.container_size) || '-';
    const count = vgmContainers.length;
    const size = vgmContainers[0].displayType;
    if (count === 1) return size;
    return `${count.toString().padStart(2, '0')} X ${size}`;
  }, [vgmContainers, vgm.container_size]);

  const displayContainerNo = useMemo(() => {
    return cleanStr(vgm.container_no) || 'AS PER ATTACHMENT';
  }, [vgm.container_no]);

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
        .pi-table th, .pi-table td { border: 1px solid #000; padding: 1.2mm 2mm; vertical-align: middle; font-size: 8.5pt; line-height: 1.2; overflow: hidden; word-wrap: break-word; }
        .pi-table th { background-color: #f8f9fa; font-weight: 800; text-transform: uppercase; text-align: center; font-size: 7.5pt; }

        .sr-col { width: 45px; text-align: center; font-weight: bold; }
        .label-col { width: 60%; font-weight: 700; color: #333; text-align: left; }
        .value-col { font-weight: 700; text-align: center; font-size: 9.5pt; }

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
          .watermark {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) rotate(-45deg) !important;
            font-size: 80pt !important;
            color: rgba(255, 0, 0, 0.08) !important;
            z-index: 0 !important;
            pointer-events: none !important;
          }
        }
      `}</style>

      <div className="print-container">
        {vgm.is_locked && (
          <div className="watermark" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '80pt', fontWeight: 'bold', color: 'rgba(255, 0, 0, 0.08)', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap'
          }}>
            🔒 LOCKED DOCUMENT
          </div>
        )}
        <div className="doc-box" style={{ position: 'relative', zIndex: 1 }}>
          <table className="pi-table" style={{ border: 'none' }}>
            <colgroup>
              <col style={{ width: '45px' }} />
              <col style={{ width: '60%' }} />
              <col style={{ width: '35%' }} />
            </colgroup>
            <thead>
              {/* Header Row */}
              <tr>
                <td colSpan="3" style={{ padding: '2mm 5mm', height: '18mm', borderBottom: '1px solid #000', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 0.5 }}></div>
                    <div style={{ flex: 3, textAlign: 'center' }}>
                      <h1 className="pi-header" style={{ fontSize: '15pt', fontWeight: '850', margin: 0, letterSpacing: '1px' }}>VERIFIED GROSS MASS (VGM)</h1>
                    </div>
                    <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                      {shipper.logoUrl && (
                        <div className="pi-logo">
                          <img src={resolveImageUrl(shipper.logoUrl)} alt="Logo" style={{ maxHeight: '12mm', maxWidth: '45mm', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <th colSpan="3" style={{ fontSize: '10pt', padding: '3mm' }}>INFORMATION ABOUT VERIFIED GROSS MASS OF CONTAINER</th>
              </tr>
              {vgm.is_locked && (
                <tr>
                  <td colSpan="3" style={{ padding: '2mm', backgroundColor: '#fdf3f3', borderBottom: '1px solid #000' }}>
                    <div style={{ fontSize: '8pt', color: '#d32f2f', fontWeight: 'bold', textAlign: 'center' }}>
                      ================================<br/>
                      DOCUMENT STATUS: LOCKED<br/>
                      Locked By: {vgm.locked_by_name || vgm.locked_by || 'Admin'}<br/>
                      Locked Date: {formatDate(vgm.locked_at) || 'N/A'}<br/>
                      ================================
                    </div>
                  </td>
                </tr>
              )}
              <tr>
                <th className="sr-col">SR NO.</th>
                <th style={{ textAlign: 'left' }}>DETAILS OF INFORMATION</th>
                <th>PARTICULARS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sr-col">1*</td>
                <td className="label-col">NAME OF THE SHIPPER</td>
                <td className="value-col">{shipper.name.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="sr-col">2*</td>
                <td className="label-col">SHIPPER REGISTRATION / LICENSE NO. ( IEC NO/CIN NO )**</td>
                <td className="value-col">{shipper.iecNo || '-'}</td>
              </tr>
              <tr>
                <td className="sr-col">3*</td>
                <td className="label-col">NAME AND DESIGNATION OF OFFICIAL OF THE SHIPPER AUTHORIZED TO SIGN DOCUMENT</td>
                <td className="value-col">{shipper.authorizedPerson.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="sr-col">4*</td>
                <td className="label-col">24 X 7 CONTACT DETAILS OF AUTHORIZED OFFICIAL OF SHIPPER</td>
                <td className="value-col">{shipper.contact}</td>
              </tr>
              <tr>
                <td className="sr-col">5*</td>
                <td className="label-col">CONTAINER NO.</td>
                <td className="value-col">{displayContainerNo.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="sr-col">6*</td>
                <td className="label-col">CONTAINER SIZE ( TEU/FEU/OTHER )</td>
                <td className="value-col">{containerSizeSummary}</td>
              </tr>
              <tr>
                <td className="sr-col">7*</td>
                <td className="label-col">MAXIMUM PERMISSIBLE WEIGHT OF CONTAINER AS PER THE CSC PLATE</td>
                <td className="value-col">
                  {cleanStr(vgm.max_permissible_weight) || cleanStr(vgm.maxPermissibleWeight) ?
                    (isNaN(parseFloat(vgm.max_permissible_weight || vgm.maxPermissibleWeight)) ?
                      (vgm.max_permissible_weight || vgm.maxPermissibleWeight) :
                      `${formatNumber(vgm.max_permissible_weight || vgm.maxPermissibleWeight)} KGS`) :
                    '30,480.00 KGS'}
                </td>
              </tr>
              <tr>
                <td className="sr-col">8*</td>
                <td className="label-col">WEIGHBRIDGE REGISTRATION NO. & ADDRESS OF WEIGHBRIDGE</td>
                <td className="value-col" style={{ whiteSpace: 'pre-wrap', fontSize: '8.5pt' }}>
                  {cleanStr(vgm.weighbridge_name) || cleanStr(vgm.weighbridgeName) || '-'}
                </td>
              </tr>
              <tr>
                <td className="sr-col">9*</td>
                <td className="label-col">VERIFIED GROSS MASS OF CONTAINER ( METHOD-1 / METHOD-2 )</td>
                <td className="value-col">{cleanStr(vgm.weighing_method) || cleanStr(vgm.weighingMethod) || 'METHOD-1'}</td>
              </tr>
              <tr>
                <td className="sr-col">10*</td>
                <td className="label-col">DATE AND TIME OF WEIGHING</td>
                <td className="value-col">{cleanStr(vgm.weighing_date) || cleanStr(vgm.weighingDate) || 'AS PER BELOW DETAILS'}</td>
              </tr>
              <tr>
                <td className="sr-col">11*</td>
                <td className="label-col">WEIGHING SLIP NO.</td>
                <td className="value-col">{cleanStr(vgm.weighing_slip_no) || cleanStr(vgm.weighingSlipNo) || 'AS PER BELOW DETAILS'}</td>
              </tr>
              <tr>
                <td className="sr-col">12</td>
                <td className="label-col">TYPE ( NORMAL/REEFER/HAZARDOUS/OTHERS )</td>
                <td className="value-col">{cleanStr(vgm.cargo_type) || cleanStr(vgm.cargoType) || 'NORMAL'}</td>
              </tr>
              <tr>
                <td className="sr-col">13</td>
                <td className="label-col">IF HAZARDOUS UN NO. IMDG CLASS</td>
                <td className="value-col">{cleanStr(vgm.un_no_imdg) || cleanStr(vgm.unNoImdg) || 'N/A'}</td>
              </tr>
              <tr>
                <td className="sr-col">14</td>
                <td className="label-col">BOOKING NUMBER</td>
                <td className="value-col">
                  {cleanStr(vgm.booking_no) || cleanStr(vgm.bookingNo) ||
                    cleanStr(vgm.booking_number) || cleanStr(vgm.bookingNumber) ||
                    cleanStr(exportInvoice.booking_no) || cleanStr(exportInvoice.bookingNo) || '-'}
                </td>
              </tr>
              <tr>
                <td className="sr-col">15</td>
                <td className="label-col">DESCRIPTION OF GOODS</td>
                <td className="value-col">
                  {cleanStr(vgm.product_description) || cleanStr(vgm.productDescription) || 'AS PER ATTACHMENT'}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="pi-table" style={{ border: 'none' }}>
            <thead>
              {/* Attached Container Sheet Title */}
              <tr>
                <td colSpan="6" style={{ background: '#000', color: '#fff', padding: '1.5mm', textAlign: 'center', fontWeight: 'bold', fontSize: '8.5pt', borderBottom: 'none' }}>
                  ATTACHED CONTAINER SHEET
                </td>
              </tr>
              <tr>
                <th style={{ width: '25%' }}>CONTAINER NO.</th>
                <th style={{ width: '15%' }}>TYPE / SIZE</th>
                <th style={{ width: '15%' }}>CARGO WT. (KGS)</th>
                <th style={{ width: '15%' }}>TARE WT. (KGS)</th>
                <th style={{ width: '15%' }}>VGM WEIGHT (KGS)</th>
                <th style={{ width: '15%' }}>SLIP NO. & DATE</th>
              </tr>
            </thead>
            <tbody>
              {vgmContainers.map((c, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{c.container_no || c.containerNo || 'N/A'}</td>
                  <td style={{ textAlign: 'center' }}>{c.displayType}</td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(c.cargo_wt)}</td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(c.tare_wt)}</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{formatNumber(c.vgm_weight)}</td>
                  <td style={{ textAlign: 'center', fontSize: '7.5pt' }}>
                    {(() => {
                      const candidateNos = [c.slip_no, c.slipNo, c.weighing_slip_no, c.weighingSlipNo, vgm.weighing_slip_no, vgm.weighingSlipNo];
                      const sNo = candidateNos.map(n => cleanStr(n)).find(n => n && n !== 'AS PER BELOW DETAILS') || '';

                      const candidateDates = [c.slip_no_date, c.slipNoDate, c.weighing_date, c.weighingDate, vgm.weighing_date, vgm.weighingDate];
                      const sDateRaw = candidateDates.map(d => cleanStr(d)).find(d => d && d !== 'AS PER BELOW DETAILS') || '';
                      const sDate = sDateRaw ? formatDate(sDateRaw) : '';

                      if (!sNo && !sDate) return '';
                      return (
                        <>
                          {sNo}
                          {sNo && sDate && <br />}
                          {sDate}
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {vgmContainers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '5mm', color: '#666' }}>NO CONTAINER DATA AVAILABLE</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Unified Two-Column Footer */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '60%', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #000', padding: '2mm', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '6.8pt', lineHeight: '1.3', color: '#444' }}>
                    * Indicates mandatory fields.<br />
                    ** Registrations/license number of the shipper in IEC (Import Export Code) format issued by Director General of Foreign Trade (DGFT) or CIN No. issued by Ministry of Corporate Affairs, Govt. of India.
                  </div>
                </td>
                <td style={{ width: '40%', borderLeft: '1px solid #000', borderRight: 'none', borderBottom: '1px solid #000', padding: '2mm', textAlign: 'center', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '4mm' }}>SIGNATURE OF AUTHORIZED PERSON OF SHIPPER</div>
                  <div style={{ fontSize: '8.5pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4mm' }}>FOR, {shipper.name}</div>
                  <SignatureBlock
                    signatureUrl={signatureUrl}
                    signatoryName={signatoryName}
                    companyName={shipper.name}
                  />
                  <div style={{ fontWeight: 'bold', marginTop: '2mm', fontSize: '8pt' }}>DATE: {formatDate(vgm.vgm_date || new Date())}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

VGMPrintView.displayName = 'VGMPrintView';

export default VGMPrintView;
