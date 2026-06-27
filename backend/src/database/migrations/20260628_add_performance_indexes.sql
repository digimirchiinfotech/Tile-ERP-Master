-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_company_status
  ON clients(company_id, status) WHERE deleted_at IS NULL;

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_company_status_created
  ON leads(company_id, status, created_at DESC);

-- Proforma Invoices
CREATE INDEX IF NOT EXISTS idx_pi_company_status_used
  ON proforma_invoices(company_id, status, is_used, created_at DESC);

-- Export Invoices
CREATE INDEX IF NOT EXISTS idx_ei_company_status_used
  ON export_invoices(company_id, status, is_used, created_at DESC);

-- Packing Lists
CREATE INDEX IF NOT EXISTS idx_pl_company_ei
  ON packing_lists(company_id, export_invoice_id);

-- QC Records
CREATE INDEX IF NOT EXISTS idx_qc_company_order_sheet
  ON qc_records(company_id, order_sheet_id, created_at DESC);

-- Audit Logs (admin searches these constantly)
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_user
  ON audit_logs(company_id, user_id, created_at DESC);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_company_category
  ON products(company_id, category, status);

-- Account Entries
CREATE INDEX IF NOT EXISTS idx_account_entries_company_date
  ON account_entries(company_id, entry_date DESC);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_company
  ON suppliers(company_id) WHERE deleted_at IS NULL;

-- Full text search (for global search feature)
CREATE INDEX IF NOT EXISTS idx_clients_name_search
  ON clients USING gin(to_tsvector('english', coalesce(client_name,'')));

CREATE INDEX IF NOT EXISTS idx_products_name_search
  ON products USING gin(to_tsvector('english', coalesce(product_name,'')));
