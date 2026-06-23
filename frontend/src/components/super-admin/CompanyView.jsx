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

import { Modal, Button, Row, Col, Badge } from 'react-bootstrap';
import {
  Edit,
  Building,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  IndianRupee,
  Users,
  Activity,
  Settings,
  Printer,
  X,
  Layers,
  Box,
  FileCheck,
  Briefcase
} from 'lucide-react';

function CompanyView({ company, onClose, onEdit }) {
  if (!company) return null;

  const getStatusBadge = (status) => {
    const variants = {
      Active: 'success',
      Suspended: 'danger',
      Trial: 'warning',
      Expired: 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'} className="px-3 py-2 rounded-pill fw-medium">{status}</Badge>;
  };

  const getPlanBadge = (plan) => {
    const variants = {
      Free: 'secondary',
      Basic: 'info',
      Pro: 'primary',
      Enterprise: 'success',
    };
    return <Badge bg={variants[plan] || 'secondary'} className="px-3 py-2 rounded-pill fw-medium">{plan}</Badge>;
  };

  const enabledModules = company.enabledModules || [
    'proforma_invoice',
    'proforma_order',
    'lead_management',
    'client_management',
    'product_management',
  ];

  const moduleNames = {
    proforma_invoice: 'Proforma Invoices',
    proforma_order: 'Proforma Orders',
    lead_management: 'Lead Management',
    client_management: 'Client Management',
    product_management: 'Tile Product',
    catalogue_management: 'Catalogue Management',
    qc_management: 'QC Management',
    pallet_management: 'Pallet Management',
    invoice_packing: 'Packing List Management',
    account_finance: 'Account & Finance',
    user_management: 'User Management',
  };

  return (
    <Modal show={true} onHide={onClose} size="xl" centered contentClassName="glass-modal border-0 shadow-lg">
      <div className="position-relative">
        {/* Decorative Header Background */}
        <div className="modal-header-bg bg-primary opacity-10" style={{ height: '120px', borderRadius: '16px 16px 0 0', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}></div>
        
        <Modal.Header className="border-0 pt-4 pb-0 px-4 position-relative" style={{ zIndex: 1 }}>
          <div className="w-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="d-flex align-items-center gap-2 text-muted small fw-medium text-uppercase tracking-wider">
                <Building size={14} />
                <span>Companies</span>
                <span>/</span>
                <span className="text-primary">{company.name}</span>
              </div>
              <button onClick={onClose} className="btn-close-custom" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            
            <div className="d-flex align-items-end justify-content-between mt-3">
              <div className="d-flex align-items-center gap-3">
                <div className="icon-box bg-white text-primary shadow-sm rounded-4 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                  <Building size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                    {company.name}
                    {getStatusBadge(company.status)}
                  </h3>
                  <p className="text-muted mb-0 d-flex align-items-center gap-2">
                    <Briefcase size={16} /> {company.industry}
                  </p>
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" className="btn-modern d-flex align-items-center gap-2" onClick={() => window.print()}>
                  <Printer size={16} /> <span className="d-none d-sm-inline">Print</span>
                </Button>
                {onEdit && (
                  <Button variant="primary" className="btn-modern d-flex align-items-center gap-2 shadow-sm" onClick={onEdit}>
                    <Edit size={16} /> <span className="d-none d-sm-inline">Edit Company</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body className="p-4 position-relative" style={{ zIndex: 1 }}>
          <Row className="g-4">
            
            {/* Overview Section */}
            <Col lg={8}>
              <div className="user-card bg-white p-4 h-100 shadow-sm border-0">
                <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <User size={20} />
                  </div>
                  <h5 className="fw-bold mb-0 text-dark">Contact Information</h5>
                </div>
                
                <div className="info-grid">
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><User size={18} /></div>
                    <div className="content">
                      <label>Contact Person</label>
                      <span>{company.contactPersonName || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Mail size={18} /></div>
                    <div className="content">
                      <label>Email Address</label>
                      <span>{company.emailId || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Phone size={18} /></div>
                    <div className="content">
                      <label>Contact Number</label>
                      <span>{company.contactNumber || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><MapPin size={18} /></div>
                    <div className="content">
                      <label>Country</label>
                      <span>{company.country || 'N/A'}</span>
                    </div>
                  </div>
                  {company.website && (
                    <div className="info-cell">
                      <div className="icon-wrapper bg-light text-secondary"><Globe size={18} /></div>
                      <div className="content">
                        <label>Website</label>
                        <span>
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none hover-underline">
                            {company.website}
                          </a>
                        </span>
                      </div>
                    </div>
                  )}
                  {company.address && (
                    <div className="info-cell" style={{ gridColumn: '1 / -1' }}>
                      <div className="icon-wrapper bg-light text-secondary"><MapPin size={18} /></div>
                      <div className="content">
                        <label>Full Address</label>
                        <span>{company.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* Performance Metrics */}
            <Col lg={4}>
              <div className="user-card bg-white p-4 h-100 shadow-sm border-0">
                <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                  <div className="bg-success-subtle text-success p-2 rounded-3">
                    <Activity size={20} />
                  </div>
                  <h5 className="fw-bold mb-0 text-dark">Performance</h5>
                </div>
                
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center p-3 rounded-3 bg-light border border-light-subtle">
                    <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-primary"><Users size={20} /></div>
                    <div className="flex-grow-1">
                      <div className="text-muted small fw-medium mb-1">Total Users</div>
                      <h4 className="mb-0 fw-bold">{company.totalUsers || 0}</h4>
                    </div>
                  </div>
                  <div className="d-flex align-items-center p-3 rounded-3 bg-light border border-light-subtle">
                    <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-success"><User size={20} /></div>
                    <div className="flex-grow-1">
                      <div className="text-muted small fw-medium mb-1">Active Leads</div>
                      <h4 className="mb-0 fw-bold">{company.totalLeads || 0}</h4>
                    </div>
                  </div>
                  <div className="d-flex align-items-center p-3 rounded-3 bg-light border border-light-subtle">
                    <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-info"><Box size={20} /></div>
                    <div className="flex-grow-1">
                      <div className="text-muted small fw-medium mb-1">Total Orders</div>
                      <h4 className="mb-0 fw-bold">{company.totalOrders || 0}</h4>
                    </div>
                  </div>
                  <div className="d-flex align-items-center p-3 rounded-3 bg-light border border-light-subtle">
                    <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-warning"><FileCheck size={20} /></div>
                    <div className="flex-grow-1">
                      <div className="text-muted small fw-medium mb-1">QC Records</div>
                      <h4 className="mb-0 fw-bold">{company.totalQCRecords || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Subscription & Billing Section */}
            <Col lg={6}>
              <div className="user-card bg-white p-4 h-100 shadow-sm border-0">
                <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                  <div className="bg-warning-subtle text-warning p-2 rounded-3">
                    <Settings size={20} />
                  </div>
                  <h5 className="fw-bold mb-0 text-dark">Subscription & Billing</h5>
                </div>
                
                <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Layers size={18} /></div>
                    <div className="content">
                      <label>Current Plan</label>
                      <div className="mt-1">{getPlanBadge(company.subscriptionPlan)}</div>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-success-subtle text-success"><IndianRupee size={18} /></div>
                    <div className="content">
                      <label>Monthly Revenue</label>
                      <span className="fw-bold text-success fs-5">${company.monthlyRevenue || 0}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Calendar size={18} /></div>
                    <div className="content">
                      <label>Registered Date</label>
                      <span>{company.registeredDate || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Activity size={18} /></div>
                    <div className="content">
                      <label>Last Login</label>
                      <span>{company.lastLogin || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Enabled Modules Section */}
            <Col lg={6}>
              <div className="user-card bg-white p-4 h-100 shadow-sm border-0">
                <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                  <div className="bg-info-subtle text-info p-2 rounded-3">
                    <Box size={20} />
                  </div>
                  <h5 className="fw-bold mb-0 text-dark">Enabled Modules <span className="text-muted ms-1 fs-6">({enabledModules.length})</span></h5>
                </div>
                
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {enabledModules.map((moduleId) => (
                    <div key={moduleId} className="bg-light border px-3 py-2 rounded-3 text-dark fw-medium d-flex align-items-center shadow-sm">
                      <span className="bg-primary rounded-circle d-inline-block me-2" style={{ width: '8px', height: '8px' }}></span>
                      {moduleNames[moduleId] || moduleId}
                    </div>
                  ))}
                  {enabledModules.length === 0 && (
                    <div className="text-muted w-100 text-center py-4 bg-light rounded-3">
                      No modules enabled for this company.
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Modal.Body>
      </div>

      <style>{`
        /* User Card & Grid Styles (Reused from UserView / ProductView) */
        .glass-modal .modal-content {
          border-radius: 16px;
          overflow: hidden;
          background: #f8fafc;
        }
        .btn-close-custom {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s;
        }
        .btn-close-custom:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .btn-modern {
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .user-card {
          border-radius: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .user-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .info-cell {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .info-cell .icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .info-cell .content {
          display: flex;
          flex-direction: column;
        }
        .info-cell label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 0.25rem;
          font-weight: 600;
        }
        .info-cell span {
          color: #0f172a;
          font-weight: 500;
          font-size: 0.95rem;
          word-break: break-word;
        }
        .hover-underline:hover {
          text-decoration: underline !important;
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





