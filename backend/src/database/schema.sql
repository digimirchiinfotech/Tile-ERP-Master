--
-- PostgreSQL database dump
--

\restrict Bg5pYb9AtE04h0M6z7lROFeNSeQsBrFRrWw2Tab9YF05Cc92BwiUxIlVdsbMnYc

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    entry_no character varying(100),
    type character varying(50),
    amount numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date date,
    entry_type character varying(50),
    party_name character varying(255),
    payment_method character varying(100),
    invoice_ref character varying(100),
    po_ref character varying(100),
    status character varying(50) DEFAULT 'Pending'::character varying,
    due_date date,
    notes text,
    created_by uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    user_id uuid,
    action character varying(100),
    resource_type character varying(100),
    resource_id uuid,
    changes jsonb,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bills_of_lading; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills_of_lading (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    bl_no character varying(100) NOT NULL,
    export_invoice_id uuid,
    shipper_name character varying(255),
    consignee_name character varying(255),
    notify_party character varying(255),
    port_of_loading character varying(255),
    port_of_discharge character varying(255),
    vessel_name character varying(255),
    voyage_no character varying(100),
    issued_date date,
    shipping_marks character varying(500),
    number_of_packages integer,
    package_type character varying(100),
    total_weight numeric(15,2),
    total_volume numeric(15,3),
    payment_terms character varying(100),
    freight_status character varying(50) DEFAULT 'Pending'::character varying,
    status character varying(50) DEFAULT 'Pending'::character varying,
    document_checklist jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: catalogue_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalogue_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    catalogue_id uuid,
    product_id uuid,
    display_order integer,
    custom_price numeric,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: catalogues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalogues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    catalogue_id character varying(100),
    description text,
    cover_image_path text,
    pdf_file_path text,
    created_by uuid
);


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    cert_no character varying(100) NOT NULL,
    cert_type character varying(100),
    export_invoice_id uuid,
    issued_date date,
    expiry_date date,
    issuing_authority character varying(255),
    certification_body character varying(255),
    product_category character varying(255),
    compliance_standard character varying(255),
    test_results jsonb DEFAULT '{}'::jsonb,
    status character varying(50) DEFAULT 'Pending'::character varying,
    document_checklist jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: client_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    order_no character varying(100),
    date date DEFAULT CURRENT_DATE,
    client_id uuid,
    invoice_ref character varying(200),
    total_amount numeric(15,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    payment_status character varying(50) DEFAULT 'Unpaid'::character varying,
    delivery_status character varying(50) DEFAULT 'Pending'::character varying,
    expected_delivery date,
    tracking_number character varying(200),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    country character varying(100),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    client_id character varying(100),
    client_name character varying(255),
    contact_person_name character varying(255),
    email_id character varying(255),
    contact_number character varying(50),
    address text,
    city character varying(100),
    business_type character varying(100),
    credit_limit numeric DEFAULT 0,
    credit_days integer DEFAULT 0,
    assigned_salesperson uuid,
    notes text,
    consignee_details text,
    buyer_details text,
    port_of_loading character varying(255) DEFAULT 'MUNDRA PORT'::character varying,
    port_of_discharge character varying(255),
    final_destination character varying(255),
    currency character varying(10) DEFAULT 'INR'::character varying,
    created_by uuid
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    industry character varying(100),
    db_name character varying(100),
    db_user character varying(100),
    db_password character varying(255),
    domain character varying(255),
    email_id character varying(255),
    contact_number character varying(50),
    contact_person_name character varying(255),
    website character varying(255),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    iec_no character varying(100),
    gstn character varying(50),
    pan character varying(20),
    logo_url text,
    subscription_plan character varying(100) DEFAULT 'Free Trial'::character varying,
    registered_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    settings jsonb DEFAULT '{}'::jsonb
);


--
-- Name: company_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plan_id integer,
    status character varying(50) DEFAULT 'active'::character varying,
    start_date date DEFAULT CURRENT_DATE,
    end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(10) NOT NULL,
    symbol character varying(5),
    name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: customs_clearance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customs_clearance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    clearance_no character varying(100) NOT NULL,
    export_invoice_id uuid,
    port_of_origin character varying(255),
    port_of_destination character varying(255),
    hs_code character varying(20),
    clearance_date date,
    clearance_authority character varying(255),
    status character varying(50) DEFAULT 'Pending'::character varying,
    document_checklist jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: export_invoice_annexures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_invoice_annexures (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    export_invoice_id uuid,
    annexure_type character varying(100) NOT NULL,
    packing_list_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    annexure_no character varying(100),
    packing_list_no character varying(100),
    invoice_no character varying(100),
    invoice_date date,
    pi_reference character varying(255),
    client_name character varying(255),
    consignee_details text,
    buyer_details text,
    company_name character varying(255),
    company_address text,
    iec_no character varying(50),
    vessel_name character varying(255),
    port_of_loading character varying(100) DEFAULT 'MUNDRA PORT'::character varying,
    port_of_discharge character varying(100),
    final_destination character varying(255),
    country character varying(100),
    country_of_origin character varying(100) DEFAULT 'INDIA'::character varying,
    hs_code character varying(20) DEFAULT '6907'::character varying,
    pallets_type character varying(100) DEFAULT 'NORMAL WOODEN PALLETS'::character varying,
    made_in_india character varying(100) DEFAULT 'MADE IN INDIA'::character varying,
    tiles_back character varying(100) DEFAULT 'MADE IN INDIA'::character varying,
    boxes_type character varying(100) DEFAULT 'NON BRANDED BOXES'::character varying,
    fumigation character varying(50) DEFAULT 'YES'::character varying,
    legalisation character varying(50) DEFAULT 'NO'::character varying,
    other_instructions character varying(50) DEFAULT 'NO'::character varying,
    product_description text,
    total_boxes integer DEFAULT 0,
    total_pallets integer DEFAULT 0,
    total_sqm numeric(12,4) DEFAULT 0,
    net_weight numeric(15,4) DEFAULT 0,
    gross_weight numeric(15,4) DEFAULT 0,
    sqm_per_box numeric(10,4) DEFAULT 1.44,
    net_weight_per_box numeric(10,4) DEFAULT 46.72,
    gross_weight_per_box numeric(10,4) DEFAULT 47.72,
    shipping_bill_no character varying(100),
    shipping_bill_date date,
    status character varying(50) DEFAULT 'Draft'::character varying,
    created_by character varying(255),
    deleted_at timestamp without time zone,
    container_details jsonb DEFAULT '[]'::jsonb,
    product_lines jsonb DEFAULT '[]'::jsonb,
    export_invoice_no character varying(100),
    range_name character varying(255) DEFAULT '2 (MORBI)'::character varying,
    division character varying(255) DEFAULT 'MORBI'::character varying,
    commissionerate character varying(255) DEFAULT 'JAMNAGAR (customs)'::character varying,
    factory_address text DEFAULT 'AT MORBI'::text,
    examining_officer character varying(255) DEFAULT 'SELF SEALING'::character varying,
    appraiser_name character varying(255) DEFAULT 'SELF SEALING'::character varying,
    division_range character varying(255) DEFAULT 'SELF SEALING'::character varying,
    location_code character varying(100),
    total_packages integer DEFAULT 0,
    unit_type character varying(50) DEFAULT 'Boxes'::character varying,
    pallet_type character varying(100),
    goods_description_match character varying(50) DEFAULT 'YES'::character varying,
    samples_drawn character varying(50) DEFAULT 'N.A.'::character varying,
    sample_seal_no character varying(100) DEFAULT 'N.A.'::character varying,
    customs_seal_no character varying(100) DEFAULT 'N.A.'::character varying,
    permission_no character varying(100),
    permission_year character varying(20),
    declaration_text text,
    lut_arn_no character varying(100),
    lut_date date,
    manufacturer_name character varying(255),
    manufacturer_address text,
    survey_no character varying(100),
    examination_date date,
    boxes_marking character varying(255)
);


--
-- Name: COLUMN export_invoice_annexures.container_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.export_invoice_annexures.container_details IS 'JSON array storing container-wise details with fields: sr_no, container_no, line_seal_no, e_seal_no, material_description, pallet_detail, pallets, boxes, sqm, net_weight, gross_weight, vehicle_no, carriage_no, tare_weight, le_no';


--
-- Name: COLUMN export_invoice_annexures.product_lines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.export_invoice_annexures.product_lines IS 'JSON array storing product line details inherited from export invoice';


