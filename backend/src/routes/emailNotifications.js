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
import { authenticate } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import env from '../config/env.js';

const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.email_user || 'noreply@tileexporter.com',
    pass: env.email_password || 'test-password'
  }
});

/**
 * Send email notification for order status change
 */
router.post('/order-status', authenticate, async (req, res, next) => {
  try {
    const { orderId, recipientEmail, newStatus, orderNumber } = req.body;

    const mailOptions = {
      from: env.email_user || 'noreply@tileexporter.com',
      to: recipientEmail,
      subject: `Order Status Update: ${orderNumber}`,
      html: `
        <h2>Order Status Update</h2>
        <p>Your order <strong>#${orderNumber}</strong> status has been updated.</p>
        <p><strong>New Status:</strong> ${newStatus}</p>
        <p>You can view your order details by clicking the link below:</p>
        <a href="${env.frontend_url}/order-dashboard/${orderId}" 
           style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Order
        </a>
        <br><br>
        <small style="color: #666;">Tile Exporter Solution</small>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Send email notification for QC failure
 */
router.post('/qc-failed', authenticate, async (req, res, next) => {
  try {
    const { qcRecordId, productName, reason, recipientEmail } = req.body;

    const mailOptions = {
      from: env.email_user || 'noreply@tileexporter.com',
      to: recipientEmail,
      subject: `⚠️ QC Inspection Failed: ${productName}`,
      html: `
        <h2 style="color: #dc2626;">Quality Control Inspection Failed</h2>
        <p>Product <strong>${productName}</strong> failed QC inspection.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please take immediate action to address this issue.</p>
        <a href="${env.frontend_url}/qc-management/${qcRecordId}" 
           style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View QC Record
        </a>
        <br><br>
        <small style="color: #666;">Tile Exporter Solution</small>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Alert email sent successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Send email notification for payment due
 */
router.post('/payment-due', authenticate, async (req, res, next) => {
  try {
    const { invoiceId, invoiceNumber, dueDate, amount, recipientEmail } = req.body;

    const mailOptions = {
      from: env.email_user || 'noreply@tileexporter.com',
      to: recipientEmail,
      subject: `Payment Due: Invoice #${invoiceNumber}`,
      html: `
        <h2>Payment Reminder</h2>
        <p>Payment is due for invoice <strong>#${invoiceNumber}</strong>.</p>
        <table style="width: 100%; margin: 20px 0;">
          <tr>
            <td><strong>Invoice Number:</strong></td>
            <td>${invoiceNumber}</td>
          </tr>
          <tr>
            <td><strong>Due Date:</strong></td>
            <td>${dueDate}</td>
          </tr>
          <tr>
            <td><strong>Amount Due:</strong></td>
            <td>$${amount}</td>
          </tr>
        </table>
        <a href="${env.frontend_url}/invoice-management/${invoiceId}" 
           style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Pay Now
        </a>
        <br><br>
        <small style="color: #666;">Tile Exporter Solution</small>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Payment reminder sent successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Send email notification for shipment ready
 */
router.post('/shipment-ready', authenticate, async (req, res, next) => {
  try {
    const { orderId, orderNumber, shipmentDate, trackingNumber, recipientEmail } = req.body;

    const mailOptions = {
      from: env.email_user || 'noreply@tileexporter.com',
      to: recipientEmail,
      subject: `✓ Your Shipment is Ready: ${orderNumber}`,
      html: `
        <h2 style="color: #10b981;">Shipment Ready</h2>
        <p>Your order <strong>#${orderNumber}</strong> is ready for shipment!</p>
        <table style="width: 100%; margin: 20px 0;">
          <tr>
            <td><strong>Order Number:</strong></td>
            <td>${orderNumber}</td>
          </tr>
          <tr>
            <td><strong>Expected Shipment:</strong></td>
            <td>${shipmentDate}</td>
          </tr>
          ${trackingNumber ? `<tr>
            <td><strong>Tracking Number:</strong></td>
            <td>${trackingNumber}</td>
          </tr>` : ''}
        </table>
        <a href="${env.frontend_url}/order-dashboard/${orderId}" 
           style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Track Shipment
        </a>
        <br><br>
        <small style="color: #666;">Tile Exporter Solution</small>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Shipment notification sent successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Send bulk notifications
 */
router.post('/bulk', authenticate, async (req, res, next) => {
  try {
    const { recipients, subject, template, data } = req.body;

    const htmlContent = template
      .replace(/{{subject}}/g, data.subject || '')
      .replace(/{{message}}/g, data.message || '')
      .replace(/{{actionUrl}}/g, data.actionUrl || '#');

    const mailPromises = recipients.map(email =>
      transporter.sendMail({
        from: env.email_user || 'noreply@tileexporter.com',
        to: email,
        subject,
        html: htmlContent
      })
    );

    await Promise.all(mailPromises);
    res.json({ 
      success: true, 
      message: `Bulk email sent to ${recipients.length} recipients` 
    });
  } catch (error) {
    next(error);
  }
});

export default router;
