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

import express from 'express';
import { createUpload } from '../middleware/multerConfig.js';
import { validateFileMagicBytes } from '../middleware/fileValidator.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as systemSettingsController from '../controllers/systemSettingsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import env from '../config/env.js';
import rateLimit from 'express-rate-limit';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const validateFileSignature = (req, res, next) => {
  if (!req.file) return next();

  const buffer = Buffer.alloc(4);
  try {
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    
    const hex = buffer.toString('hex').toUpperCase();
    let isValid = false;

    if (hex.startsWith('89504E47')) isValid = true; // PNG
    else if (hex.startsWith('FFD8FF')) isValid = true; // JPEG
    else if (hex.startsWith('47494638')) isValid = true; // GIF
    else if (hex.startsWith('52494646')) isValid = true; // WEBP
    else if (hex.startsWith('00000100') || hex.startsWith('00000200')) isValid = true; // ICO
    else if (req.file.mimetype === 'image/svg+xml') {
      const svgBuffer = Buffer.alloc(100);
      const svgFd = fs.openSync(req.file.path, 'r');
      fs.readSync(svgFd, svgBuffer, 0, 100, 0);
      fs.closeSync(svgFd);
      if (svgBuffer.toString('utf8').includes('<svg') || svgBuffer.toString('utf8').includes('<?xml')) isValid = true;
    }

    if (!isValid) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Invalid file signature. File may be corrupted or spoofed.' });
    }
    
    next();
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'File validation failed' });
  }
};

const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1,
  message: { success: false, message: 'Backup limit reached. Only one backup per hour is allowed.' }
});

const emailTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many email test requests, please try again later.' }
});

router.use(authenticate);
router.use(requireRole('super_admin'));

router.get('/', systemSettingsController.getAllSettings);
router.get('/:category', systemSettingsController.getSettingsByCategory);

router.put('/general', systemSettingsController.updateGeneralSettings);
router.put('/email', systemSettingsController.updateEmailSettings);
router.put('/notifications', systemSettingsController.updateNotificationSettings);
router.put('/security', systemSettingsController.updateSecuritySettings);
router.put('/backup', systemSettingsController.updateBackupSettings);

router.post('/email/test', emailTestLimiter, systemSettingsController.testEmailConfiguration);

router.post('/backup/create', backupLimiter, systemSettingsController.createBackup);
router.post('/backup/restore', systemSettingsController.restoreBackup);
router.get('/backup/list', systemSettingsController.listBackups);
router.get('/backup/download', backupLimiter, systemSettingsController.downloadBackup);

router.post('/upload/logo', createUpload('AVATAR_LOGO').single('logo'), validateFileMagicBytes('AVATAR_LOGO'), validateFileSignature, systemSettingsController.uploadLogo);
router.post('/upload/favicon', createUpload('AVATAR_LOGO').single('favicon'), validateFileMagicBytes('AVATAR_LOGO'), validateFileSignature, systemSettingsController.uploadFavicon);

export default router;
