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

export const rateHistoryService = {
  getAll: async (params = {}) => {
    return await api.get('/rate-history', { params });
  },

  saveClientRate: async (clientName, productName, rate, currency = 'INR') => {
    return await api.post('/rate-history/client', {
      client_name: clientName,
      product_name: productName,
      rate,
      currency,
    });
  },

  getClientRate: async (clientName, productName) => {
    return await api.get(`/rate-history/client/${encodeURIComponent(clientName)}/${encodeURIComponent(productName)}`);
  },

  getClientRateHistory: async (clientName, productName, limit = 10) => {
    return await api.get(`/rate-history/client/${encodeURIComponent(clientName)}/${encodeURIComponent(productName)}/history`, {
      params: { limit }
    });
  },

  saveSupplierRate: async (supplierName, productName, rate, currency = 'INR') => {
    return await api.post('/rate-history/supplier', {
      supplier_name: supplierName,
      product_name: productName,
      rate,
      currency,
    });
  },

  getSupplierRate: async (supplierName, productName) => {
    return await api.get(`/rate-history/supplier/${encodeURIComponent(supplierName)}/${encodeURIComponent(productName)}`);
  },

  getSupplierRateHistory: async (supplierName, productName, limit = 10) => {
    return await api.get(`/rate-history/supplier/${encodeURIComponent(supplierName)}/${encodeURIComponent(productName)}/history`, {
      params: { limit }
    });
  },

  delete: async (id) => {
    return await api.delete(`/rate-history/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/rate-history/${id}/hard-delete`);
  },
};
