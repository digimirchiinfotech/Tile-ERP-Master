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
 * Analytics Routes
 * All analytics and reporting endpoints
 */

import express from 'express';
import {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getClientAnalytics,
  getExportStatusAnalytics,
  getPaymentAnalytics,
  getSalespersonPerformance
} from '../controllers/analyticsController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and company filtering
router.use(authenticate);
router.use(filterByCompany);

/**
 * Get dashboard analytics with all metrics
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', getDashboardAnalytics);

/**
 * Get revenue analytics by period
 * GET /api/analytics/revenue?period=month|year
 */
router.get('/revenue', getRevenueAnalytics);

/**
 * Get client performance analytics
 * GET /api/analytics/clients?limit=10
 */
router.get('/clients', getClientAnalytics);

/**
 * Get export status distribution
 * GET /api/analytics/export-status
 */
router.get('/export-status', getExportStatusAnalytics);

/**
 * Get payment collection analytics
 * GET /api/analytics/payment-status
 */
router.get('/payment-status', getPaymentAnalytics);

/**
 * Get export summary analytics
 * GET /api/analytics/export-summary
 */
router.get('/export-summary', getExportStatusAnalytics);

/**
 * Get salesperson performance metrics
 * GET /api/analytics/salesperson/:userId
 */
router.get('/salesperson/:userId', getSalespersonPerformance);

export default router;
