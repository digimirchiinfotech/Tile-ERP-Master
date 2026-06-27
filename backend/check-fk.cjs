const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });
pool.query(`
  SELECT conname, pg_get_constraintdef(c.oid)
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'clients' AND c.contype = 'f';
`).then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(e => console.error(e));
