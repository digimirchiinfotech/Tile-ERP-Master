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
import { tokenManager } from '../utils/tokenManager';

/**
 * Role-Based Data Service
 * Fetches and filters data based on user role automatically
 */
export const roleBasedDataService = {
  // Get current user's role
  getCurrentUserRole: () => {
    const user = tokenManager.getUser();
    return user?.role || null;
  },

  // Get data with automatic role-based filtering
  getDataByRole: async (endpoint, options = {}) => {
    try {
      const userRole = roleBasedDataService.getCurrentUserRole();
      const params = {
        ...options,
        role: userRole
      };
      
      const response = await api.get(endpoint, { params });
      return response.data.data || response.data;
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      throw error;
    }
  },

  // Get invoices with role-based filtering
  getInvoicesByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/proforma-invoices', options);
  },

  // Get orders with role-based filtering
  getOrdersByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/proforma-orders', options);
  },

  // Get clients with role-based filtering
  getClientsByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/clients', options);
  },

  // Get leads with role-based filtering
  getLeadsByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/leads', options);
  },

  // Get products with role-based filtering
  getProductsByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/products', options);
  },

  // Get users with role-based filtering
  getUsersByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/users', options);
  },

  // Get QC records with role-based filtering
  getQCRecordsByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/qc-records', options);
  },

  // Get packing lists with role-based filtering
  getPackingListsByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/packing-lists', options);
  },

  // Get suppliers with role-based filtering
  getSuppliersByRole: async (options = {}) => {
    return roleBasedDataService.getDataByRole('/suppliers', options);
  },

  // Get dashboard stats with role-based filtering
  getDashboardStats: async () => {
    try {
      const userRole = roleBasedDataService.getCurrentUserRole();
      const response = await api.get('/dashboard/stats', {
        params: { role: userRole }
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {};
    }
  }
};

export default roleBasedDataService;
