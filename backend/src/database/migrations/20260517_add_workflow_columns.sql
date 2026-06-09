-- Migration: Add workflow and document status tracking columns
-- Added fields: is_used, is_converted, linked_document_id, document_status

-- 1. Proforma Invoices
ALTER TABLE public.proforma_invoices 
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID NULL,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft';

-- 2. Export Invoices
ALTER TABLE public.export_invoices 
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID NULL,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft';

-- 3. Packing Lists
ALTER TABLE public.packing_lists 
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID NULL,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft';

-- 4. Export Invoice Annexures
ALTER TABLE public.export_invoice_annexures 
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID NULL,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft';

-- 5. Invoice Backside
ALTER TABLE public.invoice_backside 
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID NULL,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft';

-- 6. VGM Documents
ALTER TABLE public.vgm_documents 
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID NULL,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft';

-- 7. Shipping Instructions
ALTER TABLE public.shipping_instructions 
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID NULL,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Draft';
