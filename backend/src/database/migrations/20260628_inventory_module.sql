-- Stock locations (warehouse → zone → rack)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  warehouse_name VARCHAR(200) NOT NULL,
  warehouse_code VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock transaction ledger (every stock movement)
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  product_id UUID NOT NULL,
  warehouse_id UUID,
  transaction_type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_number VARCHAR(100),
  boxes_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  sqm_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,4),
  lot_number VARCHAR(100),
  batch_number VARCHAR(100),
  shade_number VARCHAR(50),
  notes TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current stock balance view (calculated from transactions)
CREATE OR REPLACE VIEW stock_balances AS
SELECT
  company_id,
  product_id,
  warehouse_id,
  SUM(CASE WHEN transaction_type IN ('GRN','PRODUCTION_IN','TRANSFER_IN','ADJUSTMENT_IN','RETURN_IN')
      THEN boxes_quantity ELSE -boxes_quantity END) AS boxes_available,
  SUM(CASE WHEN transaction_type IN ('GRN','PRODUCTION_IN','TRANSFER_IN','ADJUSTMENT_IN','RETURN_IN')
      THEN sqm_quantity ELSE -sqm_quantity END) AS sqm_available
FROM stock_transactions
GROUP BY company_id, product_id, warehouse_id;

-- Indexes for fast stock queries
CREATE INDEX IF NOT EXISTS idx_stock_txn_company_product
  ON stock_transactions(company_id, product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_company_date
  ON stock_transactions(company_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_warehouses_company
  ON warehouses(company_id) WHERE is_active = TRUE;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS reorder_point_boxes NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_warehouse_id UUID;
