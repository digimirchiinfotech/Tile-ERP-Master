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

import DashboardStatusDropdown from '../shared/DashboardStatusDropdown.jsx';
import { generateEnterpriseFilename } from '../../utils/fileNamingUtils';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Row, Col, Card, Table, Badge, Dropdown, Alert, Spinner, Form, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import '../shared/DashboardButtons.css';
import { BarChart3, Plus, FileText, Download, Eye, Edit, Printer, Upload, Trash2, Power, Send, CheckCircle, Lock, Search, Check, FileSpreadsheet } from 'lucide-react';
import FilterPanel from '../shared/FilterPanel.jsx';
import OrderPrintView from './OrderPrintView.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { useOrders } from '../../hooks/useOrders';
import { orderService } from '../../services/orderService';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { downloadPDF, previewPDF } from '../../utils/pdfGenerator.js';
import masterDataService from '../../services/masterDataService.js';
import { formatPrice, formatDisplayDate } from '../../utils/formatters.js';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import bulkActionService from '../../services/bulkActionService.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { exportProductDetailsToXLSX } from '../../utils/productExportUtils.js';
import api from '../../services/api.js';
import prefetchService from '../../services/prefetchService.js';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import LockDocumentButton from '../shared/LockDocumentButton.jsx';

function OrderDashboard({ onAddNew, onEdit, ordersData, productsData, invoicesData, currentUser }) {
  // Use props if provided, otherwise call hooks
  const ordersHook = useOrders();
  const { orders, loading, error, createOrder, updateOrder, deleteOrder, toggleOrderStatus } = ordersData || ordersHook;
  const printViewRef = useRef();
  const downloadPrintViewRef = useRef(null);
  const [downloadOrderData, setDownloadOrderData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);


const multiSelect = useMultiSelect(orders);
  const PAGE_SIZE = 15;
  const [showPrintView, setShowPrintView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    clientName: '',
    country: '',
    status: '',
    dateRange: { start: '', end: '' },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [boxTypeObjects, setBoxTypeObjects] = useState([]);

  useEffect(() => {
    masterDataService.getAllBoxTypes()
      .then(data => {
        if (Array.isArray(data)) setBoxTypeObjects(data);
      })
      .catch(err => console.error('Failed to fetch box types for images:', err));
  }, []);

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      await bulkActionService.bulkDelete('orders', multiSelect.getSelectedIds());
      multiSelect.clearSelection();
      const ordersHookRef = ordersData || ordersHook;
      if (ordersHookRef.fetchOrders) await ordersHookRef.fetchOrders();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const orderBulkActions = [
    { label: 'Mark as Approved', type: 'update', data: { status: 'Approved' }, icon: <CheckCircle size={14} />, requireConfirm: true },
    { label: 'Mark as Submitted', type: 'update', data: { status: 'Submitted' }, icon: <Send size={14} />, requireConfirm: true },
    { label: 'Mark as Draft', type: 'update', data: { status: 'Draft' }, variant: 'warning', icon: <FileText size={14} />, requireConfirm: true },
    { label: 'Lock Orders', type: 'update', data: { status: 'Locked' }, variant: 'danger', icon: <Lock size={14} />, requireConfirm: true }
  ];

  const handleBulkAction = async (action) => {
    try {
      setIsSaving(true);
      const selectedIds = multiSelect.getSelectedIds();
      
      if (action.type === 'update') {
        await bulkActionService.bulkUpdate('orders', selectedIds, action.data);
      } else if (action.type === 'export') {
        await bulkActionService.bulkExport('orders', selectedIds, action.format || 'pdf');
      }
      
      multiSelect.clearSelection();
      const ordersHookRef = ordersData || ordersHook;
      if (ordersHookRef.fetchOrders) await ordersHookRef.fetchOrders();
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const dashboardStats = useMemo(() => {
    const nonRevisedOrders = (orders || []).filter(o => o.status !== 'Revised');
    return {
      total: nonRevisedOrders.length,
      approved: nonRevisedOrders.filter(o => o.status === 'Approved').length,
      submitted: nonRevisedOrders.filter(o => o.status === 'Pending' || o.status === 'Submitted').length,
      totalAmount: nonRevisedOrders.reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0)
    };
  }, [orders]);

  const groupAndSequenceOrders = (list) => {
    if (!Array.isArray(list) || list.length === 0) return [];
    
    // Group orders by their base/original order number
    const groups = {};
    list.forEach(ord => {
      const baseNo = ord.originalOrderNo || ord.original_order_no || ord.orderNo || ord.order_no || '';
      if (!groups[baseNo]) {
        groups[baseNo] = [];
      }
      groups[baseNo].push(ord);
    });

    // For each group, sort documents so the latest revision is at the top
    const sortedGroups = Object.keys(groups).map(baseNo => {
      const groupItems = groups[baseNo];
      groupItems.sort((a, b) => {
        const aCount = parseInt(a.revisionCount ?? a.revision_count ?? 0, 10);
        const bCount = parseInt(b.revisionCount ?? b.revision_count ?? 0, 10);
        return bCount - aCount; // descending
      });

      // Find the maximum date in the group for chain sorting
      const maxDateVal = groupItems.reduce((max, item) => {
        const itemDate = item.date ? new Date(item.date).getTime() : 0;
        return itemDate > max ? itemDate : max;
      }, 0);

      return {
        baseNo,
        items: groupItems,
        maxDateVal
      };
    });

    // Sort the chains themselves by their max activity date descending
    sortedGroups.sort((a, b) => b.maxDateVal - a.maxDateVal);

    // Flatten all items back into a single array
    const flattened = [];
    sortedGroups.forEach(g => {
      flattened.push(...g.items);
    });

    return flattened;
  };

  const filteredOrders = useMemo(() => {
    // Ensure orders is always an array
    let filtered = Array.isArray(orders) ? orders : [];

    if (filters.search) {
      filtered = filtered.filter(
        (order) =>
          (order.orderNo || order.order_no || '').toLowerCase().includes(filters.search.toLowerCase()) ||
          (order.supplierName || order.supplier_name || '')
            .toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    if (filters.clientName) {
      filtered = filtered.filter((order) =>
        (order.supplierName || order.supplier_name || '')
          .toLowerCase()
          .includes(filters.clientName.toLowerCase())
      );
    }

    if (filters.country) {
      filtered = filtered.filter((order) => (order.country || '') === filters.country);
    }

    if (filters.status) {
      filtered = filtered.filter((order) => (order.status || '') === filters.status);
    }

    const result = filterByDateRange(filtered, filters.dateRange.start, filters.dateRange.end, "date");
    return groupAndSequenceOrders(result);
  }, [filters, orders]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);
  
  // Real-time synchronization listener
  const { fetchOrders } = ordersHook;
  useEffect(() => {
    const handleSync = () => {
      if (fetchOrders) fetchOrders();
    };
    window.addEventListener('orders:changed', handleSync);
    return () => window.removeEventListener('orders:changed', handleSync);
  }, [fetchOrders]);

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState(null);


  const handleStatusChange = (orderId, newStatus) => {
    setStatusChangeData({ orderId, newStatus });
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = async () => {
    if (!statusChangeData) return;
    try {
      const response = await orderService.updateStatus(statusChangeData.orderId, statusChangeData.newStatus);
      const data = response.data;
      const ordersHookRef = ordersData || ordersHook;
      if (ordersHookRef.fetchOrders) await ordersHookRef.fetchOrders();
    } catch (err) {
      showError('Failed to update status: ' + err.message);
    } finally {
      setShowStatusConfirm(false);
      setStatusChangeData(null);
    }
  };

  const getStatusActions = (order) => {
    const status = order.status || 'Draft';
    const buttons = [];
    if (status === 'Draft') {
      buttons.push(
        <Button key="submit" variant="outline-warning" size="sm" onClick={() => handleStatusChange(order.id, 'Submitted')} title="Submit">
          <Send size={14} />
        </Button>
      );
    }
    if (status === 'Pending') {
      buttons.push(
        <Button key="approve" variant="outline-success" size="sm" onClick={() => handleStatusChange(order.id, 'Approved')} title="Approve">
          <CheckCircle size={14} />
        </Button>
      );
    }
    if (status === 'Approved') {
      buttons.push(
        <Button key="lock" variant="outline-dark" size="sm" onClick={() => handleStatusChange(order.id, 'Locked')} title="Lock">
          <Lock size={14} />
        </Button>
      );
    }
    return buttons;
  };

  const handleExport = () => {
    const columns = [
      createColumnDef('Order No', 'orderNo'),
      createColumnDef('Date', 'date'),
      createColumnDef('Pallets', 'pallets'),
      createColumnDef('Total Boxes', (item) => Array.isArray(item.productLines || item.product_lines) 
        ? (item.productLines || item.product_lines).reduce((sum, line) => sum + (parseInt(line.totalBoxes || line.total_boxes || line.pieces || 0) || 0), 0)
        : 0),
      createColumnDef('Amount', 'amount'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredOrders, columns, 'csv', 'proforma_orders');
  };



  const handleViewOrder = async (order) => {
    try {
      setIsSaving(true);
      const response = await orderService.getById(order.id);
      
      // Defensive data extraction
      const responseData = response.data?.data || response.data;
      const fullOrder = responseData?.data || responseData;
      
      if (fullOrder && fullOrder.id) {
        let productLines = fullOrder.productLines || fullOrder.product_lines || [];
        if (typeof productLines === 'string') {
          try {
            productLines = JSON.parse(productLines);
          } catch (e) { 
            console.error('Failed to parse product lines:', e);
            productLines = []; 
          }
        }

        // Final normalization pass for product lines
        if (Array.isArray(productLines)) {
          const { transformKeys } = await import('../../utils/dataTransformers');
          productLines = productLines.map(line => transformKeys(line));
        }

        fullOrder.productLines = productLines;
        setSelectedOrder(fullOrder);
        setShowPrintView(true);
      } else {
        throw new Error('Order data not found in response');
      }
    } catch (err) {
      console.error('Error viewing order:', err);
      showError('Error fetching order details: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintOrder = async (order) => {
    try { await api.post('/document-activity/doc/' + (order?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){ console.error('Failed to log PRINT activity:', e); }
    await handleViewOrder(order);
    setTimeout(() => {
      if (printViewRef.current) {
        window.print();
        setShowPrintView(false);
      }
    }, 500);
  };





  const handleImportData = async (importData) => {
    try {
      for (const orderData of importData) {
        await createOrder({
          orderNo: orderData.orderNo || orderData.order_no,
          date: orderData.date || new Date().toLocaleDateString('en-CA'),
          supplierName: orderData.supplierName || orderData.supplier_name,
          country: orderData.country,
          totalAmount: orderData.amount || orderData.totalAmount || orderData.total_amount || 0,
          status: orderData.status || 'Draft',
        });
      }
      showSuccess(`Successfully imported ${importData.length} orders!`);
      const ordersHookRef = ordersData || ordersHook;
      if (ordersHookRef.fetchOrders) await ordersHookRef.fetchOrders();
      setShowImportModal(false);
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import orders: ' + err.message);
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const handleDeleteOrder = (orderId) => {
    setDeleteTargetId(orderId);
  };

  const confirmDeleteOrder = async () => {
    try {
      await deleteOrder(deleteTargetId);
      showSuccess('Order deleted successfully');
    } catch (err) {
      showError('Failed to delete order: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteTargetId(null);
    }
  };


  const handleToggleOrderStatus = async (orderId) => {
    try {
      await toggleOrderStatus(orderId);
      showSuccess('Order status updated');
    } catch (err) {
      showError('Failed to toggle order status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExportProductXLSX = async (order) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const response = await api.get(`/proforma-orders/${order.id}`);
      const orderData = response.data?.data || order;
      const searchVal = String(orderData?.boxType || orderData?.box_type || '').trim().toLowerCase();
      const matched = boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
      const imageUrl = matched?.image_url || matched?.imageUrl;
      await exportProductDetailsToXLSX(orderData, 'Proforma Order', imageUrl);
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const handleDownloadPDF = async (order) => {
    try { await api.post('/document-activity/doc/' + (order?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){ console.error('Failed to log DOWNLOAD activity:', e); }
    if (!order) return;
    try {
      const response = await orderService.getById(order.id);
      const data = response.data;
      if (data.success) {
        setDownloadOrderData(data.data);
        setTimeout(async () => {
          if (downloadPrintViewRef.current) {
            try {
              const filename = generateEnterpriseFilename({
              moduleName: 'PROFORMA-ORDER',
              documentNo: data?.data?.orderNo || data?.data?.order_no || 'PO',
              clientName: data?.data?.clientName || data?.data?.client_name || '',
              date: data?.data?.orderDate || data?.data?.order_date || '',
              extension: 'pdf'
            });
              const result = await downloadPDF(downloadPrintViewRef.current, {
                format: 'a4',
                orientation: 'portrait',
                filename
              });
              if (!result.success) {
                showError('Failed to download PDF: ' + result.message);
              }
            } catch (error) {
              console.error('❌ Error downloading PDF:', error);
              showError('Failed to download PDF: ' + error.message);
            }
          }
          setDownloadOrderData(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Error fetching order for PDF:', err);
      showError('Error fetching order details for PDF');
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin', 'purchase', 'administration'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading orders...</p>
      </div>
    );
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Proforma Orders</h2>
          <p className="text-muted small">Manage and track factory purchase orders</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileText size={18} className="text-primary" /></div>
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
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><CheckCircle size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Approved</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.approved}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Send size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pending</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.submitted}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <span className="text-info fw-bold" style={{ fontSize: '18px' }}>₹</span>
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Value</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{formatPrice(dashboardStats.totalAmount, 'INR')}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible className="mx-3 mt-3">
          {error.message || error.toString()}
        </Alert>
      )}

      {/* Collapsible Filter Panel */}
      <FilterPanel 
        onClear={() => setFilters({ search: '', clientName: '', country: '', status: '', dateRange: { start: '', end: '' } })} 
        title="Search & Filters"
      >
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={4} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Search Orders</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search by PO No. or Supplier..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Country</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.country}
                  onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                >
                  <option value="">All Countries</option>
                  <option value="USA">USA</option>
                  <option value="Germany">Germany</option>
                  <option value="Australia">Australia</option>
                  <option value="France">France</option>
                  <option value="Spain">Spain</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                                    <option value="">All Status</option>
                                      <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Revised">Revised</option>
                    
                    <option value="Finalized">Finalized</option>
                    <option value="Rejected">Rejected</option>
                  </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <DateRangeFilter 
                onFilterChange={(start, end) => setFilters(prev => ({ ...prev, dateRange: { start, end } }))} 
              />
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      <BulkActionBar
        selectedCount={multiSelect.getSelectedCount()}
        onSelectAll={(shouldSelect) => {
          if (shouldSelect) {
            multiSelect.toggleSelectAll(filteredOrders);
          } else {
            multiSelect.clearSelection();
          }
        }}
        onClearSelection={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        isLoading={isSaving}
        selectAllChecked={multiSelect.selectAll}
        totalItems={filteredOrders.length}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        actions={currentUser && ['super_admin', 'company_admin', 'purchase', 'administration'].includes(currentUser?.role) ? orderBulkActions : []}
        onAction={handleBulkAction}
      />

      {/* Orders List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Proforma Orders ({filteredOrders.length})</h5>
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
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={onAddNew} style={{ width: 'auto' }}>
              <Plus size={16} className="me-1" />
              <span className="d-none d-sm-inline small">Create Proforma Order</span>
              <span className="d-sm-none small">Create</span>
            </Button>
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
                  <th className="ps-4">SR. NO.</th>
                  <th>Status</th>
                  <th>PO NO.</th>
                  <th>Date</th>

                  <th>Supplier Factory Name</th>
                  <th>PI Reference</th>
                  <th>No. of Pallets</th>
                  <th>Total Boxes</th>
                  <th>Amount</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order, index) => (
                    <tr key={order.id} onMouseEnter={() => prefetchService.prefetchOrder(order.id)} className={`${multiSelect.isSelected(order.id) ? 'table-active' : ''} ${order.status === 'Revised' ? 'table-light text-muted opacity-75' : ''}`}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(order.id)}
                          onChange={() => multiSelect.toggleSelect(order.id)}
                        />
                      </td>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <DashboardStatusDropdown 
                              module="PO" 
                              endpoint="proforma-orders" 
                              documentId={order.id} 
                              value={(order.is_locked || order.isLocked) ? 'Locked' : (order.status || 'Draft')} 
                              disabled={!canEdit || order.is_locked || order.isLocked} 
                              onSuccess={fetchOrders} 
                            />
                        </div>
                      </td>
                      <td className="fw-medium" data-label="PO NO.">
                        {order.status === 'Revised' ? (
                          <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.85rem' }}>
                            <span className="text-secondary opacity-50">↳</span> {order.orderNo}
                          </span>
                        ) : (
                          order.orderNo
                        )}
                      </td>
                      <td data-label="Date">{formatDisplayDate(order.date)}</td>

                      <td data-label="Supplier">{order.supplierName}</td>
                      <td data-label="PI Reference">{order.piReference || '-'}</td>
                      <td data-label="Pallets">{order.pallets}</td>
                      <td data-label="Total Boxes">
                        {Array.isArray(order.productLines || order.product_lines) 
                          ? (order.productLines || order.product_lines).reduce((sum, line) => sum + (parseInt(line.totalBoxes || line.total_boxes || line.pieces || 0) || 0), 0)
                          : 0}
                      </td>
                      <td data-label="Amount">{formatPrice(order.amount, 'INR')}</td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                            
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => onEdit(order)}
                                title="Edit"
                                disabled={order.status === 'Revised' || order.is_locked || order.isLocked}
                              >
                                <Edit size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-info border-info-subtle"
                              onClick={() => handleViewOrder(order)}
                              title="View Details"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handlePrintOrder(order)}
                              title="Print Document"
                            >
                              <Printer size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success border-success-subtle"
                              onClick={() => handleDownloadPDF(order)}
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success border-success-subtle"
                              onClick={() => handleExportProductXLSX(order)}
                              title="Download XLSX"
                            >
                              <FileSpreadsheet size={14} />
                            </Button>
                            
                            <LockDocumentButton 
                              documentType="PO" 
                              documentId={order.id} 
                              isLocked={order.is_locked || order.isLocked}
                              onLockSuccess={fetchOrders} 
                              getSnapshotData={async () => {
                                const res = await api.get(`/proforma-orders/${order.id}`);
                                return res.data?.data || res.data;
                              }}
                            />
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDeleteOrder(order.id)}
                                title="Delete"
                                disabled={order.is_locked || order.isLocked}
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
                    <td colSpan="12" className="text-center py-4 text-muted">
                      <EmptyState
                        title="No Orders Found"
                        description="Start your workflow by adding your first Proforma Order."
                        actionLabel={canEdit ? "Create Order" : null}
                        onAction={canEdit ? onAddNew : undefined}
                      />
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
                <Card key={order.id} className="mb-3 border-0 shadow-sm invoice-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{order.orderNo}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDisplayDate(order.date)}</div>
                      </div>
                      <div className="status-container">
                        <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${order.status === 'Approved' ? 'success' :
                          order.status === 'Rejected' ? 'danger' :
                            order.status === 'Pending' ? 'warning' : 'secondary'
                          }`}>
                          {order.status || 'Draft'}
                        </div>
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Supplier:</label>
                          <div className="text-dark fw-bold">{order.supplierName}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Amount:</label>
                          <div className="text-primary fw-bold">{formatPrice(order.amount, 'INR')}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Pallets:</label>
                          <div className="text-dark">{order.pallets || 0}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => onEdit(order)}
                          disabled={order.status === 'Revised'}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                        onClick={() => handleViewOrder(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                        onClick={() => handlePrintOrder(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                        onClick={() => handleDownloadPDF(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
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

      {showPrintView && selectedOrder && (
        <Modal show={showPrintView} onHide={() => setShowPrintView(false)} fullscreen>
          <div className="no-print p-3 d-flex justify-content-end bg-white border-bottom">
            <div className="d-flex gap-2">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowPrintView(false)}>Close Preview</Button>
            </div>
          </div>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              <div ref={printViewRef}>
                <OrderPrintView 
                  orderData={selectedOrder} 
                  products={productsData?.products || []} 
                  boxTypeImageUrl={(() => {
                    const searchVal = String(selectedOrder?.boxType || selectedOrder?.box_type || '').trim().toLowerCase();
                    const matched = boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
                    return matched?.image_url || matched?.imageUrl;
                  })()}
                />
              </div>
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="proforma_order" resourceId={selectedOrder.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="proforma-order"
      />

      {/* Status Change Confirmation Modal */}
      <Modal show={showStatusConfirm} onHide={() => setShowStatusConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Status Change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to change the status to <strong>{statusChangeData?.newStatus}</strong>?
          {statusChangeData?.newStatus === 'Approved' && (
            <Alert variant="warning" className="mt-2 mb-0">
              Once approved, this document cannot be edited.
            </Alert>
          )}
          {statusChangeData?.newStatus === 'Locked' && (
            <Alert variant="danger" className="mt-2 mb-0">
              Locking this document will permanently prevent any modifications.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusConfirm(false)}>Cancel</Button>
          <Button variant="primary" onClick={confirmStatusChange}>Confirm</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={!!deleteTargetId}
        onHide={() => setDeleteTargetId(null)}
        title="Confirm Delete"
        message="Are you sure you want to delete this order? This action cannot be undone."
        variant="danger"
        onConfirm={confirmDeleteOrder}
      />
      <style>{`
        .invoice-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        .status-box {
          letter-spacing: 0.5px;
          font-size: 0.75rem;
          min-width: 80px;
          text-align: center;
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
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', width: '210mm', opacity: 0, pointerEvents: 'none' }}>
        <div ref={downloadPrintViewRef}>
          {downloadOrderData && (
            <OrderPrintView 
              orderData={downloadOrderData} 
              products={productsData?.products || []} 
              boxTypeImageUrl={(() => {
                const searchVal = String(downloadOrderData?.boxType || downloadOrderData?.box_type || '').trim().toLowerCase();
                const matched = boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
                return matched?.image_url || matched?.imageUrl;
              })()}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default OrderDashboard;
