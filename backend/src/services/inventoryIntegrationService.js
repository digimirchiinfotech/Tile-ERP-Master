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

import { debugLogger } from '../utils/debugLogger.js';

const CONTEXT = 'InventoryIntegration';

/**
 * Hook to automatically deduct inventory when an Export Invoice is marked as Shipped/Dispatched
 * 
 * @param {Object} invoice The export invoice record
 * @param {Array} lines The export invoice lines
 * @param {Object} req The request object containing db and user context
 */
export const syncInventoryFromInvoice = async (invoice, lines, req) => {
  const client = await req.db.getClient();
  try {
    await client.query('BEGIN');

    // Check if we already deducted inventory for this invoice to prevent double-deduction
    const checkResult = await client.query(
      `SELECT id FROM stock_movements WHERE reference_type = 'ExportInvoice' AND reference_id = $1 LIMIT 1`,
      [invoice.id]
    );

    if (checkResult.rows.length > 0) {
      debugLogger.info(CONTEXT, 'Inventory already deducted for this invoice. Skipping.', { invoiceNo: invoice.invoice_no });
      await client.query('ROLLBACK');
      client.release();
      return;
    }

    let itemsProcessed = 0;

    for (const line of lines) {
      if (!line.product_id) continue;

      const quantityBoxes = parseFloat(line.quantity) || 0;
      const quantitySqm = parseFloat(line.sqm) || 0;

      if (quantityBoxes <= 0) continue;

      let warehouseLoc = 'Main Warehouse';

      // 1. Find warehouse with highest stock for this product
      const stockCheck = await client.query(
        `SELECT warehouse_location FROM stock_register 
         WHERE product_id = $1 AND company_id = $2 
         ORDER BY quantity_boxes DESC LIMIT 1`,
        [line.product_id, invoice.company_id]
      );

      if (stockCheck.rows.length > 0) {
        warehouseLoc = stockCheck.rows[0].warehouse_location;
      } else {
        // 2. Fallback to first active warehouse if product not in stock yet
        const whCheck = await client.query(
          `SELECT name FROM warehouse_locations WHERE company_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1`,
          [invoice.company_id]
        );
        if (whCheck.rows.length > 0) {
          warehouseLoc = whCheck.rows[0].name;
        }
      }

      // Ensure a stock register entry exists for this dynamic warehouse
      const registerCheck = await client.query(
        `SELECT id FROM stock_register WHERE product_id = $1 AND company_id = $2 AND warehouse_location = $3`,
        [line.product_id, invoice.company_id, warehouseLoc]
      );

      if (registerCheck.rows.length === 0) {
        // Create an empty register entry so we can deduct it (will go negative)
        await client.query(
          `INSERT INTO stock_register (company_id, product_id, warehouse_location, quantity_boxes, quantity_sqm, updated_at)
           VALUES ($1, $2, $3, 0, 0, CURRENT_TIMESTAMP)`,
          [invoice.company_id, line.product_id, warehouseLoc]
        );
      }

      // Decrement the stock register
      await client.query(
        `UPDATE stock_register 
         SET quantity_boxes = quantity_boxes - $1,
             quantity_sqm = quantity_sqm - $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $3 AND company_id = $4 AND warehouse_location = $5`,
        [quantityBoxes, quantitySqm, line.product_id, invoice.company_id, warehouseLoc]
      );

      // Record the movement
      await client.query(
        `INSERT INTO stock_movements 
         (company_id, product_id, warehouse_location, movement_type, quantity_boxes, quantity_sqm, reference_type, reference_id, created_by, created_at)
         VALUES ($1, $2, $3, 'Dispatched', $4, $5, 'ExportInvoice', $6, $7, CURRENT_TIMESTAMP)`,
        [
          invoice.company_id, 
          line.product_id, 
          warehouseLoc,
          quantityBoxes, 
          quantitySqm, 
          invoice.id, 
          req.user?.id || null
        ]
      );

      itemsProcessed++;
    }

    await client.query('COMMIT');
    debugLogger.info(CONTEXT, `Successfully synced inventory for Export Invoice ${invoice.invoice_no}`, { itemsProcessed });
  } catch (error) {
    await client.query('ROLLBACK');
    debugLogger.error(CONTEXT, `Failed to sync inventory for Export Invoice ${invoice.invoice_no}`, error);
    // Non-blocking error, we don't throw to prevent crashing the invoice update workflow
  } finally {
    client.release();
  }
};
