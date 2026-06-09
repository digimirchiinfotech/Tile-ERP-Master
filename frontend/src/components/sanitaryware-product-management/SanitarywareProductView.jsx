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

import React from 'react';
import { Modal, Button, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { X, Calendar, DollarSign, Box, Minimize2, Eye } from 'lucide-react';

function SanitarywareProductView({ product, onCancel }) {
  if (!product) return null;

  // Container capacity rule estimators
  const weightLimit = 27000; // 27 Metric Tons
  const wpp = parseFloat(product.weight_per_piece || product.weightPerPiece) || 0;

  // Pieces based on Weight limit
  const pcsWeightLimit = wpp > 0 ? Math.floor(weightLimit / wpp) : 0;

  // Utilization percentages
  const utilWeight = pcsWeightLimit * wpp;

  return (
    <Modal show={true} onHide={onCancel} size="xl" centered className="product-view-modal">
      <Modal.Header closeButton className="bg-primary text-white py-3">
        <Modal.Title className="fw-bold d-flex align-items-center">
          <Eye size={20} className="me-2" />
          <span>Product Blueprint: {product.name}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4" style={{ backgroundColor: '#f8f9fa' }}>
        <Row className="g-4">
          {/* Images/Specs */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
              <div className="bg-light d-flex align-items-center justify-content-center" style={{ minHeight: '260px', position: 'relative' }}>
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0].url || product.images[0].path}
                    alt={product.name}
                    className="img-fluid w-100 h-100"
                    style={{ objectFit: 'contain', maxHeight: '300px' }}
                  />
                ) : (
                  <div className="text-center text-muted p-4">
                    <span style={{ fontSize: '4rem' }}>🚽</span>
                    <p className="small mb-0 mt-2">No product image uploaded.</p>
                  </div>
                )}
                <Badge 
                  bg={product.status === 'Active' ? 'success' : 'secondary'}
                  className="position-absolute top-0 end-0 m-3 px-3 py-2"
                  style={{ borderRadius: '8px', fontSize: '0.8rem' }}
                >
                  {product.status || 'Active'}
                </Badge>
              </div>
              <Card.Body className="bg-white border-top">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small">Category</span>
                  <span className="badge bg-primary-light text-primary fw-bold px-2 py-1">{product.category}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small">Code</span>
                  <span className="fw-bold text-dark">{product.product_code || 'N/A'}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small">HSN Code</span>
                  <span className="fw-bold text-secondary">{product.hsn_code || product.hsnCode || 'N/A'}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-muted small">Ref ID</span>
                  <span className="text-muted font-monospace small">{product.item_ref || 'N/A'}</span>
                </div>
              </Card.Body>
            </Card>


          </Col>

          {/* Details & Capacity */}
          <Col lg={8}>
            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-0 fw-bold text-dark">
                📐 Technical Attributes
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <Table borderless size="sm" className="mb-0 text-dark small">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '140px' }}>Brand:</td>
                          <td className="fw-semibold">{product.brand || 'Generic'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Collection:</td>
                          <td className="fw-semibold">{product.collection || 'Standard'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Color:</td>
                          <td className="fw-semibold">{product.color || 'White'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Material Type:</td>
                          <td className="fw-semibold">{product.material_type || product.materialType || 'Vitreous China'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Shape:</td>
                          <td className="fw-semibold">{product.shape || 'Standard'}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <Table borderless size="sm" className="mb-0 text-dark small">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '140px' }}>Flush Type:</td>
                          <td className="fw-semibold">{product.flush_type || product.flushType || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Trap Type:</td>
                          <td className="fw-semibold">{product.trap_type || product.trapType || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Mount Type:</td>
                          <td className="fw-semibold">{product.mount_type || product.mountType || 'Floor Mounted'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Seat Cover:</td>
                          <td className="fw-semibold">{product.seat_cover_type || product.seatCoverType || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Dimensions (L x W x H):</td>
                          <td className="fw-semibold">
                            {product.dimensions_l || product.dimensionsL || '0'} x {product.dimensions_w || product.dimensionsW || '0'} x {product.dimensions_h || product.dimensionsH || '0'} mm
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Calculations & Packaging info */}
            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-0 fw-bold text-dark">
                📦 Packaging Logic
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6} className="border-end">
                    <div className="p-3 text-center">
                      <span className="text-muted small d-block">Weight per Piece</span>
                      <h4 className="fw-bold text-dark mb-0 mt-1">{wpp} kg</h4>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="p-3 text-center">
                      <span className="text-muted small d-block">Pcs per Carton</span>
                      <h4 className="fw-bold text-dark mb-0 mt-1">{product.pcs_per_box || product.pcsPerBox || 1} Pcs</h4>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Container Capacity Calculations */}
            <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <Card.Header className="bg-primary text-white py-3 fw-bold">
                🚢 Container Capacity Estimates (Weight Bound)
              </Card.Header>
              <Card.Body className="p-0">
                <Table hover className="mb-0 text-dark small align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Container Size</th>
                      <th className="text-center">Max Pcs Limit</th>
                      <th className="text-center">Total Weight Est</th>
                      <th className="pe-4 text-end">Limiting Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="ps-4 fw-semibold">Standard Container (All Sizes)</td>
                      <td className="text-center fw-bold text-primary">{pcsWeightLimit} Pcs</td>
                      <td className="text-center">{utilWeight.toLocaleString()} kg</td>
                      <td className="pe-4 text-end">
                        <Badge bg="warning">Weight Bound</Badge>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="bg-light-subtle py-2">
        <Button variant="outline-secondary" onClick={onCancel} style={{ borderRadius: '8px' }}>
          Close View
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SanitarywareProductView;
