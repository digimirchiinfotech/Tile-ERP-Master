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

    // 5. Inventory tables (warehouse_locations, stock_register, etc.)
    // Create all inventory tables if they don't exist — they are tenant-isolated
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        name VARCHAR(255),
        code VARCHAR(100),
        type VARCHAR(50) DEFAULT 'Warehouse',
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'Active',
        deleted_at TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_warehouse_locations_company ON warehouse_locations(company_id);
    `);

    // Migrate warehouse_locations: rename 'location' column to 'name' if it exists
    // and add any missing columns added in phase-7 migration
    await pool.query(`
      DO $$
      BEGIN
        -- Rename old 'location' column to 'name' if it hasn't been renamed yet
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'warehouse_locations' AND column_name = 'location'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'warehouse_locations' AND column_name = 'name'
        ) THEN
          ALTER TABLE warehouse_locations RENAME COLUMN location TO name;
        END IF;

        -- Add 'name' column if both 'location' and 'name' are missing
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'warehouse_locations' AND column_name = 'name'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'warehouse_locations' AND column_name = 'location'
        ) THEN
          ALTER TABLE warehouse_locations ADD COLUMN name VARCHAR(255);
        END IF;

        -- Drop the old unique constraint on 'location' if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_locations_location_key'
        ) THEN
          ALTER TABLE warehouse_locations DROP CONSTRAINT warehouse_locations_location_key;
        END IF;

        -- Add missing columns from phase-7 migration
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'code') THEN
          ALTER TABLE warehouse_locations ADD COLUMN code VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'type') THEN
          ALTER TABLE warehouse_locations ADD COLUMN type VARCHAR(50) DEFAULT 'Warehouse';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'address') THEN
          ALTER TABLE warehouse_locations ADD COLUMN address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'is_active') THEN
          ALTER TABLE warehouse_locations ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'status') THEN
          ALTER TABLE warehouse_locations ADD COLUMN status VARCHAR(20) DEFAULT 'Active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'deleted_at') THEN
          ALTER TABLE warehouse_locations ADD COLUMN deleted_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'updated_at') THEN
          ALTER TABLE warehouse_locations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;

        -- Set NOT NULL on name now that it exists and is populated
        UPDATE warehouse_locations SET name = COALESCE(name, 'Main Warehouse') WHERE name IS NULL;
        ALTER TABLE warehouse_locations ALTER COLUMN name SET NOT NULL;

        -- Add unique constraint on (company_id, name) if not already present
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_locations_company_id_name_key'
        ) THEN
          ALTER TABLE warehouse_locations ADD CONSTRAINT warehouse_locations_company_id_name_key UNIQUE (company_id, name);
        END IF;
      END
      $$;

      CREATE TABLE IF NOT EXISTS stock_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        product_id UUID NOT NULL,
        warehouse_location VARCHAR(255) NOT NULL DEFAULT 'Main Warehouse',
        quantity_boxes NUMERIC(15, 2) NOT NULL DEFAULT 0,
        quantity_sqm NUMERIC(15, 4) NOT NULL DEFAULT 0,
        reserved_boxes NUMERIC(15, 2) NOT NULL DEFAULT 0,
        last_movement_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, product_id, warehouse_location)
      );
      CREATE INDEX IF NOT EXISTS idx_stock_register_company ON stock_register(company_id);

      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        stock_register_id UUID,
        product_id UUID NOT NULL,
        warehouse_location VARCHAR(255) NOT NULL DEFAULT 'Main Warehouse',
        movement_type VARCHAR(20) NOT NULL,
        quantity_boxes NUMERIC(15, 2) NOT NULL,
        quantity_sqm NUMERIC(15, 4) DEFAULT 0,
        reference_type VARCHAR(50),
        reference_id UUID,
        reference_no VARCHAR(100),
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);

      CREATE TABLE IF NOT EXISTS stock_reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        stock_register_id UUID NOT NULL,
        product_id UUID NOT NULL,
        reserved_boxes NUMERIC(15, 2) NOT NULL,
        reserved_sqm NUMERIC(15, 4) DEFAULT 0,
        reference_type VARCHAR(50) NOT NULL,
        reference_id UUID,
        reference_no VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        released_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_stock_reservations_company ON stock_reservations(company_id);

      CREATE TABLE IF NOT EXISTS grn_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        grn_number VARCHAR(100) NOT NULL,
        grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
        supplier_name VARCHAR(200),
        vehicle_number VARCHAR(100),
        inspector_name VARCHAR(100),
        weighbridge_ticket VARCHAR(100),
        notes TEXT,
        total_boxes NUMERIC(15, 2) DEFAULT 0,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_grn_documents_company ON grn_documents(company_id);
    `);

    debugLogger.info('Router', `${label} ✅ Dynamic schema synchronization complete.`);
  } catch (err) {
    debugLogger.error('Router', `${label} ❌ Error during dynamic schema synchronization: ${err.message}`, err);
  }
};
