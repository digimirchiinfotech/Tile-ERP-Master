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

import debugLogger from './debugLogger.js';

/**
 * Ensures the specified columns, data types, and constraints exist on a tenant database.
 * Run exactly once on pool initialization.
 * 
 * @param {object} pool - The PG connection pool or client for the tenant
 * @param {string} companyId - Tenant UUID or label for log trace context
 */
export const syncTenantSchema = async (pool, companyId) => {
  const label = `[SchemaSync - Tenant ${companyId || 'global'}]`;
  try {
    debugLogger.info('Router', `${label} Starting dynamic schema synchronization...`);

    // Helper to check if a table exists in the public schema
    const checkTableExists = async (tableName) => {
      const { rows } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      return rows[0].exists;
    };

    // Helper to ensure columns exist in a table
    const ensureColumnsExist = async (tableName, columns) => {
      if (!(await checkTableExists(tableName))) {
        debugLogger.warning('Router', `${label} Table ${tableName} does not exist yet. Skipping column sync.`);
        return;
      }

      for (const col of columns) {
        const checkQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 
            AND column_name = $2
          );
        `;
        const { rows } = await pool.query(checkQuery, [tableName, col.name]);
        if (!rows[0].exists) {
          debugLogger.info('Router', `${label} Column ${col.name} missing in ${tableName}. Adding...`);
          await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        }
      }
    };

    // 1. IGST Invoices
    const igstColumns = [
      { name: 'delivery_terms', type: 'TEXT' },
      { name: 'payment_terms', type: 'TEXT' },
      { name: 'other_instructions', type: 'TEXT' },
      { name: 'supply_declaration', type: 'TEXT' },
      { name: 'ftp_incentive_declaration', type: 'TEXT' },
      { name: 'buyer_details', type: 'TEXT' },
      { name: 'consignee_details', type: 'TEXT' },
      { name: 'port_of_loading', type: 'TEXT' },
      { name: 'port_of_discharge', type: 'TEXT' },
      { name: 'vessel_flight_no', type: 'TEXT' },
      { name: 'pre_carriage_by', type: 'TEXT' },
      { name: 'place_of_receipt', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'final_destination', type: 'TEXT' }
    ];
    await ensureColumnsExist('igst_invoices', igstColumns);

    // 2. Proforma Invoices
    const piColumns = [
      { name: 'currency', type: "VARCHAR(50) DEFAULT 'USD ($)'" },
      { name: 'pre_carriage_by', type: 'VARCHAR(255)' },
      { name: 'place_of_receipt', type: 'VARCHAR(255)' },
      { name: 'bl_no', type: 'VARCHAR(100)' },
      { name: 'bl_date', type: 'DATE' },
      { name: 'vessel_flight_no', type: 'VARCHAR(100)' },
      { name: 'sb_no', type: 'VARCHAR(100)' },
      { name: 'sb_date', type: 'DATE' },
      { name: 'exchange_rate', type: 'NUMERIC(15, 6) DEFAULT 1.0' },
      { name: 'is_used', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_converted', type: 'BOOLEAN DEFAULT false' },
      { name: 'linked_document_id', type: 'UUID' },
      { name: 'document_status', type: 'VARCHAR(50) DEFAULT \'Draft\'' },
      { name: 'approval_status', type: 'VARCHAR(50) DEFAULT \'Pending\'' },
      { name: 'approved_by', type: 'UUID' },
      { name: 'approved_at', type: 'TIMESTAMP' },
      { name: 'approval_remarks', type: 'TEXT' },
      { name: 'lc_number', type: 'VARCHAR(255)' },
      { name: 'lc_date', type: 'DATE' },
      { name: 'epcg_no', type: 'VARCHAR(255)' },
      { name: 'original_invoice_no', type: 'VARCHAR(255)' },
      { name: 'revision_no', type: 'VARCHAR(255)' },
      { name: 'revision_count', type: 'INTEGER DEFAULT 0' },
      { name: 'revised_from_id', type: 'UUID' },
      { name: 'revision_reason', type: 'TEXT' },
      { name: 'deleted_at', type: 'TIMESTAMP' }
    ];
    await ensureColumnsExist('proforma_invoices', piColumns);

    const pilColumns = [
      { name: 'description', type: 'TEXT' },
      { name: 'product_type', type: "VARCHAR(50) DEFAULT 'tile'" },
      { name: 'sanitaryware_product_id', type: 'UUID' },
      { name: 'model_no', type: 'VARCHAR(255)' },
      { name: 'category', type: 'VARCHAR(255)' },
      { name: 'color', type: 'VARCHAR(255)' },
      { name: 'pieces', type: 'INTEGER DEFAULT 0' },
      { name: 'cartons', type: 'INTEGER DEFAULT 0' },
      { name: 'cbm', type: 'NUMERIC(15, 4) DEFAULT 0' },
      { name: 'is_foc', type: 'BOOLEAN DEFAULT false' }
    ];
    await ensureColumnsExist('proforma_invoice_lines', pilColumns);

    if (await checkTableExists('proforma_invoices')) {
      await pool.query(`
        ALTER TABLE proforma_invoices 
          ALTER COLUMN pallet_type TYPE TEXT,
          ALTER COLUMN tiles_back TYPE TEXT,
          ALTER COLUMN port_of_discharge TYPE TEXT,
          ALTER COLUMN final_destination TYPE TEXT;
      `);

      await pool.query(`
        ALTER TABLE proforma_invoices 
          DROP CONSTRAINT IF EXISTS proforma_invoices_created_by_fkey,
          DROP CONSTRAINT IF EXISTS proforma_invoices_updated_by_fkey;
      `);
    }

    // 3. Proforma Orders
    const poColumns = [
      { name: 'pallet_type', type: 'TEXT' },
      { name: 'tiles_back', type: 'TEXT' },
      { name: 'boxes_marking', type: 'TEXT' },
      { name: 'box_type', type: 'TEXT' },
      { name: 'gst_rate', type: 'NUMERIC(5, 2) DEFAULT 0' },
      { name: 'gst_amount', type: 'NUMERIC(15, 2) DEFAULT 0' },
      { name: 'currency', type: 'VARCHAR(50) DEFAULT \'INR (₹)\'' },
      { name: 'lc_number', type: 'VARCHAR(255)' },
      { name: 'lc_date', type: 'DATE' },
      { name: 'epcg_no', type: 'VARCHAR(255)' },
      { name: 'original_order_no', type: 'VARCHAR(255)' },
      { name: 'revision_no', type: 'VARCHAR(255)' },
      { name: 'revision_count', type: 'INTEGER DEFAULT 0' },
      { name: 'revised_from_id', type: 'UUID' },
      { name: 'revision_reason', type: 'TEXT' },
      { name: 'deleted_at', type: 'TIMESTAMP' }
    ];
    await ensureColumnsExist('proforma_orders', poColumns);

    const polColumns = [
      { name: 'product_type', type: "VARCHAR(50) DEFAULT 'tile'" },
      { name: 'sanitaryware_product_id', type: 'UUID' },
      { name: 'model_no', type: 'VARCHAR(255)' },
      { name: 'category', type: 'VARCHAR(255)' },
      { name: 'color', type: 'VARCHAR(255)' },
      { name: 'pieces', type: 'INTEGER DEFAULT 0' },
      { name: 'cartons', type: 'INTEGER DEFAULT 0' },
      { name: 'cbm', type: 'NUMERIC(15, 4) DEFAULT 0' },
      { name: 'is_foc', type: 'BOOLEAN DEFAULT false' }
    ];
    await ensureColumnsExist('proforma_order_lines', polColumns);

    if (await checkTableExists('proforma_orders')) {
      await pool.query(`
        ALTER TABLE proforma_orders 
          ALTER COLUMN pallet_type TYPE TEXT,
          ALTER COLUMN tiles_back TYPE TEXT,
          ALTER COLUMN boxes_marking TYPE TEXT,
          ALTER COLUMN box_type TYPE TEXT;
      `);
    }

    // 4. Export Invoices
    const eiColumns = [
      { name: 'pallet_type', type: 'TEXT' },
      { name: 'tiles_back', type: 'TEXT' },
      { name: 'boxes_marking', type: 'TEXT' },
      { name: 'box_type', type: 'TEXT' },
      { name: 'currency', type: 'VARCHAR(50) DEFAULT \'USD\'' },
      { name: 'exchange_rate', type: 'NUMERIC(15, 6) DEFAULT 1.0' },
      { name: 'is_locked', type: 'BOOLEAN DEFAULT false' },
      { name: 'lut_date', type: 'DATE' },
      { name: 'country_of_origin', type: 'VARCHAR(100) DEFAULT \'INDIA\'' },
      { name: 'supply_declaration', type: 'TEXT' },
      { name: 'ftp_incentive_declaration', type: 'TEXT' },
      { name: 'is_used', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_converted', type: 'BOOLEAN DEFAULT false' },
      { name: 'linked_document_id', type: 'UUID' },
      { name: 'document_status', type: 'VARCHAR(50) DEFAULT \'Draft\'' },
      { name: 'lc_number', type: 'VARCHAR(255)' },
      { name: 'lc_date', type: 'DATE' },
      { name: 'epcg_no', type: 'VARCHAR(255)' },
      { name: 'locked_at', type: 'TIMESTAMP' },
      { name: 'locked_by', type: 'UUID' },
      { name: 'snapshot_data', type: 'JSONB' },
      { name: 'final_pdf_path', type: 'VARCHAR(255)' },
      { name: 'final_excel_path', type: 'VARCHAR(255)' },
      { name: 'finalized_hash', type: 'VARCHAR(255)' },
      { name: 'lock_version', type: 'INTEGER DEFAULT 0' },
      { name: 'finalized_at', type: 'TIMESTAMP' },
      { name: 'unlocked_at', type: 'TIMESTAMP' },
      { name: 'unlocked_by', type: 'UUID' },
      { name: 'unlock_reason', type: 'TEXT' }
    ];
    await ensureColumnsExist('export_invoices', eiColumns);

    const eilColumns = [
      { name: 'product_type', type: "VARCHAR(50) DEFAULT 'tile'" },
      { name: 'sanitaryware_product_id', type: 'UUID' },
      { name: 'model_no', type: 'VARCHAR(255)' },
      { name: 'category', type: 'VARCHAR(255)' },
      { name: 'color', type: 'VARCHAR(255)' },
      { name: 'pieces', type: 'INTEGER DEFAULT 0' },
      { name: 'cartons', type: 'INTEGER DEFAULT 0' },
      { name: 'cbm', type: 'NUMERIC(15, 4) DEFAULT 0' },
      { name: 'is_foc', type: 'BOOLEAN DEFAULT false' }
    ];
    await ensureColumnsExist('export_invoice_lines', eilColumns);

    if (await checkTableExists('export_invoices')) {
      await pool.query(`
        ALTER TABLE export_invoices 
          ALTER COLUMN pallet_type TYPE TEXT,
          ALTER COLUMN tiles_back TYPE TEXT,
          ALTER COLUMN boxes_marking TYPE TEXT,
          ALTER COLUMN box_type TYPE TEXT;
      `);
    }

    debugLogger.info('Router', `${label} ✅ Dynamic schema synchronization complete.`);
  } catch (err) {
    debugLogger.error('Router', `${label} ❌ Error during dynamic schema synchronization: ${err.message}`, err);
  }
};
