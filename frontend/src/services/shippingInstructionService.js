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

export const shippingInstructionService = {
  getAll: async (params = {}) => {
    return await api.get('/shipping-instructions', { params });
  },

  getById: async (id) => {
    return await api.get(`/shipping-instructions/${id}`);
  },

  // Export-invoice specific endpoints ------------------------------------------------
  getByExportInvoice: async (exportInvoiceId) => {
    return await api.get(`/shipping-instructions/by-export-invoice/${exportInvoiceId}`);
  },

  createByExportInvoice: async (exportInvoiceId, data) => {
    return await api.post(`/shipping-instructions/by-export-invoice/${exportInvoiceId}`, data);
  },

  updateByExportInvoice: async (exportInvoiceId, data) => {
    // existing controller treats POST on this route as create-or-update,
    // so we can reuse the same endpoint.
    return await api.post(`/shipping-instructions/by-export-invoice/${exportInvoiceId}`, data);
  },

  // generic create/update - useful for when there's no invoice context
  create: async (data) => {
    return await api.post('/shipping-instructions', data);
  },

  update: async (id, data) => {
    return await api.put(`/shipping-instructions/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/shipping-instructions/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/shipping-instructions/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/shipping-instructions/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/shipping-instructions', { params: { search: query } });
  },

  getByStatus: async (status) => {
    return await api.get('/shipping-instructions', { params: { status } });
  },
};

export default shippingInstructionService;

