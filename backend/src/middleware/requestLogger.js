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
 * Request Logging & Audit Trail Middleware
 * Tracks all API requests for audit and debugging
 */

import { v4 as uuidv4 } from 'uuid';
import env from '../config/env.js';
import { debugLogger } from '../utils/debugLogger.js';

export const requestLogger = (req, res, next) => {
  // Add request ID for tracking
  req.id = uuidv4();
  req.startTime = Date.now();
  
  // Extract client info
  req.clientIP = req.ip || req.connection.remoteAddress;
  
  // Log request start
  if (env.node_env === 'development') {
    debugLogger.info('Request', `[${req.id}] ${req.method} ${req.path}`, {
      ip: req.clientIP,
      user: req.user?.id,
      company: req.user?.companyId
    });
  }
  
  // Hook response end
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - req.startTime;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    
    // Log request completion
    if (env.node_env === 'development') {
      debugLogger.info('Request', `[${req.id}] COMPLETED ${res.statusCode} in ${duration}ms`, {
        status: res.statusCode,
        method: req.method,
        path: req.path
      });
    }
    
    // Add request ID to response
    res.setHeader('X-Request-Id', req.id);
    
    return originalJson.call(this, data);
  };
  
  next();
};

export default requestLogger;
