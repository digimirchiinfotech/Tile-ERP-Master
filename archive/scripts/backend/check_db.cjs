const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });
async function run() {
  const client = await pool.connect();
  const res = await client.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'currencies'");
  console.log(res.rows);
  client.release();
  await pool.end();
}
run();
