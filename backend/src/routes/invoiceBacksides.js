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
import { createAuditMiddleware } from '../middleware/auditLog.js';
import {
  getAll,
  getById,
  getByExportInvoiceId,
  createOrUpdate,
  remove,
  removeById,
  getNextNumber,
  getStats,
  toggleStatus,
  getFallbackData,
  updateStatus
} from '../controllers/invoiceBacksideController.js';

const router = Router();
const auth = [authenticate, filterByCompany, requirePermission('export_management', 'all')];

router.get('/', ...auth, getAll);
router.get('/stats', ...auth, getStats);
router.get('/next-number', ...auth, getNextNumber);

router.get('/fallback/:exportInvoiceId', ...auth, getFallbackData);
router.get('/export-invoice/:exportInvoiceId', ...auth, getByExportInvoiceId);
router.get('/:id', ...auth, getById);

const lockMiddleware = checkDocumentLock('INVOICE_BACKSIDE', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' });

router.post('/export-invoice/:exportInvoiceId', ...auth, lockMiddleware, createAuditMiddleware('invoice_backside', 'UPDATE'), createOrUpdate);
router.post('/:exportInvoiceId', ...auth, lockMiddleware, createAuditMiddleware('invoice_backside', 'UPDATE'), createOrUpdate);

router.put('/export-invoice/:exportInvoiceId', ...auth, lockMiddleware, createAuditMiddleware('invoice_backside', 'UPDATE'), createOrUpdate);
router.put('/:exportInvoiceId', ...auth, lockMiddleware, createAuditMiddleware('invoice_backside', 'UPDATE'), createOrUpdate);

router.delete('/export-invoice/:exportInvoiceId', ...auth, lockMiddleware, createAuditMiddleware('invoice_backside', 'DELETE'), remove);
router.delete('/:id', ...auth, checkDocumentLock('INVOICE_BACKSIDE'), createAuditMiddleware('invoice_backside', 'DELETE'), removeById);

router.patch('/:id/toggle-status', ...auth, checkDocumentLock('INVOICE_BACKSIDE'), createAuditMiddleware('invoice_backside', 'STATUS_CHANGE'), toggleStatus);

router.patch('/:id/status', ...auth, checkDocumentLock('INVOICE_BACKSIDE'), createAuditMiddleware('invoice_backside', 'STATUS_CHANGE'), updateStatus);
export default router;

