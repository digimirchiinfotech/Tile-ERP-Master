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

import { Router } from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { checkDocumentLock } from '../middleware/lockManager.js';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  getFromProforma,
  getFullFromProforma,
  getNextNumber,
  toggleStatus,
  updateStatus
} from '../controllers/exportInvoiceController.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/inputValidation.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = Router();

const createExportInvoiceValidator = [
  body('proforma_invoice_id')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('Invalid Proforma Invoice ID format'),
  body('invoice_date')
    .notEmpty()
    .withMessage('Invoice date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
];

const updateExportInvoiceValidator = [
  body('invoice_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format'),
];

router.get(
  '/next-number/generate',
  authenticate,
  filterByCompany,
  getNextNumber
);

router.get(
  '/from-proforma/:proformaId',
  authenticate,
  filterByCompany,
  getFromProforma
);

router.get(
  '/from-proforma/full/:proformaId',
  authenticate,
  filterByCompany,
  getFullFromProforma
);

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('export_management', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('export_management', 'all'),
  getById
);

import { zodInterceptor } from '../middleware/inputValidation.js';
import { ExportInvoiceSchema } from '../validators/zodSchemas.js';

router.post(
  '/',
  authenticate,
  filterByCompany,
  createExportInvoiceValidator,
  validateRequest,
  zodInterceptor(ExportInvoiceSchema),
  createAuditMiddleware('export_invoice', 'CREATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  checkDocumentLock('EXPORT_INVOICE'),
  updateExportInvoiceValidator,
  validateRequest,
  zodInterceptor(ExportInvoiceSchema),
  createAuditMiddleware('export_invoice', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  checkDocumentLock('EXPORT_INVOICE'),
  createAuditMiddleware('export_invoice', 'DELETE'),
  remove
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  createAuditMiddleware('export_invoice', 'STATUS_CHANGE'),
  toggleStatus
);


router.patch('/:id/status',
  authenticate,
  filterByCompany,
  requirePermission('export_management', 'all'),
  checkDocumentLock('EXPORT_INVOICE'),
  updateStatus
);
export default router;

