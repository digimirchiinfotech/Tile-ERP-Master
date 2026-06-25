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
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import * as packingListController from '../controllers/packingListController.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';
import { checkDocumentLock } from '../middleware/lockManager.js';

const router = express.Router();

router.use(authenticate);
router.use(filterByCompany);

router.get('/next-number', requirePermission('packing_list_management', 'all'), packingListController.getNextNumber);

router.get('/', requirePermission('packing_list_management', 'all'), packingListController.getAll);
router.post('/export-invoice/:exportInvoiceId', requirePermission('packing_list_management', 'all'), checkDocumentLock('PACKING_LIST', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('packing_list', 'UPDATE'), packingListController.createOrUpdate);
router.put('/export-invoice/:exportInvoiceId', requirePermission('packing_list_management', 'all'), checkDocumentLock('PACKING_LIST', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('packing_list', 'UPDATE'), packingListController.createOrUpdate);

router.post('/', requirePermission('packing_list_management', 'all'), createAuditMiddleware('packing_list', 'CREATE'), packingListController.create);

router.get('/export-invoice/:exportInvoiceId', requirePermission('packing_list_management', 'all'), packingListController.getByExportInvoiceId);

router.get('/:id', requirePermission('packing_list_management', 'all'), packingListController.getById);
router.put('/:id', requirePermission('packing_list_management', 'all'), checkDocumentLock('PACKING_LIST'), createAuditMiddleware('packing_list', 'UPDATE'), packingListController.updateById);
router.delete('/:id/hard-delete', requirePermission('packing_list_management', 'all'), checkDocumentLock('PACKING_LIST'), packingListController.hardDelete);
router.delete('/:id', requirePermission('packing_list_management', 'all'), checkDocumentLock('PACKING_LIST'), createAuditMiddleware('packing_list', 'DELETE'), packingListController.remove);
router.patch('/:id/toggle-status', requirePermission('packing_list_management', 'all'), checkDocumentLock('PACKING_LIST'), createAuditMiddleware('packing_list', 'STATUS_CHANGE'), packingListController.toggleStatus);


router.patch('/:id/status', requirePermission('packing_list_management', 'all'), checkDocumentLock('PACKING_LIST'), packingListController.updateStatus);
export default router;

