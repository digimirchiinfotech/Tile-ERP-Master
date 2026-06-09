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

import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import pool from '../config/database-wrapper.js';
import { createFullBackup, restoreFullBackup } from '../utils/backupService.js';
import { updateScheduler } from '../utils/backupScheduler.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

export const getSettings = async (req, res) => {
  try {
    const result = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'backup_settings'");
    const defaultSettings = { auto_backup_enabled: true, backup_frequency: 'Weekly', retention_count: 3 };
    if (result.rows.length === 0) {
      return res.json({ success: true, data: defaultSettings });
    }
    res.json({ success: true, data: { ...defaultSettings, ...result.rows[0].setting_value } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch backup settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { auto_backup_enabled, backup_frequency, retention_count } = req.body;
    const settings = {
      auto_backup_enabled: !!auto_backup_enabled,
      backup_frequency: backup_frequency || 'Weekly',
      retention_count: parseInt(retention_count, 10) || 3
    };

    const exist = await pool.query("SELECT id FROM system_settings WHERE setting_key = 'backup_settings'");
    if (exist.rows.length === 0) {
      await pool.query(
        "INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES ($1, $2, $3, $4)",
        ['backup_settings', JSON.stringify(settings), 'security', 'System Backup Configuration']
      );
    } else {
      await pool.query(
        "UPDATE system_settings SET setting_value = $1, updated_at = NOW() WHERE setting_key = 'backup_settings'",
        [JSON.stringify(settings)]
      );
    }

    updateScheduler(settings.auto_backup_enabled, settings.backup_frequency);

    res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

export const createBackup = async (req, res) => {
  try {
    const backupName = await createFullBackup('manual');
    res.json({ success: true, message: 'Backup created successfully', data: { name: backupName } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Backup failed' });
  }
};

export const listBackups = async (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    
    const files = await fsPromises.readdir(BACKUPS_DIR);
    const backups = [];
    
    for (const f of files) {
      if (f.startsWith('BACKUP_') && f.endsWith('.zip')) {
        const stat = await fsPromises.stat(path.join(BACKUPS_DIR, f));
        // Parse date from BACKUP_DD-MM-YYYY_HH-MM_AM.zip or use stat mtime
        backups.push({
          name: f,
          size: stat.size,
          createdAt: stat.mtime,
          status: 'Available',
          type: 'Full Backup'
        });
      }
    }
    
    backups.sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({ success: true, data: backups });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to list backups' });
  }
};

export const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const target = path.join(BACKUPS_DIR, filename);
    if (!filename.startsWith('BACKUP_') || !filename.endsWith('.zip') || !fs.existsSync(target)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }
    
    await fsPromises.unlink(target);
    
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes) VALUES ($1, $2, $3, $4, $5)",
      [req.user?.id || null, 'DELETE', 'BACKUP', null, JSON.stringify({ filename, status: 'success' })]
    );

    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete backup' });
  }
};

export const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const target = path.join(BACKUPS_DIR, filename);
    if (!filename.startsWith('BACKUP_') || !filename.endsWith('.zip') || !fs.existsSync(target)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }
    
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes) VALUES ($1, $2, $3, $4, $5)",
      [req.user?.id || null, 'DOWNLOAD', 'BACKUP', null, JSON.stringify({ filename, status: 'success' })]
    );

    res.download(target);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to download backup' });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;
    let targetFile = null;

    if (req.file) {
      // User uploaded a zip
      targetFile = req.file.path;
    } else if (filename) {
      // Restore from existing
      targetFile = path.join(BACKUPS_DIR, filename);
      if (!fs.existsSync(targetFile)) {
        return res.status(404).json({ success: false, message: 'Backup file not found on server' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'No backup file provided' });
    }

    // Safety snapshot
    await createFullBackup('pre_restore_snapshot');

    // Restore
    await restoreFullBackup(filename || req.file.originalname, targetFile);

    // If uploaded, clean up temp file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ success: true, message: 'System restored successfully' });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message || 'Restore failed' });
  }
};
