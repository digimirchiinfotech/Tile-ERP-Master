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
 * errorTracker.js
 * Lightweight, proactive frontend error tracking utility.
 * Captures unhandled JS errors, unhandled promise rejections, and API failures.
 * Stores them in localStorage for review without any external service dependency.
 * Can be wired to any real monitoring service (Sentry, LogRocket, etc.) later.
 */

const MAX_ERRORS = 50; // Keep last 50 errors
const STORAGE_KEY = 'erp_error_log';

let isInitialized = false;

/**
 * Read the error log from localStorage.
 */
const readLog = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Append an error entry to the log.
 */
const writeLog = (entry) => {
  try {
    const log = readLog();
    log.push(entry);
    // Keep only last MAX_ERRORS entries
    if (log.length > MAX_ERRORS) log.splice(0, log.length - MAX_ERRORS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch (e) {
    // Storage full or unavailable — fail silently
  }
};

/**
 * Build a structured error entry.
 */
const buildEntry = (type, message, extra = {}) => ({
  id: Date.now(),
  type,
  message: String(message).slice(0, 500), // Truncate huge messages
  timestamp: new Date().toISOString(),
  url: window.location.href,
  userAgent: navigator.userAgent.slice(0, 100),
  ...extra,
});

/**
 * Track an error manually (e.g. from an API catch block).
 * @param {string|Error} error   - The error to track
 * @param {string}       context - Where it happened (e.g. 'InvoiceForm save')
 */
export const trackError = (error, context = '') => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack || '').slice(0, 600) : '';
  writeLog(buildEntry('manual', message, { context, stack }));
};

/**
 * Track a slow API response.
 * @param {string} endpoint    - The API endpoint
 * @param {number} durationMs  - How long it took in milliseconds
 */
export const trackSlowRequest = (endpoint, durationMs) => {
  if (durationMs > 3000) {
    writeLog(buildEntry('slow_request', `Slow API: ${endpoint} took ${durationMs}ms`, { endpoint, durationMs }));
  }
};

/**
 * Get the full error log (for a debug panel or support page).
 * @returns {Array}
 */
export const getErrorLog = () => readLog();

/**
 * Clear the error log.
 */
export const clearErrorLog = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
};

/**
 * Initialize global error listeners (call once at app startup).
 * Captures unhandled JS errors and Promise rejections automatically.
 */
export const initErrorTracker = () => {
  if (isInitialized) return;
  isInitialized = true;

  // Global JS errors
  window.addEventListener('error', (event) => {
    writeLog(buildEntry('uncaught_error', event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }));
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    writeLog(buildEntry('unhandled_rejection', message, {
      stack: reason instanceof Error ? (reason.stack || '').slice(0, 600) : '',
    }));
  });

  console.info('[ErrorTracker] Global error tracking initialized.');
};
