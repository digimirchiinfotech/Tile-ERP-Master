const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });
pool.query("UPDATE companies SET status = 'Active'").then(() => {
  console.log('Fixed DB companies');
  process.exit(0);
}).catch(console.error);
