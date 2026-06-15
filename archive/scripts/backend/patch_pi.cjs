const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE proforma_invoices 
      ADD COLUMN IF NOT EXISTS updated_by UUID;
    `);
    console.log('Successfully added updated_by column to proforma_invoices');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
