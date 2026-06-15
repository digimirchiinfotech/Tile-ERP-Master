import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME || 'tile_exporter_crm',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',
});

async function check() {
  try {
    const res = await pool.query(`SELECT images FROM products WHERE images IS NOT NULL LIMIT 5`);
    console.log("Products:", JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query(`SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL LIMIT 5`);
    console.log("Users:", JSON.stringify(res2.rows, null, 2));
    
    const res3 = await pool.query(`SELECT logo_url FROM companies WHERE logo_url IS NOT NULL LIMIT 5`);
    console.log("Companies:", JSON.stringify(res3.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
