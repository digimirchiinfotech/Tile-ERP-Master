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

import { useState } from 'react';
import {
  Form,
  Button,
  Alert,
  Spinner,
} from 'react-bootstrap';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  User,
  Phone} from 'lucide-react';
import { authAPI } from '../../services/authAPI.js';
import { tokenManager } from '../../utils/tokenManager.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { 
  validateFullName, 
  validateEmail, 
  validateContactNumber, 
  validatePassword, 
  validateConfirmPassword 
} from '../../utils/validators.js';
import './SimpleLoginForm.css';

function SignupForm({ onSignup, onBackToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    emailId: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const validateForm = () => {
    // Name validation
    const nameValidation = validateFullName(formData.name);
    if (!nameValidation.isValid) {
      setError(nameValidation.error);
      return false;
    }

    // Email validation
    const emailValidation = validateEmail(formData.emailId);
    if (!emailValidation.isValid) {
      setError(emailValidation.error);
      return false;
    }

    // Phone validation
    const phoneValidation = validateContactNumber(formData.contactNumber);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error);
      return false;
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error);
      return false;
    }

    // Confirm password validation
    const confirmPasswordValidation = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );
    if (!confirmPasswordValidation.isValid) {
      setError(confirmPasswordValidation.error);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.register({
        name: formData.name,
        email_id: formData.emailId,
        contact_number: formData.contactNumber,
        password: formData.password,
      });

      const { accessToken, refreshToken, user } = response.data;
      
      tokenManager.setAccessToken(accessToken);
      tokenManager.setRefreshToken(refreshToken);
      
      const userData = {
        id: user.id,
        name: user.name,
        emailId: user.emailId,
        contactNumber: user.contactNumber,
        role: user.role,
        permissions: user.permissions || ['all'],
        token: accessToken,
        refreshToken: refreshToken,
        companyId: user.companyId,
        lastLogin: new Date().toISOString(),
      };

      tokenManager.setUser(userData);
      onSignup(userData);
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.response?.data?.error || error.message || 'Signup failed. Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-page">
      <div className="login-left-panel">
        <div className="shield-icon">
          <Shield size={64} strokeWidth={1.5} />
        </div>
      </div>

      <div className="login-right-panel">
        <div className="login-form-container">
          <div className="login-header">
            <h1 className="login-title">Create Super Admin Account</h1>
            <p className="login-subtitle">Register a new super administrator</p>
          </div>

          {error && (
            <Alert variant="secondary" className="mb-3">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Full Name</Form.Label>
              <div className="input-wrapper">
                <User size={20} className="input-icon" />
                <Form.Control
                  type="text"
                  placeholder={FIELD_PLACEHOLDERS.name.placeholder}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="form-input"
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Email ID</Form.Label>
              <div className="input-wrapper">
                <Mail size={20} className="input-icon" />
                <Form.Control
                  type="email"
                  placeholder={FIELD_PLACEHOLDERS.emailId.placeholder}
                  value={formData.emailId}
                  onChange={(e) => handleInputChange('emailId', e.target.value)}
                  className="form-input"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Contact Number</Form.Label>
              <div className="input-wrapper">
                <Phone size={20} className="input-icon" />
                <Form.Control
                  type="tel"
                  placeholder={FIELD_PLACEHOLDERS.phone.placeholder}
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  className="form-input"
                  disabled={loading}
                  autoComplete="tel"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Password</Form.Label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder={FIELD_PLACEHOLDERS.password.placeholder}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="form-input password-input"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Confirm Password</Form.Label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <Form.Control
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password to confirm"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="form-input password-input"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </Form.Group>

            <Button
              type="submit"
              className="btn-signin"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={20} className="ms-2" />
                </>
              )}
            </Button>
          </Form>

          <div className="divider" style={{ marginTop: '20px' }}>
            <span>Already have an account?</span>
          </div>

          <Button
            variant="outline"
            onClick={onBackToLogin}
            disabled={loading}
            style={{ width: '100%', marginTop: '10px' }}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SignupForm;




