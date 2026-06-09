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
  convertToOrder,
  hardDelete,
  toggleStatus,
  getNextNumber,
  updateStatus,
  getRevisionHistory,
  approve
} from '../controllers/proformaInvoiceController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { checkDocumentLock } from '../middleware/lockManager.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createProformaInvoiceValidator,
  updateProformaInvoiceValidator,
  convertToOrderValidator
} from '../validators/proformaInvoiceValidator.js';
import { validateStatusTransition } from '../middleware/documentStatus.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();

router.get(
  '/next-number',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  getNextNumber
);

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  getById
);

router.get(
  '/:id/revisions',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  getRevisionHistory
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  createProformaInvoiceValidator,
  validateRequest,
  createAuditMiddleware('proforma_invoice', 'CREATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  checkDocumentLock('PI'),
  updateProformaInvoiceValidator,
  validateRequest,
  createAuditMiddleware('proforma_invoice', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  checkDocumentLock('PI'),
  createAuditMiddleware('proforma_invoice', 'DELETE'),
  remove
);

router.post(
  '/:id/convert-to-order',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'proforma_order', 'all'),
  convertToOrderValidator,
  validateRequest,
  convertToOrder
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  checkDocumentLock('PI'),
  createAuditMiddleware('proforma_invoice', 'DELETE'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  createAuditMiddleware('proforma_invoice', 'STATUS_CHANGE'),
  toggleStatus
);

router.patch(
  '/:id/status',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  validateStatusTransition('PI'),
  updateStatus
);

router.post(
  '/:id/approve',
  authenticate,
  filterByCompany,
  requirePermission('proforma_invoice', 'all'),
  approve
);

export default router;
