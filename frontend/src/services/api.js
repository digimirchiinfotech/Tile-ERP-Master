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

import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';
import { normalizeData, prepareDataForAPI } from '../utils/dataTransformers';
import { trackError, trackSlowRequest } from '../utils/errorTracker';

// Use Vite proxy in development (configured in vite.config.js)
// In production, use relative /api path
const API_BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://tile-erp-master-production.railway.app/api";

console.log("API_BASE_URL =", API_BASE_URL);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 24 * 60 * 60 * 1000,
});

api.interceptors.request.use(
  async (config) => {
    let token = tokenManager.getAccessToken();
    const url = config.url || '';

    // Public/auth endpoints do not need token checks
    const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/forgot-password', '/auth/reset-password', '/auth/validate-reset-token'];
    const isPublicAuth = publicAuthPaths.some((p) => url.endsWith(p) || url.includes(p));

    if (token && !isPublicAuth) {
      // PROACTIVE REFRESH: If token expires in less than 1 minute, refresh it before sending the request
      if (tokenManager.isTokenExpired(token, 60)) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const currentRefreshToken = tokenManager.getRefreshToken();
            if (currentRefreshToken) {
              console.debug('[API] Proactively refreshing token...');
              const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                refreshToken: currentRefreshToken,
              });
              const responseData = response.data?.data || response.data;
              token = responseData.accessToken;

              tokenManager.setAccessToken(token);
              if (responseData.refreshToken) {
                tokenManager.setRefreshToken(responseData.refreshToken);
              }
              processQueue(null, token);
            }
          } catch (refreshError) {
            console.error('[API] Proactive refresh failed:', refreshError.message);
            processQueue(refreshError, null);
            // Don't clear tokens here, let the 401 handler deal with it if the request fails
          } finally {
            isRefreshing = false;
          }
        } else {
          // Wait for the ongoing refresh
          token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
        }
      }
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isPublicAuth && !token) {
      console.warn('[API Request Interceptor] ⚠️ NO TOKEN FOUND - request will likely fail with 401');
    }

    // Multi-tenant isolation headers
    const selectedCompanyId = localStorage.getItem('selected_company_id');
    if (selectedCompanyId && selectedCompanyId !== 'null' && selectedCompanyId !== 'undefined') {
      config.headers['x-company-id'] = selectedCompanyId;
      config.headers['x-selected-company-id'] = selectedCompanyId;
    }

    try {
      if (
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof FormData) &&
        !config.skipTransform
      ) {
        config.data = prepareDataForAPI(config.data);
      }
    } catch (err) {
      console.warn('Request data transformation failed', err);
    }

    // Stamp request start time for performance tracking
    config._startTime = Date.now();

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Track slow successful responses
    const duration = response.config._startTime ? Date.now() - response.config._startTime : 0;
    if (duration > 0) trackSlowRequest(response.config.url, duration);

    try {
      if (response?.data) {
        response.data = normalizeData(response.data);
      }
    } catch (err) {
      console.warn('Response normalization failed', err);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Track slow/failed API requests
    const duration = originalRequest?._startTime ? Date.now() - originalRequest._startTime : 0;
    if (duration > 0) trackSlowRequest(originalRequest?.url || 'unknown', duration);
    if (error.response?.status >= 500) {
      trackError(error, `API ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
    }
    if (error.response?.status === 400 || error.response?.status === 422) {
      console.error('[API] Validation Error:', error.response.data);
    }

    if (error.response?.status === 403) {
      // We no longer blindly override the 403 message so backend lock messages are preserved
      try {
        error.response.data = error.response.data || {};
        if (!error.response.data.message) {
          error.response.data.message = 'You do not have permission to perform this action.';
        }
      } catch (e) { }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const currentAccessToken = tokenManager.getAccessToken();
      const currentRefreshToken = tokenManager.getRefreshToken();

      // If no token exists at all, user was never logged in
      if (!currentAccessToken) {
        isRefreshing = false;
        processQueue(new Error('Not authenticated'), null);
        return Promise.reject(error);
      }

      // If already retrying, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Only attempt refresh if we have a refresh token
      if (!currentRefreshToken) {
        isRefreshing = false;
        tokenManager.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'No refresh token available' } }));
        processQueue(new Error('Not authenticated'), null);
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: currentRefreshToken,
        });

        const responseData = response.data?.data || response.data;
        const { accessToken, refreshToken: newRefreshToken } = responseData;

        if (!accessToken) {
          throw new Error('No access token in refresh response');
        }

        tokenManager.setAccessToken(accessToken);
        if (newRefreshToken) {
          tokenManager.setRefreshToken(newRefreshToken);
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[API 401 Handler] ❌ Token refresh failed:', refreshError.message);
        processQueue(refreshError, null);
        isRefreshing = false;
        tokenManager.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'Token refresh failed' } }));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

