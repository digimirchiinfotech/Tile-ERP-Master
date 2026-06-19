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
 * Performance Monitoring Middleware
 * Tracks API performance and identifies bottlenecks
 */

import env from '../config/env.js';
import { debugLogger } from '../utils/debugLogger.js';

const metrics = {
  requests: new Map(),
  slowQueries: [],
  errors: []
};

export const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  // Track response end
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;
    
    const metric = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      memoryUsed: Math.round(memoryUsed / 1024) + 'KB',
      timestamp: new Date().toISOString()
    };
    
    // Store metrics
    const key = `${req.method} ${req.path}`;
    if (!metrics.requests.has(key)) {
      metrics.requests.set(key, []);
    }
    metrics.requests.get(key).push(metric);
    
    // Track slow requests (> 1000ms)
    if (duration > 1000) {
      metrics.slowQueries.push({
        ...metric,
        threshold: 1000
      });
    }
    
    // Track errors
    if (res.statusCode >= 400) {
      metrics.errors.push({
        ...metric,
        error: data?.message || 'Unknown error'
      });
    }
    
    // Add performance headers
    res.setHeader('X-Response-Time', duration + 'ms');
    
    if (env.node_env === 'development' && duration > 500) {
      debugLogger.warn('Performance', `⚠️ Slow request: ${key} took ${duration}ms`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Get performance metrics endpoint (admin only)
 */
export const getMetrics = (req, res) => {
  const stats = {
    totalRequests: Array.from(metrics.requests.values())
      .reduce((sum, arr) => sum + arr.length, 0),
    averageResponseTime: calculateAverageResponseTime(),
    slowRequests: metrics.slowQueries.slice(-50),
    recentErrors: metrics.errors.slice(-50),
    timestamp: new Date().toISOString()
  };
  
  res.json(stats);
};

/**
 * Calculate average response time across all requests
 */
function calculateAverageResponseTime() {
  let totalDuration = 0;
  let totalRequests = 0;
  
  metrics.requests.forEach((requests) => {
    requests.forEach((req) => {
      totalDuration += req.duration;
      totalRequests++;
    });
  });
  
  return totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0;
}

/**
 * Clear old metrics periodically
 */
setInterval(() => {
  // Prune keys if too many unique paths tracked (prevent Map size leak)
  if (metrics.requests.size > 1000) {
    const keys = Array.from(metrics.requests.keys());
    // Keep only the last 500 unique paths
    keys.slice(0, keys.length - 500).forEach(key => {
      metrics.requests.delete(key);
    });
  }

  metrics.requests.forEach((requests, key) => {
    if (requests.length > 500) {
      metrics.requests.set(key, requests.slice(-250));
    }
  });
  
  if (metrics.slowQueries.length > 500) {
    metrics.slowQueries = metrics.slowQueries.slice(-250);
  }
  
  if (metrics.errors.length > 500) {
    metrics.errors = metrics.errors.slice(-250);
  }
}, 30 * 60 * 1000).unref(); // Every 30 minutes

export default performanceMonitor;
