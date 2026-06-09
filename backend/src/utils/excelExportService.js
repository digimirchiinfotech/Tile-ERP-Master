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

import ExcelJS from 'exceljs';
import { debugLogger } from './debugLogger.js';

export const generateFactoryAssignmentSheet = async (orderSheets) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tile ERP System';
    
    const sheet = workbook.addWorksheet('Factory Assignment');

    // Add headers
    sheet.columns = [
      { header: 'Factory Name', key: 'factory', width: 25 },
      { header: 'Production Sheet No', key: 'ps_no', width: 20 },
      { header: 'Design', key: 'design', width: 30 },
      { header: 'Size', key: 'size', width: 15 },
      { header: 'Required SQM', key: 'required_sqm', width: 15 },
      { header: 'Produced SQM', key: 'produced_sqm', width: 15 },
      { header: 'Pending SQM', key: 'pending_sqm', width: 15 },
      { header: 'Shipment Date', key: 'shipment_date', width: 15 },
      { header: 'Priority', key: 'priority', width: 15 },
    ];

    // Style the header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600

    // Add data rows
    orderSheets.forEach(os => {
      // If there are multiple factories, we map each out. If no factories, just list it as Unassigned.
      const factories = (os.factories && os.factories.length > 0 && os.factories[0] !== null) 
        ? os.factories 
        : [{ factory_name: 'Unassigned', allocated_sqm: os.required_sqm }];

      factories.forEach(f => {
        sheet.addRow({
          factory: f.factory_name || 'Unknown Factory',
          ps_no: os.production_sheet_no,
          design: os.design || '-',
          size: os.size || '-',
          required_sqm: f.allocated_sqm || os.required_sqm || 0,
          produced_sqm: os.produced_sqm || 0, // This is total, might need logic to track per factory later
          pending_sqm: Math.max(0, (f.allocated_sqm || os.required_sqm || 0) - (os.produced_sqm || 0)),
          shipment_date: os.shipment_date ? new Date(os.shipment_date).toLocaleDateString() : '-',
          priority: os.priority || 'Medium'
        });
      });
    });

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    debugLogger.error('Error generating Factory Assignment Sheet:', error);
    throw error;
  }
};

