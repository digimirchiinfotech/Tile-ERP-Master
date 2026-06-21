/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import pg from 'pg';
import env from '../config/env.js';
import { masterQuery } from '../config/masterDatabase.js';
import { debugLogger } from './debugLogger.js';
import { decrypt } from './encryption.js';

const { Pool } = pg;

export const provisionCompanyDatabase = async (company) => {
  const { db_name, db_user, db_password } = company;
  debugLogger.info('DatabaseProvisioning', `Provisioning database for ${company.name}: ${db_name}`);

  // Decrypt password if it is encrypted (contains a colon)
  let actualPassword = db_password;
  if (db_password && db_password.includes(':')) {
    try {
      const decrypted = decrypt(db_password);
      if (decrypted) actualPassword = decrypted;
    } catch (e) {
      debugLogger.error('DatabaseProvisioning', `Failed to decrypt password for database user ${db_user}`);
    }
  }

  // 1. Create the database in PostgreSQL (must be done from a connection to another DB, usually 'postgres')
  const rootPool = new Pool({
    host: env.database.host || 'localhost',
    port: parseInt(env.database.port || '5432', 10),
    database: 'postgres',
    user: env.database.user || 'postgres',
    password: env.database.password || ''
  });

  try {
    // Check if DB exists
    const dbCheck = await rootPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [db_name]);
    if (dbCheck.rows.length === 0) {
      // Create DB (can't use parameters for CREATE DATABASE)
      await rootPool.query(`CREATE DATABASE ${db_name}`);
      console.log(`Database ${db_name} created successfully.`);

      // Create User if not exists, or update password if it does
      const userCheck = await rootPool.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [db_user]);
      if (userCheck.rows.length === 0) {
        await rootPool.query(`CREATE USER ${db_user} WITH PASSWORD '${actualPassword}'`);
        console.log(`User ${db_user} created successfully.`);
      } else {
        await rootPool.query(`ALTER USER ${db_user} WITH PASSWORD '${actualPassword}'`);
        console.log(`User ${db_user} password updated successfully.`);
      }

      // Grant privileges
      await rootPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO ${db_user}`);
      
      // Set owner (PostgreSQL 15+ requirement for public schema access)
      await rootPool.query(`ALTER DATABASE ${db_name} OWNER TO ${db_user}`);
      debugLogger.success('DatabaseProvisioning', `Database ${db_name} created and owner set to ${db_user}.`);
    } else {
      // Update existing database user's password to ensure it matches
      const userCheck = await rootPool.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [db_user]);
      if (userCheck.rows.length > 0) {
        await rootPool.query(`ALTER USER ${db_user} WITH PASSWORD '${actualPassword}'`);
        console.log(`User ${db_user} password synced for existing database.`);
      }
      debugLogger.info('DatabaseProvisioning', `Database ${db_name} already exists.`);
    }
  } catch (err) {
    debugLogger.error('DatabaseProvisioning', `Error creating database ${db_name}:`, err);
    throw err;
  } finally {
    await rootPool.end();
  }

  // 2. Setup extensions as root (requires superuser)
  const setupPool = new Pool({
    host: env.database.host || 'localhost',
    port: parseInt(env.database.port || '5432', 10),
    database: db_name,
    user: env.database.user || 'postgres',
    password: env.database.password || ''
  });

  try {
    await setupPool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await setupPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await setupPool.query(`GRANT ALL ON SCHEMA public TO ${db_user}`);
    debugLogger.success('DatabaseProvisioning', `Extensions and schema permissions setup successfully for ${db_name}.`);
  } catch (err) {
    debugLogger.error('DatabaseProvisioning', `Error setting up extensions for ${db_name}:`, err);
  } finally {
    await setupPool.end();
  }

  // 3. Run schema migrations on the new database as the company user
  const companyPool = new Pool({
    host: env.database.host || 'localhost',
    port: parseInt(env.database.port || '5432', 10),
    database: db_name,
    user: db_user,
    password: actualPassword
  });

  try {
    
    // Create necessary tables
    await companyPool.query(`      -- Users table (full schema for tenant DB compatibility)
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255),
        email_id VARCHAR(255) UNIQUE,
        username VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255),
        contact_number VARCHAR(50),
        role VARCHAR(50) DEFAULT 'staff',
        department VARCHAR(100),
        designation VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        permissions JSONB DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        avatar_url VARCHAR(255),
        last_login TIMESTAMP,
        employee_id VARCHAR(50),
        territory VARCHAR(100),
        sales_target DECIMAL(15,2),
        commission DECIMAL(5,2),
        must_change_password BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- Clients table
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        client_id VARCHAR(100),
        name VARCHAR(255),
        client_name VARCHAR(255),
        contact_person_name VARCHAR(255),
        email VARCHAR(255),
        email_id VARCHAR(255),
        contact_number VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        business_type VARCHAR(100),
        credit_limit NUMERIC DEFAULT 0,
        credit_days INTEGER DEFAULT 0,
        assigned_salesperson UUID,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        consignee_details TEXT,
        buyer_details TEXT,
        port_of_loading VARCHAR(255) DEFAULT 'MUNDRA PORT',
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        currency VARCHAR(10) DEFAULT 'INR',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Client Orders table
      CREATE TABLE IF NOT EXISTS client_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        client_id UUID,
        order_no VARCHAR(100) NOT NULL,
        invoice_ref VARCHAR(100),
        date DATE,
        total_amount NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending',
        payment_status VARCHAR(50) DEFAULT 'Unpaid',
        delivery_status VARCHAR(50) DEFAULT 'Pending',
        expected_delivery DATE,
        tracking_number VARCHAR(100),
        product_lines JSONB DEFAULT '[]'::jsonb,
        shipping_address TEXT,
        country VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Suppliers table
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        supplier_id VARCHAR(100),
        name VARCHAR(255),
        contact_person_name VARCHAR(255),
        email_id VARCHAR(255),
        contact_number VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        product_categories JSONB DEFAULT '[]',
        payment_terms VARCHAR(255),
        quality_rating VARCHAR(50),
        gstn VARCHAR(50),
        pan VARCHAR(20),
        bank_details JSONB,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        lead_time VARCHAR(100),
        website VARCHAR(255),
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        product_code VARCHAR(100),
        item_ref VARCHAR(100),
        name VARCHAR(255),
        category VARCHAR(100),
        sku VARCHAR(100),
        description TEXT,
        size VARCHAR(100),
        surface VARCHAR(100),
        thickness VARCHAR(50),
        application VARCHAR(100),
        hs_code VARCHAR(50),
        box_pcs INTEGER,
        box_weight NUMERIC(10,2),
        sqm_per_box NUMERIC,
        boxes_per_pallet INTEGER,
        factory_price NUMERIC(10,2),
        factory_name VARCHAR(255),
        factory_product_name VARCHAR(255),
        company_product_name VARCHAR(255),
        catalogue_name VARCHAR(255),
        default_boxes_per_kathali INTEGER,
        default_per_box_weight NUMERIC,
        default_per_pallet_weight NUMERIC,
        base_price NUMERIC,
        margin NUMERIC,
        selling_price NUMERIC,
        status VARCHAR(50) DEFAULT 'Active',
        images JSONB DEFAULT '[]',
        pdfs JSONB DEFAULT '[]',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Sanitaryware Products table
      CREATE TABLE IF NOT EXISTS sanitaryware_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        product_code VARCHAR(100) NOT NULL,
        item_ref VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        brand VARCHAR(100),
        collection VARCHAR(100),
        color VARCHAR(100),
        material_type VARCHAR(100),
        shape VARCHAR(100),
        flush_type VARCHAR(100),
        trap_type VARCHAR(100),
        mount_type VARCHAR(100),
        seat_cover_type VARCHAR(100),
        finish_type VARCHAR(100),
        dimension_standard VARCHAR(100),
        dimensions_l NUMERIC,
        dimensions_w NUMERIC,
        dimensions_h NUMERIC,
        weight_per_piece NUMERIC DEFAULT 0,
        pcs_per_box INTEGER DEFAULT 1,
        box_pcs INTEGER DEFAULT 1,
        box_weight NUMERIC DEFAULT 0,
        factory_price NUMERIC(15,2) DEFAULT 0,
        selling_price NUMERIC(15,2) DEFAULT 0,
        base_price NUMERIC(15,2) DEFAULT 0,
        margin NUMERIC(15,2) DEFAULT 0,
        hsn_code VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        factory_name VARCHAR(255),
        factory_product_name VARCHAR(255),
        factory_product_code VARCHAR(255),
        catalogue_name VARCHAR(255),
        images JSONB DEFAULT '[]'::jsonb,
        pdfs JSONB DEFAULT '[]'::jsonb,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, product_code)
      );      -- Catalogues table
      CREATE TABLE IF NOT EXISTS catalogues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        catalogue_id VARCHAR(100),
        name VARCHAR(255),
        description TEXT,
        cover_image_path TEXT,
        pdf_file_path TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Catalogue Products table
      CREATE TABLE IF NOT EXISTS catalogue_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalogue_id UUID NOT NULL REFERENCES catalogues(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        product_type VARCHAR(20) NOT NULL DEFAULT 'tile',
        display_order INTEGER,
        custom_price NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Leads table
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        lead_id VARCHAR(100),
        name VARCHAR(255),
        company_name VARCHAR(255),
        contact_person_name VARCHAR(255),
        email_id VARCHAR(255),
        contact_number VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        source VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'new',
        product_interest TEXT,
        expected_value NUMERIC,
        timeline VARCHAR(100),
        notes TEXT,
        other_instructions TEXT,
        booking_no VARCHAR(100),
        lut_date DATE,
        net_weight NUMERIC,
        gross_weight NUMERIC,
        order_id UUID,
        proforma_order_id UUID,
        assigned_to UUID,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- ID Counters table
      CREATE TABLE IF NOT EXISTS id_counters (
        id SERIAL PRIMARY KEY,
        company_id UUID NOT NULL,
        prefix VARCHAR(20) NOT NULL,
        date_key VARCHAR(20) NOT NULL,
        counter INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, prefix, date_key)
      );      -- Master Data Tables
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS product_sizes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        size VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS product_surfaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        surface VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS product_thickness (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        thickness VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS product_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        application VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS factory_names (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS shipping_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS currencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        code VARCHAR(10) NOT NULL,
        symbol VARCHAR(10),
        name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS pallet_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS warehouse_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) DEFAULT 'Warehouse',
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'Active',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(company_id, name)
      );

      CREATE TABLE IF NOT EXISTS final_destinations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        destination VARCHAR(255) NOT NULL,
        country VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS ports_of_loading (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS ports_of_discharge (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS master_cities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        city_name VARCHAR(255) NOT NULL,
        country_code VARCHAR(10),
        state_province VARCHAR(255),
        latitude NUMERIC,
        longitude NUMERIC,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_countries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        country_code VARCHAR(10) NOT NULL,
        country_name VARCHAR(255) NOT NULL,
        region VARCHAR(100),
        iso_alpha_2 VARCHAR(2),
        iso_alpha_3 VARCHAR(3),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255) NOT NULL,
        country VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payment_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        term TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS delivery_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        term TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );

      CREATE TABLE IF NOT EXISTS tariff_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      );      -- Module Access table
      CREATE TABLE IF NOT EXISTS module_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        is_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- Audit Logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        user_id UUID,
        action VARCHAR(100),
        resource_type VARCHAR(100),
        resource_id UUID,
        changes JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        notification_type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        redirect_url VARCHAR(500),
        module VARCHAR(100),
        reference_id UUID,
        reference_type VARCHAR(100),
        reference_no VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'normal',
        role_id VARCHAR(50),
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Account Entries table
      CREATE TABLE IF NOT EXISTS account_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        entry_no VARCHAR(100),
        type VARCHAR(50),
        amount NUMERIC(15,2),
        date DATE,
        entry_type VARCHAR(50),
        party_name VARCHAR(255),
        payment_method VARCHAR(100),
        invoice_ref VARCHAR(100),
        po_ref VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        due_date DATE,
        notes TEXT,
        created_by UUID ,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- Proforma Invoices table
      CREATE TABLE IF NOT EXISTS proforma_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        invoice_no VARCHAR(100),
        date DATE,
        client_id UUID REFERENCES clients(id),
        client_name VARCHAR(255),
        country VARCHAR(100),
        subtotal NUMERIC DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        tax NUMERIC DEFAULT 0,
        total_amount NUMERIC(15,2),
        currency VARCHAR(50) DEFAULT 'USD ($)',
        payment_terms TEXT,
        delivery_terms VARCHAR(100),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        consignee_details TEXT,
        buyer_details TEXT,
        validity_days INTEGER,
        notes TEXT,
        product_lines JSONB DEFAULT '[]',
        tariff_code VARCHAR(100),
        supplier_details TEXT,
        pallets INTEGER DEFAULT 0,
        total_sqm NUMERIC DEFAULT 0,
        total_weight NUMERIC(15,2) DEFAULT 0,
        pallet_type TEXT,
        tiles_back TEXT,
        boxes_marking TEXT,
        box_type TEXT,
        fumigation VARCHAR(50),
        legalisation VARCHAR(50),
        other_instructions TEXT,
        status VARCHAR(50) DEFAULT 'Draft',
        booking_no VARCHAR(100),
        lut_date DATE,
        net_weight NUMERIC,
        gross_weight NUMERIC,
        order_id UUID,
        proforma_order_id UUID,
        pre_carriage_by VARCHAR(255),
        place_of_receipt VARCHAR(255),
        bl_no VARCHAR(100),
        bl_date DATE,
        vessel_flight_no VARCHAR(100),
        sb_no VARCHAR(100),
        sb_date DATE,
        exchange_rate NUMERIC(15, 6) DEFAULT 1.0,
        created_by UUID ,
        updated_by UUID ,
        original_invoice_no VARCHAR(100),
        revision_no VARCHAR(50),
        revision_count INTEGER DEFAULT 0,
        revised_from_id UUID,
        revision_reason TEXT,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, invoice_no)
      );      -- Proforma Orders table
      CREATE TABLE IF NOT EXISTS proforma_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        order_no VARCHAR(100),
        date DATE,
        supplier_id UUID REFERENCES suppliers(id),
        supplier_name VARCHAR(255),
        invoice_ref VARCHAR(100),
        tariff_code VARCHAR(100),
        subtotal NUMERIC DEFAULT 0,
        total_amount NUMERIC(15,2),
        status VARCHAR(50) DEFAULT 'Pending',
        qc_status VARCHAR(50) DEFAULT 'Not Ready',
        production_start_date DATE,
        production_end_date DATE,
        expected_delivery DATE,
        pallets INTEGER,
        notes TEXT,
        product_lines JSONB DEFAULT '[]',
        pallet_type TEXT,
        tiles_back TEXT,
        boxes_marking TEXT,
        box_type TEXT,
        fumigation VARCHAR(50),
        legalisation VARCHAR(50),
        other_instructions TEXT,
        country VARCHAR(100),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        payment_terms TEXT,
        delivery_schedule TEXT,
        supplier_email VARCHAR(255),
        created_by UUID ,
        updated_by UUID ,
        original_order_no VARCHAR(100),
        revision_no VARCHAR(50),
        revision_count INTEGER DEFAULT 0,
        revised_from_id UUID,
        revision_reason TEXT,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, order_no)
      );      -- QC Records table
      CREATE TABLE IF NOT EXISTS qc_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        qc_id VARCHAR(100),
        qc_date DATE,
        order_id UUID REFERENCES proforma_orders(id),
        order_number VARCHAR(100),
        client_name VARCHAR(255),
        product_name TEXT,
        inspector VARCHAR(255),
        inspector_id UUID,
        result VARCHAR(50),
        overall_grade VARCHAR(50),
        qc_status VARCHAR(50) DEFAULT 'Pending',
        inspection_details JSONB DEFAULT '{}',
        inspection_media JSONB DEFAULT '{}',
        product_lines JSONB DEFAULT '[]',
        notes TEXT,
        is_locked BOOLEAN DEFAULT FALSE,
        locked_at TIMESTAMP,
        locked_by UUID,
        snapshot_data JSONB,
        final_pdf_path VARCHAR(255),
        final_excel_path VARCHAR(255),
        finalized_hash VARCHAR(255),
        lock_version INTEGER DEFAULT 0,
        finalized_at TIMESTAMP,
        unlocked_at TIMESTAMP,
        unlocked_by UUID,
        unlock_reason TEXT,
        created_by UUID ,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, qc_id)
      );      -- Proforma Invoice Lines table
      CREATE TABLE IF NOT EXISTS proforma_invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proforma_invoice_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
        product_id UUID,
        product_name VARCHAR(255),
        size VARCHAR(100),
        surface VARCHAR(100),
        thickness VARCHAR(50),
        total_pallets INTEGER DEFAULT 0,
        total_boxes INTEGER DEFAULT 0,
        box_weight NUMERIC DEFAULT 0,
        sqm_auto NUMERIC DEFAULT 0,
        rate NUMERIC(15,2) DEFAULT 0,
        amount NUMERIC(15,2) DEFAULT 0,
        net_weight NUMERIC DEFAULT 0,
        gross_weight NUMERIC DEFAULT 0,
        total_sqm NUMERIC DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Proforma Order Lines table (MUST be created before order_sheet_lines which references it)
      CREATE TABLE IF NOT EXISTS proforma_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proforma_order_id UUID NOT NULL REFERENCES proforma_orders(id) ON DELETE CASCADE,
        product_id UUID,
        product_name VARCHAR(255),
        size VARCHAR(100),
        surface VARCHAR(100),
        thickness VARCHAR(50),
        total_pallets INTEGER DEFAULT 0,
        total_boxes INTEGER DEFAULT 0,
        box_weight NUMERIC DEFAULT 0,
        sqm_auto NUMERIC DEFAULT 0,
        rate NUMERIC(15,2) DEFAULT 0,
        amount NUMERIC(15,2) DEFAULT 0,
        net_weight NUMERIC DEFAULT 0,
        gross_weight NUMERIC DEFAULT 0,
        total_sqm NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Factory Capacity Planning
      CREATE TABLE IF NOT EXISTS factory_capacity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        factory_name VARCHAR(255),
        monthly_capacity_sqm NUMERIC(15,4) DEFAULT 0,
        current_load_sqm NUMERIC(15,4) DEFAULT 0,
        available_capacity_sqm NUMERIC(15,4) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ── Order Sheet Module (master_ prefix matches orderSheetController) ─────
      -- master_order_sheets: production planning header
      CREATE TABLE IF NOT EXISTS master_order_sheets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        proforma_order_id UUID REFERENCES proforma_orders(id) ON DELETE CASCADE,
        po_no VARCHAR(100),
        client_name VARCHAR(255),
        supplier_name VARCHAR(255),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        pi_reference VARCHAR(100),
        booking_number VARCHAR(100),
        loading_status VARCHAR(50) DEFAULT 'Pending',
        priority VARCHAR(50) DEFAULT 'Medium',
        shipment_date DATE,
        shipment_month VARCHAR(50),
        etd DATE,
        container_no VARCHAR(100),
        production_sheet_no VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        internal_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- master_order_sheet_lines: per-product production tracking
      CREATE TABLE IF NOT EXISTS master_order_sheet_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        master_order_sheet_id UUID REFERENCES master_order_sheets(id) ON DELETE CASCADE,
        proforma_order_line_id UUID REFERENCES proforma_order_lines(id) ON DELETE CASCADE,
        product_category VARCHAR(255),
        design VARCHAR(255),
        size VARCHAR(100),
        surface VARCHAR(100),
        thickness VARCHAR(50),
        required_sqm NUMERIC(15,4) DEFAULT 0,
        produced_sqm NUMERIC(15,4) DEFAULT 0,
        factory_id UUID,
        production_start_date DATE,
        production_complete_date DATE,
        status VARCHAR(50) DEFAULT 'Pending',
        qc_status VARCHAR(50) DEFAULT 'Pending',
        shade VARCHAR(100),
        caliber VARCHAR(100),
        grade VARCHAR(100),
        boxes_required INTEGER DEFAULT 0,
        boxes_produced INTEGER DEFAULT 0,
        pallets_required INTEGER DEFAULT 0,
        pallets_produced INTEGER DEFAULT 0,
        total_production_boxes NUMERIC(12,2) DEFAULT 0,
        factory_allocated_boxes NUMERIC(12,2) DEFAULT 0,
        production_completed_boxes NUMERIC(12,2) DEFAULT 0,
        qc_approved_boxes NUMERIC(12,2) DEFAULT 0,
        ready_for_packing_boxes NUMERIC(12,2) DEFAULT 0,
        packed_boxes NUMERIC(12,2) DEFAULT 0,
        loaded_boxes NUMERIC(12,2) DEFAULT 0,
        production_progress_percent NUMERIC(5,2) DEFAULT 0,
        production_status VARCHAR(50) DEFAULT 'Not Started',
        factory_notes TEXT,
        delay_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- master_production_updates_history: daily production log entries
      CREATE TABLE IF NOT EXISTS master_production_updates_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        master_order_sheet_id UUID REFERENCES master_order_sheets(id) ON DELETE CASCADE,
        master_order_sheet_line_id UUID REFERENCES master_order_sheet_lines(id) ON DELETE CASCADE,
        factory_id UUID,
        update_date DATE,
        boxes_produced NUMERIC(12,2),
        remarks TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Factory Capacity Planning
      CREATE TABLE IF NOT EXISTS factory_capacity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        factory_name VARCHAR(255),
        monthly_capacity_sqm NUMERIC(15,4) DEFAULT 0,
        current_load_sqm NUMERIC(15,4) DEFAULT 0,
        available_capacity_sqm NUMERIC(15,4) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      -- ── End Order Sheet Module ────────────────────────────────────────────────
      -- Export Invoices table
      CREATE TABLE IF NOT EXISTS export_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        invoice_no VARCHAR(100),
        invoice_date DATE,
        client_id UUID REFERENCES clients(id),
        client_name VARCHAR(255),
        country VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Draft',
        total_amount DECIMAL(15,2),
        proforma_invoice_id UUID REFERENCES proforma_invoices(id),
        consignee_details TEXT,
        buyer_details TEXT,
        payment_terms TEXT,
        delivery_terms VARCHAR(100),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        tariff_code VARCHAR(100),
        product_lines JSONB DEFAULT '[]',
        pallets INTEGER DEFAULT 0,
        total_sqm DECIMAL DEFAULT 0,
        net_weight DECIMAL DEFAULT 0,
        gross_weight DECIMAL DEFAULT 0,
        pallet_type TEXT,
        tiles_back TEXT,
        boxes_marking TEXT,
        box_type TEXT,
        fumigation VARCHAR(50),
        legalisation VARCHAR(50),
        other_instructions TEXT,
        booking_no VARCHAR(100),
        shipping_bill_no VARCHAR(100),
        shipping_bill_date DATE,
        bl_no VARCHAR(100),
        bl_date DATE,
        pre_carriage_by VARCHAR(255),
        vessel_flight_no VARCHAR(255),
        place_of_receipt VARCHAR(255),
        buyers_order_no VARCHAR(100),
        buyers_order_date DATE,
        lut_bond_ref VARCHAR(100),
        lut_date DATE,
        currency VARCHAR(10) DEFAULT 'USD',
        exchange_rate DECIMAL DEFAULT 1,
        is_locked BOOLEAN DEFAULT FALSE,
        order_id UUID REFERENCES proforma_orders(id),
        country_of_origin VARCHAR(255) DEFAULT 'INDIA',
        locked_at TIMESTAMP,
        locked_by UUID,
        snapshot_data JSONB,
        final_pdf_path VARCHAR(255),
        final_excel_path VARCHAR(255),
        finalized_hash VARCHAR(255),
        lock_version INTEGER DEFAULT 0,
        finalized_at TIMESTAMP,
        unlocked_at TIMESTAMP,
        unlocked_by UUID,
        unlock_reason TEXT,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Export Invoice Annexures table
      CREATE TABLE IF NOT EXISTS export_invoice_annexures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID REFERENCES export_invoices(id),
        annexure_type VARCHAR(50) DEFAULT 'PACKING_ANNEXURE',
        annexure_no VARCHAR(100),
        invoice_no VARCHAR(100),
        invoice_date DATE,
        client_name VARCHAR(255),
        export_invoice_no VARCHAR(100),
        pi_reference VARCHAR(100),
        packing_list_no VARCHAR(100),
        country VARCHAR(100),
        consignee_details TEXT,
        buyer_details TEXT,
        vessel_name VARCHAR(255),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        country_of_origin VARCHAR(255) DEFAULT 'INDIA',
        product_description TEXT,
        total_pallets INTEGER DEFAULT 0,
        total_boxes INTEGER DEFAULT 0,
        total_sqm DECIMAL DEFAULT 0,
        net_weight DECIMAL DEFAULT 0,
        gross_weight DECIMAL DEFAULT 0,
        pallet_type TEXT,
        made_in_india VARCHAR(50),
        tiles_back TEXT,
        boxes_type TEXT,
        fumigation VARCHAR(50),
        legalisation VARCHAR(50),
        other_instructions TEXT,
        total_packages INTEGER DEFAULT 0,
        boxes_marking TEXT,
        status VARCHAR(50) DEFAULT 'Draft',
        container_details JSONB DEFAULT '[]',
        product_lines JSONB DEFAULT '[]',
        c_no TEXT,
        c_date DATE,
        examination_date DATE,
        examining_officer TEXT,
        appraiser_name TEXT,
        permission_no TEXT,
        division_range TEXT,
        samples_drawn TEXT,
        sample_seal_no TEXT,
        customs_seal_no TEXT,
        location_code TEXT,
        goods_description_match TEXT,
        declaration_text TEXT,
        range_name TEXT,
        division TEXT,
        commissionerate TEXT,
        lut_arn_no TEXT,
        lut_date DATE,
        manufacturer_name TEXT,
        manufacturer_address TEXT,
        factory_address TEXT,
        company_name TEXT,
        company_address TEXT,
        shipping_bill_no TEXT,
        shipping_bill_date DATE,
        iec_no TEXT,
        is_used BOOLEAN DEFAULT false,
        is_converted BOOLEAN DEFAULT false,
        linked_document_id UUID,
        document_status VARCHAR(50) DEFAULT 'Draft',
        snapshot_data JSONB,
        final_pdf_path VARCHAR(255),
        final_excel_path VARCHAR(255),
        finalized_hash VARCHAR(255),
        lock_version INTEGER DEFAULT 0,
        is_locked BOOLEAN DEFAULT false,
        locked_at TIMESTAMP,
        locked_by UUID,
        unlocked_at TIMESTAMP,
        unlocked_by UUID,
        unlock_reason TEXT,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Backside table
      CREATE TABLE IF NOT EXISTS invoice_backside (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID REFERENCES export_invoices(id),
        annexure_id UUID,
        backside_no VARCHAR(100),
        voyage_no VARCHAR(100),
        pi_no VARCHAR(255),
        pl_no VARCHAR(255),
        annexure_invoice_no VARCHAR(100),
        invoice_no VARCHAR(100),
        invoice_date DATE,
        export_invoice_no VARCHAR(100),
        client_name VARCHAR(255),
        exporter_name VARCHAR(255),
        exporter_address TEXT,
        iec_code VARCHAR(50),
        survey_no VARCHAR(100),
        consignee_name VARCHAR(255),
        consignee_address TEXT,
        goods_value_match VARCHAR(50),
        permission_year VARCHAR(20),
        contact_details VARCHAR(255),
        consignee_contact VARCHAR(255),
        notify_party VARCHAR(255),
        notify_party_address TEXT,
        notify_party_contact VARCHAR(255),
        etd DATE,
        eta DATE,
        pod DATE,
        booking_no VARCHAR(100),
        hbl_no VARCHAR(100),
        freight_terms VARCHAR(255),
        place_of_delivery VARCHAR(255),
        total_packages INTEGER DEFAULT 0,
        consignee_details TEXT,
        buyer_details TEXT,
        vessel_name VARCHAR(255),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        country_of_origin TEXT,
        c_no TEXT,
        c_date DATE,
        examination_date DATE,
        examining_officer TEXT,
        appraiser_name TEXT,
        permission_no TEXT,
        division_range TEXT,
        samples_drawn TEXT,
        sample_seal_no TEXT,
        customs_seal_no TEXT,
        location_code TEXT,
        goods_description_match TEXT,
        goods_description TEXT,
        declaration_text TEXT,
        range_name TEXT,
        division TEXT,
        commissionerate TEXT,
        lut_arn_no TEXT,
        lut_date DATE,
        manufacturer_name TEXT,
        manufacturer_address TEXT,
        factory_address TEXT,
        company_name TEXT,
        company_address TEXT,
        shipping_bill_no TEXT,
        shipping_bill_date DATE,
        iec_no TEXT,
        branch_code_no TEXT,
        bin_no TEXT,
        weighbridge_name TEXT,
        max_permissible_weight TEXT,
        cargo_type TEXT,
        is_description_match TEXT,
        package_type TEXT,
        is_used BOOLEAN DEFAULT false,
        is_converted BOOLEAN DEFAULT false,
        linked_document_id UUID,
        document_status VARCHAR(50) DEFAULT 'Draft',
        status VARCHAR(50) DEFAULT 'Draft',
        container_details JSONB DEFAULT '[]',
        product_lines JSONB DEFAULT '[]',
        total_pallets INTEGER DEFAULT 0,
        total_boxes INTEGER DEFAULT 0,
        total_sqm DECIMAL DEFAULT 0,
        net_weight DECIMAL DEFAULT 0,
        gross_weight DECIMAL DEFAULT 0,
        is_locked BOOLEAN DEFAULT false,
        snapshot_data JSONB,
        final_pdf_path VARCHAR(255),
        final_excel_path VARCHAR(255),
        finalized_hash VARCHAR(255),
        lock_version INTEGER DEFAULT 0,
        locked_at TIMESTAMP,
        locked_by UUID,
        unlocked_at TIMESTAMP,
        unlocked_by UUID,
        unlock_reason TEXT,
        deleted_at TIMESTAMP,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- Export Invoice Lines table
      CREATE TABLE IF NOT EXISTS export_invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(255),
        size VARCHAR(100),
        surface VARCHAR(100),
        thickness VARCHAR(50),
        total_pallets INTEGER,
        total_boxes INTEGER,
        box_weight NUMERIC(10, 2),
        sqm_auto NUMERIC(10, 2),
        rate NUMERIC(15, 2),
        amount NUMERIC(15, 2),
        net_weight NUMERIC(10, 2),
        gross_weight NUMERIC(10, 2),
        is_foc BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );      -- Invoice Backside table
      CREATE TABLE IF NOT EXISTS invoice_backside (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
        backside_no VARCHAR(100),
        invoice_no VARCHAR(100),
        invoice_date DATE,
        pi_no VARCHAR(100),
        pl_no VARCHAR(100),
        annexure_invoice_no VARCHAR(100),
        export_invoice_no VARCHAR(100),
        client_name VARCHAR(255),
        consignee_details TEXT,
        buyer_details TEXT,
        company_name VARCHAR(255),
        company_address TEXT,
        iec_no VARCHAR(50),
        vessel_name VARCHAR(255),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        country VARCHAR(100),
        country_of_origin VARCHAR(100),
        hs_code VARCHAR(50),
        product_description TEXT,
        total_pallets NUMERIC DEFAULT 0,
        total_boxes NUMERIC DEFAULT 0,
        total_sqm NUMERIC DEFAULT 0,
        net_weight NUMERIC DEFAULT 0,
        gross_weight NUMERIC DEFAULT 0,
        pallets_type VARCHAR(100),
        made_in_india VARCHAR(50),
        tiles_back VARCHAR(100),
        boxes_type VARCHAR(100),
        fumigation VARCHAR(100),
        legalisation VARCHAR(100),
        other_instructions TEXT,
        container_details JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'Draft',
        range_name VARCHAR(255),
        division VARCHAR(255),
        commissionerate VARCHAR(255),
        c_no VARCHAR(100),
        c_date DATE,
        shipping_bill_no VARCHAR(100),
        shipping_bill_date DATE,
        exporter_name VARCHAR(255),
        exporter_address TEXT,
        iec_code VARCHAR(50),
        branch_code_no VARCHAR(50),
        bin_no VARCHAR(50),
        manufacturer_name VARCHAR(255),
        manufacturer_address TEXT,
        survey_no VARCHAR(100),
        factory_address TEXT,
        examination_date DATE,
        examining_officer VARCHAR(255),
        appraiser_name VARCHAR(255),
        division_range VARCHAR(255),
        location_code VARCHAR(50),
        export_invoice_date DATE,
        consignee_name VARCHAR(255),
        consignee_address TEXT,
        goods_description_match VARCHAR(50),
        goods_value_match VARCHAR(50),
        samples_drawn VARCHAR(50),
        sample_seal_no VARCHAR(100),
        customs_seal_no VARCHAR(100),
        lut_arn_no VARCHAR(100),
        lut_date DATE,
        permission_no VARCHAR(100),
        permission_year VARCHAR(20),
        declaration_text TEXT,
        contact_details VARCHAR(255),
        consignee_contact VARCHAR(255),
        notify_party VARCHAR(255),
        notify_party_address TEXT,
        notify_party_contact VARCHAR(255),
        etd DATE,
        eta DATE,
        pod DATE,
        booking_no VARCHAR(100),
        package_type VARCHAR(100),
        is_description_match VARCHAR(50),
        goods_description TEXT,
        weighbridge_name VARCHAR(255),
        max_permissible_weight NUMERIC DEFAULT 0,
        cargo_type VARCHAR(100),
        total_packages INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        created_by UUID
      );      -- Export Invoice Annexures table
      CREATE TABLE IF NOT EXISTS export_invoice_annexures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
        annexure_no VARCHAR(100),
        annexure_type VARCHAR(100),
        packing_list_id UUID,
        packing_list_no VARCHAR(100),
        invoice_no VARCHAR(100),
        invoice_date DATE,
        pi_reference VARCHAR(255),
        client_name VARCHAR(255),
        consignee_details TEXT,
        buyer_details TEXT,
        company_name VARCHAR(255),
        company_address TEXT,
        iec_no VARCHAR(50),
        vessel_name VARCHAR(255),
        port_of_loading VARCHAR(100) DEFAULT 'MUNDRA PORT',
        port_of_discharge VARCHAR(100),
        final_destination VARCHAR(255),
        country VARCHAR(100),
        country_of_origin VARCHAR(100) DEFAULT 'INDIA',
        hs_code VARCHAR(20) DEFAULT '6907',
        pallets_type VARCHAR(100),
        made_in_india VARCHAR(100) DEFAULT 'YES',
        tiles_back VARCHAR(100) DEFAULT 'MADE IN INDIA',
        boxes_type VARCHAR(100) DEFAULT 'NON BRANDED BOXES',
        fumigation VARCHAR(50) DEFAULT 'YES',
        legalisation VARCHAR(50) DEFAULT 'NO',
        other_instructions TEXT,
        product_description TEXT,
        total_boxes INTEGER DEFAULT 0,
        total_pallets INTEGER DEFAULT 0,
        total_sqm NUMERIC(12,4) DEFAULT 0,
        net_weight NUMERIC(15,4) DEFAULT 0,
        gross_weight NUMERIC(15,4) DEFAULT 0,
        sqm_per_box NUMERIC(10,4),
        net_weight_per_box NUMERIC(10,4),
        gross_weight_per_box NUMERIC(10,4),
        shipping_bill_no VARCHAR(100),
        shipping_bill_date DATE,
        status VARCHAR(50) DEFAULT 'Draft',
        container_details JSONB DEFAULT '[]',
        product_lines JSONB DEFAULT '[]',
        export_invoice_no VARCHAR(100),
        range_name VARCHAR(255),
        division VARCHAR(255),
        commissionerate VARCHAR(255),
        factory_address TEXT,
        examining_officer VARCHAR(255),
        appraiser_name VARCHAR(255),
        division_range VARCHAR(255),
        location_code VARCHAR(100),
        total_packages INTEGER DEFAULT 0,
        unit_type VARCHAR(50),
        pallet_type VARCHAR(100),
        goods_description_match VARCHAR(50),
        samples_drawn VARCHAR(50),
        sample_seal_no VARCHAR(100),
        customs_seal_no VARCHAR(100),
        permission_no VARCHAR(100),
        permission_year VARCHAR(20),
        declaration_text TEXT,
        lut_arn_no VARCHAR(100),
        lut_date DATE,
        manufacturer_name VARCHAR(255),
        manufacturer_address TEXT,
        survey_no VARCHAR(100),
        examination_date DATE,
        boxes_marking VARCHAR(255),
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        created_by UUID
      );      -- Shipping Instructions table
      CREATE TABLE IF NOT EXISTS shipping_instructions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
        si_no VARCHAR(100),
        si_date DATE,
        shipper_details TEXT,
        shipper_address TEXT,
        shipper_contact VARCHAR(255),
        shipper_code VARCHAR(100),
        consignee_details TEXT,
        consignee_address TEXT,
        consignee_contact VARCHAR(255),
        notify_party_details TEXT,
        notify_party_address TEXT,
        notify_party_contact VARCHAR(255),
        vessel_name VARCHAR(255),
        voyage_no VARCHAR(100),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        place_of_delivery VARCHAR(255),
        etd DATE,
        eta DATE,
        pod DATE,
        booking_no VARCHAR(100),
        hbl_no VARCHAR(100),
        container_details JSONB DEFAULT '[]',
        commodity_description TEXT,
        hs_code VARCHAR(50),
        total_pallets INTEGER,
        total_boxes INTEGER,
        total_sqm NUMERIC(10,2),
        total_packages INTEGER,
        total_gross_weight NUMERIC(15,2),
        total_net_weight NUMERIC(15,2),
        freight_details VARCHAR(255),
        freight_terms VARCHAR(255),
        bietc_number VARCHAR(100),
        special_instructions TEXT,
        status VARCHAR(50) DEFAULT 'Draft',
        shipping_bill_no VARCHAR(100),
        shipping_bill_date DATE,
        invoice_backside_id UUID,
        packing_list_id UUID,
        vgm_id UUID,
        vgm_no VARCHAR(100),
        is_locked BOOLEAN DEFAULT FALSE,
        shipper_name VARCHAR(255),
        consignee_name VARCHAR(255),
        notify_party_name VARCHAR(255),
        freight_status VARCHAR(100),
        client_name VARCHAR(255),
        vessel_voyage VARCHAR(255),
        bl_instruction TEXT,
        marks_and_nos TEXT,
        description_of_goods TEXT,
        gross_weight NUMERIC(15,2),
        net_weight NUMERIC(15,2),
        urgency VARCHAR(50) DEFAULT 'Normal',
        export_invoice_no VARCHAR(100),
        pi_no VARCHAR(100),
        pl_no VARCHAR(100),
        annexure_no VARCHAR(100),
        backside_no VARCHAR(100),
        freight_forwarder VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        country_of_origin VARCHAR(100),
        created_by UUID
      );      -- Packing Lists table
      CREATE TABLE IF NOT EXISTS packing_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID,
        packing_list_no VARCHAR(100),
        packing_list_date DATE,
        iec_no VARCHAR(100),
        gstn VARCHAR(100),
        proforma_invoice_no VARCHAR(100),
        proforma_date DATE,
        consignee TEXT,
        buyer TEXT,
        buyers_order_no VARCHAR(100),
        buyers_order_date DATE,
        shipment_terms VARCHAR(255),
        tariff_code VARCHAR(100),
        bl_no VARCHAR(100),
        bl_date DATE,
        sb_no VARCHAR(100),
        sb_date DATE,
        country_of_origin VARCHAR(100),
        final_destination VARCHAR(255),
        payment_terms TEXT,
        delivery_terms VARCHAR(255),
        pre_carriage_by VARCHAR(255),
        place_of_receipt VARCHAR(255),
        vessel_flight_no VARCHAR(255),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        bank_details JSONB,
        material_description TEXT,
        total_pallets INTEGER DEFAULT 0,
        total_boxes INTEGER DEFAULT 0,
        total_sqm NUMERIC(15,2) DEFAULT 0,
        total_amount NUMERIC(15,2) DEFAULT 0,
        total_weight NUMERIC(15,2) DEFAULT 0,
        net_weight NUMERIC(15,2) DEFAULT 0,
        gross_weight NUMERIC(15,2) DEFAULT 0,
        pallet_type VARCHAR(100),
        made_in_india VARCHAR(50),
        tiles_back VARCHAR(100),
        boxes_marking TEXT,
        box_type VARCHAR(100),
        fumigation VARCHAR(50),
        legalisation VARCHAR(50),
        lc_number VARCHAR(255),
        lc_date DATE,
        epcg_no VARCHAR(255),
        other_instructions TEXT,
        product_lines JSONB DEFAULT '[]',
        container_details JSONB DEFAULT '[]',
        client_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Draft',
        is_locked BOOLEAN DEFAULT FALSE,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );      -- VGM Documents table
      CREATE TABLE IF NOT EXISTS vgm_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
        vgm_no VARCHAR(100),
        vgm_date DATE,
        status VARCHAR(50) DEFAULT 'Pending',
        shipper_iec VARCHAR(50),
        shipper_cin VARCHAR(50),
        shipper_registration VARCHAR(100),
        authorized_signatory VARCHAR(255),
        contact_details VARCHAR(255),
        export_invoice_no VARCHAR(50),
        invoice_date DATE,
        booking_number VARCHAR(100),
        container_type VARCHAR(50),
        hazardous_info VARCHAR(100),
        weighbridge_name VARCHAR(255),
        weighbridge_registration VARCHAR(100),
        weighbridge_address TEXT,
        vgm_method VARCHAR(50),
        containers JSONB DEFAULT '[]',
        total_cargo_weight NUMERIC(15,2) DEFAULT 0,
        total_tare_weight NUMERIC(15,2) DEFAULT 0,
        total_vgm_weight NUMERIC(15,2) DEFAULT 0,
        total_sqm NUMERIC(15,2) DEFAULT 0,
        total_boxes INTEGER DEFAULT 0,
        total_pallets INTEGER DEFAULT 0,
        document_date DATE,
        notes TEXT,
        invoice_backside_id UUID REFERENCES invoice_backside(id) ON DELETE SET NULL,
        vessel_name VARCHAR(255),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        shipping_bill_no VARCHAR(100),
        shipping_bill_date DATE,
        is_locked BOOLEAN DEFAULT FALSE,
        has_vgm BOOLEAN DEFAULT FALSE,
        gross_weight NUMERIC(15,2),
        client_name VARCHAR(255),
        country VARCHAR(100),
        shipper_name VARCHAR(255),
        voyage_no VARCHAR(100),
        place_of_delivery VARCHAR(255),
        net_weight NUMERIC,
        authorized_person VARCHAR(255),
        max_permissible_weight NUMERIC(15,2) DEFAULT 0,
        weighing_method VARCHAR(100),
        cargo_type VARCHAR(100),
        un_no_imdg VARCHAR(50),
        container_sheet JSONB DEFAULT '[]',
        pi_no VARCHAR(100),
        pi_date DATE,
        pl_no VARCHAR(100),
        annexure_no VARCHAR(100),
        weighing_slip_no VARCHAR(100),
        weighing_date VARCHAR(100),
        container_no VARCHAR(100),
        container_size VARCHAR(50),
        country_of_origin VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        created_by UUID ,
        UNIQUE(company_id, vgm_no)
      );

      -- IGST Invoices table
      CREATE TABLE IF NOT EXISTS igst_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
        igst_invoice_no VARCHAR(100),
        date DATE,
        status VARCHAR(50) DEFAULT 'Draft',
        
        -- GST / Exporter details
        gstin VARCHAR(100),
        iec_no VARCHAR(100),
        lut_bond_ref VARCHAR(100),
        lut_date DATE,
        exporter_name VARCHAR(255),
        exporter_address TEXT,
        pi_no VARCHAR(100),
        tariff_code VARCHAR(100),
        buyers_order_no VARCHAR(100),
        buyers_order_date DATE,
        country_of_origin VARCHAR(255) DEFAULT 'INDIA',
        payment_terms TEXT,
        other_instructions TEXT,
        
        -- Buyer / Consignee
        buyer_details TEXT,
        consignee_details TEXT,
        country VARCHAR(100),
        final_destination VARCHAR(255),
        
        -- Shipping details
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        vessel_flight_no VARCHAR(255),
        pre_carriage_by VARCHAR(255),
        place_of_receipt VARCHAR(255),
        shipping_bill_no VARCHAR(100),
        shipping_bill_date DATE,
        
        -- Product lines JSONB
        product_lines JSONB DEFAULT '[]',
        
        -- Packing Details
        pallet_type VARCHAR(100),
        tiles_back VARCHAR(100),
        box_type VARCHAR(100),
        boxes_marking TEXT,
        fumigation VARCHAR(50),
        legalisation VARCHAR(50),
        
        -- Weight & Qty Summary
        net_weight NUMERIC(15,4) DEFAULT 0,
        gross_weight NUMERIC(15,4) DEFAULT 0,
        total_pallets INTEGER DEFAULT 0,
        total_quantity NUMERIC(15,4) DEFAULT 0,
        
        -- Calculations
        taxable_amount NUMERIC(15,2) DEFAULT 0,
        igst_percentage DECIMAL(5,2) DEFAULT 18.00,
          igst_rate NUMERIC(5,2) DEFAULT 18.00,
        igst_amount NUMERIC(15,2) DEFAULT 0,
        total_amount_after_tax NUMERIC(15,2) DEFAULT 0,
        total_before_tax NUMERIC(15,2) DEFAULT 0,
        total_igst NUMERIC(15,2) DEFAULT 0,
        grand_total NUMERIC(15,2) DEFAULT 0,
        amount_in_words TEXT,
        
        remarks TEXT,
        is_locked BOOLEAN DEFAULT FALSE,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        created_by UUID ,
        
        UNIQUE(company_id, export_invoice_id)
      );

      -- Export Invoice Proforma Links table
      CREATE TABLE IF NOT EXISTS export_invoice_proforma_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
        proforma_invoice_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE RESTRICT,
        company_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(export_invoice_id, proforma_invoice_id)
      );

      CREATE INDEX IF NOT EXISTS idx_export_proforma_links_ei_id ON export_invoice_proforma_links(export_invoice_id);
      CREATE INDEX IF NOT EXISTS idx_export_proforma_links_pi_id ON export_invoice_proforma_links(proforma_invoice_id);
      CREATE INDEX IF NOT EXISTS idx_export_proforma_links_company_id ON export_invoice_proforma_links(company_id);

      -- Ensure company user has privileges on all tables
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${db_user};
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${db_user};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${db_user};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${db_user};

    `);

    debugLogger.success('DatabaseProvisioning', `Schema provisioned for ${db_name}.`);
  } catch (err) {
    debugLogger.error('DatabaseProvisioning', `Error provisioning schema for ${db_name}:`, err);
    throw err;
  } finally {
    await companyPool.end();
  }
};

/**
 * Synchronizes the schema of a company's isolated database with the master schema.
 * This ensures that existing tenants get new columns added during updates.
 */
export const syncCompanyDatabase = async (companyId, db) => {
  if (!companyId) return;
  
  debugLogger.info('DatabaseProvisioning', `[SchemaSync] Starting synchronization for company: ${companyId}`);
  
  try {
    // List of structural updates (idempotent ALTER TABLE commands)
    const updates = [
      // Users
      { table: 'users', column: 'company_id', type: 'UUID' },
      { table: 'users', column: 'username', type: 'VARCHAR(100) UNIQUE' },
      { table: 'users', column: 'employee_id', type: 'VARCHAR(50)' },
      { table: 'users', column: 'territory', type: 'VARCHAR(100)' },
      { table: 'users', column: 'sales_target', type: 'DECIMAL(15,2)' },
      { table: 'users', column: 'commission', type: 'DECIMAL(5,2)' },
      
      // Clients
      { table: 'clients', column: 'client_name', type: 'VARCHAR(255)' },
      { table: 'clients', column: 'email_id', type: 'VARCHAR(255)' },
      { table: 'clients', column: 'consignee_details', type: 'TEXT' },
      { table: 'clients', column: 'buyer_details', type: 'TEXT' },
      { table: 'clients', column: 'port_of_loading', type: 'VARCHAR(255) DEFAULT \'MUNDRA PORT\'' },
      { table: 'clients', column: 'port_of_discharge', type: 'VARCHAR(255)' },
      { table: 'clients', column: 'final_destination', type: 'VARCHAR(255)' },
      { table: 'clients', column: 'currency', type: 'VARCHAR(10) DEFAULT \'INR\'' },
      
      // Suppliers
      { table: 'suppliers', column: 'lead_time', type: 'VARCHAR(100)' },
      { table: 'suppliers', column: 'website', type: 'VARCHAR(255)' },
      
      // Leads
      { table: 'leads', column: 'assigned_to', type: 'UUID' },
      
      // Products
      { table: 'products', column: 'item_ref', type: 'VARCHAR(100)' },
      { table: 'products', column: 'factory_name', type: 'VARCHAR(255)' },
      { table: 'products', column: 'factory_product_name', type: 'VARCHAR(255)' },
      { table: 'products', column: 'company_product_name', type: 'VARCHAR(255)' },
      { table: 'products', column: 'catalogue_name', type: 'VARCHAR(255)' },
      { table: 'products', column: 'default_boxes_per_kathali', type: 'INTEGER' },
      { table: 'products', column: 'default_per_box_weight', type: 'NUMERIC' },
      { table: 'products', column: 'default_per_pallet_weight', type: 'NUMERIC' },
      { table: 'products', column: 'base_price', type: 'NUMERIC' },
      { table: 'products', column: 'margin', type: 'NUMERIC' },
      { table: 'products', column: 'selling_price', type: 'NUMERIC' },
      
      // Proforma Invoices
      { table: 'proforma_invoices', column: 'pallets', type: 'INTEGER DEFAULT 0' },
      { table: 'proforma_invoices', column: 'total_sqm', type: 'NUMERIC DEFAULT 0' },
      { table: 'proforma_invoices', column: 'total_weight', type: 'NUMERIC(15,2) DEFAULT 0' },
      { table: 'proforma_invoices', column: 'pallet_type', type: 'TEXT' },
      { table: 'proforma_invoices', column: 'tiles_back', type: 'TEXT' },
      { table: 'proforma_invoices', column: 'boxes_marking', type: 'TEXT' },
      { table: 'proforma_invoices', column: 'box_type', type: 'TEXT' },
      { table: 'proforma_invoices', column: 'fumigation', type: 'VARCHAR(50)' },
      { table: 'proforma_invoices', column: 'legalisation', type: 'VARCHAR(50)' },
      { table: 'proforma_invoices', column: 'other_instructions', type: 'TEXT' },
      { table: 'proforma_invoices', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'proforma_invoices', column: 'snapshot_data', type: 'JSONB' },
      
      // Proforma Orders
      { table: 'proforma_orders', column: 'pallets', type: 'INTEGER DEFAULT 0' },
      { table: 'proforma_orders', column: 'payment_terms', type: 'TEXT' },
      { table: 'proforma_orders', column: 'delivery_schedule', type: 'TEXT' },
      { table: 'proforma_orders', column: 'qc_status', type: 'VARCHAR(50) DEFAULT \'Not Ready\'' },
      { table: 'proforma_orders', column: 'invoice_ref', type: 'VARCHAR(100)' },
      { table: 'proforma_orders', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'proforma_orders', column: 'snapshot_data', type: 'JSONB' },
      
      // Export Invoices
      { table: 'export_invoices', column: 'pallets', type: 'INTEGER DEFAULT 0' },
      { table: 'export_invoices', column: 'total_sqm', type: 'DECIMAL DEFAULT 0' },
      { table: 'export_invoices', column: 'net_weight', type: 'DECIMAL DEFAULT 0' },
      { table: 'export_invoices', column: 'gross_weight', type: 'DECIMAL DEFAULT 0' },
      { table: 'export_invoices', column: 'pallet_type', type: 'TEXT' },
      { table: 'export_invoices', column: 'tiles_back', type: 'TEXT' },
      { table: 'export_invoices', column: 'boxes_marking', type: 'TEXT' },
      { table: 'export_invoices', column: 'box_type', type: 'TEXT' },
      { table: 'export_invoices', column: 'fumigation', type: 'VARCHAR(50)' },
      { table: 'export_invoices', column: 'legalisation', type: 'VARCHAR(50)' },
      { table: 'export_invoices', column: 'other_instructions', type: 'TEXT' },
      { table: 'export_invoices', column: 'currency', type: 'VARCHAR(10) DEFAULT \'USD\'' },
      { table: 'export_invoices', column: 'exchange_rate', type: 'DECIMAL DEFAULT 1' },
      { table: 'export_invoices', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'export_invoices', column: 'snapshot_data', type: 'JSONB' },
      { table: 'export_invoices', column: 'order_id', type: 'UUID' },
      { table: 'export_invoices', column: 'country_of_origin', type: 'VARCHAR(255) DEFAULT \'INDIA\'' },
      { table: 'export_invoices', column: 'lut_date', type: 'DATE' },
      
      // VGM
      { table: 'vgm_documents', column: 'total_sqm', type: 'NUMERIC(15,2) DEFAULT 0' },
      { table: 'vgm_documents', column: 'total_boxes', type: 'INTEGER DEFAULT 0' },
      { table: 'vgm_documents', column: 'total_pallets', type: 'INTEGER DEFAULT 0' },
      { table: 'vgm_documents', column: 'invoice_backside_id', type: 'UUID' },
      { table: 'vgm_documents', column: 'vessel_name', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'port_of_loading', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'port_of_discharge', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'shipping_bill_no', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'shipping_bill_date', type: 'DATE' },
      { table: 'vgm_documents', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'vgm_documents', column: 'has_vgm', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'vgm_documents', column: 'client_name', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'shipper_name', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'max_permissible_weight', type: 'NUMERIC(15,2) DEFAULT 0' },
      { table: 'vgm_documents', column: 'weighbridge_name', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'weighing_method', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'cargo_type', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'un_no_imdg', type: 'VARCHAR(50)' },
      { table: 'vgm_documents', column: 'container_sheet', type: 'JSONB DEFAULT \'[]\'' },
      { table: 'vgm_documents', column: 'pi_no', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'pl_no', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'annexure_no', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'weighing_slip_no', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'weighing_date', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'total_cargo_weight', type: 'NUMERIC(15,2) DEFAULT 0' },
      { table: 'vgm_documents', column: 'total_tare_weight', type: 'NUMERIC(15,2) DEFAULT 0' },
      { table: 'vgm_documents', column: 'total_vgm_weight', type: 'NUMERIC(15,2) DEFAULT 0' },
      { table: 'vgm_documents', column: 'gross_weight', type: 'NUMERIC(15,2) DEFAULT 0' },
      { table: 'vgm_documents', column: 'pi_date', type: 'DATE' },
      { table: 'vgm_documents', column: 'shipper_iec', type: 'VARCHAR(50)' },
      { table: 'vgm_documents', column: 'authorized_person', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'contact_details', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'booking_number', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'invoice_date', type: 'DATE' },
      { table: 'vgm_documents', column: 'manufacturer_name', type: 'VARCHAR(255)' },
      { table: 'vgm_documents', column: 'manufacturer_address', type: 'TEXT' },
      { table: 'vgm_documents', column: 'container_no', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'container_size', type: 'VARCHAR(50)' },
      { table: 'vgm_documents', column: 'country_of_origin', type: 'VARCHAR(100)' },
      { table: 'vgm_documents', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'vgm_documents', column: 'snapshot_data', type: 'JSONB' },
      
      // Invoice Backside
      { table: 'invoice_backside', column: 'weighbridge_name', type: 'VARCHAR(255)' },
      { table: 'invoice_backside', column: 'max_permissible_weight', type: 'NUMERIC DEFAULT 0' },
      { table: 'invoice_backside', column: 'cargo_type', type: 'VARCHAR(100)' },
      { table: 'invoice_backside', column: 'total_packages', type: 'INTEGER DEFAULT 0' },
      { table: 'invoice_backside', column: 'pi_no', type: 'VARCHAR(100)' },
      { table: 'invoice_backside', column: 'pl_no', type: 'VARCHAR(100)' },
      { table: 'invoice_backside', column: 'total_sqm', type: 'NUMERIC DEFAULT 0' },
      { table: 'invoice_backside', column: 'total_boxes', type: 'INTEGER DEFAULT 0' },
      { table: 'invoice_backside', column: 'total_pallets', type: 'INTEGER DEFAULT 0' },
      { table: 'invoice_backside', column: 'gross_weight', type: 'NUMERIC DEFAULT 0' },
      { table: 'invoice_backside', column: 'net_weight', type: 'NUMERIC DEFAULT 0' },
      { table: 'invoice_backside', column: 'iec_no', type: 'VARCHAR(100)' },
      { table: 'invoice_backside', column: 'booking_no', type: 'VARCHAR(100)' },
      { table: 'invoice_backside', column: 'container_details', type: 'JSONB DEFAULT \'[]\'' },
      { table: 'invoice_backside', column: 'shipping_bill_no', type: 'VARCHAR(100)' },
      { table: 'invoice_backside', column: 'shipping_bill_date', type: 'DATE' },
      { table: 'invoice_backside', column: 'manufacturer_name', type: 'VARCHAR(255)' },
      { table: 'invoice_backside', column: 'manufacturer_address', type: 'TEXT' },
      { table: 'invoice_backside', column: 'permission_no', type: 'VARCHAR(100)' },
      { table: 'invoice_backside', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'invoice_backside', column: 'snapshot_data', type: 'JSONB' },
      
      { table: 'export_invoice_lines', column: 'is_foc', type: 'BOOLEAN DEFAULT FALSE' },
      
      // Export Invoice Annexures
      { table: 'export_invoice_annexures', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'export_invoice_annexures', column: 'snapshot_data', type: 'JSONB' },
      
      // Packing Lists
      { table: 'packing_lists', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'packing_lists', column: 'snapshot_data', type: 'JSONB' },
      { table: 'packing_lists', column: 'lc_number', type: 'VARCHAR(255)' },
      { table: 'packing_lists', column: 'lc_date', type: 'DATE' },
      { table: 'packing_lists', column: 'epcg_no', type: 'VARCHAR(255)' },
      
      // Shipping Instructions
      { table: 'shipping_instructions', column: 'country_of_origin', type: 'VARCHAR(100)' },
      { table: 'shipping_instructions', column: 'description_of_goods', type: 'TEXT' },
      { table: 'shipping_instructions', column: 'pi_no', type: 'VARCHAR(100)' },
      { table: 'shipping_instructions', column: 'pl_no', type: 'VARCHAR(100)' },
      { table: 'shipping_instructions', column: 'annexure_no', type: 'VARCHAR(100)' },
      { table: 'shipping_instructions', column: 'backside_no', type: 'VARCHAR(100)' },
      { table: 'shipping_instructions', column: 'freight_forwarder', type: 'VARCHAR(255)' },
      { table: 'shipping_instructions', column: 'vgm_no', type: 'VARCHAR(100)' },
      { table: 'shipping_instructions', column: 'vgm_id', type: 'UUID' },
      { table: 'shipping_instructions', column: 'vessel_voyage', type: 'VARCHAR(255)' },
      { table: 'shipping_instructions', column: 'bl_instruction', type: 'TEXT' },
      { table: 'shipping_instructions', column: 'marks_and_nos', type: 'TEXT' },
      { table: 'shipping_instructions', column: 'gross_weight', type: 'NUMERIC(15,2)' },
      { table: 'shipping_instructions', column: 'net_weight', type: 'NUMERIC(15,2)' },
      { table: 'shipping_instructions', column: 'urgency', type: 'VARCHAR(50) DEFAULT \'Normal\'' },
      { table: 'shipping_instructions', column: 'export_invoice_no', type: 'VARCHAR(100)' },
      { table: 'shipping_instructions', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'shipping_instructions', column: 'snapshot_data', type: 'JSONB' },
      
      // Catalogues
      { table: 'catalogues', column: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { table: 'catalogue_products', column: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      
      // IGST Invoices
      { table: 'igst_invoices', column: 'pi_no', type: 'VARCHAR(100)' },
      { table: 'igst_invoices', column: 'tariff_code', type: 'VARCHAR(100)' },
      { table: 'igst_invoices', column: 'buyers_order_no', type: 'VARCHAR(100)' },
      { table: 'igst_invoices', column: 'buyers_order_date', type: 'DATE' },
      { table: 'igst_invoices', column: 'country_of_origin', type: 'VARCHAR(255) DEFAULT \'INDIA\'' },
      { table: 'igst_invoices', column: 'payment_terms', type: 'TEXT' },
      { table: 'igst_invoices', column: 'other_instructions', type: 'TEXT' },
      { table: 'igst_invoices', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },

      // QC Records
      { table: 'qc_records', column: 'inspector_id', type: 'UUID' },
      { table: 'qc_records', column: 'is_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'qc_records', column: 'locked_at', type: 'TIMESTAMP' },
      { table: 'qc_records', column: 'locked_by', type: 'UUID' },
      { table: 'qc_records', column: 'snapshot_data', type: 'JSONB' },
      { table: 'qc_records', column: 'final_pdf_path', type: 'VARCHAR(255)' },
      { table: 'qc_records', column: 'final_excel_path', type: 'VARCHAR(255)' },
      { table: 'qc_records', column: 'finalized_hash', type: 'VARCHAR(255)' },
      { table: 'qc_records', column: 'lock_version', type: 'INTEGER DEFAULT 0' },
      { table: 'qc_records', column: 'finalized_at', type: 'TIMESTAMP' },
      { table: 'qc_records', column: 'unlocked_at', type: 'TIMESTAMP' },
      { table: 'qc_records', column: 'unlocked_by', type: 'UUID' },
      { table: 'qc_records', column: 'unlock_reason', type: 'TEXT' },
      { table: 'qc_records', column: 'box_type', type: 'VARCHAR(255)' },
      { table: 'qc_records', column: 'order_sheet_id', type: 'UUID' },
      
      // Account Entries
      { table: 'account_entries', column: 'currency', type: "VARCHAR(50) DEFAULT 'USD'" }
    ];

    for (const update of updates) {
      try {
        // Use standard PostgreSQL column check to avoid erroring if table doesn't exist
        await db.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${update.table}') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${update.table}' AND column_name = '${update.column}') THEN
                ALTER TABLE ${update.table} ADD COLUMN ${update.column} ${update.type};
              END IF;
            END IF;
          END $$;
        `);
      } catch (colErr) {
        debugLogger.warn('DatabaseProvisioning', `[SchemaSync] Failed to sync ${update.table}.${update.column}: ${colErr.message}`);
      }
    }

    // Add missing constraints (Idempotent)
    const constraintUpdates = [
      { table: 'proforma_invoices', name: 'proforma_invoices_invoice_no_key', sql: 'ADD CONSTRAINT proforma_invoices_invoice_no_key UNIQUE (company_id, invoice_no)' },
      { table: 'proforma_orders', name: 'proforma_orders_order_no_key', sql: 'ADD CONSTRAINT proforma_orders_order_no_key UNIQUE (company_id, order_no)' },
      { table: 'qc_records', name: 'qc_records_qc_id_key', sql: 'ADD CONSTRAINT qc_records_qc_id_key UNIQUE (company_id, qc_id)' },
      { table: 'qc_records', name: 'qc_records_order_id_fkey', sql: 'ADD CONSTRAINT qc_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES proforma_orders(id)' },
      { table: 'export_invoices', name: 'export_invoices_order_id_fkey', sql: 'ADD CONSTRAINT export_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES proforma_orders(id)' }
    ];

    for (const constraint of constraintUpdates) {
      try {
        await db.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${constraint.table}') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '${constraint.name}') THEN
                ALTER TABLE ${constraint.table} ${constraint.sql};
              END IF;
            END IF;
          END $$;
        `);
      } catch (conErr) {
        debugLogger.warn('DatabaseProvisioning', `[SchemaSync] Failed to apply constraint ${constraint.name}: ${conErr.message}`);
      }
    }
    
    // Ensure new master data tables exist
    const tablesToCreate = [
      {
        name: 'catalogue_products',
        sql: `CREATE TABLE IF NOT EXISTS catalogue_products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          catalogue_id UUID NOT NULL REFERENCES catalogues(id) ON DELETE CASCADE,
          product_id UUID NOT NULL,
          product_type VARCHAR(20) NOT NULL DEFAULT 'tile',
          display_order INTEGER,
          custom_price NUMERIC,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      { 
        name: 'payment_terms', 
        sql: `CREATE TABLE IF NOT EXISTS payment_terms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          term TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID
        )`
      },
      { 
        name: 'tariff_codes', 
        sql: `CREATE TABLE IF NOT EXISTS tariff_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          code VARCHAR(100) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID
        )`
      },
      {
        name: 'notifications',
        sql: `CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          user_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT FALSE,
          action_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          user_id UUID,
          action VARCHAR(100),
          resource_type VARCHAR(100),
          resource_id UUID,
          changes JSONB,
          ip_address VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'account_entries',
        sql: `CREATE TABLE IF NOT EXISTS account_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          entry_no VARCHAR(100),
          type VARCHAR(50),
          amount NUMERIC(15,2),
          currency VARCHAR(50) DEFAULT 'USD',
          date DATE,
          entry_type VARCHAR(50),
          party_name VARCHAR(255),
          payment_method VARCHAR(100),
          invoice_ref VARCHAR(100),
          po_ref VARCHAR(100),
          status VARCHAR(50) DEFAULT 'Pending',
          due_date DATE,
          notes TEXT,
          created_by UUID ,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'igst_invoices',
        sql: `CREATE TABLE IF NOT EXISTS igst_invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
          igst_invoice_no VARCHAR(100),
          pi_no VARCHAR(100),
          date DATE,
          status VARCHAR(50) DEFAULT 'Draft',
          gstin VARCHAR(100),
          iec_no VARCHAR(100),
          lut_bond_ref VARCHAR(100),
          lut_date DATE,
          exporter_name VARCHAR(255),
          exporter_address TEXT,
          tariff_code VARCHAR(100),
          buyers_order_no VARCHAR(100),
          buyers_order_date DATE,
          country_of_origin VARCHAR(255) DEFAULT 'INDIA',
          payment_terms TEXT,
          other_instructions TEXT,
          buyer_details TEXT,
          consignee_details TEXT,
          country VARCHAR(100),
          final_destination VARCHAR(255),
          port_of_loading VARCHAR(255),
          port_of_discharge VARCHAR(255),
          vessel_flight_no VARCHAR(255),
          pre_carriage_by VARCHAR(255),
          place_of_receipt VARCHAR(255),
          shipping_bill_no VARCHAR(100),
          shipping_bill_date DATE,
          product_lines JSONB DEFAULT '[]',
          pallet_type VARCHAR(100),
          tiles_back VARCHAR(100),
          box_type VARCHAR(100),
          boxes_marking TEXT,
          fumigation VARCHAR(50),
          legalisation VARCHAR(50),
          net_weight NUMERIC(15,4) DEFAULT 0,
          gross_weight NUMERIC(15,4) DEFAULT 0,
          total_pallets INTEGER DEFAULT 0,
          total_quantity NUMERIC(15,4) DEFAULT 0,
          taxable_amount NUMERIC(15,2) DEFAULT 0,
          igst_rate NUMERIC(5,2) DEFAULT 18.00,
          igst_amount NUMERIC(15,2) DEFAULT 0,
          total_amount_after_tax NUMERIC(15,2) DEFAULT 0,
          total_before_tax NUMERIC(15,2) DEFAULT 0,
          total_igst NUMERIC(15,2) DEFAULT 0,
          grand_total NUMERIC(15,2) DEFAULT 0,
          amount_in_words TEXT,
          remarks TEXT,
          is_locked BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP,
          created_by UUID ,
          UNIQUE(company_id, export_invoice_id),
          UNIQUE(company_id, igst_invoice_no)
        )`
      },
      {
        name: 'export_invoice_proforma_links',
        sql: `CREATE TABLE IF NOT EXISTS export_invoice_proforma_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
          proforma_invoice_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE RESTRICT,
          company_id UUID NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(export_invoice_id, proforma_invoice_id)
        )`
      },
      {
        name: 'export_document_lock',
        sql: `CREATE TABLE IF NOT EXISTS export_document_lock (
          id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
          company_id uuid NOT NULL,
          exp_no character varying(100) NOT NULL,
          document_type character varying(100) NOT NULL,
          document_id uuid NOT NULL,
          lock_status character varying(50) DEFAULT 'LOCKED',
          locked_by uuid,
          locked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          unlocked_by uuid,
          unlocked_at timestamp without time zone,
          unlock_reason text,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'export_invoice_items',
        sql: `CREATE TABLE IF NOT EXISTS export_invoice_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id),
          sku VARCHAR(100),
          description TEXT,
          quantity NUMERIC(15, 2) NOT NULL,
          unit_price NUMERIC(15, 2) NOT NULL,
          total_amount NUMERIC(15, 2) NOT NULL,
          hsn_code VARCHAR(20),
          net_weight NUMERIC(15, 2),
          gross_weight NUMERIC(15, 2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'container_allocations',
        sql: `CREATE TABLE IF NOT EXISTS container_allocations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
          container_number VARCHAR(50) NOT NULL,
          seal_number VARCHAR(50),
          container_type VARCHAR(20),
          tare_weight NUMERIC(10, 2),
          max_payload NUMERIC(10, 2),
          vgm_weight NUMERIC(10, 2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'packing_items',
        sql: `CREATE TABLE IF NOT EXISTS packing_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          container_allocation_id UUID NOT NULL REFERENCES container_allocations(id) ON DELETE CASCADE,
          export_invoice_item_id UUID NOT NULL REFERENCES export_invoice_items(id) ON DELETE CASCADE,
          boxes_packed INTEGER NOT NULL,
          pallets_used INTEGER,
          gross_weight NUMERIC(10, 2),
          net_weight NUMERIC(10, 2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'qc_items',
        sql: `CREATE TABLE IF NOT EXISTS qc_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          qc_record_id UUID NOT NULL REFERENCES qc_records(id) ON DELETE CASCADE,
          export_invoice_item_id UUID NOT NULL REFERENCES export_invoice_items(id) ON DELETE CASCADE,
          parameter_name VARCHAR(100) NOT NULL,
          expected_value VARCHAR(100),
          actual_value VARCHAR(100),
          status VARCHAR(20) CHECK (status IN ('PASS', 'FAIL', 'PENDING')),
          remarks TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'journal_entries',
        sql: `CREATE TABLE IF NOT EXISTS journal_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          entry_no VARCHAR(100) NOT NULL,
          date DATE NOT NULL,
          reference VARCHAR(100),
          source_type VARCHAR(50),
          source_id UUID,
          notes TEXT,
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(company_id, entry_no)
        )`
      },
      {
        name: 'warehouse_locations',
        sql: `CREATE TABLE IF NOT EXISTS warehouse_locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) DEFAULT 'Warehouse',
          address TEXT,
          is_active BOOLEAN DEFAULT true,
          status VARCHAR(20) DEFAULT 'Active',
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP,
          UNIQUE(company_id, name)
        )`
      },
      {
        name: 'ledger_entries',
        sql: `CREATE TABLE IF NOT EXISTS ledger_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
          account_code VARCHAR(50) NOT NULL,
          debit NUMERIC(15, 2) DEFAULT 0 CHECK (debit >= 0),
          credit NUMERIC(15, 2) DEFAULT 0 CHECK (credit >= 0),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`
      }
    ];

    for (const table of tablesToCreate) {
      await db.query(table.sql);
    }

    try {
      await db.query(`
        -- Phase 6: Soft Delete Consistency
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        ALTER TABLE master_order_sheets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        ALTER TABLE IF EXISTS order_sheets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

        -- Phase 6: Foreign Key Integrity
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clients_created_by') THEN
            ALTER TABLE clients ADD CONSTRAINT fk_clients_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pi_client_id') THEN
            ALTER TABLE proforma_invoices ADD CONSTRAINT fk_pi_client_id FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ei_client_id') THEN
            ALTER TABLE export_invoices ADD CONSTRAINT fk_ei_client_id FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_qc_inspector') THEN
            ALTER TABLE qc_records ADD CONSTRAINT fk_qc_inspector FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `);
    } catch (e) {
      debugLogger.warn('DatabaseProvisioning', 'Failed to apply Phase 6 schema hardening', e);
    }

    try {
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_export_proforma_links_ei_id ON export_invoice_proforma_links(export_invoice_id);
        CREATE INDEX IF NOT EXISTS idx_export_proforma_links_pi_id ON export_invoice_proforma_links(proforma_invoice_id);
        CREATE INDEX IF NOT EXISTS idx_export_proforma_links_company_id ON export_invoice_proforma_links(company_id);
        CREATE INDEX IF NOT EXISTS idx_export_invoice_items_invoice_id ON export_invoice_items(export_invoice_id);
        CREATE INDEX IF NOT EXISTS idx_export_invoice_items_company_id ON export_invoice_items(company_id);
        CREATE INDEX IF NOT EXISTS idx_container_allocations_invoice_id ON container_allocations(export_invoice_id);
        CREATE INDEX IF NOT EXISTS idx_container_allocations_company_id ON container_allocations(company_id);
        CREATE INDEX IF NOT EXISTS idx_packing_items_allocation_id ON packing_items(container_allocation_id);
        CREATE INDEX IF NOT EXISTS idx_packing_items_company_id ON packing_items(company_id);
        CREATE INDEX IF NOT EXISTS idx_qc_items_qc_id ON qc_items(qc_record_id);
        CREATE INDEX IF NOT EXISTS idx_qc_items_company_id ON qc_items(company_id);
        CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, date);
        CREATE INDEX IF NOT EXISTS idx_ledger_entries_company_journal ON ledger_entries(company_id, journal_entry_id);
        CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(company_id, account_code);
      `);
    } catch (e) {}
    
    // Grant access to new tables for the company's db user as postgres/superuser
    try {
      const { rows } = await masterQuery('SELECT db_name, db_user FROM companies WHERE id = $1', [companyId]);
      if (rows.length > 0 && rows[0].db_user && rows[0].db_name) {
        const { db_name, db_user } = rows[0];
        const setupPool = new Pool({
          host: env.database?.host || env.db_host || 'localhost',
          port: parseInt(env.database?.port || env.db_port || '5432', 10),
          database: db_name,
          user: env.database?.user || env.db_user || 'postgres',
          password: env.database?.password || env.db_password || ''
        });
        try {
          await setupPool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${db_user}`);
          await setupPool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${db_user}`);
          await setupPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${db_user}`);
          await setupPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${db_user}`);
          debugLogger.success('DatabaseProvisioning', `[SchemaSync] Re-granted all table and sequence privileges on ${db_name} to user ${db_user}`);
        } finally {
          await setupPool.end();
        }
      }
    } catch (e) {
      debugLogger.warn('DatabaseProvisioning', `Failed to re-grant privileges for company ${companyId}`, e);
    }

    debugLogger.success('DatabaseProvisioning', `[SchemaSync] Successfully synchronized schema for company: ${companyId}`);
  } catch (error) {
    debugLogger.error('DatabaseProvisioning', `[SchemaSync] Error synchronizing database for company ${companyId}:`, error);
  }
};
