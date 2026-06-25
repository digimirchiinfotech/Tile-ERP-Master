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
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/helpers.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { revokeAllUserTokens } from '../utils/tokenManager.js';

const router = express.Router();

// ADMIN ONLY: Direct password reset (for Super Admin only)
// Protected: Requires authentication and super_admin role
// Usage: POST /api/admin/reset-password-direct
// Body: { email: "", new_password: "" }
router.post('/reset-password-direct', authenticate, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { email, new_password } = req.body;

    if (!email || !new_password) {
      return next(new AppError('Email and new password are required', 400));
    }

    // Validate password strength
    if (new_password.length < 8) {
      return next(new AppError('Password must be at least 8 characters', 400));
    }

    const userResult = await query(
      'SELECT id FROM users WHERE email_id = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email_id = $2',
      [passwordHash, email]
    );

    // Revoke all refresh tokens (marks revoked=TRUE instead of deleting, preserving audit trail)
    await revokeAllUserTokens({ globalQuery: query }, userResult.rows[0].id, 'admin_password_reset');

    return successResponse(res, {}, 'Password has been reset successfully');

  } catch (error) {
    next(error);
  }
});

export default router;
