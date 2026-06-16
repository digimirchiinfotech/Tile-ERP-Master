import dotenv from 'dotenv';
dotenv.config();
import pool from './src/config/database.js';

async function test() {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT name, email_id FROM users WHERE id = $1', ['3ace99f5-9ec5-4a30-8728-f325adb551d5']);
    console.log('Result:', r.rows);
  } catch(e) {
    console.error('Error:', e);
  }
  client.release();
}
test().catch(console.error).finally(() => process.exit(0));
