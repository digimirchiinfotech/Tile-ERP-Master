import pg from 'pg';
import env from '../../config/env.js';

const { Pool } = pg;
const pool = new Pool(env.database);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting drop redundant client columns migration...');
    
    const { rows: schemas } = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'public' OR schema_name LIKE 'tile_erp_company_%'
    `);

    for (const { schema_name } of schemas) {
      console.log(`Processing schema: ${schema_name}`);
      
      const { rows: tables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'clients'
      `, [schema_name]);

      if (tables.length === 0) continue;

      await client.query('BEGIN');

      // Check if columns exist before dropping to avoid errors
      const { rows: columns } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = 'clients' AND column_name IN ('client_name', 'email_id')
      `, [schema_name]);

      const columnNames = columns.map(c => c.column_name);

      if (columnNames.includes('client_name')) {
        await client.query(`ALTER TABLE ${schema_name}.clients DROP COLUMN client_name`);
      }
      
      if (columnNames.includes('email_id')) {
        await client.query(`ALTER TABLE ${schema_name}.clients DROP COLUMN email_id`);
      }

      await client.query('COMMIT');
      console.log(`Successfully migrated schema: ${schema_name}`);
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