--
-- Name: export_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    invoice_no character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    client_id uuid,
    status character varying(50) DEFAULT 'Draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    client_name character varying(255),
    country character varying(100),
    consignee_details text,
    product_lines jsonb DEFAULT '[]'::jsonb,
    pallets numeric DEFAULT 0,
    total_sqm numeric DEFAULT 0,
    net_weight numeric DEFAULT 0,
    gross_weight numeric DEFAULT 0,
    proforma_invoice_id uuid,
    buyer_details text,
    payment_terms text,
    delivery_terms character varying(100),
    port_of_loading character varying(255),
    port_of_discharge character varying(255),
    final_destination character varying(255),
    tariff_code character varying(100),
    total_amount numeric DEFAULT 0,
    pallet_type text,
    tiles_back text,
    boxes_marking text,
    box_type text,
    fumigation character varying(50),
    legalisation character varying(50),
    other_instructions text,
    booking_no character varying(100),
    shipping_bill_no character varying(100),
    shipping_bill_date date,
    bl_no character varying(100),
    bl_date date,
    lut_bond_ref character varying(100),
    pre_carriage_by character varying(255),
    vessel_flight_no character varying(100),
    place_of_receipt character varying(255),
    buyers_order_no character varying(100),
    buyers_order_date date,
    created_by uuid,
    currency character varying(10) DEFAULT 'INR'::character varying,
    exchange_rate numeric DEFAULT 1,
    is_locked boolean DEFAULT false,
    order_id uuid,
    container_count integer DEFAULT 0,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    payment_method character varying(50),
    payment_ref character varying(100),
    payment_date timestamp without time zone,
    lut_date date,
    country_of_origin character varying(255)
);


--
-- Name: export_workflow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_workflow (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    export_invoice_id uuid,
    current_stage character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: factory_names; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factory_names (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: final_destinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_destinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    destination character varying(255) NOT NULL,
    country character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: id_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.id_counters (
    id integer NOT NULL,
    company_id uuid NOT NULL,
    prefix character varying(50) NOT NULL,
    date_key character varying(20) NOT NULL,
    counter integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: id_counters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.id_counters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: id_counters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.id_counters_id_seq OWNED BY public.id_counters.id;


--
-- Name: invoice_backside; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_backside (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    export_invoice_id uuid NOT NULL,
    invoice_no character varying(100),
    invoice_date date,
    client_name character varying(255),
    consignee_details text,
    buyer_details text,
    company_name character varying(255),
    company_address text,
    iec_no character varying(50),
    vessel_name character varying(255),
    port_of_loading character varying(255),
    port_of_discharge character varying(255),
    final_destination character varying(255),
    country character varying(100),
    country_of_origin character varying(100),
    hs_code character varying(50),
    product_description text,
    total_pallets numeric DEFAULT 0,
    total_boxes numeric DEFAULT 0,
    total_sqm numeric DEFAULT 0,
    net_weight numeric DEFAULT 0,
    gross_weight numeric DEFAULT 0,
    pallets_type character varying(100),
    made_in_india character varying(50),
    tiles_back character varying(100),
    boxes_type character varying(100),
    fumigation character varying(100),
    legalisation character varying(100),
    other_instructions text,
    container_details jsonb,
    status character varying(20) DEFAULT 'Draft'::character varying,
    range_name character varying(255),
    division character varying(255),
    commissionerate character varying(255),
    c_no character varying(100),
    c_date date,
    shipping_bill_no character varying(100),
    shipping_bill_date date,
    exporter_name character varying(255),
    exporter_address text,
    iec_code character varying(50),
    branch_code_no character varying(50),
    bin_no character varying(50),
    manufacturer_name character varying(255),
    manufacturer_address text,
    survey_no character varying(100),
    factory_address text,
    examination_date date,
    examining_officer character varying(255),
    appraiser_name character varying(255),
    division_range character varying(255),
    location_code character varying(50),
    export_invoice_no character varying(100),
    export_invoice_date date,
    consignee_name character varying(255),
    consignee_address text,
    goods_description_match character varying(50),
    goods_value_match character varying(50),
    samples_drawn character varying(50),
    sample_seal_no character varying(100),
    customs_seal_no character varying(100),
    lut_arn_no character varying(100),
    lut_date date,
    permission_no character varying(100),
    permission_year character varying(20),
    declaration_text text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    contact_details character varying(255),
    consignee_contact character varying(255),
    notify_party character varying(255),
    notify_party_address text,
    notify_party_contact character varying(255),
    etd date,
    eta date,
    pod date,
    booking_no character varying(100),
    hbl_no character varying(100),
    freight_terms character varying(255),
    place_of_delivery character varying(255),
    total_packages integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    voyage_no character varying(100),
    backside_no character varying(100),
    pi_no character varying(255),
    pl_no character varying(255),
    annexure_invoice_no character varying(100),
    package_type character varying(100),
    goods_description text,
    is_description_match character varying(50),
    weighbridge_name character varying(255),
    max_permissible_weight numeric(10,2) DEFAULT 0,
    cargo_type character varying(50) DEFAULT 'NORMAL'::character varying,
    annexure_id uuid
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'new'::character varying,
    assigned_to uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    lead_id character varying(100),
    company_name character varying(255),
    contact_person_name character varying(255),
    email_id character varying(255),
    contact_number character varying(50),
    address text,
    city character varying(100),
    country character varying(100),
    source character varying(100),
    priority character varying(50) DEFAULT 'Medium'::character varying,
    product_interest text,
    expected_value numeric,
    timeline character varying(100),
    notes text,
    created_by uuid
);


--
-- Name: master_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_cities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    city_name character varying(255) NOT NULL,
    country_code character varying(10),
    state_province character varying(255),
    latitude numeric(10,8),
    longitude numeric(11,8),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: master_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_countries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    country_code character varying(10) NOT NULL,
    country_name character varying(255) NOT NULL,
    region character varying(100),
    iso_alpha_2 character varying(2),
    iso_alpha_3 character varying(3),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    subject character varying(255),
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: migrations_applied; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations_applied (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: migrations_applied_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_applied_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_applied_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_applied_id_seq OWNED BY public.migrations_applied.id;


--
-- Name: module_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    module_name character varying(100) NOT NULL,
    is_enabled boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid,
    role_id character varying(50),
    title character varying(255),
    message text,
    type character varying(50) DEFAULT 'info'::character varying,
    module character varying(100),
    reference_id uuid,
    reference_no character varying(100),
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    redirect_url character varying(500),
    priority character varying(20) DEFAULT 'normal'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: packing_list_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packing_list_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    packing_list_id uuid,
    product_name character varying(255),
    description text,
    quantity integer,
    weight numeric,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: packing_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packing_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    export_invoice_id uuid,
    packing_list_no character varying(100),
    status character varying(50) DEFAULT 'Draft'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pi_reference character varying(100),
    date date,
    client_name character varying(255),
    country character varying(100),
    consignee text,
    buyer text,
    pre_carriage_by character varying(255),
    place_of_receipt character varying(255),
    vessel_flight_no character varying(100),
    port_of_loading character varying(100),
    port_of_discharge character varying(100),
    final_destination character varying(255),
    buyers_order_no character varying(100),
    buyers_order_date date,
    shipment_terms character varying(100),
    tariff_code character varying(100),
    bl_no character varying(100),
    bl_date date,
    sb_no character varying(100),
    sb_date date,
    total_pallets integer DEFAULT 0,
    total_boxes integer DEFAULT 0,
    total_sqm numeric(15,2) DEFAULT 0,
    total_weight numeric(15,2) DEFAULT 0,
    net_weight numeric(15,2) DEFAULT 0,
    gross_weight numeric(15,2) DEFAULT 0,
    pallet_type character varying(100),
    box_type character varying(100),
    fumigation character varying(50) DEFAULT false,
    legalisation character varying(50) DEFAULT false,
    payment_terms text,
    delivery_terms character varying(100),
    deleted_at timestamp without time zone,
    order_id uuid,
    pi_order_id uuid,
    packing_list_date date,
    iec_no character varying(100),
    gstn character varying(50),
    proforma_invoice_no character varying(100),
    proforma_date date,
    country_of_origin character varying(100),
    bank_details jsonb,
    total_amount numeric DEFAULT 0,
    product_lines jsonb DEFAULT '[]'::jsonb,
    material_description text,
    container_details jsonb DEFAULT '[]'::jsonb,
    made_in_india character varying(50) DEFAULT 'YES'::character varying,
    tiles_back character varying(100),
    other_instructions text,
    boxes_marking character varying(100)
);


--
-- Name: pallet_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: pallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    pallet_id character varying(100),
    category character varying(100),
    size character varying(100),
    width numeric,
    height numeric,
    boxes integer,
    status character varying(50) DEFAULT 'Available'::character varying,
    location character varying(255),
    assigned_client character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pdf_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    template_type character varying(100) NOT NULL,
    template_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    country character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: ports_of_discharge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ports_of_discharge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    port_name character varying(255) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: ports_of_loading; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ports_of_loading (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    port_name character varying(255) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: post_shipment_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_shipment_docs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    doc_no character varying(100),
    document_type character varying(100),
    shipment_ref character varying(200),
    invoice_ref character varying(200),
    export_invoice_id uuid,
    client_name character varying(255),
    country character varying(100),
    port_of_loading character varying(200),
    port_of_discharge character varying(200),
    vessel_name character varying(200),
    bl_no character varying(100),
    bl_date date,
    shipping_bill_no character varying(100),
    shipping_bill_date date,
    duty_drawback_claim numeric(15,2),
    gst_refund_claim numeric(15,2),
    rodtep_claim numeric(15,2),
    igst_amount numeric(15,2),
    bank_realization_amount numeric(15,2),
    bank_realization_date date,
    payment_status character varying(50) DEFAULT 'Pending'::character varying,
    document_checklist jsonb DEFAULT '{}'::jsonb,
    notes text,
    submission_date date,
    submitted_to character varying(255),
    courier_service character varying(255),
    tracking_number character varying(255),
    expected_delivery date,
    payment_method character varying(100),
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: product_sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_sizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    size character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: product_surfaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_surfaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    surface character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: product_thickness; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_thickness (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thickness character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    sku character varying(100),
    product_code character varying(100),
    category character varying(100),
    description text,
    item_ref character varying(100),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    size character varying(100),
    surface character varying(100),
    thickness character varying(50),
    application character varying(100),
    box_pcs integer,
    box_weight numeric(10,2),
    factory_price numeric(10,2),
    factory_name character varying(255),
    factory_product_name character varying(255),
    company_product_name character varying(255),
    sqm_per_box numeric,
    boxes_per_pallet integer,
    selling_price numeric,
    hs_code character varying(50),
    images jsonb DEFAULT '[]'::jsonb,
    catalogue_name character varying(255),
    default_boxes_per_kathali integer,
    default_per_box_weight numeric,
    default_per_pallet_weight numeric,
    base_price numeric,
    margin numeric,
    pdfs jsonb DEFAULT '[]'::jsonb,
    created_by uuid
);


--
-- Name: proforma_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proforma_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    invoice_no character varying(100),
    client_id uuid,
    total_amount numeric(15,2),
    status character varying(50) DEFAULT 'Draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer,
    date date,
    client_name character varying(255),
    country character varying(100),
    subtotal numeric DEFAULT 0,
    discount numeric DEFAULT 0,
    tax numeric DEFAULT 0,
    pallets integer,
    total_sqm numeric,
    payment_terms text,
    delivery_terms character varying(100),
    port_of_loading character varying(255),
    port_of_discharge character varying(255),
    final_destination character varying(255),
    consignee_details text,
    buyer_details text,
    validity_days integer,
    notes text,
    product_lines jsonb DEFAULT '[]'::jsonb,
    tariff_code character varying(100),
    supplier_details text,
    pallet_type character varying(100),
    tiles_back character varying(100),
    boxes_marking character varying(100),
    box_type character varying(100),
    fumigation character varying(50),
    legalisation character varying(50),
    other_instructions text,
    created_by uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    booking_no character varying(100),
    lut_date date,
    net_weight numeric,
    gross_weight numeric,
    order_id uuid,
    proforma_order_id uuid
);


--
-- Name: proforma_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proforma_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    order_no character varying(100),
    client_id uuid,
    supplier_id uuid,
    invoice_ref character varying(100),
    total_amount numeric(15,2),
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    supplier_email character varying(255),
    date date,
    supplier_name character varying(255),
    tariff_code character varying(100),
    subtotal numeric DEFAULT 0,
    qc_status character varying(50) DEFAULT 'Not Ready'::character varying,
    production_start_date date,
    production_end_date date,
    expected_delivery date,
    pallets integer,
    notes text,
    product_lines jsonb DEFAULT '[]'::jsonb,
    pallet_type character varying(100),
    tiles_back character varying(100),
    boxes_marking character varying(100),
    box_type character varying(100),
    fumigation character varying(50),
    legalisation character varying(50),
    other_instructions text,
    created_by uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    country character varying(100),
    port_of_loading character varying(255),
    port_of_discharge character varying(255),
    final_destination character varying(255),
    payment_terms text,
    delivery_schedule text,
    gst_rate numeric(15,2) DEFAULT 0.00,
    gst_amount numeric(15,2) DEFAULT 0.00,
    currency character varying(50) DEFAULT 'INR'::character varying
);


--
-- Name: qc_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qc_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid,
    inspector_id uuid,
    inspection_date date DEFAULT CURRENT_DATE,
    result character varying(50),
    remarks text,
    status character varying(50) DEFAULT 'Completed'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    qc_id character varying(100),
    order_id uuid,
    order_number character varying(100),
    client_name character varying(255),
    product_name text,
    qc_date date,
    qc_status character varying(50) DEFAULT 'Pending'::character varying,
    inspection_details jsonb DEFAULT '{}'::jsonb,
    inspection_media jsonb DEFAULT '{}'::jsonb,
    overall_grade character varying(50),
    notes text,
    product_lines jsonb DEFAULT '[]'::jsonb,
    created_by uuid,
    inspector character varying(255)
);


--
-- Name: rate_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    client_name character varying(500),
    product_name character varying(500),
    supplier_name character varying(500),
    rate numeric(15,4),
    currency character varying(10) DEFAULT 'INR'::character varying,
    last_used timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usage_count integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    revoked_at timestamp without time zone
);


