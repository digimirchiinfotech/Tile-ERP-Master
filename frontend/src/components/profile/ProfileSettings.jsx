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

import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Tab,
  Tabs,
  Badge,
  Spinner,
} from 'react-bootstrap';
import { User, Mail, Phone, Lock, Bell, Shield, Save, Eye, EyeOff, Camera, Building, MapPin, Globe, FileText, CreditCard, ShieldCheck, Upload, RefreshCcw, Image as ImageIcon, Database, Check } from 'lucide-react';
import { resolveImageUrl } from '../../utils/urlHelper';
import { showSuccess, showError } from '../shared/NotificationManager';
import api from '../../services/api';
import { useProfile } from '../../hooks/useProfile';
import { useUserContext } from '../../contexts/UserContext.jsx';
import { transformKeysToSnake } from '../../utils/dataTransformers';
import { formatDateForInput } from '../../utils/formatters';
import BackupSettings from './BackupSettings.jsx';
import DigitalSignature from './DigitalSignature.jsx';
import './ProfileSettings.css';


function ProfileSettings({ currentUser: propCurrentUser, onUpdateProfile, initialTab }) {
  const { profile: fetchedProfile } = useProfile();
  const { updateAvatar } = useUserContext();
  const currentUser = fetchedProfile || propCurrentUser;
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || null);

  // Company Profile State
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [companyErrors, setCompanyErrors] = useState({});
  const companyLogoInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email_id: currentUser?.email_id || currentUser?.email || '',
    contact_number: currentUser?.contact_number || currentUser?.phone || '',
    address: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    systemAlerts: true,
    marketingEmails: false,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: '30',
  });

  useEffect(() => {
    fetchNotificationSettings();
    if (activeTab === 'company' && !company) {
      fetchCompanyData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
      setProfileData(prev => ({
        ...prev,
        name: currentUser.name || '',
        email_id: currentUser.email_id || '',
        contact_number: currentUser.contact_number || '',
        address: currentUser.address || '',
        bio: currentUser.bio || '',
      }));
      // Update avatar URL when current user changes
      if (currentUser.avatar_url) {
        setAvatarUrl(currentUser.avatar_url);
      }
    }
  }, [currentUser]);

  const fetchNotificationSettings = async () => {
    try {
      const response = await api.get('/profile/notification-settings');
      if (response.data.success && response.data.data) {
        // Merge API response with defaults to prevent undefined values
        setNotificationSettings(prev => ({
          ...prev,
          ...response.data.data,
          emailNotifications: response.data.data.emailNotifications ?? true,
          pushNotifications: response.data.data.pushNotifications ?? true,
          smsNotifications: response.data.data.smsNotifications ?? false,
          orderUpdates: response.data.data.orderUpdates ?? true,
          systemAlerts: response.data.data.systemAlerts ?? true,
          marketingEmails: response.data.data.marketingEmails ?? false,
        }));
      }
    } catch (err) {
      // Silently handle error - use default settings
      console.debug('Using default notification settings');
    }
  };

  const handleProfileUpdate = async () => {
    if (!profileData.name || !profileData.email_id) {
      showAlertMessage('Name and email are required!', 'danger');
      return;
    }

    if (profileData.contact_number?.trim()) {
      const phoneRegex = /^\+?[\d\s-]{10,15}$/;
      if (!phoneRegex.test(profileData.contact_number.trim())) {
        showAlertMessage('Enter a valid phone number (10-15 digits)', 'danger');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await api.put(
        '/profile/me',
        {
          name: profileData.name,
          contact_number: profileData.contact_number,
          address: profileData.address,
          bio: profileData.bio,
        }
      );

      if (response.data.success) {
        showAlertMessage('Profile updated successfully!', 'success');
        onUpdateProfile && onUpdateProfile(response.data.data);
      }
    } catch (err) {
      const errorData = err.response?.data;
      let errorMessage = errorData?.message || 'Failed to update profile';
      if (errorData?.errors && errorData.errors.length > 0) {
        errorMessage = `${errorData.message}: ${errorData.errors[0].msg}`;
      }
      showAlertMessage(errorMessage, 'danger');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      showAlertMessage('Please fill in all password fields!', 'danger');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlertMessage('New passwords do not match!', 'danger');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showAlertMessage('New password must be at least 6 characters!', 'danger');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        '/profile/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }
      );

      if (response.data.success) {
        showAlertMessage('Password changed successfully!', 'success');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (err) {
      showAlertMessage(err.response?.data?.message || 'Failed to change password', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.put(
        '/profile/notification-settings',
        notificationSettings
      );

      if (response.data.success) {
        showAlertMessage('Notification settings updated!', 'success');
      }
    } catch (err) {
      showAlertMessage('Failed to update notification settings', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyData = async () => {
    if (!currentUser?.company_id && !currentUser?.companyId) return;
    try {
      setCompanyLoading(true);
      const companyId = currentUser.company_id || currentUser.companyId;
      const response = await api.get(`/companies/${companyId}`);
      if (response.data?.success) {
        setCompany(response.data.data);
        const logoData = response.data.data.logo_url || response.data.data.logoUrl || response.data.data.company_logo;
        if (logoData) {
          setLogoPreview(logoData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-uppercase specific fields
    const uppercaseFields = [
      'gstn', 'pan', 'iecNo', 'swiftCode', 'lutArnNo',
      'name', 'address', 'accountHolderName', 'bankAddress'
    ];
    const finalValue = uppercaseFields.includes(name) ? value.toUpperCase() : value;

    setCompany(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleCompanyLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyUpdate = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!company?.name?.trim()) {
      newErrors.name = 'Company Name is required';
    }

    if (company?.contactNumber?.trim()) {
      const phoneRegex = /^\+?[\d\s-]{10,15}$/;
      if (!phoneRegex.test(company.contactNumber.trim())) {
        newErrors.contactNumber = 'Enter a valid contact number (10-15 digits)';
      }
    }

    if (company?.gstn?.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(company.gstn.trim())) {
        newErrors.gstn = 'Enter a valid 15-character GSTIN (e.g., 22AAAAA0000A1Z5)';
      }
    }

    if (company?.pan?.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
      if (!panRegex.test(company.pan.trim())) {
        newErrors.pan = 'Enter a valid 10-character PAN (e.g., ABCDE1234F)';
      }
    }

    if (company?.iecNo?.trim()) {
      const iecRegex = /^[A-Z0-9]{10}$/i;
      if (!iecRegex.test(company.iecNo.trim())) {
        newErrors.iecNo = 'Enter a valid 10-character IEC Code';
      }
    }

    if (company?.accountNumber?.trim()) {
      const accRegex = /^\d{9,18}$/;
      if (!accRegex.test(company.accountNumber.trim())) {
        newErrors.accountNumber = 'Account number must be 9-18 digits';
      }
    }

    if (company?.swiftCode?.trim()) {
      const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;
      if (!swiftRegex.test(company.swiftCode.trim())) {
        newErrors.swiftCode = 'Enter a valid 8 or 11 character SWIFT Code';
      }
    }

    setCompanyErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const failedFields = Object.keys(newErrors).map(k => newErrors[k]).join(' | ');
      showAlertMessage(`Validation failed: ${failedFields}`, 'danger');
      return;
    }

    try {
      setCompanySaving(true);
      const companyId = currentUser.company_id || currentUser.companyId;

      const formData = new FormData();

      // Convert company object to snake_case for backend compatibility
      const snakeCompany = transformKeysToSnake(company);

      Object.keys(snakeCompany).forEach(key => {
        if (snakeCompany[key] !== null && snakeCompany[key] !== undefined) {
          if (key === 'settings') {
            formData.append(key, JSON.stringify(snakeCompany[key]));
          } else {
            formData.append(key, snakeCompany[key]);
          }
        }
      });

      if (companyLogoInputRef.current?.files[0]) {
        formData.append('logo', companyLogoInputRef.current.files[0]);
      }

      const response = await api.put(`/companies/${companyId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.success) {
        showAlertMessage('Company profile updated successfully!', 'success');
        fetchCompanyData();
      }
    } catch (error) {
      const errorData = error.response?.data;
      let errorMessage = errorData?.message || 'Failed to update company profile';
      if (errorData?.errors && errorData.errors.length > 0) {
        errorMessage = `${errorData.message}: ${errorData.errors[0].msg}`;
      }
      showAlertMessage(errorMessage, 'danger');
    } finally {
      setCompanySaving(false);
    }
  };

  const handleSecurityUpdate = () => {
    showAlertMessage('Security settings updated!', 'success');
  };

  const showAlertMessage = (message, type = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlertMessage('Please upload an image file', 'danger');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showAlertMessage('File size must be less than 5MB', 'danger');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/profile/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const newAvatarUrl = response.data.data.avatar_url;
        setAvatarUrl(newAvatarUrl);
        updateAvatar(newAvatarUrl);
        showAlertMessage('Profile photo updated successfully!', 'success');
        if (onUpdateProfile) {
          onUpdateProfile({ avatar_url: newAvatarUrl });
        }
      }
    } catch (err) {
      showAlertMessage(err.response?.data?.message || 'Failed to upload photo', 'danger');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      super_admin: 'Super Admin',
      company_admin: 'Company Admin',
      admin: 'Admin',
      sales_manager: 'Sales Manager',
      sales_executive: 'Sales Executive',
      administration: 'Administration',
      qc: 'QC Manager',
      qc_inspector: 'QC Inspector',
      account: 'Account Manager',
      client: 'Client',
      purchase_manager: 'Purchase Manager',
    };
    return roleNames[role] || role;
  };

  return (
    <>
      <Container fluid className="profile-settings">
        <Card className="border-0 shadow-sm overflow-hidden mb-4 bg-primary text-white" style={{ borderRadius: '16px' }}>
          <Card.Body className="p-4">
            <Row className="align-items-center">
              <Col>
                <h2 className="mb-1 fw-bold text-white">Profile Settings</h2>
                <p className="text-white text-opacity-75 mb-0">Manage your account settings and preferences</p>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {showAlert && (
          <Alert
            variant={alertType}
            dismissible
            onClose={() => setShowAlert(false)}
            className="mb-4"
          >
            {alertMessage}
          </Alert>
        )}
        <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
          <Card.Body>
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
              {/* Profile Tab */}
              <Tab
                eventKey="profile"
                title={<span><User size={16} className="me-1" />Profile</span>}
              >
                <Row>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <div className="profile-avatar-section">
                          <div className="profile-avatar">
                            {avatarUrl ? (
                              <img
                                src={resolveImageUrl(avatarUrl)}
                                alt="User Avatar"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <User size={48} />
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            style={{ display: 'none' }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <Camera size={16} className="me-1" />
                            {uploading ? 'Uploading...' : 'Change Photo'}
                          </Button>
                        </div>
                        <div className="mt-4">
                          <Badge bg="success" className="mb-2">Active</Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={8}>
                    <Form>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Full Name *</Form.Label>
                            <Form.Control
                              type="text"
                              value={(profileData.name ?? '').toUpperCase()}
                              onChange={(e) => setProfileData({ ...profileData, name: e.target.value.toUpperCase() })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Email Address *</Form.Label>
                            <Form.Control
                              type="email"
                              value={profileData.email_id ?? ''}
                              readOnly
                              className="bg-light"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Mobile Number</Form.Label>
                            <Form.Control
                              type="tel"
                              value={profileData.contact_number ?? ''}
                              onInput={(e) => {
                                e.target.value = e.target.value.replace(/[^0-9+]/g, '');
                              }}
                              onChange={(e) => setProfileData({ ...profileData, contact_number: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Role</Form.Label>
                            <Form.Control
                              type="text"
                              value={getRoleDisplayName(currentUser?.role)}
                              readOnly
                              className="bg-light"
                            />
                          </Form.Group>
                        </Col>

                      </Row>
                      <div className="mt-4">
                        <Button
                          variant="primary"
                          onClick={handleProfileUpdate}
                          disabled={loading}
                        >
                          {loading ? <Spinner size="sm" className="me-2" /> : <Save size={16} className="me-1" />}
                          Save Changes
                        </Button>
                      </div>
                    </Form>
                  </Col>
                </Row>
              </Tab>

              {/* Security Tab */}
              <Tab
                eventKey="security"
                title={<span><Lock size={16} className="me-1" />Security</span>}
              >
                <div className="py-2">
                  <Row className="g-4">
                    <Col md={6}>
                      <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                            <div className="p-2 rounded me-3" style={{ backgroundColor: '#eff6ff' }}>
                              <Lock size={20} className="text-primary" />
                            </div>
                            <div>
                              <h6 className="mb-0 fw-bold">Change Password</h6>
                              <small className="text-muted">Update your account password</small>
                            </div>
                          </div>
                          
                          <Form>
                            <Form.Group className="mb-4">
                              <Form.Label className="small fw-semibold text-muted mb-1">Current Password</Form.Label>
                              <div className="position-relative">
                                <Form.Control
                                  type={showCurrentPassword ? 'text' : 'password'}
                                  value={passwordData.currentPassword ?? ''}
                                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                  className="bg-light border-0 py-2"
                                  placeholder="Enter current password"
                                />
                                <Button
                                  variant="link"
                                  className="position-absolute top-50 end-0 translate-middle-y me-1 p-1 text-muted border-0 shadow-none"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </Button>
                              </div>
                            </Form.Group>
                            
                            <Form.Group className="mb-4">
                              <Form.Label className="small fw-semibold text-muted mb-1">New Password</Form.Label>
                              <div className="position-relative">
                                <Form.Control
                                  type={showNewPassword ? 'text' : 'password'}
                                  value={passwordData.newPassword ?? ''}
                                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                  className="bg-light border-0 py-2"
                                  placeholder="Enter new password"
                                />
                                <Button
                                  variant="link"
                                  className="position-absolute top-50 end-0 translate-middle-y me-1 p-1 text-muted border-0 shadow-none"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </Button>
                              </div>
                            </Form.Group>
                            
                            <Form.Group className="mb-4">
                              <Form.Label className="small fw-semibold text-muted mb-1">Confirm New Password</Form.Label>
                              <div className="position-relative">
                                <Form.Control
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  value={passwordData.confirmPassword ?? ''}
                                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                  className="bg-light border-0 py-2"
                                  placeholder="Confirm new password"
                                  isInvalid={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                                  isValid={passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword}
                                />
                                <Button
                                  variant="link"
                                  className="position-absolute top-50 end-0 translate-middle-y me-1 p-1 text-muted border-0 shadow-none"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </Button>
                              </div>
                              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                <div className="text-danger small mt-1 fw-semibold">Passwords do not match</div>
                              )}
                              {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                                <div className="text-success small mt-1 fw-semibold">Passwords match</div>
                              )}
                            </Form.Group>
                            
                            <Button
                              variant="primary"
                              onClick={handlePasswordChange}
                              disabled={loading}
                              className="w-100 py-2 mt-2 fw-semibold"
                              style={{ borderRadius: '8px' }}
                            >
                              {loading ? <Spinner size="sm" className="me-2" /> : <Lock size={16} className="me-2" />}
                              Update Password
                            </Button>
                          </Form>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={6}>
                      <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                            <div className="p-2 rounded me-3" style={{ backgroundColor: '#eff6ff' }}>
                              <Shield size={20} className="text-primary" />
                            </div>
                            <div>
                              <h6 className="mb-0 fw-bold">Security Settings</h6>
                              <small className="text-muted">Manage additional security features</small>
                            </div>
                          </div>
                          
                          <Form>
                            <div className="p-3 bg-light rounded mb-3 d-flex align-items-center justify-content-between">
                              <div>
                                <h6 className="mb-1 fw-semibold">Two-Factor Authentication</h6>
                                <small className="text-muted">Add an extra layer of security to your account</small>
                              </div>
                              <Form.Check
                                type="switch"
                                id="two-factor"
                                checked={securitySettings.twoFactorAuth ?? false}
                                onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                                className="fs-5 m-0"
                              />
                            </div>
                            
                            <div className="p-3 bg-light rounded mb-4 d-flex align-items-center justify-content-between">
                              <div>
                                <h6 className="mb-1 fw-semibold">Login Alerts</h6>
                                <small className="text-muted">Get notified of new logins on unknown devices</small>
                              </div>
                              <Form.Check
                                type="switch"
                                id="login-alerts"
                                checked={securitySettings.loginAlerts ?? true}
                                onChange={(e) => setSecuritySettings({ ...securitySettings, loginAlerts: e.target.checked })}
                                className="fs-5 m-0"
                              />
                            </div>
                            
                            <Form.Group className="mb-4">
                              <Form.Label className="small fw-semibold text-muted mb-2">Session Timeout Duration</Form.Label>
                              <Form.Select
                                value={securitySettings.sessionTimeout ?? '30'}
                                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                                className="bg-light border-0 py-2"
                              >
                                <option value="15">15 minutes of inactivity</option>
                                <option value="30">30 minutes of inactivity</option>
                                <option value="60">1 hour of inactivity</option>
                                <option value="120">2 hours of inactivity</option>
                              </Form.Select>
                            </Form.Group>
                            
                            <Button 
                              variant="outline-primary" 
                              onClick={handleSecurityUpdate}
                              className="w-100 py-2 mt-4 fw-semibold"
                              style={{ borderRadius: '8px' }}
                            >
                              <Shield size={16} className="me-2" />
                              Save Security Preferences
                            </Button>
                          </Form>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </div>
              </Tab>

              {/* Notifications Tab */}
              <Tab
                eventKey="notifications"
                title={<span><Bell size={16} className="me-1" />Notifications</span>}
              >
                <Card>
                  <Card.Header><h6 className="mb-0">Notification Preferences</h6></Card.Header>
                  <Card.Body>
                    <Form>
                      <Row>
                        <Col md={6}>
                          <h6>Communication</h6>
                          <Form.Check
                            type="switch"
                            id="email-notifications"
                            label="Email Notifications"
                            checked={notificationSettings.emailNotifications ?? true}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                            className="mb-3"
                          />
                          <Form.Check
                            type="switch"
                            id="push-notifications"
                            label="Push Notifications"
                            checked={notificationSettings.pushNotifications ?? true}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
                            className="mb-3"
                          />
                          <Form.Check
                            type="switch"
                            id="sms-notifications"
                            label="SMS Notifications"
                            checked={notificationSettings.smsNotifications ?? false}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
                            className="mb-3"
                          />
                        </Col>
                        <Col md={6}>
                          <h6>Content</h6>
                          <Form.Check
                            type="switch"
                            id="order-updates"
                            label="Order Updates"
                            checked={notificationSettings.orderUpdates}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, orderUpdates: e.target.checked })}
                            className="mb-3"
                          />
                          <Form.Check
                            type="switch"
                            id="system-alerts"
                            label="System Alerts"
                            checked={notificationSettings.systemAlerts}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, systemAlerts: e.target.checked })}
                            className="mb-3"
                          />
                          <Form.Check
                            type="switch"
                            id="marketing-emails"
                            label="Marketing Emails"
                            checked={notificationSettings.marketingEmails}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, marketingEmails: e.target.checked })}
                            className="mb-3"
                          />
                        </Col>
                      </Row>
                      <Button
                        variant="primary"
                        onClick={handleNotificationUpdate}
                        disabled={loading}
                      >
                        {loading ? <Spinner size="sm" className="me-2" /> : <Bell size={16} className="me-1" />}
                        Save Preferences
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Tab>

              {/* Company Profile Tab (Only for Admins) */}
              {(currentUser?.role === 'super_admin' || currentUser?.role === 'company_admin') && (
                <Tab
                  eventKey="company"
                  title={<span><Building size={16} className="me-1" />Company</span>}
                >
                  {companyLoading ? (
                    <div className="text-center p-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="mt-2">Loading company data...</p>
                    </div>
                  ) : company ? (
                    <Form onSubmit={handleCompanyUpdate}>
                      <Row>
                        <Col lg={4}>
                          <Card className="border-0 shadow-sm mb-4 bg-light">
                            <Card.Body className="text-center">
                              <h6 className="fw-bold mb-3 d-flex align-items-center justify-content-center gap-2">
                                <ImageIcon size={18} /> Branding
                              </h6>
                              <div
                                className="company-logo-preview mx-auto mb-3 border rounded overflow-hidden bg-white d-flex align-items-center justify-content-center"
                                style={{ width: '120px', height: '120px', cursor: 'pointer', position: 'relative' }}
                                onClick={() => companyLogoInputRef.current?.click()}
                              >
                                {logoPreview || company?.logoUrl || company?.logo_url || company?.company_logo ? (
                                  <img
                                    src={resolveImageUrl(logoPreview || company?.logoUrl || company?.logo_url || company?.company_logo)}
                                    alt="Logo Preview"
                                    className="img-thumbnail"
                                    style={{ maxHeight: '100px' }}
                                  />
                                ) : <Upload size={32} className="text-muted" />}
                              </div>
                              <input
                                type="file"
                                ref={companyLogoInputRef}
                                className="d-none"
                                accept="image/*"
                                onChange={handleCompanyLogoChange}
                              />
                              <Button size="sm" variant="outline-primary" onClick={() => companyLogoInputRef.current?.click()}>
                                <Upload size={14} className="me-1" /> Change Logo
                              </Button>
                            </Card.Body>
                          </Card>

                          <Card className="border-0 shadow-sm bg-light">
                            <Card.Body>
                              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                <ShieldCheck size={18} /> Tax & Legal
                              </h6>
                              <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">GSTIN</Form.Label>
                                <Form.Control size="sm" name="gstn" value={company.gstn || ''} onChange={handleCompanyChange} isInvalid={!!companyErrors.gstn} />
                                <Form.Control.Feedback type="invalid">{companyErrors.gstn}</Form.Control.Feedback>
                              </Form.Group>
                              <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">PAN</Form.Label>
                                <Form.Control size="sm" name="pan" value={company.pan || ''} onChange={handleCompanyChange} isInvalid={!!companyErrors.pan} />
                                <Form.Control.Feedback type="invalid">{companyErrors.pan}</Form.Control.Feedback>
                              </Form.Group>
                              <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">IEC Code</Form.Label>
                                <Form.Control size="sm" name="iecNo" value={company.iecNo || ''} onChange={handleCompanyChange} isInvalid={!!companyErrors.iecNo} />
                                <Form.Control.Feedback type="invalid">{companyErrors.iecNo}</Form.Control.Feedback>
                              </Form.Group>
                            </Card.Body>
                          </Card>

                          <Card className="border-0 shadow-sm bg-light mt-4">
                            <Card.Body>
                              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                <FileText size={18} /> Exporter & LUT
                              </h6>
                              <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">LUT ARN / BOND NO.</Form.Label>
                                <Form.Control size="sm" name="lutArnNo" value={company.lutArnNo || ''} onChange={handleCompanyChange} />
                              </Form.Group>
                              <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">LUT Date</Form.Label>
                                <Form.Control size="sm" type="date" name="lutDate" value={formatDateForInput(company.lutDate)} onChange={handleCompanyChange} />
                              </Form.Group>
                            </Card.Body>
                          </Card>
                        </Col>

                        <Col lg={8}>
                          <Card className="border-0 shadow-sm mb-4">
                            <Card.Body>
                              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-primary">
                                <MapPin size={18} /> General Information
                              </h6>
                              <Row className="g-3">
                                <Col sm={6}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">Company Name</Form.Label>
                                    <Form.Control name="name" value={company.name || ''} onChange={handleCompanyChange} required isInvalid={!!companyErrors.name} />
                                    <Form.Control.Feedback type="invalid">{companyErrors.name}</Form.Control.Feedback>
                                  </Form.Group>
                                </Col>
                                <Col sm={6}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">Mobile Number</Form.Label>
                                    <Form.Control 
                                      name="contactNumber" 
                                      value={company.contactNumber || ''} 
                                      onInput={(e) => { e.target.value = e.target.value.replace(/[^0-9+]/g, ''); }}
                                      onChange={handleCompanyChange} 
                                      isInvalid={!!companyErrors.contactNumber} 
                                    />
                                    <Form.Control.Feedback type="invalid">{companyErrors.contactNumber}</Form.Control.Feedback>
                                  </Form.Group>
                                </Col>
                                <Col sm={12}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">Address</Form.Label>
                                    <Form.Control as="textarea" rows={2} name="address" value={company.address || ''} onChange={handleCompanyChange} />
                                  </Form.Group>
                                </Col>
                              </Row>

                              <h6 className="fw-bold mt-4 mb-3 d-flex align-items-center gap-2 text-primary">
                                <CreditCard size={18} /> Banking Details
                              </h6>
                              <Row className="g-3">
                                <Col sm={6}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">Bank Name</Form.Label>
                                    <Form.Control name="bankName" value={company.bankName || ''} onChange={handleCompanyChange} />
                                  </Form.Group>
                                </Col>
                                <Col sm={6}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">Account Name</Form.Label>
                                    <Form.Control name="accountHolderName" value={company.accountHolderName || ''} onChange={handleCompanyChange} />
                                  </Form.Group>
                                </Col>
                                <Col sm={6}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">Account Number</Form.Label>
                                    <Form.Control 
                                      name="accountNumber" 
                                      value={company.accountNumber || ''} 
                                      onInput={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); }}
                                      onChange={handleCompanyChange} 
                                      isInvalid={!!companyErrors.accountNumber} 
                                    />
                                    <Form.Control.Feedback type="invalid">{companyErrors.accountNumber}</Form.Control.Feedback>
                                  </Form.Group>
                                </Col>
                                <Col sm={6}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">SWIFT Code</Form.Label>
                                    <Form.Control name="swiftCode" placeholder="SWIFT Code" value={company.swiftCode || ''} onChange={handleCompanyChange} isInvalid={!!companyErrors.swiftCode} />
                                    <Form.Control.Feedback type="invalid">{companyErrors.swiftCode}</Form.Control.Feedback>
                                  </Form.Group>
                                </Col>
                                <Col sm={12}>
                                  <Form.Group>
                                    <Form.Label className="small fw-bold">Bank Address</Form.Label>
                                    <Form.Control as="textarea" rows={2} name="bankAddress" placeholder="Enter Bank Address" value={company.bankAddress || ''} onChange={handleCompanyChange} />
                                  </Form.Group>
                                </Col>
                              </Row>

                              <div className="mt-4 pt-3 border-top">
                                <DigitalSignature currentUser={currentUser} />
                              </div>


                              <div className="mt-4 pt-3 border-top d-flex justify-content-end">
                                <Button variant="primary" type="submit" disabled={companySaving}>
                                  {companySaving ? <Spinner size="sm" className="me-2" /> : <Save size={16} className="me-1" />}
                                  Update Company Profile
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </Form>
                  ) : (
                    <Alert variant="warning">No company profile found for your account.</Alert>
                  )}
                </Tab>
              )}

              {/* System Backups Tab (Only for Super Admins) */}
              {(currentUser?.role === 'super_admin') && (
                <Tab
                  eventKey="backups"
                  title={<span><Database size={16} className="me-1" />System Backups</span>}
                >
                  <BackupSettings />
                </Tab>
              )}
            </Tabs>
          </Card.Body>
        </Card>

        <style>{`
        .profile-avatar {
          width: 120px;
          height: 120px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto;
        }
        .profile-avatar-section { padding: 1rem 0; }
        .company-logo-preview {
          transition: all 0.2s ease-in-out;
          border: 2px dashed #e2e8f0 !important;
        }
        .company-logo-preview:hover {
          border-color: #3b82f6 !important;
          background-color: #f8fafc !important;
        }
      `}</style>
      </Container>
    </>
  );
}

export default ProfileSettings;




