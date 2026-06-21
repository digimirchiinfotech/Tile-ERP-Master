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
import { Modal, Row, Col, Badge, Spinner } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import {
  Edit,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Target,
  Percent,
  Printer,
  X,
  FileText,
  Calendar,
  Layers,
  Award,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useCatalogues } from '../../hooks/useCatalogues';
import { formatDisplayDate } from '../../utils/formatters.js';
import api from '../../services/api';
import SalespersonPrintView from './SalespersonPrintView.jsx';

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

  const handlePrint = () => {
    window.print();
  };

  const getAssignedCatalogues = () => {
    return catalogues.filter((catalogue) =>
      salesperson.assignedCatalogues?.includes(catalogue.id)
    );
  };

  const assignedCatalogues = getAssignedCatalogues();

  return (
    <Modal show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="salesperson-details-modal">
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
          Salespersons &gt; Salesperson Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <User size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>Salesperson Details</h4>
              <span className="text-muted small">View complete profile details, targets, commissions, and performance</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handlePrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit Salesperson
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Personal Information */}
          <Col xs={12}>
            <div className="salesperson-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="salesperson-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <User size={18} />
                <span>Personal Information</span>
              </div>
              <div className="info-grid p-4">
                {/* Full Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <User size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Full Name</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.name || '-'}</span>
                  </div>
                </div>

                {/* Employee ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Employee ID</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.employeeId || '-'}</span>
                  </div>
                </div>

                {/* Email ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Email ID</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.emailId || '-'}</span>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Contact Number</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.contactNumber || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 2: Professional Information */}
          <Col xs={12}>
            <div className="salesperson-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="salesperson-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Building size={18} />
                <span>Professional Information</span>
              </div>
              <div className="info-grid p-4">
                {/* Department */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Building size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Department</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.department || '-'}</span>
                  </div>
                </div>

                {/* Country */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Country</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.country || '-'}</span>
                  </div>
                </div>

                {/* City */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">City</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.city || 'Not specified'}</span>
                  </div>
                </div>

                {/* Sales Target */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Target size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Sales Target</span>
                    <span className="info-val fw-bold text-primary">${salesperson.salesTarget?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Commission */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Percent size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Commission</span>
                    <span className="info-val fw-semibold text-dark">{salesperson.commission}%</span>
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
                      <Badge bg={salesperson.status === 'Active' ? 'success' : 'danger'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {(salesperson.status || 'Active').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Created Date */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Created Date</span>
                    <span className="info-val fw-semibold text-dark">{formatDisplayDate(salesperson.createdDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 3: Assigned Catalogues */}
          <Col xs={12}>
            <div className="salesperson-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="salesperson-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Layers size={18} />
                <span>Assigned Catalogues ({assignedCatalogues.length})</span>
              </div>
              <div className="p-4">
                {assignedCatalogues.length > 0 ? (
                  <Row className="g-3">
                    {assignedCatalogues.map((catalogue) => (
                      <Col key={catalogue.id} xs={12} sm={6} md={4}>
                        <div className="p-3 border rounded-3 bg-light h-100 transition-hover">
                          <h6 className="fw-bold text-dark mb-1">{catalogue.name}</h6>
                          <p className="text-muted small mb-2 text-truncate-2" style={{ minHeight: '36px' }}>
                            {catalogue.description || 'No description provided'}
                          </p>
                          <div className="d-flex justify-content-between align-items-center pt-2 border-top border-light-subtle">
                            <span className="text-muted small fw-medium">
                              {catalogue.totalProducts || 0} products
                            </span>
                            <Badge bg="success" className="rounded-pill px-2 py-1">Active</Badge>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-4 text-muted border rounded-3 bg-light">
                    <Layers size={32} className="mb-2 text-muted" style={{ opacity: 0.5 }} />
                    <p className="mb-0 small fw-medium">No catalogues assigned</p>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Card 4: Performance Metrics */}
          <Col xs={12}>
            <div className="salesperson-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="salesperson-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <TrendingUp size={18} />
                <span>Performance Overview</span>
              </div>
              <div className="p-4">
                {loadingMetrics ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" size="sm" variant="primary" />
                    <p className="mt-2 text-muted small mb-0">Loading metrics...</p>
                  </div>
                ) : (
                  <Row className="g-3">
                    {/* Leads Created */}
                    <Col lg={3} md={6}>
                      <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                           style={{ backgroundColor: '#f0f7ff', border: '1px solid #dbeafe', minHeight: '120px' }}>
                        <Award size={24} className="text-primary mb-2" />
                        <h3 className="fw-bold mb-0 text-primary">{metrics?.leadsCreated || 0}</h3>
                        <span className="text-muted small fw-medium mt-1">Leads Created</span>
                      </div>
                    </Col>
                    {/* Leads Converted */}
                    <Col lg={3} md={6}>
                      <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                           style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', minHeight: '120px' }}>
                        <Award size={24} className="text-success mb-2" />
                        <h3 className="fw-bold mb-0 text-success">{metrics?.leadsConverted || 0}</h3>
                        <span className="text-muted small fw-medium mt-1">Leads Converted</span>
                      </div>
                    </Col>
                    {/* Conversion Rate */}
                    <Col lg={3} md={6}>
                      <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                           style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', minHeight: '120px' }}>
                        <TrendingUp size={24} className="text-info mb-2" />
                        <h3 className="fw-bold mb-0 text-info">{metrics?.conversionRate || '0%'}</h3>
                        <span className="text-muted small fw-medium mt-1">Conversion Rate</span>
                      </div>
                    </Col>
                    {/* Total Sales */}
                    <Col lg={3} md={6}>
                      <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 text-center" 
                           style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', minHeight: '120px' }}>
                        <Target size={24} className="text-warning mb-2" />
                        <h3 className="fw-bold mb-0 text-warning">${(metrics?.totalSales || 0).toLocaleString()}</h3>
                        <span className="text-muted small fw-medium mt-1">Total Sales</span>
                      </div>
                    </Col>
                  </Row>
                )}
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
              <Edit size={16} className="me-2" /> Edit Salesperson
            </Button>
          )}
        </div>

        {/* Invisible Print View Container */}
        <div className="d-none d-print-block">
          <SalespersonPrintView salespersonData={salesperson} />
        </div>

        <style>{`
          .salesperson-details-modal .modal-content {
            border-radius: 16px !important;
            border: none !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            background-color: #f8fafc !important;
          }
          
          .salesperson-card {
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

          .transition-hover {
            transition: all 0.2s ease;
          }

          .transition-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border-color: #cbd5e1 !important;
          }

          .text-truncate-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;  
            overflow: hidden;
          }
        `}</style>
      </Modal.Body>
    </Modal>
  );
}

export default SalespersonView;
