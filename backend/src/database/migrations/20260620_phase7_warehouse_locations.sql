-- Phase 7: Warehouse Locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) DEFAULT 'Warehouse',
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, name)
);

-- Ensure a default "Main Warehouse" exists for companies with existing inventory
INSERT INTO warehouse_locations (company_id, name, type)
SELECT DISTINCT company_id, warehouse_location, 'Main'
FROM stock_register sr
WHERE NOT EXISTS (
  SELECT 1 FROM warehouse_locations wl WHERE wl.company_id = sr.company_id AND wl.name = sr.warehouse_location
);
