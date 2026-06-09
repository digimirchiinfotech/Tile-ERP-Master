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

import { debugLogger } from '../utils/debugLogger.js';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Save user's session state (current page, form data, etc.)
 */
export const saveSessionState = async (userId, state, db) => {
  try {
    const stateJson = JSON.stringify(state || {});
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
    
    await db.query(
      `INSERT INTO session_states (user_id, state_data, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET state_data = $2, expires_at = $3, updated_at = NOW()`,
      [userId, stateJson, expiresAt]
    );
    
    return { success: true };
  } catch (error) {
    debugLogger.error('SessionService', 'Error saving session state:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Restore user's session state
 */
export const getSessionState = async (userId, db) => {
  try {
    const result = await db.query(
      `SELECT state_data, expires_at FROM session_states 
       WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { state: null, expired: true };
    }
    
    const { state_data } = result.rows[0];
    return { state: JSON.parse(state_data), expired: false };
  } catch (error) {
    debugLogger.error('SessionService', 'Error retrieving session state:', error);
    return { state: null, expired: true };
  }
};

/**
 * Clear session state
 */
export const clearSessionState = async (userId, db) => {
  try {
    await db.query('DELETE FROM session_states WHERE user_id = $1', [userId]);
    return { success: true };
  } catch (error) {
    debugLogger.error('SessionService', 'Error clearing session state:', error);
    return { success: false };
  }
};

/**
 * Check if session is about to expire
 */
export const isSessionExpiringSoon = (lastActivityTime, warningTime = 5 * 60 * 1000) => {
  if (!lastActivityTime) return false;
  const timeElapsed = Date.now() - lastActivityTime;
  return timeElapsed > (SESSION_TIMEOUT - warningTime);
};

/**
 * Check if session has expired
 */
export const isSessionExpired = (lastActivityTime) => {
  if (!lastActivityTime) return true;
  return Date.now() - lastActivityTime > SESSION_TIMEOUT;
};

export default {
  saveSessionState,
  getSessionState,
  clearSessionState,
  isSessionExpiringSoon,
  isSessionExpired,
  SESSION_TIMEOUT
};
