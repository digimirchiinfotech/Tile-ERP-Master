/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * Script to purge old audit_logs and notifications.
 * By default, purges records older than 90 days to prevent database bloat.
 * Run: node src/scripts/archiveOldLogs.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { decrypt } from '../utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const { Pool } = pg;

const RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || 90;

const run = async () => {
  console.log(`🧹 Starting Log Archival Process (Retention: ${RETENTION_DAYS} days)`);
  
  const masterPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'tile_exporter_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // Purge master DB logs if any
    try {
      const masterRes = await masterPool.query(`
        DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
      `);
      console.log(`[Master] Purged ${masterRes.rowCount} old audit_logs`);
    } catch (e) {
      if (e.code !== '42P01') console.warn(`[Master] Error purging audit_logs: ${e.message}`);
    }

    // Get all companies to purge their tenant DBs
    const companiesRes = await masterPool.query(`SELECT id, name, db_name, db_user, db_password FROM companies WHERE status = 'Active'`);
    
    for (const company of companiesRes.rows) {
      console.log(`\nProcessing Company: ${company.name} (${company.db_name})`);
      
      let password = company.db_password;
      if (password && password.includes(':')) {
        try { password = decrypt(password); } catch (e) { /* ignore */ }
      }

      const tenantPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: company.db_name,
        user: company.db_user,
        password: password,
      });

      try {
        const auditRes = await tenantPool.query(`
          DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
        `);
        console.log(`  -> Purged ${auditRes.rowCount} old audit_logs`);

        const notifRes = await tenantPool.query(`
          DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
        `);
        console.log(`  -> Purged ${notifRes.rowCount} old notifications`);
      } catch (e) {
        if (e.code !== '42P01') console.error(`  -> Error processing ${company.name}: ${e.message}`);
      } finally {
        await tenantPool.end();
      }
    }
    
    console.log('\n✅ Log archival process completed successfully.');
  } catch (error) {
    console.error('❌ Log archival failed:', error);
  } finally {
    await masterPool.end();
  }
};

run();
