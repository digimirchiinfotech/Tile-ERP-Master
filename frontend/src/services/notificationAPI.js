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

import { tokenManager } from '../utils/tokenManager';

const API_BASE = (import.meta.env.DEV || import.meta.env.MODE === 'development' ? '/api' : 'https://tile-erp-master-production.railway.app/api');

export const notificationAPI = {
  /**
   * Get all notifications for current user
   */
  async getNotifications(filters = {}) {
    const token = tokenManager.getAccessToken();
    const queryParams = new URLSearchParams(filters).toString();
    const companyId = localStorage.getItem('selected_company_id');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    if (companyId) {
      headers['x-company-id'] = companyId;
      headers['x-selected-company-id'] = companyId;
    }
    
    const response = await fetch(
      `${API_BASE}/notifications${queryParams ? '?' + queryParams : ''}`,
      { headers }
    );
    
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    const token = tokenManager.getAccessToken();
    const companyId = localStorage.getItem('selected_company_id');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (companyId) {
      headers['x-company-id'] = companyId;
      headers['x-selected-company-id'] = companyId;
    }
    
    const response = await fetch(
      `${API_BASE}/notifications/${notificationId}/read`,
      {
        method: 'PUT',
        headers
      }
    );
    
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const token = tokenManager.getAccessToken();
    const companyId = localStorage.getItem('selected_company_id');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (companyId) {
      headers['x-company-id'] = companyId;
      headers['x-selected-company-id'] = companyId;
    }
    
    const response = await fetch(
      `${API_BASE}/notifications/mark-all-read`,
      {
        method: 'PUT',
        headers
      }
    );
    
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
    return response.json();
  },

  /**
   * Create in-app notification
   */
  async createNotification(data) {
    const token = tokenManager.getAccessToken();
    const companyId = localStorage.getItem('selected_company_id');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    if (companyId) {
      headers['x-company-id'] = companyId;
      headers['x-selected-company-id'] = companyId;
    }
    
    const response = await fetch(
      `${API_BASE}/notifications`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }
    );
    
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },

  /**
   * Get unread count
   */
  async getUnreadCount() {
    const token = tokenManager.getAccessToken();
    const companyId = localStorage.getItem('selected_company_id');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (companyId) {
      headers['x-company-id'] = companyId;
      headers['x-selected-company-id'] = companyId;
    }
    
    const response = await fetch(
      `${API_BASE}/notifications/count/unread`,
      { headers }
    );
    
    if (!response.ok) throw new Error('Failed to fetch unread count');
    return response.json();
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    const token = tokenManager.getAccessToken();
    const companyId = localStorage.getItem('selected_company_id');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (companyId) {
      headers['x-company-id'] = companyId;
      headers['x-selected-company-id'] = companyId;
    }
    
    const response = await fetch(
      `${API_BASE}/notifications/${notificationId}`,
      {
        method: 'DELETE',
        headers
      }
    );
    
    if (!response.ok) throw new Error('Failed to delete notification');
    return response.json();
  }
};

/**
 * Trigger notifications for common events
 */
export const eventNotifications = {
  orderStatusChanged: async (orderId, newStatus, userId) => {
    await notificationAPI.createNotification({
      userId,
      title: 'Order Status Updated',
      message: `Order #${orderId} status changed to ${newStatus}`,
      type: 'order',
      actionUrl: `/order-dashboard/${orderId}`
    });
  },

  invoiceCreated: async (invoiceId, clientName, userId) => {
    await notificationAPI.createNotification({
      userId,
      title: 'New Invoice Created',
      message: `New invoice for ${clientName} has been created`,
      type: 'invoice',
      actionUrl: `/invoice-management/${invoiceId}`
    });
  },

  qcFailed: async (qcRecordId, productName, userId) => {
    await notificationAPI.createNotification({
      userId,
      title: 'QC Inspection Failed',
      message: `Product ${productName} failed QC inspection`,
      type: 'warning',
      actionUrl: `/qc-management/${qcRecordId}`
    });
  },

  paymentDue: async (invoiceId, dueDate, userId) => {
    await notificationAPI.createNotification({
      userId,
      title: 'Payment Due',
      message: `Payment is due on ${dueDate}`,
      type: 'warning',
      actionUrl: `/invoice-management/${invoiceId}`
    });
  },

  shipmentReady: async (orderId, shipmentDate, userId) => {
    await notificationAPI.createNotification({
      userId,
      title: 'Shipment Ready',
      message: `Order is ready for shipment on ${shipmentDate}`,
      type: 'success',
      actionUrl: `/order-dashboard/${orderId}`
    });
  },

  newMessage: async (senderName, userId) => {
    await notificationAPI.createNotification({
      userId,
      title: 'New Message',
      message: `You have a new message from ${senderName}`,
      type: 'info',
      actionUrl: `/messages`
    });
  },

  systemAlert: async (message, userId) => {
    await notificationAPI.createNotification({
      userId,
      title: 'System Alert',
      message,
      type: 'warning',
      actionUrl: null
    });
  }
};

export default notificationAPI;
