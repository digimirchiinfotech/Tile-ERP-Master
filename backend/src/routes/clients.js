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
  create,
  update,
  remove,
  hardDelete,
  toggleStatus
} from '../controllers/clientController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createClientValidator,
  updateClientValidator
} from '../validators/clientValidator.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('client_management', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('client_management', 'all'),
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('client_management', 'all'),
  createClientValidator,
  validateRequest,
  createAuditMiddleware('client', 'CREATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('client_management', 'all'),
  updateClientValidator,
  validateRequest,
  createAuditMiddleware('client', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('client_management', 'all'),
  createAuditMiddleware('client', 'DELETE'),
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('client_management', 'all'),
  createAuditMiddleware('client', 'DELETE'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('client_management', 'all'),
  createAuditMiddleware('client', 'STATUS_CHANGE'),
  toggleStatus
);

export default router;
