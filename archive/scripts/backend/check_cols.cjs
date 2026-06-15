const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='export_invoices' OR table_name='proforma_invoices'");
    console.log(res.rows.map(r => r.column_name));
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
