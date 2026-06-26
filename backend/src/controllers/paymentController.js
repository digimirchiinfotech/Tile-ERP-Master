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

import {
  createPaymentIntent,
  confirmPayment,
  createPayPalPayment,
  createRazorpayOrder,
  handleStripeWebhook,
} from '../services/paymentService.js';
import debugLogger from '../utils/debugLogger.js';

const CONTEXT = 'PaymentController';

export const createPaymentIntent_endpoint = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const invoiceResult = await req.db.query(
      'SELECT id, invoice_no, client_name, client_email, total_amount, currency, status FROM export_invoices WHERE id = $1',
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const invoice = invoiceResult.rows[0];
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Invoice already paid' });

    const companyId = req.companyFilter || req.user?.companyId;

    const paymentIntent = await createPaymentIntent({
      id: invoice.id,
      invoiceNo: invoice.invoice_no,
      clientName: invoice.client_name,
      clientEmail: invoice.client_email,
      totalAmount: parseFloat(invoice.total_amount),
      currency: invoice.currency || 'inr',
      companyId
    });

    res.json({ success: true, data: paymentIntent });
  } catch (error) {
    next(error);
  }
};

export const confirmPayment_endpoint = async (req, res, next) => {
  try {
    const { paymentIntentId, invoiceId } = req.body;
    const invoiceResult = await req.db.query('SELECT id FROM export_invoices WHERE id = $1', [invoiceId]);
    if (invoiceResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const result = await confirmPayment(paymentIntentId, invoiceId, req.db);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPaymentStatus = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const invoiceResult = await req.db.query('SELECT id, invoice_no, total_amount, status, created_at FROM export_invoices WHERE id = $1', [invoiceId]);
    if (invoiceResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });

    res.json({ success: true, data: invoiceResult.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const handleStripeWebhook_endpoint = async (req, res, next) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      // In development without a webhook secret configured, log a clear warning
      // and reject to prevent accidental acceptance of unverified events.
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured. Rejecting request.');
      return res.status(400).json({ success: false, message: 'Webhook secret not configured' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing stripe-signature header' });
    }

    // Import Stripe lazily (same pattern as paymentService.js)
    let stripe;
    try {
      const Stripe = (await import('stripe')).default;
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Payment provider not available' });
    }

    // SECURITY: Verify the webhook signature using the raw request body.
    // req.body is a Buffer here (provided by express.raw() in the route).
    // If this verification fails, it means the request did NOT come from Stripe.
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return res.status(400).json({ success: false, message: `Webhook signature verification failed: ${err.message}` });
    }

    // Only process the event after successful verification
    await handleStripeWebhook(event, req.db);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const createPayPalPayment_endpoint = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const result = await req.db.query('SELECT * FROM export_invoices WHERE id = $1', [invoiceId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const payment = await createPayPalPayment(result.rows[0]);
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

export const createRazorpayOrder_endpoint = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const result = await req.db.query('SELECT * FROM export_invoices WHERE id = $1', [invoiceId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const order = await createRazorpayOrder(result.rows[0]);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    let whereClause = '';
    const queryParams = [parseInt(limit), parseInt(offset)];
    
    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereClause = 'WHERE company_id IS NULL';
      } else {
        whereClause = 'WHERE company_id = $3';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT id, invoice_no, client_name, total_amount, status, created_at FROM export_invoices ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      queryParams
    );

    const countResult = await req.db.query(`SELECT COUNT(*) as total FROM export_invoices ${whereClause}`, queryParams.slice(2));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
};
