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

import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const WARNING_TIME = 5 * 60 * 1000; // Warn at 5 minutes remaining

/**
 * Manage session state persistence and timeout
 */
export function useSessionManager(userId, isAuthenticated) {
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const saveStateIntervalRef = useRef(null);

  // Save current UI state
  const saveSessionState = useCallback(async (state) => {
    if (!userId || !isAuthenticated) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/session/save`,
        { state },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
    } catch (error) {
      console.warn('Failed to save session state:', error.message);
    }
  }, [userId, isAuthenticated]);

  // Restore session state
  const restoreSessionState = useCallback(async () => {
    if (!userId || !isAuthenticated) return null;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/session/restore`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );

      if (response.data.success && !response.data.data.expired) {
        return response.data.data.state;
      }
      return null;
    } catch (error) {
      console.warn('Failed to restore session state:', error.message);
      return null;
    }
  }, [userId, isAuthenticated]);

  // Clear session state
  const clearSessionState = useCallback(async () => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/session/clear`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
    } catch (error) {
      console.warn('Failed to clear session state:', error.message);
    }
  }, [userId]);

  // Update last activity time
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Check session timeout
  const checkSessionTimeout = useCallback(() => {
    if (!isAuthenticated) return { expired: false, warningShown: false };

    const timeElapsed = Date.now() - lastActivityRef.current;
    const timeRemaining = SESSION_TIMEOUT - timeElapsed;

    return {
      expired: timeElapsed > SESSION_TIMEOUT,
      warningShown: warningShownRef.current,
      shouldShowWarning: timeRemaining < WARNING_TIME && timeRemaining > 0 && !warningShownRef.current,
      timeRemaining: Math.max(0, timeRemaining),
      timeElapsed
    };
  }, [isAuthenticated]);

  // Mark warning as shown
  const markWarningShown = useCallback(() => {
    warningShownRef.current = true;
  }, []);

  // Setup auto-save interval
  useEffect(() => {
    if (!isAuthenticated) return;

    // Auto-save session state every 2 minutes
    saveStateIntervalRef.current = setInterval(() => {
      const currentState = {
        timestamp: Date.now(),
        url: window.location.pathname,
        savedAt: new Date().toISOString()
      };
      saveSessionState(currentState);
    }, 2 * 60 * 1000);

    return () => {
      if (saveStateIntervalRef.current) {
        clearInterval(saveStateIntervalRef.current);
      }
    };
  }, [isAuthenticated, saveSessionState]);

  return {
    saveSessionState,
    restoreSessionState,
    clearSessionState,
    updateActivity,
    checkSessionTimeout,
    markWarningShown
  };
}

export default useSessionManager;
