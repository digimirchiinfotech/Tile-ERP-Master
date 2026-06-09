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
import { Card, Row, Col, Form, Button, Badge, Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Camera, Package, AlertTriangle, History, Trash2, ChevronDown, ChevronUp, Info, Edit } from 'lucide-react';
import { formatNumber, formatPrice, formatWeight, formatQuantity, formatSQM } from '../../utils/formatters.js';

/**
 * Responsive Order Product Line Card Component
 * Specialized for Proforma Orders (Read-only fields except Rate)
 */
function OrderProductLineCard({
  productLine,
  index,
  products,
  onProductLineChange,
  onDelete,
  onOpenImageModal,
  currency = 'INR',
}) {
  const [showCalculated, setShowCalculated] = useState(false);

  /**
   * Get product image for display
   */
  const getProductImage = (productName) => {
    const product = products.find((p) => p.name === productName);
    return product?.images?.[0];
  };

  const productImage = getProductImage(productLine.product);

  return (
    <Card className="product-line-card mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
      {/* Card Header with Product Info */}
      <Card.Header className="bg-light py-3 px-4 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
            <Package size={18} className="text-primary" />
          </div>
          <div>
            <span className="fw-bold text-dark d-block">
              Line Item #{index + 1}
            </span>
            <small className="text-muted fw-medium">{productLine.product}</small>
          </div>
        </div>
        <Badge bg="primary" className="rounded-pill px-3 py-2">
          {formatPrice(productLine.amount, currency)}
        </Badge>
      </Card.Header>

      <Card.Body className="p-4">
        <Row className="g-4">
          {/* Product Image & Key Specs */}
          <Col xs={12} md={4} className="text-center text-md-start">
            {productImage ? (
              <div className="position-relative d-inline-block">
                <img
                  src={productImage.url}
                  alt={productLine.product}
                  className="rounded-4 shadow-sm"
                  style={{ width: '100%', maxWidth: '160px', height: '160px', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => onOpenImageModal(productImage)}
                />
                <Button
                  size="sm"
                  variant="white"
                  className="position-absolute bottom-0 end-0 m-2 shadow-sm rounded-circle p-2"
                  onClick={() => onOpenImageModal(productImage)}
                >
                  <Camera size={16} className="text-primary" />
                </Button>
              </div>
            ) : (
              <div
                className="bg-light rounded-4 d-flex flex-column align-items-center justify-content-center mx-auto mx-md-0"
                style={{ width: '160px', height: '160px', border: '2px dashed #cbd5e1' }}
              >
                <Package size={32} className="text-muted mb-2 opacity-50" />
                <span className="text-muted small fw-medium">No Image</span>
              </div>
            )}

            <div className="mt-3">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small fw-bold text-uppercase">Factory Product Name:</span>
                <span className="fw-bold small">{productLine.factoryProductName || productLine.itemRef || 'N/A'}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small fw-bold text-uppercase">HSN Code:</span>
                <span className="fw-bold small text-uppercase">{productLine.hsnCode || 'N/A'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small fw-bold text-uppercase">Size:</span>
                <span className="fw-bold small">{productLine.size || 'N/A'}</span>
              </div>
            </div>
          </Col>

          {/* Pricing & Configuration */}
          <Col xs={12} md={8}>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group className="bg-warning bg-opacity-10 p-3 rounded-4 border border-warning border-opacity-25">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Purchase Rate is mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold text-danger small text-uppercase mb-2" style={{cursor: 'help'}}>
                      Purchase Rate ({currency}) * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={productLine.rate}
                    onChange={(e) => onProductLineChange(index, 'rate', e.target.value)}
                    className="form-control-lg border-0 bg-white fw-bold shadow-sm"
                    style={{ color: '#92400e' }}
                  />
                  <Form.Text className="text-muted small">Edit the purchase rate for this order</Form.Text>
                </Form.Group>
              </Col>

              <Col xs={6}>
                <div className="p-3 bg-light rounded-4 border">
                  <span className="text-muted d-block small fw-bold text-uppercase mb-1">
                    Total Boxes
                  </span>
                  <span className="fs-5 fw-bold text-dark">
                    {formatQuantity(productLine.totalBoxes)} Boxes
                  </span>
                </div>
              </Col>
              <Col xs={6}>
                <div className="p-3 bg-light rounded-4 border">
                  <span className="text-muted d-block small fw-bold text-uppercase mb-1">
                    {productLine.productType === 'sanitaryware' ? 'Total CBM' : 'Total SQM'}
                  </span>
                  <span className="fs-5 fw-bold text-dark">
                    {productLine.productType === 'sanitaryware' 
                      ? `${parseFloat(productLine.sqmAuto || 0).toFixed(3)} CBM` 
                      : formatSQM(productLine.sqmAuto)}
                  </span>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
 
        {/* Collapsible Details */}
        <div className="mt-4 pt-4 border-top">
          <Button
            variant="link"
            className="text-decoration-none text-primary p-0 d-flex align-items-center fw-bold small text-uppercase"
            onClick={() => setShowCalculated(!showCalculated)}
          >
            {showCalculated ? <ChevronUp size={16} className="me-2" /> : <ChevronDown size={16} className="me-2" />}
            {showCalculated ? 'Hide Specifications' : 'Show Full Specifications'}
          </Button>
 
          <Collapse in={showCalculated}>
            <div className="mt-3">
              <Row className="g-2">
                <Col xs={6} md={3}>
                  <div className="p-2 border-bottom">
                    <small className="text-muted d-block">
                      {productLine.productType === 'sanitaryware' ? 'Color' : 'Surface'}
                    </small>
                    <span className="fw-bold small">{productLine.surface || 'N/A'}</span>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="p-2 border-bottom">
                    <small className="text-muted d-block">
                      {productLine.productType === 'sanitaryware' ? 'Category' : 'Thickness'}
                    </small>
                    <span className="fw-bold small">{productLine.thickness || 'N/A'}</span>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="p-2 border-bottom">
                    <small className="text-muted d-block">
                      {productLine.productType === 'sanitaryware' ? 'Cartons' : 'Big Pallet'}
                    </small>
                    <span className="fw-bold small">
                      {productLine.productType === 'sanitaryware' 
                        ? formatQuantity(productLine.totalPallet) 
                        : productLine.bigPallet}
                    </span>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="p-2 border-bottom">
                    <small className="text-muted d-block">
                      {productLine.productType === 'sanitaryware' ? '-' : 'Kathali'}
                    </small>
                    <span className="fw-bold small">
                      {productLine.productType === 'sanitaryware' ? '-' : productLine.kathaliPallet}
                    </span>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="p-2 border-bottom text-danger">
                    <small className="text-danger d-block opacity-75">Net Weight</small>
                    <span className="fw-bold small">{formatWeight(productLine.netWeight)}</span>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="p-2 border-bottom text-danger">
                    <small className="text-danger d-block opacity-75">Gross Weight</small>
                    <span className="fw-bold small">{formatWeight(productLine.grossWeight)}</span>
                  </div>
                </Col>
              </Row>
            </div>
          </Collapse>
        </div>
      </Card.Body>

      <Card.Footer className="bg-white p-3 border-top d-flex justify-content-end">
        <Button
          variant="outline-danger"
          size="sm"
          className="rounded-3 px-3 fw-bold"
          onClick={() => onDelete(index)}
        >
          <Trash2 size={14} className="me-2" /> Remove Item
        </Button>
      </Card.Footer>

      <style>{`
        .product-line-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .product-line-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </Card>
  );
}

export default OrderProductLineCard;
