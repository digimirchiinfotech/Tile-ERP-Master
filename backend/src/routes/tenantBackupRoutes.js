import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requireAdminRole } from '../middleware/rbac.js';
import {
  createTenantBackup,
  listTenantBackups,
  downloadTenantBackup,
} from '../controllers/tenantBackupController.js';

const router = express.Router();

const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Tenant backup limit reached. Maximum 3 backups per hour.' },
});

router.use(authenticate, filterByCompany, requireAdminRole);

router.post('/create', backupLimiter, createTenantBackup);
router.get('/list', listTenantBackups);
router.get('/download/:filename', backupLimiter, downloadTenantBackup);

export default router;
