const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const { rows } = await pool.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_name IN ('leads', 'proforma_orders', 'qc_records')");
    console.log(rows);
    
    // Check if there are ANY triggers
    const { rows: triggers } = await pool.query("SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_table IN ('leads', 'proforma_orders', 'qc_records')");
    console.log('Triggers:', triggers);

  } finally {
    await pool.end();
  }
}
run();
