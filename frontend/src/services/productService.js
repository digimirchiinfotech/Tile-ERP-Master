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

export const productService = {
  getAll: async () => {
    return await api.get('/products');
  },

  getById: async (id) => {
    return await api.get(`/products/${id}`);
  },

  create: async (data) => {
    return await api.post('/products', data);
  },

  bulkCreate: async (products) => {
    return await api.post('/products/bulk', { products });
  },

  update: async (id, data) => {
    return await api.put(`/products/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/products/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/products/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/products/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/products', { params: { search: query } });
  },

  getByCategory: async (category) => {
    return await api.get('/products', { params: { catalogue: category } });
  },

  getByFactory: async (factory) => {
    return await api.get('/products', { params: { factoryName: factory } });
  },
};
