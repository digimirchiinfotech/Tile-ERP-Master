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

import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Form, Dropdown, Alert, Spinner, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  Package,
  CheckCircle,
  XCircle,
  Power,
  Printer
} from 'lucide-react';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import SanitarywareProductForm from './SanitarywareProductForm.jsx';
import SanitarywareProductView from './SanitarywareProductView.jsx';
import SanitarywareProductPrintView from './SanitarywareProductPrintView.jsx';
import FilterPanel from '../shared/FilterPanel.jsx';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import sanitarywareProductService from '../../services/sanitarywareProductService.js';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { tokenManager } from '../../utils/tokenManager.js';

function SanitarywareProductDashboard({ currentUser }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showProductForm, setShowProductForm] = useState(false);
  const [showProductView, setShowProductView] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);
  const [filters, setFilters] = useState({
    codeSKU: '',
    hsnCode: '',
    productName: '',
    category: '',
    status: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await sanitarywareProductService.getProducts();
      setProducts(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch sanitaryware products:', err);
      setError('Failed to load sanitaryware products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.status === 'Active').length,
    inactive: products.filter(p => p.status === 'Inactive').length,
    categories: [...new Set(products.map(p => p.category))].filter(Boolean).length
  }), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCode = !filters.codeSKU || String(p.product_code || p.productCode || '').toLowerCase().includes(filters.codeSKU.toLowerCase());
      const matchesHSN = !filters.hsnCode || String(p.hsn_code || p.hsnCode || '').toLowerCase().includes(filters.hsnCode.toLowerCase());
      const matchesName = !filters.productName || String(p.name || '').toLowerCase().includes(filters.productName.toLowerCase());
      const matchesCategory = !filters.category || p.category === filters.category;
      const matchesStatus = !filters.status || p.status === filters.status;
      return matchesCode && matchesHSN && matchesName && matchesCategory && matchesStatus;
    });
  }, [products, filters]);

  const resetFilters = () => {
    setFilters({ codeSKU: '', hsnCode: '', productName: '', category: '', status: '' });
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleViewProduct = (product) => {
    setViewingProduct(product);
    setShowProductView(true);
  };

  const handleDeleteProduct = (product) => {
    setConfirmConfig({
      title: '🗑️ Delete Product',
      message: `Are you sure you want to permanently delete "${product.name}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await sanitarywareProductService.deleteProduct(product.id);
          showSuccess('Product deleted successfully');
          fetchProducts();
        } catch (err) {
          showError('Failed to delete product');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleStatus = (product) => {
    const newStatus = product.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmConfig({
      title: 'Status Update',
      message: `Change status of "${product.name}" to ${newStatus}?`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          await sanitarywareProductService.toggleProductStatus(product.id);
          showSuccess('Status updated successfully');
          fetchProducts();
        } catch (err) {
          showError('Failed to update status');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct?.id) {
        await sanitarywareProductService.updateProduct(editingProduct.id, productData);
        showSuccess('Product updated successfully');
      } else {
        await sanitarywareProductService.createProduct(productData);
        showSuccess('Product created successfully');
      }
      fetchProducts();
      setShowProductForm(false);
    } catch (err) {
      console.error(err);
      showError('Failed to save product');
      throw err;
    }
  };

  const handleExport = () => {
    const columns = [
      createColumnDef('Product Name', 'name'),
      createColumnDef('Category', 'category'),
      createColumnDef('Code', 'product_code'),
      createColumnDef('HSN Code', 'hsn_code'),
      createColumnDef('Weight (kg)', 'weight_per_piece'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredProducts, columns, 'xlsx', 'sanitaryware_products', typeof currentUser !== 'undefined' ? currentUser?.role === 'super_admin' : false);
    showSuccess('Exported successfully');
  };

  const handleDownloadPDF = async (product) => {
    try { await api.post('/document-activity/doc/' + (product?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    setViewingProduct(product);
    setShowPrintModal(true);
    setTimeout(async () => {
      if (printRef.current) {
        showSuccess('Generating PDF...');
        const filename = `Sanitaryware_${(product.name || 'Product').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
        const result = await downloadPDF(printRef.current, filename);
        if (!result?.success) showError('Failed to generate PDF');
        setShowPrintModal(false);
      }
    }, 800);
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <Row className="mb-4 align-items-center">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <span className="fs-2">🛁</span>
            <div>
              <h2 className="fw-800 text-dark mb-0">Sanitaryware Products</h2>
              <p className="text-muted mb-0 small">Catalog premium sanitaryware designs, specifications, CBM volumes, and packing formulas.</p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Analytics widgets */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Package size={18} className="text-primary" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Products</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <CheckCircle size={18} className="text-success" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active Products</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <XCircle size={18} className="text-warning" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Inactive</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.inactive}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <span className="fw-bold text-info" style={{ fontSize: '1.1rem' }}>🗂️</span>
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Categories</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.categories}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Smart search & Filters */}
      <FilterPanel onClear={resetFilters} title="Search & Filters">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3 align-items-end">
            <Col lg={2} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Code / SKU</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.codeSKU}
                  onChange={(e) => setFilters(prev => ({ ...prev, codeSKU: e.target.value }))}
                >
                  <option value="">All Codes</option>
                  {[...new Set(products.map(p => p.product_code || p.productCode).filter(Boolean))].sort().map((code, idx) => (
                    <option key={idx} value={code}>{code}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">HSN Code</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.hsnCode}
                  onChange={(e) => setFilters(prev => ({ ...prev, hsnCode: e.target.value }))}
                >
                  <option value="">All HSN</option>
                  {[...new Set(products.map(p => p.hsn_code || p.hsnCode).filter(Boolean))].sort().map((hsn, idx) => (
                    <option key={idx} value={hsn}>{hsn}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Product Name</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.productName}
                  onChange={(e) => setFilters(prev => ({ ...prev, productName: e.target.value }))}
                >
                  <option value="">All Products</option>
                  {[...new Set(products.map(p => p.name).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Category</Form.Label>
                <Form.Select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                >
                  <option value="">All Categories</option>
                  {['Wash Basin', 'One Piece WC', 'Two Piece WC', 'Table Top Basin', 'Wall Hung WC', 'Urinal', 'Pedestal Basin', 'Sink', 'EWC', 'Orissa Pan', 'Accessories', 'Other'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Discontinued">Discontinued</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      {/* Main List */}
      <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white p-3 border-0 d-flex align-items-center justify-content-between">
          <h5 className="mb-0 fw-bold">Sanitaryware Inventory ({filteredProducts.length})</h5>
          <div className="d-flex gap-2">
            <Button
              variant="outline-light"
              size="sm"
              onClick={handleExport}
              style={{ borderRadius: '8px', height: '32px' }}
            >
              <Download size={14} className="me-1" />
              Export CSV
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={handleCreateProduct}
              className="text-primary fw-bold"
              style={{ borderRadius: '8px', height: '32px' }}
            >
              <Plus size={14} className="me-1" />
              Add Product
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading sanitaryware products...</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="m-3">{error}</Alert>
          ) : filteredProducts.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase">
                    <th className="ps-4" style={{ width: '80px' }}>SR. NO.</th>
                    <th>Status</th>
                    <th>Image</th>
                    <th>Code / SKU</th>
                    <th>HSN Code</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Weight</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr key={product.id || index}>
                      <td data-label="Sr." className="ps-4 text-muted small">{index + 1}</td>
                      <td data-label="Status">
                        <Badge 
                          bg={product.status === 'Active' ? 'success' : 'secondary'} 
                          className="px-2 py-1 cursor-pointer"
                          style={{ borderRadius: '6px' }}
                          onClick={() => handleToggleStatus(product)}
                        >
                          {product.status || 'Active'}
                        </Badge>
                      </td>
                      <td data-label="Image">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={`${(product.images[0].url || product.images[0].path).startsWith('http') ? '' : 'https://tile-erp-master-production.up.railway.app'}${product.images[0].url || product.images[0].path}?token=${tokenManager?.getAccessToken?.() || ''}`}
                            alt={product.name}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                        ) : (
                          <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🚽</span>
                          </div>
                        )}
                      </td>
                      <td data-label="Code / SKU" className="fw-semibold text-dark">{product.product_code || product.productCode || 'N/A'}</td>
                      <td data-label="HSN Code" className="fw-bold text-secondary">{product.hsn_code || product.hsnCode || 'N/A'}</td>
                      <td data-label="Product Name" className="fw-bold text-primary">{product.name}</td>
                      <td data-label="Category">
                        <span className="badge bg-primary-light text-primary px-2 py-1" style={{ borderRadius: '6px' }}>
                          {product.category}
                        </span>
                      </td>
                      <td data-label="Weight">{product.weight_per_piece || product.weightPerPiece || 0} kg</td>
                      <td data-label="Actions" className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle hover-bg-info-light"
                            onClick={() => handleViewProduct(product)}
                            title="View Preview"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle hover-bg-primary-light"
                            onClick={() => handleEditProduct(product)}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle hover-bg-success-light"
                            onClick={() => handleDownloadPDF(product)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          <Button
                            variant={product.status === 'Active' ? 'outline-warning' : 'outline-success'}
                            size="sm"
                            className={product.status === 'Active' ? 'border-warning-subtle text-warning hover-bg-warning-light' : 'border-success-subtle text-success hover-bg-success-light'}
                            onClick={() => handleToggleStatus(product)}
                            title={product.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            <Power size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-danger border-danger-subtle hover-bg-danger-light"
                            onClick={() => handleDeleteProduct(product)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <span className="fs-1 text-muted opacity-50">🚽</span>
              <p className="text-muted mt-2 small">No sanitaryware products matching filters.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Save Modal */}
      {showProductForm && (
        <SanitarywareProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => setShowProductForm(false)}
        />
      )}

      {/* View Modal */}
      {showProductView && (
        <SanitarywareProductView
          product={viewingProduct}
          onCancel={() => setShowProductView(false)}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
        variant={confirmConfig.variant}
      />

      {/* Product Print Modal */}
      {showPrintModal && viewingProduct && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Product Specification Print — {viewingProduct.name}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printRef}>
              <SanitarywareProductPrintView productData={viewingProduct} />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={viewingProduct?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}

export default SanitarywareProductDashboard;
