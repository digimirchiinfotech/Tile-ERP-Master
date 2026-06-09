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
  saveClientRate,
  getClientRate,
  getClientRateHistory,
  saveSupplierRate,
  getSupplierRate,
  getSupplierRateHistory,
  getAll,
  remove,
  hardDelete
} from '../controllers/rateHistoryController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  getAll
);

router.post(
  '/client',
  authenticate,
  filterByCompany,
  saveClientRate
);

router.get(
  '/client/:clientName/:productName',
  authenticate,
  filterByCompany,
  getClientRate
);

router.get(
  '/client/:clientName/:productName/history',
  authenticate,
  filterByCompany,
  getClientRateHistory
);

router.post(
  '/supplier',
  authenticate,
  filterByCompany,
  saveSupplierRate
);

router.get(
  '/supplier/:supplierName/:productName',
  authenticate,
  filterByCompany,
  getSupplierRate
);

router.get(
  '/supplier/:supplierName/:productName/history',
  authenticate,
  filterByCompany,
  getSupplierRateHistory
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  hardDelete
);

export default router;
