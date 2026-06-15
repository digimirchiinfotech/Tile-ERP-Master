const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway',
  ssl: { rejectUnauthorized: false }
});

pool.query(`SELECT product_lines FROM qc_records WHERE order_number='OS/002'`).then(r => {
  console.log(JSON.stringify(r.rows[0].product_lines, null, 2));
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});
