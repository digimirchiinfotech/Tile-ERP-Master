-- Add approval workflow fields to proforma_invoices
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id);
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS approval_remarks TEXT;

-- Also add to export_invoices if needed later, but the user specifically mentioned PI.
