const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const { rows } = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'packing_lists'");
    console.log(rows);
  } finally {
    await pool.end();
  }
}
run();
