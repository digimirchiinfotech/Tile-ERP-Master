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
import * as vgmController from '../controllers/vgmController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { checkDocumentLock } from '../middleware/lockManager.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();

router.use(authenticate);
router.use(filterByCompany);

router.get('/', requirePermission('export_management', 'all'), vgmController.getAll);

router.get('/next-number', requirePermission('export_management', 'all'), vgmController.getNextNumber);
router.get('/by-export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), vgmController.getByExportInvoiceId);
router.post('/by-export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), checkDocumentLock('VGM', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('vgm_document', 'UPDATE'), vgmController.createOrUpdate);
router.delete('/by-export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), checkDocumentLock('VGM', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('vgm_document', 'DELETE'), vgmController.remove);

// Catch-all parameter routes come last
router.get('/:id', requirePermission('export_management', 'all'), vgmController.getById);
router.delete('/:id', requirePermission('export_management', 'all'), checkDocumentLock('VGM'), createAuditMiddleware('vgm_document', 'DELETE'), vgmController.remove);
router.patch('/:id/status', requirePermission('export_management', 'all'), checkDocumentLock('VGM'), createAuditMiddleware('vgm_document', 'STATUS_CHANGE'), vgmController.updateStatus);
router.patch('/:id/toggle-status', requirePermission('export_management', 'all'), checkDocumentLock('VGM'), createAuditMiddleware('vgm_document', 'STATUS_CHANGE'), vgmController.toggleStatus);

export default router;
