const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const clients = await pool.query("SELECT id, name, client_name FROM clients LIMIT 5;");
    console.log("Clients:", clients.rows);

    const proformas = await pool.query("SELECT id, invoice_no, client_name, client_id, company_id FROM proforma_invoices;");
    console.log("Proformas:", proformas.rows);

    const exports = await pool.query("SELECT id, invoice_no, client_name, client_id, company_id FROM export_invoices;");
    console.log("Exports:", exports.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
