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
import { Row, Col, Card, Table, Badge, Form } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Plus, Search, Edit, Trash2, Eye, Download, Upload, RotateCcw, Building, Power, Trash, Printer, CheckCircle, XCircle, TrendingUp, Users as UsersIcon, Check } from 'lucide-react';

import renderStars from '../../utils/renderStars.jsx';
import SupplierForm from './SupplierForm.jsx';
import SupplierView from './SupplierView.jsx';
import SupplierPrintView from './SupplierPrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import api from '../../services/api.js';
import { useRef } from 'react';
import { Modal } from 'react-bootstrap';
import FilterPanel from '../shared/FilterPanel.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import { useBulkOperations } from '../../hooks/useBulkOperations.js';
import { useSuppliers } from '../../hooks/useSuppliers';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import PremiumCard from '../shared/PremiumCard.jsx';
import PremiumDataGrid from '../shared/PremiumDataGrid.jsx';

// Inline edit component for Status
const InlineStatusEdit = ({ status, onChange, onBlur }) => {
  return (
    <Form.Select
      size="sm"
      autoFocus
      value={status}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={{ width: 'auto', minWidth: '100px' }}
    >
      <option value="Active">Active</option>
      <option value="Inactive">Inactive</option>
      <option value="Blacklisted">Blacklisted</option>
    </Form.Select>
  );
};
function SupplierDashboard({ currentUser, navigationData }) {
  // Professional Role-Based Access Control (RBAC) with administrative fallbacks
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = ['super_admin', 'company_admin', 'admin'].includes(userRole);
  const hasGlobalPermission = currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('company_all');

  const canManageSuppliers =
    isAdmin ||
    hasGlobalPermission ||
    currentUser?.permissions?.includes('supplier_management');

  const canEdit = [
    'super_admin',
    'company_admin',
    'purchase',
    'purchase_manager',
    'sales_manager',
    'sales_executive',
  ].includes(currentUser?.role);
  
  const canDelete = ['super_admin', 'company_admin'].includes(
    currentUser?.role
  );

  const { suppliers, loading, error, createSupplier, updateSupplier, deleteSupplier, toggleSupplierStatus, fetchSuppliers } = useSuppliers();
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showSupplierView, setShowSupplierView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const printRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, variant: 'danger' });

  // Bulk operations hook
  const bulk = useBulkOperations();

  const [filters, setFilters] = useState({
    supplierName: '',
    contactPerson: '',
    city: '',
    productCategory: '',
    status: '',
  });

  const dashboardStats = useMemo(() => ({
    total: (suppliers || []).length,
    active: (suppliers || []).filter((supplier) => supplier.status === 'Active').length,
    inactive: (suppliers || []).filter((supplier) => supplier.status === 'Inactive').length,
    totalValue: (suppliers || []).reduce(
      (sum, supplier) => sum + (supplier.totalPurchaseValue || 0),
      0
    ),
  }), [suppliers]);

  const [errorModalConfig, setErrorModalConfig] = useState({
    show: false,
    errors: {},
    title: 'Validation Error',
    message: null
  });

  const showErrorModal = (error, title) => {
    if (error.response?.data?.errors) {
      setErrorModalConfig({
        show: true,
        errors: error.response.data.errors,
        title: title || 'Validation Error',
        message: error.response.data.message
      });
    } else {
      showError(title + ': ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers || [];

    if (filters.supplierName) {
      filtered = filtered.filter(
        (supplier) =>
          (supplier.name || '').toLowerCase().includes(filters.supplierName.toLowerCase())
      );
    }

    if (filters.contactPerson) {
      filtered = filtered.filter(
        (supplier) =>
          (supplier.contactPersonName || '').toLowerCase().includes(filters.contactPerson.toLowerCase())
      );
    }

    if (filters.city) {
      filtered = filtered.filter(
        (supplier) => supplier.city === filters.city
      );
    }


    if (filters.status) {
      filtered = filtered.filter((supplier) => supplier.status === filters.status);
    }

    if (filters.productCategory) {
      filtered = filtered.filter((supplier) =>
        supplier.productCategories?.includes(filters.productCategory)
      );
    }

    return filterByDateRange(filtered, dateRange.start, dateRange.end, "createdAt");
  }, [filters, suppliers, dateRange]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange]);

  // Real-time synchronization listener
  useEffect(() => {
    const handleSync = () => {
      if (fetchSuppliers) fetchSuppliers();
    };
    window.addEventListener('suppliers:changed', handleSync);
    return () => window.removeEventListener('suppliers:changed', handleSync);
  }, [fetchSuppliers]);

  // Local Keyboard Shortcuts (Phase 2)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow Alt+N to open "Create Supplier" locally, preventing global Alt+N if we catch it
      if (e.altKey && e.key.toLowerCase() === 'n') {
        // Skip if user is typing in an input
        const tag = e.target?.tagName?.toLowerCase();
        const isEditable = e.target?.isContentEditable;
        if (['input', 'textarea', 'select'].includes(tag) || isEditable) return;
        
        e.preventDefault();
        e.stopPropagation(); // Try to stop global listener
        if (canEdit) {
          handleCreateSupplier();
        }
      }
    };
    // Use capture phase to intercept before global listener
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [canEdit]);

  // Deep-link effect: handle navigation from search results
  useEffect(() => {
    if (navigationData?.id && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === navigationData.id);
      if (supplier) {
        setEditingSupplier(supplier);
        setShowSupplierForm(true);
      }
    }
  }, [navigationData, suppliers]);

  const handleCreateSupplier = () => {
    setEditingSupplier(null);
    setShowSupplierForm(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
  };

  const handleViewSupplier = (supplier) => {
    setViewingSupplier(supplier);
    setShowSupplierView(true);
  };

  const handlePrintSupplier = (supplier) => {
    setViewingSupplier(supplier);
    setShowPrintModal(true);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintModal(false);
      }
    }, 500);
  };

  const handleDownloadPDF = async (supplier) => {
    try { await api.post('/document-activity/doc/' + (supplier?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch (e) { }
    setViewingSupplier(supplier);
    setShowPrintModal(true);
    setTimeout(async () => {
      if (printRef.current) {
        showSuccess('Generating PDF...');
        const filename = `Supplier_${(supplier.name || 'Supplier').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
        const result = await downloadPDF(printRef.current, filename);
        if (!result?.success) showError('Failed to generate PDF');
        setShowPrintModal(false);
      }
    }, 800);
  };

  const handleDeleteSupplier = (supplierId, force = false) => {
    setConfirmConfig({
      title: force ? 'Confirm Force Delete' : 'Confirm Delete',
      message: force 
        ? 'Are you sure you want to force delete this supplier? This will bypass references (e.g. in Proforma Orders).'
        : 'Are you sure you want to delete this supplier? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteSupplier(supplierId, force);
          showSuccess('Supplier deleted successfully');
        } catch (error) {
          console.error('❌ Delete error:', error);
          if (error.response?.status === 409) {
            setConfirmConfig({
              title: 'Reference Conflict',
              message: error.response.data.message + ' Would you like to force delete?',
              variant: 'warning',
              onConfirm: () => handleDeleteSupplier(supplierId, true)
            });
            setShowConfirmModal(true);
            return;
          }
          showError(error.response?.data?.message || 'Failed to delete supplier. Please try again.');
        } finally {
          if (!force || error.response?.status !== 409) {
            setShowConfirmModal(false);
          }
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleSupplierStatus = async (supplierId) => {
    try {
      await toggleSupplierStatus(supplierId);
      showSuccess('Supplier status updated successfully');
    } catch (error) {
      console.error(' Toggle status error:', error);
      showError('Failed to toggle supplier status. Please try again.');
    }
  };

  const handleInlineStatusChange = async (supplier, newStatus) => {
    if (supplier.status === newStatus) {
      setInlineEditingId(null);
      return;
    }
    try {
      await updateSupplier(supplier.id, { status: newStatus });
      showSuccess(`Supplier status updated to ${newStatus}`);
    } catch (err) {
      console.error('❌ Inline status update error:', err);
      showError('Failed to update status');
    } finally {
      setInlineEditingId(null);
    }
  };

  const handleSaveSupplier = async (supplierData) => {
    try {
      if (editingSupplier && editingSupplier.id) {
        await updateSupplier(editingSupplier.id, supplierData);
      } else {
        await createSupplier(supplierData);
      }
      setShowSupplierForm(false);
    } catch (error) {
      console.error('Failed to save supplier:', error);
      showErrorModal(error, 'Failed to save supplier');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      supplierName: '',
      contactPerson: '',
      city: '',
      productCategory: '',
      status: '',
    });
  };


  const getRatingStars = (rating) => renderStars(rating, { max: 5, size: 12, showNumber: true });

  const exportSuppliers = () => {
    const columns = [
      createColumnDef('Supplier Factory Name', 'name'),
      createColumnDef('Contact Person', 'contactPersonName'),
      createColumnDef('Email', 'emailId'),
      createColumnDef('Phone', 'contactNumber'),
      createColumnDef('City', 'city'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredSuppliers, columns, 'xlsx', 'suppliers', typeof currentUser !== 'undefined' ? currentUser?.role === 'super_admin' : false);
    showSuccess('Suppliers exported to Excel successfully!');
  };

  const handleBulkDelete = async () => {
    await bulk.bulkDelete(filteredSuppliers, deleteSupplier);
  };

  const handleBulkStatusChange = async (newStatus) => {
    await bulk.bulkUpdateStatus(filteredSuppliers, updateSupplier, newStatus);
  };

  const handleImportData = async (importData) => {
    try {
      let successCount = 0;
      for (const data of importData) {
        try {
          await createSupplier({
            supplier_name: data.name || data['Supplier Factory Name'] || '',
            contact_person_name: data.contact_person_name || data.contactPersonName || data['Contact Person'] || '',
            email_id: data.email_id || data.emailId || data.Email || '',
            contact_number: data.contact_number || data.contactNumber || data['Contact Number'] || '',
            address: data.address || data.Address || '',
            city: data.city || data.City || '',
            country: data.country || data.Country || '',
            status: data.status || data.Status || 'Active',
          });
          successCount++;
        } catch (itemErr) {
          console.error('Error importing individual supplier:', itemErr);
        }
      }
      showSuccess(`Successfully imported ${successCount} out of ${importData.length} suppliers`);
    } catch (err) {
      showError('Failed to import suppliers: ' + err.message);
    }
  };

  const totalPages = Math.ceil(filteredSuppliers.length / PAGE_SIZE);
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!canManageSuppliers) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Supplier Management.</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Title */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Supplier Management</h2>
          <p className="text-muted">Manage factory relationships, vendor profiles, and supply chain data</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Building size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Suppliers</p>
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
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active Suppliers</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><TrendingUp size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Value</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>₹{(dashboardStats.totalValue / 100000).toFixed(1)}L</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><XCircle size={18} className="text-danger" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Inactive Suppliers</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.inactive}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>


      {/* Collapsible Filter Panel */}
      <FilterPanel
        onClear={resetFilters}
        title="Search & Filters"
      >
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={3} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Supplier Factory Name</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.supplierName}
                  onChange={(e) => handleFilterChange('supplierName', e.target.value)}
                >
                  <option value="">All Suppliers</option>
                  {[...new Set(suppliers.map(s => s.name).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Contact Person</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.contactPerson}
                  onChange={(e) => handleFilterChange('contactPerson', e.target.value)}
                >
                  <option value="">All Contacts</option>
                  {[...new Set(suppliers.map(s => s.contactPersonName).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">City</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                >
                  <option value="">All Cities</option>
                  {[...new Set(suppliers.map(s => s.city).filter(Boolean))].sort().map((city, idx) => (
                    <option key={idx} value={city}>{city}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Product Category</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.productCategory}
                  onChange={(e) => handleFilterChange('productCategory', e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Porcelain Tiles">Porcelain Tiles</option>
                  <option value="Ceramic Tiles">Ceramic Tiles</option>
                  <option value="Glazed Vitrified Tiles (GVT / PGVT)">Glazed Vitrified Tiles (GVT / PGVT)</option>
                  <option value="Double-Charge Vitrified Tiles">Double-Charge Vitrified Tiles</option>
                  <option value="Full-Body Vitrified Tiles">Full-Body Vitrified Tiles</option>
                  <option value="Soluble-Salt / Nano-Polished Vitrified Tiles">Soluble-Salt / Nano-Polished Vitrified Tiles</option>
                  <option value="Porcelain Slabs">Porcelain Slabs</option>
                  <option value="Mosaic Tile">Mosaic Tile</option>
                  <option value="Decorative Tiles">Decorative Tiles</option>
                  <option value="Outdoor Tiles">Outdoor Tiles</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <DateRangeFilter onFilterChange={(start, end) => setDateRange({ start, end })} />
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <div className="d-flex align-items-center gap-3">
            <h5 className="mb-0 fw-bold text-nowrap me-2">Suppliers ({filteredSuppliers.length})</h5>
            {bulk.hasSelection && (
              <div className="d-flex gap-2 align-items-center border-start border-white-50 ps-3">
                <small className="text-white-50 text-nowrap">{bulk.selectionCount} selected</small>
                {canEdit && (
                  <>
                    <Button variant="outline-light" size="sm" onClick={() => handleBulkStatusChange('Active')} className="extra-small px-2 py-1 border-white-50">Activate</Button>
                    <Button variant="outline-light" size="sm" onClick={() => handleBulkStatusChange('Inactive')} className="extra-small px-2 py-1 border-white-50">Deactivate</Button>
                  </>
                )}
                {canDelete && (
                  <Button variant="outline-light" size="sm" onClick={handleBulkDelete} className="extra-small px-2 py-1 border-white-50">
                    <Trash size={12} className="me-1" />
                    Delete
                  </Button>
                )}
                <Button variant="link" size="sm" onClick={bulk.clearSelection} className="extra-small text-white-50 p-0 ms-1 text-decoration-none">Clear</Button>
              </div>
            )}
          </div>
          <div className="d-flex gap-2 flex-wrap align-items-center justify-content-end">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportSuppliers}
              className="d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Download size={14} className="me-1" />
              <span className="d-none d-md-inline small">Export</span>
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Upload size={14} className="me-1" />
              <span className="d-none d-md-inline small">Import</span>
            </Button>
            {canEdit && (
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateSupplier} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Supplier <span className="ms-1 fw-normal" style={{fontSize: '0.8em', opacity: 0.7}}>(Alt+N)</span></span>
                <span className="d-sm-none small">Create</span>
              </Button>
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
                      checked={bulk.selectedIds.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                      onChange={() => bulk.selectAll(filteredSuppliers)}
                      title="Select All"
                    />
                  </th>
                  <th>Status</th>
                  <th>Supplier Factory Name</th>
                  <th>Contact Person</th>
                  <th>City</th>
                  <th>Total Orders</th>
                  <th>Total Value</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.length > 0 ? (
                  paginatedSuppliers.map((supplier, index) => (
                    <tr key={supplier.id} className={bulk.selectedIds.includes(supplier.id) ? 'table-active' : ''}>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={bulk.selectedIds.includes(supplier.id)}
                          onChange={() => bulk.toggleSelect(supplier.id)}
                        />
                      </td>
                      <td 
                        onDoubleClick={() => canEdit && setInlineEditingId(supplier.id)}
                        title={canEdit ? "Double-click to quick-edit status" : ""}
                        style={{ cursor: canEdit ? 'pointer' : 'default' }}
                      >
                        {inlineEditingId === supplier.id ? (
                          <InlineStatusEdit 
                            status={supplier.status} 
                            onChange={(newStatus) => handleInlineStatusChange(supplier, newStatus)} 
                            onBlur={() => setInlineEditingId(null)}
                          />
                        ) : (
                          <StatusBadge status={supplier.status} />
                        )}
                      </td>
                      <td className="fw-semibold text-primary">{supplier.name}</td>
                      <td>{supplier.contactPersonName || '-'}</td>
                      <td>{supplier.city || '-'}</td>
                      <td>{supplier.totalOrders || 0}</td>
                      <td>₹{((supplier.totalPurchaseValue || 0) / 100000).toFixed(1)}L</td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewSupplier(supplier)}
                            title="View Profile"
                          >
                            <Eye size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handleEditSupplier(supplier)}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(supplier)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant={supplier.status === 'Active' ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              className={supplier.status === 'Active' ? 'border-warning-subtle text-warning' : 'border-success-subtle text-success'}
                              onClick={() => handleToggleSupplierStatus(supplier.id)}
                              title={supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
                            >
                              <Power size={14} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-danger border-danger-subtle"
                              onClick={() => handleDeleteSupplier(supplier.id)}
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
                      No suppliers found. Add your first supplier to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedSuppliers.length > 0 ? (
              paginatedSuppliers.map((supplier, index) => (
                <Card key={supplier.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{supplier.name}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} â€¢ {supplier.city || 'N/A'}</div>
                      </div>
                      <div className="status-container">
                        <StatusBadge status={supplier.status} />
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Contact Person:</label>
                          <div className="text-dark fw-bold">{supplier.contactPersonName || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Orders:</label>
                          <div className="text-dark">{supplier.totalOrders || 0}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Total Value:</label>
                          <div className="text-dark fw-bold">₹{((supplier.totalPurchaseValue || 0) / 100000).toFixed(1)}L</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewSupplier(supplier)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleEditSupplier(supplier)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(supplier)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintSupplier(supplier)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${supplier.status === 'Active' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold`}
                          onClick={() => handleToggleSupplierStatus(supplier.id)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Power size={14} className="me-1" /> Status
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleDeleteSupplier(supplier.id)}
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
                No suppliers found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredSuppliers.length} pageSize={PAGE_SIZE} />
      </Card>

      {showSupplierForm && (
        <SupplierForm
          supplier={editingSupplier}
          onSave={handleSaveSupplier}
          onCancel={() => setShowSupplierForm(false)}
        />
      )}

      {showSupplierView && viewingSupplier && (
        <SupplierView
          supplier={viewingSupplier}
          onClose={() => setShowSupplierView(false)}
          onEdit={() => {
            setShowSupplierView(false);
            handleEditSupplier(viewingSupplier);
          }}
          onPrint={() => {
            setShowSupplierView(false);
            handlePrintSupplier(viewingSupplier);
          }}
          canEdit={canEdit}
        />
      )}

      {/* Supplier Print Modal */}
      {showPrintModal && viewingSupplier && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Supplier Profile Print â€” {viewingSupplier.name}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">

              <div ref={printRef}>
                <SupplierPrintView supplierData={viewingSupplier} />
              </div>

            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={viewingSupplier?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="suppliers"
      />

      <ValidationErrorModal
        show={errorModalConfig.show}
        onHide={() => setErrorModalConfig({ ...errorModalConfig, show: false })}
        errors={errorModalConfig.errors}
        title={errorModalConfig.title}
        message={errorModalConfig.message}
      />

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

      <ConfirmationModal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
      />
    </>
  );
}

export default SupplierDashboard;
