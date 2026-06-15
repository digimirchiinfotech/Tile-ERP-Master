const pg = require('pg');
const pool = new pg.Pool({ 
  host: 'localhost',
  port: 5432,
  database: 'tile_exporter_crm',
  user: 'postgres',
  password: '123' // default or let's use the one from .env: 442277
});

pool.options.password = '442277';

async function run() {
  try {
    const client = await pool.connect();
    
    // Add missing line tables locally just in case
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
        product_type VARCHAR(50) DEFAULT 'tile',
        sanitaryware_product_id UUID,
        model_no VARCHAR(255),
        category VARCHAR(255),
        color VARCHAR(255),
        pieces INTEGER DEFAULT 0,
        cartons INTEGER DEFAULT 0,
        cbm NUMERIC(15, 4) DEFAULT 0,
        is_foc BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Patch proforma_invoices columns
    await client.query(`
      ALTER TABLE proforma_invoices 
      ADD COLUMN IF NOT EXISTS original_invoice_no VARCHAR(100), 
      ADD COLUMN IF NOT EXISTS revision_no VARCHAR(50), 
      ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0, 
      ADD COLUMN IF NOT EXISTS revised_from_id UUID, 
      ADD COLUMN IF NOT EXISTS revision_reason TEXT, 
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    `);

    // Patch proforma_orders columns
    await client.query(`
      ALTER TABLE proforma_orders 
      ADD COLUMN IF NOT EXISTS original_order_no VARCHAR(100), 
      ADD COLUMN IF NOT EXISTS revision_no VARCHAR(50), 
      ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0, 
      ADD COLUMN IF NOT EXISTS revised_from_id UUID, 
      ADD COLUMN IF NOT EXISTS revision_reason TEXT, 
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    `);

    console.log('Successfully patched local database!');
    client.release();
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
run();
