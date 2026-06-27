const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/tile_erp' });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'export_invoices' AND column_name IN ('lc_number', 'lc_date', 'epcg_no')")
  .then(res => { 
    console.log('EXP:', res.rows); 
    return pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name IN ('lc_number', 'lc_date', 'epcg_no')");
  })
  .then(res => { 
    console.log('PI:', res.rows); 
    process.exit(0); 
  })
  .catch(console.error);
