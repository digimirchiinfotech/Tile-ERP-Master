const pg = require('pg');
const pool = new pg.Pool({ host: 'localhost', port: 5432, database: 'tile_exporter_crm', user: 'postgres', password: '442277' });

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'deleted_at'
    `);
    console.log('Tables with deleted_at:', rows.map(r => r.table_name));
    
    // Check if these tables actually exist:
    const tablesToCheck = [
      'proforma_invoices', 'export_invoices', 'vgm_documents', 
      'shipping_instructions', 'packing_lists', 'invoice_backside', 
      'export_invoice_annexures', 'companies', 'users', 'products'
    ];
    
    for (const table of tablesToCheck) {
      const { rows } = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'deleted_at'
      `, [table]);
      if (rows.length === 0) {
        console.log(`Table ${table} is missing deleted_at`);
      }
    }
  } finally {
    await pool.end();
  }
}
run();
