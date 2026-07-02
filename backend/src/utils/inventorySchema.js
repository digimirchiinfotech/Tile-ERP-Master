/**
 * Ensures inventory tables exist in tenant databases.
 */
// Cache by company ID string — WeakSet won't work since req.db is a new object per request
const ensuredCompanies = new Set();

export const ensureInventorySchema = async (db) => {
  let companyId = 'master';
  try {
    const res = await db.query("SHOW app.current_company_id");
    companyId = res.rows[0].current_setting || 'master';
  } catch (e) {
    // If not set or isolated DB without RLS, we still need a cache key.
    // Try to extract it from db config if available, otherwise just use 'unknown'
    companyId = 'unknown';
  }

  if (ensuredCompanies.has(companyId)) return;

  await db.query(`
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

    CREATE INDEX IF NOT EXISTS idx_stock_register_company ON stock_register(company_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
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

  // Migrate warehouse_locations: handle location → name rename for older tenants
  await db.query(`
    DO $$
    BEGIN
      -- Rename 'location' to 'name' if needed
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'location'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'name'
      ) THEN
        ALTER TABLE warehouse_locations RENAME COLUMN location TO name;
      END IF;

      -- Add 'name' column if missing entirely
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'name')
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'location')
      THEN
        ALTER TABLE warehouse_locations ADD COLUMN name VARCHAR(255);
      END IF;

      -- Drop old unique constraint on 'location'
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_locations_location_key') THEN
        ALTER TABLE warehouse_locations DROP CONSTRAINT warehouse_locations_location_key;
      END IF;

      -- Add missing columns
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'code') THEN
        ALTER TABLE warehouse_locations ADD COLUMN code VARCHAR(100);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'type') THEN
        ALTER TABLE warehouse_locations ADD COLUMN type VARCHAR(50) DEFAULT 'Warehouse';
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

      -- Set name NOT NULL
      UPDATE warehouse_locations SET name = COALESCE(name, 'Main Warehouse') WHERE name IS NULL;
      ALTER TABLE warehouse_locations ALTER COLUMN name SET NOT NULL;

      -- Add unique constraint
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_locations_company_id_name_key') THEN
        ALTER TABLE warehouse_locations ADD CONSTRAINT warehouse_locations_company_id_name_key UNIQUE (company_id, name);
      END IF;
    END
    $$;
  `);

  ensuredCompanies.add(companyId);
};

export default ensureInventorySchema;
