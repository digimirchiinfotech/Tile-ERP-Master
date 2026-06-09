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

import DashboardStatusDropdown from '../../shared/DashboardStatusDropdown.jsx';
import LockDocumentButton from '../../shared/LockDocumentButton.jsx';
import { generateEnterpriseFilename } from '../../../utils/fileNamingUtils';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Row, Col, Card, Table, Badge, Spinner, Form, InputGroup, Modal, Button as BsButton } from 'react-bootstrap';
import Button from '../../shared/Button.jsx';
import { Power, BarChart3, Eye, Edit, FileText, Search, Plus, Trash2, RefreshCcw, Package, FileCheck, Download, Upload, Truck, Clock, X, MapPin, Calendar, RotateCcw, Printer, FileSpreadsheet, Check } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import FilterPanel from '../../shared/FilterPanel.jsx';
import ImportModal from '../../shared/ImportModal.jsx';
import api from '../../../services/api';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import { exportData, createColumnDef } from '../../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../../utils/productExportUtils.js';
import PaginationControls from '../../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../../common/DateRangeFilter.jsx';
import { formatDisplayDate } from '../../../utils/formatters.js';
import StatusBadge from '../../common/StatusBadge';
import ActivityTimeline from '../../shared/ActivityTimeline.jsx';
import { useMultiSelect } from '../../../hooks/useMultiSelect.js';
import { useMasterData } from '../../../hooks/useMasterData.js';

import PackingListPrintView from './PackingListPrintView.jsx';
import { downloadPDF } from '../../../utils/pdfGenerator.js';