--
-- Name: shipping_instructions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_instructions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    export_invoice_id uuid,
    si_no character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    si_date date,
    shipper_details text,
    shipper_address text,
    shipper_contact character varying(255),
    shipper_code character varying(100),
    consignee_details text,
    consignee_address text,
    consignee_contact character varying(255),
    notify_party_details text,
    notify_party_address text,
    notify_party_contact character varying(255),
    vessel_name character varying(255),
    voyage_no character varying(100),
    port_of_loading character varying(255),
    port_of_discharge character varying(255),
    final_destination character varying(255),
    place_of_delivery character varying(255),
    etd date,
    eta date,
    pod date,
    booking_no character varying(100),
    hbl_no character varying(100),
    container_details jsonb DEFAULT '[]'::jsonb,
    commodity_description text,
    hs_code character varying(50),
    total_pallets integer,
    total_boxes integer,
    total_sqm numeric(10,2),
    total_packages integer,
    total_gross_weight numeric(15,2),
    total_net_weight numeric(15,2),
    freight_details character varying(255),
    freight_terms character varying(255),
    bietc_number character varying(100),
    special_instructions text,
    status character varying(50) DEFAULT 'Draft'::character varying,
    shipping_bill_no character varying(100),
    shipping_bill_date date,
    invoice_backside_id uuid,
    packing_list_id uuid,
    vgm_id uuid,
    is_locked boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    shipper_name character varying(255),
    consignee_name character varying(255),
    notify_party_name character varying(255),
    freight_status character varying(100),
    vgm_no character varying(100),
    created_by uuid,
    client_name character varying(255),
    vessel_voyage character varying(255),
    bl_instruction text,
    marks_and_nos text,
    description_of_goods text,
    gross_weight numeric(15,2),
    net_weight numeric(15,2),
    urgency character varying(50) DEFAULT 'Normal'::character varying,
    export_invoice_no character varying(100)
);


--
-- Name: shipping_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    price_monthly numeric(10,2),
    features jsonb,
    max_users integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    price numeric(10,2) DEFAULT 0,
    duration integer DEFAULT 30,
    duration_type character varying(20) DEFAULT 'days'::character varying,
    max_companies integer DEFAULT 1,
    status character varying(20) DEFAULT 'Active'::character varying
);

CREATE TABLE public.subscription_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plan_id integer NOT NULL,
    transaction_id character varying(100),
    amount numeric(15,2) NOT NULL,
    payment_method character varying(100),
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'Paid'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email_id character varying(255),
    contact_number character varying(50),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    supplier_id character varying(100),
    contact_person_name character varying(255),
    address text,
    city character varying(100),
    country character varying(100),
    product_categories jsonb DEFAULT '[]'::jsonb,
    payment_terms character varying(255),
    quality_rating character varying(50),
    gstn character varying(50),
    pan character varying(20),
    bank_details jsonb,
    notes text,
    lead_time character varying(100),
    website character varying(255),
    created_by uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    ticket_id character varying(50) NOT NULL,
    subject character varying(255) NOT NULL,
    description text,
    category character varying(100),
    priority character varying(20) DEFAULT 'Medium'::character varying,
    status character varying(20) DEFAULT 'Open'::character varying,
    assigned_to uuid REFERENCES public.users(id),
    created_by uuid REFERENCES public.users(id),
    resolved_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_tickets_company ON public.support_tickets(company_id);
CREATE INDEX idx_support_tickets_ticket_id ON public.support_tickets(ticket_id);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key character varying(200) NOT NULL,
    setting_value jsonb DEFAULT '{}'::jsonb,
    category character varying(100) DEFAULT 'general'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ticket_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id uuid,
    author_name character varying(255),
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email_id character varying(255) NOT NULL,
    username character varying(100),
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    avatar_url character varying(255),
    designation character varying(100),
    department character varying(100),
    last_login timestamp without time zone,
    client_id uuid,
    contact_number character varying(50),
    status character varying(50) DEFAULT 'Active'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    employee_id character varying(100),
    territory character varying(255),
    sales_target numeric(15,2),
    commission numeric(5,2)
);


