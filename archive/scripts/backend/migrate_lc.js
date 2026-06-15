import 'dotenv/config';
import pool from './src/config/database.js';

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    console.log('Fetching all company IDs...');
    const companiesRes = await client.query('SELECT id FROM companies WHERE status != $1', ['Deleted']);
    const companyIds = companiesRes.rows.map(r => r.id);
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
      } catch (err) {
        console.warn(`Could not rename for ${companyId}: ${err.message}`);
      }
      await client.query('COMMIT');
    }
    
    // Also rename in global super_admin schema
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
    if (client) {
      await client.query("RESET app.current_company_id").catch(()=>console.log("no reset"));
      client.release();
    }
    process.exit(0);
  }
}

migrate();
