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
 * 
 * Security model:
 *  - Access tokens:  short-lived JWT (15 min), verified in-memory — DPDP Act 2023 compliant
 *  - Refresh tokens: opaque 256-bit random hex, stored ONLY as SHA-256 hash
 *  - Token families: each login creates a family UUID; all rotated tokens
 *    share the same family. Reuse of a revoked token triggers full-family
 *    revocation (stolen-token detection).
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import env from '../config/env.js';
import debugLogger from './debugLogger.js';

// ─── SHA-256 helpers ──────────────────────────────────────────────────────────

/**
 * Hash a raw refresh token for DB storage.
 * We NEVER store plaintext tokens.
 * @param {string} rawToken
 * @returns {string} hex-encoded SHA-256 hash
 */
export const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Generate a short-lived access JWT.
 * Default expiry: 360 minutes (6 hours).
 */
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
      expiresIn: env.jwt.accessExpiry,   // resolved from env, default '360m'
      algorithm: 'HS256'
    }
  );
};

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
    if (decoded.type !== 'access') throw new Error('Invalid token type');
    return decoded;
  } catch (error) {
    throw new Error('Token verification failed');
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-secure opaque refresh token.
 * Returns both the raw token (sent to client) and its hash (stored in DB).
 *
 * @param {string} [familyId]  Existing family UUID to continue; omit on first login
 * @returns {{ rawToken: string, tokenHash: string, family: string, expiresAt: Date }}
 */
export const generateRefreshToken = (familyId) => {
  const rawToken  = crypto.randomBytes(64).toString('hex');  // 512 bits of entropy
  const tokenHash = hashToken(rawToken);
  const family    = familyId || uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return { rawToken, tokenHash, family, expiresAt };
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      env.jwt.refreshSecret || env.jwt.secret,
      { algorithms: ['HS256'] }
    );
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');
    return decoded;
  } catch (error) {
    throw new Error('Refresh token verification failed');
  }
};

export const verifyToken = (token, type = 'access') => {
  if (type === 'refresh') return verifyRefreshToken(token);
  return verifyAccessToken(token);
};

// ─── DB operations (use the shared master pool directly) ─────────────────────

/**
 * Store a new refresh token in the master DB.
 * Always stores the hash, never the raw token.
 *
 * @param {object} db        - req.db (or { globalQuery }) 
 * @param {string} userId
 * @param {string} tokenHash
 * @param {string} family
 * @param {Date}   expiresAt
 */
