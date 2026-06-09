const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:442277@localhost:5432/tile_exporter_crm' });

async function run() {
  try {
    await pool.query('DROP TABLE IF EXISTS master_production_updates_history CASCADE;');
    await pool.query('DROP TABLE IF EXISTS master_order_sheet_factories CASCADE;');
    await pool.query('DROP TABLE IF EXISTS master_order_sheet_lines CASCADE;');
    await pool.query('DROP TABLE IF EXISTS master_order_sheets CASCADE;');

    await pool.query(`CREATE TABLE IF NOT EXISTS master_order_sheets (
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
    );`);

    await pool.query(`CREATE TABLE IF NOT EXISTS master_order_sheet_lines (
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
    );`);

    await pool.query(`CREATE TABLE IF NOT EXISTS master_production_updates_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      master_order_sheet_id UUID REFERENCES master_order_sheets(id) ON DELETE CASCADE,
      master_order_sheet_line_id UUID REFERENCES master_order_sheet_lines(id) ON DELETE CASCADE,
      factory_id UUID,
      update_date DATE,
      boxes_produced NUMERIC(12,2),
      remarks TEXT,
      created_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

    console.log('Tables created successfully');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
