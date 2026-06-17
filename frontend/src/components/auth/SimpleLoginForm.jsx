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
  Alert,
  Spinner,
} from 'react-bootstrap';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';
import { authAPI } from '../../services/authAPI.js';
import { tokenManager } from '../../utils/tokenManager.js';
import { rolePermissions } from '../../config/rolePermissions.js';
import './SimpleLoginForm.css';

function SimpleLoginForm({ onLogin, onShowForgotPassword, onNavigate }) {
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.emailOrUsername.trim() || !formData.password.trim()) {
      setError('Please enter both email/username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = await authAPI.login(formData.emailOrUsername, formData.password);
      const { accessToken, refreshToken, user } = payload || {};

      if (!accessToken || !refreshToken || !user) {
        throw new Error('Invalid response from server: missing authentication tokens');
      }

      tokenManager.setAccessToken(accessToken);
      tokenManager.setRefreshToken(refreshToken);

      // Normalize possible backend naming variations (snake_case, camelCase)
      const normalizedUser = {
        id: user.id,
        username: user.username || user.userName || user.email_id || user.emailId || user.email || formData.emailOrUsername,
        name: user.name || user.fullName || '',
        email: user.email_id || user.emailId || user.email || '',
        role: user.role,
        permissions: user.permissions || user.permisions || [],
        companyId: user.company_id || user.companyId || null,
        companyName: user.company_name || user.companyName || user.company || null,
        lastLogin: user.lastLogin || user.last_login || null,
        enabledModules: user.enabled_modules || user.enabledModules || [],
      };

      const userData = {
        ...normalizedUser,
        token: accessToken,
        refreshToken: refreshToken,
        permissions: rolePermissions[normalizedUser.role] || normalizedUser.permissions || [],
        lastLogin: normalizedUser.lastLogin || new Date().toISOString(),
      };
      
      tokenManager.setUser(userData);
      
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: userData } }));
      onLogin(userData);
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to connect to the server.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-page">
      <div className="login-left-panel">
        <div className="login-form-container">
          <div className="login-header">
            <div className="brand-logo-container">
              <Layers className="brand-icon" size={24} />
            </div>
            <h1 className="login-title">Tile Exporter ERP</h1>
            <p className="login-subtitle">Enterprise Export Management System</p>
          </div>

          {error && (
            <Alert variant="secondary" className="mb-4">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <div className="input-group-container">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="text"
                  placeholder="Email"
                  value={formData.emailOrUsername}
                  onChange={(e) => handleInputChange('emailOrUsername', e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group-container">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="form-input"
                  disabled={loading}
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
            </div>

            <div className="form-footer">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <a 
                  href="#" 
                  className="forgot-link" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (onShowForgotPassword) onShowForgotPassword();
                  }}
                >
                  Forgot Password?
                </a>
                <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '8px' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('terms'); }} style={{ color: '#4b5563', textDecoration: 'none' }}>Terms</a>
                  <span>|</span>
                  <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('privacy'); }} style={{ color: '#4b5563', textDecoration: 'none' }}>Privacy Policy</a>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-signin"
              disabled={loading}
            >
              {loading ? <Spinner size="sm" animation="border" /> : 'Log in'}
            </button>
          </Form>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="right-panel-content">
          <div className="illustration-container">
            <div className="bg-circle bg-circle-1"></div>
            <div className="mockup-card">
              <div className="mockup-header">
                <div className="dot dot-red"></div>
                <div className="dot dot-yellow"></div>
                <div className="dot dot-green"></div>
              </div>
              <div className="mockup-body">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="mockup-row">
                    <div className="mockup-avatar"></div>
                    <div className="mockup-lines">
                      <div className="line line-sm"></div>
                      <div className="line line-md"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="carousel-dots">
            <div className="carousel-dot active"></div>
            <div className="carousel-dot"></div>
            <div className="carousel-dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleLoginForm;




