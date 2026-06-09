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

import { Modal, Row, Col, Badge, Card } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Edit, User, Mail, Phone, MapPin, Building, Globe } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

function ClientView({ client, onClose, onEdit, canEdit }) {
  if (!client) return null;

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Client Details - {client.clientName}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          {/* Basic Information */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <Building size={18} className="me-2" />
                  Basic Information
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Client Firm Name:</label>
                      <p className="mb-0">{client.clientName}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Contact Person Name:
                      </label>
                      <p className="mb-0">
                        {client.contactPersonName || 'Not specified'}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <MapPin size={16} className="me-1" />
                        Country:
                      </label>
                      <p className="mb-0">{client.country}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">City:</label>
                      <p className="mb-0">{client.city || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Mail size={16} className="me-1" />
                        Email ID:
                      </label>
                      <p className="mb-0">{client.emailId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Phone size={16} className="me-1" />
                        Contact Number:
                      </label>
                      <p className="mb-0">{client.contactNumber}</p>
                    </div>
                  </Col>
                  {client.website && (
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          <Globe size={16} className="me-1" />
                          Website:
                        </label>
                        <p className="mb-0">
                          <a
                            href={client.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {client.website}
                          </a>
                        </p>
                      </div>
                    </Col>
                  )}
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Status:</label>
                      <div><StatusBadge status={client.status} /></div>
                    </div>
                  </Col>
                  {client.address && (
                    <Col md={12}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Address:</label>
                        <p className="mb-0">{client.address}</p>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Business Details */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Business Details</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Business Type:
                      </label>
                      <p className="mb-0">
                        {client.businessType || 'Not specified'}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Assigned Sales Person:
                      </label>
                      <p className="mb-0">
                        {client.assignedSales || 'Not assigned'}
                      </p>
                    </div>
                  </Col>
                  {client.consigneeDetails && (
                    <Col md={12}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Consignee Details:
                        </label>
                        <pre className="mb-0 bg-light p-2 rounded">
                          {client.consigneeDetails}
                        </pre>
                      </div>
                    </Col>
                  )}
                  {client.buyerDetails && (
                    <Col md={12}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Buyer Details:
                        </label>
                        <pre className="mb-0 bg-light p-2 rounded">
                          {client.buyerDetails}
                        </pre>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Financial & Shipping Details */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Financial & Shipping Details</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Credit Limit:</label>
                      <p className="mb-0">{client.creditLimit || '0.00'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Credit Days:</label>
                      <p className="mb-0">{client.creditDays || '0'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Port of Loading:</label>
                      <p className="mb-0">{client.portOfLoading || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Port of Discharge:</label>
                      <p className="mb-0">{client.portOfDischarge || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Final Destination:</label>
                      <p className="mb-0">{client.finalDestination || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Currency:</label>
                      <p className="mb-0">{client.currency || 'INR'}</p>
                    </div>
                  </Col>
                  {client.notes && (
                    <Col md={12}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Notes:</label>
                        <p className="mb-0">{client.notes}</p>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Performance Metrics */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Performance Overview</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-primary">0</h4>
                      <p className="mb-0 text-muted">Total Orders</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-success">$0</h4>
                      <p className="mb-0 text-muted">Total Value</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-info">0</h4>
                      <p className="mb-0 text-muted">Active Invoices</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-warning">0</h4>
                      <p className="mb-0 text-muted">Pending Payments</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        {canEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit size={16} className="me-1" />
            Edit Client
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
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

        pre {
          font-size: 0.875rem;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>
    </Modal>
  );
}

export default ClientView;





