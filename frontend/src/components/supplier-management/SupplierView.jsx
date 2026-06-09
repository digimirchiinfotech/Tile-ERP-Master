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
import {
  Edit,
  Mail,
  Phone,
  MapPin,
  Building,
  Globe,
  CreditCard,
  Package} from 'lucide-react';
import renderStars from '../../utils/renderStars.jsx';

function SupplierView({ supplier, onClose, onEdit, canEdit }) {
  if (!supplier) return null;

  const getStatusBadge = (status) => {
    return (
      <Badge bg={status === 'Active' ? 'success' : 'danger'}>{status}</Badge>
    );
  };

  const getRatingStars = (rating) => renderStars(rating, { max: 5, size: 16, showNumber: true });

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Supplier Details - {supplier.supplierName}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <Row className="g-4">
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
                      <label className="fw-bold text-muted">Supplier Factory Name:</label>
                      <p className="mb-0">{supplier.name}</p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <MapPin size={16} className="me-1" />
                        City:
                      </label>
                      <p className="mb-0">{supplier.city}</p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Country:</label>
                      <p className="mb-0">{supplier.country}</p>
                    </div>
                  </Col>
                  {supplier.website && (
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          <Globe size={16} className="me-1" />
                          Website:
                        </label>
                        <p className="mb-0">
                          <a
                            href={supplier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {supplier.website}
                          </a>
                        </p>
                      </div>
                    </Col>
                  )}
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Status:</label>
                      <div>{getStatusBadge(supplier.status)}</div>
                    </div>
                  </Col>
                  {supplier.address && (
                    <Col md={12}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Address:</label>
                        <p className="mb-0">{supplier.address}</p>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Contact Information</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Contact Person Name:</label>
                      <p className="mb-0">{supplier.contactPersonName || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Mail size={16} className="me-1" />
                        Email ID:
                      </label>
                      <p className="mb-0">{supplier.emailId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Phone size={16} className="me-1" />
                        Contact Number:
                      </label>
                      <p className="mb-0">{supplier.contactNumber}</p>
                    </div>
                  </Col>
                  {supplier.alternatePhone && (
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Alternate Phone:</label>
                        <p className="mb-0">{supplier.alternatePhone}</p>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <Package size={18} className="me-2" />
                  Product & Business Details
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={12}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Product Categories:</label>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {supplier.productCategories && supplier.productCategories.length > 0 ? (
                          supplier.productCategories.map((category, index) => (
                            <Badge key={index} bg="primary" className="fs-6 fw-normal">
                              {category}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted">Not specified</span>
                        )}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Specialization:</label>
                      <p className="mb-0">{supplier.specialization || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Minimum Order Quantity:</label>
                      <p className="mb-0">{supplier.minimumOrderQuantity || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Payment Terms:</label>
                      <p className="mb-0">{supplier.paymentTerms || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Credit Limit:</label>
                      <p className="mb-0">
                        ${supplier.creditLimit ? supplier.creditLimit.toLocaleString('en-IN') : '0'}
                      </p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Lead Time:</label>
                      <p className="mb-0">{supplier.leadTime || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">GST Number:</label>
                      <p className="mb-0">{supplier.gstn || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">PAN Number:</label>
                      <p className="mb-0">{supplier.pan || 'Not specified'}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Performance Ratings</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Quality Rating:</label>
                      <div className="mt-1">{getRatingStars(supplier.qualityRating || 0)}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Delivery Rating:</label>
                      <div className="mt-1">{getRatingStars(supplier.deliveryRating || 0)}</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <CreditCard size={18} className="me-2" />
                  Bank Details
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Bank Name:</label>
                      <p className="mb-0">{supplier.bankDetails?.bankName || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Branch:</label>
                      <p className="mb-0">{supplier.bankDetails?.branch || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Account Number:</label>
                      <p className="mb-0">{supplier.bankDetails?.accountNumber || 'Not specified'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">IFSC Code:</label>
                      <p className="mb-0">{supplier.bankDetails?.ifscCode || 'Not specified'}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Performance Metrics</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Total Orders:</label>
                      <p className="mb-0">{supplier.totalOrders || 0}</p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Total Purchase Value:</label>
                      <p className="mb-0">
                        ₹{(supplier.totalPurchaseValue || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Last Order Date:</label>
                      <p className="mb-0">
                        {supplier.lastOrderDate
                          ? new Date(supplier.lastOrderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'No orders yet'}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Created Date:</label>
                      <p className="mb-0">
                        {supplier.createdAt
                          ? new Date(supplier.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : supplier.createdDate || 'Not available'}
                      </p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {supplier.notes && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Additional Notes</h6>
                </Card.Header>
                <Card.Body>
                  <p className="mb-0">{supplier.notes}</p>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {canEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit size={16} className="me-1" />
            Edit Supplier
          </Button>
        )}
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
          font-size: 0.95rem;
        }
      `}</style>
    </Modal>
  );
}

export default SupplierView;





