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

import api from './api.js';

/**
 * Global Search Service
 * Handles real-time search across all modules with JWT authentication
 */

const searchService = {
  /**
   * Perform global search across all modules
   * @param {string} searchTerm - The search term
   * @returns {Promise} - Search results from backend
   */
  async globalSearch(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return { success: true, data: [], count: 0 };
      }

      // Backend implements GET /api/global-search?q=... returning { query, total, results }
      const response = await api.get('/global-search', {
        params: { q: searchTerm.trim() },
      });

      const respData = response.data || {};

      // Support both shapes: { results: [...] } or { data: [...] }
      const results = respData.results || respData.data || respData || [];
      const count = respData.total || respData.count || (Array.isArray(results) ? results.length : 0);

      return {
        success: true,
        data: results,
        count,
      };
    } catch (error) {
      console.error('Global search error:', error);
      return {
        success: false,
        data: [],
        count: 0,
        error: error?.response?.data || error.message,
      };
    }
  },

  /**
   * Perform advanced filtered search
   * @param {string} module - The module to search (leads, invoices, etc)
   * @param {object} filters - Filter options
   * @returns {Promise} - Filtered search results
   */
  async advancedSearch(module, filters = {}) {
    try {
      const response = await api.post('/search/advanced', {
        module,
        filters,
      });

      return {
        success: response.data?.success !== false,
        data: response.data?.data || response.data || [],
        count: response.data?.count || 0,
      };
    } catch (error) {
      console.error('Advanced search error:', error);
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message,
      };
    }
  },
};

export default searchService;
