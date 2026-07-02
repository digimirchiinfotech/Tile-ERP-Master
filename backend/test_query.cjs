require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, invoice_no, client_name, client_id FROM proforma_invoices WHERE client_name ILIKE '%DEMO%'")
  .then(r => console.log('Proforma:', r.rows))
  .catch(console.error);

pool.query("SELECT id, invoice_no, client_name, client_id FROM export_invoices WHERE client_name ILIKE '%DEMO%'")
  .then(r => console.log('Export:', r.rows))
  .catch(console.error)
  .finally(() => pool.end());
