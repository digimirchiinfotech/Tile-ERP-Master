-- Migration: 20260620_soft_delete_and_incoterms.sql
-- Purpose: 
--   1. Add soft-delete (deleted_at) to tables that are missing it
--   2. Add INCOTERMS validation CHECK constraint on delivery_terms
--   3. Add batch/lot number tracking to qc_records

-- ─── Soft Delete Columns ────────────────────────────────────────────────────
-- export_invoices (financial records must not be hard-deleted)
ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- leads (CRM data should be recoverable)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- account_entries (financial records require audit trail)
ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- shipping_instructions
ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- vgm_documents
ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- ─── INCOTERMS Validation ───────────────────────────────────────────────────
-- Valid INCOTERMS 2020 - all modes + sea-only terms
ALTER TABLE proforma_invoices DROP CONSTRAINT IF EXISTS proforma_invoices_incoterms_check;
ALTER TABLE proforma_invoices ADD CONSTRAINT proforma_invoices_incoterms_check
  CHECK (
    delivery_terms IS NULL OR
    delivery_terms = '' OR
    UPPER(delivery_terms) IN (
      'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',  -- All modes
      'FAS', 'FOB', 'CFR', 'CIF'                          -- Sea/inland waterway only
    )
  );

ALTER TABLE export_invoices DROP CONSTRAINT IF EXISTS export_invoices_incoterms_check;
ALTER TABLE export_invoices ADD CONSTRAINT export_invoices_incoterms_check
  CHECK (
    delivery_terms IS NULL OR
    delivery_terms = '' OR
    UPPER(delivery_terms) IN (
      'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',
      'FAS', 'FOB', 'CFR', 'CIF'
    )
  );

-- ─── Batch / Lot Number Traceability in QC ──────────────────────────────────
ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);
ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS manufacturing_date DATE;

-- Index for batch/lot number lookups
CREATE INDEX IF NOT EXISTS idx_qc_records_batch ON qc_records (company_id, batch_number) WHERE batch_number IS NOT NULL;

-- ─── Indexes for soft-delete queries ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_export_invoices_not_deleted ON export_invoices (company_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_not_deleted ON leads (company_id, created_at DESC) WHERE deleted_at IS NULL;
