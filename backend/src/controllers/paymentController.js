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
    await handleStripeWebhook(req.body, req.db);
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

    const result = await req.db.query(
      'SELECT id, invoice_no, client_name, total_amount, status, created_at FROM export_invoices ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );

    const countResult = await req.db.query('SELECT COUNT(*) as total FROM export_invoices');

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
