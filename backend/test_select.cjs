const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT original_invoice_no FROM proforma_invoices LIMIT 1");
    console.log("Success! Rows:", res.rows);
  } catch(e) {
    console.error("Error running query:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
