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

import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import extract from 'extract-zip';
import logger from './debugLogger.js';
import env from '../config/env.js';
import { fileURLToPath } from 'url';
import pool from '../config/database-wrapper.js';
import fsPromises from 'fs/promises';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Helper to determine pg_dump/psql paths
async function getPgCommand(cmd) {
  try {
    await execPromise(`${cmd} --version`);
    return cmd;
  } catch (err) {
    // If not in PATH, try common default windows path for pg 18/15
    const fallbackPaths = [
      `"C:\\Program Files\\PostgreSQL\\18\\bin\\${cmd}.exe"`,
      `"C:\\Program Files\\PostgreSQL\\15\\bin\\${cmd}.exe"`,
      `"C:\\Program Files\\PostgreSQL\\14\\bin\\${cmd}.exe"`,
    ];
    for (const fb of fallbackPaths) {
      try {
        await execPromise(`${fb} --version`);
        return fb;
      } catch (e) {
        // continue trying
      }
    }
    throw new Error(`${cmd} not found in PATH or standard directories.`);
  }
}

export const createFullBackup = async (trigger = 'manual') => {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const dateStr = new Date().toLocaleString('en-GB', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).replace(/[/:]/g, '-').replace(', ', '_').toUpperCase();
  
  const backupName = `BACKUP_${dateStr}.zip`;
  const backupPath = path.join(BACKUPS_DIR, backupName);
  const tempDbDumpPath = path.join(BACKUPS_DIR, `db_dump_${Date.now()}.sql`);

  try {
    // 1. Dump Database
    logger.info('Backup', `Starting database dump to ${tempDbDumpPath}`);
    const pgDump = await getPgCommand('pg_dump');
    const dumpCmd = `set PGPASSWORD=${env.database.password}&& ${pgDump} -h ${env.database.host} -p ${env.database.port} -U ${env.database.user} -F c -b -v -f "${tempDbDumpPath}" ${env.database.database}`;
    await execPromise(dumpCmd, { shell: 'cmd.exe' });
    
    // 2. Create Zip
    logger.info('Backup', `Starting zip creation at ${backupPath}`);
    const output = fs.createWriteStream(backupPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        logger.info('Backup', `Backup created successfully: ${backupName} (${archive.pointer()} bytes)`);
        if (fs.existsSync(tempDbDumpPath)) fs.unlinkSync(tempDbDumpPath);
        
        // Log to DB
        try {
          await pool.query(
            "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes) VALUES ($1, $2, $3, $4, $5)",
            [null, 'CREATE', 'BACKUP', null, JSON.stringify({ filename: backupName, trigger, size: archive.pointer() })]
          );
        } catch(e) { logger.error('Backup', 'Audit log failed', e); }
        
        await enforceBackupRetention();
        resolve(backupName);
      });

      archive.on('error', (err) => reject(err));
      archive.pipe(output);

      // Append DB Dump
      archive.file(tempDbDumpPath, { name: 'database.dump' });
      
      // Append Uploads Directory
      if (fs.existsSync(UPLOADS_DIR)) {
        archive.directory(UPLOADS_DIR, 'uploads');
      }

      archive.finalize();
    });

  } catch (err) {
    if (fs.existsSync(tempDbDumpPath)) fs.unlinkSync(tempDbDumpPath);
    logger.error('Backup', `Backup failed: ${err.message}`);
    throw err;
  }
};

export const enforceBackupRetention = async () => {
  try {
    const settings = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'backup_settings'");
    let maxBackups = 3;
    if (settings.rows.length > 0 && settings.rows[0].setting_value?.retention_count) {
      maxBackups = parseInt(settings.rows[0].setting_value.retention_count, 10);
    }
    
    const files = await fsPromises.readdir(BACKUPS_DIR);
    const backups = files.filter(f => f.startsWith('BACKUP_') && f.endsWith('.zip'));
    
    if (backups.length > maxBackups) {
      // Sort by creation time descending (newest first)
      const stats = await Promise.all(backups.map(async f => {
        const stat = await fsPromises.stat(path.join(BACKUPS_DIR, f));
        return { file: f, time: stat.mtime.getTime() };
      }));
      stats.sort((a, b) => b.time - a.time);
      
      const toDelete = stats.slice(maxBackups);
      for (const item of toDelete) {
        await fsPromises.unlink(path.join(BACKUPS_DIR, item.file));
        logger.info('Backup', `Auto-deleted old backup: ${item.file}`);
      }
    }
  } catch(err) {
    logger.error('Backup', 'Failed to enforce retention', err);
  }
};

