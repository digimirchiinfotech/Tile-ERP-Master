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
import { authenticate } from '../middleware/auth.js';
import {
  createBackup,
  listBackups,
  deleteBackup,
  restoreBackup,
  getSettings,
  updateSettings,
  downloadBackup
} from '../controllers/backupController.js';
import { createUpload } from '../middleware/multerConfig.js';
import { validateFileMagicBytes } from '../middleware/fileValidator.js';

const router = express.Router();

// Ensure only super admins can access these
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only super administrators can manage system backups.' });
  }
  next();
};

router.use(authenticate, requireAdmin);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

router.post('/create', createBackup);
router.get('/list', listBackups);
router.get('/download/:filename', downloadBackup);
router.delete('/:filename', deleteBackup);

// Allow restoring either by providing a filename of an existing backup or uploading a zip
router.post('/restore', createUpload('BACKUP').single('file'), validateFileMagicBytes('BACKUP'), restoreBackup);

export default router;