--
-- Name: vgm_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vgm_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    vgm_no character varying(100) NOT NULL,
    export_invoice_id uuid,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    shipper_iec character varying(50),
    shipper_cin character varying(50),
    shipper_registration character varying(100),
    authorized_signatory character varying(255),
    contact_details character varying(255),
    export_invoice_no character varying(50),
    booking_number character varying(100),
    container_type character varying(50) DEFAULT 'Normal'::character varying,
    hazardous_info character varying(100) DEFAULT 'NA'::character varying,
    weighbridge_name character varying(255),
    weighbridge_registration character varying(100),
    weighbridge_address text,
    vgm_method character varying(50) DEFAULT 'Method-1'::character varying,
    containers jsonb DEFAULT '[]'::jsonb,
    total_cargo_weight numeric(15,2) DEFAULT 0,
    total_tare_weight numeric(15,2) DEFAULT 0,
    total_vgm_weight numeric(15,2) DEFAULT 0,
    document_date date,
    notes text,
    invoice_backside_id uuid,
    vessel_name character varying(255),
    port_of_loading character varying(255),
    port_of_discharge character varying(255),
    shipping_bill_no character varying(100),
    shipping_bill_date date,
    is_locked boolean DEFAULT false,
    created_by uuid,
    deleted_at timestamp without time zone,
    has_vgm boolean DEFAULT false,
    gross_weight numeric(15,2),
    client_name character varying(255),
    country character varying(100),
    invoice_date date,
    shipper_name character varying(255),
    voyage_no character varying(100),
    place_of_delivery character varying(255),
    net_weight numeric,
    vgm_date date,
    authorized_person character varying(255),
    max_permissible_weight numeric(15,2) DEFAULT 0,
    weighing_method character varying(100),
    cargo_type character varying(100),
    un_no_imdg character varying(50),
    container_sheet jsonb DEFAULT '[]'::jsonb,
    pi_no character varying(100),
    pl_no character varying(100),
    annexure_no character varying(100),
    weighing_slip_no character varying(100),
    weighing_date character varying(100)
);


--
-- Name: warehouse_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'Active'::character varying,
    company_id uuid NOT NULL,
    created_by uuid
);


--
-- Name: id_counters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_counters ALTER COLUMN id SET DEFAULT nextval('public.id_counters_id_seq'::regclass);


