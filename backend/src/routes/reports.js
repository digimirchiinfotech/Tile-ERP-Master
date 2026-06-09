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
import {
  getSalesReport,
  getOperationalReport,
  getFinancialReport,
  getProductPerformanceReport,
  downloadAuditLog,
  getOverviewReport,
  getPipelineReport,
  downloadAdvancedReport
} from '../controllers/reportsController.js';

const router = express.Router();

// All report endpoints require authentication, company filtering, and analytics permission
const auth = [authenticate, filterByCompany, requirePermission('account_finance', 'reports_analytics', 'all')];

router.get('/overview', ...auth, getOverviewReport);
router.get('/pipeline', ...auth, getPipelineReport);
router.get('/sales', ...auth, getSalesReport);
router.get('/operational', ...auth, getOperationalReport);
router.get('/financial', ...auth, getFinancialReport);
router.get('/products', ...auth, getProductPerformanceReport);
router.get('/audit-log/:companyId', ...auth, downloadAuditLog);
router.get('/advanced/download/:type', ...auth, downloadAdvancedReport);

export default router;
