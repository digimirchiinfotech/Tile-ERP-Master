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
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getCurrentUser,
  logout
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

router.post('/register', registerValidator, validateRequest, register);

router.post('/login', loginValidator, validateRequest, login);

router.post('/refresh-token', refreshTokenValidator, validateRequest, refreshToken);

router.post('/forgot-password', forgotPasswordValidator, validateRequest, forgotPassword);

router.post('/validate-reset-token', validateResetTokenValidator, validateRequest, validateResetToken);

router.post('/reset-password', resetPasswordValidator, validateRequest, resetPassword);

router.get('/me', authenticate, getCurrentUser);

router.post('/logout', authenticate, logout);

export default router;
