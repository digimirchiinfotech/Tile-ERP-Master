import pg from 'pg';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('=== City Database Optimization Cleanup ===');
  const rootPool = new Pool({ host: 'localhost', port: 5432, database: 'postgres', user: 'postgres', password: '442277' });
  const dbRes = await rootPool.query(`SELECT datname FROM pg_database WHERE datistemplate = false AND datname LIKE 'tile_%' ORDER BY datname`);
  await rootPool.end();

  for (const { datname } of dbRes.rows) {
    try {
      console.log(`\nCleaning up global cities for database: ${datname}`);
      const tmpPool = new Pool({ host: 'localhost', port: 5432, database: datname, user: 'postgres', password: '442277' });
      
      const existsRes = await tmpPool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='master_cities') as has_cities`
      );
      if (existsRes.rows[0].has_cities) {
        const deleteRes = await tmpPool.query(`DELETE FROM master_cities WHERE company_id IS NULL`);
        console.log(`  [CLEANUP] Deleted ${deleteRes.rowCount} global cities from ${datname}`);
      } else {
        console.log(`  [SKIP] master_cities table does not exist in ${datname}`);
      }
      
      await tmpPool.end();
    } catch (e) {
      console.log(`\n[ERROR] Skipping ${datname}: ${e.message}`);
    }
  }

  console.log('\n=== Cleanup complete. Running seed_master_data.js to insert optimized cities ===\n');
  try {
    execSync('node seed_master_data.js', { cwd: __dirname, stdio: 'inherit' });
    console.log('\n=== City Database Optimization Complete! ===');
  } catch (err) {
    console.error('Error running seed script:', err);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
