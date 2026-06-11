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

import { debugLogger } from '../utils/debugLogger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as auditService from '../services/auditService.js';
import emailService from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASKED_PASSWORD = '********';

const maskEmailSettings = (settings) => {
  if (!settings || typeof settings !== 'object') return settings;
  const masked = { ...settings };
  if (masked.smtpPassword) {
    masked.smtpPassword = MASKED_PASSWORD;
  }
  return masked;
};

const isMaskedOrEmptyPassword = (password) =>
  !password || password === MASKED_PASSWORD;

const ensureSettingsTable = async (db) => {
  // No-op: Table creation and schema checks are strictly managed via migrations
};

export const getAllSettings = async (req, res) => {
  try {
    await ensureSettingsTable(req.db);
    
    const result = await req.db.query(
      `SELECT setting_key, setting_value, category, description, updated_at 
       FROM system_settings 
       ORDER BY category, setting_key`
    );

    const settings = {};
    result.rows.forEach(row => {
      const key = row.setting_key.replace('_settings', '');
      const value = row.category === 'email'
        ? maskEmailSettings(row.setting_value)
        : row.setting_value;
      settings[key] = {
        ...value,
        updatedAt: row.updated_at
      };
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    debugLogger.error('Error fetching system settings:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    await ensureSettingsTable(req.db);
    
    const result = await req.db.query(
      `SELECT setting_key, setting_value, description, updated_at 
       FROM system_settings 
       WHERE category = $1`,
      [category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Settings for category '${category}' not found`
      });
    }

    const settings = category === 'email'
      ? maskEmailSettings(result.rows[0].setting_value)
      : result.rows[0].setting_value;
    settings.updatedAt = result.rows[0].updated_at;

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    debugLogger.error('Error fetching settings by category:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateGeneralSettings = async (req, res) => {
  try {
    await ensureSettingsTable(req.db);
    const { siteName, siteDescription, timezone, dateFormat, currency, language, logoUrl, faviconUrl } = req.body;

    const settingValue = {
      siteName: siteName || 'Business Management System',
      siteDescription: siteDescription || '',
      timezone: timezone || 'UTC',
      dateFormat: dateFormat || 'DD/MM/YYYY',
      currency: currency || 'INR',
      language: language || 'English',
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null
    };

    const result = await req.db.query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = 'general_settings'
       RETURNING setting_value, updated_at`,
      [JSON.stringify(settingValue)]
    );

    if (result.rows.length === 0) {
      await req.db.query(
        `INSERT INTO system_settings (setting_key, setting_value, category, description)
         VALUES ('general_settings', $1, 'general', 'General site configuration settings')`,
        [JSON.stringify(settingValue)]
      );
    }

    // Log Action
    await auditService.logAction({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'general',
      details: { category: 'general', changes: settingValue },
      ipAddress: req.ip
    }, req.db);

    res.json({
      success: true,
      message: 'General settings updated successfully',
      data: settingValue
    });
  } catch (error) {
    debugLogger.error('Error updating general settings:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateEmailSettings = async (req, res) => {
  try {
    await ensureSettingsTable(req.db);
    const { smtpHost, smtpPort, smtpUsername, smtpPassword, fromEmail, fromName, encryption } = req.body;

    let resolvedPassword = smtpPassword || '';
    if (isMaskedOrEmptyPassword(smtpPassword)) {
      const existing = await req.db.query(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'email_settings'`
      );
      resolvedPassword = existing.rows[0]?.setting_value?.smtpPassword || '';
    }

    const settingValue = {
      smtpHost: smtpHost || '',
      smtpPort: smtpPort || 587,
      smtpUsername: smtpUsername || '',
      smtpPassword: resolvedPassword,
      fromEmail: fromEmail || '',
      fromName: fromName || 'Business Management System',
      encryption: encryption || 'TLS'
    };

    const result = await req.db.query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = 'email_settings'
       RETURNING setting_value, updated_at`,
      [JSON.stringify(settingValue)]
    );

    if (result.rows.length === 0) {
      await req.db.query(
        `INSERT INTO system_settings (setting_key, setting_value, category, description, is_sensitive)
         VALUES ('email_settings', $1, 'email', 'Email/SMTP configuration settings', true)`,
        [JSON.stringify(settingValue)]
      );
    }

    // Log Action
    await auditService.logAction({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'email',
      details: { category: 'email' }, // Don't log sensitive credentials
      ipAddress: req.ip
    }, req.db);

    res.json({
      success: true,
      message: 'Email settings updated successfully',
      data: maskEmailSettings(settingValue)
    });
  } catch (error) {
    debugLogger.error('Error updating email settings:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateNotificationSettings = async (req, res) => {
  try {
    await ensureSettingsTable(req.db);
    const { emailNotifications, smsNotifications, pushNotifications, systemAlerts, paymentReminders, subscriptionAlerts } = req.body;

    const settingValue = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
      smsNotifications: smsNotifications !== undefined ? smsNotifications : false,
      pushNotifications: pushNotifications !== undefined ? pushNotifications : true,
      systemAlerts: systemAlerts !== undefined ? systemAlerts : true,
      paymentReminders: paymentReminders !== undefined ? paymentReminders : true,
      subscriptionAlerts: subscriptionAlerts !== undefined ? subscriptionAlerts : true
    };

    const result = await req.db.query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = 'notification_settings'
       RETURNING setting_value, updated_at`,
      [JSON.stringify(settingValue)]
    );

    if (result.rows.length === 0) {
      await req.db.query(
        `INSERT INTO system_settings (setting_key, setting_value, category, description)
         VALUES ('notification_settings', $1, 'notifications', 'Notification preferences')`,
        [JSON.stringify(settingValue)]
      );
    }

    // Log Action
    await auditService.logAction({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'notifications',
      details: { category: 'notifications', changes: settingValue },
      ipAddress: req.ip
    }, req.db);

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settingValue
    });
  } catch (error) {
    debugLogger.error('Error updating notification settings:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateSecuritySettings = async (req, res) => {
  try {
    await ensureSettingsTable(req.db);
    const { sessionTimeout, passwordMinLength, requireTwoFactor, allowPasswordReset, maxLoginAttempts, lockoutDuration } = req.body;

    const settingValue = {
      sessionTimeout: sessionTimeout || 30,
      passwordMinLength: passwordMinLength || 8,
      requireTwoFactor: requireTwoFactor !== undefined ? requireTwoFactor : false,
      allowPasswordReset: allowPasswordReset !== undefined ? allowPasswordReset : true,
      maxLoginAttempts: maxLoginAttempts || 5,
      lockoutDuration: lockoutDuration || 15
    };

    const result = await req.db.query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = 'security_settings'
       RETURNING setting_value, updated_at`,
      [JSON.stringify(settingValue)]
    );

    if (result.rows.length === 0) {
      await req.db.query(
        `INSERT INTO system_settings (setting_key, setting_value, category, description)
         VALUES ('security_settings', $1, 'security', 'Security configuration settings')`,
        [JSON.stringify(settingValue)]
      );
    }

    // Log Action
    await auditService.logAction({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'security',
      details: { category: 'security', changes: settingValue },
      ipAddress: req.ip
    }, req.db);

    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: settingValue
    });
  } catch (error) {
    debugLogger.error('Error updating security settings:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateBackupSettings = async (req, res) => {
  try {
    await ensureSettingsTable(req.db);
    const { autoBackup, backupFrequency, retentionDays, backupLocation, lastBackup } = req.body;

    const settingValue = {
      autoBackup: autoBackup !== undefined ? autoBackup : true,
      backupFrequency: backupFrequency || 'daily',
      retentionDays: retentionDays || 30,
      backupLocation: backupLocation || 'cloud',
      lastBackup: lastBackup || null
    };

    const result = await req.db.query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = 'backup_settings'
       RETURNING setting_value, updated_at`,
      [JSON.stringify(settingValue)]
    );

    if (result.rows.length === 0) {
      await req.db.query(
        `INSERT INTO system_settings (setting_key, setting_value, category, description)
         VALUES ('backup_settings', $1, 'backup', 'Backup configuration settings')`,
        [JSON.stringify(settingValue)]
      );
    }

    // Log Action
    await auditService.logAction({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'backup_config',
      details: { category: 'backup', changes: settingValue },
      ipAddress: req.ip
    }, req.db);

    res.json({
      success: true,
      message: 'Backup settings updated successfully',
      data: settingValue
    });
  } catch (error) {
    debugLogger.error('Error updating backup settings:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const testEmailConfiguration = async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    const result = await req.db.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'email_settings'`
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Email settings not configured'
      });
    }

    const emailSettings = result.rows[0].setting_value;

    if (!emailSettings.smtpHost || !emailSettings.fromEmail) {
      return res.status(400).json({
        success: false,
        message: 'SMTP Host and From Email are required for testing'
      });
    }

    // Use emailService to send a real test email
    await emailService.sendTestEmail(testEmail || emailSettings.fromEmail, emailSettings);

    res.json({
      success: true,
      message: `Test email sent to ${testEmail || emailSettings.fromEmail}. Please check your inbox.`
    });
  } catch (error) {
    debugLogger.error('Error testing email configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email test failed: ' + (error.message || 'SMTP connection error') 
    });
  }
};

export const createBackup = async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const formattedTimestamp = timestamp.replace(/[:.]/g, '-');
    
    // Fetch all settings to include in the backup file
    const settingsResult = await req.db.query('SELECT * FROM system_settings');
    const backupData = {
      timestamp,
      settings: settingsResult.rows,
      version: '1.0'
    };

    const backupDir = path.join(__dirname, '../../uploads/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = `backup-${formattedTimestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    await fs.promises.writeFile(filePath, JSON.stringify(backupData, null, 2));

    await req.db.query(
      `UPDATE system_settings 
       SET setting_value = jsonb_set(setting_value, '{lastBackup}', $1::jsonb)
       WHERE setting_key = 'backup_settings'`,
      [JSON.stringify(timestamp)]
    );

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: {
        backupTimestamp: timestamp,
        fileName: fileName,
        status: 'completed'
      }
    });
  } catch (error) {
    debugLogger.error('Error creating backup:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    let { backupFile } = req.body;
    const backupDir = path.join(__dirname, '../../uploads/backups');

    if (!backupFile) {
      // Default to latest backup if none provided
      if (!fs.existsSync(backupDir)) {
        return res.status(404).json({ success: false, message: 'No backups directory found' });
      }
      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        return res.status(404).json({ success: false, message: 'No backup files found' });
      }
      backupFile = files[0].name;
    }

    const backupPath = path.join(backupDir, backupFile);
    if (!fs.existsSync(backupPath)) {
       return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    const backupFileContent = await fs.promises.readFile(backupPath, 'utf8');
    const backupContent = JSON.parse(backupFileContent);
    
    // Begin Transaction
    await req.db.query('BEGIN');

    for (const setting of backupContent.settings) {
       await req.db.query(
         `UPDATE system_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2`,
         [JSON.stringify(setting.setting_value), setting.setting_key]
       );
    }

    await req.db.query('COMMIT');

    // Log Action
    await auditService.logAction({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'backup_restore',
      details: { backupFile },
      ipAddress: req.ip
    }, req.db);

    res.json({
      success: true,
      message: 'Backup restored successfully. Settings have been reverted to the selected snapshot.'
    });
  } catch (error) {
    await req.db.query('ROLLBACK');
    debugLogger.error('Error restoring backup:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const listBackups = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../uploads/backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          fileName: f,
          size: stats.size,
          createdAt: stats.mtime,
          formattedDate: new Date(stats.mtime).toLocaleString()
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    debugLogger.error('Error listing backups:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const downloadBackup = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../uploads/backups');
    if (!fs.existsSync(backupDir)) {
      return res.status(404).json({ success: false, message: 'No backups found' });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'No backups found' });
    }

    const latestFile = files[0].name;
    const downloadUrl = `/uploads/backups/${latestFile}`;

    res.json({
      success: true,
      message: 'Backup download URL generated',
      data: {
        downloadUrl,
        fileName: latestFile,
        expiresIn: '1 hour'
      }
    });
  } catch (error) {
    debugLogger.error('Error generating download URL:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const logoUrl = req.file.location || `/uploads/${req.file.filename}`;

    await req.db.query(
      `UPDATE system_settings 
       SET setting_value = jsonb_set(setting_value, '{logoUrl}', $1::jsonb),
           updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = 'general_settings'`,
      [JSON.stringify(logoUrl)]
    );

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { logoUrl }
    });
  } catch (error) {
    debugLogger.error('Error uploading logo:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const uploadFavicon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const faviconUrl = req.file.location || `/uploads/${req.file.filename}`;

    await req.db.query(
      `UPDATE system_settings 
       SET setting_value = jsonb_set(setting_value, '{faviconUrl}', $1::jsonb),
           updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = 'general_settings'`,
      [JSON.stringify(faviconUrl)]
    );

    res.json({
      success: true,
      message: 'Favicon uploaded successfully',
      data: { faviconUrl }
    });
  } catch (error) {
    debugLogger.error('Error uploading favicon:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
