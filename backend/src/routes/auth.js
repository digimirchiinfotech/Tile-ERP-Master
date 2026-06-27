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
import { rateLimit } from 'express-rate-limit';
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getCurrentUser,
  logout,
  revokeAll
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/inputValidation.js';
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  validateResetTokenValidator,
  resetPasswordValidator
} from '../validators/authValidator.js';

const router = express.Router();

// Strict rate limit for refresh token to prevent token rotation abuse
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many token refresh attempts. Please log in again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerValidator, validateRequest, register);

router.post('/login', loginLimiter, loginValidator, validateRequest, login);

router.post('/refresh-token', refreshTokenLimiter, refreshTokenValidator, validateRequest, refreshToken);

router.post('/forgot-password', forgotPasswordValidator, validateRequest, forgotPassword);

router.post('/validate-reset-token', validateResetTokenValidator, validateRequest, validateResetToken);

router.post('/reset-password', resetPasswordValidator, validateRequest, resetPassword);

router.get('/me', authenticate, getCurrentUser);

router.post('/logout', authenticate, logout);

// Emergency: company_admin revokes all active sessions for their company
router.post('/revoke-all', authenticate, revokeAll);

export default router;