export const storeRefreshToken = async (db, userId, tokenHash, family, expiresAt) => {
  await db.globalQuery(
    `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, family, expiresAt]
  );
};

/**
 * Atomically rotate a refresh token:
 *  1. Fetch the existing record by hash.
 *  2. If already revoked → THEFT DETECTED → revoke entire family.
 *  3. If valid → revoke old token, insert new token (same family).
 * All three DB operations happen inside a single transaction.
 *
 * @param {object} db          - req.db
 * @param {string} rawToken    - raw token received from client
 * @returns {{ userId, newRawToken, newTokenHash, family, expiresAt } | null}
 *   Returns null when the token was already revoked (theft); the family has
 *   been revoked already in that case.
 */
export const rotateRefreshToken = async (db, rawToken) => {
  const incomingHash = hashToken(rawToken);
  const client = await db.getGlobalClient();

  try {
    await client.query('BEGIN');

    // Lock the row exclusively
    const existing = await client.query(
      `SELECT id, user_id, family, expires_at, revoked
         FROM refresh_tokens
        WHERE token_hash = $1
          FOR UPDATE`,
      [incomingHash]
    );

    if (existing.rows.length === 0) {
      // Token not found at all — invalid
      await client.query('ROLLBACK');
      return null;
    }

    const record = existing.rows[0];

    // ── Reuse detection: token was already revoked ──────────────────────────
    if (record.revoked) {
      debugLogger.warn('Auth', `Refresh token reuse detected for family ${record.family}. Revoking entire family.`);
      await client.query(
        `UPDATE refresh_tokens
            SET revoked = TRUE, revoked_reason = 'family_compromised'
          WHERE family = $1 AND revoked = FALSE`,
        [record.family]
      );
      await client.query('COMMIT');
      return null;
    }

    // ── Check expiry ────────────────────────────────────────────────────────
    if (new Date() > new Date(record.expires_at)) {
      await client.query(
        `UPDATE refresh_tokens SET revoked = TRUE, revoked_reason = 'expired'
           WHERE id = $1`,
        [record.id]
      );
      await client.query('COMMIT');
      return null;
    }

    // ── Revoke the old token ────────────────────────────────────────────────
    await client.query(
      `UPDATE refresh_tokens
          SET revoked = TRUE, revoked_reason = 'rotated'
        WHERE id = $1`,
      [record.id]
    );

    // ── Issue new token in the same family ──────────────────────────────────
    const { rawToken: newRawToken, tokenHash: newTokenHash, family, expiresAt } =
      generateRefreshToken(record.family);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [record.user_id, newTokenHash, family, expiresAt]
    );

    await client.query('COMMIT');
    return { userId: record.user_id, newRawToken, newTokenHash, family, expiresAt };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Revoke a single refresh token (logout).
 * Uses the hash — never the raw token.
 *
 * @param {object} db
 * @param {string} rawToken
 * @param {string} userId   - safety check: only revoke if it belongs to this user
 */
export const revokeRefreshToken = async (db, rawToken, userId) => {
  const tokenHash = hashToken(rawToken);
  await db.globalQuery(
    `UPDATE refresh_tokens
        SET revoked = TRUE, revoked_reason = 'logout'
      WHERE token_hash = $1 AND user_id = $2`,
    [tokenHash, userId]
  );
};

/**
 * Revoke ALL active refresh tokens for a user.
 * Called on password reset, account lock, etc.
 *
 * @param {object} db
 * @param {string} userId
 * @param {string} reason
 */
export const revokeAllUserTokens = async (db, userId, reason = 'admin_action') => {
  await db.globalQuery(
    `UPDATE refresh_tokens
        SET revoked = TRUE, revoked_reason = $2
      WHERE user_id = $1 AND revoked = FALSE`,
    [userId, reason]
  );
};

/**
 * Revoke ALL active refresh tokens for every user in a company.
 * Called by company_admin via POST /api/auth/revoke-all (emergency revocation).
 *
 * @param {object} db
 * @param {string} companyId
 * @param {string} reason
 * @returns {Promise<number>} rowcount of revoked tokens
 */
export const revokeAllCompanyTokens = async (db, companyId, reason = 'emergency_revocation') => {
  const result = await db.globalQuery(
    `UPDATE refresh_tokens rt
        SET revoked = TRUE, revoked_reason = $2
       FROM users u
      WHERE rt.user_id = u.id
        AND u.company_id = $1
        AND rt.revoked = FALSE`,
    [companyId, reason]
  );
  return result.rowCount;
};

// ─── Scheduled cleanup ────────────────────────────────────────────────────────

/**
 * Delete refresh tokens that are both expired AND revoked, older than 30 days.
 * Called daily via server.js setInterval.
 */
export const cleanupExpiredTokens = async () => {
  try {
    await query(
      `DELETE FROM refresh_tokens
        WHERE expires_at < NOW() - INTERVAL '30 days'
           OR (revoked = TRUE AND expires_at < NOW())`
    );
  } catch (error) {
    debugLogger.warn('TokenManager', 'Refresh token cleanup failed (will retry next interval)', error.message);
  }
};

/**
 * @deprecated Use revokeAllUserTokens() instead.
 * Kept for backward-compat with existing callers (admin-password-reset.js, etc.)
 */
export const invalidateUserTokens = async (userId) => {
  try {
    await revokeAllUserTokens({ globalQuery: query }, userId, 'invalidated');
  } catch (error) {
    debugLogger.warn('TokenManager', 'invalidateUserTokens failed silently', error.message);
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,
  hashToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  revokeAllCompanyTokens,
  cleanupExpiredTokens,
  invalidateUserTokens
};
