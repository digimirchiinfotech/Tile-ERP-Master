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

import cron from 'node-cron';
import logger from './debugLogger.js';
import { createFullBackup, testRestore } from './backupService.js';
import pool from '../config/database-wrapper.js';

let activeJob = null;
let testRestoreJob = null;

const scheduleBackup = (frequency) => {
  if (activeJob) {
    activeJob.stop();
  }
  if (testRestoreJob) {
    testRestoreJob.stop();
  }

  let cronExpression = '0 2 * * 0'; // Default Weekly on Sunday at 2 AM
  
  if (frequency === 'Daily') {
    cronExpression = '0 2 * * *';
  } else if (frequency === 'Monthly') {
    cronExpression = '0 2 1 * *';
  }

  logger.info('Scheduler', `Initializing auto-backup with frequency: ${frequency} (Cron: ${cronExpression})`);
  
  activeJob = cron.schedule(cronExpression, async () => {
    logger.info('Scheduler', 'Starting automated scheduled backup');
    const client = await pool.connect();
    try {
      // Use pg_try_advisory_xact_lock (transaction-level) so PgBouncer transaction
      // pooling does not orphan the lock. The lock is released automatically when
      // the transaction ends, so NO manual pg_advisory_unlock is needed.
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT pg_try_advisory_xact_lock(1002) as locked');
      if (!rows[0].locked) {
        await client.query('ROLLBACK');
        logger.info('Scheduler', 'Backup already in progress by another instance. Skipping.');
        return;
      }
      await createFullBackup('automated');
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      logger.error('Scheduler', 'Automated backup failed', err);
    } finally {
      client.release();
    }
  });

  // Schedule monthly test restore (1st of every month at 3 AM)
  testRestoreJob = cron.schedule('0 3 1 * *', async () => {
    logger.info('Scheduler', 'Starting automated scheduled test restore');
    const client = await pool.connect();
    try {
      // Transaction-level advisory lock: safe with PgBouncer transaction mode.
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT pg_try_advisory_xact_lock(1003) as locked');
      if (!rows[0].locked) {
        await client.query('ROLLBACK');
        logger.info('Scheduler', 'Test restore already in progress by another instance. Skipping.');
        return;
      }
      await testRestore();
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      logger.error('Scheduler', 'Monthly automated test restore failed', err);
    } finally {
      client.release();
    }
  });
  logger.info('Scheduler', 'Monthly test restore job scheduled for 03:00 on the 1st of every month');
};

export const initBackupScheduler = async () => {
  try {
    const res = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'backup_settings'");
    let enabled = false;
    let frequency = 'Weekly';
    
    if (res.rows.length > 0) {
      const config = res.rows[0].setting_value;
      enabled = config?.auto_backup_enabled ?? false;
      frequency = config?.backup_frequency ?? 'Weekly';
    }
    
    if (enabled) {
      scheduleBackup(frequency);
    } else {
      logger.info('Scheduler', 'Auto-backup is currently disabled in system settings.');
    }
  } catch (err) {
    logger.error('Scheduler', 'Failed to initialize backup scheduler', err);
  }
};

export const updateScheduler = (enabled, frequency) => {
  if (enabled) {
    scheduleBackup(frequency);
  } else {
    if (activeJob) {
      activeJob.stop();
    }
    if (testRestoreJob) {
      testRestoreJob.stop();
    }
    logger.info('Scheduler', 'Auto-backup and scheduled restore tests stopped.');
  }
};
