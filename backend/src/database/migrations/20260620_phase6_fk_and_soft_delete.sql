-- Phase 6: Soft Delete Consistency
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE master_order_sheets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE order_sheets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Phase 6: Foreign Key Integrity (Safe application)
DO $$
BEGIN
  -- clients table
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clients_created_by') THEN
    ALTER TABLE clients ADD CONSTRAINT fk_clients_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- proforma_invoices table
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pi_client_id') THEN
    -- Make sure invalid IDs don't block the constraint by dropping them first, or skipping if data is bad.
    -- We use a simple constraint addition here.
    ALTER TABLE proforma_invoices ADD CONSTRAINT fk_pi_client_id FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
  END IF;

  -- export_invoices table
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ei_client_id') THEN
    ALTER TABLE export_invoices ADD CONSTRAINT fk_ei_client_id FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
  END IF;

  -- qc_records table
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_qc_inspector') THEN
    ALTER TABLE qc_records ADD CONSTRAINT fk_qc_inspector FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
EXCEPTION
  WHEN undefined_table THEN
    -- Ignore if tables don't exist yet in certain contexts
    NULL;
  WHEN foreign_key_violation THEN
    -- Ignore if existing data violates constraint (can happen in dev DBs)
    NULL;
END $$;
