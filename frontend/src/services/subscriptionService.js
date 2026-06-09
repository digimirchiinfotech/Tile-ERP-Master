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

export const subscriptionService = {
  // Plan Management
  getAllPlans: async () => {
    return await api.get('/subscriptions/plans');
  },

  getPlanById: async (id) => {
    return await api.get(`/subscriptions/plans/${id}`);
  },

  createPlan: async (data) => {
    const payload = {
      name: data.name,
      price: parseFloat(data.price) || 0,
      duration: parseInt(data.duration) || 1,
      duration_type: data.durationType,
      max_users: parseInt(data.maxUsers) || 10,
      max_companies: parseInt(data.maxCompanies) || 1,
      status: data.status,
      description: data.description || ''
    };
    return await api.post('/subscriptions/plans', payload);
  },

  updatePlan: async (id, data) => {
    const payload = {
      name: data.name,
      price: parseFloat(data.price) || 0,
      duration: parseInt(data.duration) || 1,
      duration_type: data.durationType,
      max_users: parseInt(data.maxUsers) || 10,
      max_companies: parseInt(data.maxCompanies) || 1,
      status: data.status,
      description: data.description || ''
    };
    return await api.put(`/subscriptions/plans/${id}`, payload);
  },

  deletePlan: async (id) => {
    return await api.delete(`/subscriptions/plans/${id}`);
  },

  togglePlanStatus: async (id) => {
    return await api.patch(`/subscriptions/plans/${id}/toggle-status`);
  },

  // Company Enrollment Management
  getAllCompanySubscriptions: async () => {
    return await api.get('/subscriptions');
  },

  getSubscriptionById: async (id) => {
    return await api.get(`/subscriptions/${id}`);
  },

  createSubscription: async (data) => {
    return await api.post('/subscriptions', data);
  },

  updateSubscription: async (id, data) => {
    return await api.put(`/subscriptions/${id}`, data);
  },

  deleteSubscription: async (id) => {
    return await api.delete(`/subscriptions/${id}`);
  },

  hardDeleteSubscription: async (id) => {
    return await api.delete(`/subscriptions/${id}/hard-delete`);
  },

  renewSubscription: async (id, data = { duration_days: 30 }) => {
    return await api.post(`/subscriptions/${id}/renew`, data);
  },

  // Others
  getTransactions: async () => {
    return await api.get('/subscriptions/transactions');
  },

  getAnalytics: async () => {
    return await api.get('/subscriptions/analytics');
  }
};

export default subscriptionService;
