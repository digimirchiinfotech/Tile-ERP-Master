const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway',
  ssl: { rejectUnauthorized: false }
});

pool.query(`SELECT name, images FROM products WHERE name='CARARA MATT' OR name='SLATE GREY MATT'`).then(r => {
  console.log(JSON.stringify(r.rows, null, 2));
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});
