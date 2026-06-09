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

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';

// Debug helper to verify localStorage is working
const testLocalStorage = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, 'test');
    const value = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return value === 'test';
  } catch (e) {
    console.error('[tokenManager] localStorage is not accessible:', e);
    return false;
  }
};

export const tokenManager = {
  getAccessToken: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      console.debug('[tokenManager] getAccessToken: Token found, length:', token.length);
    } else {
      console.debug('[tokenManager] getAccessToken: NO TOKEN IN LOCALSTORAGE, keys:', Object.keys(localStorage));
    }
    return token;
  },

  setAccessToken: (token) => {
    if (!token) {
      return;
    }
    
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('[tokenManager] setAccessToken failed:', e);
    }
  },

  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token) => {
    if (!token) {
      console.warn('[tokenManager] setRefreshToken: Attempted to set null/empty token');
      return;
    }
    console.debug('[tokenManager] setRefreshToken: Setting refresh token');
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      console.debug('[tokenManager] setRefreshToken: Refresh token stored successfully');
    } catch (e) {
      console.error('[tokenManager] setRefreshToken failed:', e);
    }
  },

  getUser: () => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser: (user) => {
    if (!user) {
      console.warn('[tokenManager] setUser: Attempted to set null/empty user');
      return;
    }
    console.debug('[tokenManager] setUser: Setting user with id:', user?.id);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      console.debug('[tokenManager] setUser: User stored successfully');
    } catch (e) {
      console.error('[tokenManager] setUser failed:', e);
    }
  },

  clearTokens: () => {
    console.debug('[tokenManager] clearTokens: Clearing all tokens');
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      console.debug('[tokenManager] clearTokens: All tokens cleared');
    } catch (e) {
      console.error('[tokenManager] clearTokens failed:', e);
    }
  },

  isAuthenticated: () => {
    const token = tokenManager.getAccessToken();
    const result = !!token && !tokenManager.isTokenExpired(token);
    console.debug('[tokenManager] isAuthenticated:', result, '(hasToken:', !!token, ', tokenExpired:', tokenManager.isTokenExpired(token), ')');
    return result;
  },

  decodeToken: (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('[tokenManager] decodeToken error:', error);
      return null;
    }
  },

  isTokenExpired: (token, bufferSeconds = 0) => {
    if (!token) return true;
    try {
      const decoded = tokenManager.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      // Check if token expires within the buffer period
      return (Date.now() + (bufferSeconds * 1000)) >= decoded.exp * 1000;
    } catch (e) {
      return true;
    }
  },
};
