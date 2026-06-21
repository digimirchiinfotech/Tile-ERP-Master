-- Phase 7: Warehouse Locations

-- 1. Create table with modern schema if not exists
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) DEFAULT 'Warehouse',
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'Active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(company_id, name)
);

-- 2. Run a DO block to modify the table if it was created with the legacy schema
DO $$
BEGIN
  -- Check if 'location' column exists and 'name' column does not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'location'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'name'
  ) THEN
    -- Rename 'location' to 'name'
    ALTER TABLE warehouse_locations RENAME COLUMN location TO name;
  END IF;

  -- Drop old unique constraint on 'location' if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_locations_location_key'
  ) THEN
    ALTER TABLE warehouse_locations DROP CONSTRAINT warehouse_locations_location_key;
  END IF;

  -- Ensure 'name' is NOT NULL if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'name'
  ) THEN
    ALTER TABLE warehouse_locations ALTER COLUMN name SET NOT NULL;
  END IF;

  -- Add 'type' column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'type'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN type VARCHAR(50) DEFAULT 'Warehouse';
  END IF;

  -- Add 'address' column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'address'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN address TEXT;
  END IF;

  -- Add 'is_active' column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN is_active BOOLEAN DEFAULT true;
    -- Populate from 'status' if 'status' exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'warehouse_locations' AND column_name = 'status'
    ) THEN
      UPDATE warehouse_locations SET is_active = (COALESCE(status, 'Active') = 'Active');
    END IF;
  END IF;

  -- Add 'status' column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'status'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN status VARCHAR(20) DEFAULT 'Active';
    -- Populate from 'is_active'
    UPDATE warehouse_locations SET status = CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END;
  END IF;

  -- Add 'deleted_at' column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN deleted_at TIMESTAMP;
  END IF;

  -- Ensure unique constraint on (company_id, name)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_locations_company_id_name_key'
  ) THEN
    -- Make sure company_id is NOT NULL
    ALTER TABLE warehouse_locations ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE warehouse_locations ADD CONSTRAINT warehouse_locations_company_id_name_key UNIQUE (company_id, name);
  END IF;
END $$;

-- 3. Set up the trigger to sync 'status' and 'is_active' so that they stay in sync
CREATE OR REPLACE FUNCTION sync_warehouse_locations_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL AND (NEW.is_active IS NULL OR (NEW.status = 'Active') <> NEW.is_active) THEN
      NEW.is_active := (NEW.status = 'Active');
    ELSIF NEW.is_active IS NOT NULL AND NEW.status IS NULL THEN
      NEW.status := CASE WHEN NEW.is_active THEN 'Active' ELSE 'Inactive' END;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.is_active := (COALESCE(NEW.status, 'Active') = 'Active');
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      NEW.status := CASE WHEN NEW.is_active THEN 'Active' ELSE 'Inactive' END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_warehouse_locations_status ON warehouse_locations;
CREATE TRIGGER trg_sync_warehouse_locations_status
BEFORE INSERT OR UPDATE ON warehouse_locations
FOR EACH ROW EXECUTE FUNCTION sync_warehouse_locations_status();

-- 4. Ensure a default "Main Warehouse" exists for companies with existing inventory
INSERT INTO warehouse_locations (company_id, name, type)
SELECT DISTINCT company_id, warehouse_location, 'Main'
FROM stock_register sr
WHERE NOT EXISTS (
  SELECT 1 FROM warehouse_locations wl WHERE wl.company_id = sr.company_id AND wl.name = sr.warehouse_location
) ON CONFLICT (company_id, name) DO NOTHING;
