const pg = require('pg');

const pool = new pg.Pool({ 
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', 
  ssl: { rejectUnauthorized: false } 
});

async function run() {
  try {
    const res2 = await pool.query(`SELECT id, status, qc_status, company_id FROM proforma_orders LIMIT 10`);
    console.log('POs:', res2.rows);
  } finally {
    await pool.end();
  }
}

run();
