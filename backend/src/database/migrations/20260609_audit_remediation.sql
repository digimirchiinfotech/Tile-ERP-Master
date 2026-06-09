-- Audit remediation: immutability trigger + subscription cascade enforcement

-- Prevent modification or deletion of audit log records
CREATE OR REPLACE FUNCTION prevent_audit_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs records are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable_trigger ON audit_logs;
CREATE TRIGGER audit_logs_immutable_trigger
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_logs_modification();

-- Ensure company_subscriptions are removed when a company is deleted
ALTER TABLE company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_company_id_fkey;
ALTER TABLE company_subscriptions
  ADD CONSTRAINT company_subscriptions_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
