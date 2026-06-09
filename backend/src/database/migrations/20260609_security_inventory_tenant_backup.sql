-- Security: force password change flag for default/weak accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Flag known default super-admin accounts for mandatory password reset
UPDATE users
SET must_change_password = TRUE
WHERE role = 'super_admin'
  AND email_id IN ('admin@admin.com', 'admin@example.com');

-- ── Inventory module (stock register, movements, reservations) ──────────────

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
  stock_register_id UUID REFERENCES stock_register(id) ON DELETE SET NULL,
  product_id UUID NOT NULL,
  warehouse_location VARCHAR(255) NOT NULL DEFAULT 'Main Warehouse',
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'PRODUCTION', 'DISPATCH')),
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
  stock_register_id UUID NOT NULL REFERENCES stock_register(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  reserved_boxes NUMERIC(15, 2) NOT NULL,
  reserved_sqm NUMERIC(15, 4) DEFAULT 0,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID,
  reference_no VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Released', 'Consumed')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_stock_register_company ON stock_register(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_register_product ON stock_register(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_company ON stock_reservations(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_active ON stock_reservations(company_id, status) WHERE status = 'Active';

-- Tenant backup audit trail
CREATE TABLE IF NOT EXISTS tenant_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT DEFAULT 0,
  backup_type VARCHAR(20) DEFAULT 'manual',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_backups_company ON tenant_backups(company_id);
