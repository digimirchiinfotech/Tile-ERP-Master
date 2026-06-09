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

export const workflowService = {
  getByPiNumber: async (piNumber) => {
    return await api.get(`/workflows/pi/${piNumber}`);
  },

  getRelatedDocuments: async (piNumber) => {
    return await api.get(`/workflows/pi/${piNumber}/related`);
  },

  getWorkflowStatus: async (piNumber) => {
    return await api.get(`/workflows/pi/${piNumber}/status`);
  },

  create: async (data) => {
    return await api.post('/workflows', data);
  },

  updateStatus: async (id, data) => {
    return await api.put(`/workflows/${id}`, data);
  },

  updateLinkedStatus: async (data) => {
    return await api.put('/workflows/linked/status', data);
  },

  delete: async (id) => {
    return await api.delete(`/workflows/${id}`);
  },

  hardDelete: async (id) => {
    return await api.delete(`/workflows/${id}/hard-delete`);
  },
};
