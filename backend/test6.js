import dotenv from 'dotenv';
dotenv.config();
import { query } from './src/config/database.js';

async function test() {
  const r = await query('SELECT count(*) FROM proforma_invoices');
  console.log('Total PIs:', r.rows);
}
test().catch(console.error).finally(() => process.exit(0));
