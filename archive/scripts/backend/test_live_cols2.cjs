const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'master_order_sheet_lines'");
    console.log('master_order_sheet_lines:', rows.map(x => x.column_name));

    const { rows: poRows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'proforma_orders'");
    console.log('proforma_orders:', poRows.map(x => x.column_name));
  } finally {
    await pool.end();
  }
}
run();
