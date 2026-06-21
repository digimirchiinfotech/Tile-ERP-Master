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
  ShoppingCart,
  Calendar,
  Tag,
  Globe,
  MapPin,
  Package,
  DollarSign,
  Printer,
  X,
  FileText,
  Clock,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { formatPrice } from '../../utils/formatters.js';
import ClientOrderPrintView from './ClientOrderPrintView.jsx';

function ClientOrderView({ order, onClose, onEdit, canEdit }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    const variants = {
      Pending: 'warning',
      Processing: 'primary',
      Dispatched: 'info',
      Delivered: 'success',
      Cancelled: 'danger',
    };
    return (
      <Badge bg={variants[status] || 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
        {(status || 'PENDING').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const productLines = order.productLines || order.product_lines || [];
  const totalBoxes = productLines.reduce((sum, p) => sum + (p.quantity || p.totalBoxes || 0), 0);
  const totalValue = order.totalAmount || order.orderValue || order.amount || productLines.reduce((sum, p) => sum + (p.totalValue || p.amount || 0), 0);

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="client-order-details-modal">
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
          Client Orders &gt; Order Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <ShoppingCart size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>Order Details</h4>
              <span className="text-muted small">View complete order information, client details, items list, and totals</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handlePrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit Order
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Order Summary */}
          <Col xs={12} md={6}>
            <div className="order-card shadow-sm border rounded-3 overflow-hidden bg-white h-100">
              <div className="order-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <ShoppingCart size={18} />
                <span>Order Information</span>
              </div>
              <div className="info-grid p-4 d-flex flex-column gap-3">
                {/* Order ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Tag size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Order Number</span>
                    <span className="info-val fw-bold text-dark">{order.orderNo || order.orderId || '-'}</span>
                  </div>
                </div>

                {/* Order Date */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Order Date</span>
                    <span className="info-val fw-semibold text-dark">{formatDate(order.orderDate || order.date)}</span>
                  </div>
                </div>

                {/* Linked Invoice */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Linked Invoice</span>
                    <span className="info-val fw-semibold text-dark">{order.linkedInvoice || order.invoiceRef || order.invoice_ref || 'None'}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Clock size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Order Status</span>
                    <div className="mt-1">{getStatusBadge(order.status)}</div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 2: Billing & Shipping Details */}
          <Col xs={12} md={6}>
            <div className="order-card shadow-sm border rounded-3 overflow-hidden bg-white h-100">
              <div className="order-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <MapPin size={18} />
                <span>Billing & Shipping</span>
              </div>
              <div className="info-grid p-4 d-flex flex-column gap-3">
                {/* Client Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <ShoppingCart size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Client Firm Name</span>
                    <span className="info-val fw-bold text-dark">{order.clientName || order.supplierName || order.piClient || '-'}</span>
                  </div>
                </div>

                {/* Country */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Globe size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Country</span>
                    <span className="info-val fw-semibold text-dark">{order.country || '-'}</span>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="info-cell d-flex align-items-start gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0, marginTop: '2px' }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper w-100">
                    <span className="info-label text-muted small d-block text-uppercase">Shipping Address</span>
                    <pre className="mb-0 bg-light p-3 rounded-3 border border-light-subtle text-dark" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontWeight: 500 }}>
                      {order.shippingAddress || order.supplierAddress || order.address || 'N/A'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 3: Ordered Products & Items */}
          <Col xs={12}>
            <div className="order-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="order-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Package size={18} />
                <span>Ordered Products & Items</span>
              </div>
              <div className="p-4">
                <div className="table-responsive border rounded-3">
                  <Table striped hover className="align-middle mb-0" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-light text-secondary" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th className="p-3 border-0">Product Description</th>
                        <th className="p-3 border-0">Size/Surface</th>
                        <th className="p-3 border-0 text-center">Qty (Boxes)</th>
                        <th className="p-3 border-0 text-end">Unit Price</th>
                        <th className="p-3 border-0 text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.92rem' }}>
                      {productLines.length > 0 ? (
                        productLines.map((item, index) => {
                          const qty = item.quantity || item.totalBoxes || 0;
                          const price = item.unitPrice || item.rate || 0;
                          const amt = item.totalValue || item.amount || (qty * price);
                          return (
                            <tr key={index} className="border-top border-light-subtle">
                              <td className="p-3 fw-semibold text-dark">{item.productName || item.product || 'N/A'}</td>
                              <td className="p-3 text-muted">{item.size || '-'} / {item.surface || '-'}</td>
                              <td className="p-3 text-center fw-medium text-dark">{qty}</td>
                              <td className="p-3 text-end fw-semibold text-dark">${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-end fw-bold text-dark">${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="p-3 text-center text-muted">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 4: Financial Summary */}
          <Col xs={12}>
            <div className="order-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="order-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <TrendingUp size={18} />
                <span>Financial Overview</span>
              </div>
              <div className="p-4">
                <Row className="g-3">
                  {/* Total Boxes */}
                  <Col md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0f7ff', border: '1px solid #dbeafe', minHeight: '120px' }}>
                      <Package size={24} className="text-primary mb-2" />
                      <h3 className="fw-bold mb-0 text-primary">{totalBoxes.toLocaleString()}</h3>
                      <span className="text-muted small fw-medium mt-1">Total Quantity (Boxes)</span>
                    </div>
                  </Col>
                  {/* Total Value */}
                  <Col md={6}>
                    <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                         style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', minHeight: '120px' }}>
                      <DollarSign size={24} className="text-success mb-2" />
                      <h3 className="fw-bold mb-0 text-success">{formatPrice(totalValue, order.currency || 'USD')}</h3>
                      <span className="text-muted small fw-medium mt-1">Grand Total Value</span>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>

          {/* Notes Card */}
          {order.notes && (
            <Col xs={12}>
              <div className="order-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="order-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <FileText size={18} />
                  <span>Notes / Terms</span>
                </div>
                <div className="p-4">
                  <p className="mb-0 text-dark fw-medium" style={{ whiteSpace: 'pre-wrap' }}>{order.notes}</p>
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
              <Edit size={16} className="me-2" /> Edit Order
            </Button>
          )}
        </div>

        {/* Invisible Print View Container */}
        <div className="d-none d-print-block">
          <ClientOrderPrintView orderData={order} />
        </div>

        <style>{`
          .client-order-details-modal .modal-content {
            border-radius: 16px !important;
            border: none !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            background-color: #f8fafc !important;
          }
          
          .order-card {
            border: 1px solid #e2e8f0 !important;
            background: #ffffff !important;
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

export default ClientOrderView;
