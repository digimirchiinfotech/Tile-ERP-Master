import dotenv from 'dotenv';
dotenv.config();
import { query } from './src/config/database.js';

async function test() {
  try {
    const res = await query("SELECT id, name, email_id, role, status FROM users WHERE role = 'super_admin'");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}
test().catch(console.error).finally(() => process.exit(0));
