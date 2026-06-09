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

import winston from 'winston';
import 'winston-daily-rotate-file';
import env from '../config/env.js';
import path from 'path';

const isDev = env.node_env === 'development';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(metadata).length > 0 && metadata.stack === undefined && metadata.dataSize === undefined && metadata.duration === undefined) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    if (metadata.stack) {
      msg += `\n${metadata.stack}`;
    }
    return msg;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'tile-exporter-api' },
  transports: [
    // Daily rotate file for errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    }),
    // Daily rotate file for all logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// If we're not in production, log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Preserve existing debugLogger interface
const debugLogger = {
  info: (context, message, data = null) => {
    logger.info(`[${context}] ${message}`, data ? { data } : {});
  },

  success: (context, message, data = null) => {
    logger.info(`[${context}] ✅ ${message}`, data ? { data } : {});
  },

  error: (context, message, err = null) => {
    if (err instanceof Error) {
      logger.error(`[${context}] ❌ ${message} - ${err.message}`, { 
        stack: err.stack,
        code: err.code,
        detail: err.detail
      });
    } else {
      logger.error(`[${context}] ❌ ${message}`, err ? { err } : {});
    }
  },

  warning: (context, message, data = null) => {
    logger.warn(`[${context}] ⚠️ ${message}`, data ? { data } : {});
  },

  warn: (context, message, data = null) => {
    logger.warn(`[${context}] ⚠️ ${message}`, data ? { data } : {});
  },

  request: (method, endpoint, data = null, userId = null) => {
    logger.info(`→ ${method} ${endpoint}`, { userId, data });
  },

  response: (method, endpoint, statusCode, duration = null) => {
    const level = statusCode >= 400 ? 'error' : 'info';
    logger.log(level, `← ${statusCode} ${method} ${endpoint}`, { duration });
  },

  timing: (context, operation, duration, threshold = 1000) => {
    const level = duration > threshold ? 'warn' : 'debug';
    logger.log(level, `[${context}] ⏱️ ${operation}: ${duration}ms`);
  },

  query: (sql, params = null, duration = null) => {
    logger.debug(`[SQL] ${String(sql).substring(0, 120)}`, { params, duration });
  },

  validation: (context, field, rule, passed, err = null) => {
    const status = passed ? `✓` : `✗`;
    const level = passed ? 'debug' : 'warn';
    logger.log(level, `[${context}] Validation ${status} ${field} → ${rule}`, err ? { err } : {});
  },

  trace: (context, message, data = null) => {
    logger.silly(`[${context}] TRACE ${message}`, data ? { data } : {});
  },

  rbac: (context, userId, role, action, resource, allowed) => {
    const status = allowed ? `ALLOWED` : `DENIED`;
    const level = allowed ? 'info' : 'warn';
    logger.log(level, `[${context}] RBAC | User:${userId} Role:${role} ${action} ${resource} → ${status}`);
  },

  multitenancy: (context, userId, companyId, action) => {
    logger.info(`[${context}] MT | User:${userId} Company:${companyId} ${action}`);
  },

  performance: (label, startTime) => {
    const duration = Date.now() - startTime;
    const level = duration > 500 ? 'warn' : 'debug';
    logger.log(level, `⚡ ${label}: ${duration}ms`);
  },

  apiSummary: (method, endpoint, statusCode, duration, dataSize = null) => {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    logger.log(level, `${method} ${endpoint} ${statusCode} ${duration}ms`, { dataSize });
  },
};

export const warn = (...args) => debugLogger.warn(...args);
export const info = (...args) => debugLogger.info(...args);
export const error = (...args) => debugLogger.error(...args);

export { debugLogger };
export default debugLogger;
