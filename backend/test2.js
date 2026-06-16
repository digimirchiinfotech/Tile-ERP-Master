import dotenv from 'dotenv';
dotenv.config();
import { query as sharedQuery } from './src/config/database.js';

async function test() {
  try {
    const r = await sharedQuery('SELECT name FROM users WHERE id = $1', ['3ace99f5-9ec5-4a30-8728-f325adb551d5'], '00000000-0000-0000-0000-000000000001');
    console.log('Result:', r.rows);
  } catch(e) {
    console.error('Error:', e);
  }
}
test().catch(console.error).finally(() => process.exit(0));
