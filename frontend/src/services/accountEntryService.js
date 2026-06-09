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

export const accountEntryService = {
  getAll: async () => {
    return await api.get('/account-entries');
  },

  getById: async (id) => {
    return await api.get(`/account-entries/${id}`);
  },

  create: async (data) => {
    return await api.post('/account-entries', data);
  },

  update: async (id, data) => {
    return await api.put(`/account-entries/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/account-entries/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/account-entries/${id}/hard-delete`);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/account-entries/${id}/toggle-status`);
  },

  search: async (query) => {
    return await api.get('/account-entries', { params: { search: query } });
  },

  getByType: async (type) => {
    return await api.get('/account-entries', { params: { type } });
  },

  getByStatus: async (status) => {
    return await api.get('/account-entries', { params: { status } });
  },

  getInvoicesByPartyName: async (partyName) => {
    return await api.get('/account-entries/invoices/by-party', { params: { partyName } });
  },
  
  getSummary: async () => {
    return await api.get('/account-entries/summary');
  }
};
