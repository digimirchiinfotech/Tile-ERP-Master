import { createAuditMiddleware } from '../middleware/auditLog.js';
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
  uploadImage,
  bulkUpsert,
  validateImport
} from '../controllers/sanitarywareProductController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { createUpload } from '../middleware/multerConfig.js';
import { validateFileMagicBytes } from '../middleware/fileValidator.js';

const router = express.Router();

// VIEW ONLY - All authenticated roles can read
router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  getById
);

// ADMIN ONLY - Super Admin & Company Admin can create
router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  create
);

// ADMIN ONLY - Super Admin & Company Admin can bulk upsert
router.post(
  '/bulk',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  createAuditMiddleware('sanitaryware_product', 'BULK_UPSERT'),
  bulkUpsert
);

// ADMIN ONLY - Validate import data
router.post(
  '/validate-import',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  validateImport
);

// ADMIN ONLY - Super Admin & Company Admin can update
router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  update
);

// ADMIN ONLY - Super Admin & Company Admin can delete
router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  remove
);

// ADMIN ONLY - Super Admin & Company Admin can hard delete
router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  hardDelete
);

// ADMIN ONLY - Super Admin & Company Admin can toggle status
router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  toggleStatus
);

// ADMIN ONLY - Upload sanitaryware product image
router.post(
  '/:id/upload-image',
  authenticate,
  filterByCompany,
  requirePermission('product_management', 'all'),
  createUpload('PRODUCT_IMAGE').single('image'),
  validateFileMagicBytes('PRODUCT_IMAGE'),
  uploadImage
);

export default router;
