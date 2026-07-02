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
      // Pass 'super_admin_bypass' context if no companyId is set (for global super_admin queries)
      if (!companyId) return await sharedQuery(text, params, 'super_admin_bypass');
      return await companyQuery(companyId, text, params);
    },

    globalQuery: async (text, params = []) => {
      const companyId = req.companyFilter || 'super_admin_bypass';
      return await sharedQuery(text, params, companyId);
    },

    /**
     * Get a client for the global database (shared), bypassing company isolation.
     */
    getGlobalClient: async () => {
      const client = await getSharedClient();
      const companyId = req.companyFilter || 'super_admin_bypass';
      
      // Enforce RLS context on the direct client checkout
      await client.query("SELECT set_config('app.current_company_id', $1, false)", [companyId]);
      
      const originalRelease = client.release;
      client.release = async (err) => {
        try {
          await client.query(`RESET app.current_company_id`);
        } catch (e) {
          console.error('[SILENT_CATCH_FIXED]', e.message);
        }
        client.release = originalRelease;
        return originalRelease.apply(client, [err]);
      };
      
      return client;
    },

    getClient: async () => {
      const companyId = req.companyFilter;
      if (!companyId) {
        // Enforce super_admin_bypass on the shared client
        const client = await getSharedClient();
        await client.query("SELECT set_config('app.current_company_id', 'super_admin_bypass', false)");
        
        const originalRelease = client.release;
        client.release = async (err) => {
          try {
            await client.query(`RESET app.current_company_id`);
          } catch(e) {
            console.error('[SILENT_CATCH_FIXED]', e.message);
          }
          client.release = originalRelease;
          return originalRelease.apply(client, [err]);
        };
        return client;
      }
      
      const pool = await getCompanyDatabase(companyId);
      const client = await pool.connect();
      
      // Enforce RLS on shared connections
      if (pool === (await import('../config/masterDatabase.js')).default) {
        await client.query("SELECT set_config('app.current_company_id', $1, false)", [companyId]);
        
        const originalRelease = client.release;
        client.release = async (err) => {
          try {
            await client.query(`RESET app.current_company_id`);
          } catch(e) {
            console.error('[SILENT_CATCH_FIXED]', e.message);
          }
          client.release = originalRelease;
          return originalRelease.apply(client, [err]);
        };
      }
      
      return client;
    }
  };

  next();
};
