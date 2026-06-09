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

import { Modal, Row, Col, Badge, Card, Table } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import {
  Edit,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  UserCheck} from 'lucide-react';
import { formatPrice, formatDisplayDate } from '../../utils/formatters.js';

function LeadView({ lead, onClose, onEdit, onConvert, canEdit }) {
  if (!lead) return null;

  const getStatusBadge = (status) => {
    const variants = {
      New: 'primary',
      Contacted: 'info',
      Qualified: 'warning',
      Won: 'success',
      Lost: 'danger',
      'On Hold': 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      High: 'danger',
      Medium: 'warning',
      Low: 'success',
    };
    return <Badge bg={variants[priority] || 'secondary'}>{priority}</Badge>;
  };

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Lead Details - {lead.companyName}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          {/* Customer Information */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <Building size={18} className="me-2" />
                  Customer Information
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Company Name:
                      </label>
                      <p className="mb-0">{lead.companyName}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Client Firm Name:</label>
                      <p className="mb-0">{lead.clientName}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Phone size={16} className="me-1" />
                        Contact Number:
                      </label>
                      <p className="mb-0">{lead.contactNumber}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Mail size={16} className="me-1" />
                        Email ID:
                      </label>
                      <p className="mb-0">{lead.emailId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <MapPin size={16} className="me-1" />
                        Country:
                      </label>
                      <p className="mb-0">{lead.country}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">City:</label>
                      <p className="mb-0">{lead.city || 'Not specified'}</p>
                    </div>
                  </Col>
                  {lead.address && (
                    <Col md={12}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Address:</label>
                        <p className="mb-0">{lead.address}</p>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Lead Management Information */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <User size={18} className="me-2" />
                  Lead Management
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Lead ID:</label>
                      <p className="mb-0 fw-medium">{lead.leadId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Lead Source:</label>
                      <p className="mb-0">{lead.source}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Priority:</label>
                      <div>{getPriorityBadge(lead.priority)}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Status:</label>
                      <div>{getStatusBadge(lead.status)}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Assigned Salesperson:
                      </label>
                      <p className="mb-0">{lead.salesPersonResolvedName || lead.salesPersonName || lead.salesPerson || '-'}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Created Date:
                      </label>
                      <p className="mb-0">{formatDisplayDate(lead.createdDate) !== '-' ? formatDisplayDate(lead.createdDate) : 'N/A'}</p>
                    </div>
                  </Col>
                  {lead.expectedCloseDate && (
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          <Calendar size={16} className="me-1" />
                          Expected Close Date:
                        </label>
                        <p className="mb-0">{lead.expectedCloseDate}</p>
                      </div>
                    </Col>
                  )}
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <DollarSign size={16} className="me-1" />
                        Lead Value:
                      </label>
                      <p className="mb-0 fw-bold text-success">
                        ₹{parseFloat(lead.leadValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Product Interests */}
          {Array.isArray(lead.productInterests) && lead.productInterests.length > 0 && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Product Interests</h6>
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Size</th>
                          <th>Surface</th>
                          <th className="text-end">Quantity (Boxes)</th>
                          <th className="text-end">Unit Price</th>
                          <th className="text-end">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lead.productInterests.map((product, index) => (
                          <tr key={index}>
                            <td>{product.productName}</td>
                            <td>{product.size}</td>
                            <td>{product.surface}</td>
                            <td className="text-end">{product.quantity}</td>
                            <td className="text-end">₹{parseFloat(product.unitPrice || 0).toFixed(2)}</td>
                            <td className="text-end">₹{parseFloat(product.totalValue || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="table-info">
                          <td colSpan="5" className="fw-bold">
                            Total Lead Value:
                          </td>
                          <td className="fw-bold text-end">
                            ₹{parseFloat(lead.leadValue || 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Additional Information */}
          {(lead.notes || lead.followUpDate) && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Additional Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {lead.followUpDate && (
                      <Col md={6}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">
                            Follow-up Date:
                          </label>
                          <p className="mb-0">{lead.followUpDate}</p>
                        </div>
                      </Col>
                    )}
                    {lead.notes && (
                      <Col md={12}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">Notes:</label>
                          <p className="mb-0">{lead.notes}</p>
                        </div>
                      </Col>
                    )}
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Modal.Body>
      <Modal.Footer>
        {canEdit && (
          <Button variant="primary" onClick={onEdit} className="me-auto">
            <Edit size={16} className="me-1" />
            Edit Lead
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
      `}</style>
    </Modal>
  );
}

export default LeadView;




