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
 * All payment-related endpoints
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

// All routes require authentication and company filtering
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
 * Stripe webhook handler (no auth required)
 * POST /api/payments/webhook/stripe
 */
router.post('/webhook/stripe', handleStripeWebhook_endpoint);

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
