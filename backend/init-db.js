/**
 * init-db.js
 * Database initialization script for Tile-ERP-Master.
 *
 * Creates all required tables and seeds a superadmin user.
 * Safe to run multiple times — uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
 *
 * Usage:
 *   node backend/init-db.js
 *
 * Environment variables (reads from .env automatically):
 *   DATABASE_URL  — full PostgreSQL connection string (preferred on Railway)
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD — individual settings
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the backend directory
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

// ─── Connection ────────────────────────────────────────────────────────────────

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('railway') || process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    }
  : {
      host:     process.env.DB_HOST     || process.env.PGHOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
      database: process.env.DB_NAME     || process.env.PGDATABASE || 'tile_erp_master',
      user:     process.env.DB_USER     || process.env.PGUSER     || 'postgres',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
    };

const pool = new Pool(poolConfig);

// ─── Superadmin credentials ────────────────────────────────────────────────────

const SUPERADMIN = {
  email:    'admin@tile-erp.com',
  username: 'admin',
  password: 'Admin@123456',
  name:     'Super Admin',
  role:     'super_admin',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return res.rows[0].exists;
}

function log(msg) {
  console.log(`  ${msg}`);
}

// ─── Schema creation ───────────────────────────────────────────────────────────

async function createExtensions(client) {
  console.log('\n📦 Installing PostgreSQL extensions...');
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  log('✅ uuid-ossp, pgcrypto');
}

async function createSubscriptionPlansTable(client) {
  if (await tableExists(client, 'subscription_plans')) {
    log('⏭  subscription_plans — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.subscription_plans (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      code        VARCHAR(50)  NOT NULL UNIQUE,
      price       NUMERIC(10,2) DEFAULT 0,
      price_monthly NUMERIC(10,2),
      max_users   INTEGER,
      max_companies INTEGER DEFAULT 1,
      duration    INTEGER DEFAULT 30,
      duration_type VARCHAR(20) DEFAULT 'days',
      features    JSONB,
      status      VARCHAR(20) DEFAULT 'Active',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Seed default plans
  await client.query(`
    INSERT INTO public.subscription_plans (name, code, price, max_users, features)
    VALUES
      ('Free Trial',    'free_trial',    0,      5,   '["basic"]'),
      ('Starter',       'starter',       999,    10,  '["basic","reports"]'),
      ('Professional',  'professional',  2999,   50,  '["basic","reports","ai","api"]'),
      ('Enterprise',    'enterprise',    9999,   NULL,'["all"]')
    ON CONFLICT (code) DO NOTHING
  `);
  log('✅ subscription_plans — created + seeded');
}

async function createCompaniesTable(client) {
  if (await tableExists(client, 'companies')) {
    log('⏭  companies — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.companies (
      id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name                 VARCHAR(255) NOT NULL,
      industry             VARCHAR(100),
      email_id             VARCHAR(255),
      contact_number       VARCHAR(50),
      contact_person_name  VARCHAR(255),
      website              VARCHAR(255),
      address              TEXT,
      city                 VARCHAR(100),
      state                VARCHAR(100),
      country              VARCHAR(100),
      domain               VARCHAR(255),
      iec_no               VARCHAR(100),
      gstn                 VARCHAR(50),
      pan                  VARCHAR(20),
      logo_url             TEXT,
      subscription_plan    VARCHAR(100) DEFAULT 'Free Trial',
      status               VARCHAR(50)  DEFAULT 'Active',
      db_name              VARCHAR(100),
      db_host              VARCHAR(255),
      db_port              VARCHAR(10),
      db_user              VARCHAR(100),
      db_password          VARCHAR(255),
      permission_no        VARCHAR(100),
      permission_year      VARCHAR(20)  DEFAULT '2025-26',
      settings             JSONB        DEFAULT '{}',
      registered_date      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      last_login           TIMESTAMP,
      created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ companies — created');
}

async function createRolesTable(client) {
  if (await tableExists(client, 'roles')) {
    log('⏭  roles — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.roles (
      id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
      name        VARCHAR(100) NOT NULL,
      code        VARCHAR(50)  NOT NULL,
      description TEXT,
      is_system   BOOLEAN DEFAULT FALSE,
      status      VARCHAR(20)  DEFAULT 'Active',
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (company_id, code)
    )
  `);
  // Seed system-level roles (company_id = NULL means global/system role)
  await client.query(`
    INSERT INTO public.roles (name, code, description, is_system)
    VALUES
      ('Super Admin',      'super_admin',      'Full system access',                    TRUE),
      ('Company Admin',    'company_admin',    'Full access within a company',          TRUE),
      ('Admin',            'admin',            'Administrative access',                 TRUE),
      ('Manager',          'manager',          'Managerial access',                     TRUE),
      ('Sales Executive',  'sales_executive',  'Sales and CRM access',                  TRUE),
      ('Accountant',       'accountant',       'Finance and accounting access',         TRUE),
      ('Viewer',           'viewer',           'Read-only access',                      TRUE)
    ON CONFLICT (company_id, code) DO NOTHING
  `);
  log('✅ roles — created + seeded');
}

async function createPermissionsTable(client) {
  if (await tableExists(client, 'permissions')) {
    log('⏭  permissions — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.permissions (
      id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name        VARCHAR(100) NOT NULL UNIQUE,
      code        VARCHAR(100) NOT NULL UNIQUE,
      module      VARCHAR(100),
      description TEXT,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(`
    INSERT INTO public.permissions (name, code, module)
    VALUES
      ('All Access',            'all',                    'system'),
      ('View Dashboard',        'dashboard.view',         'dashboard'),
      ('Manage Users',          'users.manage',           'users'),
      ('View Users',            'users.view',             'users'),
      ('Manage Companies',      'companies.manage',       'companies'),
      ('Manage Leads',          'leads.manage',           'leads'),
      ('View Leads',            'leads.view',             'leads'),
      ('Manage Clients',        'clients.manage',         'clients'),
      ('View Clients',          'clients.view',           'clients'),
      ('Manage Products',       'products.manage',        'products'),
      ('View Products',         'products.view',          'products'),
      ('Manage Invoices',       'invoices.manage',        'invoices'),
      ('View Invoices',         'invoices.view',          'invoices'),
      ('Manage Orders',         'orders.manage',          'orders'),
      ('View Orders',           'orders.view',            'orders'),
      ('Manage Finance',        'finance.manage',         'finance'),
      ('View Finance',          'finance.view',           'finance'),
      ('View Reports',          'reports.view',           'reports'),
      ('Export Reports',        'reports.export',         'reports'),
      ('Manage Settings',       'settings.manage',        'settings')
    ON CONFLICT (code) DO NOTHING
  `);
  log('✅ permissions — created + seeded');
}

async function createUsersTable(client) {
  if (await tableExists(client, 'users')) {
    log('⏭  users — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.users (
      id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      company_id           UUID REFERENCES public.companies(id) ON DELETE SET NULL,
      name                 VARCHAR(255) NOT NULL,
      email_id             VARCHAR(255) NOT NULL UNIQUE,
      username             VARCHAR(100) UNIQUE,
      password_hash        VARCHAR(255) NOT NULL,
      role                 VARCHAR(50)  NOT NULL DEFAULT 'sales_executive',
      permissions          JSONB        DEFAULT '[]',
      settings             JSONB        DEFAULT '{}',
      avatar_url           VARCHAR(255),
      designation          VARCHAR(100),
      department           VARCHAR(100),
      contact_number       VARCHAR(50),
      employee_id          VARCHAR(100),
      territory            VARCHAR(255),
      sales_target         NUMERIC(15,2),
      commission           NUMERIC(5,2),
      country              VARCHAR(255),
      city                 VARCHAR(255),
      client_id            UUID,
      status               VARCHAR(50)  DEFAULT 'Active',
      is_active            BOOLEAN      DEFAULT TRUE,
      must_change_password BOOLEAN      DEFAULT FALSE,
      last_login           TIMESTAMP,
      created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ users — created');
}

async function createRefreshTokensTable(client) {
  if (await tableExists(client, 'refresh_tokens')) {
    log('⏭  refresh_tokens — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.refresh_tokens (
      id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ refresh_tokens — created');
}

async function createPasswordResetTokensTable(client) {
  if (await tableExists(client, 'password_reset_tokens')) {
    log('⏭  password_reset_tokens — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.password_reset_tokens (
      id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ password_reset_tokens — created');
}

async function createActiveUserSessionsTable(client) {
  if (await tableExists(client, 'active_user_sessions')) {
    log('⏭  active_user_sessions — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.active_user_sessions (
      id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      refresh_token TEXT,
      ip_address    VARCHAR(100),
      user_agent    TEXT,
      device        VARCHAR(50),
      browser       VARCHAR(50),
      location      VARCHAR(255),
      last_login    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status        VARCHAR(20) DEFAULT 'Active',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ active_user_sessions — created');
}

async function createCompanySubscriptionsTable(client) {
  if (await tableExists(client, 'company_subscriptions')) {
    log('⏭  company_subscriptions — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.company_subscriptions (
      id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      plan_id    INTEGER REFERENCES public.subscription_plans(id),
      status     VARCHAR(50) DEFAULT 'active',
      start_date DATE DEFAULT CURRENT_DATE,
      end_date   DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ company_subscriptions — created');
}

async function createModuleAccessTable(client) {
  if (await tableExists(client, 'module_access')) {
    log('⏭  module_access — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.module_access (
      id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      module_name VARCHAR(100) NOT NULL,
      is_enabled  BOOLEAN DEFAULT TRUE,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (company_id, module_name)
    )
  `);
  log('✅ module_access — created');
}

async function createAuditLogsTable(client) {
  if (await tableExists(client, 'audit_logs')) {
    log('⏭  audit_logs — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.audit_logs (
      id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id    UUID,
      user_id       UUID,
      action        VARCHAR(100),
      resource_type VARCHAR(100),
      resource_id   UUID,
      changes       JSONB,
      ip_address    VARCHAR(50),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ audit_logs — created');
}

async function createNotificationsTable(client) {
  if (await tableExists(client, 'notifications')) {
    log('⏭  notifications — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.notifications (
      id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID,
      user_id    UUID,
      title      VARCHAR(255),
      message    TEXT,
      type       VARCHAR(50)  DEFAULT 'info',
      module     VARCHAR(100),
      priority   VARCHAR(50)  DEFAULT 'normal',
      is_read    BOOLEAN      DEFAULT FALSE,
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ notifications — created');
}

async function createMigrationsAppliedTable(client) {
  if (await tableExists(client, 'migrations_applied')) {
    log('⏭  migrations_applied — already exists');
    return;
  }
  await client.query(`
    CREATE TABLE public.migrations_applied (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ migrations_applied — created');
}

// ─── Superadmin seeding ────────────────────────────────────────────────────────

async function seedSuperAdmin(client) {
  console.log('\n👤 Seeding superadmin user...');

  // Check if superadmin already exists
  const existing = await client.query(
    `SELECT id, email_id, role FROM public.users WHERE email_id = $1 OR username = $2`,
    [SUPERADMIN.email, SUPERADMIN.username]
  );

  if (existing.rows.length > 0) {
    const u = existing.rows[0];
    log(`⏭  Superadmin already exists — email: ${u.email_id}, role: ${u.role}`);
    return;
  }

  const passwordHash = await bcrypt.hash(SUPERADMIN.password, 12);

  await client.query(
    `INSERT INTO public.users
       (name, email_id, username, password_hash, role, status, is_active, must_change_password, permissions)
     VALUES ($1, $2, $3, $4, $5, 'Active', TRUE, FALSE, '["all"]')`,
    [
      SUPERADMIN.name,
      SUPERADMIN.email,
      SUPERADMIN.username,
      passwordHash,
      SUPERADMIN.role,
    ]
  );

  log(`✅ Superadmin created`);
  log(`   Email:    ${SUPERADMIN.email}`);
  log(`   Username: ${SUPERADMIN.username}`);
  log(`   Password: ${SUPERADMIN.password}`);
  log(`   Role:     ${SUPERADMIN.role}`);
}

// ─── Indexes ───────────────────────────────────────────────────────────────────

async function createIndexes(client) {
  console.log('\n🔍 Creating indexes...');
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_email_id   ON public.users(email_id)`,
    `CREATE INDEX IF NOT EXISTS idx_users_username   ON public.users(username)`,
    `CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_users_role       ON public.users(role)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON public.refresh_tokens(token)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id  ON public.audit_logs(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON public.notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_user_sessions(user_id)`,
  ];
  for (const sql of indexes) {
    await client.query(sql);
  }
  log('✅ Indexes created');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       Tile-ERP-Master — Database Init Script     ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const dbInfo = process.env.DATABASE_URL
    ? `DATABASE_URL (${process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, '://***@')})`
    : `${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`;
  console.log(`\n🔌 Connecting to: ${dbInfo}`);

  const client = await pool.connect();

  try {
    console.log('\n📋 Creating tables...');

    // Order matters — respect foreign key dependencies
    await createExtensions(client);
    await createSubscriptionPlansTable(client);
    await createCompaniesTable(client);
    await createRolesTable(client);
    await createPermissionsTable(client);
    await createUsersTable(client);
    await createRefreshTokensTable(client);
    await createPasswordResetTokensTable(client);
    await createActiveUserSessionsTable(client);
    await createCompanySubscriptionsTable(client);
    await createModuleAccessTable(client);
    await createAuditLogsTable(client);
    await createNotificationsTable(client);
    await createMigrationsAppliedTable(client);

    await createIndexes(client);
    await seedSuperAdmin(client);

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║              ✅  Init complete!                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('\n🚀 You can now log in with:');
    console.log(`   Email:    ${SUPERADMIN.email}`);
    console.log(`   Username: ${SUPERADMIN.username}`);
    console.log(`   Password: ${SUPERADMIN.password}`);
    console.log('\n⚠️  Change the superadmin password after first login.\n');
  } catch (err) {
    console.error('\n❌ Init failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
