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
import { Table, Button, Form, Badge, Modal, Row, Col, Container, Dropdown, SplitButton, Card } from 'react-bootstrap';
import {
  Plus,
  Trash2,
  Settings,
  Eye,
  History,
  X,
  Camera,
  Package,
  AlertTriangle,
  Calculator} from 'lucide-react';

import ProductLineCard from './ProductLineCard.jsx';
import ProductManagement from './ProductManagement.jsx';
import ProductForm from '../product-management/ProductForm.jsx';
import RateHistoryManager from './RateHistoryManager.jsx';
import { showSuccess, showError, showWarning, showInfo } from './NotificationManager.jsx';
import { formatNumber, formatPrice, formatWeight, formatQuantity, formatSQM } from '../../utils/formatters.js';
import AddableDropdown from './AddableDropdown.jsx';

/**
 * Enhanced Product Line Table Component
 * Features:
 * - Visual product selection with images
 * - Rate history management
 * - Auto-calculation of dependent fields
 * - Real-time validation
 * - Professional UI with responsive design
 * - Image preview functionality
 */
function ProductLineTable({
  productLines,
  onChange,
  products,
  onProductsChange,
  onProductCreate,
  showRateHistory = false,
  currentClient = '',
  rateHistoryManager = null,
  onMasterDataUpdate = () => { },
  showAddNewProductButton = true,
  currency = '',
}) {
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [initialProductData, setInitialProductData] = useState(null);
  const [selectedProductImage, setSelectedProductImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRateHistoryModal, setShowRateHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
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

  // Automated column validation
  useEffect(() => {
    if (tableContainerRef.current) {
      const headerRow = tableContainerRef.current.querySelector('thead tr');
      const bodyRow = tableContainerRef.current.querySelector('tbody tr');
      const footerRow = tableContainerRef.current.querySelector('tfoot tr');

      if (headerRow && bodyRow && footerRow) {
        const headerColumns = Array.from(headerRow.children).reduce((acc, th) => acc + (th.colSpan || 1), 0);
        const bodyColumns = Array.from(bodyRow.children).reduce((acc, td) => acc + (td.colSpan || 1), 0);
        const footerColumns = Array.from(footerRow.children).reduce((acc, td) => acc + (td.colSpan || 1), 0);

        if (headerColumns !== bodyColumns || bodyColumns !== footerColumns) {
          console.error(`Table column mismatch detected: Header=${headerColumns}, Body=${bodyColumns}, Footer=${footerColumns}`);
        }
      }
    }
  });

  /**
   * Add new product line with default values
   */
  const handleCreateProductLine = () => {
    const newProductLine = {
      id: Date.now(),
      product: '',
      itemRef: '',
      hsnCode: '',
      category: '',
      size: '',
      surface: '',
      thickness: '',
      sqm: '',
      pallets: 0,
      bigPallet: 0,
      kathaliPallet: 0,
      totalPallet: 0,
      boxesPerBigPallet: 0,
      boxesPerKathali: 0,
      totalBoxes: 0,
      sqmAuto: 0,
      rate: '',
      amount: 0,
      perBoxWeight: 0,
      netWeight: 0,
      perPalletWeight: 0,
      grossWeight: 0,
    };
    onChange([...productLines, newProductLine]);
    showSuccess('New product line added');
  };

  /**
   * Delete product line with confirmation
   */
  const handleDeleteProductLine = (index) => {
    setDeleteIndex(index);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      const newProductLines = productLines.filter((_, i) => i !== deleteIndex);
      onChange(newProductLines);
      showSuccess('Product line removed successfully');
      setDeleteIndex(null);
    }
  };

  /**
   * Helper to fill product line from product data
   */
  const fillProductLineFromProduct = (productLine, selectedProduct) => {
    if (!selectedProduct) return productLine;

    const updatedLine = { ...productLine };
    updatedLine.product = selectedProduct.name;
    updatedLine.itemRef = selectedProduct.itemRef || selectedProduct.productCode || '';
    updatedLine.factoryProductName = selectedProduct.factoryProductName || selectedProduct.factory_product_name || '';
    updatedLine.hsnCode = selectedProduct.hsCode || selectedProduct.hs_code || selectedProduct.hsnCode || '';
    updatedLine.category = selectedProduct.category || '';

    // Normalize size, surface, thickness
    updatedLine.size = Array.isArray(selectedProduct.size)
      ? selectedProduct.size[0]
      : (selectedProduct.size || '');

    updatedLine.surface = Array.isArray(selectedProduct.surface)
      ? selectedProduct.surface[0]
      : (selectedProduct.surface || '');

    updatedLine.thickness = selectedProduct.thickness || '';
    updatedLine.description = selectedProduct.description || '';

    // Packaging info - handle both camelCase and snake_case
    updatedLine.boxesPerBigPallet =
      selectedProduct.defaultBoxesPerPallet ||
      selectedProduct.boxes_per_pallet || 0;

    updatedLine.boxesPerKathali =
      selectedProduct.defaultBoxesPerKathali ||
      selectedProduct.default_boxes_per_kathali || 0;

    updatedLine.perBoxWeight =
      selectedProduct.defaultPerBoxWeight ||
      selectedProduct.boxWeight ||
      selectedProduct.box_weight || 22.5;

    updatedLine.perPalletWeight =
      selectedProduct.defaultPerPalletWeight ||
      selectedProduct.default_per_pallet_weight || 25;

    updatedLine.sqm =
      selectedProduct.sqmPerBox ||
      selectedProduct.sqm_per_box ||
      selectedProduct.sqm || 0;

    // Extract and add product image URL
    if (selectedProduct.images && selectedProduct.images.length > 0) {
      const mainImage = selectedProduct.images.find(img => img.isMain) || selectedProduct.images[0];
      updatedLine.image = mainImage.url;
    }

    return updatedLine;
  };

  /**
   * Handle changes to individual product line fields
   */
  const handleProductLineChange = async (index, field, value) => {
    const newProductLines = [...productLines];
    const productLine = { ...newProductLines[index] };

    if (field === 'product') {
      const selectedProduct = products.find(
        (p) => p.name === value
      );

      if (selectedProduct) {
        // Use helper to auto-fill product details
        const filledLine = fillProductLineFromProduct(productLine, selectedProduct);
        Object.assign(productLine, filledLine);

        // Apply rate history if available
        if (showRateHistory && currentClient && rateHistoryManager) {
          const historicalRate = await rateHistoryManager.getClientRate(
            currentClient,
            productLine.product
          );
          if (historicalRate > 0) {
            productLine.rate = historicalRate;
            showSuccess(
              `Applied historical rate: ${historicalRate} for ${productLine.product}`
            );
          }
        }

        showSuccess(`Product ${productLine.product} selected and auto-filled`);
      } else {
        productLine[field] = value;
      }
    } else if (field === 'hsnCode') {
      productLine[field] = value ? value.toUpperCase() : '';
    } else {
      // Handle numeric fields
      productLine[field] = [
        'bigPallet',
        'kathaliPallet',
        'boxesPerBigPallet',
        'boxesPerKathali',
        'rate',
        'perBoxWeight',
        'perPalletWeight',
        'sqm',
      ].includes(field)
        ? value
        : value;
    }

    // Auto-calculate dependent fields
    productLine.totalPallet = (parseFloat(productLine.bigPallet) || 0) + (parseFloat(productLine.kathaliPallet) || 0);
    productLine.pallets = productLine.totalPallet; // Synchronize for backward compatibility
    productLine.totalBoxes =
      (parseFloat(productLine.bigPallet) || 0) * (parseFloat(productLine.boxesPerBigPallet) || 0) +
      (parseFloat(productLine.kathaliPallet) || 0) * (parseFloat(productLine.boxesPerKathali) || 0);

    // Get SQM per box from selected product or productLine
    const selectedProduct = products.find(
      (p) =>
        p.name === productLine.product
    );
    const sqmPerBox = parseFloat(productLine.sqm) || parseFloat(selectedProduct?.sqmPerBox) || parseFloat(selectedProduct?.sqm_per_box) || 1.44;
    productLine.sqm = sqmPerBox;

    productLine.sqmAuto = parseFloat((productLine.totalBoxes * sqmPerBox).toFixed(2));
    productLine.amount = parseFloat((productLine.sqmAuto * productLine.rate).toFixed(2));
    // Weight Calculations
    const netWeight = parseFloat((productLine.totalBoxes * (productLine.perBoxWeight || 0)).toFixed(2));
    productLine.netWeight = netWeight;

    const palletOverhead = parseFloat((productLine.totalPallet * (productLine.perPalletWeight || 0)).toFixed(2));
    productLine.grossWeight = parseFloat((netWeight + palletOverhead).toFixed(2));

    newProductLines[index] = productLine;
    onChange(newProductLines);

    // Save rate history for future use
    if (
      showRateHistory &&
      field === 'rate' &&
      currentClient &&
      productLine.product &&
      rateHistoryManager &&
      productLine.rate > 0
    ) {
      rateHistoryManager.saveClientRate(
        currentClient,
        productLine.product,
        productLine.rate
      );
      showSuccess(`Rate saved to history for ${productLine.product}`);
    }
  };

  const handleWeightOverride = (index, field, value) => {
    const updatedLines = [...productLines];
    const productLine = { ...updatedLines[index] };
    const val = value;

    if (field === 'netWeight') {
      productLine.netWeight = val;
      if (productLine.totalBoxes > 0) {
        productLine.perBoxWeight = parseFloat((val / productLine.totalBoxes).toFixed(4));
      }
      const palletOverhead = parseFloat((productLine.totalPallet * (productLine.perPalletWeight || 20)).toFixed(2));
      productLine.grossWeight = parseFloat((val + palletOverhead).toFixed(2));
    } else if (field === 'grossWeight') {
      productLine.grossWeight = val;
    }

    updatedLines[index] = productLine;
    onChange(updatedLines);
  };

  /**
   * Open image preview modal
   */
  const openImageModal = (image) => {
    setSelectedProductImage(image);
    setShowImageModal(true);
  };

  /**
   * Get product image for display
   */
  const getProductImage = (productName) => {
    const product = products.find(
      (p) => p.name === productName
    );
    if (!product?.images || product.images.length === 0) return null;
    return product.images.find(img => img.isMain) || product.images[0];
  };

  /**
   * Open rate history modal
   */
  const openRateHistory = (productName, index) => {
    if (!productName) {
      showWarning('Please select a product first');
      return;
    }

    setSelectedProductForHistory({
      client: currentClient,
      product: productName,
      index,
    });
    setShowRateHistoryModal(true);
  };

  /**
   * Apply rate from history
   */
  const handleApplyRate = (rate, currency) => {
    if (selectedProductForHistory) {
      handleProductLineChange(selectedProductForHistory.index, 'rate', rate);
      showSuccess(
        `Applied rate ${rate} ${currency} for ${selectedProductForHistory.product}`
      );
    }
    setShowRateHistoryModal(false);
  };

  /**
   * Handle ProductForm save
   */
  const handleProductFormSave = async (productData) => {
    try {
      let savedProduct;

      if (onProductCreate) {
        // PERSIST: Save to master database via API
        savedProduct = await onProductCreate(productData);
        showSuccess(`Product "${productData.name}" saved to master database`);
      } else {
        // Fallback: Local-only creation if no API handler provided
        savedProduct = {
          ...productData,
          id: Date.now(),
        };
        showWarning(`Product saved locally only. It will not persist in master data.`);
      }

      // Update the products list in the parent component
      const updatedProducts = [...products, savedProduct];
      if (onProductsChange) {
        onProductsChange(updatedProducts);
      }

      // AUTO-ADD: If a new product was just created, automatically add it to the product lines
      if (!initialProductData?.id && savedProduct) {
        // Use helper to create a correctly filled product line
        const newProductLine = fillProductLineFromProduct({
          id: Date.now() + 1,
          bigPallet: 0,
          kathaliPallet: 0,
          totalPallet: 0,
          totalBoxes: 0,
          sqmAuto: 0,
          rate: '',
          amount: 0,
          netWeight: 0,
          grossWeight: 0
        }, savedProduct);

        onChange([...productLines, newProductLine]);
        showSuccess(`Product "${savedProduct.name}" added to master and inserted into table`);
      }

      setShowProductForm(false);
      setInitialProductData(null);
    } catch (error) {
      console.error('Error saving product to master:', error);
      showError('Failed to save product to master database.');
    }
  };

  /**
   * Handle ProductForm cancel
   */
  const handleProductFormCancel = () => {
    setShowProductForm(false);
    setInitialProductData(null);
  };

  return (
    <>
      {/* Enhanced Header with Actions */}
      <div className="product-line-header">
        <div className="header-content">
          <h6 className="header-title">
            <Package size={20} className="me-2" />
            Product Configuration ({productLines.length})
          </h6>
          <p className="header-subtitle">
            Select premium tiles with visual identification and automatic calculations
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateProductLine}
            className="text-white"
            style={{ minWidth: 'max-content', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
            type="button"
          >
            <Plus size={16} className="me-1" />
            <span style={{ textTransform: 'none' }}>Add Tile Product</span>
          </Button>
        </div>
      </div>

      {/* Product Management Modal */}
      {showProductManagement && (
        <ProductManagement
          show={showProductManagement}
          onHide={() => setShowProductManagement(false)}
          products={products}
          onProductsChange={() => { }} // Persistence handled by hook
        />
      )}

      {/* Product Table Container: Desktop (Table) and Mobile (Cards) */}
      <div className="product-table-container">
        {productLines.length > 0 ? (
          <>
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

            {/* Desktop View: Table (Visible on Large screens) */}
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
                    <th className="col-surface">Surface</th>
                    <th className="col-thickness">Thickness</th>
                    <th className="col-pallet">Big Pallet</th>
                    <th className="col-pallet">Kathali</th>
                    <th className="col-pallet">Total Pallet</th>
                    <th className="col-boxes">Boxes Per Pallet</th>
                    <th className="col-boxes">Boxes Per Kathali</th>
                    <th className="col-boxes">Total Boxes</th>
                    <th className="col-sqm">SQM/Box</th>
                    <th className="col-sqm">SQM Auto</th>
                    <th className="col-rate">Rate {showRateHistory && <History size={14} className="ms-1" />}</th>
                    <th className="col-amount">Amount</th>
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
                      <tr key={productLine.id || index} className={productLine.product ? '' : 'row-incomplete'}>
                        <td data-label="#" className="text-center fw-semibold">{index + 1}</td>

                        {/* Product Selection */}
                        <td data-label="Product" className="col-product-select">
                          <Form.Select
                            size="sm"
                            value={productLine.product}
                            onChange={(e) => handleProductLineChange(index, 'product', e.target.value)}
                            className={productLine.product ? 'border-success' : 'border-warning'}
                          >
                            <option value="">Select Product</option>
                            {products.filter(p => p.status !== 'Inactive' || p.name === productLine.product).map((product) => (
                              <option key={product.id} value={product.name}>
                                {product.name}
                              </option>
                            ))}
                          </Form.Select>
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
                            />
                          ) : (
                            <div className="no-image-placeholder">
                              <Camera size={16} />
                            </div>
                          )}
                        </td>

                        {/* Product Details */}
                        <td data-label="Factory Product Name"><Form.Control size="sm" type="text" value={productLine.factoryProductName || ''} readOnly className="bg-light" /></td>
                        <td data-label="HSN Code">
                          <AddableDropdown
                            value={productLine.hsnCode || ''}
                            onChange={(val) => handleProductLineChange(index, 'hsnCode', val)}
                            masterDataType="tariffCodes"
                            placeholder="HSN Code"
                            selectClassName="form-control-sm text-uppercase"
                            addButtonLabel="+ Add New"
                          />
                        </td>
                        <td data-label="Category"><Form.Control size="sm" type="text" value={productLine.category || ''} readOnly className="bg-light" /></td>
                        <td data-label="Size"><Form.Control size="sm" type="text" value={productLine.size} readOnly className="bg-light" /></td>
                        <td data-label="Surface"><Form.Control size="sm" type="text" value={productLine.surface} readOnly className="bg-light" /></td>
                        <td data-label="Thickness"><Form.Control size="sm" type="text" value={productLine.thickness} readOnly className="bg-light" /></td>

                        {/* Pallet Configuration */}
                        <td data-label="Big Pallet">
                          <Form.Control
                            size="sm"
                            type="number"
                            min="0"
                            value={productLine.bigPallet}
                            onChange={(e) => handleProductLineChange(index, 'bigPallet', e.target.value)}
                            className="input-numeric"
                          />
                        </td>
                        <td data-label="Kathali">
                          <Form.Control
                            size="sm"
                            type="number"
                            min="0"
                            value={productLine.kathaliPallet}
                            onChange={(e) => handleProductLineChange(index, 'kathaliPallet', e.target.value)}
                            className="input-numeric"
                          />
                        </td>
                        <td data-label="Total Pallet" className="calculated-field">{formatQuantity(productLine.totalPallet)}</td>

                        {/* Boxes Configuration */}
                        <td data-label="Boxes Per Pallet">
                          <Form.Control
                            size="sm"
                            type="number"
                            min="0"
                            value={productLine.boxesPerBigPallet}
                            onChange={(e) => handleProductLineChange(index, 'boxesPerBigPallet', e.target.value)}
                            className="input-numeric"
                          />
                        </td>
                        <td data-label="Boxes Per Kathali">
                          <Form.Control
                            size="sm"
                            type="number"
                            min="0"
                            value={productLine.boxesPerKathali}
                            onChange={(e) => handleProductLineChange(index, 'boxesPerKathali', e.target.value)}
                            className="input-numeric"
                          />
                        </td>
                        <td data-label="Total Boxes" className="calculated-field">{formatQuantity(productLine.totalBoxes)}</td>

                        <td data-label="SQM/Box">
                          <Form.Control
                            size="sm"
                            type="number"
                            min="0"
                            step="0.0001"
                            value={productLine.sqm}
                            onChange={(e) => handleProductLineChange(index, 'sqm', e.target.value)}
                            className="input-numeric"
                          />
                        </td>

                        {/* Calculations */}
                        <td data-label="SQM Auto" className={`calculated-field ${!productLine.product ? '' : (products.find(p => p.name === productLine.product)?.sqmPerBox ? '' : 'text-danger fw-bold')}`}>
                          {formatSQM(productLine.sqmAuto)}
                          {productLine.product && !products.find(p => p.name === productLine.product)?.sqmPerBox && (
                            <div style={{ fontSize: '10px' }} title="Missing SQM/Box data in product master">! MAP ERROR</div>
                          )}
                        </td>
                        <td data-label="Rate">
                          <Form.Control
                            size="sm"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productLine.rate}
                            onChange={(e) => handleProductLineChange(index, 'rate', e.target.value)}
                            className="input-numeric rate-field"
                          />
                        </td>
                        <td data-label="Amount" className="calculated-field fw-bold">{formatPrice(productLine.amount, currency)}</td>

                        {/* Weights */}
                        <td data-label="Per Box Weight">
                          <Form.Control
                            size="sm"
                            type="number"
                            min="0"
                            step="0.1"
                            value={productLine.perBoxWeight}
                            onChange={(e) => handleProductLineChange(index, 'perBoxWeight', e.target.value)}
                            className="input-numeric"
                          />
                        </td>
                        <td data-label="Net Weight" className="calculated-field fw-bold">{formatWeight(productLine.netWeight)}</td>
                        <td data-label="Per Pallet Weight">
                          <Form.Control
                            size="sm"
                            type="number"
                            step="0.1"
                            value={productLine.perPalletWeight}
                            onChange={(e) => handleProductLineChange(index, 'perPalletWeight', e.target.value)}
                            className="input-numeric"
                          />
                        </td>
                        <td data-label="Gross Weight" className="calculated-field fw-bold">{formatWeight(productLine.grossWeight)}</td>

                        {/* Actions */}
                        <td data-label="Actions" className="text-center">
                          <Button
                            variant="link"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProductLine(index); }}
                            title="Delete product line"
                            className="btn-action-delete mx-auto"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-footer-sticky bg-light fw-bold">
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td data-label="" className="text-end text-primary pe-3">TOTAL</td>
                    <td data-label="Total Pallet" className="text-center text-white bg-primary">
                      {formatQuantity(productLines.reduce((sum, line) => sum + (parseFloat(line.totalPallet) || 0), 0))}
                    </td>
                    <td></td>
                    <td></td>
                    <td data-label="Total Boxes" className="text-center text-white bg-primary">
                      {formatQuantity(productLines.reduce((sum, line) => sum + (parseFloat(line.totalBoxes) || 0), 0))}
                    </td>
                    <td></td>
                    <td data-label="Total SQM" className="text-center text-white bg-primary">
                      {formatSQM(productLines.reduce((sum, line) => sum + (parseFloat(line.sqmAuto) || 0), 0))}
                    </td>
                    <td></td>
                    <td data-label="Total Amount" className="text-center text-white bg-primary">
                      {formatPrice(productLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0), currency)}
                    </td>
                    <td></td>
                    <td data-label="Total Net Weight" className="text-center text-white bg-primary">
                      {formatWeight(productLines.reduce((sum, line) => sum + (parseFloat(line.netWeight) || 0), 0))}
                    </td>
                    <td></td>
                    <td data-label="Total Gross Weight" className="text-center text-white bg-primary">
                      {formatWeight(productLines.reduce((sum, line) => sum + (parseFloat(line.grossWeight) || 0), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </div>

            {/* Mobile View: Cards (Visible on Small/Medium screens) */}
            <div className="product-cards-wrapper d-block d-lg-none mt-3">
              {productLines.map((productLine, index) => (
                <ProductLineCard
                  key={productLine.id || index}
                  productLine={productLine}
                  index={index}
                  products={products}
                  onProductLineChange={handleProductLineChange}
                  onWeightOverride={handleWeightOverride}
                  onDelete={handleDeleteProductLine}
                  onOpenRateHistory={openRateHistory}
                  onOpenImageModal={openImageModal}
                  showRateHistory={showRateHistory}
                  currentClient={currentClient}
                  rateHistoryManager={rateHistoryManager}
                />
              ))}

              {/* Mobile Summary Card */}
              <Card className="border-0 shadow-sm rounded-4 mb-4 bg-primary text-white">
                <Card.Body className="p-3">
                  <h6 className="fw-bold mb-3 border-bottom border-white border-opacity-25 pb-2">TOTAL SUMMARY</h6>
                  <Row className="g-2 small">
                    <Col xs={6}>Total Pallets:</Col>
                    <Col xs={6} className="text-end fw-bold">{formatQuantity(productLines.reduce((sum, line) => sum + (parseFloat(line.totalPallet) || 0), 0))}</Col>
                    <Col xs={6}>Total Boxes:</Col>
                    <Col xs={6} className="text-end fw-bold">{formatQuantity(productLines.reduce((sum, line) => sum + (parseFloat(line.totalBoxes) || 0), 0))}</Col>
                    <Col xs={6}>Total SQM:</Col>
                    <Col xs={6} className="text-end fw-bold">{formatSQM(productLines.reduce((sum, line) => sum + (parseFloat(line.sqmAuto) || 0), 0))}</Col>
                    <Col xs={12} className="my-2 border-top border-white border-opacity-25"></Col>
                    <Col xs={6}>Total Amount:</Col>
                    <Col xs={6} className="text-end fw-bold fs-6">{formatPrice(productLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0), currency)}</Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-content">
              <Package size={48} className="empty-icon" />
              <h5 className="empty-title">No Product Lines Added</h5>
              <p className="empty-message">
                Click the "Add Product Line" button above to start configuring
                your products
              </p>
              <Button
                variant="primary"
                onClick={handleCreateProductLine}
                className="add-first-btn"
              >
                <Plus size={18} className="me-2" />
                Create Your First Product Line
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
        className="image-preview-modal"
      >
        <Modal.Header closeButton className="image-modal-header">
          <Modal.Title>Product Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="image-modal-body text-center">
          {selectedProductImage && (
            <>
              <img
                src={selectedProductImage.url}
                alt="Product Preview"
                className="preview-image"
              />
              <div className="image-details mt-3">
                <h6>Image Details</h6>
                <p className="text-muted mb-0">
                  {selectedProductImage.name || 'Product Image'}
                </p>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Rate History Modal */}
      {showRateHistoryModal && selectedProductForHistory && (
        <RateHistoryManager
          show={showRateHistoryModal}
          onHide={() => setShowRateHistoryModal(false)}
          client={selectedProductForHistory.client}
          product={selectedProductForHistory.product}
          onApplyRate={handleApplyRate}
          rateHistoryManager={rateHistoryManager}
        />
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          key={initialProductData ? `tiles-${Date.now()}` : 'generic'}
          product={initialProductData}
          onSave={handleProductFormSave}
          onCancel={handleProductFormCancel}
          masterData={masterData}
          onMasterDataUpdate={onMasterDataUpdate}
        />
      )}

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
            Are you sure you want to remove <strong>{deleteIndex !== null ? (productLines[deleteIndex]?.product || 'this product') : ''}</strong> from the product lines?
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

      <style>{`
        .product-line-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px 12px 0 0;
          margin-bottom: 0;
          border-bottom: none;
        }

        .header-content {
          flex: 1;
        }

        .header-title {
          color: #1e40af;
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
        }

        .header-title svg {
          color: #3b82f6;
        }

        .header-subtitle {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .unique-header-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          border-radius: 8px;
          font-weight: 500;
          padding: 0.5rem 1rem;
          transition: all 0.2s ease;
          width: auto !important;
          min-width: fit-content;
        }

        .unique-header-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .product-table-container {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 0 0 12px 12px;
          min-height: 200px;
        }

        .table-scroll-wrapper {
          overflow-x: auto;
          overflow-y: auto;
          max-height: 600px;
          position: relative;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .table-scroll-wrapper::-webkit-scrollbar {
          height: 10px;
        }

        .table-scroll-wrapper::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 5px;
        }

        .table-scroll-wrapper::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 5px;
        }

        .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }

        .product-line-table {
          min-width: 2400px;
          white-space: nowrap;
        }

        .product-line-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .product-line-table th {
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          padding: 0.75rem 0.5rem;
          border-color: #e5e7eb;
          vertical-align: middle;
          text-align: center;
          position: sticky;
          top: 0;
          z-index: 10;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .product-line-table td {
          padding: 0.5rem;
          vertical-align: middle;
          border-color: #e5e7eb;
        }

        .col-index {
          width: 50px;
          min-width: 50px;
        }

        .col-product {
          min-width: 200px;
          max-width: 250px;
        }

        .col-image {
          width: 80px;
          min-width: 80px;
        }

        .col-itemref {
          min-width: 180px;
          max-width: 250px;
        }

        .col-hsn {
          min-width: 100px;
          max-width: 120px;
        }

        .col-size,
        .col-surface,
        .col-thickness {
          min-width: 120px;
          max-width: 150px;
        }

        .col-pallet,
        .col-boxes {
          min-width: 100px;
          max-width: 120px;
        }

        .col-sqm,
        .col-rate,
        .col-amount,
        .col-weight {
          min-width: 120px;
          max-width: 150px;
        }

        .col-actions {
          width: 80px;
          min-width: 80px;
        }

        .col-product-select {
          min-width: 200px;
          max-width: 250px;
        }

        .product-thumbnail {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .btn-action-delete {
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #ffffff;
          background-color: #ef4444;
          border: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }

        .btn-action-delete:hover {
          background-color: #dc2626;
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
        }

        .btn-action-delete:active {
          transform: translateY(0);
        }

        .product-thumbnail:hover {
          border-color: #3b82f6;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .no-image-placeholder {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 6px;
          color: #9ca3af;
        }

        .input-numeric {
          text-align: right;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .calculated-field {
          background-color: #f9fafb;
          text-align: right;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          color: #374151;
        }

        .row-incomplete {
          background-color: #fffbeb;
        }

        .rate-cell {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .historical-rate-badge {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .historical-rate-badge:hover {
          transform: scale(1.1);
        }

        .empty-state {
          padding: 3rem 2rem;
          text-align: center;
        }

        .empty-content {
          max-width: 400px;
          margin: 0 auto;
        }

        .empty-icon {
          color: #9ca3af;
          margin-bottom: 1rem;
        }

        .empty-title {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .empty-message {
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .add-first-btn {
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
        }

        .image-preview-modal .modal-content {
          border: none;
          border-radius: 16px;
          overflow: hidden;
        }

        .image-modal-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
        }

        .image-modal-body {
          padding: 2rem;
        }

        .preview-image {
          max-width: 100%;
          max-height: 70vh;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .image-details h6 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        /* Responsive Design */
        @media (max-width: 992px) {
          /* Allow global responsive.css to handle table-to-card transformation */
          /* Removed forced display: table!important CSS here to enable card layouts on mobile */
        }

        @media (max-width: 768px) {
          .product-line-header {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }

          .header-actions {
            width: 100%;
            justify-content: stretch;
          }

          .action-btn {
            flex: 1;
          }

          .product-table-container {
            padding: 0.5rem;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-icon {
            width: 32px;
            height: 32px;
          }

          .product-line-table th {
            font-size: 0.7rem;
            padding: 0.5rem 0.25rem;
          }

          .product-line-table td {
            padding: 0.25rem;
          }
        }

        @media (max-width: 576px) {
          .header-title {
            font-size: 1rem;
          }

          .header-subtitle {
            font-size: 0.75rem;
          }

          .action-btn {
            font-size: 0.875rem;
            padding: 0.5rem 0.75rem;
          }
        }
      `}</style>
    </>
  );
}

export default ProductLineTable;




