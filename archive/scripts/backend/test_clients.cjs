const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'");
    console.log(rows.map(x => x.column_name));
    
    // Check if there is ANY trigger on clients
    const { rows: trigs } = await pool.query("SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'clients'");
    console.log('Triggers on clients:', trigs);
  } finally {
    await pool.end();
  }
}
run();
