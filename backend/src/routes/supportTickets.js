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
  updateStatus,
  addComment,
  getComments,
  getStats
} from '../controllers/supportTicketController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requireAdminRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createSupportTicketValidator,
  updateSupportTicketValidator
} from '../validators/supportTicketValidator.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  getAll
);

router.get(
  '/stats',
  authenticate,
  filterByCompany,
  getStats
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  createSupportTicketValidator,
  validateRequest,
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  updateSupportTicketValidator,
  validateRequest,
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requireAdminRole,
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requireAdminRole,
  hardDelete
);

router.patch(
  '/:id/status',
  authenticate,
  filterByCompany,
  requireAdminRole,
  updateStatus
);

router.post(
  '/:id/comments',
  authenticate,
  filterByCompany,
  addComment
);

router.get(
  '/:id/comments',
  authenticate,
  filterByCompany,
  getComments
);

export default router;
