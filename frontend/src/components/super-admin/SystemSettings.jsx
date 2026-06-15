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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Tab,
  Tabs,
  Spinner,
} from 'react-bootstrap';
import { Save, Upload, Download, Settings, Mail, Bell, Shield, Database, RefreshCw, Activity, Send, Check, HardDrive, LogOut, Monitor } from 'lucide-react';
import { useSystemSettings } from '../../hooks/useSystemSettings.js';
import AuditLogViewer from '../system-settings/AuditLogViewer.jsx';
import ConsistencyChecker from '../system-settings/ConsistencyChecker.jsx';
import StorageMonitoring from '../system-settings/StorageMonitoring.jsx';
import SaaSMonitoring from '../system-settings/SaaSMonitoring.jsx';
import api from '../../services/api.js';

function SystemSettings({ currentUser }) {
  const {
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
    uploadFavicon,
  } = useSystemSettings();

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const navData = JSON.parse(sessionStorage.getItem('navigationData') || '{}');
      return navData.activeTab || 'general';
    } catch (e) {
      return 'general';
    }
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [availableBackups, setAvailableBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');

  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Business Management System',
    siteDescription: 'Complete ERP solution for business management',
    logoUrl: null,
    faviconUrl: null,
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
    language: 'English',
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Business Management System',
    encryption: 'TLS',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    systemAlerts: true,
    paymentReminders: true,
    subscriptionAlerts: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireTwoFactor: false,
    allowPasswordReset: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    otpLogin: false,
    passwordExpiry: 90,
    deviceTracking: true,
    sessionManagement: true,
  });

  const [activeSessions, setActiveSessions] = useState([]);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get('/session/active');
      if (response.data?.success) {
        setActiveSessions(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch active sessions', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  const handleForceLogout = async (sessionId) => {
    try {
      const response = await api.delete(`/session/active/${sessionId}`);
      if (response.data?.success) {
        showNotification('Session forcefully logged out successfully');
        fetchSessions(); // Refresh the list to update status
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to force logout session', 'danger');
    }
  };

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    backupLocation: 'cloud',
    lastBackup: null,
  });

  const fetchBackupList = useCallback(async () => {
    try {
      const response = await listBackups();
      if (response.success) {
        setAvailableBackups(response.data);
        if (response.data.length > 0) {
          setSelectedBackup(response.data[0].fileName);
        }
      }
    } catch (err) {
      console.error('Failed to fetch backup list', err);
    }
  }, [listBackups]);

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackupList();
    }
  }, [activeTab, fetchBackupList]);

  useEffect(() => {
    if (settings) {
      if (settings.general) setGeneralSettings(settings.general);
      if (settings.email) setEmailSettings(settings.email);
      if (settings.notification) setNotificationSettings(settings.notification);
      if (settings.security) setSecuritySettings(settings.security);
      if (settings.backup) setBackupSettings(settings.backup);
    }
  }, [settings]);

  const showNotification = (message, variant = 'success') => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  const handleGeneralSettingsChange = (field, value) => {
    setGeneralSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmailSettingsChange = (field, value) => {
    setEmailSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificationSettingsChange = (field, value) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSecuritySettingsChange = (field, value) => {
    setSecuritySettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBackupSettingsChange = (field, value) => {
    setBackupSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveGeneralSettings = async () => {
    try {
      setSaving(true);
      await updateGeneralSettings(generalSettings);
      showNotification('General settings saved successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to save general settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    try {
      setSaving(true);
      await updateEmailSettings(emailSettings);
      showNotification('Email settings saved successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to save email settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      setSaving(true);
      await updateNotificationSettings(notificationSettings);
      showNotification('Notification settings saved successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to save notification settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    try {
      setSaving(true);
      await updateSecuritySettings(securitySettings);
      showNotification('Security settings saved successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to save security settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBackupSettings = async () => {
    try {
      setSaving(true);
      await updateBackupSettings(backupSettings);
      showNotification('Backup settings saved successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to save backup settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    const targetEmail = testEmailAddress || emailSettings.fromEmail;
    if (!targetEmail) {
      showNotification('Please enter a test email address or configure "From Email"', 'warning');
      return;
    }

    try {
      setTestingEmail(true);
      const response = await testEmailConfiguration(targetEmail);
      showNotification(response.message || 'Email configuration test successful!');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Email configuration test failed', 'danger');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      setCreatingBackup(true);
      await createBackup();
      fetchBackupList();
      showNotification('Backup created successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to create backup', 'danger');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) {
       showNotification('Please select a backup to restore', 'warning');
       return;
    }
    if (!window.confirm(`Are you sure you want to restore from ${selectedBackup}? This will overwrite current data.`)) {
      return;
    }
    try {
      setRestoringBackup(true);
      await restoreBackup(selectedBackup);
      showNotification('Backup restored successfully!');
      fetchSettings(); // Refresh settings after restore
    } catch (err) {
      showNotification(err.message || 'Failed to restore backup', 'danger');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const response = await downloadBackup();
      if (response.success && response.data?.downloadUrl) {
        // Construct full URL if needed, but here it's relative to the backend
        const baseUrl = "https://tile-erp-master-production.railway.app/api" || '';
        const downloadUrl = response.data.downloadUrl.startsWith('http') 
          ? response.data.downloadUrl 
          : `${baseUrl}${response.data.downloadUrl}`;
        
        window.open(downloadUrl, '_blank');
        showNotification('Backup download started!');
      } else {
        showNotification(response.message || 'Failed to generate download link', 'warning');
      }
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Failed to download backup', 'danger');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await uploadLogo(file);
      setGeneralSettings(prev => ({
        ...prev,
        logoUrl: response.data?.logoUrl
      }));
      showNotification('Logo uploaded successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to upload logo', 'danger');
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await uploadFavicon(file);
      setGeneralSettings(prev => ({
        ...prev,
        faviconUrl: response.data?.faviconUrl
      }));
      showNotification('Favicon uploaded successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to upload favicon', 'danger');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading && !settings.general) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden mb-4 bg-primary text-white" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col>
              <h2 className="mb-1 fw-bold text-white">System Configuration</h2>
              <p className="text-white text-opacity-75 mb-0">Configure global system settings and preferences</p>
            </Col>
            <Col xs="auto" className="d-flex gap-2">
              <Button variant="light" className="text-primary fw-bold d-flex align-items-center" onClick={fetchSettings} disabled={loading}>
                <RefreshCw size={16} className={loading ? 'spin me-1' : 'me-1'} />
                <span className="d-none d-sm-inline">Refresh</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {showAlert && (
        <Alert
          variant={alertVariant}
          dismissible
          onClose={() => setShowAlert(false)}
        >
          {alertMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="warning" dismissible>
          {error} - Using default settings
          <Button variant="link" size="sm" onClick={fetchSettings}>
            <RefreshCw size={14} className="me-1" />
            Retry
          </Button>
        </Alert>
      )}

      <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="bg-light border-bottom px-3 pt-2"
            id="system-settings-tabs"
          >
            <Tab
              eventKey="general"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <Settings size={18} />
                  <span>General</span>
                </div>
              }
            >
              <div className="p-4">
              <Row>
                <Col md={8}>
                  <Form>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Site Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={generalSettings.siteName}
                            onChange={(e) =>
                              handleGeneralSettingsChange(
                                'siteName',
                                e.target.value
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Default Currency</Form.Label>
                          <Form.Select
                            value={generalSettings.currency}
                            onChange={(e) =>
                              handleGeneralSettingsChange(
                                'currency',
                                e.target.value
                              )
                            }
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="AED">AED - UAE Dirham</option>
                            <option value="SAR">SAR - Saudi Riyal</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Timezone</Form.Label>
                          <Form.Select
                            value={generalSettings.timezone}
                            onChange={(e) =>
                              handleGeneralSettingsChange(
                                'timezone',
                                e.target.value
                              )
                            }
                          >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time (US)</option>
                            <option value="America/Los_Angeles">Pacific Time (US)</option>
                            <option value="Europe/London">London Time</option>
                            <option value="Europe/Paris">Paris Time</option>
                            <option value="Asia/Kolkata">India Time</option>
                            <option value="Asia/Dubai">Dubai Time</option>
                            <option value="Asia/Singapore">Singapore Time</option>
                            <option value="Asia/Tokyo">Tokyo Time</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Date Format</Form.Label>
                          <Form.Select
                            value={generalSettings.dateFormat}
                            onChange={(e) =>
                              handleGeneralSettingsChange(
                                'dateFormat',
                                e.target.value
                              )
                            }
                          >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="mt-4 pt-3 border-top d-flex gap-2">
                      <Button
                        variant="primary"
                        onClick={handleSaveGeneralSettings}
                        disabled={saving}
                        className="px-4 fw-bold"
                      >
                        {saving ? (
                          <Spinner animation="border" size="sm" className="me-2" />
                        ) : (
                          <Save size={18} className="me-2" />
                        )}
                        Save General Configuration
                      </Button>
                    </div>
                  </Form>
                </Col>
                <Col md={4}>
                  <Card className="border shadow-sm mt-4 mt-md-0">
                    <Card.Header className="bg-light border-bottom">
                      <h6 className="mb-0 fw-bold text-primary">Logo & Branding</h6>
                    </Card.Header>
                    <Card.Body className="p-4 text-center">
                      <div className="logo-preview mb-3">
                        <div className="bg-light border rounded p-4">
                          {generalSettings.logoUrl ? (
                            <img 
                              src={generalSettings.logoUrl} 
                              alt="Logo" 
                              style={{ maxWidth: '100%', maxHeight: '80px' }}
                            />
                          ) : (
                            <Settings size={48} className="text-muted" />
                          )}
                        </div>
                      </div>
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <input
                        type="file"
                        ref={faviconInputRef}
                        onChange={handleFaviconUpload}
                        accept="image/*,.ico"
                        style={{ display: 'none' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="me-2"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <Upload size={14} className="me-1" />
                        Upload Logo
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => faviconInputRef.current?.click()}
                      >
                        <Upload size={14} className="me-1" />
                        Upload Favicon
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          </Tab>

            <Tab
              eventKey="email"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <Mail size={18} />
                  <span>Email</span>
                </div>
              }
            >
              <div className="p-4">
              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>SMTP Host</Form.Label>
                      <Form.Control
                        type="text"
                        value={emailSettings.smtpHost}
                        onChange={(e) =>
                          handleEmailSettingsChange('smtpHost', e.target.value)
                        }
                        placeholder="smtp.gmail.com"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>SMTP Port</Form.Label>
                      <Form.Control
                        type="number"
                        value={emailSettings.smtpPort}
                        onChange={(e) =>
                          handleEmailSettingsChange(
                            'smtpPort',
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>SMTP Username</Form.Label>
                      <Form.Control
                        type="text"
                        value={emailSettings.smtpUsername}
                        onChange={(e) =>
                          handleEmailSettingsChange(
                            'smtpUsername',
                            e.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>SMTP Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={emailSettings.smtpPassword}
                        onChange={(e) =>
                          handleEmailSettingsChange(
                            'smtpPassword',
                            e.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>From Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={emailSettings.fromEmail}
                        onChange={(e) =>
                          handleEmailSettingsChange('fromEmail', e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>From Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={emailSettings.fromName}
                        onChange={(e) =>
                          handleEmailSettingsChange('fromName', e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
                  <div className="mt-4 pt-3 border-top">
                    <Row className="align-items-end">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-muted">Test Recipient Email</Form.Label>
                          <Form.Control
                            type="email"
                            placeholder="recipient@example.com"
                            value={testEmailAddress}
                            onChange={(e) => setTestEmailAddress(e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Button 
                          variant="outline-primary"
                          onClick={handleTestEmail}
                          disabled={testingEmail}
                          className="w-100 fw-bold"
                        >
                          {testingEmail ? (
                            <Spinner animation="border" size="sm" className="me-2" />
                          ) : (
                            <Mail size={18} className="me-2" />
                          )}
                          Send Test Email
                        </Button>
                      </Col>
                    </Row>
                    <Form.Text className="text-muted mt-2 d-block">
                      Ensure you save settings before testing if you've made changes.
                    </Form.Text>
                  </div>
              </Form>
            </div>
          </Tab>

            <Tab
              eventKey="notifications"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <Bell size={18} />
                  <span>Notifications</span>
                </div>
              }
            >
              <div className="p-4">
              <Form>
                <Row>
                  <Col md={6}>
                    <h6>System Notifications</h6>
                    <Form.Check
                      type="switch"
                      id="email-notifications"
                      label="Email Notifications"
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) =>
                        handleNotificationSettingsChange(
                          'emailNotifications',
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                    <Form.Check
                      type="switch"
                      id="sms-notifications"
                      label="SMS Notifications"
                      checked={notificationSettings.smsNotifications}
                      onChange={(e) =>
                        handleNotificationSettingsChange(
                          'smsNotifications',
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                    <Form.Check
                      type="switch"
                      id="push-notifications"
                      label="Push Notifications"
                      checked={notificationSettings.pushNotifications}
                      onChange={(e) =>
                        handleNotificationSettingsChange(
                          'pushNotifications',
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <h6>Alert Types</h6>
                    <Form.Check
                      type="switch"
                      id="system-alerts"
                      label="System Alerts"
                      checked={notificationSettings.systemAlerts}
                      onChange={(e) =>
                        handleNotificationSettingsChange(
                          'systemAlerts',
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                    <Form.Check
                      type="switch"
                      id="payment-reminders"
                      label="Payment Reminders"
                      checked={notificationSettings.paymentReminders}
                      onChange={(e) =>
                        handleNotificationSettingsChange(
                          'paymentReminders',
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                    <Form.Check
                      type="switch"
                      id="subscription-alerts"
                      label="Subscription Alerts"
                      checked={notificationSettings.subscriptionAlerts}
                      onChange={(e) =>
                        handleNotificationSettingsChange(
                          'subscriptionAlerts',
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                </Row>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    onClick={handleSaveNotificationSettings}
                    disabled={saving}
                  >
                    {saving ? (
                      <Spinner animation="border" size="sm" className="me-1" />
                    ) : (
                      <Save size={16} className="me-1" />
                    )}
                    Save Notification Settings
                  </Button>
                </div>
              </Form>
            </div>
          </Tab>

            <Tab
              eventKey="security"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <Shield size={18} />
                  <span>Security</span>
                </div>
              }
            >
              <div className="p-4">
              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Session Timeout (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        min="5"
                        max="480"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) =>
                          handleSecuritySettingsChange(
                            'sessionTimeout',
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Password Minimum Length</Form.Label>
                      <Form.Control
                        type="number"
                        min="6"
                        max="20"
                        value={securitySettings.passwordMinLength}
                        onChange={(e) =>
                          handleSecuritySettingsChange(
                            'passwordMinLength',
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Max Login Attempts</Form.Label>
                      <Form.Control
                        type="number"
                        min="3"
                        max="10"
                        value={securitySettings.maxLoginAttempts}
                        onChange={(e) =>
                          handleSecuritySettingsChange(
                            'maxLoginAttempts',
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Lockout Duration (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        min="5"
                        max="60"
                        value={securitySettings.lockoutDuration}
                        onChange={(e) =>
                          handleSecuritySettingsChange(
                            'lockoutDuration',
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <h6 className="mt-2 mb-3 fw-bold text-primary border-bottom pb-2">Login Security & Options</h6>
                    <Row>
                      <Col md={6}>
                        <Form.Check
                          type="switch"
                          id="require-two-factor"
                          label="Require Two-Factor Authentication (2FA)"
                          checked={securitySettings.requireTwoFactor}
                          onChange={(e) =>
                            handleSecuritySettingsChange(
                              'requireTwoFactor',
                              e.target.checked
                            )
                          }
                          className="mb-3 fw-bold text-dark"
                        />
                        <Form.Check
                          type="switch"
                          id="otp-login"
                          label="Enable OTP Login"
                          checked={securitySettings.otpLogin}
                          onChange={(e) =>
                            handleSecuritySettingsChange(
                              'otpLogin',
                              e.target.checked
                            )
                          }
                          className="mb-3 fw-bold text-dark"
                        />
                        <Form.Check
                          type="switch"
                          id="allow-password-reset"
                          label="Allow Password Reset"
                          checked={securitySettings.allowPasswordReset}
                          onChange={(e) =>
                            handleSecuritySettingsChange(
                              'allowPasswordReset',
                              e.target.checked
                            )
                          }
                          className="mb-3 fw-bold text-dark"
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Check
                          type="switch"
                          id="device-tracking"
                          label="Enable Device Tracking"
                          checked={securitySettings.deviceTracking}
                          onChange={(e) =>
                            handleSecuritySettingsChange(
                              'deviceTracking',
                              e.target.checked
                            )
                          }
                          className="mb-3 fw-bold text-dark"
                        />
                        <Form.Check
                          type="switch"
                          id="session-management"
                          label="Enable Session Management"
                          checked={securitySettings.sessionManagement}
                          onChange={(e) =>
                            handleSecuritySettingsChange(
                              'sessionManagement',
                              e.target.checked
                            )
                          }
                          className="mb-3 fw-bold text-dark"
                        />
                        <Form.Group>
                          <Form.Label className="fw-bold text-dark">Password Expiry (Days)</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            max="365"
                            value={securitySettings.passwordExpiry}
                            onChange={(e) =>
                              handleSecuritySettingsChange(
                                'passwordExpiry',
                                parseInt(e.target.value)
                              )
                            }
                            style={{ maxWidth: '150px' }}
                          />
                          <Form.Text className="text-muted">Set to 0 to disable expiry.</Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Col>
                </Row>
                <div className="mt-4 mb-5">
                  <Button
                    variant="primary"
                    onClick={handleSaveSecuritySettings}
                    disabled={saving}
                    className="fw-bold px-4"
                  >
                    {saving ? (
                      <Spinner animation="border" size="sm" className="me-2" />
                    ) : (
                      <Save size={18} className="me-2" />
                    )}
                    Save Security Settings
                  </Button>
                </div>

                <div className="mt-5">
                  <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Active Sessions & Device Tracking</h5>
                  <div className="table-responsive">
                    <table className="table table-hover border align-middle bg-white shadow-sm rounded">
                      <thead className="bg-light text-muted small">
                        <tr>
                          <th className="border-0 px-3 py-3">LAST LOGIN</th>
                          <th className="border-0 px-3 py-3">DEVICE</th>
                          <th className="border-0 px-3 py-3">BROWSER</th>
                          <th className="border-0 px-3 py-3">IP ADDRESS</th>
                          <th className="border-0 px-3 py-3">LOCATION</th>
                          <th className="border-0 px-3 py-3 text-center">STATUS</th>
                          <th className="border-0 px-3 py-3 text-end">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSessions.map(session => (
                          <tr key={session.id}>
                            <td className="px-3 py-3 fw-medium text-dark">{session.lastLogin || 'N/A'}</td>
                            <td className="px-3 py-3 text-muted">{session.device || 'Unknown'}</td>
                            <td className="px-3 py-3 text-muted">{session.browser || 'Unknown'}</td>
                            <td className="px-3 py-3"><span className="badge bg-light text-dark border font-monospace">{session.ip || 'Unknown'}</span></td>
                            <td className="px-3 py-3 text-muted">{session.location || 'Unknown'}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`badge rounded-pill ${session.status === 'Active' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border border-secondary-subtle'}`}>
                                {session.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-end">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="d-inline-flex align-items-center"
                                onClick={() => handleForceLogout(session.id)}
                                disabled={session.status === 'Inactive'}
                                title={session.status === 'Inactive' ? "Session already inactive" : "Force Logout"}
                              >
                                <LogOut size={14} className="me-1" />
                                Force Logout
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Form>
            </div>
          </Tab>

            <Tab
              eventKey="backup"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <Database size={18} />
                  <span>Backup</span>
                </div>
              }
            >
              <div className="p-4">
              <Row>
                <Col md={6}>
                  <Card className="mb-4">
                    <Card.Header>
                      <h6 className="mb-0">Backup Settings</h6>
                    </Card.Header>
                    <Card.Body>
                      <Form>
                        <Form.Check
                          type="switch"
                          id="auto-backup"
                          label="Enable Auto Backup"
                          checked={backupSettings.autoBackup}
                          onChange={(e) =>
                            handleBackupSettingsChange(
                              'autoBackup',
                              e.target.checked
                            )
                          }
                          className="mb-3"
                        />
                        <Form.Group className="mb-3">
                          <Form.Label>Backup Frequency</Form.Label>
                          <Form.Select
                            value={backupSettings.backupFrequency}
                            onChange={(e) =>
                              handleBackupSettingsChange(
                                'backupFrequency',
                                e.target.value
                              )
                            }
                            disabled={!backupSettings.autoBackup}
                          >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label>Retention Period (days)</Form.Label>
                          <Form.Control
                            type="number"
                            min="7"
                            max="365"
                            value={backupSettings.retentionDays}
                            onChange={(e) =>
                              handleBackupSettingsChange(
                                'retentionDays',
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </Form.Group>
                        <Button
                          variant="primary"
                          onClick={handleSaveBackupSettings}
                          disabled={saving}
                        >
                          {saving ? (
                            <Spinner animation="border" size="sm" className="me-1" />
                          ) : (
                            <Save size={16} className="me-1" />
                          )}
                          Save Backup Settings
                        </Button>
                      </Form>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Backup Actions</h6>
                    </Card.Header>
                    <Card.Body>
                      <div className="mb-3">
                        <small className="text-muted">Last Backup:</small>
                        <div className="fw-medium">
                          {formatDate(backupSettings.lastBackup)}
                        </div>
                      </div>
                        <div className="d-grid gap-2">
                          <Button
                            variant="primary"
                            onClick={handleBackupNow}
                            disabled={creatingBackup}
                            className="fw-bold"
                          >
                            {creatingBackup ? (
                              <Spinner animation="border" size="sm" className="me-2" />
                            ) : (
                              <Database size={18} className="me-2" />
                            )}
                            Create Manual Snapshot
                          </Button>
                        </div>

                        <hr className="my-4" />

                        <Form.Group className="mb-3">
                          <Form.Label className="small fw-bold text-muted">Available Backups</Form.Label>
                          <Form.Select 
                            value={selectedBackup}
                            onChange={(e) => setSelectedBackup(e.target.value)}
                            size="sm"
                          >
                            {availableBackups.length === 0 ? (
                              <option disabled>No backups available</option>
                            ) : (
                              availableBackups.map(b => (
                                <option key={b.fileName} value={b.fileName}>
                                  {b.fileName} ({ (b.size / 1024).toFixed(1) } KB)
                                </option>
                              ))
                            )}
                          </Form.Select>
                        </Form.Group>

                        <div className="d-flex gap-2">
                          <Button
                            variant="warning"
                            onClick={handleRestoreBackup}
                            disabled={restoringBackup || availableBackups.length === 0}
                            className="flex-grow-1 fw-bold"
                          >
                            {restoringBackup ? (
                              <Spinner animation="border" size="sm" className="me-2" />
                            ) : (
                              <Upload size={18} className="me-2" />
                            )}
                            Restore Selected
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={handleDownloadBackup}
                            disabled={availableBackups.length === 0}
                            title="Download Latest"
                          >
                            <Download size={18} />
                          </Button>
                        </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          </Tab>

            <Tab
              eventKey="monitoring"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <Monitor size={18} />
                  <span>Monitoring</span>
                </div>
              }
            >
              <div className="p-4">
                <SaaSMonitoring />
              </div>
            </Tab>

            <Tab
              eventKey="audit"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <Activity size={18} />
                  <span>Audit Logs</span>
                </div>
              }
            >
              <div className="p-4">
                <AuditLogViewer />
              </div>
            </Tab>

            <Tab
              eventKey="consistency"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <RefreshCw size={18} />
                  <span>Consistency</span>
                </div>
              }
            >
              <div className="p-4">
                <ConsistencyChecker />
              </div>
            </Tab>

            <Tab
              eventKey="storage"
              title={
                <div className="d-flex align-items-center gap-2 px-2 py-1">
                  <HardDrive size={18} />
                  <span>Storage Monitoring</span>
                </div>
              }
            >
              <div className="p-4 bg-light rounded-bottom">
                <StorageMonitoring />
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </>
  );
}

export default SystemSettings;