--
-- Name: migrations_applied id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_applied ALTER COLUMN id SET DEFAULT nextval('public.migrations_applied_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: account_entries account_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_entries
    ADD CONSTRAINT account_entries_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bills_of_lading bills_of_lading_company_id_bl_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_of_lading
    ADD CONSTRAINT bills_of_lading_company_id_bl_no_key UNIQUE (company_id, bl_no);


--
-- Name: bills_of_lading bills_of_lading_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_of_lading
    ADD CONSTRAINT bills_of_lading_pkey PRIMARY KEY (id);


--
-- Name: catalogue_products catalogue_products_catalogue_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogue_products
    ADD CONSTRAINT catalogue_products_catalogue_id_product_id_key UNIQUE (catalogue_id, product_id);


--
-- Name: catalogue_products catalogue_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogue_products
    ADD CONSTRAINT catalogue_products_pkey PRIMARY KEY (id);


--
-- Name: catalogues catalogues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogues
    ADD CONSTRAINT catalogues_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_company_id_cert_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_company_id_cert_no_key UNIQUE (company_id, cert_no);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: client_orders client_orders_order_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_order_no_key UNIQUE (company_id, order_no);


--
-- Name: client_orders client_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: companies companies_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_domain_key UNIQUE (domain);


--
-- Name: companies companies_email_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_email_id_key UNIQUE (email_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_subscriptions company_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_subscriptions
    ADD CONSTRAINT company_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_key UNIQUE (code);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: customs_clearance customs_clearance_company_id_clearance_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_clearance
    ADD CONSTRAINT customs_clearance_company_id_clearance_no_key UNIQUE (company_id, clearance_no);


--
-- Name: customs_clearance customs_clearance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_clearance
    ADD CONSTRAINT customs_clearance_pkey PRIMARY KEY (id);


--
-- Name: export_invoice_annexures export_invoice_annexures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoice_annexures
    ADD CONSTRAINT export_invoice_annexures_pkey PRIMARY KEY (id);


--
-- Name: export_invoices export_invoices_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoices
    ADD CONSTRAINT export_invoices_invoice_no_key UNIQUE (company_id, invoice_no);


--
-- Name: export_invoices export_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoices
    ADD CONSTRAINT export_invoices_pkey PRIMARY KEY (id);


--
-- Name: export_workflow export_workflow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_workflow
    ADD CONSTRAINT export_workflow_pkey PRIMARY KEY (id);


--
-- Name: factory_names factory_names_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_names
    ADD CONSTRAINT factory_names_name_key UNIQUE (company_id, name);


--
-- Name: factory_names factory_names_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_names
    ADD CONSTRAINT factory_names_pkey PRIMARY KEY (id);


--
-- Name: final_destinations final_destinations_destination_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_destinations
    ADD CONSTRAINT final_destinations_destination_key UNIQUE (company_id, destination);


--
-- Name: final_destinations final_destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_destinations
    ADD CONSTRAINT final_destinations_pkey PRIMARY KEY (id);


--
-- Name: id_counters id_counters_company_id_prefix_date_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_counters
    ADD CONSTRAINT id_counters_company_id_prefix_date_key_key UNIQUE (company_id, prefix, date_key);


--
-- Name: id_counters id_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_counters
    ADD CONSTRAINT id_counters_pkey PRIMARY KEY (id);


--
-- Name: invoice_backside invoice_backside_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_backside
    ADD CONSTRAINT invoice_backside_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: master_cities master_cities_city_name_country_code_state_province_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_cities
    ADD CONSTRAINT master_cities_city_name_country_code_state_province_key UNIQUE (city_name, country_code, state_province);


--
-- Name: master_cities master_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_cities
    ADD CONSTRAINT master_cities_pkey PRIMARY KEY (id);


--
-- Name: master_countries master_countries_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_countries
    ADD CONSTRAINT master_countries_country_code_key UNIQUE (country_code);


--
-- Name: master_countries master_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_countries
    ADD CONSTRAINT master_countries_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: migrations_applied migrations_applied_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_applied
    ADD CONSTRAINT migrations_applied_filename_key UNIQUE (filename);


--
-- Name: migrations_applied migrations_applied_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations_applied
    ADD CONSTRAINT migrations_applied_pkey PRIMARY KEY (id);


--
-- Name: module_access module_access_company_id_module_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_access
    ADD CONSTRAINT module_access_company_id_module_name_key UNIQUE (company_id, module_name);


--
-- Name: module_access module_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_access
    ADD CONSTRAINT module_access_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: packing_list_lines packing_list_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_list_lines
    ADD CONSTRAINT packing_list_lines_pkey PRIMARY KEY (id);


--
-- Name: packing_lists packing_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_pkey PRIMARY KEY (id);


--
-- Name: pallet_categories pallet_categories_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pallet_categories
    ADD CONSTRAINT pallet_categories_category_key UNIQUE (category);


--
-- Name: pallet_categories pallet_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pallet_categories
    ADD CONSTRAINT pallet_categories_pkey PRIMARY KEY (id);


--
-- Name: pallets pallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pallets
    ADD CONSTRAINT pallets_pkey PRIMARY KEY (id);


--
-- Name: pdf_templates pdf_templates_company_id_template_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_company_id_template_type_key UNIQUE (company_id, template_type);


--
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- Name: ports ports_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_name_key UNIQUE (company_id, name);


--
-- Name: ports_of_discharge ports_of_discharge_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports_of_discharge
    ADD CONSTRAINT ports_of_discharge_name_key UNIQUE (company_id, name);


--
-- Name: ports_of_discharge ports_of_discharge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports_of_discharge
    ADD CONSTRAINT ports_of_discharge_pkey PRIMARY KEY (id);


--
-- Name: ports_of_discharge ports_of_discharge_port_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports_of_discharge
    ADD CONSTRAINT ports_of_discharge_port_name_key UNIQUE (port_name);


--
-- Name: ports_of_loading ports_of_loading_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports_of_loading
    ADD CONSTRAINT ports_of_loading_name_key UNIQUE (company_id, name);


--
-- Name: ports_of_loading ports_of_loading_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports_of_loading
    ADD CONSTRAINT ports_of_loading_pkey PRIMARY KEY (id);


--
-- Name: ports_of_loading ports_of_loading_port_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports_of_loading
    ADD CONSTRAINT ports_of_loading_port_name_key UNIQUE (port_name);


--
-- Name: ports ports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_pkey PRIMARY KEY (id);


--
-- Name: post_shipment_docs post_shipment_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_shipment_docs
    ADD CONSTRAINT post_shipment_docs_pkey PRIMARY KEY (id);


--
-- Name: product_applications product_applications_application_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_applications
    ADD CONSTRAINT product_applications_application_key UNIQUE (application);


--
-- Name: product_applications product_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_applications
    ADD CONSTRAINT product_applications_pkey PRIMARY KEY (id);


--
-- Name: product_sizes product_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_pkey PRIMARY KEY (id);


--
-- Name: product_sizes product_sizes_size_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_size_key UNIQUE (size);


--
-- Name: product_surfaces product_surfaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_surfaces
    ADD CONSTRAINT product_surfaces_pkey PRIMARY KEY (id);


--
-- Name: product_surfaces product_surfaces_surface_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_surfaces
    ADD CONSTRAINT product_surfaces_surface_key UNIQUE (surface);


--
-- Name: product_thickness product_thickness_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_thickness
    ADD CONSTRAINT product_thickness_pkey PRIMARY KEY (id);


--
-- Name: product_thickness product_thickness_thickness_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_thickness
    ADD CONSTRAINT product_thickness_thickness_key UNIQUE (thickness);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: proforma_invoices proforma_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_pkey PRIMARY KEY (id);


--
-- Name: proforma_orders proforma_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_orders
    ADD CONSTRAINT proforma_orders_pkey PRIMARY KEY (id);


--
-- Name: qc_records qc_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_records
    ADD CONSTRAINT qc_records_pkey PRIMARY KEY (id);


--
-- Name: rate_history rate_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_history
    ADD CONSTRAINT rate_history_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: shipping_instructions shipping_instructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_instructions
    ADD CONSTRAINT shipping_instructions_pkey PRIMARY KEY (id);


--
-- Name: shipping_lines shipping_lines_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_lines
    ADD CONSTRAINT shipping_lines_name_key UNIQUE (name);


--
-- Name: shipping_lines shipping_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_lines
    ADD CONSTRAINT shipping_lines_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_code_key UNIQUE (code);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_id_key UNIQUE (email_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: vgm_documents vgm_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vgm_documents
    ADD CONSTRAINT vgm_documents_pkey PRIMARY KEY (id);


--
-- Name: warehouse_locations warehouse_locations_location_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_location_key UNIQUE (location);


--
-- Name: warehouse_locations warehouse_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_pkey PRIMARY KEY (id);


--
-- Name: account_entries_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_entries_company_id_idx ON public.account_entries USING btree (company_id);


--
-- Name: audit_logs_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_company_id_idx ON public.audit_logs USING btree (company_id);


--
-- Name: bills_of_lading_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bills_of_lading_company_id_idx ON public.bills_of_lading USING btree (company_id);


--
-- Name: catalogues_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalogues_company_id_idx ON public.catalogues USING btree (company_id);


--
-- Name: certificates_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certificates_company_id_idx ON public.certificates USING btree (company_id);


--
-- Name: client_orders_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_orders_company_id_idx ON public.client_orders USING btree (company_id);


--
-- Name: clients_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_company_id_idx ON public.clients USING btree (company_id);


--
-- Name: company_subscriptions_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_subscriptions_company_id_idx ON public.company_subscriptions USING btree (company_id);


--
-- Name: currencies_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX currencies_company_id_idx ON public.currencies USING btree (company_id);


--
-- Name: customs_clearance_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customs_clearance_company_id_idx ON public.customs_clearance USING btree (company_id);


--
-- Name: export_invoice_annexures_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_invoice_annexures_company_id_idx ON public.export_invoice_annexures USING btree (company_id);


--
-- Name: export_invoices_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_invoices_company_id_idx ON public.export_invoices USING btree (company_id);


--
-- Name: export_workflow_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_workflow_company_id_idx ON public.export_workflow USING btree (company_id);


--
-- Name: factory_names_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX factory_names_company_id_idx ON public.factory_names USING btree (company_id);


--
-- Name: final_destinations_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX final_destinations_company_id_idx ON public.final_destinations USING btree (company_id);


--
-- Name: id_counters_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX id_counters_company_id_idx ON public.id_counters USING btree (company_id);


--
-- Name: idx_account_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_entries_date ON public.account_entries USING btree (date);


--
-- Name: idx_account_entries_entry_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_entries_entry_type ON public.account_entries USING btree (entry_type);


--
-- Name: idx_account_entries_party_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_entries_party_name ON public.account_entries USING btree (party_name);


--
-- Name: idx_audit_logs_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_company ON public.audit_logs USING btree (company_id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_bills_of_lading_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_of_lading_company ON public.bills_of_lading USING btree (company_id);


--
-- Name: idx_bills_of_lading_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_of_lading_created_at ON public.bills_of_lading USING btree (created_at DESC);


--
-- Name: idx_bills_of_lading_export_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_of_lading_export_invoice ON public.bills_of_lading USING btree (export_invoice_id);


--
-- Name: idx_bills_of_lading_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_of_lading_status ON public.bills_of_lading USING btree (status);


--
-- Name: idx_catalogue_products_catalogue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalogue_products_catalogue ON public.catalogue_products USING btree (catalogue_id);


--
-- Name: idx_catalogue_products_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalogue_products_product ON public.catalogue_products USING btree (product_id);


--
-- Name: idx_catalogues_catalogue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalogues_catalogue_id ON public.catalogues USING btree (catalogue_id);


--
-- Name: idx_certificates_cert_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_cert_type ON public.certificates USING btree (cert_type);


--
-- Name: idx_certificates_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_company ON public.certificates USING btree (company_id);


--
-- Name: idx_certificates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_created_at ON public.certificates USING btree (created_at DESC);


--
-- Name: idx_certificates_export_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_export_invoice ON public.certificates USING btree (export_invoice_id);


--
-- Name: idx_certificates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_status ON public.certificates USING btree (status);


--
-- Name: idx_client_orders_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_orders_client ON public.client_orders USING btree (client_id);


--
-- Name: idx_client_orders_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_orders_company ON public.client_orders USING btree (company_id);


--
-- Name: idx_clients_assigned_salesperson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_assigned_salesperson ON public.clients USING btree (assigned_salesperson);


--
-- Name: idx_clients_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_client_id ON public.clients USING btree (client_id);


--
-- Name: idx_clients_client_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_client_name ON public.clients USING btree (client_name);


--
-- Name: idx_clients_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_company_id ON public.clients USING btree (company_id);


--
-- Name: idx_clients_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_email_id ON public.clients USING btree (email_id);


--
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- Name: idx_customs_clearance_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_clearance_company ON public.customs_clearance USING btree (company_id);


--
-- Name: idx_customs_clearance_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_clearance_created_at ON public.customs_clearance USING btree (created_at DESC);


--
-- Name: idx_customs_clearance_export_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_clearance_export_invoice ON public.customs_clearance USING btree (export_invoice_id);


--
-- Name: idx_customs_clearance_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_clearance_status ON public.customs_clearance USING btree (status);


--
-- Name: idx_export_invoice_annexures_annexure_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoice_annexures_annexure_no ON public.export_invoice_annexures USING btree (annexure_no);


--
-- Name: idx_export_invoice_annexures_annexure_no_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_export_invoice_annexures_annexure_no_unique ON public.export_invoice_annexures USING btree (company_id, annexure_no) WHERE (annexure_no IS NOT NULL);


--
-- Name: idx_export_invoice_annexures_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoice_annexures_company_id ON public.export_invoice_annexures USING btree (company_id);


--
-- Name: idx_export_invoice_annexures_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoice_annexures_deleted_at ON public.export_invoice_annexures USING btree (deleted_at);


--
-- Name: idx_export_invoice_annexures_export_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoice_annexures_export_invoice_id ON public.export_invoice_annexures USING btree (export_invoice_id);


--
-- Name: idx_export_invoice_annexures_invoice_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoice_annexures_invoice_no ON public.export_invoice_annexures USING btree (invoice_no);


--
-- Name: idx_export_invoice_annexures_packing_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoice_annexures_packing_list_id ON public.export_invoice_annexures USING btree (packing_list_id);


--
-- Name: idx_export_invoice_annexures_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoice_annexures_status ON public.export_invoice_annexures USING btree (status);


--
-- Name: idx_export_invoices_booking_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoices_booking_no ON public.export_invoices USING btree (booking_no);


--
-- Name: idx_export_invoices_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoices_client_id ON public.export_invoices USING btree (client_id);


--
-- Name: idx_export_invoices_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoices_company_id ON public.export_invoices USING btree (company_id);


--
-- Name: idx_export_invoices_invoice_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoices_invoice_no ON public.export_invoices USING btree (invoice_no);


--
-- Name: idx_export_invoices_proforma_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_invoices_proforma_invoice_id ON public.export_invoices USING btree (proforma_invoice_id);


--
-- Name: idx_invoice_backside_backside_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invoice_backside_backside_no ON public.invoice_backside USING btree (company_id, backside_no) WHERE (backside_no IS NOT NULL);


--
-- Name: idx_invoice_backside_backside_no_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_backside_backside_no_lookup ON public.invoice_backside USING btree (backside_no);


--
-- Name: idx_invoice_backside_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_backside_company ON public.invoice_backside USING btree (company_id);


--
-- Name: idx_invoice_backside_export_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_backside_export_invoice ON public.invoice_backside USING btree (export_invoice_id);


--
-- Name: idx_invoice_backside_export_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_backside_export_invoice_id ON public.invoice_backside USING btree (export_invoice_id);


--
-- Name: idx_invoice_backside_permission_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_backside_permission_no ON public.invoice_backside USING btree (permission_no);


--
-- Name: idx_leads_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_company_id ON public.leads USING btree (company_id);


--
-- Name: idx_leads_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_company_name ON public.leads USING btree (company_name);


--
-- Name: idx_leads_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_lead_id ON public.leads USING btree (lead_id);


--
-- Name: idx_leads_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_priority ON public.leads USING btree (priority);


--
-- Name: idx_leads_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_source ON public.leads USING btree (source);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_messages_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_recipient_id ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_module_access_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_access_company ON public.module_access USING btree (company_id);


--
-- Name: idx_notifications_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_company ON public.notifications USING btree (company_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_packing_lists_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_company ON public.packing_lists USING btree (company_id);


--
-- Name: idx_packing_lists_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_company_id ON public.packing_lists USING btree (company_id);


--
-- Name: idx_packing_lists_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_created_at ON public.packing_lists USING btree (created_at DESC);


--
-- Name: idx_packing_lists_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_deleted_at ON public.packing_lists USING btree (deleted_at);


--
-- Name: idx_packing_lists_export_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_export_invoice ON public.packing_lists USING btree (export_invoice_id);


--
-- Name: idx_packing_lists_export_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_export_invoice_id ON public.packing_lists USING btree (export_invoice_id);


--
-- Name: idx_packing_lists_packing_list_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_packing_list_date ON public.packing_lists USING btree (packing_list_date);


--
-- Name: idx_packing_lists_packing_list_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_packing_list_no ON public.packing_lists USING btree (packing_list_no);


--
-- Name: idx_packing_lists_proforma_invoice_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_proforma_invoice_no ON public.packing_lists USING btree (proforma_invoice_no);


--
-- Name: idx_packing_lists_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_lists_status ON public.packing_lists USING btree (status);


--
-- Name: idx_pallets_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pallets_company ON public.pallets USING btree (company_id);


--
-- Name: idx_pallets_pallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pallets_pallet_id ON public.pallets USING btree (pallet_id);


--
-- Name: idx_pallets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pallets_status ON public.pallets USING btree (status);


--
-- Name: idx_pdf_templates_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_templates_company ON public.pdf_templates USING btree (company_id);


--
-- Name: idx_products_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_company_id ON public.products USING btree (company_id);


--
-- Name: idx_proforma_invoices_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proforma_invoices_client_id ON public.proforma_invoices USING btree (client_id);


--
-- Name: idx_proforma_invoices_client_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proforma_invoices_client_name ON public.proforma_invoices USING btree (client_name);


--
-- Name: idx_proforma_invoices_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proforma_invoices_company_id ON public.proforma_invoices USING btree (company_id);


--
-- Name: idx_proforma_invoices_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proforma_invoices_date ON public.proforma_invoices USING btree (date);


--
-- Name: idx_proforma_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proforma_orders_date ON public.proforma_orders USING btree (date);


--
-- Name: idx_proforma_orders_qc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proforma_orders_qc_status ON public.proforma_orders USING btree (qc_status);


--
-- Name: idx_proforma_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proforma_orders_status ON public.proforma_orders USING btree (status);


--
-- Name: idx_qc_records_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_records_order_id ON public.qc_records USING btree (order_id);


--
-- Name: idx_qc_records_qc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_records_qc_id ON public.qc_records USING btree (qc_id);


--
-- Name: idx_qc_records_qc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_records_qc_status ON public.qc_records USING btree (qc_status);


--
-- Name: idx_rate_history_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_history_company ON public.rate_history USING btree (company_id);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_shipping_instr_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_instr_booking ON public.shipping_instructions USING btree (booking_no);


--
-- Name: idx_shipping_instr_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_instr_company ON public.shipping_instructions USING btree (company_id);


--
-- Name: idx_shipping_instr_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_instr_deleted ON public.shipping_instructions USING btree (deleted_at);


--
-- Name: idx_shipping_instr_export_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_instr_export_invoice ON public.shipping_instructions USING btree (export_invoice_id);


--
-- Name: idx_shipping_instr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_instr_status ON public.shipping_instructions USING btree (status);


--
-- Name: idx_shipping_instr_vessel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_instr_vessel ON public.shipping_instructions USING btree (vessel_name);


--
-- Name: idx_shipping_instr_vgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_instr_vgm ON public.shipping_instructions USING btree (vgm_id);


--
-- Name: idx_suppliers_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_company_id ON public.suppliers USING btree (company_id);


--
-- Name: idx_suppliers_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_supplier_id ON public.suppliers USING btree (supplier_id);


--
-- Name: idx_users_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);


--
-- Name: idx_vgm_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vgm_company ON public.vgm_documents USING btree (company_id);


--
-- Name: idx_vgm_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vgm_created_at ON public.vgm_documents USING btree (created_at DESC);


--
-- Name: idx_vgm_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vgm_deleted_at ON public.vgm_documents USING btree (deleted_at);


--
-- Name: idx_vgm_documents_vgm_no_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vgm_documents_vgm_no_unique ON public.vgm_documents USING btree (company_id, vgm_no) WHERE (deleted_at IS NULL);


--
-- Name: idx_vgm_export_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vgm_export_invoice ON public.vgm_documents USING btree (export_invoice_id);


--
-- Name: idx_vgm_export_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vgm_export_invoice_id ON public.vgm_documents USING btree (export_invoice_id);


--
-- Name: idx_vgm_is_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vgm_is_locked ON public.vgm_documents USING btree (is_locked);


--
-- Name: idx_vgm_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vgm_status ON public.vgm_documents USING btree (status);


--
-- Name: invoice_backside_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_backside_company_id_idx ON public.invoice_backside USING btree (company_id);


--
-- Name: leads_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_company_id_idx ON public.leads USING btree (company_id);


--
-- Name: master_cities_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX master_cities_company_id_idx ON public.master_cities USING btree (company_id);


--
-- Name: master_countries_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX master_countries_company_id_idx ON public.master_countries USING btree (company_id);


--
-- Name: module_access_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX module_access_company_id_idx ON public.module_access USING btree (company_id);


--
-- Name: notifications_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_company_id_idx ON public.notifications USING btree (company_id);


--
-- Name: packing_lists_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX packing_lists_company_id_idx ON public.packing_lists USING btree (company_id);


--
-- Name: pallet_categories_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pallet_categories_company_id_idx ON public.pallet_categories USING btree (company_id);


--
-- Name: pallets_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pallets_company_id_idx ON public.pallets USING btree (company_id);


--
-- Name: pdf_templates_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pdf_templates_company_id_idx ON public.pdf_templates USING btree (company_id);


--
-- Name: ports_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ports_company_id_idx ON public.ports USING btree (company_id);


--
-- Name: ports_of_discharge_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ports_of_discharge_company_id_idx ON public.ports_of_discharge USING btree (company_id);


--
-- Name: ports_of_loading_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ports_of_loading_company_id_idx ON public.ports_of_loading USING btree (company_id);


--
-- Name: post_shipment_docs_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_shipment_docs_company_id_idx ON public.post_shipment_docs USING btree (company_id);


--
-- Name: product_applications_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_applications_company_id_idx ON public.product_applications USING btree (company_id);


--
-- Name: product_sizes_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_sizes_company_id_idx ON public.product_sizes USING btree (company_id);


--
-- Name: product_surfaces_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_surfaces_company_id_idx ON public.product_surfaces USING btree (company_id);


--
-- Name: product_thickness_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_thickness_company_id_idx ON public.product_thickness USING btree (company_id);


--
-- Name: products_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_company_id_idx ON public.products USING btree (company_id);


--
-- Name: proforma_invoices_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proforma_invoices_company_id_idx ON public.proforma_invoices USING btree (company_id);


--
-- Name: proforma_orders_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proforma_orders_company_id_idx ON public.proforma_orders USING btree (company_id);


--
-- Name: qc_records_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX qc_records_company_id_idx ON public.qc_records USING btree (company_id);


--
-- Name: rate_history_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rate_history_company_id_idx ON public.rate_history USING btree (company_id);


--
-- Name: shipping_instructions_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shipping_instructions_company_id_idx ON public.shipping_instructions USING btree (company_id);


--
-- Name: shipping_lines_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shipping_lines_company_id_idx ON public.shipping_lines USING btree (company_id);


--
-- Name: suppliers_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_company_id_idx ON public.suppliers USING btree (company_id);


--
-- Name: support_tickets_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_company_id_idx ON public.support_tickets USING btree (company_id);


--
-- Name: users_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_company_id_idx ON public.users USING btree (company_id);


--
-- Name: vgm_documents_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vgm_documents_company_id_idx ON public.vgm_documents USING btree (company_id);


--
-- Name: warehouse_locations_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warehouse_locations_company_id_idx ON public.warehouse_locations USING btree (company_id);


--
-- Name: account_entries account_entries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_entries
    ADD CONSTRAINT account_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: bills_of_lading bills_of_lading_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_of_lading
    ADD CONSTRAINT bills_of_lading_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: bills_of_lading bills_of_lading_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_of_lading
    -- Removed foreign key: created_by


--
-- Name: bills_of_lading bills_of_lading_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_of_lading
    ADD CONSTRAINT bills_of_lading_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id);


--
-- Name: catalogue_products catalogue_products_catalogue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogue_products
    ADD CONSTRAINT catalogue_products_catalogue_id_fkey FOREIGN KEY (catalogue_id) REFERENCES public.catalogues(id) ON DELETE CASCADE;


--
-- Name: catalogue_products catalogue_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogue_products
    ADD CONSTRAINT catalogue_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: catalogues catalogues_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogues
    ADD CONSTRAINT catalogues_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    -- Removed foreign key: created_by


--
-- Name: certificates certificates_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id);


--
-- Name: client_orders client_orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: client_orders client_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: clients clients_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_subscriptions company_subscriptions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_subscriptions
    ADD CONSTRAINT company_subscriptions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_subscriptions company_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_subscriptions
    ADD CONSTRAINT company_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: customs_clearance customs_clearance_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_clearance
    ADD CONSTRAINT customs_clearance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: customs_clearance customs_clearance_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_clearance
    -- Removed foreign key: created_by


--
-- Name: customs_clearance customs_clearance_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_clearance
    ADD CONSTRAINT customs_clearance_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id);


--
-- Name: export_invoice_annexures export_invoice_annexures_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoice_annexures
    ADD CONSTRAINT export_invoice_annexures_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: export_invoice_annexures export_invoice_annexures_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoice_annexures
    ADD CONSTRAINT export_invoice_annexures_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id) ON DELETE CASCADE;


