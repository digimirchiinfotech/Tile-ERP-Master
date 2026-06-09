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
import getDashboardData from '../controllers/dashboardController.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get real-time role-specific dashboard statistics
 */
router.get('/stats', authenticate, filterByCompany, getDashboardData);
router.get('/data', authenticate, filterByCompany, getDashboardData);

export default router;
