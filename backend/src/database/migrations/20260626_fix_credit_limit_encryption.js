import pg from 'pg';
import env from '../../config/env.js';
import { decrypt } from '../../utils/encryption.js';

const { Pool } = pg;
const pool = new Pool(env.database);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting credit_limit decryption migration...');
    
    // Get all schemas (public + tenant schemas)
    const { rows: schemas } = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'public' OR schema_name LIKE 'tile_erp_company_%'
    `);

    for (const { schema_name } of schemas) {
      console.log(`Processing schema: ${schema_name}`);
      
      // Check if clients table exists in this schema
      const { rows: tables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'clients'
      `, [schema_name]);

      if (tables.length === 0) continue;

      await client.query('BEGIN');

      // 1. Fetch all clients in this schema to decrypt their credit limit
      const { rows: clients } = await client.query(`SELECT id, credit_limit FROM ${schema_name}.clients WHERE credit_limit IS NOT NULL`);
      
      const decryptedValues = [];
      for (const row of clients) {
        let decryptedLimit = 0;
        try {
          const decryptedStr = decrypt(row.credit_limit);
          decryptedLimit = parseFloat(decryptedStr);
        } catch (e) {
          decryptedLimit = parseFloat(row.credit_limit);
        }
        
        if (!Number.isFinite(decryptedLimit)) {
          decryptedLimit = 0;
        }
        decryptedValues.push({ id: row.id, limit: decryptedLimit });
      }

      // 2. Change column type
      // Postgres requires USING clause to cast existing strings to numeric if they aren't directly castable. 
      // We will first add a temporary column, populate it, drop the old one, and rename.
      
      await client.query(`ALTER TABLE ${schema_name}.clients ADD COLUMN credit_limit_numeric NUMERIC(15,2) DEFAULT 0`);
      
      // Update with decrypted values
      for (const val of decryptedValues) {
        if (typeof val.limit !== 'number' || isNaN(val.limit)) {
          val.limit = 0;
        }
        await client.query(`UPDATE ${schema_name}.clients SET credit_limit_numeric = $1 WHERE id = $2`, [val.limit, val.id]);
      }
      
      // Drop old column and rename new one
      await client.query(`ALTER TABLE ${schema_name}.clients DROP COLUMN credit_limit`);
      await client.query(`ALTER TABLE ${schema_name}.clients RENAME COLUMN credit_limit_numeric TO credit_limit`);

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
