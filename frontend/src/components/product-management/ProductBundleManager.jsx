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
import { Modal, Row, Col, Card, Form, Button, Badge, ListGroup, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Package, Plus, Minus, Link, Save, X, ShoppingCart, Info, Edit } from 'lucide-react';

/**
 * Product Bundle Manager Component
 * Features:
 * - Create cross-category product bundles
 * - Link Faucet + Basin + Tiles combinations
 * - Bundle pricing and management
 * - Visual bundle preview
 */
function ProductBundleManager({ show, onHide, onSave, products = [], existingBundle = null }) {
  const [bundleData, setBundleData] = useState({
    name: '',
    description: '',
    bundleCode: '',
    category: 'Bundle',
    catalogue: 'Bundle',
    bundleType: 'Bathroom Set', // Bathroom Set, Kitchen Set, Custom
    products: [],
    pricing: {
      totalFactoryPrice: 0,
      bundleDiscount: 10, // percentage
      finalPrice: 0,
      margin: 15,
    },
    images: [],
    status: 'Continue',
    isBundle: true,
  });

  const [availableProducts, setAvailableProducts] = useState({
    tiles: [],
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [errors, setErrors] = useState({});

  // Bundle templates for quick setup
  const bundleTemplates = {
    'Floor & Wall Combo': {
      name: 'Floor & Wall Tile Combo',
      description: 'Matching floor and wall tiles',
      requiredCategories: ['Tiles'],
      suggestedApplications: ['Floor', 'Wall'],
    },
    'Custom': {
      name: 'Custom Bundle',
      description: 'Custom product combination',
      requiredCategories: [],
      suggestedApplications: [],
    }
  };

  useEffect(() => {
    // Categorize products
    const categorized = {
      tiles: products.filter(p => p.catalogue === 'Tiles'),
    };
    setAvailableProducts(categorized);

    // Load existing bundle data
    if (existingBundle) {
      setBundleData(existingBundle);
      setSelectedProducts(existingBundle.products || []);
    }
  }, [products, existingBundle]);

  // Calculate bundle pricing when products change
  useEffect(() => {
    const totalFactoryPrice = selectedProducts.reduce((sum, product) => {
      return sum + (product.factoryPrice || 0);
    }, 0);

    const discountAmount = (totalFactoryPrice * bundleData.pricing.bundleDiscount) / 100;
    const discountedPrice = totalFactoryPrice - discountAmount;
    const marginAmount = (discountedPrice * bundleData.pricing.margin) / 100;
    const finalPrice = discountedPrice + marginAmount;

    setBundleData(prev => ({
      ...prev,
      products: selectedProducts,
      pricing: {
        ...prev.pricing,
        totalFactoryPrice,
        finalPrice,
      }
    }));
  }, [selectedProducts, bundleData.pricing.bundleDiscount, bundleData.pricing.margin]);

  const handleBundleTypeChange = (type) => {
    const template = bundleTemplates[type];
    setBundleData(prev => ({
      ...prev,
      bundleType: type,
      name: template.name,
      description: template.description,
    }));
  };

  const handleAddProduct = (product) => {
    if (!selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, {
        ...product,
        bundleQuantity: 1,
        bundleRole: getBundleRole(product),
      }]);
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const handleProductQuantityChange = (productId, quantity) => {
    setSelectedProducts(products => 
      products.map(p => 
        p.id === productId ? { ...p, bundleQuantity: Math.max(1, quantity) } : p
      )
    );
  };

  const getBundleRole = (product) => {
    switch (product.catalogue) {
      case 'Tiles':
        return product.application?.includes('Floor') ? 'Floor Tile' : 'Wall Tile';
      default:
        return 'Product';
    }
  };

  const validateBundle = () => {
    const newErrors = {};

    if (!bundleData.name.trim()) {
      newErrors.name = 'Bundle name is required';
    }

    if (selectedProducts.length < 2) {
      newErrors.products = 'Bundle must contain at least 2 products';
    }

    // Validate template requirements
    const template = bundleTemplates[bundleData.bundleType];
    if (template.requiredCategories.length > 0) {
      const selectedCategories = [...new Set(selectedProducts.map(p => p.catalogue))];
      const missingCategories = template.requiredCategories.filter(
        cat => !selectedCategories.includes(cat)
      );
      
      if (missingCategories.length > 0) {
        newErrors.categories = `Missing required categories: ${missingCategories.join(', ')}`;
      }
    }

    if (!bundleData.bundleCode.trim()) {
      newErrors.bundleCode = 'Bundle code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateBundle()) {
      const bundleToSave = {
        ...bundleData,
        id: existingBundle?.id || Date.now(),
        itemRef: bundleData.bundleCode,
        createdDate: existingBundle?.createdDate || new Date().toISOString(),
      };
      onSave(bundleToSave);
    }
  };

  const ProductSelector = ({ title, products, category }) => (
    <Card className="mb-3">
      <Card.Header className="py-2">
        <h6 className="mb-0">{title} ({products.length})</h6>
      </Card.Header>
      <Card.Body className="p-2">
        <div className="product-grid">
          {products.slice(0, 6).map(product => (
            <div 
              key={product.id} 
              className="product-item"
              onClick={() => handleAddProduct(product)}
            >
              <div className="product-image">
                {product.images?.[0]?.url ? (
                  <img 
                    src={product.images[0].url} 
                    alt={product.name}
                    className="product-thumbnail"
                  />
                ) : (
                  <div className="no-image">
                    <Package size={20} />
                  </div>
                )}
              </div>
              <div className="product-info">
                <small className="product-name">{product.name || product.name}</small>
                <small className="product-price">${product.factoryPrice}</small>
              </div>
              <Button size="sm" variant="outline" className="add-btn">
                <Plus size={12} />
              </Button>
            </div>
          ))}
          {products.length > 6 && (
            <div className="more-products">
              <small className="text-muted">+{products.length - 6} more...</small>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Package size={20} className="me-2" />
          {existingBundle ? 'Edit Product Bundle' : 'Create Product Bundle'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          {/* Bundle Configuration */}
          <Col lg={5}>
            <Card className="mb-3">
              <Card.Header>
                <h6 className="mb-0">Bundle Configuration</h6>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Bundle Type</Form.Label>
                  <Form.Select
                    value={bundleData.bundleType}
                    onChange={(e) => handleBundleTypeChange(e.target.value)}
                  >
                    {Object.keys(bundleTemplates).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {bundleTemplates[bundleData.bundleType]?.description}
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Bundle Name is mandatory.</Tooltip>}>
                    <Form.Label className="text-danger" style={{cursor: 'help'}}>
                      Bundle Name * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Control
                    type="text"
                    value={bundleData.name}
                    onChange={(e) => setBundleData(prev => ({ ...prev, name: e.target.value }))}
                    isInvalid={!!errors.name}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Bundle Code is mandatory.</Tooltip>}>
                    <Form.Label className="text-danger" style={{cursor: 'help'}}>
                      Bundle Code * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Control
                    type="text"
                    value={bundleData.bundleCode}
                    onChange={(e) => setBundleData(prev => ({ ...prev, bundleCode: e.target.value }))}
                    isInvalid={!!errors.bundleCode}
                    placeholder="e.g., BATH-SET-001"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.bundleCode}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={bundleData.description}
                    onChange={(e) => setBundleData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </Form.Group>

                {/* Pricing Section */}
                <Card className="mb-3">
                  <Card.Header className="py-2">
                    <small className="fw-semibold">Bundle Pricing</small>
                  </Card.Header>
                  <Card.Body className="p-2">
                    <Row className="g-2">
                      <Col xs={6}>
                        <Form.Group>
                          <Form.Label className="small">Bundle Discount (%)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={bundleData.pricing.bundleDiscount}
                            onChange={(e) => setBundleData(prev => ({
                              ...prev,
                              pricing: { ...prev.pricing, bundleDiscount: e.target.value }
                            }))}
                            min="0"
                            max="50"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={6}>
                        <Form.Group>
                          <Form.Label className="small">Margin (%)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={bundleData.pricing.margin}
                            onChange={(e) => setBundleData(prev => ({
                              ...prev,
                              pricing: { ...prev.pricing, margin: e.target.value }
                            }))}
                            min="0"
                            max="100"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="pricing-summary mt-2">
                      <small>
                        <div>Total Factory Price: <strong>${bundleData.pricing.totalFactoryPrice.toFixed(2)}</strong></div>
                        <div>Bundle Price: <strong>${bundleData.pricing.finalPrice.toFixed(2)}</strong></div>
                        <div>Savings: <strong>${((bundleData.pricing.totalFactoryPrice - bundleData.pricing.finalPrice) * -1).toFixed(2)}</strong></div>
                      </small>
                    </div>
                  </Card.Body>
                </Card>
              </Card.Body>
            </Card>
          </Col>

          {/* Product Selection */}
          <Col lg={7}>
            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <Card className="mb-3">
                <Card.Header className="d-flex justify-content-between align-items-center py-2">
                  <h6 className="mb-0">Selected Products ({selectedProducts.length})</h6>
                  {errors.products && <small className="text-danger">{errors.products}</small>}
                  {errors.categories && <small className="text-danger">{errors.categories}</small>}
                </Card.Header>
                <Card.Body className="p-2">
                  <ListGroup variant="flush">
                    {selectedProducts.map(product => (
                      <ListGroup.Item key={product.id} className="px-0 py-2">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center flex-grow-1">
                            <div className="product-thumb me-2">
                              {product.images?.[0]?.url ? (
                                <img src={product.images[0].url} alt={product.name} width="40" height="40" className="rounded" />
                              ) : (
                                <div className="bg-light d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px', borderRadius: '4px'}}>
                                  <Package size={16} />
                                </div>
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-semibold small">{product.name || product.name}</div>
                              <div className="text-muted small">
                                {product.bundleRole} â€¢ {product.catalogue} â€¢ ${product.factoryPrice}
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-center">
                            <Form.Control
                              type="number"
                              size="sm"
                              style={{width: '60px'}}
                              value={product.bundleQuantity || 1}
                              onChange={(e) => handleProductQuantityChange(product.id, parseInt(e.target.value))}
                              min="1"
                              className="me-2"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveProduct(product.id)}
                            >
                              <Minus size={12} />
                            </Button>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            )}

            {/* Available Products */}
            <ProductSelector 
              title="Tiles" 
              products={availableProducts.tiles} 
              category="Tiles" 
            />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <X size={16} className="me-1" />
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          <Save size={16} className="me-1" />
          {existingBundle ? 'Update Bundle' : 'Create Bundle'}
        </Button>
      </Modal.Footer>

      <style>{`
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.5rem;
        }

        .product-item {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .product-item:hover {
          border-color: #3b82f6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .product-image {
          width: 100%;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .product-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
        }

        .no-image {
          width: 100%;
          height: 100%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: #64748b;
        }

        .product-info {
          text-align: center;
        }

        .product-name {
          display: block;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .product-price {
          color: #059669;
          font-weight: 600;
        }

        .add-btn {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          width: 24px;
          height: 24px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .more-products {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 2rem 0.5rem;
          text-align: center;
        }

        .pricing-summary {
          border-top: 1px solid #e2e8f0;
          padding-top: 0.5rem;
        }
      `}</style>
    </Modal>
  );
}

export default ProductBundleManager;




