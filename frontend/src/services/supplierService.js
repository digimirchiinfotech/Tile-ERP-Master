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

export const supplierService = {
  getAll: async () => {
    return await api.get('/suppliers');
  },

  getById: async (id) => {
    return await api.get(`/suppliers/${id}`);
  },

  create: async (data) => {
    return await api.post('/suppliers', data);
  },

  update: async (id, data) => {
    return await api.put(`/suppliers/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/suppliers/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/suppliers/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/suppliers/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/suppliers', { params: { search: query } });
  },

  getByCountry: async (country) => {
    return await api.get('/suppliers', { params: { country } });
  },
};
