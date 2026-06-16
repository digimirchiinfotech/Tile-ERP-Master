/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import debugLogger from '../utils/debugLogger.js';

dotenv.config();

const { Pool, types } = pg;
 
// Set type parsers to handle BIGINT and NUMERIC types as numbers
// 20 is BIGINT (int8), 1700 is NUMERIC
types.setTypeParser(20, (val) => parseInt(val, 10));
types.setTypeParser(1700, (val) => parseFloat(val));

// Use DATABASE_URL if available (Replit provisioned), otherwise fall back to individual settings
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    }
  : {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
      database: process.env.PGDATABASE || process.env.DB_NAME || 'tile_exporter_crm',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    };

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  
});

pool.on('error', (err) => {
  debugLogger.error('Database', 'Unexpected database error', err);
  process.exit(-1);
});

export const query = async (text, params, companyId = 'super_admin_bypass') => {
  const start = Date.now();
  
  // Tenant Isolation Check
  const isSelectOrUpdate = /SELECT|UPDATE|DELETE/i.test(text);
  const hasWhere = /WHERE/i.test(text);
  const hasCompanyId = /company_id/i.test(text);
  const isExemptTable = /users|roles|companies|migrations/i.test(text);
  
  if (isSelectOrUpdate && hasWhere && !hasCompanyId && !isExemptTable) {
      debugLogger.warning('Database Security', `Query potentially missing tenant isolation (company_id)`, { sql: text.substring(0, 150) });
  }

  const client = await pool.connect();
  try {
    // Inject tenant context securely into the PostgreSQL session
    await client.query("SELECT set_config('app.current_company_id', $1, false)", [companyId]);
    
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    // Only log slow queries (>500ms) in production for performance
    if (duration > 500) {
      debugLogger.warning('Database', `Slow query detected - ${duration}ms`, { sql: text.substring(0, 100) });
    }
    return res;
  } finally {
    // Reset session variable before returning to the pool to prevent context leakage
    await client.query("RESET app.current_company_id").catch(() => {});
    client.release();
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  const timeout = setTimeout(() => {
    debugLogger.error('Database', 'A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  client.query = (...args) => {
    return query.apply(client, args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  
  return client;
};

export default pool;
