/**
 * Ensures inventory tables exist in tenant databases.
 */
const ensuredDbs = new WeakSet();

export const ensureInventorySchema = async (db) => {
  if (ensuredDbs.has(db)) return;

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
  `);
  
  ensuredDbs.add(db);
};

export default ensureInventorySchema;
