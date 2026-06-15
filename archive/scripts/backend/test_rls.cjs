const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT schemaname, tablename, policyname, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('leads', 'proforma_orders', 'qc_records')
    `);
    console.log('Policies:', rows);
  } finally {
    await pool.end();
  }
}
run();
