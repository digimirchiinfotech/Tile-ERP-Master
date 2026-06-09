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
  toggleStatus,
  convertToClient
} from '../controllers/leadController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createLeadValidator,
  updateLeadValidator
} from '../validators/leadValidator.js';
import { createAuditMiddleware } from '../middleware/auditLog.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'all'),
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'all'),
  createLeadValidator,
  validateRequest,
  createAuditMiddleware('lead', 'CREATE'),
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'all'),
  updateLeadValidator,
  validateRequest,
  createAuditMiddleware('lead', 'UPDATE'),
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'all'),
  createAuditMiddleware('lead', 'DELETE'),
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'all'),
  createAuditMiddleware('lead', 'DELETE'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'all'),
  createAuditMiddleware('lead', 'STATUS_CHANGE'),
  toggleStatus
);

router.post(
  '/:id/convert-to-client',
  authenticate,
  filterByCompany,
  requirePermission('lead_management', 'client_management', 'all'),
  convertToClient
);

export default router;
