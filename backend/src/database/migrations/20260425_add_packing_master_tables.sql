-- Create packing specifications master tables
CREATE TABLE IF NOT EXISTS public.pallet_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    type character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tiles_back_marking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    marking character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.boxes_marking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    marking character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Create ports and destinations tables
CREATE TABLE IF NOT EXISTS public.ports_of_loading (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ports_of_discharge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.final_destinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    destination character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.box_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    type character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.delivery_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    term character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Add default data
INSERT INTO public.pallet_types (type, status) VALUES 
('Without Pallet', 'Active'),
('Normal Wooden Pallet', 'Active'),
('Euro Pallet', 'Active'),
('Plastic Pallet', 'Active'),
('Custom Pallet', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.tiles_back_marking (marking, status) VALUES 
('MADE IN INDIA', 'Active'),
('WITH MADE IN INDIA', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.box_types (type, status) VALUES 
('NON BRANDED BOXES', 'Active'),
('BRANDED BOXES', 'Active'),
('WHITE BOXES', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.boxes_marking (marking, status) VALUES 
('WITH', 'Active'),
('WITHOUT', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.delivery_terms (term, status) VALUES 
('FOB', 'Active'),
('CIF', 'Active'),
('CFR', 'Active'),
('EX-WORK', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.ports_of_loading (name, status) VALUES 
('MUNDRA PORT, GUJARAT, INDIA', 'Active'),
('NHAVA SHEVA PORT, MAHARASHTRA, INDIA', 'Active'),
('KANDLA PORT, GUJARAT, INDIA', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.ports_of_discharge (name, status) VALUES 
('JEBEL ALI, UAE', 'Active'),
('COLOMBO, SRI LANKA', 'Active'),
('DURBAN, SOUTH AFRICA', 'Active'),
('HAMBURG, GERMANY', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.final_destinations (destination, status) VALUES 
('DUBAI, UAE', 'Active'),
('COLOMBO, SRI LANKA', 'Active'),
('JOHANNESBURG, SOUTH AFRICA', 'Active'),
('HAMBURG, GERMANY', 'Active')
ON CONFLICT DO NOTHING;
