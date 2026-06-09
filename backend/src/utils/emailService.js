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

import nodemailer from 'nodemailer';
import env from '../config/env.js';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.secure,
  auth: {
    user: env.email.auth.user,
    pass: env.email.auth.pass
  }
});

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  const resetLink = `${env.frontend_url}?view=reset-password&email=${encodeURIComponent(email)}&token=${resetToken}`;

  const mailOptions = {
    from: env.email.from,
    to: email,
    subject: 'Tile Exporter Solution - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You requested to reset your password for your Tile Exporter Solution account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Tile Exporter Solution - Export Management System<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, userName, temporaryPassword) => {
  const mailOptions = {
    from: env.email.from,
    to: email,
    subject: 'Welcome to Tile Exporter Solution',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Tile Exporter Solution!</h2>
        <p>Hello ${userName},</p>
        <p>Your account has been successfully created.</p>
        <p><strong>Login Details:</strong></p>
        <ul>
          <li>Email: ${email}</li>
          <li>Temporary Password: <strong>${temporaryPassword}</strong></li>
        </ul>
        <p>Please login and change your password immediately.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${env.frontend_url}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Login Now
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Tile Exporter Solution - Export Management System
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

export default { sendPasswordResetEmail, sendWelcomeEmail };
