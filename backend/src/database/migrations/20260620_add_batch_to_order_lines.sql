-- Migration: 20260620_add_batch_to_order_lines.sql
-- Purpose: Add batch_number and lot_number to proforma_order_lines for manufacturing traceability

ALTER TABLE proforma_order_lines ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE proforma_order_lines ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);
ALTER TABLE proforma_order_lines ADD COLUMN IF NOT EXISTS manufacturing_date DATE;

-- Also add to export_invoice_lines for end-to-end traceability
ALTER TABLE export_invoice_lines ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE export_invoice_lines ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);
ALTER TABLE export_invoice_lines ADD COLUMN IF NOT EXISTS manufacturing_date DATE;
