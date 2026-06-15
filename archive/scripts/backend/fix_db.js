import pg from 'pg';

const connectionString = 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Connecting to Railway DB...");
    const client = await pool.connect();
    console.log("Connected successfully!");
    
    console.log("Patching subscription_plans...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE,
        price NUMERIC(10,2) DEFAULT 0,
        price_monthly NUMERIC(10,2),
        max_users INTEGER,
        max_companies INTEGER DEFAULT 1,
        duration INTEGER DEFAULT 30,
        duration_type VARCHAR(20) DEFAULT 'days',
        features JSONB,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;`).catch(() => {});
    await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10,2);`).catch(() => {});
    await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_companies INTEGER DEFAULT 1;`).catch(() => {});
    await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;`).catch(() => {});
    await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) DEFAULT 'days';`).catch(() => {});
    
    console.log("Patching module_access...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.module_access (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          module_name VARCHAR(100) NOT NULL,
          is_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (company_id, module_name)
      );
    `);
    
    console.log("Patching users.username...");
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;`).catch(() => {});

    console.log("Patching companies...");
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_name VARCHAR(100);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_host VARCHAR(255);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_port VARCHAR(10);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_user VARCHAR(100);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_password VARCHAR(255);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_id VARCHAR(255);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS pan VARCHAR(20);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'Free Trial';`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS permission_no VARCHAR(100);`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS permission_year VARCHAR(20) DEFAULT '2025-26';`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`).catch(() => {});

    console.log("Patching users...");
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;`).catch(() => {});

    console.log("Done patching global schema. No tenant patching required because the DB is shared.");
    
    client.release();
    console.log("All done!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
