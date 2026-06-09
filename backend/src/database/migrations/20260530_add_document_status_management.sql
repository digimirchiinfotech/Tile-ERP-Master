-- Add comprehensive Document Workflow Status Management columns to all document tables
-- This standardizes the status, lock state, and audit columns across the ERP.

DO $$
DECLARE
    t_name text;
    tables_list text[] := ARRAY[
        'proforma_invoices',
        'proforma_orders',
        'export_invoices',
        'packing_lists',
        'export_invoice_annexures',
        'vgm_documents',
        'shipping_instructions',
        'invoice_backside',
        'igst_invoices',
        'qc_records'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_list
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            -- Add status if not exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'status') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN status VARCHAR(50) DEFAULT ''Draft'';', t_name);
            END IF;

            -- Add is_locked if not exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'is_locked') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;', t_name);
            END IF;

            -- Add locked_at if not exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'locked_at') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN locked_at TIMESTAMP;', t_name);
            END IF;

            -- Add locked_by if not exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'locked_by') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN locked_by UUID;', t_name);
            END IF;
        END IF;
    END LOOP;
END $$;
