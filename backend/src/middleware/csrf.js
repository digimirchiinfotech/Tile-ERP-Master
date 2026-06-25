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
 * CSRF Protection Middleware
 * Prevents Cross-Site Request Forgery attacks
 */

import crypto from 'crypto';

// Store: sessionId → { token, createdAt }
// Fixed HIGH-SEC-003: Added timestamp so cleanup interval can actually purge old tokens.
// Note: For multi-process/cluster deployments, migrate to Redis or a shared store.
const csrfTokens = new Map();

/**
 * Generate CSRF token for session
 */
export const generateCSRFToken = (sessionId) => {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, { token, createdAt: Date.now() });
  return token;
};

/**
 * Verify CSRF token
 */
export const verifyCSRFToken = (sessionId, token) => {
  const entry = csrfTokens.get(sessionId);
  if (!entry) return false;
  // Support both old string format and new { token, createdAt } format
  const storedToken = typeof entry === 'object' ? entry.token : entry;
  return storedToken && crypto.timingSafeEqual(
    Buffer.from(storedToken),
    Buffer.from(token)
  );
};

/**
 * CSRF middleware - Generate token on GET, verify on POST/PUT/DELETE
 */
export const csrfProtection = (req, res, next) => {
  const sessionId = req.user?.id || req.ip;
  
  if (!sessionId) {
    return next();
  }
  
  // Add CSRF token to request
  req.csrfToken = () => {
    let token = csrfTokens.get(sessionId);
    if (!token) {
      token = generateCSRFToken(sessionId);
    }
    return token;
  };
  
  // Skip CSRF verification for GET requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF verification if authentication was via Bearer token (no cookies)
  // CSRF attacks rely on the browser automatically attaching cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }
  
  // Verify CSRF token for POST/PUT/DELETE
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
  }
  
  try {
    if (!verifyCSRFToken(sessionId, token)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      });
    }
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token verification failed'
    });
  }
  
  // Generate new token for next request
  generateCSRFToken(sessionId);
  res.setHeader('X-CSRF-Token', req.csrfToken());
  
  next();
};

// Cleanup expired CSRF tokens every hour
// Fixed HIGH-SEC-003: Previously this had an empty loop body — tokens were never purged.
setInterval(() => {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();
  let pruned = 0;
  csrfTokens.forEach((entry, sessionId) => {
    const createdAt = typeof entry === 'object' ? entry.createdAt : 0;
    if (now - createdAt > maxAge) {
      csrfTokens.delete(sessionId);
      pruned++;
    }
  });
}, 60 * 60 * 1000).unref();

export default csrfProtection;
