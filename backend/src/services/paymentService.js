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
 * Payment Integration Service
 * Handles Stripe and PayPal payment processing
 */

import debugLogger from '../utils/debugLogger.js';
import { generateDocumentNumber } from '../utils/documentNumberGenerator.js';
import { recordPaymentAgainstInvoice } from './accountLedgerIntegrationService.js';

const CONTEXT = 'PaymentService';
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'stripe'; // 'stripe', 'paypal', 'razorpay'

// Lazy load Stripe only when needed
let stripeInstance = null;
const getStripe = async () => {
  if (!stripeInstance) {
    try {
      const Stripe = (await import('stripe')).default;
      stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    } catch (err) {
      debugLogger.warn(CONTEXT, 'Stripe package not installed - payment services will not work');
    }
  }
  return stripeInstance;
};

/**
 * Initialize payment provider
 */
const initializePaymentProvider = () => {
  try {
    if (PAYMENT_PROVIDER === 'stripe') {
      debugLogger.info(CONTEXT, 'Stripe payment provider configured (lazy loading)');
    } else if (PAYMENT_PROVIDER === 'paypal') {
      debugLogger.info(CONTEXT, 'PayPal payment provider configured');
    } else if (PAYMENT_PROVIDER === 'razorpay') {
      debugLogger.info(CONTEXT, 'Razorpay payment provider configured');
    }
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to initialize payment provider', { error: error.message });
    throw error;
  }
};

/**
 * Create a payment intent for Stripe
 */
export const createPaymentIntent = async (invoiceData) => {
  try {
    const stripe = await getStripe();
    if (!stripe) throw new Error('Payment provider not initialized');

    const amount = Math.round(invoiceData.totalAmount * 100); // Convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: invoiceData.currency || 'inr',
      description: `Export Invoice ${invoiceData.invoiceNo} - ${invoiceData.clientName}`,
      metadata: {
        invoiceId: invoiceData.id,
        invoiceNo: invoiceData.invoiceNo,
        clientName: invoiceData.clientName,
        companyId: invoiceData.companyId
      },
      receipt_email: invoiceData.clientEmail,
      automatic_payment_methods: {
        enabled: true
      }
    });

    debugLogger.info(CONTEXT, 'Payment intent created', {
      invoiceNo: invoiceData.invoiceNo,
      intentId: paymentIntent.id
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: invoiceData.currency || 'inr'
    };
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to create payment intent', {
      error: error.message,
      invoiceNo: invoiceData.invoiceNo
    });
    throw error;
  }
};

/**
 * Confirm payment and update invoice status
 */
export const confirmPayment = async (paymentIntentId, invoiceId, db) => {
  try {
    const stripe = await getStripe();
    if (!stripe) throw new Error('Payment provider not initialized');

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const updateQuery = `
        UPDATE export_invoices
        SET 
          payment_status = 'completed',
          payment_method = 'stripe',
          payment_ref = $2,
          payment_date = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(updateQuery, [invoiceId, paymentIntentId]);
      const invoice = result.rows[0];

      // Create/Update Account Entry via Integration Service
      recordPaymentAgainstInvoice(invoiceId, { method: 'stripe', ref: paymentIntentId }, db).catch(err => 
        debugLogger.error(CONTEXT, 'Ledger Sync Error', { error: err.message })
      );

      debugLogger.info(CONTEXT, 'Payment confirmed and invoice updated', {
        invoiceId,
        paymentIntentId
      });

      return {
        success: true,
        message: 'Payment confirmed successfully',
        invoice
      };
    } else {
      throw new Error(`Payment intent status: ${paymentIntent.status}`);
    }
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to confirm payment', {
      error: error.message,
      paymentIntentId
    });
    throw error;
  }
};

/**
 * Handle Stripe webhook events
 */
export const handleStripeWebhook = async (event, db) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object, db);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, db);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object, db);
        break;
      default:
        debugLogger.info(CONTEXT, 'Unhandled event type', { type: event.type });
    }

    return { received: true };
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to handle Stripe webhook', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Process successful payment
 */
const handlePaymentSucceeded = async (paymentIntent, db) => {
  try {
    const invoiceId = paymentIntent.metadata.invoiceId;
    const updateQuery = `
      UPDATE export_invoices
      SET 
        payment_status = 'completed',
        payment_method = 'stripe',
        payment_ref = $2,
        payment_date = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;
    const result = await db.query(updateQuery, [invoiceId, paymentIntent.id]);
    const invoice = result.rows[0];

    if (invoice) {
      // Create/Update Account Entry via Integration Service
      recordPaymentAgainstInvoice(invoiceId, { method: 'stripe', ref: paymentIntent.id }, db).catch(err => 
        debugLogger.error(CONTEXT, 'Ledger Sync Webhook Error', { error: err.message })
      );
    }

    debugLogger.info(CONTEXT, 'Payment succeeded processed', { invoiceId });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to process success', { error: error.message });
    throw error;
  }
};

/**
 * Process failed payment
 */
const handlePaymentFailed = async (paymentIntent, db) => {
  try {
    const invoiceId = paymentIntent.metadata.invoiceId;
    const updateQuery = `
      UPDATE export_invoices SET payment_status = 'failed', updated_at = NOW() WHERE id = $1
    `;
    await db.query(updateQuery, [invoiceId]);
    debugLogger.warning(CONTEXT, 'Payment failed processed', { invoiceId });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to process failure', { error: error.message });
    throw error;
  }
};

/**
 * Process refund
 */
const handleRefund = async (charge, db) => {
  try {
    const paymentRef = charge.payment_intent;
    const updateQuery = `
      UPDATE export_invoices SET payment_status = 'refunded', updated_at = NOW() WHERE payment_ref = $1
    `;
    await db.query(updateQuery, [paymentRef]);
    debugLogger.info(CONTEXT, 'Refund processed', { chargeId: charge.id });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to process refund', { error: error.message });
    throw error;
  }
};

/**
 * Get payment status for an invoice
 */
export const getPaymentStatus = async (invoiceId, db) => {
  try {
    const sql = `
      SELECT id, invoice_no, total_amount, payment_status, payment_method, payment_ref, payment_date
      FROM export_invoices WHERE id = $1
    `;
    const result = await db.query(sql, [invoiceId]);
    if (result.rows.length === 0) throw new Error('Invoice not found');
    return result.rows[0];
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to get payment status', { error: error.message });
    throw error;
  }
};

/**
 * Create a PayPal payment
 */
export const createPayPalPayment = async (invoiceData) => {
  debugLogger.info(CONTEXT, 'PayPal payment requested', { invoiceNo: invoiceData.invoice_no });
  throw new Error('PayPal payment provider integration is pending implementation.');
};

/**
 * Create a Razorpay order
 */
export const createRazorpayOrder = async (invoiceData) => {
  debugLogger.info(CONTEXT, 'Razorpay order requested', { invoiceNo: invoiceData.invoice_no });
  throw new Error('Razorpay payment provider integration is pending implementation.');
};

export default {
  initializePaymentProvider,
  createPaymentIntent,
  confirmPayment,
  handleStripeWebhook,
  getPaymentStatus,
  createPayPalPayment,
  createRazorpayOrder
};
