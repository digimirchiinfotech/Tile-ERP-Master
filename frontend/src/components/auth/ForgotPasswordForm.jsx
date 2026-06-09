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
import { Mail, ArrowLeft, CheckCircle, Send, Check } from 'lucide-react';
import { authAPI } from '../../services/authAPI.js';
import './SimpleLoginForm.css';

function ForgotPasswordForm({ onBack }) {
  const [emailId, setEmailId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!emailId.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authAPI.forgotPassword(emailId);
      setSuccess(true);
      setEmailId('');
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.error || error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-page">
      <div className="login-left-panel">
        <div className="login-form-container">
          {success ? (
            <div className="animation-container">
              <div className="success-icon-container">
                <div className="success-circle">
                  <CheckCircle size={48} />
                </div>
              </div>
              <div className="login-header text-center">
                <h1 className="login-title">Check Your Email</h1>
                <p className="login-subtitle">
                  We've sent password reset instructions to your email address. 
                  Please check your inbox (and spam folder).
                </p>
              </div>
              <button
                type="button"
                className="btn-back"
                onClick={onBack}
              >
                <ArrowLeft size={18} />
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="login-header">
                <h1 className="login-title">Forgot Password?</h1>
                <p className="login-subtitle">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <Alert variant="secondary" className="mb-4">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <div className="input-group-container">
                  <label className="form-label">Email Address</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={20} />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={emailId}
                      onChange={(e) => {
                        setEmailId(e.target.value);
                        setError('');
                      }}
                      className="form-input"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-signin"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Sending Link...
                    </>
                  ) : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  className="btn-back"
                  onClick={onBack}
                  disabled={loading}
                >
                  <ArrowLeft size={18} />
                  Back to Sign In
                </button>
              </Form>
            </>
          )}
        </div>
      </div>

      <div className="login-right-panel">
        <div className="right-panel-content">
          <div className="illustration-container">
            <div className="bg-circle bg-circle-1"></div>
            <div className="bg-circle bg-circle-2"></div>
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

export default ForgotPasswordForm;




