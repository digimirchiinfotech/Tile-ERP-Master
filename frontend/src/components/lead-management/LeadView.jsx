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

import { Modal, Row, Col, Badge, Table } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import {
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  UserCheck,
  Printer,
  X,
  FileText,
  Tag,
  Package,
  TrendingUp,
  Clock
} from 'lucide-react';
import { formatPrice, formatDisplayDate } from '../../utils/formatters.js';
import LeadPrintView from './LeadPrintView.jsx';

function LeadView({ lead, onClose, onEdit, onConvert, canEdit }) {
  if (!lead) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    const variants = {
      New: 'primary',
      Contacted: 'info',
      Qualified: 'warning',
      Won: 'success',
      Lost: 'danger',
      'On Hold': 'secondary',
    };
    return (
      <Badge bg={variants[status] || 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
        {(status || 'NEW').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      High: 'danger',
      Medium: 'warning',
      Low: 'success',
    };
    return (
      <Badge bg={variants[priority] || 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
        {(priority || 'LOW').toUpperCase()}
      </Badge>
    );
  };

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="lead-details-modal">
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
          Leads &gt; Lead Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>Lead Details</h4>
              <span className="text-muted small">View complete customer inquiry details and progress state</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            {onConvert && lead.status !== 'Won' && (
              <Button variant="success" onClick={onConvert} className="fw-bold d-flex align-items-center text-white">
                <UserCheck size={16} className="me-2" /> Convert to Client
              </Button>
            )}
            <Button variant="outline-secondary" onClick={handlePrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit Lead
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Customer Information */}
          <Col xs={12}>
            <div className="lead-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="lead-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Building size={18} />
                <span>Customer Information</span>
              </div>
              <div className="info-grid p-4">
                {/* Company Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Company Name</span>
                    <span className="info-val fw-semibold text-dark">{lead.companyName || '-'}</span>
                  </div>
                </div>

                {/* Client Firm Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Client Firm Name</span>
                    <span className="info-val fw-semibold text-dark">{lead.clientName || '-'}</span>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Contact Number</span>
                    <span className="info-val fw-semibold text-dark">{lead.contactNumber || '-'}</span>
                  </div>
                </div>

                {/* Email ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Email ID</span>
                    <span className="info-val fw-semibold text-dark">{lead.emailId || '-'}</span>
                  </div>
                </div>

                {/* Country */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Country</span>
                    <span className="info-val fw-semibold text-dark">{lead.country || '-'}</span>
                  </div>
                </div>

                {/* City */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">City</span>
                    <span className="info-val fw-semibold text-dark">{lead.city || 'Not specified'}</span>
                  </div>
                </div>

                {/* Address */}
                {lead.address && (
                  <div className="info-cell d-flex align-items-center gap-3" style={{ gridColumn: 'span 2' }}>
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <MapPin size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Address</span>
                      <span className="info-val fw-semibold text-dark">{lead.address || '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Card 2: Lead Management Details */}
          <Col xs={12}>
            <div className="lead-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="lead-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <User size={18} />
                <span>Lead Management</span>
              </div>
              <div className="info-grid p-4">
                {/* Lead ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Tag size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Lead ID</span>
                    <span className="info-val fw-semibold text-dark">{lead.leadId || '-'}</span>
                  </div>
                </div>

                {/* Lead Source */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Lead Source</span>
                    <span className="info-val fw-semibold text-dark">{lead.source || '-'}</span>
                  </div>
                </div>

                {/* Priority */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <TrendingUp size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Priority</span>
                    <div className="mt-1">{getPriorityBadge(lead.priority)}</div>
                  </div>
                </div>

                {/* Status */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Clock size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Status</span>
                    <div className="mt-1">{getStatusBadge(lead.status)}</div>
                  </div>
                </div>

                {/* Assigned Salesperson */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <User size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Assigned Salesperson</span>
                    <span className="info-val fw-semibold text-dark">{lead.salesPersonResolvedName || lead.salesPersonName || lead.salesPerson || '-'}</span>
                  </div>
                </div>

                {/* Created Date */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Created Date</span>
                    <span className="info-val fw-semibold text-dark">
                      {formatDisplayDate(lead.createdDate) !== '-' ? formatDisplayDate(lead.createdDate) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Expected Close Date */}
                {lead.expectedCloseDate && (
                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Calendar size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Expected Close Date</span>
                      <span className="info-val fw-semibold text-dark">{lead.expectedCloseDate}</span>
                    </div>
                  </div>
                )}

                {/* Lead Value */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#e8f5e9', color: '#2e7d32', flexShrink: 0 }}>
                    <DollarSign size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Lead Value</span>
                    <span className="info-val fw-bold text-success" style={{ fontSize: '1.1rem' }}>
                      ₹{parseFloat(lead.leadValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 3: Product Interests */}
          {Array.isArray(lead.productInterests) && lead.productInterests.length > 0 && (
            <Col xs={12}>
              <div className="lead-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="lead-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <Package size={18} />
                  <span>Product Interests</span>
                </div>
                <div className="p-4">
                  <div className="table-responsive border rounded-3">
                    <Table striped hover className="align-middle mb-0" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className="bg-light text-secondary" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <th className="p-3 border-0">Product Name</th>
                          <th className="p-3 border-0">Size</th>
                          <th className="p-3 border-0">Surface</th>
                          <th className="p-3 border-0 text-center">Quantity (Boxes)</th>
                          <th className="p-3 border-0 text-end">Unit Price</th>
                          <th className="p-3 border-0 text-end">Total Value</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '0.92rem' }}>
                        {lead.productInterests.map((product, index) => (
                          <tr key={index} className="border-top border-light-subtle">
                            <td className="p-3 fw-semibold text-dark">{product.productName}</td>
                            <td className="p-3 text-muted">{product.size}</td>
                            <td className="p-3 text-muted">{product.surface}</td>
                            <td className="p-3 text-center fw-medium text-dark">{product.quantity}</td>
                            <td className="p-3 text-end fw-semibold text-dark">₹{parseFloat(product.unitPrice || 0).toFixed(2)}</td>
                            <td className="p-3 text-end fw-bold text-dark">₹{parseFloat(product.totalValue || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="table-info border-top border-2 border-info">
                          <td colSpan="5" className="p-3 fw-bold text-dark">
                            Total Lead Value:
                          </td>
                          <td className="p-3 text-end fw-bold text-primary" style={{ fontSize: '1.05rem' }}>
                            ₹{parseFloat(lead.leadValue || 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </div>
              </div>
            </Col>
          )}

          {/* Card 4: Additional Information */}
          {(lead.notes || lead.followUpDate) && (
            <Col xs={12}>
              <div className="lead-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="lead-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <FileText size={18} />
                  <span>Additional Information</span>
                </div>
                <div className="info-grid p-4">
                  {lead.followUpDate && (
                    <div className="info-cell d-flex align-items-center gap-3">
                      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                        <Calendar size={18} />
                      </div>
                      <div className="info-text-wrapper">
                        <span className="info-label text-muted small d-block text-uppercase">Follow-up Date</span>
                        <span className="info-val fw-semibold text-dark">{lead.followUpDate}</span>
                      </div>
                    </div>
                  )}
                  {lead.notes && (
                    <div className="info-cell d-flex align-items-start gap-3" style={{ gridColumn: 'span 2' }}>
                      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0, marginTop: '2px' }}>
                        <FileText size={18} />
                      </div>
                      <div className="info-text-wrapper w-100">
                        <span className="info-label text-muted small d-block text-uppercase">Notes</span>
                        <pre className="mb-0 bg-light p-3 rounded-3 border border-light-subtle text-dark" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontWeight: 500 }}>
                          {lead.notes}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}
        </Row>

        {/* ── Footer ── */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top bg-white px-3 py-2" style={{ margin: '0 -24px -24px -24px' }}>
          <Button variant="outline-secondary" onClick={onClose} className="border-secondary-subtle fw-semibold px-4">
            Close
          </Button>
          {canEdit && (
            <Button variant="primary" onClick={onEdit} className="fw-bold px-4">
              <Edit size={16} className="me-2" /> Edit Lead
            </Button>
          )}
        </div>

        {/* Invisible Print View Container */}
        <div className="d-none d-print-block">
          <LeadPrintView leadData={lead} />
        </div>

        <style>{`
          .lead-details-modal .modal-content {
            border-radius: 16px !important;
            border: none !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            background-color: #f8fafc !important;
          }
          
          .lead-card {
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

export default LeadView;
