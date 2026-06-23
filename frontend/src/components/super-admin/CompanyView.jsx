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
import { 
  Edit, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  Users, 
  Box, 
  FileCheck,
  Settings,
  Layers,
  IndianRupee,
  Calendar,
  Activity,
  Printer,
  User,
  Info
} from 'lucide-react';
import Button from '../shared/Button.jsx';
import { moduleNames } from '../../utils/moduleNames.js';

function CompanyView({ company, onClose, onEdit, canEdit }) {
  if (!company) return null;

  const enabledModules = (() => {
    if (!company.enabledModules) return [];
    if (typeof company.enabledModules === 'string') {
      try { return JSON.parse(company.enabledModules); } catch (e) { return []; }
    }
    return Array.isArray(company.enabledModules) ? company.enabledModules : [];
  })();

  const getPlanBadge = (plan) => {
    if (!plan) return <Badge bg="secondary">Unknown</Badge>;
    const lowerPlan = plan.toLowerCase();
    if (lowerPlan.includes('enterprise')) return <Badge bg="danger" className="px-3 py-2 rounded-pill fw-medium">{plan}</Badge>;
    if (lowerPlan.includes('premium')) return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill fw-medium">{plan}</Badge>;
    if (lowerPlan.includes('basic')) return <Badge bg="info" className="px-3 py-2 rounded-pill fw-medium">{plan}</Badge>;
    return <Badge bg="primary" className="px-3 py-2 rounded-pill fw-medium">{plan}</Badge>;
  };

  const handlePrint = () => {
    window.print();
  };

  const InfoCell = ({ icon: Icon, label, value }) => (
    <div className="info-cell d-flex align-items-center gap-3">
      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
        <Icon size={18} />
      </div>
      <div className="info-text-wrapper">
        <span className="info-label text-muted small d-block text-uppercase">{label}</span>
        <span className="info-val fw-semibold text-dark">{value}</span>
      </div>
    </div>
  );

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="company-details-modal">
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
          Companies &gt; Company Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <Building size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ letterSpacing: '-0.3px' }}>
                {company.name}
                <Badge bg={company.status === 'Active' ? 'success' : 'danger'} className="ms-2 px-2 py-1 rounded-pill fw-medium fs-6" style={{ fontSize: '0.75rem' }}>
                  {(company.status || 'Active').toUpperCase()}
                </Badge>
              </h4>
              <span className="text-muted small">{company.businessType || 'General Business'}</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handlePrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit Company
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Contact Information */}
          <Col lg={7}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white h-100">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Info size={18} />
                <span>Contact Information</span>
              </div>
              <div className="info-grid p-4">
                <InfoCell icon={User} label="Contact Person" value={company.contactPerson || 'N/A'} />
                <InfoCell icon={Mail} label="Email Address" value={company.email || 'N/A'} />
                <InfoCell icon={Phone} label="Contact Number" value={company.phone || 'N/A'} />
                <InfoCell icon={Globe} label="Country" value={company.country || 'N/A'} />
                
                <div className="info-cell d-flex align-items-start gap-3 w-100" style={{ gridColumn: '1 / -1' }}>
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper flex-grow-1">
                    <span className="info-label text-muted small d-block text-uppercase">Full Address</span>
                    <span className="info-val fw-semibold text-dark">{company.address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 2: Performance Metrics */}
          <Col lg={5}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white h-100">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Activity size={18} />
                <span>Performance Metrics</span>
              </div>
              <div className="p-4 d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-white p-2 rounded-circle shadow-sm text-primary"><Users size={20} /></div>
                    <span className="text-muted fw-medium">Total Users</span>
                  </div>
                  <h5 className="mb-0 fw-bold">{company.totalUsers || 0}</h5>
                </div>
                
                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-white p-2 rounded-circle shadow-sm text-success"><User size={20} /></div>
                    <span className="text-muted fw-medium">Active Leads</span>
                  </div>
                  <h5 className="mb-0 fw-bold">{company.totalLeads || 0}</h5>
                </div>

                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-white p-2 rounded-circle shadow-sm text-info"><Box size={20} /></div>
                    <span className="text-muted fw-medium">Total Orders</span>
                  </div>
                  <h5 className="mb-0 fw-bold">{company.totalOrders || 0}</h5>
                </div>

                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-white p-2 rounded-circle shadow-sm text-warning"><FileCheck size={20} /></div>
                    <span className="text-muted fw-medium">QC Records</span>
                  </div>
                  <h5 className="mb-0 fw-bold">{company.totalQCRecords || 0}</h5>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 3: Subscription & Billing */}
          <Col lg={6}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white h-100">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Settings size={18} />
                <span>Subscription & Billing</span>
              </div>
              <div className="info-grid p-4">
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Layers size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Current Plan</span>
                    <div className="mt-1">{getPlanBadge(company.subscriptionPlan)}</div>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                    <IndianRupee size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Monthly Revenue</span>
                    <span className="info-val fw-bold text-success fs-5">₹{company.monthlyRevenue || 0}</span>
                  </div>
                </div>

                <InfoCell icon={Calendar} label="Registered Date" value={company.registeredDate || 'N/A'} />
                <InfoCell icon={Activity} label="Last Login" value={company.lastLogin || 'N/A'} />
              </div>
            </div>
          </Col>

          {/* Card 4: Enabled Modules */}
          <Col lg={6}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white h-100">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Box size={18} />
                <span>Enabled Modules <span className="ms-1 px-2 py-1 bg-white text-primary rounded-pill small" style={{ fontSize: '0.7rem' }}>{enabledModules.length}</span></span>
              </div>
              <div className="p-4">
                <div className="d-flex flex-wrap gap-2">
                  {enabledModules.map((moduleId) => (
                    <div key={moduleId} className="bg-light border px-3 py-2 rounded-pill text-dark fw-medium d-flex align-items-center shadow-sm" style={{ fontSize: '0.85rem' }}>
                      <span className="bg-primary rounded-circle d-inline-block me-2" style={{ width: '6px', height: '6px' }}></span>
                      {moduleNames[moduleId] || moduleId}
                    </div>
                  ))}
                  {enabledModules.length === 0 && (
                    <div className="text-muted w-100 text-center py-4 bg-light rounded-3">
                      <Box size={32} className="mb-2 opacity-50" />
                      <p className="mb-0">No modules enabled for this company.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* ── Footer ── */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top bg-white px-3 py-2 d-print-none" style={{ margin: '0 -24px -24px -24px' }}>
          <Button variant="outline-secondary" onClick={onClose} className="border-secondary-subtle fw-semibold px-4">
            Close
          </Button>
          {canEdit && (
            <Button variant="primary" onClick={onEdit} className="fw-bold px-4">
              <Edit size={16} className="me-2" /> Edit Company
            </Button>
          )}
        </div>

      </Modal.Body>

      <style>{`
        .company-details-modal .modal-content {
          border-radius: 16px !important;
          border: none !important;
          box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
          background-color: #f8fafc !important;
        }
        
        .user-card {
          border: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .user-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px 30px;
        }

        @media (max-width: 992px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        .info-icon-wrapper {
          transition: all 0.2s ease;
        }

        .info-cell:hover .info-icon-wrapper {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.1);
        }

        @media print {
          body * { visibility: hidden; }
          .modal-content, .modal-content * { visibility: visible; }
          .modal-content {
            position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; background: white;
          }
          .d-print-none { display: none !important; }
        }
      `}</style>
    </Modal>
  );
}

export default CompanyView;
