/**
 * Tenant-scoped backup controller for company administrators.
 */

import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorHandler.js';
import { createTenantDatabaseBackup } from '../utils/backupService.js';
import { insertAuditLog } from '../middleware/auditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TENANT_BACKUPS_DIR = path.resolve(__dirname, '../../uploads/backups/tenants');

const getCompanyBackupDir = (companyId) => {
  const dir = path.join(TENANT_BACKUPS_DIR, companyId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const createTenantBackup = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    if (!companyId) return next(new AppError('Company context required', 400));

    const filename = await createTenantDatabaseBackup(companyId, req.db);

    await req.db.globalQuery(
      `INSERT INTO tenant_backups (company_id, filename, file_size, backup_type, created_by)
       VALUES ($1, $2, $3, 'manual', $4)`,
      [companyId, filename, fs.statSync(path.join(getCompanyBackupDir(companyId), filename)).size, req.user.id]
    ).catch(() => {});

    insertAuditLog({
      userId: req.user.id,
      companyId,
      action: 'CREATE',
      resourceType: 'tenant_backup',
      resourceId: null,
      newValues: { filename },
      ipAddress: req.ip,
    }, req.db);

    res.json({ success: true, message: 'Tenant backup created successfully', data: { filename } });
  } catch (error) {
    next(error);
  }
};

export const listTenantBackups = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    if (!companyId) return next(new AppError('Company context required', 400));

    const dir = getCompanyBackupDir(companyId);
    const files = fs.existsSync(dir) ? await fsPromises.readdir(dir) : [];
    const backups = [];

    for (const f of files) {
      if (f.startsWith('TENANT_BACKUP_') && (f.endsWith('.zip') || f.endsWith('.sql'))) {
        const stat = await fsPromises.stat(path.join(dir, f));
        backups.push({ name: f, size: stat.size, createdAt: stat.mtime, type: 'Tenant Backup', status: 'Completed' });
      }
    }

    backups.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, data: backups });
  } catch (error) {
    next(error);
  }
};

export const downloadTenantBackup = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const { filename } = req.params;

    if (!filename.startsWith('TENANT_BACKUP_') || filename.includes('..')) {
      return next(new AppError('Invalid backup filename', 400));
    }

    const fullPath = path.join(getCompanyBackupDir(companyId), filename);
    if (!fs.existsSync(fullPath)) {
      return next(new AppError('Backup file not found', 404));
    }

    res.download(fullPath);
  } catch (error) {
    next(error);
  }
};
