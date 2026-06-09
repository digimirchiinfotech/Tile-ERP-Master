-- Migration: Add snapshot_data to all major document tables for immutable locking

ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS snapshot_data JSONB;
ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS snapshot_data JSONB;
ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS snapshot_data JSONB;
ALTER TABLE export_invoice_annexures ADD COLUMN IF NOT EXISTS snapshot_data JSONB;
ALTER TABLE invoice_backside ADD COLUMN IF NOT EXISTS snapshot_data JSONB;
ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS snapshot_data JSONB;
ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS snapshot_data JSONB;

-- Add comment to explain usage
COMMENT ON COLUMN export_invoices.snapshot_data IS 'Stores a complete immutable snapshot of master data (company, product, pricing, bank, etc.) at the time the document is locked.';
