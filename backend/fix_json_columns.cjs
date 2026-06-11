const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await pool.query(`ALTER TABLE shipping_instructions ALTER COLUMN shipper_details TYPE TEXT USING shipper_details::text`);
    await pool.query(`ALTER TABLE shipping_instructions ALTER COLUMN consignee_details TYPE TEXT USING consignee_details::text`);
    console.log('Successfully altered shipper_details and consignee_details to TEXT');
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await pool.end();
  }
}
run();
