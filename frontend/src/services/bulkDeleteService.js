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
 * Bulk Delete Service
 * Frontend API calls for multi-delete operations
 */

import api from './api.js';

const bulkDeleteService = {
  /**
   * Soft delete multiple clients
   * @param {string[]} ids - Array of client IDs
   * @returns {Promise}
   */
  deleteClients: async (ids) => {
    try {
      const response = await api.post('/bulk-delete/clients', { ids });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Soft delete multiple leads
   * @param {string[]} ids - Array of lead IDs
   * @returns {Promise}
   */
  deleteLeads: async (ids) => {
    try {
      const response = await api.post('/bulk-delete/leads', { ids });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Soft delete multiple suppliers
   * @param {string[]} ids - Array of supplier IDs
   * @returns {Promise}
   */
  deleteSuppliers: async (ids) => {
    try {
      const response = await api.post('/bulk-delete/suppliers', { ids });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Soft delete multiple products
   * @param {string[]} ids - Array of product IDs
   * @returns {Promise}
   */
  deleteProducts: async (ids) => {
    try {
      const response = await api.post('/bulk-delete/products', { ids });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Soft delete multiple catalogues
   * @param {string[]} ids - Array of catalogue IDs
   * @returns {Promise}
   */
  deleteCatalogues: async (ids) => {
    try {
      const response = await api.post('/bulk-delete/catalogues', { ids });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Soft delete multiple invoices
   * @param {string[]} ids - Array of invoice IDs
   * @returns {Promise}
   */
  deleteInvoices: async (ids) => {
    try {
      const response = await api.post('/bulk-delete/invoices', { ids });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Permanently delete multiple records (admin only)
   * @param {string} table - Table name: 'clients', 'leads', 'products', 'catalogues', 'invoices'
   * @param {string[]} ids - Array of IDs to delete
   * @returns {Promise}
   */
  hardDelete: async (table, ids) => {
    try {
      const response = await api.delete('/bulk-delete/hard', {
        data: { table, ids }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Restore soft-deleted records
   * @param {string} table - Table name
   * @param {string[]} ids - Array of IDs to restore
   * @returns {Promise}
   */
  restore: async (table, ids) => {
    try {
      const response = await api.post('/bulk-delete/restore', { table, ids });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default bulkDeleteService;
