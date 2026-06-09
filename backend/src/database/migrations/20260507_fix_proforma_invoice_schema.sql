-- Migration: Fix Proforma Invoice Schema and ensure relational lines table exists
-- Target: Tenant Databases
-- Description: Adds missing columns to proforma_invoices and ensures proforma_invoice_lines exists.

-- 1. Add missing columns to proforma_invoices
DO $$ 
BEGIN 
    -- Column: currency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'currency') THEN
        ALTER TABLE proforma_invoices ADD COLUMN currency VARCHAR(50) DEFAULT 'USD ($)';
    END IF;

    -- Column: pre_carriage_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'pre_carriage_by') THEN
        ALTER TABLE proforma_invoices ADD COLUMN pre_carriage_by VARCHAR(255);
    END IF;

    -- Column: place_of_receipt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'place_of_receipt') THEN
        ALTER TABLE proforma_invoices ADD COLUMN place_of_receipt VARCHAR(255);
    END IF;

    -- Column: bl_no
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'bl_no') THEN
        ALTER TABLE proforma_invoices ADD COLUMN bl_no VARCHAR(100);
    END IF;

    -- Column: bl_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'bl_date') THEN
        ALTER TABLE proforma_invoices ADD COLUMN bl_date DATE;
    END IF;

    -- Column: vessel_flight_no
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'vessel_flight_no') THEN
        ALTER TABLE proforma_invoices ADD COLUMN vessel_flight_no VARCHAR(100);
    END IF;

    -- Column: sb_no
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'sb_no') THEN
        ALTER TABLE proforma_invoices ADD COLUMN sb_no VARCHAR(100);
    END IF;

    -- Column: sb_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'sb_date') THEN
        ALTER TABLE proforma_invoices ADD COLUMN sb_date DATE;
    END IF;

    -- Column: exchange_rate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'exchange_rate') THEN
        ALTER TABLE proforma_invoices ADD COLUMN exchange_rate NUMERIC(15, 6) DEFAULT 1.0;
    END IF;
END $$;

-- 2. Ensure proforma_invoice_lines table exists
CREATE TABLE IF NOT EXISTS public.proforma_invoice_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_invoice_id UUID NOT NULL REFERENCES public.proforma_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255),
    size VARCHAR(100),
    surface VARCHAR(100),
    thickness VARCHAR(50),
    total_pallets INTEGER DEFAULT 0,
    total_boxes INTEGER DEFAULT 0,
    box_weight NUMERIC(15, 4) DEFAULT 0,
    sqm_auto NUMERIC(15, 4) DEFAULT 0,
    rate NUMERIC(15, 4) DEFAULT 0,
    amount NUMERIC(15, 4) DEFAULT 0,
    net_weight NUMERIC(15, 4) DEFAULT 0,
    gross_weight NUMERIC(15, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_lines_pi_id ON proforma_invoice_lines(proforma_invoice_id);
