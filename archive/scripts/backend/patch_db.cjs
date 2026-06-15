const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });
async function run() {
  const client = await pool.connect();
  console.log('Connected');
  const cols = ['domain VARCHAR(255)', 'contact_person_name VARCHAR(255)', 'website VARCHAR(255)', 'address TEXT', 'city VARCHAR(100)', 'state VARCHAR(100)', 'country VARCHAR(100)', 'iec_no VARCHAR(100)', 'gstn VARCHAR(50)'];
  for (const col of cols) {
    try {
      await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${col}`);
      console.log('Added ' + col);
    } catch(e) {
      console.error('Failed to add ' + col, e.message);
    }
  }
  client.release();
  await pool.end();
}
run();
