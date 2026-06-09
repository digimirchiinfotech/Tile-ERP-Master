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

import api from './api.js';

const systemSettingsService = {
  getAllSettings: async () => {
    const response = await api.get('/system-settings');
    return response.data;
  },

  getSettingsByCategory: async (category) => {
    const response = await api.get(`/system-settings/${category}`);
    return response.data;
  },

  updateGeneralSettings: async (settings) => {
    const response = await api.put('/system-settings/general', settings);
    return response.data;
  },

  updateEmailSettings: async (settings) => {
    const response = await api.put('/system-settings/email', settings);
    return response.data;
  },

  updateNotificationSettings: async (settings) => {
    const response = await api.put('/system-settings/notifications', settings);
    return response.data;
  },

  updateSecuritySettings: async (settings) => {
    const response = await api.put('/system-settings/security', settings);
    return response.data;
  },

  updateBackupSettings: async (settings) => {
    const response = await api.put('/system-settings/backup', settings);
    return response.data;
  },

  testEmailConfiguration: async (testEmail) => {
    const response = await api.post('/system-settings/email/test', { testEmail });
    return response.data;
  },

  createBackup: async () => {
    const response = await api.post('/system-settings/backup/create');
    return response.data;
  },

  restoreBackup: async (backupFile) => {
    const response = await api.post('/system-settings/backup/restore', { backupFile });
    return response.data;
  },
  
  listBackups: async () => {
    const response = await api.get('/system-settings/backup/list');
    return response.data;
  },

  downloadBackup: async () => {
    const response = await api.get('/system-settings/backup/download');
    return response.data;
  },

  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post('/system-settings/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  uploadFavicon: async (file) => {
    const formData = new FormData();
    formData.append('favicon', file);
    const response = await api.post('/system-settings/upload/favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default systemSettingsService;
