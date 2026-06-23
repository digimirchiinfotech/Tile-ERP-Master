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
import { 
  Edit, 
  Package, 
  Building, 
  Tag, 
  BookOpen, 
  Hash, 
  Globe, 
  FileText, 
  Layers, 
  Maximize, 
  Palette, 
  Layout, 
  Scale, 
  Grid, 
  Inbox, 
  CheckCircle,
  Image as ImageIcon,
  Eye,
  Download,
  File
} from 'lucide-react';
import { useState } from 'react';
import { tokenManager } from '../../utils/tokenManager.js';
import { resolveImageUrl } from '../../utils/urlHelper.js';
import Button from '../shared/Button.jsx';

function ProductView({ product, onClose, onEdit, canEdit }) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  if (!product) return null;

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openImageModal = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const downloadFile = (file, filename) => {
    const link = document.createElement('a');
    const token = tokenManager.getAccessToken();
    const url = file.url || file;
    link.href = token ? `${url}?token=${token}` : url;
    link.download = filename || 'download';
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
    <>
      <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="product-details-modal">
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
            Products &gt; Product Details
          </div>

          {/* ── Header ── */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
                <Package size={24} />
              </div>
              <div>
                <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>Product Details</h4>
                <span className="text-muted small">View complete product specifications, packing, and images</span>
              </div>
            </div>
            <div className="d-flex gap-2">
              {canEdit && (
                <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                  <Edit size={16} className="me-2" /> Edit Product
                </Button>
              )}
            </div>
          </div>

          <Row className="g-4">
            {/* Card 1: Basic Information */}
            <Col xs={12}>
              <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <Package size={18} />
                  <span>Basic Information</span>
                </div>
                <div className="info-grid p-4">
                  <InfoCell icon={Building} label="Factory Name" value={product.factoryName || 'N/A'} />
                  <InfoCell icon={Tag} label="Factory Product Name" value={product.factoryProductName || 'N/A'} />
                  <InfoCell icon={Package} label="Product Name" value={product.name || 'N/A'} />
                  <InfoCell icon={Tag} label="Company Product Name" value={product.companyProductName || 'N/A'} />
                  <InfoCell icon={BookOpen} label="Catalogue" value={product.catalogueName || product.catalogue || 'N/A'} />
                  <InfoCell icon={Hash} label="Product Code" value={product.productCode || 'N/A'} />
                  <InfoCell icon={Globe} label="HS Code" value={product.hsCode || 'N/A'} />
                </div>
              </div>
            </Col>

            {/* Description */}
            {product.description && (
              <Col xs={12}>
                <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                  <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                    <FileText size={18} />
                    <span>Description</span>
                  </div>
                  <div className="p-4">
                    <p className="mb-0 text-dark fw-medium" style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>
                  </div>
                </div>
              </Col>
            )}

            {/* Specifications */}
            <Col xs={12}>
              <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <Layers size={18} />
                  <span>Product Specifications</span>
                </div>
                <div className="info-grid p-4">
                  <InfoCell icon={Layers} label="Category" value={product.category || 'N/A'} />
                  
                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Maximize size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Size</span>
                      <div className="mt-1">
                        {Array.isArray(product.size) ? (
                          product.size.map((size, index) => (
                            <Badge key={index} bg="primary" className="me-1 mb-1 rounded-pill px-3 py-1.5">{size}</Badge>
                          ))
                        ) : (
                          <Badge bg="primary" className="rounded-pill px-3 py-1.5">{product.size || 'N/A'}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Palette size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Surface</span>
                      <div className="mt-1">
                        {Array.isArray(product.surface) ? (
                          product.surface.map((surface, index) => (
                            <Badge key={index} bg="secondary" className="me-1 mb-1 rounded-pill px-3 py-1.5">{surface}</Badge>
                          ))
                        ) : (
                          <Badge bg="secondary" className="rounded-pill px-3 py-1.5">{product.surface || 'N/A'}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <InfoCell icon={Layers} label="Thickness" value={product.thickness || 'N/A'} />
                  
                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Layout size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Application</span>
                      <div className="mt-1">
                        {Array.isArray(product.application) ? (
                          product.application.map((app, index) => (
                            <Badge key={index} bg="info" className="me-1 mb-1 rounded-pill px-3 py-1.5">{app}</Badge>
                          ))
                        ) : (
                          <Badge bg="info" className="rounded-pill px-3 py-1.5">{product.application || 'N/A'}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Packing Information */}
            <Col xs={12}>
              <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <Package size={18} />
                  <span>Packing Information</span>
                </div>
                <div className="info-grid p-4">
                  <InfoCell icon={Package} label="Box Pcs" value={product.boxPcs || product.box_pcs || product.boxPC || 0} />
                  <InfoCell icon={Scale} label="Box Weight" value={(product.boxWeight || product.box_weight || product.defaultPerBoxWeight || product.default_per_box_weight) ? `${(product.boxWeight || product.box_weight || product.defaultPerBoxWeight || product.default_per_box_weight).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})} kg` : '0.00 kg'} />
                  <InfoCell icon={Grid} label="SQM per Box" value={product.sqmPerBox || product.sqm_per_box || 0} />
                  <InfoCell icon={Layers} label="Boxes per Big Pallet" value={product.boxesPerPallet || product.defaultBoxesPerPallet || product.boxes_per_pallet || 0} />
                  <InfoCell icon={Inbox} label="Boxes per Kathali" value={product.defaultBoxesPerKathali || product.default_boxes_per_kathali || 0} />
                  <InfoCell icon={Scale} label="Per Box Weight" value={product.defaultPerBoxWeight || product.default_per_box_weight || product.boxWeight || product.box_weight || 0 + ' kg'} />
                  <InfoCell icon={Scale} label="Per Pallet Weight" value={(product.defaultPerPalletWeight || product.default_per_pallet_weight || 0) + ' kg'} />
                  
                  <div className="info-cell d-flex align-items-center gap-3">
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <CheckCircle size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Status</span>
                      <div className="mt-1">
                        <Badge bg={product.status === 'Active' ? 'success' : 'danger'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {(product.status || 'Active').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Product Images */}
            {product.images && product.images.length > 0 && (
              <Col xs={12}>
                <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                  <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                    <ImageIcon size={18} />
                    <span>Product Images</span>
                  </div>
                  <div className="p-4">
                    <Row className="g-3">
                      {product.images.map((image, index) => (
                        <Col key={index} xs={6} sm={4} md={3} lg={2}>
                          <div className="image-thumbnail-container">
                            <img
                              src={`${resolveImageUrl(image.url || image)}?token=${tokenManager.getAccessToken() || ''}`}
                              alt={`Product ${index + 1}`}
                              onError={(e) => {
                                 if (!e.target.src.includes('token=')) {
                                     const t = tokenManager.getAccessToken();
                                     if (t) e.target.src = `${e.target.src.split('?')[0]}?token=${t}`;
                                 }
                              }}
                              className="image-thumbnail"
                              onClick={() => openImageModal(image)}
                            />
                            <div className="image-overlay">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openImageModal(image)}
                                className="border-white text-white"
                              >
                                <Eye size={14} className="me-1" /> View
                              </Button>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </div>
              </Col>
            )}

            {/* Product Documents */}
            {product.pdfs && product.pdfs.length > 0 && (
              <Col xs={12}>
                <div className="user-card shadow-sm border rounded-3 overflow-hidden bg-white">
                  <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                    <File size={18} />
                    <span>Product Documents</span>
                  </div>
                  <div className="p-4">
                    <Row className="g-3">
                      {product.pdfs.map((pdf, index) => (
                        <Col key={index} xs={12} sm={6} md={4}>
                          <div className="pdf-item d-flex align-items-center p-3 border rounded shadow-sm bg-light">
                            <div className="pdf-icon me-3">
                              <div className="bg-danger text-white rounded p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                <FileText size={20} />
                              </div>
                            </div>
                            <div className="pdf-info flex-grow-1 overflow-hidden">
                              <h6 className="mb-1 text-truncate fw-bold text-dark" title={pdf.name}>
                                {pdf.name}
                              </h6>
                              <small className="text-muted">
                                {formatFileSize(pdf.size)}
                              </small>
                            </div>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => downloadFile(pdf, pdf.name)}
                              className="ms-2 rounded-circle p-2 d-flex align-items-center justify-content-center"
                              style={{ width: '36px', height: '36px' }}
                            >
                              <Download size={16} />
                            </Button>
                          </div>
                        </Col>
                      ))}
                    </Row>
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
                <Edit size={16} className="me-2" /> Edit Product
              </Button>
            )}
          </div>

        </Modal.Body>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
        contentClassName="bg-transparent border-0"
      >
        <Modal.Header closeButton variant="white" className="border-0 pb-0">
        </Modal.Header>
        <Modal.Body className="text-center p-0">
          {selectedImage && (
            <img
              src={`${resolveImageUrl(selectedImage.url || selectedImage)}?token=${tokenManager.getAccessToken() || ''}`}
              alt="Product Preview"
              onError={(e) => {
                 if (!e.target.src.includes('token=')) {
                     const t = tokenManager.getAccessToken();
                     if (t) e.target.src = `${e.target.src.split('?')[0]}?token=${t}`;
                 }
              }}
              className="img-fluid rounded shadow-lg"
              style={{ maxHeight: '85vh', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
      </Modal>

      <style>{`
        .product-details-modal .modal-content {
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

        .image-thumbnail-container {
          position: relative;
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .image-thumbnail {
          width: 100%;
          height: 140px;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .image-thumbnail-container:hover .image-thumbnail {
          transform: scale(1.05);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-thumbnail-container:hover .image-overlay {
          opacity: 1;
        }

        .pdf-item {
          transition: all 0.2s ease;
          border-color: #e2e8f0 !important;
        }

        .pdf-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>
    </>
  );
}

export default ProductView;




