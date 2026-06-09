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
  updateQcStatus,
  hardDelete,
  toggleStatus,
  getNextNumber,
  updateStatus,
  getRevisionHistory
} from '../controllers/proformaOrderController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { checkDocumentLock } from '../middleware/lockManager.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createProformaOrderValidator,
  updateProformaOrderValidator,
  updateQcStatusValidator
} from '../validators/proformaOrderValidator.js';
import { validateStatusTransition } from '../middleware/documentStatus.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();

router.get(
  '/next-number',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  getNextNumber
);

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  getById
);

router.get(
  '/:id/revisions',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  getRevisionHistory
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  createProformaOrderValidator,
  validateRequest,
  createAuditMiddleware('proforma_order', 'CREATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  checkDocumentLock('PO'),
  updateProformaOrderValidator,
  validateRequest,
  createAuditMiddleware('proforma_order', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  checkDocumentLock('PO'),
  createAuditMiddleware('proforma_order', 'DELETE'),
  remove
);

router.patch(
  '/:id/qc-status',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'qc_management', 'qc', 'all'),
  updateQcStatusValidator,
  validateRequest,
  updateQcStatus
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  checkDocumentLock('PO'),
  createAuditMiddleware('proforma_order', 'DELETE'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  createAuditMiddleware('proforma_order', 'STATUS_CHANGE'),
  toggleStatus
);

router.patch(
  '/:id/status',
  authenticate,
  filterByCompany,
  requirePermission('proforma_order', 'purchase_manager', 'all'),
  checkDocumentLock('PO'),
  validateStatusTransition('PO'),
  updateStatus
);

export default router;