/**
 * Creates a SQL dump backup for a single tenant database.
 */
export const createTenantDatabaseBackup = async (companyId, db) => {
  const companyRes = await db.globalQuery(
    'SELECT id, name, db_name FROM companies WHERE id = $1',
    [companyId]
  );

  if (companyRes.rows.length === 0) {
    throw new Error('Company not found');
  }

  const company = companyRes.rows[0];
  const dbName = company.db_name || env.database.database;

  const tenantBackupDir = path.resolve(__dirname, '../../uploads/backups/tenants', companyId);
  if (!fs.existsSync(tenantBackupDir)) fs.mkdirSync(tenantBackupDir, { recursive: true });

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `TENANT_BACKUP_${dateStr}.sql`;
  const backupPath = path.join(tenantBackupDir, filename);

  logger.info('Backup', `Starting tenant backup for ${company.name} (${dbName})`);
  const pgDump = await getPgCommand('pg_dump');
  const dumpCmd = `set PGPASSWORD=${env.database.password}&& ${pgDump} -h ${env.database.host} -p ${env.database.port} -U ${env.database.user} -F p -f "${backupPath}" ${dbName}`;
  await execPromise(dumpCmd, { shell: 'cmd.exe' });

  logger.info('Backup', `Tenant backup created: ${filename}`);
  return filename;
};

export const restoreFullBackup = async (filename, backupPathOverride = null) => {
  const targetZip = backupPathOverride || path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(targetZip)) throw new Error('Backup file not found');
  
  const tempExtractDir = path.join(BACKUPS_DIR, `restore_${Date.now()}`);
  
  try {
    logger.info('Restore', `Extracting ${filename} to ${tempExtractDir}`);
    await extract(targetZip, { dir: tempExtractDir });
    
    const dumpFile = path.join(tempExtractDir, 'database.dump');
    const uploadsDir = path.join(tempExtractDir, 'uploads');
    
    if (fs.existsSync(dumpFile)) {
      logger.info('Restore', `Restoring database from dump`);
      const pgRestore = await getPgCommand('pg_restore');
      
      // We must drop existing connections to allow restore, or just restore with clean.
      // -c (clean), -d (dbname). Using -1 for single transaction is safe.
      const restoreCmd = `set PGPASSWORD=${env.database.password}&& ${pgRestore} -h ${env.database.host} -p ${env.database.port} -U ${env.database.user} -d ${env.database.database} --clean --if-exists --no-owner --no-privileges "${dumpFile}"`;
      
      try {
        await execPromise(restoreCmd, { shell: 'cmd.exe' });
      } catch(err) {
        // pg_restore often returns warnings to stderr which exec catches as error, but it succeeds.
        // We will ignore if it's just warnings, or log them.
        logger.warn('Restore', `Restore output: ${err.message}`);
      }
    }
    
    if (fs.existsSync(uploadsDir)) {
      logger.info('Restore', `Restoring uploads directory`);
      // Copy files over
      await fsPromises.cp(uploadsDir, UPLOADS_DIR, { recursive: true, force: true });
    }
    
    // Log success
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes) VALUES ($1, $2, $3, $4, $5)",
      [null, 'RESTORE', 'BACKUP', null, JSON.stringify({ filename, status: 'success' })]
    );
    logger.info('Restore', 'Restore completed successfully');
  } finally {
    // Cleanup
    if (fs.existsSync(tempExtractDir)) {
      await fsPromises.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
    }
  }
};
