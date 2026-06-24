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

import { useState, useRef, useEffect } from 'react';
import { Table, Form, Button, Alert, Badge, Modal, Card, Row, Col } from 'react-bootstrap';
import {
  Trash2,
  Info,
  Package,
  Camera,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp} from 'lucide-react';
import OrderProductLineCard from './OrderProductLineCard.jsx';
import { formatNumber, formatPrice, formatWeight, formatQuantity, formatSQM } from '../../utils/formatters.js';

/**
 * Horizontal Table-Based Order Product Line Table
 * All fields are READ-ONLY except Rate (editable with supplier history)
 * Matches the Proforma Invoice layout
 */
function OrderProductLineTable({
  productLines,
  onChange,
  products,
  onProductsChange,
  showRateHistory = false,
  currentSupplier = '',
  rateHistoryManager = null,
  currency = 'INR',
}) {
  const [selectedProductImage, setSelectedProductImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const tableContainerRef = useRef(null);
  const topScrollbarContainerRef = useRef(null);
  const dummySpacerRef = useRef(null);

  // Synchronize top and bottom scrollbars
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScrollbarContainer = topScrollbarContainerRef.current;

    if (!tableContainer || !topScrollbarContainer) return;

    let isScrollingTable = false;
    let isScrollingTop = false;

    const handleTableScroll = () => {
      if (isScrollingTop) {
        isScrollingTop = false;
        return;
      }
      isScrollingTable = true;
      topScrollbarContainer.scrollLeft = tableContainer.scrollLeft;
    };

    const handleTopScroll = () => {
      if (isScrollingTable) {
        isScrollingTable = false;
        return;
      }
      isScrollingTop = true;
      tableContainer.scrollLeft = topScrollbarContainer.scrollLeft;
    };

    tableContainer.addEventListener('scroll', handleTableScroll);
    topScrollbarContainer.addEventListener('scroll', handleTopScroll);

    // Sync scroll width dynamically when contents change
    const updateScrollWidth = () => {
      if (dummySpacerRef.current && tableContainer) {
        dummySpacerRef.current.style.width = `${tableContainer.scrollWidth}px`;
      }
    };

    // Use a small timeout to let the DOM update before measuring
    const timeoutId = setTimeout(updateScrollWidth, 100);

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    resizeObserver.observe(tableContainer);

    return () => {
      tableContainer.removeEventListener('scroll', handleTableScroll);
      topScrollbarContainer.removeEventListener('scroll', handleTopScroll);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [productLines, products]);

  const handleDeleteProductLine = (index) => {
    setDeleteIndex(index);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      const newProductLines = productLines.filter((_, i) => i !== deleteIndex);
      onChange(newProductLines);
      setDeleteIndex(null);
    }
  };

  const handleProductLineChange = (index, field, value) => {
    const newProductLines = [...productLines];
    const productLine = { ...newProductLines[index] };

    // Handle rate changes
    if (field === 'rate') {
      productLine.rate = value;
      productLine.amount = productLine.totalBoxes * productLine.rate;

      // Save supplier rate history with proper error handling
      if (
        showRateHistory &&
        currentSupplier &&
        productLine.product &&
        rateHistoryManager &&
        typeof rateHistoryManager.saveSupplierRate === 'function'
      ) {
        try {
          rateHistoryManager.saveSupplierRate(
            currentSupplier,
            productLine.product,
            productLine.rate
          );
        } catch (error) {
          console.warn('Could not save supplier rate history:', error);
        }
      }
    } else if (['perBoxWeight', 'perPalletWeight'].includes(field)) {
      // Allow weight changes
      const val = value;
      productLine[field] = val;

      // Recalculate Net/Gross Weight
      const totalBoxes = parseFloat(productLine.totalBoxes) || 0;
      const totalPallets = parseFloat(productLine.totalPallet) || 0;
      const perBoxWeight = field === 'perBoxWeight' ? val : (parseFloat(productLine.perBoxWeight) || 0);
      const perPalletWeight = field === 'perPalletWeight' ? val : (parseFloat(productLine.perPalletWeight) || 0);

      productLine.netWeight = parseFloat((totalBoxes * perBoxWeight).toFixed(2));
      productLine.grossWeight = parseFloat((productLine.netWeight + (totalPallets * perPalletWeight)).toFixed(2));
    }

    newProductLines[index] = productLine;
    onChange(newProductLines);
  };

  const handleWeightOverride = (index, field, value) => {
    const newProductLines = [...productLines];
    const productLine = { ...newProductLines[index] };
    const val = value;

    if (field === 'netWeight') {
      productLine.netWeight = val;
      const totalBoxes = parseFloat(productLine.totalBoxes) || 0;
      if (totalBoxes > 0) {
        productLine.perBoxWeight = parseFloat((val / totalBoxes).toFixed(3));
      }
      const totalPallets = parseFloat(productLine.totalPallet) || 0;
      const perPalletWeight = parseFloat(productLine.perPalletWeight) || 0;
      productLine.grossWeight = parseFloat((val + (totalPallets * perPalletWeight)).toFixed(2));
    } else if (field === 'grossWeight') {
      productLine.grossWeight = val;
    }

    newProductLines[index] = productLine;
    onChange(newProductLines);
  };

  const openImageModal = (image) => {
    setSelectedProductImage(image);
    setShowImageModal(true);
  };

  const getProductImage = (productName) => {
    const product = products.find((p) => p.name === productName);
    return product?.images?.[0];
  };

  const getSupplierHistoricalRate = async (productName) => {
    if (showRateHistory && currentSupplier && rateHistoryManager) {
      return await rateHistoryManager.getSupplierRate(currentSupplier, productName);
    }
    return 0;
  };

  return (
    <>
      <div className="mb-3">
        <h6 className="mb-2">Product Lines from PI Reference</h6>
        <Alert variant="info" className="py-2">
          <Info size={16} className="me-2" />
          Product lines are automatically loaded from the selected PI Reference.
          You can only edit the purchase rates.
          {showRateHistory && ' Historical supplier rates are shown for reference.'}
        </Alert>
      </div>

      {/* Horizontal Scrolling Table Layout - Matching Invoice Format */}
      {productLines.length > 0 ? (
        <div className="product-table-container">
          {/* Synchronized Top Scrollbar */}
          <div 
            ref={topScrollbarContainerRef}
            className="top-scrollbar-container d-none d-lg-block"
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              width: '100%',
              height: '8px',
              marginBottom: '2px',
              scrollbarWidth: 'thin'
            }}
          >
            <div ref={dummySpacerRef} style={{ height: '1px' }}></div>
          </div>

          <div ref={tableContainerRef} className="table-scroll-wrapper d-none d-lg-block">
            <Table bordered hover className="product-line-table mb-0">
              <thead className="table-header-sticky">
                <tr>
                  <th className="col-index">#</th>
                  <th className="col-product">Product</th>
                  <th className="col-image">Image</th>
                  <th className="col-itemref">Factory Product Name</th>
                  <th className="col-hsn">HSN Code</th>
                  <th className="col-category">Category</th>
                  <th className="col-size">Size</th>
                  <th className="col-surface">Surface / Color</th>
                  <th className="col-thickness">Thickness / Category</th>
                  <th className="col-pallet">Big Pallet</th>
                  <th className="col-pallet">Kathali</th>
                  <th className="col-pallet">Total Pallet/Cartons</th>
                  <th className="col-boxes">Boxes/Big</th>
                  <th className="col-boxes">Boxes/Kathali</th>
                  <th className="col-boxes">Total Boxes/Pcs</th>
                  <th className="col-sqm">SQM / CBM</th>
                  <th className="col-rate">Purchase Rate (₹)</th>
                  <th className="col-amount">Amount (₹)</th>
                  <th className="col-weight">Per Box Weight</th>
                  <th className="col-weight">Net Weight</th>
                  <th className="col-weight">Per Pallet Weight</th>
                  <th className="col-weight">Gross Weight</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productLines.map((productLine, index) => {
                  const productImage = getProductImage(productLine.product);

                  return (
                    <tr key={productLine.id || index}>
                      <td data-label="#" className="text-center fw-semibold">{index + 1}</td>

                      {/* Product Name */}
                      <td data-label="Product">
                        <Form.Control
                          size="sm"
                          type="text"
                          value={productLine.product}
                          readOnly
                          className="bg-light"
                        />
                      </td>

                      {/* Product Image */}
                      <td data-label="Image" className="text-center">
                        {productImage ? (
                          <img
                            src={productImage.url}
                            alt={productLine.product}
                            className="product-thumbnail"
                            onClick={() => openImageModal(productImage)}
                            title="Click to view full size"
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          />
                        ) : (
                          <div className="no-image-placeholder" style={{
                            width: '40px',
                            height: '40px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f1f5f9',
                            borderRadius: '4px'
                          }}>
                            <Camera size={16} />
                          </div>
                        )}
                      </td>

                      {/* Product Details - Read Only */}
                      <td data-label="Factory Product Name"><Form.Control size="sm" type="text" value={productLine.factoryProductName || productLine.itemRef || ''} readOnly className="bg-light" /></td>
                      <td data-label="HSN Code"><Form.Control size="sm" type="text" value={productLine.hsnCode || ''} readOnly className="bg-light" /></td>
                      <td data-label="Category"><Form.Control size="sm" type="text" value={productLine.category || (productLine.productType === 'sanitaryware' ? 'N/A' : '')} readOnly className="bg-light" /></td>
                      <td data-label="Size"><Form.Control size="sm" type="text" value={productLine.size || (productLine.productType === 'sanitaryware' ? 'N/A' : '')} readOnly className="bg-light" /></td>
                      <td data-label="Surface / Color"><Form.Control size="sm" type="text" value={productLine.surface || (productLine.productType === 'sanitaryware' ? 'N/A' : '')} readOnly className="bg-light" /></td>
                      <td data-label="Thickness / Category"><Form.Control size="sm" type="text" value={productLine.thickness || (productLine.productType === 'sanitaryware' ? 'N/A' : '')} readOnly className="bg-light" /></td>

                      {/* Pallet Configuration - Read Only */}
                      <td data-label="Big Pallet"><Form.Control size="sm" type="text" value={productLine.productType === 'sanitaryware' ? '-' : productLine.bigPallet} readOnly className="bg-light" /></td>
                      <td data-label="Kathali"><Form.Control size="sm" type="text" value={productLine.productType === 'sanitaryware' ? '-' : productLine.kathaliPallet} readOnly className="bg-light" /></td>
                      <td data-label="Total Pallet/Cartons" className="calculated-field">
                        {productLine.productType === 'sanitaryware'
                          ? `${formatQuantity(productLine.totalPallet)} Cartons`
                          : formatQuantity(productLine.totalPallet)}
                      </td>

                      {/* Boxes Configuration - Read Only */}
                      <td data-label="Boxes/Big"><Form.Control size="sm" type="text" value={productLine.productType === 'sanitaryware' ? '-' : productLine.boxesPerBigPallet} readOnly className="bg-light" /></td>
                      <td data-label="Boxes/Kathali"><Form.Control size="sm" type="text" value={productLine.productType === 'sanitaryware' ? '-' : productLine.boxesPerKathali} readOnly className="bg-light" /></td>
                      <td data-label="Total Boxes/Pcs" className="calculated-field">
                        {productLine.productType === 'sanitaryware'
                          ? `${formatQuantity(productLine.totalBoxes)} Pcs`
                          : formatQuantity(productLine.totalBoxes)}
                      </td>

                      {/* Calculations */}
                      <td data-label="SQM / CBM" className="calculated-field">
                        {productLine.productType === 'sanitaryware'
                          ? `${parseFloat(productLine.sqmAuto || 0).toFixed(3)} CBM`
                          : formatSQM(productLine.sqmAuto)}
                      </td>

                      {/* Rate - EDITABLE */}
                      <td data-label="Purchase Rate (₹)">
                        <Form.Control
                          size="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productLine.rate}
                          onChange={(e) => handleProductLineChange(index, 'rate', e.target.value)}
                          className="input-numeric"
                          style={{
                            background: '#fef3c7',
                            fontWeight: '600',
                            color: '#92400e',
                          }}
                          title="Enter purchase rate"
                        />
                      </td>
                      <td data-label="Amount (₹)" className="calculated-field fw-bold">{formatPrice(productLine.amount, currency)}</td>

                      {/* Weights - Editable */}
                      <td data-label="Per Box Weight">
                        <Form.Control
                          size="sm"
                          type="number"
                          value={productLine.perBoxWeight}
                          onChange={(e) => handleProductLineChange(index, 'perBoxWeight', e.target.value)}
                          className="input-numeric"
                        />
                      </td>
                      <td data-label="Net Weight" className="calculated-field fw-bold text-success">{formatQuantity(productLine.netWeight)}</td>
                      <td data-label="Per Pallet Weight">
                        <Form.Control
                          size="sm"
                          type="number"
                          value={productLine.perPalletWeight}
                          onChange={(e) => handleProductLineChange(index, 'perPalletWeight', e.target.value)}
                          className="input-numeric"
                        />
                      </td>
                      <td data-label="Gross Weight" className="calculated-field fw-bold text-success">{formatQuantity(productLine.grossWeight)}</td>

                      {/* Actions */}
                      <td data-label="Actions" className="text-center">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProductLine(index); }}
                          title="Delete product line"
                          type="button"
                          className="d-flex align-items-center justify-content-center mx-auto"
                          style={{ width: '32px', height: '32px', padding: 0 }}
                        >
                          <Trash2 size={16} color="white" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Mobile View: Cards */}
          <div className="product-cards-wrapper d-block d-lg-none mt-3">
            {productLines.map((productLine, index) => (
              <OrderProductLineCard
                key={productLine.id || index}
                productLine={productLine}
                index={index}
                products={products}
                onProductLineChange={handleProductLineChange}
                onDelete={handleDeleteProductLine}
                onOpenImageModal={openImageModal}
                currency={currency}
              />
            ))}

            {/* Mobile Summary Card */}
            <Card className="border-0 shadow-sm rounded-4 mb-4 bg-success text-white">
              <Card.Body className="p-3">
                <h6 className="fw-bold mb-3 border-bottom border-white border-opacity-25 pb-2 uppercase small">ORDER TOTAL SUMMARY</h6>
                <Row className="g-2 small">
                  <Col xs={6}>Total Pallets:</Col>
                  <Col xs={6} className="text-end fw-bold">{formatQuantity(productLines.reduce((sum, line) => sum + (parseFloat(line.totalPallet) || 0), 0))}</Col>
                  <Col xs={6}>Total Boxes:</Col>
                  <Col xs={6} className="text-end fw-bold">{formatQuantity(productLines.reduce((sum, line) => sum + (parseFloat(line.totalBoxes) || 0), 0))}</Col>
                  <Col xs={6}>Total SQM:</Col>
                  <Col xs={6} className="text-end fw-bold">{formatSQM(productLines.reduce((sum, line) => sum + (parseFloat(line.sqmAuto) || 0), 0))}</Col>
                  <Col xs={12} className="my-2 border-top border-white border-opacity-25"></Col>
                  <Col xs={6} className="fs-6">PO VALUE:</Col>
                  <Col xs={6} className="text-end fw-bold fs-5">{formatPrice(productLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0), currency)}</Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        </div>
      ) : (
        <Alert variant="warning" className="text-center py-5">
          <Package size={48} className="text-muted mb-3" />
          <h5>No Product Lines</h5>
          <p className="text-muted mb-0">
            Select a PI Reference to automatically load product lines.
          </p>
        </Alert>
      )}

      {/* Image Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Product Image</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedProductImage && (
            <img
              src={selectedProductImage.url}
              alt="Product"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            <X size={16} className="me-2" />
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={deleteIndex !== null} onHide={() => setDeleteIndex(null)} centered backdrop="static">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger flex-grow-1 d-flex align-items-center">
            <AlertTriangle size={24} className="me-2" />
            Confirm Deletion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="mb-0">
            Are you sure you want to remove <strong>{deleteIndex !== null ? (productLines[deleteIndex]?.product || 'this product') : ''}</strong> from the order?
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={() => setDeleteIndex(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Yes, Remove
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Styles for Horizontal Table Layout */}
      <style>{`
        .product-table-container {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .table-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .product-line-table {
          min-width: 2000px;
          white-space: nowrap;
        }

        .product-line-table thead {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .product-line-table thead th {
          border-color: #60a5fa !important;
          font-weight: 600;
          padding: 0.75rem 0.5rem;
          font-size: 0.875rem;
          vertical-align: middle;
        }

        .product-line-table tbody tr:hover {
          background-color: #f0f9ff;
        }

        .product-line-table td {
          vertical-align: middle;
          padding: 0.5rem;
          font-size: 0.875rem;
        }

        .col-index {
          width: 50px;
          text-align: center;
        }

        .col-product {
          min-width: 200px;
        }

        .col-image {
          width: 60px;
          text-align: center;
        }

        .col-itemref {
          min-width: 180px;
        }

        .col-hsn {
          min-width: 100px;
        }

        .col-size,
        .col-surface,
        .col-thickness {
          min-width: 120px;
        }

        .col-pallet,
        .col-boxes,
        .col-weight {
          min-width: 140px;
        }

        .col-sqm,
        .col-rate,
        .col-amount {
          min-width: 120px;
        }

        .col-actions {
          width: 80px;
          text-align: center;
        }

        .calculated-field {
          background-color: #f0fdf4 !important;
          font-weight: 600;
          color: #166534;
          text-align: center;
        }

        .input-numeric {
          text-align: right;
        }

        .product-thumbnail {
          transition: transform 0.2s ease;
        }

        .product-thumbnail:hover {
          transform: scale(1.1);
        }

        @media (max-width: 992px) {
          /* Allow global responsive.css to handle table-to-card transformation */
          /* Removed forced display: table!important CSS here to enable card layouts on mobile */
        }

        @media (max-width: 768px) {
          .product-line-table {
            font-size: 0.75rem;
          }

          .product-line-table thead th,
          .product-line-table td {
            padding: 0.4rem !important;
          }
        }
      `}</style>
    </>
  );
}

export default OrderProductLineTable;