export const generateMasterOrderSheetExcel = async (orderSheets) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tile ERP System';
    
    // SHEET 1: Master Order Summary
    const sheet1 = workbook.addWorksheet('Master Order Summary');
    sheet1.columns = [
      { header: 'Production Sheet', key: 'ps_no', width: 20 },
      { header: 'PO Reference', key: 'po_no', width: 25 },
      { header: 'Customer', key: 'customer', width: 30 },
      { header: 'Assigned Factory', key: 'factory', width: 25 },
      { header: 'Total Boxes', key: 'total_boxes', width: 15 },
      { header: 'Production Complete', key: 'prod_complete', width: 20 },
      { header: 'Production Pending', key: 'prod_pending', width: 20 },
      { header: 'Overall Status', key: 'status', width: 15 },
    ];
    
    sheet1.getRow(1).font = { bold: true };
    sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    sheet1.views = [{ state: 'frozen', ySplit: 1 }];

    // SHEET 2: Product Line Breakdown
    const sheet2 = workbook.addWorksheet('Product Line Breakdown');
    sheet2.columns = [
      { header: 'Production Sheet', key: 'ps_no', width: 20 },
      { header: 'Assigned Factory', key: 'factory', width: 25 },
      { header: 'Product Design', key: 'design', width: 30 },
      { header: 'Size', key: 'size', width: 15 },
      { header: 'Surface', key: 'surface', width: 15 },
      { header: 'Required Boxes', key: 'req_boxes', width: 15 },
      { header: 'Completed Boxes', key: 'comp_boxes', width: 15 },
      { header: 'Pending Boxes', key: 'pend_boxes', width: 15 },
      { header: 'Production Status', key: 'prod_status', width: 20 },
      { header: 'QC Status', key: 'qc_status', width: 15 },
    ];

    sheet2.getRow(1).font = { bold: true };
    sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    sheet2.views = [{ state: 'frozen', ySplit: 1 }];

    let totalRequired = 0;
    let totalAllocated = 0;
    let totalProduced = 0;
    let totalQcApproved = 0;
    let totalPacked = 0;
    let totalLoaded = 0;
    let totalPending = 0;

    orderSheets.forEach(os => {
      const lines = os.lines || [];
      
      // Calculate factories for sheet 1
      const factoriesSet = new Set();
      lines.forEach(l => {
        if (l.factory_name) factoriesSet.add(l.factory_name);
      });
      const assignedFactories = Array.from(factoriesSet).join(', ') || 'Unassigned';

      // Sheet 1 data
      let osRequiredBoxes = 0;
      let osProducedBoxes = 0;
      let osPendingBoxes = 0;

      lines.forEach(l => {
        const rBoxes = parseFloat(l.total_production_boxes || l.totalProductionBoxes || 0);
        const cBoxes = parseFloat(l.production_completed_boxes || l.productionCompletedBoxes || 0);
        const pBoxes = Math.max(0, rBoxes - cBoxes);

        osRequiredBoxes += rBoxes;
        osProducedBoxes += cBoxes;
        osPendingBoxes += pBoxes;

        // Totals for Sheet 3
        totalRequired += rBoxes;
        totalProduced += cBoxes;
        totalPending += pBoxes;
        totalAllocated += parseFloat(l.factory_allocated_boxes || 0);
        totalQcApproved += parseFloat(l.qc_approved_boxes || 0);
        totalPacked += parseFloat(l.packed_boxes || 0);
        totalLoaded += parseFloat(l.loaded_boxes || 0);

        // Add row to Sheet 2
        sheet2.addRow({
          ps_no: os.production_sheet_no,
          factory: l.factory_name || 'Unassigned',
          design: l.design ? `${l.product_category} - ${l.design}` : (l.product_category || 'Unknown'),
          size: l.size || '-',
          surface: l.surface || l.finish || '-',
          req_boxes: rBoxes,
          comp_boxes: cBoxes,
          pend_boxes: pBoxes,
          prod_status: l.production_status || l.status || 'Pending',
          qc_status: l.qc_status || 'Pending'
        });
      });

      // Add row to Sheet 1
      sheet1.addRow({
        ps_no: os.production_sheet_no,
        po_no: os.po_no,
        customer: os.client_name,
        factory: assignedFactories,
        total_boxes: osRequiredBoxes,
        prod_complete: osProducedBoxes,
        prod_pending: osPendingBoxes,
        status: os.status || 'Pending'
      });
    });

    // Center alignment for numeric columns in Sheet 1
    ['E', 'F', 'G'].forEach(col => {
      sheet1.getColumn(col).alignment = { horizontal: 'center' };
    });

    // Center alignment for numeric columns in Sheet 2
    ['F', 'G', 'H'].forEach(col => {
      sheet2.getColumn(col).alignment = { horizontal: 'center' };
    });

    // SHEET 3: Production Summary
    const sheet3 = workbook.addWorksheet('Production Summary');
    sheet3.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    
    sheet3.getRow(1).font = { bold: true };
    sheet3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    
    sheet3.addRow({ metric: 'Required Boxes', value: totalRequired });
    sheet3.addRow({ metric: 'Allocated Boxes', value: totalAllocated });
    sheet3.addRow({ metric: 'Produced Boxes', value: totalProduced });
    sheet3.addRow({ metric: 'QC Approved Boxes', value: totalQcApproved });
    sheet3.addRow({ metric: 'Packed Boxes', value: totalPacked });
    sheet3.addRow({ metric: 'Loaded Boxes', value: totalLoaded });
    sheet3.addRow({ metric: 'Pending Production', value: totalPending });

    sheet3.getColumn('B').alignment = { horizontal: 'center' };

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    debugLogger.error('Error generating Master Order Sheet Excel:', error);
    throw error;
  }
};
