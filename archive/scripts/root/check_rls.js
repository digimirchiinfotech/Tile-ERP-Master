import { query } from './backend/src/config/database.js';

async function main() {
  try {
    const res = await query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relnamespace = 'public'::regnamespace AND relkind = 'r';
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
