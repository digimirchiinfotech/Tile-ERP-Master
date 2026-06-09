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
  getOrderSheets,
  getOrderSheetSummary,
  updateOrderSheet,
  bulkUpdateOrderSheets,
  exportFactoryAssignment,
  createOrderSheet,
  getFactoryCapacity,
  exportExcel,
  updateStatus,
  getProductionLogs,
  addProductionLog,
  getFilterOptions,
  syncOrderSheetLines
} from '../controllers/orderSheetController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();
const orderSheetAuth = [authenticate, filterByCompany, requirePermission('qc_management', 'production_management', 'proforma_order', 'all')];

router.get('/', ...orderSheetAuth, getOrderSheets);
router.get('/filters', ...orderSheetAuth, getFilterOptions);
router.post('/', ...orderSheetAuth, createOrderSheet);
router.get('/summary', ...orderSheetAuth, getOrderSheetSummary);
router.get('/capacity', ...orderSheetAuth, getFactoryCapacity);
router.get('/export', ...orderSheetAuth, exportExcel);
router.get('/export-factory', ...orderSheetAuth, exportFactoryAssignment);
router.put('/bulk', ...orderSheetAuth, bulkUpdateOrderSheets);
router.put('/:id', ...orderSheetAuth, updateOrderSheet);
router.patch('/:id/status', ...orderSheetAuth, updateStatus);
router.post('/:id/sync-lines', ...orderSheetAuth, syncOrderSheetLines);

// Production Logs
router.get('/:id/lines/:lineId/production-log', ...orderSheetAuth, getProductionLogs);
router.post('/:id/lines/:lineId/production-log', ...orderSheetAuth, addProductionLog);

export default router;
