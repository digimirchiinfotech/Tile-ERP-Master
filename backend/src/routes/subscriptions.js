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
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getAnalytics,
  hardDelete,
  toggleStatus,
  togglePlanStatus,
  checkExpiryStatus,
  renewSubscription,
  getExpiringSubscriptions,
  getTransactions
} from '../controllers/subscriptionController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  createPlanValidator,
  updatePlanValidator,
  getPlanValidator,
  deletePlanValidator,
  getAllPlansValidator,
  createSubscriptionValidator,
  updateSubscriptionValidator,
  getSubscriptionValidator,
  cancelSubscriptionValidator,
  getAllSubscriptionsValidator
} from '../validators/subscriptionValidator.js';

const router = express.Router();

// =====================================================
// SUBSCRIPTION PLANS ROUTES
// =====================================================

router.get(
  '/plans',
  authenticate,
  getAllPlansValidator,
  validateRequest,
  getAllPlans
);

router.get(
  '/plans/:id',
  authenticate,
  getPlanValidator,
  validateRequest,
  getPlanById
);

router.post(
  '/plans',
  authenticate,
  requireRole('super_admin'),
  createPlanValidator,
  validateRequest,
  createPlan
);

router.put(
  '/plans/:id',
  authenticate,
  requireRole('super_admin'),
  updatePlanValidator,
  validateRequest,
  updatePlan
);

router.delete(
  '/plans/:id',
  authenticate,
  requireRole('super_admin'),
  deletePlanValidator,
  validateRequest,
  deletePlan
);

router.patch(
  '/plans/:id/toggle-status',
  authenticate,
  requireRole('super_admin'),
  togglePlanStatus
);

// =====================================================
// COMPANY SUBSCRIPTIONS ROUTES
// =====================================================

router.get(
  '/',
  authenticate,
  getAllSubscriptionsValidator,
  validateRequest,
  getAllSubscriptions
);

router.get(
  '/analytics',
  authenticate,
  requireRole('super_admin'),
  getAnalytics
);

router.get(
  '/expiring',
  authenticate,
  requireRole('super_admin'),
  getExpiringSubscriptions
);

router.get(
  '/transactions',
  authenticate,
  requireRole('super_admin'),
  getTransactions
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  getSubscriptionValidator,
  validateRequest,
  getSubscriptionById
);

router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  createSubscriptionValidator,
  validateRequest,
  createSubscription
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  updateSubscriptionValidator,
  validateRequest,
  updateSubscription
);

router.patch(
  '/:id/cancel',
  authenticate,
  filterByCompany,
  cancelSubscriptionValidator,
  validateRequest,
  cancelSubscription
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  toggleStatus
);

// =====================================================
// SUBSCRIPTION EXPIRY & RENEWAL ROUTES
// =====================================================

router.post(
  '/check-expiry',
  authenticate,
  requireRole('super_admin'),
  checkExpiryStatus
);



router.post(
  '/:id/renew',
  authenticate,
  filterByCompany,
  renewSubscription
);

export default router;
