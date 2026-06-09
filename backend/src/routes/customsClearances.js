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
import * as ccController from '../controllers/customsClearanceController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(filterByCompany);

router.get('/', requirePermission('export_management', 'all'), ccController.getAll);
router.post('/', requirePermission('export_management', 'all'), ccController.create);
router.get('/:id', requirePermission('export_management', 'all'), ccController.getById);
router.put('/:id', requirePermission('export_management', 'all'), ccController.update);
router.delete('/:id/hard-delete', requirePermission('export_management', 'all'), ccController.hardDelete);
router.delete('/:id', requirePermission('export_management', 'all'), ccController.remove);

export default router;
