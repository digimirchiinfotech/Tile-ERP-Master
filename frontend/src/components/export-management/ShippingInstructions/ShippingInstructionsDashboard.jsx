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
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { debounce } from 'lodash';
import {
  Card,
  Button,
  Table,
  Badge,
  Container,
  Form,
  Row,
  Col,
  InputGroup,
  Spinner,
  Modal
} from 'react-bootstrap';
import { Plus, Eye, Edit, Search, Filter, Trash2, Power, XCircle, Calendar, RefreshCw, FileText, CheckCircle, Clock, AlertCircle, Download, Upload, RotateCcw, Printer, FileSpreadsheet, Check } from 'lucide-react';
import FilterPanel from '../../shared/FilterPanel.jsx';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import ImportModal from '../../shared/ImportModal.jsx';
import { useShippingInstructions } from '../../../hooks/useShippingInstructions';
import { shippingInstructionService } from '../../../services/shippingInstructionService';
import ShippingInstructionsForm from './ShippingInstructionsForm';
import ShippingInstructionsPrintView from './ShippingInstructionsPrintView.jsx';
import { StatsRow } from '../../common/StatsCard';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import { downloadPDF } from '../../../utils/pdfGenerator.js';
import { formatDisplayDate } from '../../../utils/formatters.js';
import { useMultiSelect } from '../../../hooks/useMultiSelect.js';
import StatusBadge from '../../common/StatusBadge';
import ActivityTimeline from '../../shared/ActivityTimeline.jsx';
import PaginationControls from '../../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../../common/DateRangeFilter.jsx';
import { exportData, createColumnDef } from '../../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../../utils/productExportUtils.js';
import api from '../../../services/api.js';

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function ShippingInstructionsDashboard({ currentUser, onNavigate }) {
  const {
    shippingInstructions: data,
    loading,
    error,
    fetchShippingInstructions: fetch,
    createShippingInstruction: create,
    updateShippingInstruction: update,
    deleteShippingInstruction,
    toggleShippingInstructionStatus,
    pagination
  } = useShippingInstructions();

  const [localLoading, setLocalLoading] = useState(false);

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'form'
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);

