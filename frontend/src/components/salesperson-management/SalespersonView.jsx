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
import { Modal, Button, Row, Col, Badge, Card, Spinner } from 'react-bootstrap';
import {
  Edit,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Target,
  Percent} from 'lucide-react';
import { useCatalogues } from '../../hooks/useCatalogues';
import { formatDisplayDate } from '../../utils/formatters.js';
import api from '../../services/api';

function SalespersonView({ salesperson, onClose, onEdit, canEdit }) {
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const { catalogues } = useCatalogues();

  useEffect(() => {
    if (salesperson?.id) {
      fetchPerformanceMetrics();
    }
  }, [salesperson]);

  const fetchPerformanceMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const response = await api.get(`/analytics/salesperson/${salesperson.id}`);
      setMetrics(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  if (!salesperson) return null;

  const getAssignedCatalogues = () => {
    return catalogues.filter((catalogue) =>
      salesperson.assignedCatalogues?.includes(catalogue.id)
    );
  };

  const assignedCatalogues = getAssignedCatalogues();

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Salesperson Details - {salesperson.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          {/* Personal Information */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <User size={18} className="me-2" />
                  Personal Information
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Full Name:</label>
                      <p className="mb-0">{salesperson.name}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Employee ID:</label>
                      <p className="mb-0">{salesperson.employeeId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Mail size={16} className="me-1" />
                        Email ID:
                      </label>
                      <p className="mb-0">{salesperson.emailId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Phone size={16} className="me-1" />
                        Contact Number:
                      </label>
                      <p className="mb-0">{salesperson.contactNumber}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Professional Information */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <Building size={18} className="me-2" />
                  Professional Information
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Department:</label>
                      <p className="mb-0">{salesperson.department}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <MapPin size={16} className="me-1" />
                        Country:
                      </label>
                      <p className="mb-0">{salesperson.country}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <MapPin size={16} className="me-1" />
                        City:
                      </label>
                      <p className="mb-0">{salesperson.city}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Target size={16} className="me-1" />
                        Sales Target:
                      </label>
                      <p className="mb-0">
                        ${salesperson.salesTarget?.toLocaleString()}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Percent size={16} className="me-1" />
                        Commission:
                      </label>
                      <p className="mb-0">{salesperson.commission}%</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Account Status:
                      </label>
                      <Badge
                        bg={
                          salesperson.status === 'Active' ? 'success' : 'danger'
                        }
                      >
                        {salesperson.status}
                      </Badge>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Created Date:
                      </label>
                      <p className="mb-0">{formatDisplayDate(salesperson.createdDate)}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Assigned Catalogues */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  Assigned Catalogues ({assignedCatalogues.length})
                </h6>
              </Card.Header>
              <Card.Body>
                {assignedCatalogues.length > 0 ? (
                  <Row className="g-3">
                    {assignedCatalogues.map((catalogue) => (
                      <Col key={catalogue.id} xs={12} sm={6} md={4}>
                        <Card className="catalogue-preview-card">
                          <Card.Body className="p-3">
                            <h6 className="mb-2">{catalogue.name}</h6>
                            <p className="text-muted small mb-2">
                              {catalogue.description}
                            </p>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-muted">
                                {catalogue.totalProducts} products
                              </small>
                              <Badge bg="success">Active</Badge>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-4 text-muted">
                    <p>No catalogues assigned</p>
                  </div>
                )}
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
                {loadingMetrics ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" variant="primary" />
                    <p className="mt-2 text-muted small">Loading metrics...</p>
                  </div>
                ) : (
                  <Row className="g-3">
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-success">{metrics?.leadsCreated || 0}</h4>
                        <p className="mb-0 text-muted">Leads Created</p>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-info">{metrics?.leadsConverted || 0}</h4>
                        <p className="mb-0 text-muted">Leads Converted</p>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-warning">{metrics?.conversionRate || '0%'}</h4>
                        <p className="mb-0 text-muted">Conversion Rate</p>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-primary">${(metrics?.totalSales || 0).toLocaleString()}</h4>
                        <p className="mb-0 text-muted">Total Sales</p>
                      </div>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        {canEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit size={16} className="me-1" />
            Edit Salesperson
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

        .catalogue-preview-card {
          transition: transform 0.2s ease;
          height: 100%;
        }

        .catalogue-preview-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </Modal>
  );
}

export default SalespersonView;




