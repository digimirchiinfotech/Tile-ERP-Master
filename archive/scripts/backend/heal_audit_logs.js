import dotenv from 'dotenv';
dotenv.config();

import pool from './src/config/database.js';

async function fixAuditLogs() {
  try {
    // 1. Fix global schema
    await pool.query('ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();');
    console.log('Fixed global audit_logs table');

    // 2. Fix all tenant schemas
    const schemaRes = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast');");
    
    for (let row of schemaRes.rows) {
      const schemaName = row.schema_name;
      // ensure we quote schema name in case it's a uuid
      try {
        await pool.query(`ALTER TABLE "${schemaName}".audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
        console.log(`Fixed audit_logs in schema ${schemaName}`);
      } catch (err) {
        if (err.code === '42P01') {
          console.log(`Table audit_logs does not exist in schema ${schemaName}`);
        } else {
          console.error(`Error fixing schema ${schemaName}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Main error:', err);
  } finally {
    await pool.end();
  }
}

fixAuditLogs();
