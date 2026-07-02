const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tile_exporter_crm',
  user: 'postgres',
  password: '442277'
});

async function run() {
  try {
    const clients = await pool.query("SELECT id, name, client_name FROM clients WHERE name ILIKE '%DEMO%' OR client_name ILIKE '%DEMO%';");
    console.log("Clients matching DEMO:", clients.rows);

    const proformas = await pool.query("SELECT id, invoice_no, client_name, client_id, company_id FROM proforma_invoices;");
    console.log("All Proformas:", proformas.rows);

    const exports = await pool.query("SELECT id, invoice_no, client_name, client_id, company_id FROM export_invoices;");
    console.log("All Exports:", exports.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
