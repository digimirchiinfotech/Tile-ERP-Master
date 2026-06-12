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

import { useState, useEffect, useRef, useMemo } from 'react';
import { Row, Col, Card, Table, Badge, Form, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Plus, Search, Edit, Trash2, Eye, Download, RotateCcw, Upload, Printer, XCircle, CheckCircle, Clock, Package } from 'lucide-react';
import ClientOrderForm from './ClientOrderForm.jsx';
import ClientOrderPrintView from './ClientOrderPrintView.jsx';
import FilterPanel from '../shared/FilterPanel.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import { useClientOrders } from '../../hooks/useClientOrders.js';
import api from '../../services/api.js';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { formatDisplayDate } from '../../utils/formatters.js';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import bulkActionService from '../../services/bulkActionService.js';
import prefetchService from '../../services/prefetchService.js';

function ClientOrderDashboard({ currentUser, navigationData }) {
  const { orders, loading, error, deleteOrder, createOrder, updateOrder } = useClientOrders();
  
  // State variables
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const multiSelect = useMultiSelect(orders);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printViewRef = useRef(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [filters, setFilters] = useState({
    orderId: '',
    clientName: '',
    country: '',
    status: '',
  });
  const fileInputRef = useRef(null);

  const dashboardStats = useMemo(() => ({
    total: orders.length,
    dispatched: orders.filter((order) => order.status === 'Dispatched').length,
    pending: orders.filter((order) => order.status === 'Pending').length,
    cancelled: orders.filter((order) => order.status === 'Cancelled').length,
    processing: orders.filter((order) => order.status === 'Processing').length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders || [];
    
    if (filters.orderId) {
      const orderIdLower = filters.orderId.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          (order.orderId || order.orderNo || '').toLowerCase().includes(orderIdLower)
      );
    }
    
    if (filters.clientName) {
      const clientLower = filters.clientName.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          (order.clientName || order.clientFirmName || '').toLowerCase().includes(clientLower)
      );
    }
    
    if (filters.status) {
      filtered = filtered.filter((order) => order.status === filters.status);
    }
    
    if (filters.country) {
      filtered = filtered.filter((order) => order.country === filters.country);
    }
    
    return filterByDateRange(filtered, dateRange.start, dateRange.end, "created_at");
  }, [filters, orders, dateRange]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange]);

  // Deep-link effect: handle navigation from search results
  useEffect(() => {
    if (navigationData?.id && orders.length > 0) {
      const order = orders.find(o => o.id === navigationData.id);
      if (order) {
        handleEditOrder(order);
      }
    }
  }, [navigationData, orders]);

  const handleCreateOrder = () => {
    setEditingOrder(null);
    setShowOrderForm(true);
  };

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      await bulkActionService.bulkDelete('client-orders', multiSelect.getSelectedIds());
      multiSelect.clearSelection();
      // Wait for fetch
      if (orders.length > 0) window.dispatchEvent(new CustomEvent('client-orders:changed'));
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const clientOrderBulkActions = [
    { label: 'Mark as Dispatched', type: 'update', data: { status: 'Dispatched' }, icon: <CheckCircle size={14} /> },
    { label: 'Mark as Processing', type: 'update', data: { status: 'Processing' }, icon: <RotateCcw size={14} /> },
    { label: 'Mark as Pending', type: 'update', data: { status: 'Pending' }, icon: <Clock size={14} /> },
  ];

  const handleBulkAction = async (action) => {
    try {
      setIsSaving(true);
      const selectedIds = multiSelect.getSelectedIds();
      
      if (action.type === 'update') {
        await bulkActionService.bulkUpdate('client-orders', selectedIds, action.data);
      }
      
      multiSelect.clearSelection();
      window.dispatchEvent(new CustomEvent('client-orders:changed'));
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOrder = async (order) => {
    try {
      const response = await api.get(`/client-orders/${order.id}`);
      const orderData = response?.data?.data || response.data;
      setEditingOrder(orderData);
      setShowOrderForm(true);
    } catch (err) {
      console.error('Error fetching order:', err);
      showError('Failed to load order details: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewOrder = async (order) => {
    try {
      const response = await api.get(`/client-orders/${order.id}`);
      const orderData = response?.data?.data || response.data;
      setViewingOrder(orderData);
      setShowPrintView(true);
    } catch (err) {
      console.error('Error fetching order:', err);
      showError('Failed to load order details: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrintOrder = async (order) => {
    try { await api.post('/document-activity/doc/' + (order?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    try {
      const response = await api.get(`/client-orders/${order.id}`);
      const orderData = response?.data?.data || response.data;
      setViewingOrder(orderData);
      setShowPrintModal(true);
      setTimeout(() => {
        if (printViewRef.current) window.print();
      }, 500);
    } catch (err) {
      showError('Failed to load order for printing');
    }
  };

  const handleDownloadPDF = async (order) => {
    try { await api.post('/document-activity/doc/' + (order?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      const response = await api.get(`/client-orders/${order.id}`);
      const orderData = response?.data?.data || response.data;
      setViewingOrder(orderData);
      setShowPrintModal(true);
      setTimeout(async () => {
        if (printViewRef.current) {
          showSuccess('Generating PDF...');
          const filename = `Order_${orderData.orderId || orderData.orderNo || 'Order'}_${new Date().toLocaleDateString('en-CA')}.pdf`;
          const result = await downloadPDF(printViewRef.current, filename);
          if (!result?.success) showError('Failed to generate PDF');
        }
        setShowPrintModal(false);
      }, 800);
    } catch (err) {
      showError('Failed to generate PDF');
    }
  };

  const handleDeleteOrder = (orderId) => {
    setDeleteTargetId(orderId);
  };

  const confirmDeleteOrder = async () => {
    try {
      await deleteOrder(deleteTargetId);
      showSuccess('Order deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      showError('Failed to delete order: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleSaveOrder = async (orderData) => {
    try {
      if (editingOrder) {
        await updateOrder({ id: editingOrder.id, data: orderData });
      } else {
        await createOrder(orderData);
      }
      setShowOrderForm(false);
    } catch (err) {
      showError('Failed to save order: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      orderId: '',
      clientName: '',
      country: '',
      status: '',
    });
    setDateRange({ start: null, end: null });
  };

  const handleExport = () => {
    const columns = [
      createColumnDef('Order ID', (item) => item.orderId || item.orderNo),
      createColumnDef('Client Name', (item) => item.clientName || item.supplierName),
      createColumnDef('Status', 'status'),
      createColumnDef('Country', 'country'),
      createColumnDef('Created At', (item) => formatDisplayDate(item.created_at)),
      createColumnDef('Updated At', (item) => formatDisplayDate(item.updated_at)),
    ];
    exportData(orders, columns, 'xlsx', 'client_orders', typeof currentUser !== 'undefined' ? currentUser?.role === 'super_admin' : false);
  };

  const handleImportData = async (importedOrders) => {
    try {
      for (const orderData of importedOrders) {
        await createOrder({
          orderId: orderData.orderId,
          clientName: orderData.clientName,
          status: orderData.status || 'Pending',
          country: orderData.country,
        });
      }
      showSuccess(`Successfully imported ${importedOrders.length} orders!`);
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import orders: ' + err.message);
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin', 'sales_manager'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) return <div className="text-center py-5"><h4>Loading orders...</h4></div>;

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Client Order Management</h2>
          <p className="text-muted">Track customer orders, manage processing status, and dispatch schedules</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Package size={18} className="text-primary" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Orders</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Clock size={18} className="text-warning" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pending</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.pending}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <RotateCcw size={18} className="text-info" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Processing</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.processing}</h5>
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
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Dispatched</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.dispatched}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <XCircle size={18} className="text-danger" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Cancelled</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.cancelled}</h5>
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
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3 align-items-end">
            <Col lg={3} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Order ID</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle rounded-3"
                    placeholder="Order ID"
                    value={filters.orderId}
                    onChange={(e) => handleFilterChange('orderId', e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={3} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Client</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.clientName}
                  onChange={(e) => handleFilterChange('clientName', e.target.value)}
                >
                  <option value="">All Clients</option>
                  {[...new Set(orders.map(o => o.clientName || o.clientFirmName || o.supplierName).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Country</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                >
                  <option value="">All Countries</option>
                  {[...new Set(orders.map(o => o.country).filter(Boolean))].sort().map((country, idx) => (
                    <option key={idx} value={country}>{country}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
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

      <BulkActionBar
        selectionCount={multiSelect.getSelectedCount()}
        onSelectAll={() => multiSelect.toggleSelectAll(filteredOrders)}
        onClearAll={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        statusOptions={clientOrderBulkActions.map(a => ({ label: a.label, value: a.data.status }))}
        onStatusChange={(status) => {
          handleBulkAction({ type: 'update', data: { status } });
        }}
      />

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Client Orders ({filteredOrders.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            <Button
              variant="outline-light"
              size="sm"
              onClick={handleExport}
              className="border-white text-white d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Download size={14} className="me-1" />
              <span className="d-none d-md-inline small">Export</span>
            </Button>
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
            {canEdit && (
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateOrder} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Order</span>
                <span className="d-sm-none small">Create</span>
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Desktop Table View */}
          <div className="table-responsive d-none d-lg-block">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr className="table-light text-muted small text-uppercase">
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredOrders)}
                    />
                  </th>
                  <th className="ps-4" style={{ width: '80px' }}>SR. NO.</th>
                  <th>Status</th>
                  <th>Order ID</th>
                  <th>Client</th>
                  <th>Country</th>
                  <th>Linked PI</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order, index) => (
                    <tr key={order.id} onMouseEnter={() => prefetchService.prefetchClientOrder(order.id)} className={multiSelect.isSelected(order.id) ? 'table-active' : ''}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(order.id)}
                          onChange={() => multiSelect.toggleSelect(order.id)}
                        />
                      </td>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className="fw-semibold text-primary">{order.orderId || order.orderNo}</td>
                      <td>{order.clientName || order.supplierName || '-'}</td>
                      <td>{order.country}</td>
                      <td>
                        {order.invoiceRef || order.invoice_ref || order.linkedInvoice ? (
                          <Badge bg="secondary" className="fw-normal">{order.invoiceRef || order.invoice_ref || order.linkedInvoice}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleViewOrder(order)} title="View Preview"><Eye size={14} /></Button>
                          <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handlePrintOrder(order)} title="Print"><Printer size={14} /></Button>
                          <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleDownloadPDF(order)} title="Download PDF"><Download size={14} /></Button>
                          {canEdit && <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handleEditOrder(order)} title="Edit"><Edit size={14} /></Button>}
                          {canDelete && <Button variant="outline" size="sm" className="text-danger border-danger-subtle" onClick={() => handleDeleteOrder(order.id)} title="Delete"><Trash2 size={14} /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order, index) => (
                <Card key={order.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{order.orderId || order.orderNo}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {order.country}</div>
                      </div>
                      <div className="status-container">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                          <div className="text-dark fw-bold">{order.clientName || order.supplierName || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Linked PI:</label>
                          <div className="text-dark fw-bold">
                            {order.invoiceRef || order.invoice_ref || order.linkedInvoice ? (
                              <Badge bg="secondary" className="fw-normal">{order.invoiceRef || order.invoice_ref || order.linkedInvoice}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewOrder(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleEditOrder(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Edit size={14} className="me-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintOrder(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleDeleteOrder(order.id)}
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
                No orders found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} />
      </Card>

      {showOrderForm && <ClientOrderForm order={editingOrder} onSave={handleSaveOrder} onCancel={() => setShowOrderForm(false)} />}

      {/* View Modal */}
      {showPrintView && viewingOrder && (
        <Modal show={showPrintView} onHide={() => setShowPrintView(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>Order Preview - {viewingOrder.orderId || viewingOrder.orderNo}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <ClientOrderPrintView orderData={viewingOrder} />
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={viewingOrder?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Print Modal */}
      {showPrintModal && viewingOrder && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Print Order - {viewingOrder.orderId || viewingOrder.orderNo}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printViewRef}>
              <ClientOrderPrintView orderData={viewingOrder} />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={viewingOrder?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="client-orders"
      />

      <ConfirmationModal
        show={!!deleteTargetId}
        onHide={() => setDeleteTargetId(null)}
        title="Confirm Delete"
        message="Are you sure you want to delete this order? This action cannot be undone."
        variant="danger"
        onConfirm={confirmDeleteOrder}
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
        .stats-card {
          border-radius: 16px !important;
          transition: all 0.3s ease;
          border: 1px solid #f2f5f8 !important;
        }
        .stats-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important;
        }
        .bg-primary-light { background-color: rgba(30, 64, 175, 0.08); }
        .bg-warning-light { background-color: rgba(245, 158, 11, 0.08); }
        .bg-info-light { background-color: rgba(6, 182, 212, 0.08); }
        .bg-success-light { background-color: rgba(16, 185, 129, 0.08); }
        .bg-danger-light { background-color: rgba(239, 68, 68, 0.08); }
      `}</style>
    </>
  );
}

export default ClientOrderDashboard;
