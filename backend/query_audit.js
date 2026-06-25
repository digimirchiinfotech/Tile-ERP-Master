import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query("SELECT resource_type, count(*) FROM audit_logs GROUP BY resource_type");
  console.log(res.rows);
  process.exit(0);
}
run();
