-- Migration: Add missing columns to invoice_backside to prevent 500 errors
-- Date: 2026-04-15

DO $$ 
BEGIN 
    -- 1. booking_no
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='booking_no') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN booking_no VARCHAR(100);
    END IF;

    -- 2. weighbridge_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='weighbridge_name') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN weighbridge_name VARCHAR(255);
    END IF;

    -- 3. max_permissible_weight
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='max_permissible_weight') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN max_permissible_weight NUMERIC(10, 2) DEFAULT 0;
    END IF;

    -- 4. cargo_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='cargo_type') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN cargo_type VARCHAR(50) DEFAULT 'NORMAL';
    END IF;

    -- 5. is_description_match
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='is_description_match') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN is_description_match VARCHAR(10) DEFAULT 'YES';
    END IF;

    -- 6. total_packages (sometimes missing or inconsistent with total_boxes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='total_packages') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN total_packages INTEGER;
    END IF;

    -- 7. declaration_text
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='declaration_text') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN declaration_text TEXT;
    END IF;

    -- 8. iec_no (if missing, controller uses it)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_backside' AND column_name='iec_no') THEN
        ALTER TABLE public.invoice_backside ADD COLUMN iec_no VARCHAR(50);
    END IF;

END $$;
