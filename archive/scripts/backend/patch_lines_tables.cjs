const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    console.log("Creating proforma_invoice_lines...");
    await client.query(`
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
    `);
    
    console.log("Creating proforma_order_lines...");
    await client.query(`
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
    `);

    console.log("Creating master_order_sheets...");
    await client.query(`
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
    `);

    console.log("Creating master_order_sheet_lines...");
    await client.query(`
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
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Missing tables successfully added!");
  } catch(e) {
    console.error("Error creating tables:", e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
