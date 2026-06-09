-- Create business terms master tables
CREATE TABLE IF NOT EXISTS public.payment_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    term character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tariff_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    code character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Add default data
INSERT INTO public.payment_terms (term, status) VALUES 
('100% Advance', 'Active'),
('50% Advance 50% against BL copy', 'Active'),
('LC at sight', 'Active'),
('CAD', 'Active'),
('30 Days Credit', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.tariff_codes (code, status) VALUES 
('69072100', 'Active'),
('69072200', 'Active'),
('69072300', 'Active'),
('69072400', 'Active')
ON CONFLICT DO NOTHING;
