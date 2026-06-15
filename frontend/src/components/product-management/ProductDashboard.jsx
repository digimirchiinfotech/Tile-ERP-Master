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

import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Badge, Form, Dropdown, Alert, Spinner, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Plus, Search, Edit, Trash2, Eye, RotateCcw, Download, Upload, Power, AlertCircle, Printer, Link, Package, CheckCircle, XCircle, Layers as LayersIcon, TrendingUp, Check, X } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { deduplicateMasterData } from '../../utils/inputHelpers.js';
import ProductForm from './ProductForm.jsx';
import ProductView from './ProductView.jsx';
import SmartProductFilter from './SmartProductFilter.jsx';
import ProductBundleManager from './ProductBundleManager.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import bulkDeleteService from '../../services/bulkDeleteService.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import { useProducts } from '../../hooks/useProducts';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import { tokenManager } from '../../utils/tokenManager.js';
import ProductPrintView from './ProductPrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { useRef } from 'react';

function ProductDashboard({ currentUser, productsData, navigationData }) {
  // Use props if provided, otherwise call hooks
  const productsHook = useProducts();
  const { products, loading, error, createProduct, updateProduct, deleteProduct, toggleProductStatus, fetchProducts } = productsData || productsHook;
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Multi-select hook
  const multiSelect = useMultiSelect(products);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showProductForm, setShowProductForm] = useState(false);
  const [showProductView, setShowProductView] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [confirmPendingData, setConfirmPendingData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);
  const [masterData, setMasterData] = useState({
    factoryNames: [],
    catalogueNames: [],
    categories: [],
    sizes: [],
    surfaces: [],
    thickness: [],
    applications: [],
  });

  // Fetch all master data from backend
  useEffect(() => {
    let mounted = true;
    const fetchMasterData = async () => {
      try {
        const api = (await import('../../services/api')).default;

        // Fetch all master data at once
        const resp = await api.get('/master-data');
        if (!mounted) return;

        const data = resp?.data?.data || {};

        // Set all master data with fallback to defaults if empty
        setMasterData({
          factoryNames: deduplicateMasterData(data.factoryNames?.length > 0 ? data.factoryNames : []),
          catalogueNames: deduplicateMasterData(data.catalogueNames?.length > 0 ? data.catalogueNames : ['Tiles']),
          categories: deduplicateMasterData(data.categories?.length > 0 ? data.categories : []),
          sizes: deduplicateMasterData(data.sizes?.length > 0 ? data.sizes : ['600x600mm', '300x600mm', '800x800mm', '400x400mm']),
          surfaces: deduplicateMasterData(data.surfaces?.length > 0 ? data.surfaces : ['Matt', 'Glossy', 'Semi-Matt', 'Polished']),
          thickness: deduplicateMasterData(data.thickness?.length > 0 ? data.thickness : ['8mm', '10mm', '12mm', '15mm']),
          applications: deduplicateMasterData(data.applications?.length > 0 ? data.applications : ['Floor', 'Wall', 'Both']),
        });
      } catch (err) {
        console.error('Failed to fetch master data:', err);
        // Use default values on error
        setMasterData({
          factoryNames: [],
          catalogueNames: ['Tiles'],
          categories: [],
          sizes: ['600x600mm', '300x600mm', '800x800mm', '400x400mm'],
          surfaces: ['Matt', 'Glossy', 'Semi-Matt', 'Polished'],
          thickness: ['8mm', '10mm', '12mm', '15mm'],
          applications: ['Floor', 'Wall', 'Both'],
        });
      }
    };

    fetchMasterData();
    return () => { mounted = false; };
  }, []);

  const [filters, setFilters] = useState({
    factoryName: '',
    factoryProductName: '',
    companyProductName: '',
    category: '',
    size: '',
    surface: '',
    thickness: '',
    application: '',
    status: '',
    smartFilter: '',
  });

  const dashboardStats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.status === 'Active').length,
    inactive: products.filter(p => p.status === 'Inactive').length,
    categories: [...new Set(products.map(p => p.category).filter(Boolean))].length
  }), [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (filters.factoryName) {
      const term = filters.factoryName.toLowerCase();
      filtered = filtered.filter(p => (p.factoryName || '').toLowerCase().includes(term));
    }

    if (filters.factoryProductName) {
      const term = filters.factoryProductName.toLowerCase();
      filtered = filtered.filter(p => (p.factoryProductName || '').toLowerCase().includes(term));
    }

    if (filters.companyProductName) {
      const term = filters.companyProductName.toLowerCase();
      filtered = filtered.filter(p => (p.companyProductName || p.name || '').toLowerCase().includes(term));
    }

    if (filters.category) {
      filtered = filtered.filter((product) => (product.category || '') === filters.category);
    }

    if (filters.size) {
      filtered = filtered.filter((product) => {
        if (!product.size) return false;
        const sizeArray = Array.isArray(product.size)
          ? product.size
          : product.size.split(',').map(s => s.trim());
        return sizeArray.includes(filters.size);
      });
    }

    if (filters.surface) {
      filtered = filtered.filter((product) => {
        if (!product.surface) return false;
        const surfaceArray = Array.isArray(product.surface)
          ? product.surface
          : product.surface.split(',').map(s => s.trim());
        return surfaceArray.includes(filters.surface);
      });
    }

    if (filters.thickness) {
      filtered = filtered.filter((product) => {
        if (!product.thickness) return false;
        const thicknessArray = Array.isArray(product.thickness)
          ? product.thickness
          : product.thickness.split(',').map(t => t.trim());
        return thicknessArray.includes(filters.thickness);
      });
    }

    if (filters.application) {
      filtered = filtered.filter((product) => {
        if (!product.application) return false;
        const applicationArray = Array.isArray(product.application)
          ? product.application
          : product.application.split(',').map(s => s.trim());
        return applicationArray.includes(filters.application);
      });
    }

    if (filters.status) {
      filtered = filtered.filter((product) => product.status === filters.status);
    }

    return filterByDateRange(filtered, dateRange.start, dateRange.end, "created_at");
  }, [filters, products, dateRange]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange]);

  const [showBundleManager, setShowBundleManager] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);

  // Real-time synchronization listener
  useEffect(() => {
    const handleSync = () => {
      if (fetchProducts) fetchProducts();
    };
    window.addEventListener('products:changed', handleSync);
    return () => window.removeEventListener('products:changed', handleSync);
  }, [fetchProducts]);

  // Deep-link effect: handle navigation from search results
  useEffect(() => {
    if (navigationData?.id && products.length > 0) {
      const product = products.find(p => p.id === navigationData.id);
      if (product) {
        setEditingProduct(product);
        setShowProductForm(true);
      }
    }
  }, [navigationData, products]);

  const handleAddProductByCategory = (category) => {
    setSelectedCategory(category);
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product) => {
    setSelectedCategory(product.catalogue || product.catalogueName || 'Tiles');
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleViewProduct = (product) => {
    setViewingProduct(product);
    setShowProductView(true);
  };

  const handlePrintProduct = (product) => {
    setViewingProduct(product);
    setShowPrintModal(true);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintModal(false);
      }
    }, 500);
  };

  const handleDownloadPDF = async (product) => {
    try { await api.post('/document-activity/doc/' + (product?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch (e) { }
    setViewingProduct(product);
    setShowPrintModal(true);
    setTimeout(async () => {
      if (printRef.current) {
        showSuccess('Generating PDF...');
        const filename = `Product_${(product.name || product.companyProductName || 'Product').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
        const result = await downloadPDF(printRef.current, filename);
        if (!result?.success) showError('Failed to generate PDF');
        setShowPrintModal(false);
      }
    }, 800);
  };

  const handleDeleteProduct = (productId) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteProduct(productId);
          showSuccess('Product deleted successfully');
        } catch (err) {
          console.error('❌ Delete error:', err);
          showError('Failed to delete product: ' + (err.response?.data?.message || err.message));
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleProductStatus = (product) => {
    const newStatus = product.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmConfig({
      title: `${newStatus === 'Active' ? 'Activate' : 'Deactivate'} Product`,
      message: `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} product "${product.name || product.companyProductName}"?`,
      variant: newStatus === 'Active' ? 'success' : 'warning',
      onConfirm: async () => {
        try {
          await toggleProductStatus(product.id);
          showSuccess(`Product ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
        } catch (err) {
          console.error('❌ Toggle status error:', err);
          showError('Failed to toggle product status: ' + (err.response?.data?.message || err.message));
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleSaveProduct = async (productData) => {
    if (editingProduct?.id) {
      setConfirmConfig({
        title: "Confirm Product Update",
        message: "Are you sure you want to update this product? All linked modules will be synced automatically.",
        variant: 'primary',
        onConfirm: () => performSaveProduct(productData)
      });
      setConfirmPendingData(productData);
      setShowConfirmModal(true);
      return { id: editingProduct.id };
    } else {
      return await performSaveProduct(productData);
    }
  };

  const performSaveProduct = async (productData) => {
    setIsSaving(true);
    try {
      let savedProduct;
      if (editingProduct && editingProduct.id) {
        await updateProduct({ id: editingProduct.id, data: productData });
        savedProduct = { id: editingProduct.id, ...productData };
        showSuccess('✅ Product updated successfully!');
      } else {
        const result = await createProduct({
          ...productData,
          catalogue: selectedCategory || 'Tiles',
          catalogueName: selectedCategory || 'Tiles',
        });
        savedProduct = result;
        showSuccess('✅ Product created successfully!');
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setShowConfirmModal(false);
      setConfirmPendingData(null);
      setConfirmConfig({ title: '', message: '', onConfirm: () => { }, variant: 'danger' });
      return savedProduct;
    } catch (err) {
      console.error('Failed to save product:', err);
      showError('Failed to save product: ' + (err.response?.data?.message || err.message));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleMasterDataUpdate = async (field, newValue) => {
    try {
      // Standardize formatting for sizes and surfaces
      let processedValue = newValue;
      if (field === 'sizes' || field === 'surfaces' || field === 'thickness') {
        processedValue = newValue.toUpperCase().replace(/X/g, 'X').replace(/MM/g, 'MM');
      }

      const api = (await import('../../services/api')).default;
      const response = await api.post(`/master-data/${field}`, { value: processedValue });
      const savedValue = response?.data?.data?.value || processedValue.trim();

      setMasterData((prev) => {
        const currentValues = prev[field] || [];
        const isDuplicate = currentValues.some(v => {
          const existingVal = typeof v === 'object' ? (v.value || v.name || '') : v;
          return String(existingVal).toLowerCase() === String(savedValue).toLowerCase();
        });

        if (isDuplicate) {
          return prev;
        }
        return {
          ...prev,
          [field]: [...currentValues, { id: response?.data?.data?.id, value: savedValue }],
        };
      });
    } catch (err) {
      console.error('Failed to save master data:', err);
      if (err.response?.status === 409) {
        const msg = err.response?.data?.message || `"${newValue}" already exists`;
        showInfo(msg);
        return;
      }
      showError(err.response?.data?.message || 'Failed to save new value');
    }
  };

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({
        factoryName: '',
        factoryProductName: '',
        companyProductName: '',
        category: '',
        size: '',
        surface: '',
        thickness: '',
        application: '',
        status: '',
        smartFilter: '',
      });
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleCreateBundle = () => {
    setEditingBundle(null);
    setShowBundleManager(true);
  };

  const handleSaveBundle = async (bundleData) => {
    try {
      if (editingBundle) {
        await updateProduct(editingBundle.id, bundleData);
      } else {
        await createProduct(bundleData);
      }
      setShowBundleManager(false);
      showSuccess('Product bundle saved successfully');
    } catch (err) {
      showError('Failed to save bundle: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      await bulkDeleteService.deleteProducts(multiSelect.getSelectedIds());
      multiSelect.clearSelection();
      await fetchProducts();
      showSuccess('Selected products deleted successfully');
    } catch (err) {
      showError('Bulk delete failed: ' + err.message);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      factoryName: '',
      factoryProductName: '',
      companyProductName: '',
      size: '',
      surface: '',
      thickness: '',
      application: '',
      status: '',
    });
  };



  const exportProducts = () => {
    const columns = [
      createColumnDef('Factory Name', 'factoryName'),
      createColumnDef('Product Name', 'name'),
      createColumnDef('Catalogue', 'catalogueName'),
      createColumnDef('Size', (p) => Array.isArray(p.size) ? p.size.join(', ') : (p.size || '')),
      createColumnDef('Surface', (p) => Array.isArray(p.surface) ? p.surface.join(', ') : (p.surface || '')),
      createColumnDef('Thickness', 'thickness'),
      createColumnDef('Box Pcs', 'boxPcs'),
      createColumnDef('Box Weight', 'boxWeight'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredProducts, columns, 'xlsx', 'products', typeof currentUser !== 'undefined' ? currentUser?.role === 'super_admin' : false);
  };

  const handleImportData = async (importData) => {
    try {
      setIsSaving(true);
      
      const mappedProducts = importData.map(prod => ({
        factory_name: prod.factoryName || prod['Factory Name'] || prod.factory || null,
        factory_product_name: prod.factoryProductName || prod['Factory Product Name'] || null,
        company_product_name: prod.companyProductName || prod['Company Product Name'] || prod['Product Name'] || prod.name || null,
        name: prod.name || prod['Product Name'] || prod.companyProductName || prod['Company Product Name'] || 'Imported Product',
        product_code: prod.productCode || prod['Product Code'] || prod.sku || null,
        item_ref: prod.itemRef || prod['Item Ref'] || null,
        catalogue_name: prod.catalogueName || prod['Catalogue Name'] || prod.catalogue || 'Tiles',
        category: prod.category || prod['Category'] || prod.catalogueName || prod.catalogue || 'Tiles',
        size: prod.size || prod['Size'] || null,
        surface: prod.surface || prod['Surface'] || prod.finish || null,
        thickness: prod.thickness || prod['Thickness'] || null,
        application: prod.application || prod['Application'] || null,
        hs_code: prod.hsCode || prod['HS Code'] || prod.hsn || null,
        box_pcs: prod.boxPcs || prod.boxPC || prod['Box Pcs'] || prod['Pcs/Box'] || 0,
        sqm_per_box: prod.sqmPerBox || prod['SQM per Box'] || prod['Area/Box'] || 0,
        box_weight: prod.boxWeight || prod.defaultPerBoxWeight || prod['Box Weight'] || 0,
        default_per_box_weight: prod.defaultPerBoxWeight || prod.boxWeight || prod['Box Weight'] || 0,
        boxes_per_pallet: prod.boxesPerPallet || prod.defaultBoxesPerPallet || prod['Boxes per Pallet'] || 0,
        default_per_pallet_weight: prod.defaultPerPalletWeight || prod['Pallet Weight'] || 0,
        factory_price: prod.factoryPrice || prod['Factory Price'] || 0,
        selling_price: prod.sellingPrice || prod['Selling Price'] || 0,
        base_price: prod.basePrice || prod['Base Price'] || 0,
        margin: prod.margin || prod['Margin'] || 0,
        images: prod.images || [],
        status: prod.status || 'Active',
        description: prod.description || prod['Description'] || null
      }));

      const result = await bulkCreateProducts(mappedProducts);
      
      const responseData = result?.data || result;
      const insertedCount = responseData?.insertedCount || 0;
      const updatedCount = responseData?.updatedCount || 0;

      showSuccess(`✅ Successfully processed ${mappedProducts.length} products! (${insertedCount} inserted, ${updatedCount} updated)`);
      fetchProducts();
      setShowImportModal(false);
    } catch (err) {
      showError('Failed to import products: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Check permissions
  // Professional Role-Based Access Control (RBAC) with administrative fallbacks
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = ['super_admin', 'company_admin', 'admin'].includes(userRole);
  const hasGlobalPermission = currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('company_all');

  const canManageProducts =
    isAdmin ||
    userRole === 'administration' ||
    hasGlobalPermission ||
    currentUser?.permissions?.includes('product_management') ||
    currentUser?.permissions?.includes('administration');

  if (!canManageProducts) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Tile Product.</p>
      </div>
    );
  }

  const canEdit = ['super_admin', 'company_admin', 'administration'].includes(
    currentUser?.role
  );
  const canDelete = ['super_admin', 'company_admin'].includes(
    currentUser?.role
  );

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading products...</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Title */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Tile Product</h2>
          <p className="text-muted">Manage your product catalog, specifications, and digital inventory</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Package size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Products</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><CheckCircle size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active Products</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><LayersIcon size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Categories</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.categories}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><XCircle size={18} className="text-danger" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Inactive</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.inactive}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="secondary" dismissible>
          <div className="d-flex align-items-center">
            <AlertCircle size={20} className="me-2" />
            <div>
              <strong>Loading Error:</strong> {typeof error === 'string' ? error : (error.message || 'Failed to load required data')}
            </div>
          </div>
        </Alert>
      )}

      {/* Smart Product Filters */}
      <SmartProductFilter
        filters={filters}
        onFiltersChange={handleFilterChange}
        products={products}
        dateRange={dateRange}
        setDateRange={setDateRange}
        masterData={masterData}
      />


      <BulkActionBar
        selectedCount={multiSelect.getSelectedCount()}
        onSelectAll={(shouldSelect) => {
          if (shouldSelect) {
            multiSelect.toggleSelectAll(filteredProducts);
          } else {
            multiSelect.clearSelection();
          }
        }}
        onClearSelection={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        isLoading={isSaving}
        selectAllChecked={multiSelect.selectAll}
        totalItems={filteredProducts.length}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />

      {/* Products List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Products ({filteredProducts.length})</h5>
          <div className="d-flex flex-row gap-2 flex-wrap align-items-center justify-content-end">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportProducts}
              className="border-white text-white d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Download size={14} className="me-1" />
              <span className="d-none d-md-inline small">Export</span>
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={() => setShowImportModal(true)}
                  className="border-white text-white d-flex align-items-center flex-shrink-0"
                  style={{ width: 'auto' }}
                >
                  <Upload size={14} className="me-1" />
                  <span className="d-none d-md-inline small">Import</span>
                </Button>

                <Button
                  variant="light"
                  size="sm"
                  onClick={() => handleAddProductByCategory('Tiles')}
                  className="text-primary fw-bold d-flex align-items-center flex-shrink-0"
                >
                  <Plus size={16} className="me-1" />
                  <span className="d-none d-sm-inline small">Add Tiles Product</span>
                  <span className="d-sm-none small">Add</span>
                </Button>
              </>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive d-none d-lg-block">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr className="table-light text-muted small text-uppercase">
                  <th className="ps-4" style={{ width: '80px' }}>SR. NO.</th>
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredProducts)}
                    />
                  </th>
                  <th>Status</th>
                  <th>Image</th>
                  <th>Factory Name</th>
                  <th>Factory Product Name</th>
                  <th>Company Product Name</th>
                  <th>Size</th>
                  <th>Surface</th>
                  <th>Catalogue</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product, index) => (
                    <tr key={product.id} className={multiSelect.isSelected(product.id) ? 'table-active' : ''}>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(product.id)}
                          onChange={() => multiSelect.toggleSelect(product.id)}
                        />
                      </td>
                      <td><StatusBadge status={product.status} /></td>
                      <td>
                        {product.images?.[0]?.url || product.images?.[0]?.path ? (
                          <img
                            src={`${(product.images[0].url || product.images[0].path).startsWith('http') ? '' : 'https://tile-erp-master-production.railway.app'}${product.images[0].url || product.images[0].path}?token=${tokenManager.getAccessToken() || ''}`}
                            alt={product.name}
                            onError={(e) => {
                              if (!e.target.dataset.triedToken && !e.target.src.includes('token=')) {
                                e.target.dataset.triedToken = 'true';
                                const token = tokenManager.getAccessToken();
                                if (token) e.target.src = `${e.target.src.split('?')[0]}?token=${token}`;
                              } else {
                                e.target.onerror = null; // prevent infinite loops
                                e.target.style.display = 'none';
                                e.target.insertAdjacentHTML('afterend', '<div class="bg-light d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; border-radius: 4px;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image text-secondary opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>');
                              }
                            }}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ) : (
                          <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '4px' }}>
                            <Package size={20} className="text-secondary opacity-50" />
                          </div>
                        )}
                      </td>
                      <td>{product.factoryName || '-'}</td>
                      <td>{product.factoryProductName || '-'}</td>
                      <td className="fw-semibold text-primary">{product.companyProductName || product.name || '-'}</td>
                      <td>{product.size || '-'}</td>
                      <td>{product.surface || '-'}</td>
                      <td>{product.catalogueName || product.catalogue || '-'}</td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewProduct(product)}
                            title="View Preview"
                          >
                            <Eye size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handleEditProduct(product)}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(product)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant={product.status === 'Active' ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              className={product.status === 'Active' ? 'border-warning-subtle text-warning' : 'border-success-subtle text-success'}
                              onClick={() => handleToggleProductStatus(product)}
                              title={product.status === 'Active' ? 'Deactivate' : 'Activate'}
                            >
                              <Power size={14} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-danger border-danger-subtle"
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center py-5 text-muted">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedProducts.length > 0 ? (
              paginatedProducts.map((product, index) => (
                <Card key={product.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div className="d-flex align-items-center gap-3">
                        {product.images?.[0]?.url || product.images?.[0]?.path ? (
                          <img
                            src={`${(product.images[0].url || product.images[0].path).startsWith('http') ? '' : 'https://tile-erp-master-production.railway.app'}${product.images[0].url || product.images[0].path}?token=${tokenManager.getAccessToken() || ''}`}
                            alt={product.name}
                            onError={(e) => {
                              if (!e.target.dataset.triedToken && !e.target.src.includes('token=')) {
                                e.target.dataset.triedToken = 'true';
                                const token = tokenManager.getAccessToken();
                                if (token) e.target.src = `${e.target.src.split('?')[0]}?token=${token}`;
                              } else {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.insertAdjacentHTML('afterend', '<div class="bg-light d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; border-radius: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image text-secondary opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>');
                              }
                            }}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }}
                          />
                        ) : (
                          <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', borderRadius: '8px' }}>
                            <Package size={24} className="text-secondary opacity-50" />
                          </div>
                        )}
                        <div>
                          <h5 className="fw-bold mb-1 text-dark">
                            {product.companyProductName || product.name || 'Unnamed Product'}
                          </h5>
                          <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {product.catalogueName || product.catalogue || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="status-container">
                        <StatusBadge status={product.status} />
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Factory:</label>
                          <div className="text-dark text-truncate">{product.factoryName || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Size:</label>
                          <div className="text-dark">{product.size || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Surface:</label>
                          <div className="text-dark">{product.surface || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Box Weight:</label>
                          <div className="text-dark">{product.defaultPerBoxWeight || product.boxWeight || '-'}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewProduct(product)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleEditProduct(product)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(product)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintProduct(product)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${product.status === 'Active' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold`}
                          onClick={() => handleToggleProductStatus(product)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Power size={14} className="me-1" /> Status
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handleDeleteProduct(product.id)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Trash2 size={14} className="me-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))
            ) : (
              <div className="text-center py-5 text-muted">
                No products found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredProducts.length} pageSize={PAGE_SIZE} />
      </Card>

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="products"
      />

      {/* Product Bundle Manager */}
      <ProductBundleManager
        show={showBundleManager}
        onHide={() => setShowBundleManager(false)}
        onSave={handleSaveBundle}
        products={(products || []).filter(p => !p.isBundle)}
        existingBundle={editingBundle}
      />

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowProductForm(false);
            setSelectedCategory(null);
          }}
          masterData={masterData}
          onMasterDataUpdate={handleMasterDataUpdate}
        />
      )}

      {/* Product View Modal */}
      {showProductView && (
        <ProductView
          product={viewingProduct}
          onClose={() => setShowProductView(false)}
          onEdit={() => {
            setShowProductView(false);
            handleEditProduct(viewingProduct);
          }}
          onPrint={() => {
            setShowProductView(false);
            handlePrintProduct(viewingProduct);
          }}
        />
      )}

      {/* Product Print Modal */}
      {showPrintModal && viewingProduct && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Product Specification Print — {viewingProduct.name || viewingProduct.companyProductName}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">

              <div ref={printRef}>
                <ProductPrintView productData={viewingProduct} />
              </div>

            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={viewingProduct?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmPendingData(null);
          setConfirmConfig({ title: '', message: '', onConfirm: () => { }, variant: 'danger' });
        }}
        isLoading={isSaving}
        confirmText="Confirm"
        variant={confirmConfig.variant}
      />
      <style>{`
        .product-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        .status-box {
          letter-spacing: 0.5px;
          font-size: 0.75rem;
        }
        .detail-item label {
          letter-spacing: 0.5px;
          color: #6c757d;
        }
        .detail-item div {
          font-weight: 500;
          font-size: 0.95rem;
        }
        .bg-light-subtle {
          background-color: #f8f9fa;
        }
      `}</style>
      <style>{`
        .pl-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        .detail-item label {
          letter-spacing: 0.5px;
          color: #6c757d;
        }
        .detail-item div {
          font-weight: 500;
          font-size: 0.95rem;
        }
        .bg-light-subtle {
          background-color: #f8f9fa;
        }
        .icon-box {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        .bg-primary-light { background-color: rgba(30, 64, 175, 0.1); }
        .bg-warning-light { background-color: rgba(245, 158, 11, 0.1); }
        .bg-info-light { background-color: rgba(6, 182, 212, 0.1); }
        .bg-success-light { background-color: rgba(16, 185, 129, 0.1); }
        .bg-danger-light { background-color: rgba(239, 68, 68, 0.1); }
      `}</style>
    </>
  );
}

export default ProductDashboard;
