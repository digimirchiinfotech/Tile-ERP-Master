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

/**
 * Export Workflow Interconnection Routes
 * 
 * Provides endpoints to:
 * - Fetch complete workflow data across all export stages
 * - Get workflow status and completion
 * - Retrieve data for next stage (with auto-inherited fields)
 * - Sync updates across related documents
 */

import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import * as interconnectionController from '../controllers/exportWorkflowInterconnectionController.js';

const router = express.Router();

// Apply authentication and company filtering to all routes
router.use(authenticate);
router.use(filterByCompany);

/**
 * Get complete workflow data starting from a proforma invoice
 * GET /api/export-workflow/complete/:proformaInvoiceId
 */
router.get('/complete/:proformaInvoiceId', interconnectionController.getCompleteWorkflow);

/**
 * Get export invoice workflow data (export invoice and all downstream stages)
 * GET /api/export-workflow/export-invoice/:exportInvoiceId
 */
router.get('/export-invoice/:exportInvoiceId', interconnectionController.getExportInvoiceWorkflow);

/**
 * Get data for creating next stage document (with inherited fields)
 * GET /api/export-workflow/next-stage/:stage/:documentId
 * Parameters:
 *   stage: 'proforma_invoice', 'export_invoice', 'packing_list', 'vgm'
 *   documentId: UUID of the current stage document
 */
router.get('/next-stage/:stage/:documentId', interconnectionController.getDataForNextStage);

/**
 * Get workflow completion summary and status
 * GET /api/export-workflow/completion/:exportInvoiceId
 */
router.get('/completion/:exportInvoiceId', interconnectionController.getWorkflowCompletionSummary);

/**
 * Sync updates across related documents
 * POST /api/export-workflow/sync
 * Body:
 *   documentId: UUID
 *   stage: string (document type)
 *   changedFields: array of field names that changed
 */
router.post('/sync', interconnectionController.syncUpdatesAcrossStages);

/**
 * Get all export invoices with their workflow status
 * GET /api/export-workflow/status
 */
router.get('/status', interconnectionController.getAllWorkflowStatus);

export default router;
