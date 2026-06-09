-- Add composite indexes for common audit_logs queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_action_created ON audit_logs(company_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_resource_created ON audit_logs(company_id, resource_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_user_created ON audit_logs(company_id, user_id, created_at DESC);
