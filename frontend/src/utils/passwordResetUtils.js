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
 * Password Reset Utilities
 * Note: This file no longer uses localStorage. All password reset functionality
 * should go through the backend API via authAPI.js
 */

/**
 * Generate a cryptographically secure random token
 * @returns {string} Secure random token (64 characters)
 */
export const generateResetToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash a token using SHA-256
 * @param {string} token - Token to hash
 * @returns {Promise<string>} Hashed token
 */
export const hashToken = async (token) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a password reset email content
 * @param {string} userName - User's name
 * @param {string} resetLink - Password reset link
 * @returns {{subject: string, text: string, html: string}}
 */
export const generateResetEmail = (userName, resetLink) => {
  const subject = 'Password Reset Request';
  
  const text = `
Hello ${userName},

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 30 minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Tile Exporter Solution Team
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      <p>We received a request to reset your password for your Tile Exporter Solution account.</p>
      <p>Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">${resetLink}</p>
      <div class="warning">
        <strong>⏱️ This link will expire in 30 minutes</strong>
      </div>
      <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
      <p>Best regards,<br>Tile Exporter Solution Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return { subject, text, html };
};