--
-- Name: export_invoice_annexures export_invoice_annexures_packing_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoice_annexures
    ADD CONSTRAINT export_invoice_annexures_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES public.packing_lists(id);


--
-- Name: export_invoices export_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoices
    ADD CONSTRAINT export_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: export_invoices export_invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoices
    ADD CONSTRAINT export_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: export_workflow export_workflow_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_workflow
    ADD CONSTRAINT export_workflow_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: export_workflow export_workflow_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_workflow
    ADD CONSTRAINT export_workflow_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id) ON DELETE CASCADE;


--
-- Name: id_counters id_counters_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_counters
    ADD CONSTRAINT id_counters_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: invoice_backside invoice_backside_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_backside
    ADD CONSTRAINT invoice_backside_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: invoice_backside invoice_backside_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_backside
    -- Removed foreign key: created_by


--
-- Name: invoice_backside invoice_backside_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_backside
    ADD CONSTRAINT invoice_backside_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id);


--
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    -- Removed foreign key reference to users table


--
-- Name: leads leads_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: master_cities master_cities_country_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_cities
    ADD CONSTRAINT master_cities_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.master_countries(country_code);


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    -- Removed foreign key reference to users table


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    -- Removed foreign key reference to users table


--
-- Name: module_access module_access_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_access
    ADD CONSTRAINT module_access_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    -- Removed foreign key reference to users table


