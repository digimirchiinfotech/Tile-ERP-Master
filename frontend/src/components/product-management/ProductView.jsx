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

import { Modal, Button, Row, Col, Badge, Card } from 'react-bootstrap';
import { Edit, X, Download, Eye } from 'lucide-react';
import { useState } from 'react';
import { tokenManager } from '../../utils/tokenManager.js';

function ProductView({ product, onClose, onEdit, canEdit }) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  if (!product) return null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
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

  return (
    <>
      <Modal show={true} onHide={onClose} size="xl" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            Product Details - {product.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Row className="g-4">
            {/* Basic Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Basic Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Factory Name:
                        </label>
                        <p className="mb-0">{product.factoryName || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Factory Product Name:
                        </label>
                        <p className="mb-0">{product.factoryProductName || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Product Name:
                        </label>
                        <p className="mb-0">
                          {product.name || 'N/A'}
                        </p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Company Product Name:</label>
                        <p className="mb-0">
                          {product.companyProductName || 'N/A'}
                        </p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Catalogue:</label>
                        <p className="mb-0">
                          {product.catalogueName || product.catalogue || 'N/A'}
                        </p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Product Code:</label>
                        <p className="mb-0">{product.productCode || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">HS Code:</label>
                        <p className="mb-0">{product.hsCode || 'N/A'}</p>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Description */}
            {product.description && (
              <Col xs={12}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0 text-primary">Description</h6>
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-0">{product.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            )}

            {/* Specifications */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Product Specifications</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Category:</label>
                        <p className="mb-0">{product.category || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Size:</label>
                        <div className="mt-1">
                          {Array.isArray(product.size) ? (
                            product.size.map((size, index) => (
                              <Badge
                                key={index}
                                bg="primary"
                                className="me-1 mb-1"
                              >
                                {size}
                              </Badge>
                            ))
                          ) : (
                            <Badge bg="primary">{product.size || 'N/A'}</Badge>
                          )}
                        </div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Surface:</label>
                        <div className="mt-1">
                          {Array.isArray(product.surface) ? (
                            product.surface.map((surface, index) => (
                              <Badge
                                key={index}
                                bg="secondary"
                                className="me-1 mb-1"
                              >
                                {surface}
                              </Badge>
                            ))
                          ) : (
                            <Badge bg="secondary">{product.surface || 'N/A'}</Badge>
                          )}
                        </div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Thickness:</label>
                        <p className="mb-0">{product.thickness || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Application:
                        </label>
                        <div className="mt-1">
                          {Array.isArray(product.application) ? (
                            product.application.map((app, index) => (
                              <Badge
                                key={index}
                                bg="info"
                                className="me-1 mb-1"
                              >
                                {app}
                              </Badge>
                            ))
                          ) : (
                            <Badge bg="info">{product.application || 'N/A'}</Badge>
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Packing Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Packing Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Box Pcs:</label>
                        <p className="mb-0">
                          {product.boxPcs || product.box_pcs || product.boxPC || 0}
                        </p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Box Weight:
                        </label>
                        <p className="mb-0">{(product.boxWeight || product.box_weight || product.defaultPerBoxWeight || product.default_per_box_weight) ? `${(product.boxWeight || product.box_weight || product.defaultPerBoxWeight || product.default_per_box_weight).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})} kg` : '0.00 kg'}</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">SQM per Box:</label>
                        <p className="mb-0">{product.sqmPerBox || product.sqm_per_box || 0}</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Boxes per Big Pallet:
                        </label>
                        <p className="mb-0">{product.boxesPerPallet || product.defaultBoxesPerPallet || product.boxes_per_pallet || 0}</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Boxes per Kathali:
                        </label>
                        <p className="mb-0">{product.defaultBoxesPerKathali || product.default_boxes_per_kathali || 0}</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Per Box Weight:
                        </label>
                        <p className="mb-0">{product.defaultPerBoxWeight || product.default_per_box_weight || product.boxWeight || product.box_weight || 0} kg</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Per Pallet Weight:
                        </label>
                        <p className="mb-0">{product.defaultPerPalletWeight || product.default_per_pallet_weight || 0} kg</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">Status:</label>
                        <Badge
                          bg={
                            product.status === 'Active' ? 'success' : 'danger'
                          }
                        >
                          {product.status}
                        </Badge>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>



            {/* Product Images */}
            {product.images && product.images.length > 0 && (
              <Col xs={12}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0 text-primary">Product Images</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      {product.images.map((image, index) => (
                        <Col key={index} xs={6} sm={4} md={3} lg={2}>
                          <div className="image-thumbnail-container">
                            <img
                              src={`${image.url || image}?token=${tokenManager.getAccessToken() || ''}`}
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
                              >
                                <Eye size={14} />
                              </Button>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            )}

            {/* Product Documents */}
            {product.pdfs && product.pdfs.length > 0 && (
              <Col xs={12}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0 text-primary">Product Documents</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      {product.pdfs.map((pdf, index) => (
                        <Col key={index} xs={12} sm={6} md={4}>
                          <div className="pdf-item d-flex align-items-center p-3 border rounded">
                            <div className="pdf-icon me-3">
                              <div className="bg-danger text-white rounded p-2">
                                PDF
                              </div>
                            </div>
                            <div className="pdf-info flex-grow-1">
                              <h6
                                className="mb-1 text-truncate"
                                title={pdf.name}
                              >
                                {pdf.name}
                              </h6>
                              <small className="text-muted">
                                {formatFileSize(pdf.size)}
                              </small>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(pdf, pdf.name)}
                            >
                              <Download size={14} />
                            </Button>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          {canEdit && (
            <Button variant="primary" onClick={onEdit}>
              <Edit size={16} className="me-1" />
              Edit Product
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedImage && (
            <img
              src={`${selectedImage.url || selectedImage}?token=${tokenManager.getAccessToken() || ''}`}
              alt="Product"
              onError={(e) => {
                 if (!e.target.src.includes('token=')) {
                     const t = tokenManager.getAccessToken();
                     if (t) e.target.src = `${e.target.src.split('?')[0]}?token=${t}`;
                 }
              }}
              className="img-fluid"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

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

        .image-thumbnail-container {
          position: relative;
          cursor: pointer;
          border-radius: 0.375rem;
          overflow: hidden;
        }

        .image-thumbnail {
          width: 100%;
          height: 120px;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .image-thumbnail:hover {
          transform: scale(1.05);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
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
          transition: transform 0.2s ease;
        }

        .pdf-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .pdf-icon div {
          font-size: 0.75rem;
          font-weight: bold;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .image-thumbnail {
            height: 80px;
          }
        }
      `}</style>
    </>
  );
}

export default ProductView;




