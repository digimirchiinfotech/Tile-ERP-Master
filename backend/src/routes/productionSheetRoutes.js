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
  getProductionSheets, 
  getProductionSheetById, 
  getProductionEntries, 
  createProductionEntry, 
  createQCInspection 
} from '../controllers/productionSheetController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(filterByCompany);

router.get('/', requirePermission('qc_management', 'production_management', 'all'), getProductionSheets);
router.get('/:id', requirePermission('qc_management', 'production_management', 'all'), getProductionSheetById);
router.get('/:id/entries', requirePermission('qc_management', 'production_management', 'all'), getProductionEntries);

router.post('/:id/entries', requirePermission('qc_management', 'production_management', 'all'), createProductionEntry);
router.post('/:id/qc', requirePermission('qc_management', 'production_management', 'all'), createQCInspection);

export default router;