--
-- Name: packing_list_lines packing_list_lines_packing_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_list_lines
    ADD CONSTRAINT packing_list_lines_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES public.packing_lists(id) ON DELETE CASCADE;


--
-- Name: packing_lists packing_lists_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: packing_lists packing_lists_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id);


--
-- Name: pallets pallets_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pallets
    ADD CONSTRAINT pallets_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: pdf_templates pdf_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: post_shipment_docs post_shipment_docs_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_shipment_docs
    ADD CONSTRAINT post_shipment_docs_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id);


--
-- Name: products products_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: products products_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    -- Removed foreign key: created_by


--
-- Name: proforma_invoices proforma_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: proforma_invoices proforma_invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: proforma_orders proforma_orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_orders
    ADD CONSTRAINT proforma_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: proforma_orders proforma_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_orders
    ADD CONSTRAINT proforma_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: proforma_orders proforma_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_orders
    ADD CONSTRAINT proforma_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: qc_records qc_records_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_records
    ADD CONSTRAINT qc_records_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: qc_records qc_records_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_records
    -- Removed foreign key reference to users table


--
-- Name: qc_records qc_records_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_records
    ADD CONSTRAINT qc_records_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: rate_history rate_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_history
    ADD CONSTRAINT rate_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    -- Removed foreign key reference to users table


--
-- Name: shipping_instructions shipping_instructions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_instructions
    ADD CONSTRAINT shipping_instructions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: shipping_instructions shipping_instructions_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_instructions
    ADD CONSTRAINT shipping_instructions_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id);


--
-- Name: shipping_instructions shipping_instructions_invoice_backside_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_instructions
    ADD CONSTRAINT shipping_instructions_invoice_backside_id_fkey FOREIGN KEY (invoice_backside_id) REFERENCES public.invoice_backside(id) ON DELETE SET NULL;


--
-- Name: shipping_instructions shipping_instructions_packing_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_instructions
    ADD CONSTRAINT shipping_instructions_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES public.packing_lists(id) ON DELETE SET NULL;


--
-- Name: shipping_instructions shipping_instructions_vgm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_instructions
    ADD CONSTRAINT shipping_instructions_vgm_id_fkey FOREIGN KEY (vgm_id) REFERENCES public.vgm_documents(id) ON DELETE SET NULL;


--
-- Name: suppliers suppliers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    -- Removed foreign key reference to users table


--
-- Name: ticket_comments ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_comments ticket_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    -- Removed foreign key reference to users table


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: vgm_documents vgm_documents_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vgm_documents
    ADD CONSTRAINT vgm_documents_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: vgm_documents vgm_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vgm_documents
    -- Removed foreign key: created_by


--
-- Name: vgm_documents vgm_documents_export_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vgm_documents
    ADD CONSTRAINT vgm_documents_export_invoice_id_fkey FOREIGN KEY (export_invoice_id) REFERENCES public.export_invoices(id) ON DELETE CASCADE;


--
-- Name: account_entries account_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_entries
    -- Removed foreign key: created_by

--
-- Name: export_invoices export_invoices_proforma_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoices
    ADD CONSTRAINT export_invoices_proforma_invoice_id_fkey FOREIGN KEY (proforma_invoice_id) REFERENCES public.proforma_invoices(id);

--
-- Name: export_invoices export_invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_invoices
    ADD CONSTRAINT export_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.proforma_orders(id);

--
-- Name: qc_records qc_records_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_records
    ADD CONSTRAINT qc_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.proforma_orders(id);

--
-- Name: vgm_documents vgm_documents_invoice_backside_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vgm_documents
    ADD CONSTRAINT vgm_documents_invoice_backside_id_fkey FOREIGN KEY (invoice_backside_id) REFERENCES public.invoice_backside(id) ON DELETE SET NULL;

--
-- Name: proforma_invoices proforma_invoices_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_invoice_no_key UNIQUE (company_id, invoice_no);

--
-- Name: proforma_orders proforma_orders_order_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proforma_orders
    ADD CONSTRAINT proforma_orders_order_no_key UNIQUE (company_id, order_no);

--
-- Name: qc_records qc_records_qc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_records
    ADD CONSTRAINT qc_records_qc_id_key UNIQUE (company_id, qc_id);


--
-- Name: size_packing_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.size_packing_master (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    size character varying(100) NOT NULL,
    box_pcs integer DEFAULT 0,
    sqm_per_box numeric(10,4) DEFAULT 0,
    boxes_per_pallet integer DEFAULT 0,
    boxes_per_kathli integer DEFAULT 0,
    per_box_weight numeric(10,4) DEFAULT 0,
    per_pallet_weight numeric(10,4) DEFAULT 0,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);

--
-- Name: size_packing_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_packing_master
    ADD CONSTRAINT size_packing_master_pkey PRIMARY KEY (id);

--
-- Name: size_packing_master_company_size_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_packing_master
    ADD CONSTRAINT size_packing_master_company_size_key UNIQUE (company_id, size);

--
-- PostgreSQL database dump complete
--

\unrestrict Bg5pYb9AtE04h0M6z7lROFeNSeQsBrFRrWw2Tab9YF05Cc92BwiUxIlVdsbMnYc



-- ==========================================
-- Base System Data Seed
-- ==========================================
INSERT INTO companies (name, domain, status) VALUES ('Main Company', 'main.com', 'Active');
INSERT INTO subscription_plans (name, code, price_monthly, features, max_users) VALUES ('Enterprise', 'enterprise', 999.00, '{"all": true}', 999);


-- ==========================================
-- Schema Patch: Missing master-data tables
-- (Added 2026-05-19 - required by masterDataController TABLE_MAPPING)
-- ==========================================

