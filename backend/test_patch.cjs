const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway',
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  UPDATE qc_records qc 
  SET client_name = os.supplier_name 
  FROM master_order_sheets os 
  WHERE (qc.order_number = os.production_sheet_no OR qc.order_number = os.po_no) 
  AND (os.company_id = qc.company_id OR qc.company_id IS NULL) 
  AND qc.client_name != os.supplier_name
`).then(r => {
  console.log(r.rowCount, "rows updated");
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});
