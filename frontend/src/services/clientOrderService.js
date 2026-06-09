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

export const clientOrderService = {
  getAll: async () => {
    return await api.get('/client-orders');
  },

  getById: async (id) => {
    return await api.get(`/client-orders/${id}`);
  },

  getByClientId: async (clientId) => {
    return await api.get(`/client-orders/client/${clientId}`);
  },

  create: async (data) => {
    return await api.post('/client-orders', data);
  },

  update: async (id, data) => {
    return await api.put(`/client-orders/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/client-orders/${id}`);
  },

  updateStatus: async (id, status) => {
    return await api.patch(`/client-orders/${id}/status`, { status });
  }
};
