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
  getByExportInvoiceId,
  getByAnnexureId,
  createOrUpdate,
  remove,
  getNextNumber,
  toggleStatus,
  updateStatus
} from '../controllers/exportInvoiceAnnexureController.js';

const router = Router();

const auth = [authenticate, filterByCompany, requirePermission('export_management', 'all')];

router.get('/', ...auth, getAll);
router.get('/next-number', ...auth, getNextNumber);


router.get('/annexure/:annexureId', ...auth, getByAnnexureId);
router.get('/by-export-invoice/:exportInvoiceId', ...auth, getByExportInvoiceId);
router.get('/export-invoice/:exportInvoiceId', ...auth, getByExportInvoiceId);
router.get('/:exportInvoiceId', ...auth, getByExportInvoiceId);


const lockMiddleware = checkDocumentLock('ANNEXURE', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' });

router.post('/by-export-invoice/:exportInvoiceId', ...auth, lockMiddleware, createOrUpdate);
router.post('/export-invoice/:exportInvoiceId', ...auth, lockMiddleware, createOrUpdate);
router.post('/:exportInvoiceId', ...auth, lockMiddleware, createOrUpdate);

router.put('/by-export-invoice/:exportInvoiceId', ...auth, lockMiddleware, createOrUpdate);
router.put('/export-invoice/:exportInvoiceId', ...auth, lockMiddleware, createOrUpdate);
router.put('/:exportInvoiceId', ...auth, lockMiddleware, createOrUpdate);

router.delete('/by-export-invoice/:id', ...auth, lockMiddleware, remove);
router.delete('/export-invoice/:id', ...auth, lockMiddleware, remove);
router.delete('/:id', ...auth, lockMiddleware, remove);

router.patch('/:id/toggle-status', ...auth, checkDocumentLock('ANNEXURE'), toggleStatus);
router.patch('/:id/status', ...auth, checkDocumentLock('ANNEXURE'), updateStatus);

export default router;
