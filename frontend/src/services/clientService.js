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

export const clientService = {
  getAll: async () => {
    return await api.get('/clients');
  },

  getById: async (id) => {
    return await api.get(`/clients/${id}`);
  },

  create: async (data) => {
    return await api.post('/clients', data);
  },

  update: async (id, data) => {
    return await api.put(`/clients/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/clients/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/clients/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/clients/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/clients', { params: { search: query } });
  },

  getByCountry: async (country) => {
    return await api.get('/clients', { params: { country } });
  },
};
