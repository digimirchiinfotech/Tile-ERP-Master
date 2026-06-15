const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. id_counters
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.id_counters (
        id SERIAL PRIMARY KEY,
        company_id UUID NOT NULL,
        prefix VARCHAR(20) NOT NULL,
        date_key VARCHAR(20) NOT NULL,
        counter INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, prefix, date_key)
      );
    `);
    
    // 2. export_invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.export_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        invoice_no VARCHAR(100),
        invoice_date DATE,
        proforma_invoice_id UUID,
        client_id UUID,
        subtotal NUMERIC(15,2) DEFAULT 0,
        discount NUMERIC(15,2) DEFAULT 0,
        tax NUMERIC(15,2) DEFAULT 0,
        total_amount NUMERIC(15,2) DEFAULT 0,
        currency VARCHAR(50) DEFAULT 'USD ($)',
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        final_destination VARCHAR(255),
        shipping_marks TEXT,
        container_numbers TEXT,
        seal_numbers TEXT,
        vessel_flight_no VARCHAR(100),
        bl_no VARCHAR(100),
        bl_date DATE,
        sb_no VARCHAR(100),
        sb_date DATE,
        exchange_rate NUMERIC(15, 6) DEFAULT 1.0,
        customs_agent VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Draft',
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. export_invoice_annexures
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.export_invoice_annexures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID REFERENCES public.export_invoices(id) ON DELETE CASCADE,
        annexure_no VARCHAR(100),
        annexure_date DATE,
        content JSONB,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. export_workflow
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.export_workflow (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID REFERENCES public.export_invoices(id) ON DELETE CASCADE,
        stage VARCHAR(100),
        status VARCHAR(50),
        completed_at TIMESTAMP,
        completed_by UUID,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. invoice_backside
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.invoice_backside (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID REFERENCES public.export_invoices(id) ON DELETE CASCADE,
        terms_and_conditions TEXT,
        declarations TEXT,
        bank_details TEXT,
        authorized_signatory TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. packing_list_lines
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.packing_list_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        packing_list_id UUID,
        export_invoice_id UUID,
        product_id UUID,
        product_name VARCHAR(255),
        hsn_code VARCHAR(50),
        quantity INTEGER,
        unit VARCHAR(50),
        net_weight NUMERIC(10,2),
        gross_weight NUMERIC(10,2),
        measurements VARCHAR(100),
        pallet_no VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. pdf_templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.pdf_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        template_name VARCHAR(100) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        html_content TEXT,
        css_content TEXT,
        variables JSONB,
        is_default BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'Active',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. subscription_transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.subscription_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        plan_id INTEGER,
        amount NUMERIC(10,2),
        currency VARCHAR(10) DEFAULT 'USD',
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50),
        payment_method VARCHAR(100),
        reference_no VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. vgm_documents
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.vgm_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        export_invoice_id UUID REFERENCES public.export_invoices(id) ON DELETE CASCADE,
        vgm_no VARCHAR(100),
        vgm_date DATE,
        container_no VARCHAR(100),
        tare_weight NUMERIC(10,2),
        cargo_weight NUMERIC(10,2),
        total_vgm NUMERIC(10,2),
        weighing_method VARCHAR(50),
        authorized_person VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Draft',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('All missing tables created successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
