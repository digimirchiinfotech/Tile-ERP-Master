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

import api from './api';

export const authAPI = {
  login: async (emailIdOrUsername, password) => {
    // Support both email and username login
    const isEmail = emailIdOrUsername && emailIdOrUsername.includes('@');
    const requestBody = isEmail
      ? { email_id: emailIdOrUsername, password }
      : { username: emailIdOrUsername, password };

    try {
      const response = await api.post('/auth/login', requestBody);
      // Backend wraps payload as { success, message, data }
      // Return the inner data object (user, accessToken, refreshToken) for consumers
      const payload = (response && response.data && response.data.data) ? response.data.data : response.data;
      
      if (!payload || !payload.accessToken || !payload.refreshToken) {
        throw new Error('Invalid login response: missing tokens');
      }
      
      return payload;
    } catch (error) {
      // Surface a friendly error message to callers (prefer server-provided message)
      const serverMessage = error.response?.data?.message || error.response?.data?.error;
      throw new Error(serverMessage || error.message || 'Login request failed');
    }
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  forgotPassword: async (emailId) => {
    const response = await api.post('/auth/forgot-password', { 
      email_id: emailId  // Convert to backend's snake_case
    });
    return response.data;
  },

  resetPassword: async (emailId, token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      email_id: emailId,  // Convert to backend's snake_case
      token,
      new_password: newPassword,  // Convert to backend's snake_case
    });
    return response.data;
  },

  validateResetToken: async (emailId, token) => {
    const response = await api.post('/auth/validate-reset-token', {
      email_id: emailId,  // Convert to backend's snake_case
      token,
    });
    return response.data;
  },
};
