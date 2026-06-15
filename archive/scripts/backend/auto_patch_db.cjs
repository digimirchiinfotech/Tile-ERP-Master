const fs = require('fs');
const path = require('path');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });

async function run() {
  const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Parse schema.sql
  const tables = {};
  let currentTable = null;
  const lines = schemaSql.split('\n');

  for (let line of lines) {
      line = line.trim();
      if (line.startsWith('CREATE TABLE')) {
          const match = line.match(/CREATE TABLE public\.([a-zA-Z0-9_]+) \(/);
          if (match) {
              currentTable = match[1];
              tables[currentTable] = {};
          }
      } else if (currentTable && line.startsWith(');')) {
          currentTable = null;
      } else if (currentTable && line.length > 0 && !line.startsWith('--') && !line.startsWith(');')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
              const columnName = parts[0].replace(/,/g, '');
              if (columnName !== 'CONSTRAINT' && columnName !== 'PRIMARY' && columnName !== 'FOREIGN' && columnName !== 'UNIQUE') {
                  let dataType = parts.slice(1).join(' ').replace(/,/g, '');
                  
                  // Clean up constraints because we can't always add NOT NULL safely to existing tables
                  dataType = dataType.replace(/NOT NULL/g, '').trim();
                  dataType = dataType.replace(/DEFAULT .*$/i, '').trim();
                  
                  tables[currentTable][columnName] = dataType;
              }
          }
      }
  }

  const client = await pool.connect();
  console.log('Connected to DB. Starting schema sync...');
  let totalMissing = 0;

  try {
    for (const [tableName, expectedCols] of Object.entries(tables)) {
      // Check if table exists
      const tableCheck = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`, [tableName]);
      if (tableCheck.rows.length === 0) continue;

      // Get existing columns
      const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`, [tableName]);
      const existingCols = colRes.rows.map(r => r.column_name);

      for (const [colName, dataType] of Object.entries(expectedCols)) {
        if (!existingCols.includes(colName)) {
           console.log(`Missing column in ${tableName}: ${colName} (${dataType})`);
           try {
             await client.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${colName} ${dataType}`);
             console.log(`✅ Added ${colName} to ${tableName}`);
             totalMissing++;
           } catch(e) {
             console.error(`❌ Failed to add ${colName} to ${tableName}: ${e.message}`);
           }
        }
      }
    }
    console.log(`Sync complete. Added ${totalMissing} missing columns.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
