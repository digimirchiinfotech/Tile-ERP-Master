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
import env from './env.js';

const { Pool } = pg;

// Master database connection - manages all company registrations
const masterDatabaseConfig = env.master_database_url
  ? {
      connectionString: env.master_database_url,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    }
  : {
      host: env.master_db_host || env.database?.host || env.db_host || 'localhost',
      port: parseInt(env.master_db_port || env.database?.port || env.db_port || '5432', 10),
      database: env.master_db_name || env.database?.database || 'tile_erp_master',
      user: env.master_db_user || env.database?.user || env.db_user || 'postgres',
      password: env.master_db_password || env.database?.password || env.db_password || '',
      max: 10, // Reduced for better concurrent handling
      idleTimeoutMillis: 10000, 
      connectionTimeoutMillis: 30000, // Keep 30s for stability
      ssl: env.db_ssl === 'true' ? true : false
    };

const masterPool = new Pool(masterDatabaseConfig);

masterPool.on('connect', () => {
});

masterPool.on('error', (err) => {
  console.error('❌ Unexpected master database error:', err);
});

export const masterQuery = async (text, params) => {
  const start = Date.now();
  try {
    const res = await masterPool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[SLOW QUERY - MASTER] ${duration}ms - ${text.substring(0, 100)}`);
    }
    return res;
  } catch (error) {
    console.error('Master database query error:', error.message);
    throw error;
  }
};

export default masterPool;
