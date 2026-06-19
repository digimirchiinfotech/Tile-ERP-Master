-- 20260620_double_entry_ledger.sql
-- ERP Finance Architecture Phase 2: Double-Entry Accounting Ledger Schema

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entry_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    reference VARCHAR(100),
    source_type VARCHAR(50),
    source_id UUID,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, entry_no)
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    debit NUMERIC(15, 2) DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(15, 2) DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for multi-tenant isolation in shared database mode
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.journal_entries;
CREATE POLICY tenant_isolation_policy ON public.journal_entries 
    USING (company_id = current_setting('app.current_company_id', true)::uuid);
ALTER TABLE public.journal_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.ledger_entries;
CREATE POLICY tenant_isolation_policy ON public.ledger_entries 
    USING (company_id = current_setting('app.current_company_id', true)::uuid);
ALTER TABLE public.ledger_entries FORCE ROW LEVEL SECURITY;

-- Indexes for speedy financial searches and reporting
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON public.journal_entries(company_id, date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_company_journal ON public.ledger_entries(company_id, journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON public.ledger_entries(company_id, account_code);
