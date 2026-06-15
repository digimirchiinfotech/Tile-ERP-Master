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
import * as siController from '../controllers/shippingInstructionController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { checkDocumentLock } from '../middleware/lockManager.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();

router.use(authenticate);
router.use(filterByCompany);

router.get('/', requirePermission('export_management', 'all'), siController.getAll);
router.post('/', requirePermission('export_management', 'all'), createAuditMiddleware('shipping_instruction', 'UPDATE'), siController.create);

router.get('/next-number', requirePermission('export_management', 'all'), siController.getNextNumber);
router.get('/by-export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), siController.getByExportInvoiceId);
router.post('/by-export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('shipping_instruction', 'UPDATE'), siController.createOrUpdate);
router.delete('/by-export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('shipping_instruction', 'DELETE'), siController.remove);

router.get('/export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), siController.getByExportInvoiceId);
router.post('/export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('shipping_instruction', 'UPDATE'), siController.createOrUpdate);
router.delete('/export-invoice/:exportInvoiceId', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION', { idParam: 'exportInvoiceId', idField: 'export_invoice_id' }), createAuditMiddleware('shipping_instruction', 'DELETE'), siController.remove);

router.get('/:id', requirePermission('export_management', 'all'), siController.getById);
router.put('/:id', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION'), createAuditMiddleware('shipping_instruction', 'UPDATE'), siController.updateById);
router.delete('/:id/hard-delete', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION'), createAuditMiddleware('shipping_instruction', 'DELETE'), siController.hardDelete);
router.delete('/:id', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION'), createAuditMiddleware('shipping_instruction', 'DELETE'), siController.remove);

router.patch('/:id/toggle-status', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION'), createAuditMiddleware('shipping_instruction', 'STATUS_CHANGE'), siController.toggleStatus);

router.patch('/:id/status', requirePermission('export_management', 'all'), checkDocumentLock('SHIPPING_INSTRUCTION'), createAuditMiddleware('shipping_instruction', 'STATUS_CHANGE'), siController.updateStatus);
export default router;

