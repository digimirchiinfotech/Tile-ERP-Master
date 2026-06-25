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
import {
  getAll,
  getById,
  create,
  update,
  remove,
  hardDelete,
  toggleStatus,
  updateStatus,
  uploadMedia
} from '../controllers/qcRecordController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createQcRecordValidator,
  updateQcRecordValidator
} from '../validators/qcRecordValidator.js';
import { createUpload } from '../middleware/multerConfig.js';
import { validateFileMagicBytes } from '../middleware/fileValidator.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();
 
router.get(
  '/next-number',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  async (req, res, next) => {
    try {
      const { getNextNumber } = await import('../controllers/qcRecordController.js');
      return getNextNumber(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  createQcRecordValidator,
  validateRequest,
  createAuditMiddleware('qc_record', 'CREATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  updateQcRecordValidator,
  validateRequest,
  createAuditMiddleware('qc_record', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  requireRole('qc', 'super_admin', 'company_admin', 'admin'),  // SECURITY: Only QC Controller, not Inspector
  createAuditMiddleware('qc_record', 'DELETE'),
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  requireRole('qc', 'super_admin', 'company_admin', 'admin'),  // SECURITY: Only QC Controller, not Inspector
  createAuditMiddleware('qc_record', 'DELETE'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  createAuditMiddleware('qc_record', 'STATUS_CHANGE'),
  toggleStatus
);

router.patch(
  '/:id/status',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  createAuditMiddleware('qc_record', 'STATUS_CHANGE'),
  updateStatus
);

router.post(
  '/temp/upload-media',
  authenticate,
  filterByCompany,
  requirePermission('qc_management', 'qc_inspector', 'all'),
  createUpload('QC_PHOTO').single('file'),
  validateFileMagicBytes('QC_PHOTO'),
  uploadMedia
);

export default router;
