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
 * Email Notification Service
 * Supports: SendGrid, Nodemailer, AWS SES
 * Configurable via environment variables
 */

import nodemailer from 'nodemailer';
import debugLogger from '../utils/debugLogger.js';

const CONTEXT = 'EmailService';
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'nodemailer'; // 'sendgrid', 'nodemailer', 'aws'

let transporter = null;

/**
 * Initialize email transporter based on configuration
 */
const initializeTransporter = async () => {
  try {
    if (EMAIL_PROVIDER === 'sendgrid') {
      // SendGrid setup
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      transporter = sgMail;
      debugLogger.info(CONTEXT, 'SendGrid email provider initialized');
    } else {
      // Default to Nodemailer (SMTP)
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // Verify connection
      if (process.env.NODE_ENV === 'development') {
        await transporter.verify();
        debugLogger.info(CONTEXT, 'Nodemailer SMTP connection verified');
      }
    }
    return transporter;
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to initialize email transporter', { error: error.message });
    throw error;
  }
};

/**
 * Send invoice email
 * @param {string} recipientEmail - Recipient email address
 * @param {object} invoiceData - Invoice details
 * @param {string} pdfBase64 - Base64 encoded PDF (optional)
 */
export const sendInvoiceEmail = async (recipientEmail, invoiceData, pdfBase64 = null) => {
  try {
    if (!transporter) await initializeTransporter();

    const subject = `Export Invoice ${invoiceData.invoiceNo} - ${invoiceData.companyName}`;
    const htmlContent = generateInvoiceEmailTemplate(invoiceData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tilexporter.com',
      to: recipientEmail,
      subject,
      html: htmlContent,
      attachments: pdfBase64 ? [
        {
          filename: `Invoice_${invoiceData.invoiceNo}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf'
        }
      ] : []
    };

    if (EMAIL_PROVIDER === 'sendgrid') {
      await transporter.send(mailOptions);
    } else {
      await transporter.sendMail(mailOptions);
    }

    debugLogger.info(CONTEXT, 'Invoice email sent', { to: recipientEmail, invoice: invoiceData.invoiceNo });
    return { success: true, message: 'Invoice email sent successfully' };
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to send invoice email', { error: error.message, to: recipientEmail });
    throw error;
  }
};

/**
 * Send payment confirmation email
 */
export const sendPaymentConfirmationEmail = async (recipientEmail, paymentData) => {
  try {
    if (!transporter) await initializeTransporter();

    const subject = `Payment Confirmed - Invoice ${paymentData.invoiceNo}`;
    const htmlContent = generatePaymentEmailTemplate(paymentData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tilexporter.com',
      to: recipientEmail,
      subject,
      html: htmlContent
    };

    if (EMAIL_PROVIDER === 'sendgrid') {
      await transporter.send(mailOptions);
    } else {
      await transporter.sendMail(mailOptions);
    }

    debugLogger.info(CONTEXT, 'Payment confirmation email sent', { to: recipientEmail, invoice: paymentData.invoiceNo });
    return { success: true, message: 'Payment confirmation email sent' };
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to send payment email', { error: error.message });
    throw error;
  }
};

/**
 * Send shipment notification email
 */
export const sendShipmentNotificationEmail = async (recipientEmail, shipmentData) => {
  try {
    if (!transporter) await initializeTransporter();

    const subject = `Shipment Update - Invoice ${shipmentData.invoiceNo}`;
    const htmlContent = generateShipmentEmailTemplate(shipmentData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tilexporter.com',
      to: recipientEmail,
      subject,
      html: htmlContent
    };

    if (EMAIL_PROVIDER === 'sendgrid') {
      await transporter.send(mailOptions);
    } else {
      await transporter.sendMail(mailOptions);
    }

    debugLogger.info(CONTEXT, 'Shipment notification email sent', { to: recipientEmail });
    return { success: true, message: 'Shipment notification sent' };
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to send shipment email', { error: error.message });
    throw error;
  }
};

/**
 * Send test email to verify configuration
 */
export const sendTestEmail = async (recipientEmail, config = null) => {
  try {
    // If specific config is provided, create a temporary transporter
    let activeTransporter = transporter;
    if (config && config.smtpHost) {
      activeTransporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: parseInt(config.smtpPort || '587'),
        secure: config.encryption === 'SSL',
        auth: {
          user: config.smtpUsername,
          pass: config.smtpPassword
        }
      });
    } else if (!activeTransporter) {
      activeTransporter = await initializeTransporter();
    }

    const mailOptions = {
      from: (config && config.fromEmail) || process.env.EMAIL_FROM || 'noreply@tilexporter.com',
      to: recipientEmail,
      subject: 'Tile Exporter ERP - Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1e3a8a;">Configuration Test Successful!</h2>
          <p>Hello,</p>
          <p>This is a test email sent from your <strong>Tile Exporter ERP</strong> system settings.</p>
          <p>If you are reading this, your SMTP configuration is working correctly.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    };

    if (EMAIL_PROVIDER === 'sendgrid' && !config) {
      await activeTransporter.send(mailOptions);
    } else {
      await activeTransporter.sendMail(mailOptions);
    }

    return { success: true, message: 'Test email sent successfully' };
  } catch (error) {
    debugLogger.error(CONTEXT, 'Test email failed', { error: error.message });
    throw error;
  }
};

/**
 * Send security/admin notification email
 */
export const sendAdminNotificationEmail = async (subject, message) => {
  try {
    if (!transporter) await initializeTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tilexporter.com';

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tilexporter.com',
      to: adminEmail,
      subject: `[SYSTEM ALERT] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border-left: 4px solid #ef4444;">
          <h3 style="color: #b91c1c;">System Security Alert</h3>
          <p>${message}</p>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">This is a system generated notification.</p>
        </div>
      `
    };

    if (EMAIL_PROVIDER === 'sendgrid') await transporter.send(mailOptions);
    else await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    debugLogger.error(CONTEXT, 'Admin notification failed', { error: error.message });
  }
};

/**
 * Send generic system notification email
 */
export const sendSystemNotificationEmail = async (recipientEmail, subject, message) => {
  try {
    if (!transporter) await initializeTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tilexporter.com',
      to: recipientEmail,
      subject: `[Tile Exporter] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">${subject}</h2>
          <p>${message}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">This is an automated notification from your Tile Exporter ERP system.</p>
        </div>
      `
    };

    if (EMAIL_PROVIDER === 'sendgrid') await transporter.send(mailOptions);
    else await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    debugLogger.error(CONTEXT, 'System notification email failed', { error: error.message, to: recipientEmail });
  }
};

/**
 * Generate professional invoice email template
 */
const generateInvoiceEmailTemplate = (invoice) => {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; }
          .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .invoice-details { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; border-top: 1px solid #ddd; }
          .button { display: inline-block; background-color: #1e3a8a; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${invoice.companyName}</h1>
            <p>Export Invoice</p>
          </div>
          <div class="content">
            <h2>Invoice #${invoice.invoiceNo}</h2>
            <p>Dear ${invoice.clientName},</p>
            <p>Your export invoice is ready. Please find the details below:</p>
            
            <div class="invoice-details">
              <div class="row">
                <strong>Invoice No:</strong>
                <span>${invoice.invoiceNo}</span>
              </div>
              <div class="row">
                <strong>Invoice Date:</strong>
                <span>${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div class="row">
                <strong>Total Amount:</strong>
                <span>${invoice.totalAmount || 'N/A'}</span>
              </div>
              <div class="row">
                <strong>Total Boxes:</strong>
                <span>${invoice.totalBoxes || 'N/A'}</span>
              </div>
              <div class="row">
                <strong>Total SQM:</strong>
                <span>${invoice.totalSqm || 'N/A'}</span>
              </div>
            </div>

            <p>The complete invoice PDF is attached to this email.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <a href="${process.env.FRONTEND_URL || 'https://' + (process.env.REPL_SLUG || 'tile-exporter') + '.' + (process.env.REPL_OWNER || 'user') + '.repl.co'}/dashboard" class="button">View in Dashboard</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${invoice.companyName}. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate payment confirmation email template
 */
const generatePaymentEmailTemplate = (payment) => {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; }
          .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .success-badge { background-color: #ecfdf5; color: #065f46; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; font-weight: bold; }
          .details { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Payment Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${payment.clientName},</p>
            <div class="success-badge">Payment has been successfully received!</div>
            
            <div class="details">
              <div class="row">
                <strong>Invoice No:</strong>
                <span>${payment.invoiceNo}</span>
              </div>
              <div class="row">
                <strong>Amount Received:</strong>
                <span>${payment.amount || 'N/A'}</span>
              </div>
              <div class="row">
                <strong>Payment Date:</strong>
                <span>${new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div class="row">
                <strong>Transaction ID:</strong>
                <span>${payment.transactionId || 'N/A'}</span>
              </div>
              <div class="row">
                <strong>Payment Method:</strong>
                <span>${payment.paymentMethod || 'Online'}</span>
              </div>
            </div>

            <p>Thank you for your payment. Your shipment will be processed shortly.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate shipment notification email template
 */
const generateShipmentEmailTemplate = (shipment) => {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; }
          .header { background-color: #0369a1; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status { background-color: #e0f2fe; color: #0c4a6e; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Shipment Update</h1>
          </div>
          <div class="content">
            <p>Dear ${shipment.clientName},</p>
            <div class="status">
              <strong>Status:</strong> ${shipment.status || 'In Transit'}
            </div>
            
            <div class="details">
              <div class="row">
                <strong>Invoice No:</strong>
                <span>${shipment.invoiceNo}</span>
              </div>
              <div class="row">
                <strong>Container No:</strong>
                <span>${shipment.containerNo || 'N/A'}</span>
              </div>
              <div class="row">
                <strong>Vessel Name:</strong>
                <span>${shipment.vesselName || 'N/A'}</span>
              </div>
              <div class="row">
                <strong>Port of Loading:</strong>
                <span>${shipment.portOfLoading || 'N/A'}</span>
              </div>
              <div class="row">
                <strong>Port of Discharge:</strong>
                <span>${shipment.portOfDischarge || 'N/A'}</span>
              </div>
            </div>

            <p>We'll keep you updated on your shipment status. You can track your shipment in the dashboard.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export default {
  initializeTransporter,
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendShipmentNotificationEmail,
  sendTestEmail,
  sendAdminNotificationEmail,
  sendSystemNotificationEmail
};
