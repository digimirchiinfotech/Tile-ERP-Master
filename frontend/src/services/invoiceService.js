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
import { tokenManager } from '../utils/tokenManager';

export const invoiceService = {
  getAll: async () => {
    return await api.get('/proforma-invoices');
  },

  getById: async (id) => {
    return await api.get(`/proforma-invoices/${id}`);
  },

  getRevisions: async (id) => {
    return await api.get(`/proforma-invoices/${id}/revisions`);
  },

  create: async (data) => {
    // Ensure company context is provided when creating invoices. If the
    // authenticated user is a super_admin without a selected company, try to
    // auto-select when only one company exists.
    const user = tokenManager.getUser();
    const payload = { ...data };

    if (user?.role === 'super_admin' && !user?.companyId) {
      try {
        const companiesResp = await api.get('/companies', { params: { page: 1, limit: 2 } });
        const companies = companiesResp.data?.data?.data || companiesResp.data?.data || [];
        if (Array.isArray(companies) && companies.length === 1) {
          payload.company_id = companies[0].id;
        }
      } catch (e) {
        // ignore and let backend return validation error if needed
      }
    }

    return await api.post('/proforma-invoices', payload);
  },

  update: async (id, data) => {
    return await api.put(`/proforma-invoices/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/proforma-invoices/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/proforma-invoices/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/proforma-invoices/${id}/toggle-status`);
  },

  updateStatus: async (id, status) => {
    return await api.patch(`/proforma-invoices/${id}/status`, { status });
  },

  approve: async (id, data) => {
    return await api.post(`/proforma-invoices/${id}/approve`, data);
  },

  search: async (query) => {
    return await api.get('/proforma-invoices', { params: { search: query } });
  },

  getByClient: async (clientId) => {
    return await api.get('/proforma-invoices', { params: { clientId } });
  },

  getByStatus: async (status) => {
    return await api.get('/proforma-invoices', { params: { status } });
  },
};
