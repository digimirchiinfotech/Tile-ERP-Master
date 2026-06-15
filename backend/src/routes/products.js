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
  bulkUpsert
} from '../controllers/productController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission, requireAdminRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import upload from '../middleware/multerConfig.js';
import {
  createProductValidator,
  updateProductValidator
} from '../validators/productValidator.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

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
  requireAdminRole,
  createProductValidator,
  validateRequest,
  createAuditMiddleware('product', 'CREATE'),
  create
);

// ADMIN ONLY - Super Admin & Company Admin can bulk upsert
router.post(
  '/bulk',
  authenticate,
  filterByCompany,
  requireAdminRole,
  createAuditMiddleware('product', 'BULK_UPSERT'),
  bulkUpsert
);

// ADMIN ONLY - Super Admin & Company Admin can update
router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requireAdminRole,
  updateProductValidator,
  validateRequest,
  createAuditMiddleware('product', 'UPDATE'),
  update
);

// ADMIN ONLY - Super Admin & Company Admin can delete
router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requireAdminRole,
  createAuditMiddleware('product', 'DELETE'),
  remove
);

// ADMIN ONLY - Super Admin & Company Admin can hard delete
router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requireAdminRole,
  createAuditMiddleware('product', 'DELETE'),
  hardDelete
);

// ADMIN ONLY - Super Admin & Company Admin can toggle status
router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requireAdminRole,
  createAuditMiddleware('product', 'STATUS_CHANGE'),
  toggleStatus
);

// ADMIN ONLY - Upload product image
router.post(
  '/:id/upload-image',
  authenticate,
  filterByCompany,
  requireAdminRole,
  upload.single('image'),
  uploadImage
);

export default router;
