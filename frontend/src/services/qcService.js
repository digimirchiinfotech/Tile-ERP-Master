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

export const qcService = {
  getAll: async () => {
    return await api.get('/qc-records');
  },

  getById: async (id) => {
    return await api.get(`/qc-records/${id}`);
  },

  create: async (data) => {
    return await api.post('/qc-records', data);
  },

  update: async (id, data) => {
    return await api.put(`/qc-records/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/qc-records/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/qc-records/${id}/hard-delete`);
  },
 
  toggleStatus: async (id) => {
    return await api.patch(`/qc-records/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/qc-records', { params: { search: query } });
  },

  getByOrder: async (orderId) => {
    return await api.get('/qc-records', { params: { orderId } });
  },

  getByStatus: async (status) => {
    return await api.get('/qc-records', { params: { qcStatus: status } });
  },
};
