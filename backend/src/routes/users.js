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
  getProfile,
  updateProfile
} from '../controllers/userController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createUserValidator,
  updateUserValidator
} from '../validators/userValidator.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('user_management', 'all', 'client_management', 'lead_management', 'salesperson_management'),
  getAll
);

router.get(
  '/profile',
  authenticate,
  getProfile
);

router.put(
  '/profile',
  authenticate,
  updateProfile
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('user_management', 'all'),
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('user_management', 'all'),
  createUserValidator,
  validateRequest,
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('user_management', 'all'),
  updateUserValidator,
  validateRequest,
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('user_management', 'all'),
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('user_management', 'all'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('user_management', 'all'),
  toggleStatus
);

export default router;
