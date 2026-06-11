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

import { Card, Button } from 'react-bootstrap';
import { Shield, ArrowLeft, HelpCircle } from 'lucide-react';

/**
 * Professional Access Denied Component
 * Provides consistent access restriction messaging across the application
 */
function AccessDenied({
  module = 'this module',
  requiredRole = 'appropriate permissions',
  currentRole = 'Unknown',
  onBack = null,
  showHelp = true,
}) {
  const getRoleDisplayName = (role) => {
    const roleNames = {
      super_admin: 'Super Administrator',
      company_admin: 'Company Administrator',
      sales_manager: 'Sales Manager',
      sales_executive: 'Sales Executive',
      administration: 'Administration',
      qc: 'QC Manager',
      account: 'Account Manager',
      client: 'Client User',
      purchase: 'Purchase Manager',
    };
    return roleNames[role] || role?.replace('_', ' ').toUpperCase();
  };

  const getModuleIcon = (moduleName) => {
    const icons = {
      'Tile Product': '📦',
      'User Management': '👥',
      'QC Management': '🔍',
      'Packing List Management': '📋',
      'Account Management': '💰',
      'Lead Management': '🎯',
      'Client Management': '🤝',
      'Catalogue Management': '📚',
      'Pallet Management': '🚛',
    };
    return icons[moduleName] || '🔒';
  };

  return (
    <div className="access-denied-page">
      <Card className="access-denied-card">
        <Card.Body className="text-center p-5">
          <div className="access-denied-icon mb-4">
            <Shield size={64} className="text-warning" />
          </div>

          <h3 className="text-warning mb-3">
            {getModuleIcon(module)} Access Restricted
          </h3>

          <p className="text-muted mb-4 lead">
            You don't have permission to access <strong>{module}</strong>
          </p>

          <div className="access-info mb-4">
            <div className="info-card">
              <h6 className="text-primary mb-2">Current Access Level</h6>
              <span className="badge bg-secondary p-2">
                {getRoleDisplayName(currentRole)}
              </span>
            </div>

            <div className="info-card mt-3">
              <h6 className="text-success mb-2">Required Access Level</h6>
              <span className="badge bg-success p-2">
                {requiredRole}
              </span>
            </div>
          </div>

          <div className="access-actions">
            {onBack && (
              <Button variant="primary" onClick={onBack} className="me-3">
                <ArrowLeft size={16} className="me-2" />
                Go Back
              </Button>
            )}

            {showHelp && (
              <Button variant="outline-secondary">
                <HelpCircle size={16} className="me-2" />
                Contact Administrator
              </Button>
            )}
          </div>

          <div className="access-help mt-4">
            <small className="text-muted">
              Need access to this module? Contact your system administrator or
              company admin to request appropriate permissions.
            </small>
          </div>
        </Card.Body>
      </Card>

      <style>{`
        .access-denied-page {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .access-denied-card {
          max-width: 500px;
          width: 100%;
          border: none;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border-left: 5px solid #ffc107;
        }

        .access-denied-icon {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        .info-card {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 1rem;
          border: 1px solid #e9ecef;
        }

        .access-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .access-help {
          background: rgba(13, 110, 253, 0.1);
          border-radius: 10px;
          padding: 1rem;
          border: 1px solid rgba(13, 110, 253, 0.2);
        }

        @media (max-width: 576px) {
          .access-denied-page {
            padding: 1rem;
          }

          .access-denied-card .card-body {
            padding: 2rem 1.5rem;
          }

          .access-actions {
            flex-direction: column;
          }

          .access-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default AccessDenied;




