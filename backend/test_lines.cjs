const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway',
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT lines FROM master_order_sheets WHERE status='complete' ORDER BY created_at DESC LIMIT 1").then(r => {
  console.log(JSON.stringify(r.rows[0].lines, null, 2));
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});
