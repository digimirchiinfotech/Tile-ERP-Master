-- Migration: Add export_document_lock table for Export Invoice Lock Workflow

CREATE TABLE IF NOT EXISTS public.export_document_lock (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_id uuid NOT NULL,
    exp_no character varying(100) NOT NULL,
    document_type character varying(100) NOT NULL,
    document_id uuid NOT NULL,
    lock_status character varying(50) DEFAULT 'LOCKED'::character varying,
    locked_by uuid,
    locked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    unlocked_by uuid,
    unlocked_at timestamp without time zone,
    unlock_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_document_lock_company_id ON public.export_document_lock(company_id);
CREATE INDEX IF NOT EXISTS idx_export_document_lock_exp_no ON public.export_document_lock(exp_no);
CREATE INDEX IF NOT EXISTS idx_export_document_lock_document_id ON public.export_document_lock(document_id);
