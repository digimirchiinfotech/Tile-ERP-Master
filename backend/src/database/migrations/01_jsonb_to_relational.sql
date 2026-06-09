-- Phase 1 - 2. JSONB to Relational Migration
-- This script creates the required relational tables to replace product_lines and container_details JSONB arrays.

CREATE TABLE IF NOT EXISTS export_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100),
    description TEXT,
    quantity NUMERIC(15, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    hsn_code VARCHAR(20),
    net_weight NUMERIC(15, 2),
    gross_weight NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS container_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
    container_number VARCHAR(50) NOT NULL,
    seal_number VARCHAR(50),
    container_type VARCHAR(20),
    tare_weight NUMERIC(10, 2),
    max_payload NUMERIC(10, 2),
    vgm_weight NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    container_allocation_id UUID NOT NULL REFERENCES container_allocations(id) ON DELETE CASCADE,
    export_invoice_item_id UUID NOT NULL REFERENCES export_invoice_items(id) ON DELETE CASCADE,
    boxes_packed INTEGER NOT NULL,
    pallets_used INTEGER,
    gross_weight NUMERIC(10, 2),
    net_weight NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qc_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    qc_record_id UUID NOT NULL REFERENCES qc_records(id) ON DELETE CASCADE,
    export_invoice_item_id UUID NOT NULL REFERENCES export_invoice_items(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    expected_value VARCHAR(100),
    actual_value VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('PASS', 'FAIL', 'PENDING')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply RLS to the new tables
ALTER TABLE export_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON export_invoice_items;
CREATE POLICY tenant_isolation_policy ON export_invoice_items USING (company_id = current_setting('app.current_company_id', true)::uuid);
ALTER TABLE export_invoice_items FORCE ROW LEVEL SECURITY;

ALTER TABLE container_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON container_allocations;
CREATE POLICY tenant_isolation_policy ON container_allocations USING (company_id = current_setting('app.current_company_id', true)::uuid);
ALTER TABLE container_allocations FORCE ROW LEVEL SECURITY;

ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON packing_items;
CREATE POLICY tenant_isolation_policy ON packing_items USING (company_id = current_setting('app.current_company_id', true)::uuid);
ALTER TABLE packing_items FORCE ROW LEVEL SECURITY;

ALTER TABLE qc_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON qc_items;
CREATE POLICY tenant_isolation_policy ON qc_items USING (company_id = current_setting('app.current_company_id', true)::uuid);
ALTER TABLE qc_items FORCE ROW LEVEL SECURITY;

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_export_invoice_items_invoice_id ON export_invoice_items(export_invoice_id);
CREATE INDEX IF NOT EXISTS idx_export_invoice_items_company_id ON export_invoice_items(company_id);
CREATE INDEX IF NOT EXISTS idx_container_allocations_invoice_id ON container_allocations(export_invoice_id);
CREATE INDEX IF NOT EXISTS idx_container_allocations_company_id ON container_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_allocation_id ON packing_items(container_allocation_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_company_id ON packing_items(company_id);
CREATE INDEX IF NOT EXISTS idx_qc_items_qc_id ON qc_items(qc_record_id);
CREATE INDEX IF NOT EXISTS idx_qc_items_company_id ON qc_items(company_id);
