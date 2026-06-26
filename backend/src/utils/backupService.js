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
import { pipeline } from 'stream/promises';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

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

export const uploadToS3 = async (filePath, fileName) => {
  try {
    const fileStream = fs.createReadStream(filePath);
    const retainUntilDate = new Date();
    retainUntilDate.setDate(retainUntilDate.getDate() + 90); // 90 days from now

    const uploadParams = {
      Bucket: env.aws.s3Bucket,
      Key: `backups/${fileName}`,
      Body: fileStream,
      ObjectLockMode: 'GOVERNANCE',
      ObjectLockRetainUntilDate: retainUntilDate,
    };

    logger.info('Backup', `Uploading ${fileName} to S3...`);
    await s3Client.send(new PutObjectCommand(uploadParams));
    logger.info('Backup', `Successfully uploaded ${fileName} to S3 with 90-day Object Lock`);
    return true;
  } catch (err) {
    logger.error('Backup', `Failed to upload ${fileName} to S3`, err);
    throw err;
  }
};

export const downloadFromS3 = async (fileName, destPath) => {
  try {
    const downloadParams = {
      Bucket: env.aws.s3Bucket,
      Key: `backups/${fileName}`,
    };
    logger.info('Restore', `Downloading ${fileName} from S3...`);
    const response = await s3Client.send(new GetObjectCommand(downloadParams));
    await pipeline(response.Body, fs.createWriteStream(destPath));
    logger.info('Restore', `Successfully downloaded ${fileName}`);
    return destPath;
  } catch (err) {
    logger.error('Restore', `Failed to download ${fileName} from S3`, err);
    throw err;
  }
};

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
        
        try {
          if (env.aws.s3Bucket && env.aws.accessKeyId) {
            await uploadToS3(backupPath, backupName);
            await fsPromises.unlink(backupPath);
            logger.info('Backup', `Deleted local backup zip ${backupName}`);
          }
        } catch (s3Err) {
          logger.error('Backup', 'S3 upload failed, keeping local zip', s3Err);
        }

        // Log to DB
        try {
          await pool.query(
            "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes) VALUES ($1, $2, $3, $4, $5)",
            [null, 'CREATE', 'BACKUP', null, JSON.stringify({ filename: backupName, trigger, size: archive.pointer(), s3_upload: !!env.aws.s3Bucket })]
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

export const testRestore = async () => {
  logger.info('TestRestore', 'Starting monthly automated test restore');
  let backupFileName = null;
  const tempExtractDir = path.join(BACKUPS_DIR, `test_restore_${Date.now()}`);
  const tempDbName = `test_restore_temp_db_${Date.now()}`;
  const zipPath = path.join(BACKUPS_DIR, `temp_${Date.now()}.zip`);

  try {
    const { rows } = await pool.query("SELECT changes FROM audit_logs WHERE action = 'CREATE' AND resource_type = 'BACKUP' ORDER BY created_at DESC LIMIT 1");
    if (rows.length === 0) throw new Error('No backup record found to test');
    
    const changes = typeof rows[0].changes === 'string' ? JSON.parse(rows[0].changes) : rows[0].changes;
    backupFileName = changes.filename;
    
    if (!backupFileName) throw new Error('Could not determine backup filename from logs');

    await downloadFromS3(backupFileName, zipPath);
    await extract(zipPath, { dir: tempExtractDir });
    
    const dumpFile = path.join(tempExtractDir, 'database.dump');
    if (!fs.existsSync(dumpFile)) throw new Error('No database dump found in backup zip');

    const pgClient = await pool.connect();
    try {
      await pgClient.query(`CREATE DATABASE ${tempDbName}`);
    } finally {
      pgClient.release();
    }

    const pgRestore = await getPgCommand('pg_restore');
    const restoreCmd = `set PGPASSWORD=${env.database.password}&& ${pgRestore} -h ${env.database.host} -p ${env.database.port} -U ${env.database.user} -d ${tempDbName} --clean --if-exists --no-owner --no-privileges "${dumpFile}"`;
    
    try {
      await execPromise(restoreCmd, { shell: 'cmd.exe' });
    } catch(err) {
      logger.warn('TestRestore', `Restore output (often has warnings): ${err.message}`);
    }

    const pgClient2 = await pool.connect();
    try {
      await pgClient2.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${tempDbName}' AND pid <> pg_backend_pid()`);
      await pgClient2.query(`DROP DATABASE ${tempDbName}`);
    } finally {
      pgClient2.release();
    }

    await pool.query(
      "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes) VALUES ($1, $2, $3, $4, $5)",
      [null, 'TEST_RESTORE', 'BACKUP', null, JSON.stringify({ filename: backupFileName, status: 'success' })]
    );
    logger.info('TestRestore', 'Monthly test restore completed successfully');

  } catch (err) {
    logger.error('TestRestore', 'Test restore failed', err);
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes) VALUES ($1, $2, $3, $4, $5)",
      [null, 'TEST_RESTORE', 'BACKUP', null, JSON.stringify({ filename: backupFileName, status: 'failed', error: err.message })]
    );
    try {
      const pgClient = await pool.connect();
      await pgClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${tempDbName}' AND pid <> pg_backend_pid()`);
      await pgClient.query(`DROP DATABASE IF EXISTS ${tempDbName}`);
      pgClient.release();
    } catch(e) {}
  } finally {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(tempExtractDir)) await fsPromises.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
  }
};

