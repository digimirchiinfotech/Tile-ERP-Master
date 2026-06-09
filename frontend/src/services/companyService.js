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

export const companyService = {
  getAll: async (page = 1, limit = 50, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    const response = await api.get(`/companies?${params}`);
    return response;
  },

  getById: async (id) => {
    const response = await api.get(`/companies/${id}`);
    return response;
  },

  create: async (data, isNewRegistration = false) => {
    const endpoint = isNewRegistration ? '/companies/register' : '/companies';
    const response = await api.post(endpoint, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(`/companies/${id}`, data);
    return response;
  },

  getModules: async (id) => {
    const response = await api.get(`/companies/${id}/modules`);
    return response;
  },

  updateModules: async (id, enabledModules) => {
    const response = await api.put(`/companies/${id}/modules`, { modules: enabledModules });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(`/companies/${id}`);
    return response;
  },

  hardDelete: async (id) => {
    const response = await api.delete(`/companies/${id}/hard-delete`);
    return response;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/companies/${id}/toggle-status`);
    return response;
  },

  getStats: async () => {
    const response = await api.get('/companies/stats/overview');
    return response;
  },

  getSubscriptions: async () => {
    const response = await api.get('/companies/subscriptions/active');
    return response;
  },
};
