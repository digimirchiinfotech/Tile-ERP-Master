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
import { Card, Row, Col, Form, Button, Badge, Collapse } from 'react-bootstrap';
import { Camera, Package, AlertTriangle, History, Trash2, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { formatNumber, formatPrice, formatWeight, formatQuantity, formatSQM } from '../../utils/formatters.js';
import AddableDropdown from './AddableDropdown.jsx';

/**
 * Responsive Product Line Card Component
 * Displays a single product line in a card format with sections:
 * - Product Details
 * - Packaging
 * - Pricing
 * - Weights
 * - Calculated Metrics (collapsible)
 * - Actions
 */
function ProductLineCard({
  productLine,
  index,
  products,
  onProductLineChange,
  onWeightOverride,
  onDelete,
  onOpenRateHistory,
  onOpenImageModal,
  showRateHistory = false,
  currentClient = '',
  rateHistoryManager = null,
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
    <Card className="product-line-card mb-4">
      {/* Card Header with Product Info */}
      <Card.Header className="product-card-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <Package size={18} className="me-2 text-primary" />
            <span className="fw-semibold">
              Product Line #{index + 1}
              {productLine.product && (
                <span className="text-muted ms-2">- {productLine.product}</span>
              )}
            </span>
          </div>
          <Badge bg={productLine.product ? 'success' : 'warning'}>
            {productLine.product ? 'Configured' : 'Pending'}
          </Badge>
        </div>
      </Card.Header>

      <Card.Body className="p-3 p-md-4">
        {/* Product Details Section */}
        <div className="card-section mb-4">
          <h6 className="section-title mb-3">
            <Package size={16} className="me-2" />
            Product Details
          </h6>
          
          <Row className="g-3">
            {/* Product Selection with Image */}
            <Col xs={12} lg={6}>
              <Form.Group>
                <Form.Label className="form-label-sm">Product *</Form.Label>
                <Form.Select
                  size="sm"
                  value={productLine.product}
                  onChange={(e) =>
                    onProductLineChange(index, 'product', e.target.value)
                  }
                  className="product-select"
                >
                  <option value="">Select Product</option>
                  {products.filter(p => p.status !== 'Inactive' || p.name === productLine.product).map((product) => (
                    <option key={product.id} value={product.name}>
                      {product.name}
                      {product.images?.length > 0 ? ' 📷' : ' ⚠️'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {/* Product Image Display */}
              {productLine.product && productImage && (
                <div className="product-image-card mt-3">
                  <div className="image-container">
                    <img
                      src={productImage.url}
                      alt={productLine.product}
                      className="product-image"
                      onClick={() => onOpenImageModal(productImage)}
                      title="Click to view full image"
                    />
                    <div className="image-overlay">
                      <Camera size={20} className="camera-icon" />
                    </div>
                  </div>
                  <Badge bg="success" className="mt-2">
                    <Camera size={12} className="me-1" />
                    Premium
                  </Badge>
                </div>
              )}

              {productLine.product && !productImage && (
                <div className="no-image-card mt-3">
                  <div className="placeholder-box">
                    <Package size={32} className="placeholder-icon" />
                  </div>
                  <Badge bg="warning" className="mt-2">
                    <AlertTriangle size={12} className="me-1" />
                    Add Image
                  </Badge>
                  <small className="d-block text-muted mt-1">
                    Upload product image
                  </small>
                </div>
              )}
            </Col>

            {/* Product Specifications */}
            <Col xs={12} lg={6}>
              <Row className="g-3">
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm">Factory Product Name</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={productLine.factoryProductName || productLine.itemRef || ''}
                      onChange={(e) =>
                        onProductLineChange(index, 'factoryProductName', e.target.value)
                      }
                      readOnly={!!productLine.product}
                      className={productLine.product ? 'readonly-field' : ''}
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm">HSN Code</Form.Label>
                    <AddableDropdown
                      value={productLine.hsnCode || ''}
                      onChange={(val) => onProductLineChange(index, 'hsnCode', val)}
                      masterDataType="tariffCodes"
                      placeholder="Select HSN"
                      selectClassName={`text-uppercase ${productLine.product ? 'readonly-field' : ''} form-control-sm`}
                      disabled={!!productLine.product}
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm">Category</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={productLine.category || ''}
                      readOnly
                      className="readonly-field"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm">Size</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={productLine.size}
                      onChange={(e) =>
                        onProductLineChange(index, 'size', e.target.value)
                      }
                      readOnly={!!productLine.product}
                      className={productLine.product ? 'readonly-field' : ''}
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm">Surface</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={productLine.surface}
                      onChange={(e) =>
                        onProductLineChange(index, 'surface', e.target.value)
                      }
                      readOnly={!!productLine.product}
                      className={productLine.product ? 'readonly-field' : ''}
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm">Thickness</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={productLine.thickness}
                      onChange={(e) =>
                        onProductLineChange(index, 'thickness', e.target.value)
                      }
                      readOnly={!!productLine.product}
                      className={productLine.product ? 'readonly-field' : ''}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>

        {/* Packaging Section */}
        <div className="card-section mb-4">
          <h6 className="section-title mb-3">
            <Package size={16} className="me-2" />
            Packaging Configuration
          </h6>
          
          <Row className="g-3">
            <Col xs={6} md={3}>
              <Form.Group>
                <Form.Label className="form-label-sm">Big Pallet</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min="0"
                  value={productLine.bigPallet}
                  onChange={(e) =>
                    onProductLineChange(index, 'bigPallet', e.target.value)
                  }
                  className="editable-field"
                />
              </Form.Group>
            </Col>

            <Col xs={6} md={3}>
              <Form.Group>
                <Form.Label className="form-label-sm">Kathali</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min="0"
                  value={productLine.kathaliPallet}
                  onChange={(e) =>
                    onProductLineChange(index, 'kathaliPallet', e.target.value)
                  }
                  className="editable-field"
                />
              </Form.Group>
            </Col>

            <Col xs={6} md={3}>
              <Form.Group>
                <Form.Label className="form-label-sm">Boxes/Big Pallet</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min="0"
                  value={productLine.boxesPerBigPallet}
                  onChange={(e) =>
                    onProductLineChange(index, 'boxesPerBigPallet', e.target.value)
                  }
                  className="editable-field"
                />
              </Form.Group>
            </Col>

            <Col xs={6} md={3}>
              <Form.Group>
                <Form.Label className="form-label-sm">Boxes/Kathali</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min="0"
                  value={productLine.boxesPerKathali}
                  onChange={(e) =>
                    onProductLineChange(index, 'boxesPerKathali', e.target.value)
                  }
                  className="editable-field"
                />
              </Form.Group>
            </Col>
          </Row>
        </div>

        {/* Pricing Section */}
        <div className="card-section mb-4">
          <h6 className="section-title mb-3">
            <span className="me-2">💰</span>
            Pricing
          </h6>
          
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="form-label-sm">
                  Rate (USD)
                </Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productLine.rate}
                  onChange={(e) =>
                    onProductLineChange(index, 'rate', e.target.value)
                  }
                  className="rate-field"
                />
                {showRateHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenRateHistory(productLine.product, index)}
                    disabled={!productLine.product}
                    className="mt-2 w-100"
                  >
                    <History size={14} className="me-1" />
                    View Rate History
                  </Button>
                )}
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="form-label-sm">Amount (USD)</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  value={formatPrice(productLine.amount)}
                  readOnly
                  className="calculated-field amount-field"
                  title="Auto-calculated: SQM × Rate"
                />
              </Form.Group>
            </Col>
          </Row>
        </div>

        {/* Weights Section */}
        <div className="card-section mb-4">
          <h6 className="section-title mb-3">
            <span className="me-2">⚖️</span>
            Weight Configuration
          </h6>
          
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="form-label-sm">Per Box Weight (kg)</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={productLine.perBoxWeight}
                  onChange={(e) =>
                    onProductLineChange(index, 'perBoxWeight', e.target.value)
                  }
                  className="editable-field"
                />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="form-label-sm">Per Pallet Weight (kg)</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={productLine.perPalletWeight}
                  onChange={(e) =>
                    onProductLineChange(index, 'perPalletWeight', e.target.value)
                  }
                  className="editable-field"
                />
              </Form.Group>
            </Col>
          </Row>
        </div>

        {/* Calculated Metrics Section (Collapsible) */}
        <div className="card-section calculated-section">
          <Button
            variant="link"
            onClick={() => setShowCalculated(!showCalculated)}
            className="w-100 text-start p-0 mb-3 section-toggle"
          >
            <h6 className="section-title mb-0 d-flex align-items-center justify-content-between">
              <span>
                <span className="me-2">📊</span>
                Calculated Metrics
              </span>
              {showCalculated ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </h6>
          </Button>

          <Collapse in={showCalculated}>
            <div>
              <Row className="g-3">
                <Col xs={6} md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-sm text-primary">
                      Total Pallets
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={formatQuantity(productLine.totalPallet)}
                      readOnly
                      className="calculated-field"
                      title="Big Pallet + Kathali"
                    />
                  </Form.Group>
                </Col>

                <Col xs={6} md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-sm text-primary">
                      Total Boxes
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={formatQuantity(productLine.totalBoxes)}
                      readOnly
                      className="calculated-field"
                      title="(Big Pallet × Boxes/Big) + (Kathali × Boxes/Kathali)"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-sm text-primary">
                      SQM (Auto)
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={formatSQM(productLine.sqmAuto)}
                      readOnly
                      className="calculated-field"
                      title="Total Boxes × SQM per Box"
                    />
                  </Form.Group>
                </Col>

                 <Col xs={6} md={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm text-primary">
                      Net Weight (kg)
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={formatWeight(productLine.netWeight)}
                      readOnly
                      className="calculated-field"
                      title={`Formula: ${productLine.totalBoxes} boxes × ${productLine.perBoxWeight} kg`}
                    />
                  </Form.Group>
                </Col>

                <Col xs={6} md={6}>
                  <Form.Group>
                    <Form.Label className="form-label-sm text-primary">
                      Gross Weight (kg)
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={formatWeight(productLine.grossWeight)}
                      readOnly
                      className="calculated-field"
                      title={`Formula: Net (${productLine.netWeight}) + (Pallets ${productLine.totalPallet} × ${productLine.perPalletWeight}kg)`}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Collapse>
        </div>
      </Card.Body>

      {/* Card Footer with Actions */}
      <Card.Footer className="product-card-footer">
        <div className="d-flex justify-content-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDelete(index)}
            className="delete-btn"
          >
            <Trash2 size={14} className="me-1" />
            Delete
          </Button>
        </div>
      </Card.Footer>

      <style>{`
        .product-line-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          background: #fff;
        }

        .product-line-card:hover {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);
        }

        .product-card-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
        }

        .product-card-footer {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 1rem 1.5rem;
        }

        .card-section {
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .card-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 0;
        }

        .calculated-section {
          background: #f0f9ff;
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid #e0f2fe;
        }

        .section-title {
          color: #1e293b;
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          display: flex;
          align-items: center;
        }

        .section-toggle {
          text-decoration: none;
          color: inherit;
        }

        .form-label-sm {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          margin-bottom: 0.5rem;
        }

        .product-select {
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .product-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .product-image-card {
          text-align: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .image-container {
          position: relative;
          display: inline-block;
          cursor: pointer;
        }

        .product-image {
          width: 100%;
          max-width: 240px;
          height: auto;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .product-image:hover {
          transform: scale(1.02);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(30, 41, 59, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: 12px;
          backdrop-filter: blur(2px);
        }

        .image-container:hover .image-overlay {
          opacity: 1;
        }

        .no-image-card {
          text-align: center;
          padding: 2rem;
          background: #fffbeb;
          border: 2px dashed #fcd34d;
          border-radius: 12px;
        }

        .placeholder-box {
          width: 64px;
          height: 64px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .readonly-field {
          background: #f8fafc !important;
          color: #475569;
          border: 1px solid #e2e8f0;
          font-weight: 500;
        }

        .editable-field {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .editable-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .calculated-field {
          background: #f0f9ff !important;
          color: #0369a1 !important;
          font-weight: 700;
          border: 1px solid #bae6fd;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .amount-field {
          background: #f0fdf4 !important;
          color: #15803d !important;
          font-weight: 800;
          font-size: 1.125rem;
          border: 1px solid #bbf7d0;
        }

        .rate-field {
          border: 2px solid #fbbf24;
          background: #fffbeb;
          font-weight: 700;
          color: #92400e;
        }

        .delete-btn {
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        /* Responsive Design */
        @media (max-width: 767px) {
          .product-card-header,
          .product-card-footer {
            padding: 1rem;
          }

          .card-section {
            padding-bottom: 1rem;
            margin-bottom: 1rem;
          }

          .product-image {
            max-width: 100%;
          }
        }
      `}</style>
    </Card>
  );
}

export default ProductLineCard;




