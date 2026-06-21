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

import { Modal, Row, Col, Badge } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import {
  Edit,
  User,
  Mail,
  Phone,
  Shield,
  Printer,
  CheckCircle,
  Building,
  Briefcase
} from 'lucide-react';
import UserPrintView from './UserPrintView.jsx';

function UserView({ user, onClose, onEdit, canEdit, userRoles }) {
  if (!user) return null;

  const handlePrint = () => {
    window.print();
  };

  const getResolvedRole = (roleKey) => {
    const roles = userRoles || {
      company_admin: 'Company Admin',
      sales_manager: 'Sales Manager',
      sales_executive: 'Sales Executive',
      qc: 'QC',
      export_documents: 'Export Document',
      account: 'Accounter',
    };
    return roles[roleKey] || roleKey || 'User';
  };

  return (
    <Modal show={true} onHide={onClose} size="lg" backdrop="static" dialogClassName="user-details-modal">
      <Modal.Body className="p-4 bg-light position-relative" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        
        {/* Absolute positioned close button */}
        <button 
          type="button" 
          className="btn-close position-absolute top-0 end-0 m-4 shadow-none" 
          aria-label="Close" 
          onClick={onClose}
          style={{ zIndex: 1050 }}
        />

        {/* ── Breadcrumb ── */}
        <div className="breadcrumb mb-2 text-muted" style={{ fontSize: '0.82rem', letterSpacing: '0.5px' }}>
          Users &gt; User Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <User size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>User Details</h4>
              <span className="text-muted small">View complete user credentials, role access and contact details</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handlePrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit User
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Basic Information */}
          <Col xs={12}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <User size={18} />
                <span>Basic Account Details</span>
              </div>
              <div className="info-grid p-4">
                {/* Full Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <User size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Full Name</span>
                    <span className="info-val fw-semibold text-dark">{user.name || '-'}</span>
                  </div>
                </div>

                {/* Email ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Email ID</span>
                    <span className="info-val fw-semibold text-dark">{user.emailId || '-'}</span>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Contact Number</span>
                    <span className="info-val fw-semibold text-dark">{user.contactNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 2: Role & Access Controls */}
          <Col xs={12}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Shield size={18} />
                <span>Role & Designation Info</span>
              </div>
              <div className="info-grid p-4">
                {/* Role */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Shield size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Access Role</span>
                    <span className="info-val fw-semibold text-dark">{getResolvedRole(user.role)}</span>
                  </div>
                </div>

                {/* Designation */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Briefcase size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Designation</span>
                    <span className="info-val fw-semibold text-dark">{user.designation || 'N/A'}</span>
                  </div>
                </div>

                {/* Department */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Department</span>
                    <span className="info-val fw-semibold text-dark">{user.department || 'N/A'}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <CheckCircle size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Account Status</span>
                    <div className="mt-1">
                      <Badge bg={user.status === 'Active' ? 'success' : 'danger'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {(user.status || 'Active').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* ── Footer ── */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top bg-white px-3 py-2" style={{ margin: '0 -24px -24px -24px' }}>
          <Button variant="outline-secondary" onClick={onClose} className="border-secondary-subtle fw-semibold px-4">
            Close
          </Button>
          {canEdit && (
            <Button variant="primary" onClick={onEdit} className="fw-bold px-4">
              <Edit size={16} className="me-2" /> Edit User
            </Button>
          )}
        </div>

        {/* Invisible Print View Container */}
        <div className="d-none d-print-block">
          <UserPrintView userData={user} />
        </div>

        <style>{`
          .user-details-modal .modal-content {
            border-radius: 16px !important;
            border: none !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            background-color: #f8fafc !important;
          }
          
          .user-card {
            border: 1px solid #e2e8f0 !important;
            background: #ffffff !important;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px 30px;
          }

          @media (max-width: 768px) {
            .info-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
            .info-cell[style*="grid-column: span 2"] {
              grid-column: span 1 !important;
            }
          }

          .info-icon-wrapper {
            transition: all 0.2s ease;
          }

          .info-cell:hover .info-icon-wrapper {
            transform: scale(1.05);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.1);
          }
        `}</style>
      </Modal.Body>
    </Modal>
  );
}

export default UserView;
