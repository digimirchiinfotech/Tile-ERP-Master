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

import { companyQuery, getCompanyDatabase } from '../config/companyDatabaseRouter.js';
import { query as sharedQuery, getClient as getSharedClient } from '../config/database.js';

/**
 * Middleware to attach a context-aware database query engine to the request.
 * Automatically selects between isolated tenant databases and the shared master database.
 * Implements a hybrid fallback mode to prevent data disappearance during migration.
 */
export const dbRouter = (req, res, next) => {
  req.db = {
    /**
     * Context-aware query function
     */
    query: async (text, params = []) => {
      const companyId = req.companyFilter;
      if (!companyId) return await sharedQuery(text, params);
      return await companyQuery(companyId, text, params);
    },

    globalQuery: async (text, params = []) => {
      return await sharedQuery(text, params);
    },

    /**
     * Get a client for the global database (shared), bypassing company isolation.
     */
    getGlobalClient: async () => {
      return getSharedClient();
    },

    getClient: async () => {
      const companyId = req.companyFilter;
      if (!companyId) return await getSharedClient();
      
      const pool = await getCompanyDatabase(companyId);
      const client = await pool.connect();
      
      // Enforce RLS on shared connections
      if (pool === (await import('../config/masterDatabase.js')).default) {
        await client.query("SELECT set_config('app.current_company_id', $1, false)", [companyId]);
        
        const originalRelease = client.release;
        client.release = async () => {
          // Fire-and-forget reset (doesn't block the actual release)
          client.query(`RESET app.current_company_id`).catch(() => {});
          
          client.release = originalRelease;
          return originalRelease.apply(client);
        };
      }
      
      return client;
    }
  };

  next();
};
