-- Migration: Add is_foc column to export_invoice_lines
-- Description: Adds is_foc boolean column to identify free of cost items in export invoices
-- Created At: 2026-05-16

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_invoice_lines' AND column_name = 'is_foc') THEN
        ALTER TABLE public.export_invoice_lines ADD COLUMN is_foc BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
