const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await pool.query(`ALTER TABLE shipping_instructions ALTER COLUMN "date" DROP NOT NULL;`);
    console.log('Successfully dropped NOT NULL from date');
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await pool.end();
  }
}
run();
