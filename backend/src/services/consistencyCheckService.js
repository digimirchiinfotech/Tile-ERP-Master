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

/**
 * Consistency Check Service
 * Validates data integrity across document chains
 * @param {object} db - Abstract database router
 * @param {number} companyId - Filter by company (optional)
 */
export async function runConsistencyCheck(companyId, db) {
  const issues = [];
  const stats = {
    proformaInvoicesChecked: 0,
    packingListsChecked: 0,
    qcRecordsChecked: 0,
    exportInvoicesChecked: 0,
    annexuresChecked: 0,
    vgmDocumentsChecked: 0,
    shippingInstructionsChecked: 0,
    lockDesyncChecked: 0
  };

  const companyParams = companyId ? [companyId] : [];

  // 1. Check Proforma Invoice totals
  const invoiceCompanyFilter = companyId ? ' AND company_id = $1' : '';
  const invoicesResult = await db.query(
    `SELECT id, product_lines, total_amount FROM proforma_invoices WHERE status != 'Deleted'${invoiceCompanyFilter}`,
    companyParams
  );
  stats.proformaInvoicesChecked = invoicesResult.rowCount;

  for (const invoice of invoicesResult.rows) {
    try {
      let productLines = invoice.product_lines;
      if (typeof productLines === 'string') productLines = JSON.parse(productLines);
      if (Array.isArray(productLines) && productLines.length > 0) {
        const calculatedTotal = productLines.reduce((sum, line) => {
          const amount = parseFloat(line.amount || line.total || line.line_total || 0);
          return sum + amount;
        }, 0);
        const storedTotal = parseFloat(invoice.total_amount || 0);
        if (Math.abs(calculatedTotal - storedTotal) > 0.01) {
          issues.push({ severity: 'warning', type: 'totals_mismatch', table: 'proforma_invoices', recordId: invoice.id, description: `Total mismatch: stored ${storedTotal.toFixed(2)} vs calculated ${calculatedTotal.toFixed(2)}` });
        }
      }
    } catch (e) { /* skip */ }
  }

  // 2. Check for orphan Packing Lists
  const plFilter = companyId ? ' AND pl.company_id = $1' : '';
  const orphanPLResult = await db.query(
    `SELECT pl.id, pl.export_invoice_id FROM packing_lists pl LEFT JOIN export_invoices ei ON pl.export_invoice_id = ei.id WHERE ei.id IS NULL AND pl.deleted_at IS NULL AND pl.export_invoice_id IS NOT NULL${plFilter}`,
    companyParams
  );
  stats.packingListsChecked = orphanPLResult.rowCount;
  for (const row of orphanPLResult.rows) {
    issues.push({ severity: 'error', type: 'orphan_record', table: 'packing_lists', recordId: row.id, description: `Packing list references non-existent export invoice ID ${row.export_invoice_id}` });
  }

  // 3. Check for orphan QC records
  const qcFilter = companyId ? ' AND qr.company_id = $1' : '';
  const orphanQCResult = await db.query(
    `SELECT qr.id, qr.order_id FROM qc_records qr LEFT JOIN proforma_orders po ON qr.order_id = po.id WHERE po.id IS NULL AND qr.order_id IS NOT NULL${qcFilter}`,
    companyParams
  );
  stats.qcRecordsChecked = orphanQCResult.rowCount;
  for (const row of orphanQCResult.rows) {
    issues.push({ severity: 'error', type: 'orphan_record', table: 'qc_records', recordId: row.id, description: `QC record references non-existent proforma order ID ${row.order_id}` });
  }

  // 4. Check for broken links to Proforma Invoices
  const eiFilter = companyId ? ' AND ei.company_id = $1' : '';
  const orphanEIResult = await db.query(
    `SELECT ei.id, ei.proforma_invoice_id FROM export_invoices ei LEFT JOIN proforma_invoices pi ON ei.proforma_invoice_id = pi.id WHERE pi.id IS NULL AND ei.proforma_invoice_id IS NOT NULL${eiFilter}`,
    companyParams
  );
  stats.exportInvoicesChecked = orphanEIResult.rowCount;
  for (const row of orphanEIResult.rows) {
    issues.push({ severity: 'error', type: 'missing_reference', table: 'export_invoices', recordId: row.id, description: `Export invoice references non-existent proforma invoice ID ${row.proforma_invoice_id}` });
  }

  // 5. Check for orphan Export Invoice Annexures
  const annexFilter = companyId ? ' AND a.company_id = $1' : '';
  const orphanAnnexResult = await db.query(
    `SELECT a.id, a.export_invoice_id FROM export_invoice_annexures a LEFT JOIN export_invoices ei ON a.export_invoice_id = ei.id WHERE ei.id IS NULL AND a.export_invoice_id IS NOT NULL${annexFilter}`,
    companyParams
  );
  stats.annexuresChecked = orphanAnnexResult.rowCount;
  for (const row of orphanAnnexResult.rows) {
    issues.push({ severity: 'error', type: 'orphan_record', table: 'export_invoice_annexures', recordId: row.id, description: `Annexure references non-existent export invoice ID ${row.export_invoice_id}` });
  }

  // 6. Check for orphan VGM Documents
  const vgmFilter = companyId ? ' AND v.company_id = $1' : '';
  const orphanVGMResult = await db.query(
    `SELECT v.id, v.export_invoice_id FROM vgm_documents v LEFT JOIN export_invoices ei ON v.export_invoice_id = ei.id WHERE ei.id IS NULL AND v.export_invoice_id IS NOT NULL${vgmFilter}`,
    companyParams
  );
  stats.vgmDocumentsChecked = orphanVGMResult.rowCount;
  for (const row of orphanVGMResult.rows) {
    issues.push({ severity: 'error', type: 'orphan_record', table: 'vgm_documents', recordId: row.id, description: `VGM document references non-existent export invoice ID ${row.export_invoice_id}` });
  }

  // 7. Check for orphan Shipping Instructions
  const siFilter = companyId ? ' AND si.company_id = $1' : '';
  const orphanSIResult = await db.query(
    `SELECT si.id, si.export_invoice_id FROM shipping_instructions si LEFT JOIN export_invoices ei ON si.export_invoice_id = ei.id WHERE ei.id IS NULL AND si.export_invoice_id IS NOT NULL${siFilter}`,
    companyParams
  );
  stats.shippingInstructionsChecked = orphanSIResult.rowCount;
  for (const row of orphanSIResult.rows) {
    issues.push({ severity: 'error', type: 'orphan_record', table: 'shipping_instructions', recordId: row.id, description: `Shipping instruction references non-existent export invoice ID ${row.export_invoice_id}` });
  }

  // 8. Check for Export Invoices marked converted but missing proforma links
  const missingLinkFilter = companyId ? ' AND ei.company_id = $1' : '';
  const missingLinkResult = await db.query(
    `SELECT ei.id, ei.invoice_no FROM export_invoices ei 
     LEFT JOIN export_invoice_proforma_links lnk ON ei.id = lnk.export_invoice_id
     WHERE ei.is_converted = TRUE AND lnk.export_invoice_id IS NULL${missingLinkFilter}`,
    companyParams
  );
  for (const row of missingLinkResult.rows) {
    issues.push({ severity: 'warning', type: 'data_integrity', table: 'export_invoices', recordId: row.id, description: `Export invoice ${row.invoice_no} is marked is_converted=TRUE but has no entries in export_invoice_proforma_links` });
  }

  // 9. Check for lock/status desync — documents that are locked but have non-Locked status
  for (const table of ['proforma_invoices', 'export_invoices']) {
    const lockSyncFilter = companyId ? ` AND company_id = $1` : '';
    try {
      const lockDesyncResult = await db.query(
        `SELECT id FROM ${table} WHERE is_locked = TRUE AND status != 'Locked'${lockSyncFilter}`,
        companyParams
      );
      stats.lockDesyncChecked += lockDesyncResult.rowCount;
      for (const row of lockDesyncResult.rows) {
        issues.push({ severity: 'warning', type: 'lock_status_desync', table, recordId: row.id, description: `Document is_locked=TRUE but status is not 'Locked'. Possible lock/status desync.` });
      }
    } catch (e) { /* Skip if table/column doesn't exist */ }
  }

  return { issues, stats };
}