function PackingListDashboard({ currentUser, onNavigate }) {
  const [packingLists, setPackingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [deleting, setDeleting] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewingPL, setViewingPL] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const printRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });
  
  const masterData = useMasterData();

  const dashboardStats = useMemo(() => ({
    total: packingLists.length,
    ready: packingLists.filter(pl => pl.status === 'Approved').length,
    dispatched: packingLists.filter(pl => pl.status === 'Dispatched').length,
    pending: packingLists.filter(pl => pl.status !== 'Approved' && pl.status !== 'Dispatched').length,
    totalPallets: packingLists.reduce((sum, pl) => sum + (parseInt(pl.totalPallets || pl.total_pallets) || 0), 0),
    totalWeight: packingLists.reduce((sum, pl) => sum + (parseFloat(pl.totalWeight || pl.total_weight) || 0), 0)
  }), [packingLists]);

  const multiSelect = useMultiSelect(packingLists);

  useEffect(() => {
    fetchPackingLists();

    const handleWindowFocus = () => {
      fetchPackingLists();
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('packingList:changed', fetchPackingLists);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('packingList:changed', fetchPackingLists);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, monthFilter, dateFrom, dateRange]);

  const filteredPackingLists = useMemo(() => {
    let filtered = packingLists;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pl =>
        (pl.packingListNo || pl.packing_list_no || '').toLowerCase().includes(term) ||
        (pl.exportInvoiceNo || pl.export_invoice_no || '').toLowerCase().includes(term) ||
        (pl.clientName || pl.client_name || '').toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(pl => pl.status === statusFilter);
    }

    // Apply Date Range Filter
    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "date");

    return filtered;
  }, [packingLists, searchTerm, statusFilter, dateRange]);

  const fetchPackingLists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/packing-lists?limit=1000');
      // Backend paginationResponse shape: { success, data: { data: [...], pagination: {} } }
      const payload = response.data?.data;
      const data = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);

      if (Array.isArray(data)) {
        setPackingLists(data.map(pl => ({
          ...pl,
          exportInvoiceNo: pl.exportInvoiceNo || pl.export_invoice_no || pl.packingListNo || pl.packing_list_no,
          clientName: pl.clientName || pl.client_name || '',
          export_invoice_no: pl.exportInvoiceNo || pl.export_invoice_no || pl.packingListNo || pl.packing_list_no,
          client_name: pl.clientName || pl.client_name || ''
        })));
      } else {
        setPackingLists([]);
      }
    } catch (error) {
      showError('Failed to load packing lists');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id) => {
    try {
      const response = await api.patch(`/packing-lists/${id}/toggle-status`);
      if (response.data.success) {
        showSuccess(response.data.message || 'Status updated successfully');
        fetchPackingLists();
      }
    } catch (err) {
      showError('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkAction = async (action, value) => {
    if (multiSelect.selectedCount === 0) {
      showError('No records selected');
      return;
    }

    if (action === 'delete') {
      setConfirmConfig({
        title: 'Confirm Bulk Delete',
        message: `Are you sure you want to delete ${multiSelect.selectedCount} packing lists?`,
        variant: 'danger',
        onConfirm: async () => {
          try {
            await api.post('/bulk/delete', {
              resource: 'packing-lists',
              ids: multiSelect.selected
            });
            showSuccess('Bulk deletion completed successfully');
            multiSelect.clearSelection();
            fetchPackingLists();
          } catch (err) {
            showError('Bulk delete failed: ' + (err.response?.data?.message || err.message));
          } finally {
            setShowConfirmModal(false);
          }
        }
      });
      setShowConfirmModal(true);
    } else if (action === 'status') {
      try {
        await api.post('/bulk/update', {
          resource: 'packing-lists',
          ids: multiSelect.selected,
          data: { status: value }
        });
        showSuccess('Bulk status update completed');
        multiSelect.clearSelection();
        fetchPackingLists();
      } catch (err) {
        showError('Bulk update failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleView = async (pl) => {
    try {
      setLoadingView(true);
      const response = await api.get(`/packing-lists/${pl.id}`);
      const data = response.data?.data || response.data;
      if (data) {
        // Standardized data parsing (handling both string and object formats)
        let productLinesRaw = data.product_lines || data.productLines || [];
        if (typeof productLinesRaw === 'string') {
          try { productLinesRaw = JSON.parse(productLinesRaw); } catch (e) { productLinesRaw = []; }
        }

        const normalizedData = {
          ...data,
          exportInvoiceNo: data.export_invoice_no || data.exportInvoiceNo || data.invoice_no || data.invoiceNo,
          exportInvoiceDate: data.export_invoice_date || data.exportInvoiceDate || data.invoice_date || data.invoiceDate,
          proformaInvoiceNo: data.proforma_invoice_no || data.proformaInvoiceNo || data.pi_reference || data.piReference,
          proformaInvoiceDate: data.proforma_invoice_date || data.proformaInvoiceDate || data.pi_date || data.piDate,
          clientName: data.client_name || data.clientName,
          consignee: data.consignee || data.consignee_details || data.consigneeDetails,
          buyer: data.buyer || data.buyer_details || data.buyerDetails,
          productLines: (Array.isArray(productLinesRaw) ? productLinesRaw : []).map(line => ({
            ...line,
            productName: line.productName || line.product_name || line.product || line.name || line.material_description || line.materialDescription || 'Unknown',
            size: line.size || line.product_size || '',
            surface: line.surface || line.product_surface || '',
            description: line.description || line.product_description || line.productDescription || line.product_desc || line.material_description || line.materialDescription || '',
            totalBoxes: line.totalBoxes || line.total_boxes || line.boxes || 0,
            sqmAuto: line.sqmAuto || line.sqm_auto || line.sqm || 0,
            netWeight: line.netWeight || line.net_weight || 0,
            grossWeight: line.grossWeight || line.gross_weight || 0
          }))
        };
        setPrintData(normalizedData);
        setShowPrintModal(true);
      }
    } catch (error) {
      showError('Failed to load packing list details');
    } finally {
      setLoadingView(false);
    }
  };

  const handlePrint = async (pl) => {
    try { await api.post('/document-activity/doc/' + (pl?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    await handleView(pl);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintModal(false);
      }
    }, 500);
  };

  const handleDownloadPDF = async (pl) => {
    try { await api.post('/document-activity/doc/' + (pl?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      setLoadingView(true);
      const response = await api.get(`/packing-lists/${pl.id}`);
      const data = response.data?.data || response.data;
      if (data) {
        setPrintData(data);
        setShowPrintModal(true);
        setTimeout(async () => {
          if (printRef.current) {
            showSuccess('Generating PDF...');
            const filename = generateEnterpriseFilename({
              moduleName: 'PACKING-LIST',
              documentNo: data?.packing_list_no || data?.packingListNo || data?.invoice_no || data?.invoiceNo || 'PL',
              clientName: data?.client_name || data?.clientName || '',
              date: data?.invoice_date || data?.invoiceDate || '',
              extension: 'pdf'
            });
            const result = await downloadPDF(printRef.current, filename);
            if (!result?.success) showError('Failed to generate PDF');
          }
          setShowPrintModal(false);
        }, 800);
      }
    } catch (error) {
      showError('Failed to generate PDF');
    } finally {
      setLoadingView(false);
    }
  };

  const handleDeletePackingList = (pl) => {
    setConfirmConfig({
      title: 'Delete Packing List',
      message: `Are you sure you want to delete Packing List ${pl.packingListNo || pl.packing_list_no}? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setDeleting(pl.id);
          await api.delete(`/packing-lists/${pl.id}`);
          showSuccess('Packing List deleted successfully');
          fetchPackingLists();
        } catch (error) {
          showError('Failed to delete packing list');
        } finally {
          setDeleting(null);
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setMonthFilter('');
    setDateFrom('');
    setCurrentPage(1);
  };

  const handleExportProductXLSX = async (pl) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const response = await api.get(`/packing-lists/${pl.id}`);
      const plData = response.data?.data || pl;
      await exportProductDetailsToXLSX(plData, 'Packing List');
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const exportPackingLists = () => {
    const columns = [
      createColumnDef('PL No', 'packingListNo'),
      createColumnDef('Date', 'date'),
      createColumnDef('Client', 'clientName'),
      createColumnDef('Pallets', 'totalPallets'),
      createColumnDef('Boxes', 'totalBoxes'),
      createColumnDef('Weight (KG)', 'totalWeight'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredPackingLists, columns, 'xlsx', 'packing-lists');
  };

  const handleImportData = async (importedPackingLists) => {
    try {
      for (const plData of importedPackingLists) {
        await api.post('/packing-lists', {
          packing_list_no: plData.packingListNo || plData['PL No'],
          client_name: plData.clientName || plData['Client'] || '',
          total_pallets: plData.totalPallets || plData['Pallets'] || 0,
          total_weight: plData.totalWeight || plData['Weight (KG)'] || 0,
          net_weight: plData.totalWeight || plData['Weight (KG)'] || 0,
          total_boxes: plData.totalBoxes || 0,
          status: plData.status || plData['Status'] || 'Pending',
        });
      }
      showSuccess(`Successfully imported ${importedPackingLists.length} packing lists!`);
      fetchPackingLists();
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import packing lists: ' + err.message);
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const totalPages = Math.ceil(filteredPackingLists.length / PAGE_SIZE);
  const paginatedPackingLists = filteredPackingLists.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  const getStatusVariant = (status) => {
    if (status === 'Dispatched') return 'info';
    if (status === 'Approved') return 'success';
    if (status === 'Draft') return 'secondary';
    if (status === 'Pending') return 'warning';
    return 'warning';
  };

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Packing List Management</h2>
          <p className="text-muted">Manage packing operations and dispatch documentation</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Package size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Lists</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileCheck size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Approved</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.ready}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Clock size={18} className="text-warning" /></div>
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
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Package size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pallets</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.totalPallets}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileText size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Weight</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{(dashboardStats.totalWeight / 1000).toFixed(1)}T</h5>
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
            <Col lg={8} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Search Packing Lists</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search by PL No. or Client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={4} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                                    <option value="">All Status</option>
                                      <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    
                    <option value="Finalized">Finalized</option>
                    <option value="Dispatched">Dispatched</option>
                  </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <DateRangeFilter onFilterChange={(start, end) => setDateRange({ start, end })} />
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      {/* Bulk Actions Bar */}
      {multiSelect.selectedCount > 0 && (
        <Card className="mb-4 border-primary bg-primary-light animate__animated animate__fadeIn">
          <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <Badge bg="primary" className="rounded-pill p-2 px-3 fs-6">
                {multiSelect.selectedCount} Selected
              </Badge>
              <div className="vr d-none d-md-block"></div>
              <Form.Select
                size="sm"
                className="w-auto border-primary"
                onChange={(e) => e.target.value && handleBulkAction('status', e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Change Status...</option>
                                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    
                    <option value="Finalized">Finalized</option>
                    <option value="Dispatched">Dispatched</option>
                  </Form.Select>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                className="d-flex align-items-center gap-1"
              >
                <Trash2 size={14} /> Delete Selected
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => multiSelect.clearSelection()}
              >
                Cancel
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Packing Lists List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4">
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Packing Lists ({filteredPackingLists.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportPackingLists}
              className="border-white text-white d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Download size={14} className="me-1" />
              <span className="d-none d-md-inline small">Export Data</span>
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="border-white text-white d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Upload size={14} className="me-1" />
              <span className="d-none d-md-inline small">Import Data</span>
            </Button>
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => onNavigate('packing-list-form', { isNew: true })} style={{ width: 'auto' }}>
              <Plus size={16} className="me-1" />
              <span className="d-none d-sm-inline small">Create Packing list</span>
              <span className="d-sm-none small">Create</span>
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Desktop Table View */}
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr className="table-light text-muted small text-uppercase">
                  <th className="ps-4" style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredPackingLists)}
                    />
                  </th>
                  <th>SR. NO.</th>
                  <th>Status</th>
                  <th>PL No.</th>
                  <th>EXP No.</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Pallets</th>
                  <th>Weight (KG)</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                ) : paginatedPackingLists.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-5 text-muted">No packing lists found</td></tr>
                ) : paginatedPackingLists.map((pl, index) => (
                  <tr key={pl.id} className={multiSelect.isSelected(pl.id) ? 'table-active' : ''}>
                    <td data-label="Select" className="ps-4">
                      <Form.Check
                        type="checkbox"
                        checked={multiSelect.isSelected(pl.id)}
                        onChange={() => multiSelect.toggleSelect(pl.id)}
                      />
                    </td>
                    <td data-label="Sr." className="text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                    <td data-label="Status">
                      <DashboardStatusDropdown 
                              module="PackingList" 
                              endpoint="packing-lists" 
                              documentId={pl.id} 
                              value={(pl.is_locked || pl.isLocked) ? 'Locked' : (pl.status || 'Draft')} 
                              disabled={!canEdit || pl.is_locked || pl.isLocked} 
                              onSuccess={fetchPackingLists} 
                            />
                    </td>
                    <td data-label="PL No." className="fw-semibold text-primary">{pl.packingListNo || pl.packing_list_no || '-'}</td>
                    <td data-label="EXP No." className="text-muted">{(pl.exportInvoiceNo || pl.export_invoice_no) && (pl.exportInvoiceNo || pl.export_invoice_no) !== (pl.packingListNo || pl.packing_list_no) ? (pl.exportInvoiceNo || pl.export_invoice_no) : '-'}</td>
                    <td data-label="Client">{pl.clientName || pl.client_name || '-'}</td>
                    <td data-label="Date">{formatDate(pl.date || pl.packingListDate || pl.packing_list_date)}</td>
                    <td data-label="Pallets">{pl.totalPallets || pl.total_pallets || 0}</td>
                    <td data-label="Weight (KG)">{parseFloat(pl.totalWeight || pl.total_weight || 0).toLocaleString()}</td>
                    <td data-label="Actions" className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                            
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => onNavigate('packing-list-form', { packingListId: pl.id })}
                                title="Edit"
                                disabled={pl.is_locked || pl.isLocked}
                              >
                                <Edit size={14} />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleView(pl)} title="View Details"><Eye size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handlePrint(pl)} title="Print Document"><Printer size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleDownloadPDF(pl)} title="Download PDF"><Download size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleExportProductXLSX(pl)} title="Download XLSX"><FileSpreadsheet size={14} /></Button>
                            <LockDocumentButton 
                              documentType="PACKING_LIST" 
                              documentId={pl.id} 
                              isLocked={pl.is_locked || pl.isLocked}
                              onLockSuccess={fetchPackingLists} 
                              getSnapshotData={async () => {
                                const res = await api.get(`/packing-lists/${pl.id}`);
                                return res.data?.data || res.data;
                              }}
                            />
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDeletePackingList(pl)}
                                title="Delete"
                                disabled={pl.is_locked || pl.isLocked}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredPackingLists.length} pageSize={PAGE_SIZE} />
      </Card>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="packing-lists"
      />


      {showPrintModal && (viewingPL || printData) && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen className="print-preview-modal">
          <div className="d-flex justify-content-end p-2 bg-white border-bottom no-print">
            <div className="d-flex gap-2">
              <BsButton variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </BsButton>
              <BsButton variant="outline-secondary" size="sm" onClick={() => setShowPrintModal(false)}>
                Close Preview
              </BsButton>
            </div>
          </div>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printRef}>
              <PackingListPrintView 
                data={printData || viewingPL} 
                boxTypeImageUrl={(printData || viewingPL)?.box_type && masterData?.boxTypeObjects?.find(b => (b.value || b) === (printData || viewingPL).box_type)?.imageUrl}
              />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={printData?.id || viewingPL?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}
<ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
        variant={confirmConfig.variant}
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
    </>
  );
}

export default PackingListDashboard;
