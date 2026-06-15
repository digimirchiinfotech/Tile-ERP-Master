const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE proforma_orders 
      ADD COLUMN IF NOT EXISTS original_order_no VARCHAR(100), 
      ADD COLUMN IF NOT EXISTS revision_no VARCHAR(50), 
      ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0, 
      ADD COLUMN IF NOT EXISTS revised_from_id UUID, 
      ADD COLUMN IF NOT EXISTS revision_reason TEXT, 
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    `);
    console.log('Successfully added revision columns to proforma_orders');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
