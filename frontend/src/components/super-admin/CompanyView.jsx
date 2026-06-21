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

import { Modal, Button, Row, Col, Badge, Card, Table } from 'react-bootstrap';
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
  Printer} from 'lucide-react';

function CompanyView({ company, onClose, onEdit }) {
  if (!company) return null;

  const getStatusBadge = (status) => {
    const variants = {
      Active: 'success',
      Suspended: 'danger',
      Trial: 'warning',
      Expired: 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPlanBadge = (plan) => {
    const variants = {
      Free: 'secondary',
      Basic: 'info',
      Pro: 'primary',
      Enterprise: 'success',
    };
    return <Badge bg={variants[plan] || 'secondary'}>{plan}</Badge>;
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
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Company Details - {company.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          {/* Company Overview */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <Building size={18} className="me-2" />
                  Company Overview
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Company Name:
                      </label>
                      <p className="mb-0">{company.name}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Industry:</label>
                      <p className="mb-0">{company.industry}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <User size={16} className="me-1" />
                        Contact Person Name:
                      </label>
                      <p className="mb-0">{company.contactPersonName}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Mail size={16} className="me-1" />
                        Email ID:
                      </label>
                      <p className="mb-0">{company.emailId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Phone size={16} className="me-1" />
                        Contact Number:
                      </label>
                      <p className="mb-0">{company.contactNumber}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <MapPin size={16} className="me-1" />
                        Country:
                      </label>
                      <p className="mb-0">{company.country}</p>
                    </div>
                  </Col>
                  {company.website && (
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          <Globe size={16} className="me-1" />
                          Website:
                        </label>
                        <p className="mb-0">
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {company.website}
                          </a>
                        </p>
                      </div>
                    </Col>
                  )}
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Status:</label>
                      <div>{getStatusBadge(company.status)}</div>
                    </div>
                  </Col>
                  {company.address && (
                    <Col md={12}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Address:</label>
                        <p className="mb-0">{company.address}</p>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Subscription Details */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <Settings size={18} className="me-2" />
                  Subscription & Billing
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Current Plan:
                      </label>
                      <div>{getPlanBadge(company.subscriptionPlan)}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <IndianRupee size={16} className="me-1" />
                        Monthly Revenue:
                      </label>
                      <p className="mb-0 fw-bold text-success">
                        ${company.monthlyRevenue}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Calendar size={16} className="me-1" />
                        Registered Date:
                      </label>
                      <p className="mb-0">{company.registeredDate}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Activity size={16} className="me-1" />
                        Last Login:
                      </label>
                      <p className="mb-0">{company.lastLogin}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Enabled Modules */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  Enabled Modules ({enabledModules.length})
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-2">
                  {enabledModules.map((moduleId) => (
                    <Col key={moduleId} xs={12} sm={6} md={4} lg={3}>
                      <Badge bg="primary" className="w-100 p-2 text-start">
                        {moduleNames[moduleId] || moduleId}
                      </Badge>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Performance Metrics */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Performance Metrics</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-primary">{company.totalUsers}</h4>
                      <p className="mb-0 text-muted">Total Users</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-success">{company.totalLeads || 0}</h4>
                      <p className="mb-0 text-muted">Active Leads</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-info">{company.totalOrders || 0}</h4>
                      <p className="mb-0 text-muted">Total Orders</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-warning">{company.totalQCRecords || 0}</h4>
                      <p className="mb-0 text-muted">QC Records</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-dark" onClick={() => window.print()}>
          <Printer size={16} className="me-1 d-print-none" />
          Print Profile
        </Button>
        <Button variant="primary" onClick={onEdit} className="d-print-none">
          <Edit size={16} className="me-1" />
          Edit Company
        </Button>
        <Button variant="secondary" onClick={onClose} className="d-print-none">
          Close
        </Button>
      </Modal.Footer>

      <style>{`
        .info-item {
          margin-bottom: 1rem;
        }

        .info-item label {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          display: block;
        }

        .info-item p {
          font-size: 1rem;
          color: #333;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .modal-content, .modal-content * {
            visibility: visible;
          }
          .modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .modal-header .btn-close, .modal-footer .btn {
            display: none !important;
          }
          .modal-footer {
            border: none !important;
          }
          .card {
            border: 1px solid #ddd !important;
            break-inside: avoid;
          }
          .text-primary {
            color: #000 !important;
          }
          .badge {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: transparent !important;
          }
        }
      `}</style>
    </Modal>
  );
}

export default CompanyView;




