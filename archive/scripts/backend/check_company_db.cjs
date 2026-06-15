const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT db_name FROM companies WHERE id = '25967489-35a9-43ee-a630-5bcd35ffe062'");
    console.log("DB Name for this company:", res.rows[0]);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
