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

import { AppError } from './errorHandler.js';

// In-memory store for IP failure tracking
// For multi-instance deployments, this should be moved to Redis
const failedRequests = new Map();

// Cleanup interval to prevent memory leaks (runs every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of failedRequests.entries()) {
    if (now > data.blockedUntil && now > data.firstFailure + 15 * 60 * 1000) {
      failedRequests.delete(ip);
    }
  }
}, 15 * 60 * 1000).unref();

/**
 * Progressive backoff middleware for rate limiting
 * Tracks 4xx and 5xx responses per IP and applies increasing timeouts
 * 
 * Rules:
 * - < 10 failures in 5 min: pass
 * - 10-20 failures in 5 min: 5 minute block
 * - > 20 failures in 5 min: 30 minute block
 */
export const progressiveBackoff = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const record = failedRequests.get(ip);
  const isLogin = req.path === '/auth/login' || req.path === '/login';

  // Check if IP is currently blocked (bypass for login to allow authLimiter to handle it)
  if (!isLogin && record && record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', remainingSeconds);
    return res.status(429).json({
      success: false,
      message: `Too many failed requests. Please try again after ${Math.ceil(remainingSeconds / 60)} minutes.`
    });
  }

  // Intercept response to track failures
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const originalEnd = res.end.bind(res);

  const trackFailure = () => {
    // Only track 4xx (client errors) and 5xx (server errors)
    // Ignore 401/403 here if they are handled by a specific auth limiter, 
    // but tracking them globally adds another layer of brute-force protection.
    if (res.statusCode >= 400) {
      const current = failedRequests.get(ip) || { count: 0, firstFailure: now, blockedUntil: 0 };
      
      // Reset window if it's been more than 5 minutes since first failure
      if (now > current.firstFailure + 5 * 60 * 1000) {
        current.count = 1;
        current.firstFailure = now;
      } else {
        current.count += 1;
      }

      // Apply progressive blocks
      if (current.count >= 20) {
        // Block for 30 minutes
        current.blockedUntil = now + 30 * 60 * 1000;
        console.warn(`🚨 SECURITY: IP ${ip} blocked for 30 minutes due to >20 failures.`);
      } else if (current.count >= 10) {
        // Block for 5 minutes
        current.blockedUntil = now + 5 * 60 * 1000;
        console.warn(`⚠️ SECURITY: IP ${ip} blocked for 5 minutes due to >10 failures.`);
      }

      failedRequests.set(ip, current);
    } else if (res.statusCode === 200 && isLogin) {
      // Clear global block on successful login
      failedRequests.delete(ip);
    }
  };

  res.json = function (body) {
    trackFailure();
    return originalJson(body);
  };

  res.send = function (body) {
    trackFailure();
    return originalSend(body);
  };

  res.end = function (...args) {
    trackFailure();
    return originalEnd(...args);
  };

  next();
};
