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
 * errorParser.js
 * Translates raw backend/API errors into human-readable, actionable messages.
 * Instead of showing "500 Internal Server Error", users see what actually went wrong
 * and what they can do to fix it.
 */

/**
 * Map of known backend error codes / message substrings to friendly UI messages.
 */
const ERROR_MAP = [
  // Database constraint errors
  { match: /column .* does not exist/i,       message: 'A required data field is missing. Please contact support or try refreshing the page.' },
  { match: /null value in column .* violates not-null constraint/i, message: (m) => {
    const col = m.match(/column "(.*?)"/)?.[1] || 'a required field';
    return `The field "${col.replace(/_/g, ' ')}" is required and cannot be empty.`;
  }},
  { match: /duplicate key value violates unique constraint/i, message: 'A record with this value already exists. Please use a different value.' },
  { match: /relation .* does not exist/i,     message: 'A database table is missing. Please contact your system administrator.' },
  { match: /invalid input syntax for type uuid/i, message: 'An invalid ID was provided. Please refresh and try again.' },
  { match: /foreign key constraint/i,         message: 'This record cannot be changed because it is linked to other data. Please remove those links first.' },

  // Auth errors
  { match: /unauthorized|jwt expired|token expired/i, message: 'Your session has expired. Please log in again.' },
  { match: /forbidden|access denied/i,        message: "You don't have permission to perform this action." },

  // Validation errors
  { match: /required/i,                       message: 'Please fill in all required fields before saving.' },
  { match: /invalid email/i,                  message: 'Please enter a valid email address.' },

  // Network errors
  { match: /network error|failed to fetch|ERR_NETWORK/i, message: 'Unable to reach the server. Please check your internet connection and try again.' },
  { match: /timeout/i,                        message: 'The request took too long. Please try again.' },

  // Conflict
  { match: /409|conflict/i,                   message: 'This record is locked or has a conflict. Please refresh and try again.' },

  // Generic 500
  { match: /500|internal server error/i,      message: 'A server error occurred. Our team has been notified. Please try again in a moment.' },
];

/**
 * Parse an error from an API call into a user-friendly string.
 * @param {Error|object|string} error - The raw error
 * @returns {string} - A human-readable error message
 */
export const parseError = (error) => {
  // Extract the raw message string from various error shapes
  let rawMessage = '';

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message || '';
  } else if (error?.response?.data) {
    const data = error.response.data;
    rawMessage = data.message || data.error || data.detail || JSON.stringify(data);
  } else if (error?.message) {
    rawMessage = error.message;
  } else {
    rawMessage = String(error);
  }

  // Try to match against known patterns
  for (const { match, message } of ERROR_MAP) {
    if (match.test(rawMessage)) {
      return typeof message === 'function' ? message(rawMessage) : message;
    }
  }

  // If it's a short, readable message from the backend (< 150 chars), use it directly
  if (rawMessage && rawMessage.length < 150 && !/sql|pg|query|stack/i.test(rawMessage)) {
    return rawMessage;
  }

  // Ultimate fallback
  return 'An unexpected error occurred. Please try again or contact support.';
};

/**
 * Convenience: show a parsed error via the notification system.
 * Import showError from NotificationManager and use this together.
 * 
 * @param {Error|object|string} error    - The raw error
 * @param {function}            showFn   - The showError function from NotificationManager
 * @param {string}              [prefix] - Optional context prefix, e.g. "Failed to save invoice"
 */
export const showParsedError = (error, showFn, prefix = '') => {
  const message = parseError(error);
  const fullMessage = prefix ? `${prefix}: ${message}` : message;
  if (typeof showFn === 'function') showFn(fullMessage);
  return fullMessage;
};
