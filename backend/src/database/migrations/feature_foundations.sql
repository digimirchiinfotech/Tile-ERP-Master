-- Phase 4 Feature Foundations Migration
-- Creates schemas for Inventory, Finance, and GST compliance

BEGIN;

-- ==========================================
-- 4.1 INVENTORY MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    warehouse_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    type VARCHAR(50) DEFAULT 'Main',
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    zone VARCHAR(50),
    rack VARCHAR(50),
    shelf VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER', 'ADJUST')),
    quantity NUMERIC(10,2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    reserved_for_type VARCHAR(50) NOT NULL, -- e.g., 'Proforma Invoice'
    reserved_for_id UUID NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active', -- Active, Released, Consumed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4.2 FINANCE MODULE (Double-Entry)
-- ==========================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    parent_id UUID REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    date DATE NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    narration TEXT,
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Posted, Void
    posted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(15,2) DEFAULT 0.00,
    credit NUMERIC(15,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    exchange_rate NUMERIC(10,4) DEFAULT 1.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forex_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    invoice_id UUID, -- References export_invoices
    currency VARCHAR(10) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    booking_rate NUMERIC(10,4) NOT NULL,
    settlement_rate NUMERIC(10,4),
    gain_loss NUMERIC(15,2),
    status VARCHAR(20) DEFAULT 'Open', -- Open, Settled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4.3 GST COMPLIANCE MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS gstr1_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    invoice_id UUID, -- References standard or export invoice
    invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('B2B', 'B2C', 'EXP_WP', 'EXP_WOP')),
    filing_period VARCHAR(10) NOT NULL, -- e.g., '2026-06'
    taxable_value NUMERIC(15,2) DEFAULT 0.00,
    igst_amount NUMERIC(15,2) DEFAULT 0.00,
    cgst_amount NUMERIC(15,2) DEFAULT 0.00,
    sgst_amount NUMERIC(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Filed, Error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lut_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    arn_number VARCHAR(100) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    renewal_reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, financial_year)
);

CREATE TABLE IF NOT EXISTS rodtep_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hs_code VARCHAR(20) NOT NULL UNIQUE,
    rate_percentage NUMERIC(5,2) NOT NULL,
    cap_per_unit NUMERIC(10,2),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
