-- 20260521_add_erp_finance_architecture.sql
-- ERP Finance Architecture Phase 1: Database & Backend Architecture

-- 1. Chart of Accounts System
CREATE TABLE IF NOT EXISTS public.account_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    code varchar(50) UNIQUE NOT NULL,
    type varchar(100) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    description text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.master_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    group_id uuid REFERENCES public.account_groups(id),
    name varchar(255) NOT NULL,
    code varchar(50),
    description text,
    is_system_account boolean DEFAULT false,
    status varchar(50) DEFAULT 'Active',
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ledger System
CREATE TABLE IF NOT EXISTS public.general_ledger (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    account_id uuid REFERENCES public.master_accounts(id),
    transaction_date date NOT NULL,
    voucher_type varchar(100) NOT NULL, -- Sales, Purchase, Receipt, Payment, Journal
    voucher_ref varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    running_balance numeric(15, 2) DEFAULT 0,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    notes text,
    is_locked boolean DEFAULT false,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.customer_ledgers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    voucher_type varchar(100) NOT NULL,
    voucher_ref varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    running_balance numeric(15, 2) DEFAULT 0,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    notes text,
    is_reconciled boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.supplier_ledgers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    voucher_type varchar(100) NOT NULL,
    voucher_ref varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    running_balance numeric(15, 2) DEFAULT 0,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    notes text,
    is_reconciled boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payment Architecture
CREATE TABLE IF NOT EXISTS public.payment_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    payment_no varchar(100) NOT NULL,
    payment_date date NOT NULL,
    client_id uuid REFERENCES public.clients(id),
    supplier_id uuid REFERENCES public.suppliers(id),
    account_id uuid REFERENCES public.master_accounts(id), -- Bank or Cash account
    amount numeric(15, 2) NOT NULL,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    payment_method varchar(100),
    reference_no varchar(100),
    status varchar(50) DEFAULT 'Pending', -- Pending, Reconciled, Bounced, Cancelled
    notes text,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id uuid REFERENCES public.payment_entries(id) ON DELETE CASCADE,
    invoice_id uuid, -- Can be export_invoices, proforma_invoices, etc.
    invoice_type varchar(100), -- 'ExportInvoice', 'ProformaInvoice', etc.
    allocated_amount numeric(15, 2) NOT NULL,
    notes text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    account_id uuid REFERENCES public.master_accounts(id),
    transaction_date date NOT NULL,
    description text,
    reference varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    balance numeric(15, 2) DEFAULT 0,
    is_reconciled boolean DEFAULT false,
    reconciled_payment_id uuid REFERENCES public.payment_entries(id),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_general_ledger_company_account ON public.general_ledger(company_id, account_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledgers_client ON public.customer_ledgers(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledgers_supplier ON public.supplier_ledgers(company_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_entries_company ON public.payment_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON public.payment_allocations(invoice_id);

-- Insert default account groups
INSERT INTO public.account_groups (name, code, type, description) VALUES
('Current Assets', 'CA', 'Asset', 'Cash, bank balances, inventory, receivables'),
('Fixed Assets', 'FA', 'Asset', 'Long-term assets'),
('Current Liabilities', 'CL', 'Liability', 'Payables, short-term debt'),
('Long Term Liabilities', 'LTL', 'Liability', 'Long-term debt'),
('Equity', 'EQ', 'Equity', 'Capital and retained earnings'),
('Operating Revenue', 'OR', 'Revenue', 'Sales revenue'),
('Other Income', 'OI', 'Revenue', 'Forex gain, interest income'),
('Direct Expenses', 'DE', 'Expense', 'Cost of goods sold, duties'),
('Indirect Expenses', 'IE', 'Expense', 'Admin and selling expenses')
ON CONFLICT (code) DO NOTHING;
