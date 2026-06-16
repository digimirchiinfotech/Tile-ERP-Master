import dotenv from 'dotenv';
dotenv.config();
import { query } from './src/config/database.js';

async function test() {
  const r = await query("SELECT data_type FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'created_by'");
  console.log('Type:', r.rows);
  const r2 = await query("SELECT created_by FROM proforma_invoices WHERE created_by IS NOT NULL LIMIT 5");
  console.log('Values:', r2.rows);
}
test().catch(console.error).finally(() => process.exit(0));
