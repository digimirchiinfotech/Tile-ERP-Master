CREATE TABLE IF NOT EXISTS public.size_packing_master (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    company_id uuid NOT NULL,
    size character varying(100) NOT NULL,
    box_pcs integer DEFAULT 0,
    sqm_per_box numeric(10,4) DEFAULT 0,
    boxes_per_pallet integer DEFAULT 0,
    boxes_per_kathli integer DEFAULT 0,
    per_box_weight numeric(10,4) DEFAULT 0,
    per_pallet_weight numeric(10,4) DEFAULT 0,
    status character varying(20) DEFAULT 'Active',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    UNIQUE(company_id, size)
);
