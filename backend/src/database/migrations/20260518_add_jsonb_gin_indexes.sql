-- 20260518_add_jsonb_gin_indexes.sql
-- Add GIN indexes to all heavy JSONB columns for performant deep-search queries.
-- Uses CREATE INDEX CONCURRENTLY to avoid table locking during index build.
-- NOTE: CONCURRENTLY cannot run inside a transaction block - migration runner detects this automatically.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gin_export_invoices_product_lines
  ON public.export_invoices USING GIN (product_lines);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gin_export_invoice_annexures_container_details
  ON public.export_invoice_annexures USING GIN (container_details);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gin_export_invoice_annexures_product_lines
  ON public.export_invoice_annexures USING GIN (product_lines);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gin_packing_lists_product_lines
  ON public.packing_lists USING GIN (product_lines jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gin_proforma_invoices_product_lines
  ON public.proforma_invoices USING GIN (product_lines);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gin_invoice_backside_container_details
  ON public.invoice_backside USING GIN (container_details);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gin_companies_settings
  ON public.companies USING GIN (settings);
