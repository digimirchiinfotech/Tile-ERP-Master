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
  toggleStatus
} from '../controllers/supplierController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createSupplierValidator,
  updateSupplierValidator
} from '../validators/supplierValidator.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('supplier_management', 'purchase', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('supplier_management', 'purchase', 'all'),
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('supplier_management', 'purchase', 'all'),
  createSupplierValidator,
  validateRequest,
  createAuditMiddleware('supplier', 'CREATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('supplier_management', 'purchase', 'all'),
  updateSupplierValidator,
  validateRequest,
  createAuditMiddleware('supplier', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('supplier_management', 'purchase', 'all'),
  createAuditMiddleware('supplier', 'DELETE'),
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('supplier_management', 'purchase', 'all'),
  createAuditMiddleware('supplier', 'DELETE'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('supplier_management', 'purchase', 'all'),
  createAuditMiddleware('supplier', 'STATUS_CHANGE'),
  toggleStatus
);

export default router;
