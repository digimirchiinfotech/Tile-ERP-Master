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

import { useState } from 'react';
import { Modal, Row, Col, Badge } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { 
  Edit, User, Mail, Phone, MapPin, Building, Globe, Briefcase, 
  CreditCard, Calendar, Anchor, Coins, ShoppingCart, DollarSign, 
  FileText, Wallet, Printer, CheckCircle, X, Tag
} from 'lucide-react';
import ClientPrintView from './ClientPrintView.jsx';

function ClientView({ client, onClose, onEdit, canEdit }) {
  if (!client) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="client-details-modal">
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
          Clients &gt; Client Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <User size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>Client Details</h4>
              <span className="text-muted small">View complete client information and summary</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handlePrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit Client
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Basic Information */}
          <Col xs={12}>
            <div className="client-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="client-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <User size={18} />
                <span>Basic Information</span>
              </div>
              <div className="info-grid p-4">
                {/* Client Firm Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Client Firm Name</span>
                    <span className="info-val fw-semibold text-dark">{client.clientName || '-'}</span>
                  </div>
                </div>

                {/* Contact Person Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <User size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Contact Person Name</span>
                    <span className="info-val fw-semibold text-dark">{client.contactPersonName || 'Not specified'}</span>
                  </div>
                </div>

                {/* Country */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Globe size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Country</span>
                    <span className="info-val fw-semibold text-dark">{client.country || '-'}</span>
                  </div>
                </div>

                {/* City */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">City</span>
                    <span className="info-val fw-semibold text-dark">{client.city || 'Not specified'}</span>
                  </div>
                </div>

                {/* Email ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Email ID</span>
                    <span className="info-val fw-semibold text-dark">{client.emailId || '-'}</span>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Contact Number</span>
                    <span className="info-val fw-semibold text-dark">{client.contactNumber || '-'}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <CheckCircle size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Status</span>
                    <div className="mt-1">
                      <Badge bg={client.status === 'Active' ? 'success' : 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {(client.status || 'Active').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Website (Render if exists) */}
                {client.website && (
                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Globe size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Website</span>
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="info-val fw-semibold text-primary text-decoration-none">
                        {client.website}
                      </a>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="info-cell d-flex align-items-center gap-3" style={{ gridColumn: 'span 2' }}>
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Address</span>
                    <span className="info-val fw-semibold text-dark">{client.address || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 2: Business Details */}
          <Col xs={12}>
            <div className="client-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="client-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Briefcase size={18} />
                <span>Business Details</span>
              </div>
              <div className="info-grid p-4">
                {/* Business Type */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Tag size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Business Type</span>
                    <span className="info-val fw-semibold text-dark">{client.businessType || 'Not specified'}</span>
                  </div>
                </div>

                {/* Assigned Sales Person */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <User size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Assigned Sales Person</span>
                    <span className="info-val fw-semibold text-dark">{client.assignedSales || 'Not assigned'}</span>
                  </div>
                </div>

                {/* Consignee Details */}
                {client.consigneeDetails && (
                  <div className="info-cell d-flex align-items-start gap-3" style={{ gridColumn: 'span 2' }}>
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0, marginTop: '4px' }}>
                      <FileText size={18} />
                    </div>
                    <div className="info-text-wrapper w-100">
                      <span className="info-label text-muted small d-block text-uppercase">Consignee Details</span>
                      <pre className="mb-0 bg-light p-3 rounded-3 border border-light-subtle" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {client.consigneeDetails}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Buyer Details */}
                {client.buyerDetails && (
                  <div className="info-cell d-flex align-items-start gap-3" style={{ gridColumn: 'span 2' }}>
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0, marginTop: '4px' }}>
                      <FileText size={18} />
                    </div>
                    <div className="info-text-wrapper w-100">
                      <span className="info-label text-muted small d-block text-uppercase">Buyer Details</span>
                      <pre className="mb-0 bg-light p-3 rounded-3 border border-light-subtle" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {client.buyerDetails}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Card 3: Financial & Shipping Details */}
          <Col xs={12}>
            <div className="client-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="client-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Coins size={18} />
                <span>Financial & Shipping Details</span>
              </div>
              <div className="info-grid p-4">
                {/* Credit Limit */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <CreditCard size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Credit Limit</span>
                    <span className="info-val fw-semibold text-dark">{client.creditLimit || '0.00'}</span>
                  </div>
                </div>

                {/* Credit Days */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Credit Days</span>
                    <span className="info-val fw-semibold text-dark">{client.creditDays || '0'}</span>
                  </div>
                </div>

                {/* Port of Loading */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Anchor size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Port of Loading</span>
                    <span className="info-val fw-semibold text-dark">{client.portOfLoading || 'Not specified'}</span>
                  </div>
                </div>

                {/* Port of Discharge */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Anchor size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Port of Discharge</span>
                    <span className="info-val fw-semibold text-dark">{client.portOfDischarge || 'Not specified'}</span>
                  </div>
                </div>

                {/* Final Destination */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Final Destination</span>
                    <span className="info-val fw-semibold text-dark">{client.finalDestination || 'Not specified'}</span>
                  </div>
                </div>

                {/* Currency */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Coins size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Currency</span>
                    <span className="info-val fw-semibold text-dark">{client.currency || 'INR'}</span>
                  </div>
                </div>

                {/* Notes */}
                {client.notes && (
                  <div className="info-cell d-flex align-items-start gap-3" style={{ gridColumn: 'span 2' }}>
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0, marginTop: '4px' }}>
                      <FileText size={18} />
                    </div>
                    <div className="info-text-wrapper w-100">
                      <span className="info-label text-muted small d-block text-uppercase">Notes</span>
                      <p className="mb-0 text-dark fw-medium">{client.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Card 4: Performance Overview */}
          <Col xs={12}>
            <div className="client-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="client-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <ShoppingCart size={18} />
                <span>Performance Overview</span>
              </div>
              <div className="p-4">
                <Row className="g-3">
                  {/* Total Orders */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0f7ff', border: '1px solid #dbeafe', minHeight: '120px' }}>
                      <ShoppingCart size={24} className="text-primary mb-2" />
                      <h3 className="fw-bold mb-0 text-primary">{client.totalOrders || 0}</h3>
                      <span className="text-muted small fw-medium mt-1">Total Orders</span>
                    </div>
                  </Col>
                  {/* Total Value */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', minHeight: '120px' }}>
                      <DollarSign size={24} className="text-success mb-2" />
                      <h3 className="fw-bold mb-0 text-success">${client.totalValue || client.totalOrderValue || 0}</h3>
                      <span className="text-muted small fw-medium mt-1">Total Value</span>
                    </div>
                  </Col>
                  {/* Active Invoices */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', minHeight: '120px' }}>
                      <FileText size={24} className="text-info mb-2" />
                      <h3 className="fw-bold mb-0 text-info">{client.activeInvoices || 0}</h3>
                      <span className="text-muted small fw-medium mt-1">Active Invoices</span>
                    </div>
                  </Col>
                  {/* Pending Payments */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', minHeight: '120px' }}>
                      <Wallet size={24} className="text-warning mb-2" />
                      <h3 className="fw-bold mb-0 text-warning">{client.pendingPayments || 0}</h3>
                      <span className="text-muted small fw-medium mt-1">Pending Payments</span>
                    </div>
                  </Col>
                </Row>
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
              <Edit size={16} className="me-2" /> Edit Client
            </Button>
          )}
        </div>

        {/* Invisible Print View Container */}
        <div className="d-none d-print-block">
          <ClientPrintView clientData={client} />
        </div>

        <style>{`
          .client-details-modal .modal-content {
            border-radius: 16px !important;
            border: none !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            background-color: #f8fafc !important;
          }
          
          .client-card {
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

export default ClientView;
