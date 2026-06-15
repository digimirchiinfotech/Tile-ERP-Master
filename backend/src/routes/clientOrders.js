import { createAuditMiddleware } from '../middleware/auditLog.js';
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
  getAll,
  getById,
  getByClientId,
  create,
  update,
  remove,
  toggleStatus
} from '../controllers/clientOrderController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('client_order', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('client_order', 'all'),
  getById
);

router.get(
  '/client/:clientId',
  authenticate,
  filterByCompany,
  requirePermission('client_order', 'all'),
  getByClientId
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('client_order', 'all'),
  createAuditMiddleware('client_order', 'UPDATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('client_order', 'all'),
  createAuditMiddleware('client_order', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('client_order', 'all'),
  createAuditMiddleware('client_order', 'DELETE'),
  remove
);

router.patch(
  '/:id/status',
  authenticate,
  filterByCompany,
  requirePermission('client_order', 'all'),
  createAuditMiddleware('client_order', 'STATUS_CHANGE'),
  toggleStatus
);

export default router;
