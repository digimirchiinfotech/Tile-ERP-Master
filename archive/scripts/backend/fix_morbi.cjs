const pg = require('pg');

const pool = new pg.Pool({ 
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', 
  ssl: { rejectUnauthorized: false } 
});

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM master_cities WHERE UPPER(city_name) = 'MORBI'`);
    console.log('Morbi entries:', res.rows);
  } finally {
    await pool.end();
  }
}

run();
