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

import { useState, useEffect, useCallback, useRef } from 'react';
import systemSettingsService from '../services/systemSettingsService.js';
import { tokenManager } from '../utils/tokenManager';

const defaultSettings = {
  general: {
    siteName: 'Business Management System',
    siteDescription: 'Complete ERP solution for business management',
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
    language: 'English',
    logoUrl: null,
    faviconUrl: null
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Business Management System',
    encryption: 'TLS'
  },
  notification: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    systemAlerts: true,
    paymentReminders: true,
    subscriptionAlerts: true
  },
  security: {
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireTwoFactor: false,
    allowPasswordReset: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    backupLocation: 'cloud',
    lastBackup: null
  }
};

export function useSystemSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const hasFetched = useRef(false);

  const fetchSettings = useCallback(async () => {
    try {
      // Only fetch if user is authenticated
      const token = tokenManager.getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const response = await systemSettingsService.getAllSettings();
      if (response.success && response.data) {
        const fetchedData = response.data;
        setSettings(prevSettings => ({
          general: { ...defaultSettings.general, ...fetchedData.general },
          email: { ...defaultSettings.email, ...fetchedData.email },
          notification: { ...defaultSettings.notification, ...fetchedData.notification },
          security: { ...defaultSettings.security, ...fetchedData.security },
          backup: { ...defaultSettings.backup, ...fetchedData.backup }
        }));
        hasFetched.current = true;
      }
    } catch (err) {
      // Ignore 401 errors (user not authenticated yet)
      if (err.response?.status === 401) {
        setLoading(false);
        return;
      }
      console.error('Error fetching system settings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    fetchSettings();
  }, [fetchSettings]);

  const updateGeneralSettings = useCallback(async (generalSettings) => {
    try {
      setLoading(true);
      const response = await systemSettingsService.updateGeneralSettings(generalSettings);
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          general: { ...prev.general, ...response.data }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error updating general settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEmailSettings = useCallback(async (emailSettings) => {
    try {
      setLoading(true);
      const response = await systemSettingsService.updateEmailSettings(emailSettings);
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          email: { ...prev.email, ...response.data }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error updating email settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNotificationSettings = useCallback(async (notificationSettings) => {
    try {
      setLoading(true);
      const response = await systemSettingsService.updateNotificationSettings(notificationSettings);
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          notification: { ...prev.notification, ...response.data }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error updating notification settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSecuritySettings = useCallback(async (securitySettings) => {
    try {
      setLoading(true);
      const response = await systemSettingsService.updateSecuritySettings(securitySettings);
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          security: { ...prev.security, ...response.data }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error updating security settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBackupSettings = useCallback(async (backupSettings) => {
    try {
      setLoading(true);
      const response = await systemSettingsService.updateBackupSettings(backupSettings);
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          backup: { ...prev.backup, ...response.data }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error updating backup settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const testEmailConfiguration = useCallback(async (testEmail) => {
    try {
      const response = await systemSettingsService.testEmailConfiguration(testEmail);
      return response;
    } catch (err) {
      console.error('Error testing email configuration:', err);
      throw err;
    }
  }, []);

  const createBackup = useCallback(async () => {
    try {
      const response = await systemSettingsService.createBackup();
      if (response.success && response.data) {
        setSettings(prev => ({
          ...prev,
          backup: { ...prev.backup, lastBackup: response.data.backupTimestamp }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error creating backup:', err);
      throw err;
    }
  }, []);

  const restoreBackup = useCallback(async (backupFile) => {
    try {
      const response = await systemSettingsService.restoreBackup(backupFile);
      return response;
    } catch (err) {
      console.error('Error restoring backup:', err);
      throw err;
    }
  }, []);

  const downloadBackup = useCallback(async () => {
    try {
      const response = await systemSettingsService.downloadBackup();
      return response;
    } catch (err) {
      console.error('Error downloading backup:', err);
      throw err;
    }
  }, []);

  const listBackups = useCallback(async () => {
    try {
      const response = await systemSettingsService.listBackups();
      return response;
    } catch (err) {
      console.error('Error listing backups:', err);
      throw err;
    }
  }, []);

  const uploadLogo = useCallback(async (file) => {
    try {
      const response = await systemSettingsService.uploadLogo(file);
      if (response.success && response.data) {
        setSettings(prev => ({
          ...prev,
          general: { ...prev.general, logoUrl: response.data.logoUrl }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error uploading logo:', err);
      throw err;
    }
  }, []);

  const uploadFavicon = useCallback(async (file) => {
    try {
      const response = await systemSettingsService.uploadFavicon(file);
      if (response.success && response.data) {
        setSettings(prev => ({
          ...prev,
          general: { ...prev.general, faviconUrl: response.data.faviconUrl }
        }));
      }
      return response;
    } catch (err) {
      console.error('Error uploading favicon:', err);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    settings,
    fetchSettings,
    updateGeneralSettings,
    updateEmailSettings,
    updateNotificationSettings,
    updateSecuritySettings,
    updateBackupSettings,
    testEmailConfiguration,
    createBackup,
    restoreBackup,
    downloadBackup,
    listBackups,
    uploadLogo,
    uploadFavicon
  };
}

export default useSystemSettings;
