import { query } from './src/config/database.js';

async function run() {
  try {
    const res = await query("SELECT tablename, policyname, qual FROM pg_policies WHERE tablename = 'company_subscriptions'");
    console.log(res.rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
