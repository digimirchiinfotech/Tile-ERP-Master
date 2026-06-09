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
import masterPool, { masterQuery } from './masterDatabase.js';
import { decrypt } from '../utils/encryption.js';
import debugLogger from '../utils/debugLogger.js';

const { Pool } = pg;

// Cache for company database connections - prevents repeated pool creation
const companyDatabaseCache = new Map();
const companyLastAccessTime = new Map();

// Track ongoing initialization to prevent race conditions
const initializationPromises = new Map();

/**
 * Get database connection for a specific company
 * Caches connections and collapses simultaneous requests to avoid redundant pool creation
 * 
 * @param {string} companyId - UUID of the company
 * @returns {Pool} PostgreSQL connection pool for that company
 */
export const getCompanyDatabase = async (companyId) => {
  // 1. Basic validation
  if (!companyId) {
    throw new Error('companyId is required');
  }

  // 2. Return cached connection if available and healthy
  if (companyDatabaseCache.has(companyId)) {
    const cachedPool = companyDatabaseCache.get(companyId);
    // Basic health check - if pool is ending, remove it
    if (cachedPool._ending) {
      companyDatabaseCache.delete(companyId);
      companyLastAccessTime.delete(companyId);
    } else {
      companyLastAccessTime.set(companyId, Date.now());
      return cachedPool;
    }
  }

  // 3. If already initializing, wait for the existing promise
  if (initializationPromises.has(companyId)) {
    return initializationPromises.get(companyId);
  }

  // 4. Start initialization and track it
  const initPromise = (async () => {
    try {
      // Query master database for company's database connection details
      debugLogger.info('Router', `Initializing database for company: "${companyId}"`);
      const result = await masterQuery(
        `SELECT * FROM companies WHERE id::text = $1`,
        [companyId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Company ${companyId} not found in master database`);
      }

      const company = result.rows[0];

      if (company.status?.toLowerCase().trim() !== 'active') {
        throw new Error(`Company ${companyId} is inactive (${company.status})`);
      }

      // Hybrid Mode: If company has no isolated database configuration, use the master pool
      if (!company.db_name) {
        debugLogger.info('Router', `Company ${company.name} is in SHARED mode. Using master pool.`);
        companyDatabaseCache.set(companyId, masterPool);
        return masterPool;
      }

      // Decrypt password if it looks encrypted (contains a colon)
      let dbPassword = company.db_password;
      if (dbPassword && dbPassword.includes(':')) {
        try {
          const decrypted = decrypt(dbPassword);
          if (decrypted) dbPassword = decrypted;
        } catch (e) {
          debugLogger.error('Router', `Failed to decrypt password for company ${companyId}`);
        }
      }

      // Create isolated database pool for this company
      const companyPoolConfig = {
        host: company.db_host || env.database?.host || env.db_host || 'localhost',
        port: parseInt(company.db_port || env.database?.port || env.db_port || '5432', 10),
        database: company.db_name,
        user: company.db_user,
        password: dbPassword,
        max: 10, // Reduced from 30 to prevent global connection exhaustion in multi-tenant setup
        idleTimeoutMillis: 10000, // Reduced to 10s to return idle connections to the server faster
        connectionTimeoutMillis: 30000, // Keep 30s for stability during peak loads
        ssl: env.db_ssl === 'true' ? { rejectUnauthorized: false } : false
      };

      const companyPool = new Pool(companyPoolConfig);

      // Event handlers for debugging
      companyPool.on('error', (err) => {
        debugLogger.error('Router', `Company DB pool error for ${companyId}`, err);
        // Note: We no longer delete from cache here to prevent race conditions during high load.
        // pg-pool handles individual client errors; we only discard on fatal pool destruction.
      });

      // Cache this connection pool
      companyDatabaseCache.set(companyId, companyPool);
      companyLastAccessTime.set(companyId, Date.now());
      return companyPool;
    } finally {
      // Clean up the initialization promise once done
      initializationPromises.delete(companyId);
    }
  })();

  initializationPromises.set(companyId, initPromise);
  return initPromise;
};

/**
 * Execute query on company's database
 * 
 * @param {string} companyId - UUID of the company
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
export const companyQuery = async (companyId, text, params = []) => {
  const start = Date.now();
  try {
    if (!text) {
      throw new Error('Query text is required');
    }

    const pool = await getCompanyDatabase(companyId);
    
    // RLS Enforcement: If using the shared master pool, we must inject the tenant context securely
    if (pool === masterPool) {
      const client = await pool.connect();
      try {
        await client.query("SELECT set_config('app.current_company_id', $1, false)", [companyId]);
        const result = await client.query(text, params);
        
        const duration = Date.now() - start;
        if (duration > 1000) {
          debugLogger.warning('Router', `Slow query detected (Company: ${companyId}) - ${duration}ms`, { sql: text.substring(0, 100) });
        }
        return result;
      } finally {
        // MUST reset the session variable before releasing back to the pool
        await client.query(`RESET app.current_company_id`);
        client.release();
      }
    } else {
      // Physically isolated database - RLS is not required
      const result = await pool.query(text, params);
      
      const duration = Date.now() - start;
      if (duration > 1000) {
        debugLogger.warning('Router', `Slow query detected (Company: ${companyId}) - ${duration}ms`, { sql: text.substring(0, 100) });
      }
      
      return result;
    }
  } catch (error) {
    // Attach context and rethrow
    const err = new Error(`companyQuery error for ${companyId}: ${error.message}`);
    err.original = error;
    throw err;
  }
};

/**
 * Close database connection for a company
 * Used during company deletion or maintenance
 * 
 * @param {string} companyId - UUID of the company
 */
export const closeCompanyDatabase = async (companyId) => {
  try {
    if (companyDatabaseCache.has(companyId)) {
      const pool = companyDatabaseCache.get(companyId);
      if (pool !== masterPool) { // Never close the master pool from here
        await pool.end();
      }
      companyDatabaseCache.delete(companyId);
      companyLastAccessTime.delete(companyId);
    }
  } catch (error) {
    debugLogger.error('Router', `Error closing company database connection for ${companyId}`, error);
  }
};

export default {
  getCompanyDatabase,
  companyQuery,
  closeCompanyDatabase,
  companyDatabaseCache,
  masterPool
};

// Idle pool eviction timeout: 30 minutes
const EVICTION_TIMEOUT_MS = 30 * 60 * 1000;
// Eviction monitoring interval: every 5 minutes
const EVICTION_INTERVAL_MS = 5 * 60 * 1000;

const startEvictionMonitor = () => {
  setInterval(async () => {
    try {
      const now = Date.now();
      debugLogger.trace('Router', 'Running dynamic connection pool eviction scan...', { activePoolsCount: companyDatabaseCache.size });
      
      for (const [companyId, lastAccessTime] of companyLastAccessTime.entries()) {
        const pool = companyDatabaseCache.get(companyId);
        if (pool === masterPool) continue;
        
        if (now - lastAccessTime > EVICTION_TIMEOUT_MS) {
          debugLogger.info('Router', `Dynamic Eviction: Pool for company "${companyId}" has been idle for ${Math.round((now - lastAccessTime) / 60000)} minutes. Draining and evicting...`);
          await closeCompanyDatabase(companyId);
        }
      }
    } catch (err) {
      debugLogger.error('Router', 'Error during connection pool eviction monitor check:', err);
    }
  }, EVICTION_INTERVAL_MS).unref();
};

startEvictionMonitor();

