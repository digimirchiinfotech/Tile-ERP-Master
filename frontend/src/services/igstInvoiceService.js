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

export const igstInvoiceService = {
  getAll: async (params = {}) => {
    return await api.get('/export-igst-invoices', { params });
  },

  getStats: async () => {
    return await api.get('/export-igst-invoices/stats');
  },

  getById: async (id) => {
    return await api.get(`/export-igst-invoices/${id}`);
  },

  getByExportInvoice: async (exportInvoiceId) => {
    return await api.get(`/export-igst-invoices/export-invoice/${exportInvoiceId}`);
  },

  createOrUpdate: async (exportInvoiceId, data) => {
    return await api.post(`/export-igst-invoices/export-invoice/${exportInvoiceId}`, data);
  },

  delete: async (exportInvoiceId) => {
    return await api.delete(`/export-igst-invoices/export-invoice/${exportInvoiceId}`);
  },

  deleteById: async (id) => {
    return await api.delete(`/export-igst-invoices/${id}`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/export-igst-invoices/${id}/toggle-status`);
  },

  getNextNumber: async () => {
    return await api.get('/export-igst-invoices/next-number');
  }
};

export default igstInvoiceService;
