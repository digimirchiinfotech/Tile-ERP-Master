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
import * as sizePackingMasterController from '../controllers/sizePackingMasterController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.MASTER_DATA_MANAGEMENT));

router.route('/')
  .get(sizePackingMasterController.getAllSizePacking)
  .post(sizePackingMasterController.createSizePacking);

router.route('/size/:size')
  .get(sizePackingMasterController.getSizePackingBySize);

router.route('/:id')
  .put(sizePackingMasterController.updateSizePacking)
  .delete(sizePackingMasterController.deleteSizePacking);

export default router;
