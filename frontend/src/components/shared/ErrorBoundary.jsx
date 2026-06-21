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

import React from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Professional Error Boundary Component
 * Catches JavaScript errors and displays user-friendly error messages
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // In production, you would send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <Card className="error-card">
            <Card.Body className="text-center p-5">
              <div className="error-icon mb-4">
                <AlertTriangle size={64} className="text-danger" />
              </div>

              <h3 className="text-danger mb-3">Oops! Something went wrong</h3>

              <p className="text-muted mb-4">
                We encountered an unexpected error. Our team has been notified
                and is working to fix this issue.
              </p>

              <div className="error-actions mb-4">
                <Button
                  variant="primary"
                  onClick={this.handleRetry}
                  className="me-3"
                >
                  <RefreshCw size={16} className="me-2" />
                  Try Again
                </Button>

                <Button variant="outline" onClick={this.handleGoHome}>
                  <Home size={16} className="me-2" />
                  Return to Dashboard
                </Button>
              </div>

              {/* Error Details (only in development) */}
              {import.meta.env.DEV && this.state.error && (
                <Alert variant="warning" className="text-start">
                  <Alert.Heading>
                    🔧 Development Debug Information
                  </Alert.Heading>
                  <hr />
                  <p className="mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details>
                      <summary className="cursor-pointer">
                        📋 Component Stack Trace
                      </summary>
                      <pre className="mt-2 small">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>

          <style>{`
            .error-boundary-container {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 2rem;
            }

            .error-card {
              max-width: 600px;
              width: 100%;
              border: none;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            }

            .error-icon {
              animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }

            .error-actions {
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
              gap: 1rem;
            }

            @media (max-width: 576px) {
              .error-boundary-container {
                padding: 1rem;
              }

              .error-card .card-body {
                padding: 2rem 1.5rem;
              }

              .error-actions {
                flex-direction: column;
              }

              .error-actions .btn {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;




