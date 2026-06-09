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

export const orderService = {
  getAll: async () => {
    return await api.get('/proforma-orders');
  },

  getById: async (id) => {
    return await api.get(`/proforma-orders/${id}`);
  },

  getRevisions: async (id) => {
    return await api.get(`/proforma-orders/${id}/revisions`);
  },

  create: async (data) => {
    return await api.post('/proforma-orders', data);
  },

  update: async (id, data) => {
    return await api.put(`/proforma-orders/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/proforma-orders/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/proforma-orders/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/proforma-orders/${id}/toggle-status`);
  },

  updateStatus: async (id, status) => {
    return await api.patch(`/proforma-orders/${id}/status`, { status });
  },

  search: async (query) => {
    return await api.get('/proforma-orders', { params: { search: query } });
  },

  getBySupplier: async (supplierId) => {
    return await api.get('/proforma-orders', { params: { supplierId } });
  },

  getByInvoice: async (invoiceId) => {
    return await api.get('/proforma-orders', { params: { piReference: invoiceId } });
  },
};