-- Pallet types
CREATE TABLE IF NOT EXISTS public.pallet_types (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    type       TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Tiles back marking
CREATE TABLE IF NOT EXISTS public.tiles_back_marking (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    marking    TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Boxes marking
CREATE TABLE IF NOT EXISTS public.boxes_marking (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    marking    TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Box types
CREATE TABLE IF NOT EXISTS public.box_types (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    type       TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Delivery terms
CREATE TABLE IF NOT EXISTS public.delivery_terms (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    term       TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Payment terms
CREATE TABLE IF NOT EXISTS public.payment_terms (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    term       TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Tariff codes
CREATE TABLE IF NOT EXISTS public.tariff_codes (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    code       TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Pre-carriage by
CREATE TABLE IF NOT EXISTS public.pre_carriage_by (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    name       TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Authorized signatories
CREATE TABLE IF NOT EXISTS public.authorized_signatories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID,
    name        TEXT         NOT NULL,
    designation VARCHAR(255),
    status      VARCHAR(20)  DEFAULT 'Active',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by  UUID
);

-- Contact details
CREATE TABLE IF NOT EXISTS public.contact_details (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    detail     TEXT         NOT NULL,
    status     VARCHAR(20)  DEFAULT 'Active',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Max permissible weights
CREATE TABLE IF NOT EXISTS public.max_permissible_weights (
    id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    weight     NUMERIC(15,2)   NOT NULL,
    status     VARCHAR(20)     DEFAULT 'Active',
    created_at TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);


-- ==========================================
-- Schema Patch: Missing columns on existing tables
-- ==========================================

-- client_orders
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS product_lines    JSONB        DEFAULT '[]';
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS shipping_address  TEXT;
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS country           VARCHAR(100);
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS created_by        UUID;

-- proforma_invoices
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS currency          VARCHAR(50)    DEFAULT 'INR';
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS pre_carriage_by   VARCHAR(255);
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS place_of_receipt   VARCHAR(255);
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS bl_no              VARCHAR(100);
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS bl_date            DATE;
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS vessel_flight_no   VARCHAR(100);
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS sb_no              VARCHAR(100);
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS sb_date            DATE;
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS exchange_rate      NUMERIC(15,6)  DEFAULT 1.0;
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS is_used            BOOLEAN        DEFAULT false;

-- proforma_invoice_lines
ALTER TABLE public.proforma_invoice_lines ADD COLUMN IF NOT EXISTS description TEXT;

-- export_invoices
ALTER TABLE public.export_invoices ADD COLUMN IF NOT EXISTS supply_declaration        TEXT;
ALTER TABLE public.export_invoices ADD COLUMN IF NOT EXISTS ftp_incentive_declaration TEXT;

-- igst_invoices
ALTER TABLE public.igst_invoices ADD COLUMN IF NOT EXISTS delivery_terms             VARCHAR(255);
ALTER TABLE public.igst_invoices ADD COLUMN IF NOT EXISTS supply_declaration         TEXT;
ALTER TABLE public.igst_invoices ADD COLUMN IF NOT EXISTS ftp_incentive_declaration  TEXT;

-- Drop stale FK constraints that block cross-DB user references
ALTER TABLE public.proforma_invoices DROP CONSTRAINT IF EXISTS proforma_invoices_created_by_fkey;
ALTER TABLE public.igst_invoices      DROP CONSTRAINT IF EXISTS igst_invoices_created_by_fkey;


-- ==========================================
-- Schema Patch: Workflow tracking columns
-- (20260517_add_workflow_columns migration)
-- ==========================================

ALTER TABLE public.proforma_invoices
  ADD COLUMN IF NOT EXISTS is_converted       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID         NULL,
  ADD COLUMN IF NOT EXISTS document_status    VARCHAR(50)  DEFAULT 'Draft';

ALTER TABLE public.export_invoices
  ADD COLUMN IF NOT EXISTS is_used            BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID         NULL,
  ADD COLUMN IF NOT EXISTS document_status    VARCHAR(50)  DEFAULT 'Draft';

ALTER TABLE public.packing_lists
  ADD COLUMN IF NOT EXISTS is_used            BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID         NULL,
  ADD COLUMN IF NOT EXISTS document_status    VARCHAR(50)  DEFAULT 'Draft';

ALTER TABLE public.export_invoice_annexures
  ADD COLUMN IF NOT EXISTS is_used            BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID         NULL,
  ADD COLUMN IF NOT EXISTS document_status    VARCHAR(50)  DEFAULT 'Draft';

ALTER TABLE public.invoice_backside
  ADD COLUMN IF NOT EXISTS is_used            BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID         NULL,
  ADD COLUMN IF NOT EXISTS document_status    VARCHAR(50)  DEFAULT 'Draft';

ALTER TABLE public.vgm_documents
  ADD COLUMN IF NOT EXISTS is_used            BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID         NULL,
  ADD COLUMN IF NOT EXISTS document_status    VARCHAR(50)  DEFAULT 'Draft';

ALTER TABLE public.shipping_instructions
  ADD COLUMN IF NOT EXISTS is_used            BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_document_id UUID         NULL,
  ADD COLUMN IF NOT EXISTS document_status    VARCHAR(50)  DEFAULT 'Draft';

-- 1. Chart of Accounts System
CREATE TABLE IF NOT EXISTS public.account_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    code varchar(50) UNIQUE NOT NULL,
    type varchar(100) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    description text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.master_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    group_id uuid REFERENCES public.account_groups(id),
    name varchar(255) NOT NULL,
    code varchar(50),
    description text,
    is_system_account boolean DEFAULT false,
    status varchar(50) DEFAULT 'Active',
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ledger System
CREATE TABLE IF NOT EXISTS public.general_ledger (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    account_id uuid REFERENCES public.master_accounts(id),
    transaction_date date NOT NULL,
    voucher_type varchar(100) NOT NULL, -- Sales, Purchase, Receipt, Payment, Journal
    voucher_ref varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    running_balance numeric(15, 2) DEFAULT 0,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    notes text,
    is_locked boolean DEFAULT false,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.customer_ledgers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    voucher_type varchar(100) NOT NULL,
    voucher_ref varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    running_balance numeric(15, 2) DEFAULT 0,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    notes text,
    is_reconciled boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.supplier_ledgers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    voucher_type varchar(100) NOT NULL,
    voucher_ref varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    running_balance numeric(15, 2) DEFAULT 0,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    notes text,
    is_reconciled boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payment Architecture
CREATE TABLE IF NOT EXISTS public.payment_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    payment_no varchar(100) NOT NULL,
    payment_date date NOT NULL,
    client_id uuid REFERENCES public.clients(id),
    supplier_id uuid REFERENCES public.suppliers(id),
    account_id uuid REFERENCES public.master_accounts(id), -- Bank or Cash account
    amount numeric(15, 2) NOT NULL,
    currency varchar(10) DEFAULT 'INR',
    exchange_rate numeric(10, 4) DEFAULT 1,
    payment_method varchar(100),
    reference_no varchar(100),
    status varchar(50) DEFAULT 'Pending', -- Pending, Reconciled, Bounced, Cancelled
    notes text,
    created_by uuid,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id uuid REFERENCES public.payment_entries(id) ON DELETE CASCADE,
    invoice_id uuid,
    invoice_type varchar(100),
    allocated_amount numeric(15, 2) NOT NULL,
    notes text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    account_id uuid REFERENCES public.master_accounts(id),
    transaction_date date NOT NULL,
    description text,
    reference varchar(100),
    debit numeric(15, 2) DEFAULT 0,
    credit numeric(15, 2) DEFAULT 0,
    balance numeric(15, 2) DEFAULT 0,
    is_reconciled boolean DEFAULT false,
    reconciled_payment_id uuid REFERENCES public.payment_entries(id),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_general_ledger_company_account ON public.general_ledger(company_id, account_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledgers_client ON public.customer_ledgers(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledgers_supplier ON public.supplier_ledgers(company_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_entries_company ON public.payment_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON public.payment_allocations(invoice_id);

-- Insert default account groups
INSERT INTO public.account_groups (name, code, type, description) VALUES
('Current Assets', 'CA', 'Asset', 'Cash, bank balances, inventory, receivables'),
('Fixed Assets', 'FA', 'Asset', 'Long-term assets'),
('Current Liabilities', 'CL', 'Liability', 'Payables, short-term debt'),
('Long Term Liabilities', 'LTL', 'Liability', 'Long-term debt'),
('Equity', 'EQ', 'Equity', 'Capital and retained earnings'),
('Operating Revenue', 'OR', 'Revenue', 'Sales revenue'),
('Other Income', 'OI', 'Revenue', 'Forex gain, interest income'),
('Direct Expenses', 'DE', 'Expense', 'Cost of goods sold, duties'),
('Indirect Expenses', 'IE', 'Expense', 'Admin and selling expenses')
ON CONFLICT (code) DO NOTHING;

-- Adding is_locked to document tables
ALTER TABLE public.proforma_invoices ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.proforma_orders ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.export_invoice_annexures ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.packing_lists ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.igst_invoices ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;


--
-- Name: export_document_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_document_lock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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

ALTER TABLE ONLY public.export_document_lock
    ADD CONSTRAINT export_document_lock_pkey PRIMARY KEY (id);

CREATE INDEX idx_export_document_lock_company_id ON public.export_document_lock USING btree (company_id);
CREATE INDEX idx_export_document_lock_exp_no ON public.export_document_lock USING btree (exp_no);
CREATE INDEX idx_export_document_lock_document_id ON public.export_document_lock USING btree (document_id);

