const pg = require('pg');
const pool = new pg.Pool({ host: 'localhost', port: 5432, database: 'tile_exporter_crm', user: 'postgres', password: '442277' });

async function run() {
  const client = await pool.connect();
  try {
    const tables = [
      'companies', 'users', 'clients', 'suppliers', 'products', 
      'proforma_invoices', 'proforma_orders', 'leads', 'qc_records', 
      'master_order_sheets', 'master_order_sheet_lines',
      'catalogue_products', 'export_invoices', 'export_invoice_annexures',
      'vgm_documents', 'packing_lists', 'shipping_instructions', 
      'invoice_backside', 'igst_invoices', 'size_packing_master',
      'factory_names', 'port_of_loading', 'port_of_discharge', 'final_destination'
    ];

    for (const table of tables) {
      try {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') THEN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = '${table}' AND column_name = 'deleted_at'
              ) THEN
                ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMP;
              END IF;
            END IF;
          END $$;
        `);
        console.log(`Added deleted_at to ${table} (if it existed and was missing)`);
      } catch (err) {
        console.log(`Failed for ${table}:`, err.message);
      }
    }
    console.log('Done!');
  } finally {
    client.release();
    await pool.end();
  }
}
run();
