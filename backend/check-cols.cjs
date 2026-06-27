const { Pool } = require('pg');

// Check local DB first
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });

async function run() {
  try {
    // Get the actual columns in the clients table
    const res = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position;
    `);
    console.log('CLIENTS TABLE COLUMNS:');
    res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) default: ${r.column_default}`));

    // Try to do the insert with new column names to see if it works
    const testRes = await pool.query(`
      SELECT 'client_name' as col, EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'client_name'
      ) as exists
      UNION ALL
      SELECT 'email_id' as col, EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'email_id'
      ) as exists
      UNION ALL
      SELECT 'name' as col, EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'name'
      ) as exists
      UNION ALL
      SELECT 'email' as col, EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'email'
      ) as exists;
    `);
    console.log('\nCOLUMN CHECK:');
    testRes.rows.forEach(r => console.log(`  ${r.col}: ${r.exists}`));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
