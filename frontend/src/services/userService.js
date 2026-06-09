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

class UserService {
  async getAllUsers() {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      const validationErrors = error.response?.data?.errors;
      console.error('Error creating user:', errorMessage, validationErrors);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  async hardDeleteUser(id) {
    try {
      const response = await api.delete(`/users/${id}/hard-delete`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Error hard deleting user ${id}:`, error);
      throw error;
    }
  }

  async toggleUserStatus(id) {
    try {
      const response = await api.patch(`/users/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Error toggling user ${id} status:`, error);
      throw error;
    }
  }

  async getSalespersons() {
    try {
      const response = await api.get('/users');
      const responseData = response.data.data || response.data;
      const users = Array.isArray(responseData) ? responseData : [];
      return users.filter(user => 
        ['sales_manager', 'sales_executive'].includes(user.role)
      );
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error('Error fetching salespersons:', error);
      throw error;
    }
  }
}

export default new UserService();
