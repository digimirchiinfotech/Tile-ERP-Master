import pool from './backend/src/config/database-wrapper.js';

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name IN ('lc_lumber', 'lc_number', 'lc_date', 'epcg_no') 
      AND table_schema = 'public'
    `);
    console.log(res.rows);
  } finally {
    client.release();
    process.exit(0);
  }
}
check();
