import dotenv from 'dotenv';
dotenv.config();
import pool from './src/config/database.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT id, invoice_no, product_lines 
      FROM proforma_invoices 
      WHERE product_lines::text LIKE '%BRUNSWICK BEIGE%' 
      LIMIT 1;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}
test();
