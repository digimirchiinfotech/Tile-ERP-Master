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
import { createFullBackup } from './backupService.js';
import pool from '../config/database-wrapper.js';

let activeJob = null;

const scheduleBackup = (frequency) => {
  if (activeJob) {
    activeJob.stop();
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
      const { rows } = await client.query('SELECT pg_try_advisory_lock(1002) as locked');
      if (!rows[0].locked) {
        logger.info('Scheduler', 'Backup already in progress by another instance. Skipping.');
        return;
      }
      await createFullBackup('automated');
    } catch (err) {
      logger.error('Scheduler', 'Automated backup failed', err);
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock(1002)');
      } catch (e) {
        logger.error('Scheduler', 'Failed to release backup lock', e);
      }
      client.release();
    }
  });
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
  } else if (activeJob) {
    activeJob.stop();
    logger.info('Scheduler', 'Auto-backup stopped.');
  }
};
