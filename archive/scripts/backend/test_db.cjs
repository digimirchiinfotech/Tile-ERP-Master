const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT images FROM products WHERE images::text LIKE '%17811944784%'");
    console.log(JSON.stringify(res.rows[0].images, null, 2));
  } catch(e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
