const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tile_exporter_crm',
  user: 'postgres',
  password: '442277'
});

async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tables = res.rows.map(r => r.table_name);
    for (const table of tables) {
      try {
        const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' AND data_type IN ('character varying', 'text')`);
        for (const col of cols.rows) {
          const check = await pool.query(`SELECT * FROM "${table}" WHERE "${col.column_name}" ILIKE '%DEMO%' LIMIT 1`);
          if (check.rows.length > 0) {
            console.log(`Found DEMO in table ${table}, column ${col.column_name}:`, check.rows);
          }
        }
      } catch (e) {
        // ignore errors for specific tables
      }
    }
    console.log("Done searching.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
