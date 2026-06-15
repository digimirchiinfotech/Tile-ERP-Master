const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM proforma_invoices LIMIT 1");
    console.log('Columns:', res.fields.map(f => f.name));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
