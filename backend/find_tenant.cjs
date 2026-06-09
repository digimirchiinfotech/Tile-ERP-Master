const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:442277@localhost:5432/tile_exporter_crm' });
pool.query("SELECT c.database_name FROM users u JOIN companies c ON u.company_id = c.id WHERE u.name ILIKE '%chirag%detroja%'", (err, res) => {
  console.log('user database:', res ? res.rows : err);
  pool.end();
});
