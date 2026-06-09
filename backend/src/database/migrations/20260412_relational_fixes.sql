-- Migration: Add junction tables for document lines to replace JSONB and enforce integrity

-- 1. Create proforma_invoice_lines table
CREATE TABLE IF NOT EXISTS public.proforma_invoice_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_invoice_id UUID NOT NULL REFERENCES public.proforma_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255),
    size VARCHAR(100),
    surface VARCHAR(100),
    thickness VARCHAR(50),
    total_pallets INTEGER,
    total_boxes INTEGER,
    box_weight NUMERIC(10, 2),
    sqm_auto NUMERIC(10, 2),
    rate NUMERIC(15, 2),
    amount NUMERIC(15, 2),
    net_weight NUMERIC(10, 2),
    gross_weight NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create proforma_order_lines table
CREATE TABLE IF NOT EXISTS public.proforma_order_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_order_id UUID NOT NULL REFERENCES public.proforma_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255),
    size VARCHAR(100),
    surface VARCHAR(100),
    thickness VARCHAR(50),
    total_pallets INTEGER,
    total_boxes INTEGER,
    box_weight NUMERIC(10, 2),
    sqm_auto NUMERIC(10, 2),
    rate NUMERIC(15, 2),
    amount NUMERIC(15, 2),
    net_weight NUMERIC(10, 2),
    gross_weight NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create export_invoice_lines table
CREATE TABLE IF NOT EXISTS public.export_invoice_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    export_invoice_id UUID NOT NULL REFERENCES public.export_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255),
    size VARCHAR(100),
    surface VARCHAR(100),
    thickness VARCHAR(50),
    total_pallets INTEGER,
    total_boxes INTEGER,
    box_weight NUMERIC(10, 2),
    sqm_auto NUMERIC(10, 2),
    rate NUMERIC(15, 2),
    amount NUMERIC(15, 2),
    net_weight NUMERIC(10, 2),
    gross_weight NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: 
-- The data migration from the `product_lines` JSONB column to these relational tables
-- must be handled carefully to prevent failure on orphaned records.
-- A Node process or specialized migration script must first nullify missing product_ids 
-- before executing the INSERT...SELECT statements.
