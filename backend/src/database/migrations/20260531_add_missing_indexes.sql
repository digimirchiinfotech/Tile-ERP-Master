-- Add Indexes for company_id and high-frequency foreign keys
DO $$
BEGIN
    -- Users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
    END IF;

    -- Proforma Invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proforma_invoices') THEN
        CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_id ON proforma_invoices(company_id);
        CREATE INDEX IF NOT EXISTS idx_proforma_invoices_status ON proforma_invoices(status);
        CREATE INDEX IF NOT EXISTS idx_proforma_invoices_client_id ON proforma_invoices(client_id);
    END IF;

    -- Export Invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'export_invoices') THEN
        CREATE INDEX IF NOT EXISTS idx_export_invoices_company_id ON export_invoices(company_id);
        CREATE INDEX IF NOT EXISTS idx_export_invoices_status ON export_invoices(status);
        CREATE INDEX IF NOT EXISTS idx_export_invoices_proforma_id ON export_invoices(proforma_invoice_id);
    END IF;

    -- Packing Lists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'packing_lists') THEN
        CREATE INDEX IF NOT EXISTS idx_packing_lists_company_id ON packing_lists(company_id);
        CREATE INDEX IF NOT EXISTS idx_packing_lists_export_invoice_id ON packing_lists(export_invoice_id);
    END IF;

    -- VGM Documents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vgm_documents') THEN
        CREATE INDEX IF NOT EXISTS idx_vgm_documents_company_id ON vgm_documents(company_id);
        CREATE INDEX IF NOT EXISTS idx_vgm_documents_export_invoice_id ON vgm_documents(export_invoice_id);
    END IF;

    -- Shipping Instructions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipping_instructions') THEN
        CREATE INDEX IF NOT EXISTS idx_shipping_instructions_company_id ON shipping_instructions(company_id);
        CREATE INDEX IF NOT EXISTS idx_shipping_instructions_export_invoice_id ON shipping_instructions(export_invoice_id);
    END IF;

    -- Audit Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    END IF;

    -- Clients
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
    END IF;
END $$;
