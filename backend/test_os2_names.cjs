const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway',
  ssl: { rejectUnauthorized: false }
});

pool.query(`SELECT po_no, production_sheet_no FROM master_order_sheets WHERE po_no='OS/002' OR production_sheet_no='OS/002'`).then(r => {
  console.log(r.rows);
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});
