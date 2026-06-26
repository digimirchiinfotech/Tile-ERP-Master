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

/**
 * Payment Routes
 */

import express from 'express';
import {
  createPaymentIntent_endpoint,
  confirmPayment_endpoint,
  getPaymentStatus,
  handleStripeWebhook_endpoint,
  createPayPalPayment_endpoint,
  createRazorpayOrder_endpoint,
  getPaymentHistory
} from '../controllers/paymentController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

// ─── STRIPE WEBHOOK ─────────────────────────────────────────────────────────────
// CRITICAL: Must be registered BEFORE router.use(authenticate) because:
//   1. Stripe does NOT send a JWT — auth middleware would reject every real Stripe call.
//   2. Stripe requires the RAW (unparsed) request body to verify the HMAC signature.
//      The global express.json() body parser must NOT run before this route.
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook_endpoint
);

// ─── AUTHENTICATED ROUTES ────────────────────────────────────────────────────────
// All routes below this line require a valid JWT and company context.
router.use(authenticate, filterByCompany);

/**
 * Create payment intent for an invoice
 * POST /api/payments/create-intent
 */
router.post('/create-intent', createPaymentIntent_endpoint);

/**
 * Confirm payment completion
 * POST /api/payments/confirm
 */
router.post('/confirm', confirmPayment_endpoint);

/**
 * Get payment status for an invoice
 * GET /api/payments/status/:invoiceId
 */
router.get('/status/:invoiceId', getPaymentStatus);

/**
 * Get payment history
 * GET /api/payments/history
 */
router.get('/history', getPaymentHistory);

/**
 * PayPal payment creation
 * POST /api/payments/paypal/create
 */
router.post('/paypal/create', createPayPalPayment_endpoint);

/**
 * Razorpay order creation
 * POST /api/payments/razorpay/create
 */
router.post('/razorpay/create', createRazorpayOrder_endpoint);

export default router;
