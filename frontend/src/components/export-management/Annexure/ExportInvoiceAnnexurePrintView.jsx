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

const ExportInvoiceAnnexurePrintView = forwardRef(({ data, annexureData: annexureDataProp, isOfficePrint = false }, ref) => {
  const annexureData = data || annexureDataProp;
  const companyConfig = getCompanyConfig(annexureData?.company_id || annexureData?.companyId);
  const { signatureUrl, signatoryName } = useSignature(annexureData?.signature_snapshot || null);

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
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    });
  };

  const containerDetails = useMemo(() => {
    let containers = annexureData?.container_details || annexureData?.containerDetails || [];
    if (typeof containers === 'string') {
      try { containers = JSON.parse(containers); } catch (e) { containers = []; }
    }
    return (Array.isArray(containers) ? containers : []).map(c => ({
      ...c,
      hsn_code: c.hsn_code || c.hsnCode || c.hs_code || c.hsCode || '',
      product_name: c.product_name || c.product || c.productName || c.material_description || '-',
      material_description: c.material_description || c.materialDescription || c.description || '',
      sqm: parseFloat(c.sqm || c.total_sqm || c.totalSqm || 0),
      boxes: parseInt(c.boxes || c.total_boxes || c.box || 0, 10),
      gross_weight: parseFloat(c.gross_weight || c.grossWeight || 0),
      net_weight: parseFloat(c.net_weight || c.netWeight || 0)
    }));
  }, [annexureData]);

  const exporter = useMemo(() => {
    const ci = annexureData?.company_info || annexureData?.companyInfo;
    return {
      name: ci?.name || ci?.company_name || ci?.companyName || annexureData?.company_name || annexureData?.companyName || companyConfig.exporter.name,
      address: ci?.address || ci?.company_address || ci?.companyAddress || annexureData?.company_address || annexureData?.companyAddress || companyConfig.exporter.address,
      iecNo: ci?.iec_no || ci?.iecNo || annexureData?.iec_no || annexureData?.iecNo || companyConfig.exporter.iecNo,
      gstn: ci?.gstn || ci?.gstin || companyConfig.exporter.gstn,
      logoUrl: ci?.logo_url || ci?.logoUrl || annexureData?.logo_url || annexureData?.logoUrl,
      phone: ci?.contact_number || ci?.phone || annexureData?.phone || companyConfig.exporter.phone || '',
      authorizedPerson: ci?.authorized_person || ci?.authorized_signatory || ci?.comp_authorized_person || ci?.contact_person_name || companyConfig.exporter.authorizedPerson || '',
    };
  }, [annexureData, companyConfig]);

  const totals = useMemo(() => {
    return containerDetails.reduce((acc, c) => ({
      pallets: acc.pallets + (parseInt(c.pallets || c.total_pallets || c.total_pallet || c.totalPallets || c.totalPallet || 0) || 0),
      boxes: acc.boxes + c.boxes,
      sqm: acc.sqm + c.sqm,
      netWeight: acc.netWeight + c.net_weight,
      grossWeight: acc.grossWeight + c.gross_weight,
    }), { pallets: 0, boxes: 0, sqm: 0, netWeight: 0, grossWeight: 0 });
  }, [containerDetails]);

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

      const prevKey = `${prev.container_no || prev.containerNo}-${prev.line_seal_no || prev.lineSealNo}-${prev.e_seal_no || prev.eSealNo}`;
      const currKey = `${curr.container_no || curr.containerNo}-${curr.line_seal_no || curr.lineSealNo}-${curr.e_seal_no || curr.eSealNo}`;

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

  const totalPallets = annexureData?.total_pallets || annexureData?.totalPallets || totals.pallets || 0;
  const totalBoxes = annexureData?.total_boxes || annexureData?.totalBoxes || totals.boxes || 0;
  const totalSqm = parseFloat(annexureData?.total_sqm || annexureData?.totalSqm || totals.sqm || 0);
  const totalNetWeight = parseFloat(annexureData?.net_weight || annexureData?.netWeight || totals.netWeight || 0);
  const totalGrossWeight = parseFloat(annexureData?.gross_weight || annexureData?.grossWeight || totals.grossWeight || 0);

  const materialHeader = annexureData?.material_header_description || annexureData?.materialHeaderDescription || annexureData?.product_description || annexureData?.productDescription || '';

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
        .pi-table td { border: 1px solid #000; padding: 1.2mm 2.2mm; vertical-align: top; font-size: 7.2pt; line-height: 1.25; }
        
        .label-bold { font-weight: 700; font-size: 6pt; text-transform: uppercase; color: #333; }
        .value-bold { font-weight: 700; font-size: 7.5pt; color: #000; }
        
        .container-table { width: 100%; border-collapse: collapse; margin-top: -1px; }
        .container-table th, .container-table td { 
          border: 1px solid #000; 
          padding: ${isOfficePrint ? '1.0mm 0.5mm' : '1.1mm 0.8mm'}; 
          text-align: center; 
          font-size: ${isOfficePrint ? '6.0pt' : '6.8pt'}; 
          vertical-align: middle; 
        }
        .container-table th { background: #f8f9fa; font-weight: 800; font-size: ${isOfficePrint ? '5.6pt' : '6.2pt'}; text-transform: uppercase; }

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
          {/* High-Fidelity Header Grid */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              {/* Header Row */}
              <tr>
                <td colSpan="4" style={{ padding: '2mm 5mm', height: '18mm', borderBottom: '1px solid #000', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ flex: 2, textAlign: 'center' }}>
                      <h1 className="pi-header" style={{ fontSize: '13pt', fontWeight: '800', margin: 0 }}>INVOICE ANNEXURE</h1>
                      <div style={{ fontSize: '7.5pt', fontWeight: '700', textTransform: 'uppercase', marginTop: '0.5mm' }}>
                        CONTAINER & PACKING DETAILS
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      {exporter.logoUrl && (
                        <img src={resolveImageUrl(exporter.logoUrl)} alt="Logo" style={{ maxHeight: '12mm', maxWidth: '45mm', objectFit: 'contain' }} />
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan="2" rowSpan="3" style={{ width: '50%' }}>
                  <span className="label-bold">EXPORTER :-</span><br />
                  <div className="value-bold" style={{ textTransform: 'uppercase', fontSize: '9pt', marginTop: '0.5mm' }}>{exporter.name}</div>
                  <div style={{ fontSize: '7pt', whiteSpace: 'pre-wrap', lineHeight: 1.2 }}>{exporter.address}</div>
                  <div style={{ marginTop: '2mm', display: 'flex', flexWrap: 'wrap', gap: '4mm' }}>
                    <div><span className="label-bold">IEC:</span> <span className="value-bold">{exporter.iecNo || 'N/A'}</span></div>
                    <div><span className="label-bold">PAN:</span> <span className="value-bold">{annexureData?.bin_no || annexureData?.binNo || exporter.gstn?.slice(2, 12) || 'N/A'}</span></div>
                    {(annexureData?.permission_no || annexureData?.permissionNo) && (
                      <div><span className="label-bold">PERM NO:</span> <span className="value-bold">{annexureData.permission_no || annexureData.permissionNo}</span></div>
                    )}
                  </div>
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <span className="label-bold">ANNEXURE TO INVOICE INVOICE NO. & DATE</span><br />
                  <div className="value-bold" style={{ marginTop: '0.5mm' }}>
                    {annexureData?.export_invoice_no || annexureData?.invoice_no || annexureData?.exportInvoiceNo || annexureData?.invoiceNo || '-'} &nbsp;&nbsp;&nbsp; {formatDate(annexureData?.export_invoice_date || annexureData?.invoice_date || annexureData?.exportInvoiceDate || annexureData?.invoiceDate)}
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan="2" style={{ width: '50%' }}>
                  <span className="label-bold">CONSIGNEE</span><br />
                  <div className="value-bold" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap' }}>{annexureData?.consignee_details || annexureData?.consigneeDetails || annexureData?.inv_consignee_details || annexureData?.inv_client || 'TO THE ORDER'}</div>
                </td>
              </tr>
              <tr>
                <td colSpan="2" style={{ width: '50%' }}>
                  <span className="label-bold">BUYER</span><br />
                  <div className="value-bold" style={{ fontSize: '8pt', whiteSpace: 'pre-wrap' }}>{annexureData?.buyer_details || annexureData?.buyerDetails || annexureData?.inv_buyer_details || annexureData?.inv_client || 'TO THE ORDER'}</div>
                </td>
              </tr>

              <tr style={{ background: '#f8f9fa' }}>
                <td style={{ width: '25%' }} className="label-bold">VESSEL FLIGHT NO.</td>
                <td style={{ width: '25%' }} className="label-bold">PORT OF LOADING</td>
                <td style={{ width: '25%' }} className="label-bold">COUNTRY OF ORIGIN</td>
                <td style={{ width: '25%' }} className="label-bold">COUNTRY OF FINAL DESTINATION</td>
              </tr>
              <tr>
                <td className="value-bold">{annexureData?.vessel_flight_no || annexureData?.vesselFlightNo || annexureData?.vessel_name || annexureData?.vesselName || '-'}</td>
                <td className="value-bold">{annexureData?.port_of_loading || annexureData?.portOfLoading || annexureData?.pol || '-'}</td>
                <td rowSpan="2" className="value-bold" style={{ verticalAlign: 'middle', textAlign: 'center' }}>{annexureData?.country_of_origin || annexureData?.countryOfOrigin || '-'}</td>
                <td rowSpan="2" className="value-bold" style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                  {(annexureData?.country_of_final_destination && annexureData?.country_of_final_destination !== 'country') ? annexureData.country_of_final_destination :
                    (annexureData?.countryOfFinalDestination && annexureData?.countryOfFinalDestination !== 'country') ? annexureData.countryOfFinalDestination :
                      (annexureData?.country && annexureData?.country !== 'country') ? annexureData.country : '-'}
                </td>
              </tr>
              <tr>
                <td>
                  <span className="label-bold">PORT OF DISCHARGE</span><br />
                  <span className="value-bold">{annexureData?.port_of_discharge || annexureData?.portOfDischarge || annexureData?.pod || '-'}</span>
                </td>
                <td>
                  <span className="label-bold">FINAL DESTINATION</span><br />
                  <span className="value-bold">{annexureData?.final_destination || annexureData?.finalDestination || '-'}</span>
                </td>
              </tr>
              <tr>
                <td colSpan="4" className="value-bold" style={{ fontSize: '9pt', textAlign: 'center', textTransform: 'uppercase', padding: '2mm' }}>
                  {annexureData?.material_header_description || annexureData?.materialHeaderDescription || annexureData?.product_description || annexureData?.productDescription || annexureData?.description || materialHeader || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="container-table" style={{ border: 'none' }}>
            <thead>
              <tr>
                <th style={{ width: '3%' }}>SR.</th>
                <th style={{ width: isOfficePrint ? '10%' : '14%' }}>CONTAINER NO.</th>
                <th style={{ width: isOfficePrint ? '8%' : '11%' }}>LINE SEAL</th>
                <th style={{ width: isOfficePrint ? '8%' : '11%' }}>E-SEAL</th>
                {isOfficePrint && (
                  <>
                    <th style={{ width: '8%' }}>VEHICLE NO.</th>
                    <th style={{ width: '5%' }}>TARE WT</th>
                    <th style={{ width: '5%' }}>LR NO.</th>
                  </>
                )}
                <th style={{ width: isOfficePrint ? '21%' : '26%' }}>MATERIAL DESCRIPTION</th>
                <th style={{ width: '6%' }}>PALLET NO.</th>
                <th style={{ width: '7%' }}>PALLET DETAIL</th>
                <th style={{ width: '6%' }}>SQM</th>
                <th style={{ width: '4%' }}>BOX</th>
                <th style={{ width: '8%' }}>NET WT</th>
                <th style={{ width: '8%' }}>GROSS WT</th>
              </tr>
            </thead>
            <tbody>
              {containerDetails.map((c, i) => {
                const isFoc = !!(c.is_foc || c.isFoc);
                return (
                  <tr key={i}>
                    {containerRowSpans[i] > 0 && (
                      <td rowSpan={containerRowSpans[i]} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        {containerRowSpans.slice(0, i + 1).filter(span => span > 0).length}
                      </td>
                    )}
                    {containerRowSpans[i] > 0 && (
                      <>
                        <td rowSpan={containerRowSpans[i]} className="value-bold" style={{ verticalAlign: 'middle' }}>{c.container_no || c.containerNo || '-'}</td>
                        <td rowSpan={containerRowSpans[i]} style={{ verticalAlign: 'middle' }}>{c.line_seal_no || c.lineSealNo || '-'}</td>
                        <td rowSpan={containerRowSpans[i]} style={{ verticalAlign: 'middle' }}>{c.e_seal_no || c.eSealNo || '-'}</td>
                        {isOfficePrint && (
                          <>
                            <td rowSpan={containerRowSpans[i]} className="value-bold" style={{ verticalAlign: 'middle' }}>{c.vehicle_no || c.vehicleNo || '-'}</td>
                            <td rowSpan={containerRowSpans[i]} style={{ verticalAlign: 'middle' }}>{c.tare_wt || c.tareWt || '-'}</td>
                            <td rowSpan={containerRowSpans[i]} style={{ verticalAlign: 'middle' }}>{c.lr_no || c.lrNo || '-'}</td>
                          </>
                        )}
                      </>
                    )}
                    <td style={{ textAlign: 'left', paddingLeft: '1.5mm' }} className="value-bold">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
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
                        {(!isFoc || (c.product_name && c.product_name.toLowerCase() !== 'unknown' && c.product_name.toLowerCase() !== 'name')) && (
                          <span>{c.product_name}</span>
                        )}
                        {c.material_description && c.material_description !== c.product_name && c.material_description.toLowerCase() !== 'name' && c.material_description.toLowerCase() !== 'unknown' && c.material_description !== '-' && (
                          <div style={{ fontSize: '6.5pt', fontWeight: 'normal', color: '#555', marginTop: '0.5mm', textAlign: 'left', width: '100%', wordBreak: 'break-word' }}>
                            {c.material_description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{c.pallet_no || c.palletNo || c.pallet_detail || c.palletDetail || c.pallet || '-'}</td>
                    <td style={{ textAlign: 'left', paddingLeft: '1.5mm' }}>{c.detail || c.details || '-'}</td>
                    <td className="value-bold">{formatNumber(c.sqm)}</td>
                    <td className="value-bold">{c.boxes}</td>
                    <td className="value-bold">{formatNumber(c.net_weight)}</td>
                    <td className="value-bold">{formatNumber(c.gross_weight)}</td>
                  </tr>
                );
              })}
              <tr className="value-bold" style={{ background: '#f8f9fa' }}>
                <td colSpan={isOfficePrint ? 8 : 5} style={{ textAlign: 'right', paddingRight: '2mm' }}>TOTAL :-</td>
                <td>{totalPallets}</td>
                <td></td>
                <td>{formatNumber(totalSqm)}</td>
                <td>{totalBoxes}</td>
                <td>{formatNumber(totalNetWeight)}</td>
                <td>{formatNumber(totalGrossWeight)}</td>
              </tr>
            </tbody>
          </table>

          {/* Smart Consolidated Grid Footer (Uniform with Export Invoice) */}
          <table className="pi-table" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td colSpan="2" style={{ width: '66%', padding: '1mm 2mm', borderBottom: '1px solid #000' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1mm', fontSize: '6.8pt', lineHeight: '1.2', textAlign: 'left' }}>
                    <div style={{ color: '#000' }}>
                      <strong className="label-bold" style={{ fontSize: '6.8pt' }}>1. PALLETS :-</strong> {annexureData?.pallet_type || annexureData?.palletType || 'NORMAL WOODEN PALLETS'}<br />
                      <strong className="label-bold" style={{ fontSize: '6.8pt' }}>2. MADE IN INDIA :-</strong><br />
                      &nbsp;&nbsp;TILES BACK: {annexureData?.tiles_back || annexureData?.tilesBack || 'MADE IN INDIA'}<br />
                      &nbsp;&nbsp;BOXES: {annexureData?.marks_and_numbers || annexureData?.marksAndNumbers || annexureData?.made_in_india || annexureData?.madeInIndia || 'MADE IN INDIA'}
                    </div>
                    <div style={{ color: '#000' }}>
                      <strong className="label-bold" style={{ fontSize: '6.8pt' }}>3. BOXES :-</strong> {annexureData?.box_type || annexureData?.boxType || 'NON BRANDED BOXES'}<br />
                      <strong className="label-bold" style={{ fontSize: '6.8pt' }}>4. FUMIGATION :-</strong> {annexureData?.fumigation || 'YES'}<br />
                      <strong className="label-bold" style={{ fontSize: '6.8pt' }}>5. LEGALISATION :-</strong> {annexureData?.legalisation || 'NO'}<br />
                      <strong className="label-bold" style={{ fontSize: '6.8pt' }}>6. OTHER :-</strong> {annexureData?.other_instructions || annexureData?.otherInstructions || 'NO'}
                    </div>
                  </div>
                </td>
                <td rowSpan="2" style={{ width: '34%', borderLeft: '1px solid #000', verticalAlign: 'top', padding: '2mm' }}>
                  <SignatureBlock
                    signatureUrl={signatureUrl}
                    signatoryName={signatoryName}
                    companyName={exporter.name}
                    style={{ textAlign: 'right' }}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ width: '33%', padding: '2mm' }}>
                  <div className="label-bold" style={{ fontSize: '7pt' }}>NET WEIGHT</div>
                  <div className="value-bold" style={{ fontSize: '10.5pt' }}>{formatNumber(totalNetWeight)} KGS</div>
                </td>
                <td style={{ width: '33%', borderLeft: '1px solid #000', padding: '2mm' }}>
                  <div className="label-bold" style={{ fontSize: '7pt' }}>GROSS WEIGHT</div>
                  <div className="value-bold" style={{ fontSize: '10.5pt' }}>{formatNumber(totalGrossWeight)} KGS</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

ExportInvoiceAnnexurePrintView.displayName = 'ExportInvoiceAnnexurePrintView';
export default ExportInvoiceAnnexurePrintView;
