const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway',
  ssl: { rejectUnauthorized: false }
});

pool.query(`SELECT * FROM master_order_sheet_lines WHERE master_order_sheet_id IN (SELECT id FROM master_order_sheets WHERE po_no='OS/002' OR production_sheet_no='OS/002')`).then(r => {
  console.log(JSON.stringify(r.rows, null, 2));
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});
