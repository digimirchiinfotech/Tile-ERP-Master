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

export const leadService = {
  getAll: async () => {
    return await api.get('/leads');
  },

  getById: async (id) => {
    return await api.get(`/leads/${id}`);
  },

  create: async (data) => {
    return await api.post('/leads', data);
  },

  update: async (id, data) => {
    return await api.put(`/leads/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/leads/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/leads/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/leads/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/leads', { params: { search: query } });
  },

  getByStatus: async (status) => {
    return await api.get('/leads', { params: { status } });
  },

  getByPriority: async (priority) => {
    return await api.get('/leads', { params: { priority } });
  },

  convertToClient: async (id, data = {}) => {
    return await api.post(`/leads/${id}/convert`, data);
  },
};
