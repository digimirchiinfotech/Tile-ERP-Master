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

export const packingListService = {
  getAll: async () => {
    return await api.get('/packing-lists');
  },

  getByExportInvoiceId: async (exportInvoiceId) => {
    return await api.get(`/packing-lists/export-invoice/${exportInvoiceId}`);
  },

  savePackingList: async (exportInvoiceId, data) => {
    return await api.post(`/packing-lists/export-invoice/${exportInvoiceId}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/packing-lists/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/packing-lists/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/packing-lists/${id}/toggle-status`);
  },

  getById: async (id) => {
    return await api.get(`/packing-lists/${id}`);
  },

  create: async (data) => {
    return await api.post('/packing-lists', data);
  },

  update: async (id, data) => {
    return await api.put(`/packing-lists/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/packing-lists/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/packing-lists/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/packing-lists/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/packing-lists', { params: { search: query } });
  },

  getByStatus: async (status) => {
    return await api.get('/packing-lists', { params: { status } });
  },
};
