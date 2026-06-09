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
 * Token Management Utilities
 * Handles token generation, validation, and cleanup
 * Security: Uses separate secrets for access and refresh tokens
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database.js';
import env from '../config/env.js';

export const generateAccessToken = (userId, email, role, companyId) => {
  return jwt.sign(
    {
      id: userId,
      email,
      role,
      companyId,
      type: 'access',
      jti: crypto.randomBytes(16).toString('hex')
    },
    env.jwt.secret,
    { 
      expiresIn: env.jwt.accessExpiry,
      algorithm: 'HS256'
    }
  );
};

export const generateRefreshToken = (userId) => {
  const tokenId = crypto.randomBytes(32).toString('hex');
  return {
    token: jwt.sign(
      {
        id: userId,
        type: 'refresh',
        jti: tokenId
      },
      env.jwt.refreshSecret || env.jwt.secret,
      { 
        expiresIn: env.jwt.refreshExpiry || '7d',
        algorithm: 'HS256'
      }
    ),
    tokenId
  };
};

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Token verification failed');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.jwt.refreshSecret || env.jwt.secret, { algorithms: ['HS256'] });
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Refresh token verification failed');
  }
};

export const verifyToken = (token, type = 'access') => {
  if (type === 'refresh') {
    return verifyRefreshToken(token);
  }
  return verifyAccessToken(token);
};

/**
 * Cleanup expired refresh tokens (call periodically)
 */
export const cleanupExpiredTokens = async () => {
  try {
    const result = await query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING id'
    );
    // Token cleanup successful - rowCount indicates number of tokens deleted
    // Token cleanup successful
  } catch (error) {
    // Silently fail cleanup, will retry next interval
  }
};

/**
 * Invalidate user tokens (logout)
 */
export const invalidateUserTokens = async (userId) => {
  try {
    await query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    // Token invalidation error handled silently
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  cleanupExpiredTokens,
  invalidateUserTokens
};
