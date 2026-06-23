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
// In production, ignore Vercel environment variables because they contain the dead .up.railway.app domain
const API_BASE_URL = '/api';

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
  withCredentials: true,
  timeout: 24 * 60 * 60 * 1000,
});

api.interceptors.request.use(
  async (config) => {
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
      // Ignore 401s from login or refresh endpoints to prevent false session expirations
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh-token')) {
        return Promise.reject(error);
      }

      // If already retrying, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh via HTTP-only cookie by calling the refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });

        processQueue(null, null);
        isRefreshing = false;

        // Re-try the original request
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

