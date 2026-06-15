const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='proforma_invoices' AND column_name='updated_by'");
    console.log(res.rows);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
