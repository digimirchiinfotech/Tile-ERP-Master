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
  total_boxes NUMERIC(12,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grn_documents_company ON grn_documents(company_id);
