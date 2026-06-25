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
import { Edit, Download, Eye, BookOpen, Package, Users, Info, Hash, CheckCircle, FileText, Calendar, Image as ImageIcon } from 'lucide-react';
import { tokenManager } from '../../utils/tokenManager';

function CatalogueView({ catalogue, onClose, onEdit, canEdit, products = [] }) {
  if (!catalogue) return null;

  const selectedProducts = catalogue.products || [];

  const downloadCatalogue = () => {
    if (!catalogue.pdfFilePath) return;
    const link = document.createElement('a');
    const token = tokenManager.getAccessToken();
    const url = catalogue.pdfFilePath.startsWith('http') 
      ? catalogue.pdfFilePath 
      : `${catalogue.pdfFilePath}`;
    link.href = token ? `${url}?token=${token}` : url;
    link.download = `${catalogue.name.replace(/\\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const InfoCell = ({ icon: Icon, label, value }) => (
    <div className="info-cell d-flex align-items-center gap-3">
      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
        <Icon size={18} />
      </div>
      <div className="info-text-wrapper">
        <span className="info-label text-muted small d-block text-uppercase">{label}</span>
        <span className="info-val fw-semibold text-dark">{value}</span>
      </div>
    </div>
  );

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="catalogue-details-modal">
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
          Catalogues &gt; Catalogue Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>Catalogue Details</h4>
              <span className="text-muted small">View complete catalogue information and linked products</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={downloadCatalogue} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Download size={16} className="me-2 text-secondary" /> Download PDF
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit Catalogue
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Basic Information */}
          <Col xs={12}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Info size={18} />
                <span>Basic Information</span>
              </div>
              <div className="info-grid p-4">
                <InfoCell icon={BookOpen} label="Catalogue Name" value={catalogue.name || 'N/A'} />
                
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <CheckCircle size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Status</span>
                    <div className="mt-1">
                      <Badge bg={catalogue.status === 'Active' ? 'success' : 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {(catalogue.status || 'Active').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <InfoCell icon={Package} label="Total Products" value={catalogue.totalProducts || selectedProducts.length || 0} />
                <InfoCell icon={Calendar} label="Created Date" value={catalogue.createdDate || 'N/A'} />
              </div>
            </div>
          </Col>

          {/* Description */}
          {catalogue.description && (
            <Col xs={12}>
              <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <FileText size={18} />
                  <span>Description</span>
                </div>
                <div className="p-4">
                  <p className="mb-0 text-dark fw-medium">{catalogue.description}</p>
                </div>
              </div>
            </Col>
          )}

          {/* Cover Image */}
          {catalogue.coverImage && (
            <Col xs={12}>
              <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <ImageIcon size={18} />
                  <span>Cover Image</span>
                </div>
                <div className="p-4 text-center">
                  <img
                    src={`${catalogue.coverImagePath || catalogue.coverImage}?token=${tokenManager.getAccessToken() || ''}`}
                    alt="Catalogue Cover"
                    className="img-fluid border rounded-3 shadow-sm"
                    style={{ maxHeight: '300px' }}
                    onError={(e) => {
                       if (!e.target.src.includes('token=')) {
                           const t = tokenManager.getAccessToken();
                           if (t) e.target.src = `${e.target.src.split('?')[0]}?token=${t}`;
                       }
                    }}
                  />
                </div>
              </div>
            </Col>
          )}

          {/* Assigned Salespersons */}
          {catalogue.assignedSalespersons && catalogue.assignedSalespersons.length > 0 && (
            <Col xs={12}>
              <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <Users size={18} />
                  <span>Assigned Salespersons</span>
                </div>
                <div className="p-4 d-flex flex-wrap gap-2">
                  {catalogue.assignedSalespersons.map((salespersonId, index) => (
                    <Badge key={index} bg="info" className="px-3 py-2 rounded-pill fw-medium fs-6 shadow-sm border border-info border-opacity-25 text-white">
                      Salesperson {salespersonId}
                    </Badge>
                  ))}
                </div>
              </div>
            </Col>
          )}

          {/* Selected Products */}
          <Col xs={12}>
            <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Package size={18} />
                <span>Selected Products ({selectedProducts.length})</span>
              </div>
              <div className="p-4 bg-light">
                {selectedProducts.length > 0 ? (
                  <Row className="g-3">
                    {selectedProducts.map((product) => (
                      <Col key={product.id} xs={12} sm={6} md={4} lg={3}>
                        <div className="bg-white p-3 rounded-4 shadow-sm h-100 border border-light-subtle product-preview-card">
                          <h6 className="mb-3 text-truncate fw-bold text-dark" title={product.name}>
                            {product.name}
                          </h6>
                          <div className="product-details d-flex flex-column gap-2 mb-3">
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted fw-medium">Code:</span>
                              <span className="fw-semibold">{product.productCode || product.product_code || 'N/A'}</span>
                            </div>
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted fw-medium">Ref:</span>
                              <span className="fw-semibold text-truncate ms-2" style={{maxWidth: '120px'}} title={product.itemRef || product.item_ref || 'N/A'}>{product.itemRef || product.item_ref || 'N/A'}</span>
                            </div>
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted fw-medium">Size:</span>
                              <span className="fw-semibold">{product.size}</span>
                            </div>
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted fw-medium">Surface:</span>
                              <span className="fw-semibold">{product.surface}</span>
                            </div>
                          </div>
                          <div className="mt-auto pt-3 border-top d-flex gap-1 flex-wrap">
                            <Badge bg="secondary" className="px-2 py-1 rounded-pill">{product.application}</Badge>
                            <Badge bg={product.status === 'Active' ? 'success' : 'danger'} className="px-2 py-1 rounded-pill">{product.status}</Badge>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <BookOpen size={48} className="mb-3 opacity-50" />
                    <p className="mb-0 fw-medium">No products selected for this catalogue</p>
                  </div>
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
        </div>

      </Modal.Body>

      <style>{`
        .catalogue-details-modal .modal-content {
          border-radius: 16px !important;
          border: none !important;
          box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
          background-color: #f8fafc !important;
        }
        
        .user-card {
          border: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px 30px;
        }

        @media (max-width: 992px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        .info-icon-wrapper {
          transition: all 0.2s ease;
        }

        .info-cell:hover .info-icon-wrapper {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.1);
        }

        .product-preview-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .product-preview-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
        }
      `}</style>
    </Modal>
  );
}

export default CatalogueView;
