import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME || 'tile_exporter_crm',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',
});

async function main() {
  console.log('Scanning for tables with company_id to enforce RLS...');
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'company_id' 
        AND table_schema = 'public'
        AND table_name NOT IN ('users', 'companies', 'company_subscriptions')
    `);

    for (const row of res.rows) {
      const tableName = row.table_name;
      console.log(`Enforcing RLS on ${tableName}...`);
      
      // Enable RLS
      await pool.query(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
      
      // Force RLS (even for table owners and superusers)
      await pool.query(`ALTER TABLE "${tableName}" FORCE ROW LEVEL SECURITY;`);
      
      // Drop existing policy if it exists
      await pool.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${tableName}";`);
      
      // Create flexible policy that allows super_admin_bypass or strict company_id match
      await pool.query(`
        CREATE POLICY tenant_isolation_policy ON "${tableName}"
        USING (
          current_setting('app.current_company_id', true) = 'super_admin_bypass' 
          OR company_id::text = current_setting('app.current_company_id', true)
        )
        WITH CHECK (
          current_setting('app.current_company_id', true) = 'super_admin_bypass' 
          OR company_id::text = current_setting('app.current_company_id', true)
        );
      `);
    }

    console.log('Successfully enforced RLS on all applicable tables.');
  } catch (e) {
    console.error('Error enforcing RLS:', e);
  } finally {
    pool.end();
  }
}
main();
