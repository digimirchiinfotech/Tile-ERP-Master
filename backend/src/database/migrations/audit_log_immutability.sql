-- Migration: Audit Log Immutability & Global Master Log
-- Description: Revokes destructive permissions from the application user and creates a cross-tenant global audit log.

BEGIN;

-- 1. Create a global_audit_logs table in the master schema (or standard schema) for cross-tenant replication
CREATE TABLE IF NOT EXISTS global_audit_logs (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    tenant_company_id UUID,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    replicated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create index on the global table for admin queries
CREATE INDEX IF NOT EXISTS idx_global_audit_logs_company ON global_audit_logs(tenant_company_id);
CREATE INDEX IF NOT EXISTS idx_global_audit_logs_created_at ON global_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_global_audit_logs_resource ON global_audit_logs(resource_type, resource_id);

-- 3. Prevent TRUNCATE, DELETE, and UPDATE on the tenant audit_logs table
-- Replace 'app_user' with the actual database user the application connects as.
-- If the application connects as 'postgres' (which it shouldn't in production), 
-- these REVOKE statements won't prevent a superuser, but we apply them anyway.

DO $$ 
DECLARE
    app_user text := 'postgres'; -- Modify this in production to your actual app user (e.g., 'tile_app')
BEGIN
    -- Revoke destructive permissions on tenant audit logs
    EXECUTE 'REVOKE DELETE, UPDATE, TRUNCATE ON audit_logs FROM ' || quote_ident(app_user);
    
    -- Revoke destructive permissions on global audit logs
    EXECUTE 'REVOKE DELETE, UPDATE, TRUNCATE ON global_audit_logs FROM ' || quote_ident(app_user);
    
    -- Ensure INSERT and SELECT are granted
    EXECUTE 'GRANT INSERT, SELECT ON audit_logs TO ' || quote_ident(app_user);
    EXECUTE 'GRANT INSERT, SELECT ON global_audit_logs TO ' || quote_ident(app_user);
EXCEPTION WHEN OTHERS THEN
    -- Table or user might not exist yet in some environments
    RAISE NOTICE 'Skipping permissions: %', SQLERRM;
END $$;

-- 4. Create trigger to prevent DELETE/UPDATE completely (defense in depth)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. DELETE and UPDATE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_logs;
CREATE TRIGGER trg_prevent_audit_log_modification
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_prevent_global_audit_log_modification ON global_audit_logs;
CREATE TRIGGER trg_prevent_global_audit_log_modification
    BEFORE UPDATE OR DELETE ON global_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

COMMIT;
