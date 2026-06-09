const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:442277@localhost:5432/tile_exporter_crm' });

async function getTenant() {
  const cRes = await pool.query("SELECT id, name FROM companies");
  console.log(cRes.rows);
  pool.end();
}
getTenant();
