-- proforma_invoices
CREATE INDEX IF NOT EXISTS idx_pi_company_id ON proforma_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_pi_client_id ON proforma_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_pi_status ON proforma_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pi_deleted_at ON proforma_invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_pi_date ON proforma_invoices(date);

-- proforma_invoice_lines
CREATE INDEX IF NOT EXISTS idx_pil_proforma_invoice_id ON proforma_invoice_lines(proforma_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pil_product_id ON proforma_invoice_lines(product_id);

-- proforma_orders
CREATE INDEX IF NOT EXISTS idx_po_company_id ON proforma_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON proforma_orders(status);

-- export_invoices
CREATE INDEX IF NOT EXISTS idx_ei_company_id ON export_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_ei_deleted_at ON export_invoices(deleted_at);

-- export_invoice_lines
CREATE INDEX IF NOT EXISTS idx_eil_export_invoice_id ON export_invoice_lines(export_invoice_id);

-- export_invoice_proforma_links
CREATE INDEX IF NOT EXISTS idx_eipl_export_invoice_id ON export_invoice_proforma_links(export_invoice_id);
CREATE INDEX IF NOT EXISTS idx_eipl_proforma_invoice_id ON export_invoice_proforma_links(proforma_invoice_id);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);

-- master_order_sheets
CREATE INDEX IF NOT EXISTS idx_mos_company_id ON master_order_sheets(company_id);
CREATE INDEX IF NOT EXISTS idx_mos_status ON master_order_sheets(status);

-- master_order_sheet_lines
CREATE INDEX IF NOT EXISTS idx_mosl_sheet_id ON master_order_sheet_lines(master_order_sheet_id);
CREATE INDEX IF NOT EXISTS idx_mosl_company_id ON master_order_sheet_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_mosl_production_status ON master_order_sheet_lines(production_status);

-- qc_records
CREATE INDEX IF NOT EXISTS idx_qc_company_id ON qc_records(company_id);
CREATE INDEX IF NOT EXISTS idx_qc_status ON qc_records(qc_status);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
