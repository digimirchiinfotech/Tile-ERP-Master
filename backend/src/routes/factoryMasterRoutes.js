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
  getAllFactories, 
  getFactoryById, 
  createFactory, 
  updateFactory, 
  deleteFactory 
} from '../controllers/factoryMasterController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(filterByCompany);

router.get('/', requirePermission('qc_management'), getAllFactories);
router.get('/:id', requirePermission('qc_management'), getFactoryById);
router.post('/', requirePermission('qc_management'), createFactory);
router.put('/:id', requirePermission('qc_management'), updateFactory);
router.delete('/:id', requirePermission('qc_management'), deleteFactory);

export default router;
