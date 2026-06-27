const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });
async function run() {
  try {
    const res = await pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'clients';
    `);
    console.log(res.rows);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}
run();
