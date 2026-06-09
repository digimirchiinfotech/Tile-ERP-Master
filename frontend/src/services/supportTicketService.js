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

export const TicketStatus = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  PENDING_USER: 'Pending User',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened'
};

export const TicketPriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

export const TicketCategory = {
  LOGIN_ISSUE: 'Login Issue',
  BILLING: 'Billing',
  TECHNICAL: 'Technical Issue',
  FEATURE_REQUEST: 'Feature Request',
  BUG_REPORT: 'Bug Report',
  ACCOUNT: 'Account Management',
  OTHER: 'Other'
};

export const supportTicketService = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/support-tickets', { params });
      const payload = response.data?.data;
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(response.data)) return response.data;
      return [];
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/support-tickets/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      const response = await api.post('/support-tickets', data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/support-tickets/${id}`, data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/support-tickets/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  },

  hardDelete: async (id) => {
    try {
      const response = await api.delete(`/support-tickets/${id}/hard-delete`);
      return response.data;
    } catch (error) {
      console.error('Error hard deleting ticket:', error);
      throw error;
    }
  },

  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/support-tickets/${id}/toggle-status`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error toggling ticket status:', error);
      throw error;
    }
  },

  addComment: async (ticketId, comment, userName = 'User') => {
    try {
      const response = await api.post(`/support-tickets/${ticketId}/comments`, {
        content: comment,
        author_name: userName
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  updateStatus: async (ticketId, status, comment = null) => {
    try {
      const response = await api.patch(`/support-tickets/${ticketId}/status`, {
        status,
        comment
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  },

  getStats: async () => {
    try {
      const response = await api.get('/support-tickets/stats');
      return response.data?.data || response.data || {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        high: 0,
        critical: 0
      };
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        high: 0,
        critical: 0
      };
    }
  }
};

export default supportTicketService;
