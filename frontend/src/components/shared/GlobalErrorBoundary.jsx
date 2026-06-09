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
import { Alert, Container, Button } from 'react-bootstrap';
import { AlertCircle, RefreshCw } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error natively (could hook into Sentry/DataDog here)
    console.error("💥 Uncaught UI Error caught by GlobalErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    // Hard refresh to clear corrupted react state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="d-flex flex-column align-items-center justify-content-center min-vh-100 p-4">
          <div className="text-center" style={{ maxWidth: '800px' }}>
            <AlertCircle size={80} className="text-danger mb-4" />
            <h1 className="mb-3">Oops! Something went wrong.</h1>
            <p className="text-muted mb-4 fs-5">
              The application encountered an unexpected error while rendering this page.
              We apologize for the inconvenience.
            </p>
            
            {/* Show stack trace in development mode for easier debugging */}
            {(import.meta.env?.MODE === 'development' || !import.meta.env?.PROD) && this.state.error && (
              <Alert variant="danger" className="text-start overflow-auto mb-4" style={{ maxHeight: '400px' }}>
                <h6 className="fw-bold">{this.state.error.toString()}</h6>
                <pre className="small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </Alert>
            )}

            <Button onClick={this.handleReset} variant="primary" size="lg" className="d-inline-flex align-items-center">
              <RefreshCw size={20} className="me-2" />
              Reload Application
            </Button>
          </div>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
