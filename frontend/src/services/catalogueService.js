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

export const catalogueService = {
  getAll: async (params = {}) => {
    return await api.get('/catalogues', { params });
  },

  getById: async (id, includeProducts = true) => {
    return await api.get(`/catalogues/${id}`, { 
      params: { includeProducts: includeProducts.toString() } 
    });
  },

  create: async (data) => {
    // Do NOT manually set Content-Type for FormData.
    // Axios sets it automatically with the correct multipart boundary.
    // If you override it here, the boundary is lost and Multer fails → 400 error.
    return await api.post('/catalogues', data);
  },

  update: async (id, data) => {
    // Same reason: let axios handle Content-Type for FormData automatically.
    return await api.put(`/catalogues/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/catalogues/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/catalogues/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/catalogues/${id}/toggle-status`);
  },

  addProducts: async (catalogueId, products) => {
    return await api.post(`/catalogues/${catalogueId}/products`, { products });
  },

  removeProducts: async (catalogueId, productIds) => {
    return await api.delete(`/catalogues/${catalogueId}/products`, { 
      data: { product_ids: productIds } 
    });
  },

  updateProductInCatalogue: async (catalogueId, productId, data) => {
    return await api.put(`/catalogues/${catalogueId}/products/${productId}`, data);
  },
};
