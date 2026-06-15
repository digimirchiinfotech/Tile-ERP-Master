import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import env from './backend/src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  user: env.db.user,
  host: env.db.host,
  database: env.db.database,
  password: env.db.password,
  port: env.db.port,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Fetching all company IDs...');
    const companiesRes = await client.query('SELECT company_id FROM companies WHERE status != $1', ['Deleted']);
    const companyIds = companiesRes.rows.map(r => r.company_id);
    console.log(`Found ${companyIds.length} companies.`);

    for (const companyId of companyIds) {
      console.log(`Migrating for company ${companyId}...`);
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_company_id', $1, false)", [companyId]);

      // Rename column in proforma_invoices if it exists
      try {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS(SELECT *
              FROM information_schema.columns
              WHERE table_name='proforma_invoices' and column_name='lc_lumber')
            THEN
                ALTER TABLE "proforma_invoices" RENAME COLUMN "lc_lumber" TO "lc_number";
            END IF;
          END $$;
        `);
      } catch (err) {
        console.warn(`Could not rename in proforma_invoices for ${companyId}: ${err.message}`);
      }

      // Rename column in proforma_orders if it exists
      try {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS(SELECT *
              FROM information_schema.columns
              WHERE table_name='proforma_orders' and column_name='lc_lumber')
            THEN
                ALTER TABLE "proforma_orders" RENAME COLUMN "lc_lumber" TO "lc_number";
            END IF;
          END $$;
        `);
      } catch (err) {
        console.warn(`Could not rename in proforma_orders for ${companyId}: ${err.message}`);
      }

      // Rename column in export_invoices if it exists
      try {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS(SELECT *
              FROM information_schema.columns
              WHERE table_name='export_invoices' and column_name='lc_lumber')
            THEN
                ALTER TABLE "export_invoices" RENAME COLUMN "lc_lumber" TO "lc_number";
            END IF;
          END $$;
        `);
      } catch (err) {
        console.warn(`Could not rename in export_invoices for ${companyId}: ${err.message}`);
      }
      
      await client.query('COMMIT');
    }
    
    // Also rename in global super_admin schema in case any tables exist there
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_company_id', 'super_admin_bypass', false)");
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='proforma_invoices' and column_name='lc_lumber') THEN
              ALTER TABLE "proforma_invoices" RENAME COLUMN "lc_lumber" TO "lc_number";
          END IF;
          IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='proforma_orders' and column_name='lc_lumber') THEN
              ALTER TABLE "proforma_orders" RENAME COLUMN "lc_lumber" TO "lc_number";
          END IF;
          IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='export_invoices' and column_name='lc_lumber') THEN
              ALTER TABLE "export_invoices" RENAME COLUMN "lc_lumber" TO "lc_number";
          END IF;
        END $$;
      `);
      await client.query('COMMIT');
    } catch(err) {
      await client.query('ROLLBACK');
    }
    
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
