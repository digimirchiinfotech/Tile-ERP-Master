import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME || 'tile_exporter_crm',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity = true;
    `);
    console.log("TABLES WITH RLS:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
