import pg from 'pg';
import env from './backend/src/config/env.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.db.tenant_url || env.db.url || 'postgres://postgres:postgres@localhost:5432/dm_tile_local'
});

async function run() {
  try {
    console.log('Dropping constraint...');
    await pool.query('ALTER TABLE proforma_orders DROP CONSTRAINT IF EXISTS proforma_orders_created_by_fkey');
    console.log('Constraint dropped successfully!');
    
    await pool.query('ALTER TABLE proforma_orders DROP CONSTRAINT IF EXISTS proforma_orders_updated_by_fkey');
    console.log('Updated by constraint dropped too!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
