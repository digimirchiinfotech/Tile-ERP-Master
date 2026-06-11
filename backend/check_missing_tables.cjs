const fs = require('fs');
const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  const schema = JSON.parse(fs.readFileSync('schema.json', 'utf8'));
  const expectedTables = Object.keys(schema);
  
  const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  const actualTables = res.rows.map(row => row.table_name);
  
  const missingTables = expectedTables.filter(t => !actualTables.includes(t));
  console.log('Missing Tables:', missingTables);
  
  client.release();
  await pool.end();
}
run();
