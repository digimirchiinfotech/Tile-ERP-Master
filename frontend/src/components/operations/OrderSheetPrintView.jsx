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

import React, { forwardRef } from 'react';

const OrderSheetPrintView = forwardRef(({ sheet }, ref) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const lines = sheet?.lines || [];
  const reqBoxes = parseFloat(sheet?.total_required_boxes || sheet?.totalRequiredBoxes || 0);
  const prodBoxes = parseFloat(sheet?.total_produced_boxes || sheet?.totalProducedBoxes || 0);

  return (
    <div ref={ref} className="bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#000', padding: '40px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>MASTER ORDER SHEET</h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}>Production Planning & Factory Allocation</p>
      </div>

      {/* Sheet Details */}
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '25%', padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Production Sheet No</td>
            <td style={{ width: '25%', padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{sheet?.production_sheet_no || sheet?.productionSheetNo || '-'}</td>
            <td style={{ width: '25%', padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>PO Reference</td>
            <td style={{ width: '25%', padding: '8px', border: '1px solid #ddd' }}>{sheet?.po_no || sheet?.poNo || '-'}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Customer</td>
            <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{sheet?.client_name || sheet?.clientName || '-'}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Priority</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{sheet?.priority || '-'}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Booking Number</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{sheet?.booking_number || sheet?.bookingNumber || '-'}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Container No</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{sheet?.container_no || sheet?.containerNo || '-'}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Shipment Date</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatDate(sheet?.shipment_date || sheet?.shipmentDate)}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Overall Status</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{sheet?.status || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* Production Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ flex: 1, padding: '15px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f9f9f9', marginRight: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Total Required Boxes</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{reqBoxes.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, padding: '15px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#e8f5e9', marginRight: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#2e7d32', textTransform: 'uppercase' }}>Completed Boxes</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px', color: '#2e7d32' }}>{prodBoxes.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, padding: '15px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#ffebee' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#c62828', textTransform: 'uppercase' }}>Pending Boxes</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px', color: '#c62828' }}>{(reqBoxes - prodBoxes).toLocaleString()}</div>
        </div>
      </div>

      {/* Internal Notes */}
      {(sheet?.internal_notes || sheet?.internalNotes) && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', backgroundColor: '#fff9c4' }}>
          <strong style={{ display: 'block', marginBottom: '5px' }}>Internal Notes:</strong>
          <span style={{ whiteSpace: 'pre-wrap' }}>{sheet?.internal_notes || sheet?.internalNotes}</span>
        </div>
      )}

      {/* Product Lines Breakdown */}
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '10px' }}>PRODUCT LINES BREAKDOWN</h3>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead style={{ backgroundColor: '#f2f2f2' }}>
          <tr>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', width: '30%' }}>Product / Design</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '15%' }}>Size</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', width: '20%' }}>Assigned Factory</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', width: '10%' }}>Req. Boxes</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', width: '10%' }}>Completed</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '15%' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => {
            const productCategory = line.product_category || line.productCategory || 'Unknown Product';
            const design = line.design || '';
            const factoryName = line.factory_name || line.factoryName;
            const lineReqBoxes = parseFloat(line.total_production_boxes || line.totalProductionBoxes || 0);
            const lineCompleted = parseFloat(line.production_completed_boxes || line.productionCompletedBoxes || 0);
            const status = line.production_status || line.productionStatus || line.status;

            return (
              <tr key={line.id || idx}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  <strong>{design ? `${productCategory} - ${design}` : productCategory}</strong>
                  {line.surface && <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{line.surface}</div>}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{line.size || '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{factoryName || 'Unassigned'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>{lineReqBoxes.toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: lineCompleted > 0 ? '#2e7d32' : 'inherit' }}>{lineCompleted.toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{status || '-'}</td>
              </tr>
            );
          })}
          {lines.length === 0 && (
            <tr>
              <td colSpan="6" style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center', color: '#666' }}>No product lines found.</td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Footer */}
      <div style={{ marginTop: '50px', fontSize: '10px', color: '#777', textAlign: 'center', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
        Generated on {new Date().toLocaleString()} by System | Master Order Sheet Document
      </div>
    </div>
  );
});

OrderSheetPrintView.displayName = 'OrderSheetPrintView';

export default OrderSheetPrintView;
