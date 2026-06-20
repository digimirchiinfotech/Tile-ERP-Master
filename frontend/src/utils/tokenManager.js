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

const USER_KEY = 'current_user';

export const tokenManager = {
  // Tokens are now securely managed by the backend using HTTP-only cookies.
  // These functions are kept as no-ops for backwards compatibility with existing UI components.
  getAccessToken: () => tokenManager.getUser() ? 'cookie-auth-active' : null,
  setAccessToken: () => {},
  getRefreshToken: () => null,
  setRefreshToken: () => {},

  getUser: () => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser: (user) => {
    if (!user) return;
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('[tokenManager] setUser failed:', e);
    }
  },

  clearTokens: () => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('[tokenManager] clearTokens failed:', e);
    }
  },

  isAuthenticated: () => {
    // With HTTP-only cookies, the frontend doesn't have the token.
    // We rely on the presence of the user object in localStorage as a proxy for UI rendering.
    // True authentication is enforced by the backend API.
    return !!tokenManager.getUser();
  },

  isTokenExpired: () => {
    // Obsolete with HTTP-only cookies. Backend handles expiration.
    return false;
  },
};

