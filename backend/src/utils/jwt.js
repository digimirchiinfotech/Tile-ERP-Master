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

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

// Generate access token
export const generateAccessToken = (userId, email, role, companyId) => {
  return jwt.sign(
    { id: userId, email, role, companyId },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiry }
  );
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    env.jwt.secret,
    { expiresIn: env.jwt.refreshExpiry }
  );
};

// Verify token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate password reset token
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
