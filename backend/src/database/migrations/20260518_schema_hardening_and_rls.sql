-- 20260518_schema_hardening_and_rls.sql
-- 1. Apply all missing columns previously hacked in via API controllers
-- 2. Drop unsafe foreign keys
-- 3. Enforce native PostgreSQL Row-Level Security (RLS) across all multi-tenant tables

BEGIN;

-- Part 1: Schema Hardening (Moving away from DO $$ controller hacks)
ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS supply_declaration TEXT;
ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS ftp_incentive_declaration TEXT;

ALTER TABLE igst_invoices ADD COLUMN IF NOT EXISTS delivery_terms VARCHAR(255);
ALTER TABLE igst_invoices ADD COLUMN IF NOT EXISTS supply_declaration TEXT;
ALTER TABLE igst_invoices ADD COLUMN IF NOT EXISTS ftp_incentive_declaration TEXT;

ALTER TABLE proforma_invoice_lines ADD COLUMN IF NOT EXISTS description TEXT;

-- Drop constraints that were failing during document linkage
ALTER TABLE igst_invoices DROP CONSTRAINT IF EXISTS igst_invoices_created_by_fkey;
ALTER TABLE proforma_invoices DROP CONSTRAINT IF EXISTS proforma_invoices_created_by_fkey;

-- Part 2: Dynamic Row-Level Security (RLS) Enforcement
-- This automatically scans the schema for any table containing a 'company_id' column
-- and locks it down so the Node.js backend MUST provide the tenant context.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'company_id' 
          AND table_schema = 'public'
          -- Exclude global master tables that the auth middleware must query before tenant context is known
          AND table_name NOT IN ('users', 'companies', 'company_subscriptions')
    LOOP
        -- Enable RLS
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' ENABLE ROW LEVEL SECURITY;';
        
        -- Force RLS even for the database owner (critical for Node.js pools running as postgres user)
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' FORCE ROW LEVEL SECURITY;';
        
        -- Drop the policy if it exists to ensure a clean slate
        EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON ' || quote_ident(r.table_name) || ';';
        
        -- Create the universal RLS policy
        -- This explicitly requires the session variable 'app.current_company_id' to match the row's company_id
        EXECUTE 'CREATE POLICY tenant_isolation_policy ON ' || quote_ident(r.table_name) || '
                 USING (company_id::text = current_setting(''app.current_company_id'', true))
                 WITH CHECK (company_id::text = current_setting(''app.current_company_id'', true));';
                 
    END LOOP;
END $$;

COMMIT;
