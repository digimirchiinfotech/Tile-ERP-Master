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
import { Edit, Download, Eye } from 'lucide-react';
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
    link.download = `${catalogue.name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Catalogue Details - {catalogue.name}</Modal.Title>
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
                        Catalogue Name:
                      </label>
                      <p className="mb-0">{catalogue.name}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Status:</label>
                      <Badge
                        bg={
                          catalogue.status === 'Active' ? 'success' : 'danger'
                        }
                      >
                        {catalogue.status}
                      </Badge>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Total Products:
                      </label>
                      <p className="mb-0">
                        {catalogue.totalProducts || selectedProducts.length}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Created Date:
                      </label>
                      <p className="mb-0">{catalogue.createdDate}</p>
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Description:</label>
                      <p className="mb-0">{catalogue.description}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Cover Image */}
          {catalogue.coverImage && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Cover Image</h6>
                </Card.Header>
                <Card.Body>
                  <div className="text-center">
                    <img
                      src={`${catalogue.coverImagePath || catalogue.coverImage}?token=${tokenManager.getAccessToken() || ''}`}
                      alt="Catalogue Cover"
                      className="img-fluid"
                      style={{ maxHeight: '300px', borderRadius: '0.375rem' }}
                      onError={(e) => {
                         if (!e.target.src.includes('token=')) {
                             const t = tokenManager.getAccessToken();
                             if (t) e.target.src = `${e.target.src.split('?')[0]}?token=${t}`;
                         }
                      }}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Assigned Salespersons */}
          {catalogue.assignedSalespersons &&
            catalogue.assignedSalespersons.length > 0 && (
              <Col xs={12}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0 text-primary">Assigned Salespersons</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-2">
                      {catalogue.assignedSalespersons.map(
                        (salespersonId, index) => (
                          <Badge key={index} bg="info" className="p-2">
                            Salesperson {salespersonId}
                          </Badge>
                        )
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}

          {/* Selected Products */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  Selected Products ({selectedProducts.length})
                </h6>
              </Card.Header>
              <Card.Body>
                {selectedProducts.length > 0 ? (
                  <Row className="g-3">
                    {selectedProducts.map((product) => (
                      <Col key={product.id} xs={12} sm={6} md={4} lg={3}>
                        <Card className="product-preview-card">
                          <Card.Body className="p-3">
                            <h6
                              className="mb-2 text-truncate"
                              title={product.name}
                            >
                              {product.name}
                            </h6>
                            <div className="product-details">
                              <small className="text-muted d-block">
                                <strong>Code:</strong> {product.productCode || product.product_code || 'N/A'}
                              </small>
                              <small className="text-muted d-block">
                                <strong>Ref:</strong> {product.itemRef || product.item_ref || 'N/A'}
                              </small>
                              <small className="text-muted d-block">
                                <strong>Size:</strong> {product.size}
                              </small>
                              <small className="text-muted d-block">
                                <strong>Surface:</strong> {product.surface}
                              </small>
                              <small className="text-muted d-block">
                                <strong>Factory:</strong> {product.factoryName || product.factory_name || 'N/A'}
                              </small>
                            </div>
                            <div className="mt-2">
                              <Badge bg="secondary" className="me-1">
                                {product.application}
                              </Badge>
                              <Badge
                                bg={
                                  product.status === 'Active'
                                    ? 'success'
                                    : 'danger'
                                }
                              >
                                {product.status}
                              </Badge>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-4 text-muted">
                    <p>No products selected for this catalogue</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={downloadCatalogue}>
          <Download size={16} className="me-1" />
          Download PDF
        </Button>
        {canEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit size={16} className="me-1" />
            Edit Catalogue
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

        .product-preview-card {
          transition: transform 0.2s ease;
          height: 100%;
        }

        .product-preview-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .product-details {
          margin: 0.75rem 0;
        }

        .product-details small {
          margin-bottom: 0.25rem;
        }

        @media (max-width: 768px) {
          .product-preview-card {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </Modal>
  );
}

export default CatalogueView;





