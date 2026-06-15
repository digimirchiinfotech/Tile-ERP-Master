const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });
async function run() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE products ALTER COLUMN thickness TYPE VARCHAR(50);");
    console.log("Fixed thickness column in products table");
  } catch(e) {
    console.error("Failed to alter table:", e);
  }
  client.release();
  await pool.end();
}
run();