const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, variant: 'danger' });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const printRef = useRef(null);
  const multiSelect = useMultiSelect(data || []);
  const PAGE_SIZE = 25;

  const filteredInstructions = useMemo(() => {
    let filtered = data || [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.instructionNo || item.si_no || '').toLowerCase().includes(term) ||
        (item.clientName || item.client_name || '').toLowerCase().includes(term) ||
        (item.invoiceReference || item.invoice_no || '').toLowerCase().includes(term) ||
        (item.vgmNo || item.vgm_no || '').toLowerCase().includes(term) ||
        (item.vesselName || item.vessel_name || '').toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply Date Range Filter
    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "date");

    return filtered;
  }, [data, searchTerm, statusFilter, dateRange]);

  const stats = useMemo(() => [
    { title: 'Total SI', value: (data || []).length, icon: FileText, color: '#0d6efd' },
    { title: 'Approved', value: (data || []).filter(i => i.status === 'Approved').length, icon: CheckCircle, color: '#198754' },
    { title: 'Pending', value: (data || []).filter(i => i.status !== 'Completed').length, icon: Clock, color: '#ffc107' },
  ], [data]);

  useEffect(() => {
    fetch({ limit: 1000 }); // Fetch all for client-side filtering

    const handleRefresh = () => fetch({ limit: 1000 });
    window.addEventListener('shippingInstruction:changed', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('shippingInstruction:changed', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleNew = () => {
    setEditingItem(null);
    setViewingItem(null);
    setViewMode('form');
  };

  const handleEdit = async (item) => {
    if (!item?.id) { showError('Invalid selection'); return; }
    try {
      setLocalLoading(true);
      const response = await shippingInstructionService.getById(item.id);
      const fullData = response.data?.data || item;
      setEditingItem(fullData);
      setViewingItem(null);
      setViewMode('form');
    } catch (error) {
      console.error('Edit Load Error:', error);
      showError('Failed to load record for editing');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleView = async (item) => {
    if (!item?.id) { showError('Invalid selection'); return; }
    try {
      setLocalLoading(true);
      const response = await shippingInstructionService.getById(item.id);
      const data = response.data?.data || item;
      setPrintData(data);
      setShowPrintModal(true);
    } catch (error) {
      console.error('View Error:', error);
      showError('Failed to load shipping instruction details');
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePrint = async (si) => {
    try { await api.post('/document-activity/doc/' + (si?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    await handleView(si);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintModal(false);
      }
    }, 500);
  };

  const handleSave = async (formData) => {
    try {
      const invoiceId = formData.exportInvoiceId || formData.export_invoice_id;
      if (editingItem) {
        if (invoiceId) {
          await shippingInstructionService.updateByExportInvoice(invoiceId, formData);
        } else {
          await update(editingItem.id, formData);
        }
      } else {
        if (invoiceId) {
          await shippingInstructionService.createByExportInvoice(invoiceId, formData);
        } else {
          await create(formData);
        }
      }
      showSuccess('Shipping Instruction saved successfully');
      setViewMode('list');
      setEditingItem(null);
      setViewingItem(null);
      fetch({ limit: 1000 });
    } catch (err) {
      console.error('Error saving shipping instruction:', err);
      showError('Failed to save shipping instruction: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingItem(null);
    setViewingItem(null);
  };

  const handleExportProductXLSX = async (item) => {
    try {
      if (!item || !item.id) {
        showError('Invalid shipping instruction: missing ID');
        return;
      }
      showSuccess('Preparing Product XLSX...');
      const response = await shippingInstructionService.getById(item.id);
      const siData = response.data?.data || item;
      await exportProductDetailsToXLSX(siData, 'Shipping Instructions');
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const handleExportData = () => {
    try {
      if (!filteredInstructions || filteredInstructions.length === 0) {
        showError('No shipping instructions to export');
        return;
      }

      const columns = [
        createColumnDef('Instruction No', (item) => item.instructionNo || item.si_no),
        createColumnDef('Client Name', (item) => item.clientName || item.client_name),
        createColumnDef('Invoice Reference', (item) => item.invoiceReference || item.invoice_no),
        createColumnDef('Freight Forwarder', (item) => item.freightForwarder || item.freight_forwarder),
        createColumnDef('Status', 'status'),
        createColumnDef('Created Date', (item) => formatDisplayDate(item.createdDate || item.created_at))
      ];

      exportData(filteredInstructions, columns, 'xlsx', 'shipping-instructions');
      showSuccess('Shipping instructions exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      showError('Failed to export shipping instructions: ' + err.message);
    }
  };

  const handleBulkAction = async (action) => {
    if (multiSelect.selectedIds.length === 0) return;

    if (action === 'delete') {
      setConfirmConfig({
        title: 'Confirm Bulk Delete',
        message: `Are you sure you want to delete ${multiSelect.selectedIds.length} selected records? This action cannot be undone.`,
        variant: 'danger',
        onConfirm: async () => {
          try {
            await api.post('/bulk/delete', {
              resource: 'shipping_instruction',
              ids: multiSelect.selectedIds
            });
            showSuccess(`Successfully deleted ${multiSelect.selectedIds.length} records`);
            multiSelect.clearSelection();
            fetch({ limit: 1000 });
          } catch (error) {
            showError('Bulk delete failed');
          } finally {
            setShowConfirmModal(false);
          }
        }
      });
      setShowConfirmModal(true);
    } else {
      // Bulk status update
      try {
        const newStatus = action === 'mark_final' ? 'Completed' : 'Draft';
        await api.post('/bulk/update', {
          resource: 'shipping_instruction',
          ids: multiSelect.selectedIds,
          data: { status: newStatus }
        });
        showSuccess(`Successfully updated ${multiSelect.selectedIds.length} records to ${newStatus}`);
        multiSelect.clearSelection();
        fetch({ limit: 1000 });
      } catch (error) {
        showError('Bulk update failed');
      }
    }
  };

  const handleImportData = async (importedInstructions) => {
    try {
      for (const siData of importedInstructions) {
        await create({
          instructionNo: siData.instructionNo,
          clientName: siData.clientName,
          invoiceReference: siData.invoiceReference,
          freightForwarder: siData.freightForwarder,
          status: siData.status || 'Pending',
          urgency: siData.urgency || 'Medium',
        });
      }
      showSuccess(`Successfully imported ${importedInstructions.length} shipping instructions!`);
      fetch({ limit: 1000 });
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import shipping instructions: ' + err.message);
    }
  };

  const handleDelete = (id) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this shipping instruction? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteShippingInstruction(id);
          showSuccess('Shipping instruction deleted successfully');
          fetch({ limit: 1000 });
        } catch (err) {
          showError('Failed to delete shipping instruction: ' + (err.response?.data?.message || err.message));
        } finally {
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleStatus = (id) => {
    setConfirmConfig({
      title: 'Confirm Status Change',
      message: 'Are you sure you want to toggle the status of this shipping instruction?',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await toggleShippingInstructionStatus(id);
          showSuccess('Status updated successfully');
          fetch({ limit: 1000 });
        } catch (err) {
          showError('Failed to toggle shipping instruction status: ' + (err.response?.data?.message || err.message));
        } finally {
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDownloadPDF = async (item) => {
    try { await api.post('/document-activity/doc/' + (item?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      const response = await api.get(`/shipping-instructions/${item.id}`);
      const fullItem = response.data?.data;
      if (fullItem) {
        setPrintData(fullItem);
        setShowPrintModal(true);
        setTimeout(async () => {
          if (printRef.current) {
            showSuccess('Generating PDF...');
            const filename = generateEnterpriseFilename({
              moduleName: 'SHIPPING-INSTRUCTIONS',
              documentNo: fullItem?.instructionNo || fullItem?.si_no || 'SI',
              clientName: fullItem?.client_name || fullItem?.clientName || '',
              date: fullItem?.invoice_date || fullItem?.invoiceDate || '',
              extension: 'pdf'
            });
            const result = await downloadPDF(printRef.current, filename);
            if (result?.success) {
              setShowPrintModal(false);
            } else {
              showError('Failed to generate PDF');
            }
          } else {
            showError('Print view not ready, please try again');
          }
          setShowPrintModal(false);
        }, 800);
      }
    } catch (error) {
      showError('Failed to load shipping instruction details for PDF');
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin', 'sales_manager', 'sales_executive', 'account', 'purchase', 'administration', 'export_documents'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin', 'export_documents'].includes(currentUser?.role);

  // Only show the full-page loading spinner if it's the initial load or a local action is happening.
  // This prevents the form from unmounting and losing state during background focus refreshes.
  if (localLoading || (loading && viewMode === 'list' && (!data || data.length === 0))) {
    return (
      <Container fluid className="p-3 p-md-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="p-3 p-md-4">
        <Card className="shadow-sm border-danger">
          <Card.Body className="text-center py-5">
            <p className="text-danger mb-3">Error loading shipping instructions</p>
            <p className="text-muted small">{error?.message || error?.toString() || 'An unknown error occurred'}</p>
            <Button variant="primary" onClick={() => fetch({ limit: 1000 })}>
              Try Again
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (viewMode === 'form') {
    const item = viewingItem || editingItem;
    return (
      <ShippingInstructionsForm
        exportInvoiceId={item?.export_invoice_id}
        shippingInstruction={item}
        onSave={handleSave}
        onBack={handleCancel}
        viewOnly={!!viewingItem}
      />
    );
  }

  const canManageSI =
    ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role) ||
    currentUser?.permissions?.includes('all') ||
    currentUser?.permissions?.includes('export_shipping_instruction') ||
    currentUser?.permissions?.includes('logistics');

  if (!canManageSI) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <h4>Access Denied</h4>
          <p>You don't have permission to access Shipping Instructions Management.</p>
        </div>
      </Container>
    );
  }

  const totalPages = Math.ceil(filteredInstructions.length / PAGE_SIZE);
  const paginatedInstructions = filteredInstructions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h2 className="mb-0 fw-bold text-dark">Shipping Instructions</h2>
            <p className="text-muted">Manage shipping instructions and booking details</p>
          </Col>
        </Row>

        <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
          {stats.map((stat, idx) => (
            <Col key={idx} className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
              <Card className="shadow-sm border-0 stats-card">
                <Card.Body className="p-2 d-flex align-items-center gap-2">
                  <div className="icon-box flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${stat.color}15` }}>
                    <stat.icon size={18} style={{ color: stat.color }} />
                  </div>
                  <div className="text-start">
                    <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>{stat.title}</p>
                    <h5 className="fw-bold mb-0" style={{ fontSize: '1.1rem', color: stat.color }}>{stat.value}</h5>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Collapsible Filter Panel */}
        <FilterPanel
          onClear={resetFilters}
          title="Search & Filters"
        >
          <Form onSubmit={(e) => e.preventDefault()}>
            <Row className="g-3 align-items-end">
              <Col lg={6} md={7} sm={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted text-uppercase">Search Instructions</Form.Label>
                  <div className="position-relative">
                    <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                    <Form.Control
                      type="text"
                      className="ps-5 py-2 border-primary-subtle"
                      style={{ borderRadius: '10px' }}
                      placeholder="Search by instruction, client, invoice..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col lg={6} md={5} sm={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                  <Form.Select
                    className="py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    
                    <option value="Confirmed">Confirmed</option>
                    <option value="Loading">Loading</option>
                    <option value="Sent">Sent</option>
                                        <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Revised">Revised</option>
                    
                    <option value="Finalized">Finalized</option>
                    <option value="Rejected">Rejected</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <DateRangeFilter onFilterChange={(start, end) => setDateRange({ start, end })} />
              </Col>
            </Row>
          </Form>
        </FilterPanel>

        {/* Bulk Action Bar */}
        {multiSelect.selectedIds.length > 0 && (
          <Card className="mb-4 border-0 shadow-sm bg-primary text-white bulk-action-bar animate__animated animate__fadeInDown">
            <Card.Body className="py-2 px-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="d-flex align-items-center">
                  <Badge bg="light" text="primary" className="me-3 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                    {multiSelect.selectedIds.length}
                  </Badge>
                  <span className="fw-bold">Records Selected</span>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    variant="light"
                    size="sm"
                    className="text-primary fw-bold d-flex align-items-center"
                    onClick={() => handleBulkAction('mark_final')}
                  >
                    <CheckCircle size={14} className="me-1" /> Mark Completed
                  </Button>
                  <Button
                    variant="light"
                    size="sm"
                    className="text-primary fw-bold d-flex align-items-center"
                    onClick={() => handleBulkAction('mark_draft')}
                  >
                    <RotateCcw size={14} className="me-1" /> Mark Draft
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="fw-bold d-flex align-items-center border-white"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 size={14} className="me-1" /> Delete Selected
                  </Button>
                  <div className="vr mx-2 bg-white opacity-50" />
                  <Button
                    variant="outline-light"
                    size="sm"
                    className="fw-bold"
                    onClick={multiSelect.clearSelection}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Shipping Instructions Records List Card */}
        <Card className="border-0 shadow-sm overflow-hidden mb-4">
          <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
            <h5 className="mb-0 fw-bold text-nowrap me-2">Shipping Instructions ({pagination.total})</h5>
            <div className="d-flex gap-2 flex-nowrap align-items-center">
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleExportData}
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
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleNew} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Instruction</span>
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
                        onChange={() => multiSelect.toggleSelectAll(data)}
                      />
                    </th>
                  <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                  <th>Status</th>
                  <th>Instruction No.</th>
                  <th>VGM No.</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Vessel / Voyage</th>
                  <th>Freight Forwarder</th>
                  <th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5 text-muted">
                        No records match your filters.
                      </td>
                    </tr>
                  ) : (
                    data.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }} className={multiSelect.isSelected(item.id) ? 'table-active' : ''}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={multiSelect.isSelected(item.id)}
                            onChange={() => multiSelect.toggleSelect(item.id)}
                          />
                        </td>
                      <td className="ps-4 text-center">{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                        <td>
                          <DashboardStatusDropdown 
                              module="ShippingInstructions" 
                              endpoint="shipping-instructions" 
                              documentId={item.id} 
                              value={(item.is_locked || item.isLocked) ? 'Locked' : (item.status || 'Draft')} 
                              disabled={!canEdit || item.is_locked || item.isLocked} 
                              onSuccess={() => fetch({ limit: 1000 })} 
                            />
                        </td>
                        <td className="fw-semibold text-primary">{item.instructionNo || item.si_no || '-'}</td>
                        <td className="fw-semibold text-info">{item.vgmNo || item.vgm_no || '-'}</td>
                        <td className="text-muted">{formatDisplayDate(item.date || item.created_at)}</td>
                        <td className="text-dark">{item.clientName || item.client_name || '-'}</td>
                        <td className="text-dark d-none d-lg-table-cell">
                          {item.vesselName || item.vessel_name || ''} {(item.voyageNo || item.voyage_no) ? `/${item.voyageNo || item.voyage_no}` : ''}
                        </td>
                        <td className="text-muted d-none d-lg-table-cell">{item.freightForwarder || item.freight_forwarder || '-'}</td>
                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-1">
                            
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => handleEdit(item)}
                                title="Edit"
                                disabled={item.is_locked || item.isLocked}
                              >
                                <Edit size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-info border-info-subtle"
                              onClick={() => handleView(item)}
                              title="View Details"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handlePrint(item)}
                              title="Print Document"
                            >
                              <Printer size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success border-success-subtle"
                              onClick={() => handleDownloadPDF(item)}
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success border-success-subtle"
                              onClick={() => handleExportProductXLSX(item)}
                              title="Download XLSX"
                            >
                              <FileSpreadsheet size={14} />
                            </Button>
                            <LockDocumentButton 
                              documentType="SHIPPING_INSTRUCTION" 
                              documentId={item.id} 
                              isLocked={item.is_locked || item.isLocked}
                              onLockSuccess={() => fetch({ limit: 1000 })} 
                              getSnapshotData={async () => {
                                const res = await api.get(`/shipping-instructions/${item.id}`);
                                return res.data?.data || res.data;
                              }}
                            />
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDelete(item.id)}
                                title="Delete"
                                disabled={item.is_locked || item.isLocked}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="d-lg-none bg-light-subtle p-3">
              {filteredInstructions.length > 0 ? (
                paginatedInstructions.map((item, index) => (
                  <Card key={item.id} className="mb-3 border-0 shadow-sm si-mobile-card">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                          <h5 className="fw-bold mb-1 text-dark">{item.instructionNo || item.si_no || '-'}</h5>
                          <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDisplayDate(item.date || item.created_at)}</div>
                        </div>
                        <div className="status-container">
                          <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${item.status === 'Approved' ? 'success' :
                              item.status === 'Confirmed' ? 'info' :
                                item.status === 'Loading' ? 'warning' : 'secondary'
                            }`}>
                            {item.status || 'Draft'}
                          </div>
                        </div>
                      </div>

                      <Row className="g-3 mb-4">
                        <Col xs={12}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                            <div className="text-dark fw-bold">{item.clientName || item.client_name || 'N/A'}</div>
                          </div>
                        </Col>
                        <Col xs={12}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">VGM No:</label>
                            <div className="text-dark">{item.vgmNo || item.vgm_no || '-'}</div>
                          </div>
                        </Col>
                        <Col xs={12}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Vessel:</label>
                            <div className="text-dark">{item.vesselName || item.vessel_name || '-'}</div>
                          </div>
                        </Col>
                      </Row>
                      <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                        
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => handleEdit(item)}
                            disabled={item.is_locked || item.isLocked}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Edit size={14} className="me-1" /> Edit
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleView(si)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Eye size={14} className="me-1" /> View</Button>
                        <Button variant="outline" size="sm" className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handlePrint(si)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Printer size={14} className="me-1" /> Print</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleDownloadPDF(si)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Download size={14} className="me-1" /> PDF</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleExportProductXLSX(si)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><FileSpreadsheet size={14} className="me-1" /> XLSX</Button>
                        
                        <LockDocumentButton 
                            documentType="SHIPPING_INSTRUCTION" 
                            documentId={item.id} 
                            isLocked={item.is_locked || item.isLocked}
                            onLockSuccess={() => fetch({ limit: 1000 })} 
                            getSnapshotData={async () => {
                              const res = await api.get(`/shipping-instructions/${item.id}`);
                              return res.data?.data || res.data;
                            }}
                          />
                        
                      {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => handleDelete(item.id)}
                            disabled={item.is_locked || item.isLocked}
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
                  No records match your filters.
                </div>
              )}
            </div>
            {pagination.totalPages > 1 && (
              <div className="p-3 border-top">
                <PaginationControls
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="shipping-instructions"
      />

      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
        variant={confirmConfig.variant}
      />

      {/* Print Preview Modal */}
      {showPrintModal && printData && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <div className="no-print p-3 d-flex justify-content-end bg-white border-bottom">
            <div className="d-flex gap-2">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowPrintModal(false)}>Close Preview</Button>
            </div>
          </div>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div className="d-flex justify-content-center p-4">
              <div ref={printRef}>
                <ShippingInstructionsPrintView data={printData} />
              </div>
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={printData?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}
      <style>{`
        .si-mobile-card {
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
      `}</style>
    </>
  );
}

export default ShippingInstructionsDashboard;
