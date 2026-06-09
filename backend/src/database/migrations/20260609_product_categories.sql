-- Product Categories master data (tile product specification)
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS product_categories_company_id_idx ON product_categories(company_id);

-- Tile category on order sheet lines (propagated from PO/PI product lines)
ALTER TABLE master_order_sheet_lines ADD COLUMN IF NOT EXISTS tile_category VARCHAR(100);
