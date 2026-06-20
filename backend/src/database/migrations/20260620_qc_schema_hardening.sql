-- Migration: 20260620_qc_schema_hardening.sql
-- Purpose: Add missing columns to qc_records that were previously added via runtime ALTER TABLE
-- in qcRecordController.js request handlers. Moving these to a proper migration eliminates
-- the ACCESS EXCLUSIVE lock risk on every API request.

-- Add box_type column if missing
ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS box_type VARCHAR(255);

-- Add order_sheet_id column if missing (Phase 2 transition to master_order_sheets)
ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS order_sheet_id UUID;

-- Drop the old FK constraint that was blocking order_sheet_id inserts
ALTER TABLE qc_records DROP CONSTRAINT IF EXISTS qc_records_order_id_fkey;

-- Add status CHECK constraint to qc_records
ALTER TABLE qc_records DROP CONSTRAINT IF EXISTS qc_records_qc_status_check;
ALTER TABLE qc_records ADD CONSTRAINT qc_records_qc_status_check
  CHECK (qc_status IN ('Pending', 'Passed', 'Failed', 'Passed with conditions', 'In Progress', 'On Hold'));

-- Add status CHECK to export_invoices
ALTER TABLE export_invoices DROP CONSTRAINT IF EXISTS export_invoices_status_check;
ALTER TABLE export_invoices ADD CONSTRAINT export_invoices_status_check
  CHECK (status IN ('Draft', 'Pending', 'Approved', 'Finalized', 'Active', 'In Transit', 'Shipped', 'Completed', 'Locked', 'Revised', 'Cancelled'));

-- Add status CHECK to proforma_invoices
ALTER TABLE proforma_invoices DROP CONSTRAINT IF EXISTS proforma_invoices_status_check;
ALTER TABLE proforma_invoices ADD CONSTRAINT proforma_invoices_status_check
  CHECK (status IN ('Draft', 'Pending', 'Approved', 'Finalized', 'Ready', 'Active', 'Locked', 'Completed', 'Revised', 'Cancelled'));

-- Add status CHECK to proforma_orders
ALTER TABLE proforma_orders DROP CONSTRAINT IF EXISTS proforma_orders_status_check;
ALTER TABLE proforma_orders ADD CONSTRAINT proforma_orders_status_check
  CHECK (status IN ('Draft', 'Pending', 'Approved', 'Finalized', 'Ready', 'Active', 'Locked', 'Completed', 'Revised', 'Cancelled'));

-- Composite performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_qc_records_company_created ON qc_records (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_records_company_status ON qc_records (company_id, qc_status);
CREATE INDEX IF NOT EXISTS idx_export_invoices_company_created ON export_invoices (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_invoices_company_status ON export_invoices (company_id, status);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_created ON proforma_invoices (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_status ON proforma_invoices (company_id, status);
CREATE INDEX IF NOT EXISTS idx_proforma_orders_company_created ON proforma_orders (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_entries_company_created ON account_entries (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_entries_company_status ON account_entries (company_id, status);
CREATE INDEX IF NOT EXISTS idx_packing_lists_company_created ON packing_lists (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON leads (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_company_created ON clients (company_id, created_at DESC);
