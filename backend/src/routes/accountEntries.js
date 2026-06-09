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
  getInvoicesByPartyName,
  getSummary
} from '../controllers/accountEntryController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createAccountEntryValidator,
  updateAccountEntryValidator
} from '../validators/accountEntryValidator.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  getAll
);

router.get(
  '/summary',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  getSummary
);

router.get(
  '/invoices/by-party',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  getInvoicesByPartyName
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  createAccountEntryValidator,
  validateRequest,
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  updateAccountEntryValidator,
  validateRequest,
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('account_finance', 'account', 'all'),
  toggleStatus
);

export default router;
