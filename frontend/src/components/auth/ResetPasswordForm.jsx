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

import { useState, useEffect } from 'react';
import {
  Form,
  Button,
  Alert,
  Spinner,
  ProgressBar,
} from 'react-bootstrap';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  Shield} from 'lucide-react';
import { authAPI } from '../../services/authAPI.js';
import './SimpleLoginForm.css';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';

function ResetPasswordForm({ emailId, token, onSuccess, onBack }) {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    const checkToken = async () => {
      if (!emailId || !token) {
        setError('Invalid reset link. Please request a new password reset.');
        setLoading(false);
        return;
      }

      try {
        await authAPI.validateResetToken(emailId, token);
        setTokenValid(true);
      } catch (error) {
        console.error('Token validation error:', error);
        setError(error.response?.data?.error || error.message || 'Invalid or expired reset link. Unable to connect to the server.');
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [emailId, token]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
    
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength < 40) return 'danger';
    if (strength < 70) return 'warning';
    return 'success';
  };

  const getPasswordStrengthText = (strength) => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    return 'Strong';
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    
    return '';
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    setError('');
    setValidationError('');
    
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      setValidationError('Please fill in all fields');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');
    setValidationError('');

    try {
      await authAPI.resetPassword(emailId, token, formData.password);
      onSuccess();
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to reset password. Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="split-login-page">
        <div className="login-left-panel">
          <div className="shield-icon">
            <Shield size={64} strokeWidth={1.5} />
          </div>
        </div>
        <div className="login-right-panel">
          <div className="login-form-container text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="split-login-page">
        <div className="login-left-panel">
          <div className="shield-icon">
          </div>
        </div>
        <div className="login-right-panel">
          <div className="login-form-container">
            <div className="login-header">
              <h1 className="login-title">Invalid Reset Link</h1>
              <p className="login-subtitle">{error}</p>
            </div>
            
            <Alert variant="secondary">
              {error}
            </Alert>

            <Button
              variant="primary"
              className="btn-signin w-100"
              onClick={onBack}
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="split-login-page">
      <div className="login-left-panel">
        <div className="shield-icon">
          <Lock size={64} strokeWidth={1.5} />
        </div>
      </div>

      <div className="login-right-panel">
        <div className="login-form-container">
          <div className="login-header">
            <h1 className="login-title">Reset Password</h1>
            <p className="login-subtitle">
              Enter your new password below
            </p>
          </div>

          {error && (
            <Alert variant="secondary" className="mb-3">
              {error}
            </Alert>
          )}

          {validationError && (
            <Alert variant="warning" className="mb-3">
              {validationError}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">New Password</Form.Label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder={FIELD_PLACEHOLDERS.password.placeholder}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="form-input password-input"
                  disabled={submitting}
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
              
              {formData.password && (
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">Password Strength:</small>
                    <small className={`text-${getPasswordStrengthColor(passwordStrength)}`}>
                      {getPasswordStrengthText(passwordStrength)}
                    </small>
                  </div>
                  <ProgressBar 
                    now={passwordStrength} 
                    variant={getPasswordStrengthColor(passwordStrength)}
                    style={{ height: '6px' }}
                  />
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Confirm Password</Form.Label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <Form.Control
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={FIELD_PLACEHOLDERS.password.placeholder}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="form-input password-input"
                  disabled={submitting}
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

            <div className="mb-4">
              <p className="small text-muted mb-2">Password must contain:</p>
              <ul className="small text-muted" style={{ paddingLeft: '20px' }}>
                <li className={formData.password.length >= 8 ? 'text-success' : ''}>
                  At least 8 characters
                  {formData.password.length >= 8 && <CheckCircle size={14} className="ms-1" />}
                </li>
                <li className={/[A-Z]/.test(formData.password) ? 'text-success' : ''}>
                  One uppercase letter
                  {/[A-Z]/.test(formData.password) && <CheckCircle size={14} className="ms-1" />}
                </li>
                <li className={/[a-z]/.test(formData.password) ? 'text-success' : ''}>
                  One lowercase letter
                  {/[a-z]/.test(formData.password) && <CheckCircle size={14} className="ms-1" />}
                </li>
                <li className={/[0-9]/.test(formData.password) ? 'text-success' : ''}>
                  One number
                  {/[0-9]/.test(formData.password) && <CheckCircle size={14} className="ms-1" />}
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              className="btn-signin w-100"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Resetting Password...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight size={20} className="ms-2" />
                </>
              )}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordForm;




