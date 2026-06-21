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
  Mail,
  Phone,
  MapPin,
  Building,
  Globe,
  CreditCard,
  Package,
  Printer,
  CheckCircle,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Calendar,
  Award,
  Tag,
  Briefcase
} from 'lucide-react';
import renderStars from '../../utils/renderStars.jsx';
import SupplierPrintView from './SupplierPrintView.jsx';

function SupplierView({ supplier, onClose, onEdit, canEdit }) {
  if (!supplier) return null;

  const handlePrint = () => {
    window.print();
  };

  const getRatingStars = (rating) => renderStars(rating, { max: 5, size: 16, showNumber: true });

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="supplier-details-modal">
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
          Management &gt; Supplier Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <Building size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>Supplier Details</h4>
              <span className="text-muted small">View complete supplier information, business terms, and ratings</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handlePrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit Supplier
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Basic Information */}
          <Col xs={12}>
            <div className="supplier-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="supplier-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Building size={18} />
                <span>Basic Information</span>
              </div>
              <div className="info-grid p-4">
                {/* Supplier Factory Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Supplier Factory Name</span>
                    <span className="info-val fw-semibold text-dark">{supplier.name || '-'}</span>
                  </div>
                </div>

                {/* Contact Person Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Contact Person Name</span>
                    <span className="info-val fw-semibold text-dark">{supplier.contactPersonName || 'Not specified'}</span>
                  </div>
                </div>

                {/* Country */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Globe size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Country</span>
                    <span className="info-val fw-semibold text-dark">{supplier.country || '-'}</span>
                  </div>
                </div>

                {/* City */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">City</span>
                    <span className="info-val fw-semibold text-dark">{supplier.city || 'Not specified'}</span>
                  </div>
                </div>

                {/* Website (Render if exists) */}
                {supplier.website && (
                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Globe size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Website</span>
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="info-val fw-semibold text-primary text-decoration-none">
                        {supplier.website}
                      </a>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <CheckCircle size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Status</span>
                    <div className="mt-1">
                      <Badge bg={supplier.status === 'Active' ? 'success' : 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {(supplier.status || 'Active').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Address */}
                {supplier.address && (
                  <div className="info-cell d-flex align-items-center gap-3" style={{ gridColumn: 'span 2' }}>
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <MapPin size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Address</span>
                      <span className="info-val fw-semibold text-dark">{supplier.address || '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Card 2: Contact Information */}
          <Col xs={12}>
            <div className="supplier-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="supplier-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Phone size={18} />
                <span>Contact Information</span>
              </div>
              <div className="info-grid p-4">
                {/* Email ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Email ID</span>
                    <span className="info-val fw-semibold text-dark">{supplier.emailId || '-'}</span>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Contact Number</span>
                    <span className="info-val fw-semibold text-dark">{supplier.contactNumber || '-'}</span>
                  </div>
                </div>

                {/* Alternate Phone */}
                {supplier.alternatePhone && (
                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Phone size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Alternate Phone</span>
                      <span className="info-val fw-semibold text-dark">{supplier.alternatePhone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Card 3: Product & Business Details */}
          <Col xs={12}>
            <div className="supplier-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="supplier-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Package size={18} />
                <span>Product & Business Details</span>
              </div>
              <div className="info-grid p-4">
                {/* Product Categories */}
                <div className="info-cell d-flex align-items-start gap-3" style={{ gridColumn: 'span 2' }}>
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0, marginTop: '2px' }}>
                    <Tag size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Product Categories</span>
                    <div className="d-flex flex-wrap gap-2 mt-1">
                      {supplier.productCategories && supplier.productCategories.length > 0 ? (
                        supplier.productCategories.map((category, index) => (
                          <Badge key={index} bg="primary" className="fw-semibold px-2 py-1.5" style={{ fontSize: '0.8rem' }}>
                            {category}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted small">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specialization */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Briefcase size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Specialization</span>
                    <span className="info-val fw-semibold text-dark">{supplier.specialization || 'Not specified'}</span>
                  </div>
                </div>

                {/* Minimum Order Quantity */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Package size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Minimum Order Quantity</span>
                    <span className="info-val fw-semibold text-dark">{supplier.minimumOrderQuantity || 'Not specified'}</span>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <CreditCard size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Payment Terms</span>
                    <span className="info-val fw-semibold text-dark">{supplier.paymentTerms || 'Not specified'}</span>
                  </div>
                </div>

                {/* Credit Limit */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <DollarSign size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Credit Limit</span>
                    <span className="info-val fw-semibold text-dark">${supplier.creditLimit ? supplier.creditLimit.toLocaleString('en-IN') : '0'}</span>
                  </div>
                </div>

                {/* Lead Time */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Lead Time</span>
                    <span className="info-val fw-semibold text-dark">{supplier.leadTime || 'Not specified'}</span>
                  </div>
                </div>

                {/* GST Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">GST Number</span>
                    <span className="info-val fw-semibold text-dark">{supplier.gstn || 'Not specified'}</span>
                  </div>
                </div>

                {/* PAN Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">PAN Number</span>
                    <span className="info-val fw-semibold text-dark">{supplier.pan || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 4: Performance Ratings */}
          <Col xs={12}>
            <div className="supplier-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="supplier-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Award size={18} />
                <span>Performance Ratings</span>
              </div>
              <div className="info-grid p-4">
                {/* Quality Rating */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Award size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Quality Rating</span>
                    <div className="mt-1">{getRatingStars(supplier.qualityRating || 0)}</div>
                  </div>
                </div>

                {/* Delivery Rating */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Award size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Delivery Rating</span>
                    <div className="mt-1">{getRatingStars(supplier.deliveryRating || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 5: Bank Details */}
          <Col xs={12}>
            <div className="supplier-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="supplier-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <CreditCard size={18} />
                <span>Bank Details</span>
              </div>
              <div className="info-grid p-4">
                {/* Bank Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Bank Name</span>
                    <span className="info-val fw-semibold text-dark">{supplier.bankDetails?.bankName || 'Not specified'}</span>
                  </div>
                </div>

                {/* Branch */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Branch</span>
                    <span className="info-val fw-semibold text-dark">{supplier.bankDetails?.branch || 'Not specified'}</span>
                  </div>
                </div>

                {/* Account Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <CreditCard size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Account Number</span>
                    <span className="info-val fw-semibold text-dark">{supplier.bankDetails?.accountNumber || 'Not specified'}</span>
                  </div>
                </div>

                {/* IFSC Code */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">IFSC Code</span>
                    <span className="info-val fw-semibold text-dark">{supplier.bankDetails?.ifscCode || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 6: Performance Metrics */}
          <Col xs={12}>
            <div className="supplier-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="supplier-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <TrendingUp size={18} />
                <span>Performance Overview</span>
              </div>
              <div className="p-4">
                <Row className="g-3">
                  {/* Total Orders */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0f7ff', border: '1px solid #dbeafe', minHeight: '120px' }}>
                      <ShoppingCart size={24} className="text-primary mb-2" />
                      <h3 className="fw-bold mb-0 text-primary">{supplier.totalOrders || 0}</h3>
                      <span className="text-muted small fw-medium mt-1">Total Orders</span>
                    </div>
                  </Col>
                  {/* Total Purchase Value */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', minHeight: '120px' }}>
                      <DollarSign size={24} className="text-success mb-2" />
                      <h3 className="fw-bold mb-0 text-success">₹{(supplier.totalPurchaseValue || 0).toLocaleString('en-IN')}</h3>
                      <span className="text-muted small fw-medium mt-1">Total Purchase Value</span>
                    </div>
                  </Col>
                  {/* Last Order Date */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', minHeight: '120px' }}>
                      <Calendar size={24} className="text-info mb-2" />
                      <h3 className="fw-bold mb-0 text-info" style={{ fontSize: '1.2rem' }}>
                        {supplier.lastOrderDate
                          ? new Date(supplier.lastOrderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'No orders yet'}
                      </h3>
                      <span className="text-muted small fw-medium mt-1">Last Order Date</span>
                    </div>
                  </Col>
                  {/* Created Date */}
                  <Col lg={3} md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', minHeight: '120px' }}>
                      <Calendar size={24} className="text-warning mb-2" />
                      <h3 className="fw-bold mb-0 text-warning" style={{ fontSize: '1.2rem' }}>
                        {supplier.createdAt
                          ? new Date(supplier.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : supplier.createdDate || 'Not available'}
                      </h3>
                      <span className="text-muted small fw-medium mt-1">Created Date</span>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>

          {/* Card 7: Additional Notes */}
          {supplier.notes && (
            <Col xs={12}>
              <div className="supplier-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="supplier-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <FileText size={18} />
                  <span>Additional Notes</span>
                </div>
                <div className="p-4">
                  <p className="mb-0 text-dark fw-medium">{supplier.notes}</p>
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
              <Edit size={16} className="me-2" /> Edit Supplier
            </Button>
          )}
        </div>

        {/* Invisible Print View Container */}
        <div className="d-none d-print-block">
          <SupplierPrintView supplierData={supplier} />
        </div>

        <style>{`
          .supplier-details-modal .modal-content {
            border-radius: 16px !important;
            border: none !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            background-color: #f8fafc !important;
          }
          
          .supplier-card {
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

export default SupplierView;
