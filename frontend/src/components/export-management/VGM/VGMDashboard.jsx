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
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Row, Col, Card, Table, Badge, Spinner, Form, InputGroup, Modal } from 'react-bootstrap';
import Button from '../../shared/Button.jsx';
import { Power, Eye, Edit, FileText, Printer, Search, Scale, Plus, Trash2, Calendar, RefreshCw, RotateCcw, Download, Upload, Clock, CheckCircle, FileSpreadsheet, Check } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import FilterPanel from '../../shared/FilterPanel.jsx';
import ImportModal from '../../shared/ImportModal.jsx';
import api from '../../../services/api';
import { downloadPDF } from '../../../utils/pdfGenerator.js';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import { exportData, createColumnDef } from '../../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../../utils/productExportUtils.js';
import StatusBadge from '../../common/StatusBadge';
import ActivityTimeline from '../../shared/ActivityTimeline.jsx';
import PaginationControls from '../../common/PaginationControls.jsx';
import VGMPrintView from './VGMPrintView.jsx';
import { formatDisplayDate } from '../../../utils/formatters.js';
import { debounce } from 'lodash';
import { useMultiSelect } from '../../../hooks/useMultiSelect';
import DateRangeFilter, { filterByDateRange } from '../../common/DateRangeFilter.jsx';

function VGMDashboard({ currentUser, onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVGM, setSelectedVGM] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => {} });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 0 });
  const multiSelect = useMultiSelect(invoices);
  const printRef = useRef(null);
  const PAGE_SIZE = 25;

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.vgm_no?.toLowerCase().includes(term) ||
        inv.invoice_no?.toLowerCase().includes(term) ||
        inv.client_name?.toLowerCase().includes(term) ||
        inv.shipper_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply Date Range Filter
    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "vgm_date");
    
    return filtered;
  }, [invoices, searchTerm, dateRange]);

  const stats = useMemo(() => [
    { title: 'Total Invoices', value: invoices.length, icon: FileText, color: '#0d6efd' },
    { title: 'VGM Created', value: invoices.filter(i => i.has_vgm).length, icon: Scale, color: '#198754' },
    { title: 'Pending VGM', value: invoices.filter(i => !i.has_vgm).length, icon: Clock, color: '#ffc107' },
    { title: 'Total Weight', value: (invoices.reduce((sum, i) => sum + (parseFloat(i.gross_weight) || 0), 0) / 1000).toFixed(1) + 'T', icon: Scale, color: '#0dcaf0' },
  ], [invoices]);

  useEffect(() => {
    fetchInvoices();
    
    const handleRefresh = () => fetchInvoices();
    window.addEventListener('vgm:changed', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    
    return () => {
      window.removeEventListener('vgm:changed', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vgm?limit=1000');
      const payload = response.data?.data || response.data || [];
      const rawData = Array.isArray(payload) ? payload : (payload.data || []);
      
      const normalizedData = rawData.map(inv => ({
        ...inv,
        vgm_no: inv.vgmNo || inv.vgm_no,
        backside_no: inv.backsideNo || inv.backside_no,
        vgm_date: inv.vgmDate || inv.vgm_date || inv.invoice_date || inv.invoiceDate,
        invoice_date: inv.invoiceDate || inv.invoice_date,
        client_name: inv.clientName || inv.client_name,
        shipper_name: inv.shipperName || inv.shipper_name,
        gross_weight: inv.grossWeight || inv.gross_weight,
        container_count: inv.containerCount || inv.container_count,
        invoice_no: inv.invoiceNo || inv.invoice_no,
        export_invoice_id: inv.exportInvoiceId || inv.export_invoice_id,
        has_vgm: typeof inv.hasVgm !== 'undefined' ? inv.hasVgm : inv.has_vgm,
      }));

      setInvoices(normalizedData);
      setPagination({
        total: normalizedData.length,
        page: 1,
        limit: 1000,
        totalPages: 1
      });
    } catch (error) {
      console.error('Fetch error:', error);
      showError('Failed to load VGM documents');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id) => {
    try {
      const response = await api.patch(`/vgm/${id}/toggle-status`);
      if (response.data.success) {
        showSuccess(response.data.message || 'Status updated');
        fetchInvoices();
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to toggle status');
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
              resource: 'vgm',
              ids: multiSelect.selectedIds
            });
            showSuccess(`Successfully deleted ${multiSelect.selectedIds.length} records`);
            multiSelect.clearSelection();
            fetchInvoices();
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
        const newStatus = action === 'mark_final' ? 'Finalized' : 'Draft';
        await api.post('/bulk/update', {
          resource: 'vgm',
          ids: multiSelect.selectedIds,
          data: { status: newStatus }
        });
        showSuccess(`Successfully updated ${multiSelect.selectedIds.length} records to ${newStatus}`);
        multiSelect.clearSelection();
        fetchInvoices();
      } catch (error) {
        showError('Bulk update failed');
      }
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  const handleEdit = (invoiceId) => {
    if (!invoiceId) {
      showError('Cannot edit: Missing invoice reference');
      return;
    }
    sessionStorage.setItem('vgm_invoice_id', invoiceId);
    onNavigate('vgm-form', { 
      exportInvoiceId: invoiceId, 
      isNew: false 
    });
  };

  const handleView = async (invoiceId) => {
    if (!invoiceId) { showError('Invalid invoice ID'); return; }
    try {
      setLoading(true);
      const response = await api.get(`/vgm/by-export-invoice/${invoiceId}`);
      const raw = response.data?.data;
      if (raw) {
        let vgmData = raw;
        if (!raw.vgm) {
          vgmData = { vgm: raw || {}, export_invoice: {}, company: {} };
        }
        setSelectedVGM(vgmData);
        setShowPrintView(true);
      } else {
        showError('Failed to load VGM preview data');
      }
    } catch (error) {
      showError('Failed to load VGM preview data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (invoice) => {
    try { await api.post('/document-activity/doc/' + (invoice?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    await handleView(invoice.export_invoice_id);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintView(false);
      }
    }, 500);
  };

  const handleDelete = (invoice) => {
    const deleteId = invoice.id || invoice.export_invoice_id;
    if (!deleteId) { showError('Invalid record selected'); return; }
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this VGM record? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/vgm/${deleteId}`);
          showSuccess('Record deleted successfully');
          fetchInvoices();
        } catch (error) {
          console.error('VGM delete error:', error);
          showError(error.response?.data?.message || 'Failed to delete record');
        } finally {
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDownloadPDF = async (invoiceId, invoiceNo) => {
    try { await api.post('/document-activity/doc/' + (invoiceId, invoiceNo?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    if (!invoiceId) { showError('Invalid ID'); return; }
    try {
      showSuccess('Initializing download...');
      const response = await api.get(`/vgm/by-export-invoice/${invoiceId}`);
      const raw = response.data?.data;
      
      let vgmData = raw;
      if (raw && !raw.vgm) {
        vgmData = { vgm: raw || {}, export_invoice: {}, company: {} };
      }
      
      setSelectedVGM(vgmData);
      setShowPrintView(true);
      
      setTimeout(async () => {
        if (printRef.current) {
          const filename = generateEnterpriseFilename({
              moduleName: 'VGM',
              documentNo: invoiceNo || vgmData.vgm?.vgm_no || 'VGM',
              clientName: vgmData.vgm?.client_name || vgmData.vgm?.clientName || '',
              date: vgmData.vgm?.vgm_date || vgmData.vgm?.vgmDate || '',
              extension: 'pdf'
            });
          const result = await downloadPDF(printRef.current, filename);
          if (result?.success) showSuccess('Download complete');
          else showError('PDF generation failed');
        } else {
          showError('Print element search failed');
        }
        setShowPrintView(false);
      }, 800);
    } catch (e) {
      showError('Failed to prepare PDF data');
    }
  };

  const handleExportProductXLSX = async (invoice) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const response = await api.get(`/vgm/by-export-invoice/${invoice.export_invoice_id || invoice.id}`);
      const vgmData = response.data?.data?.vgm || response.data?.data || invoice;
      await exportProductDetailsToXLSX(vgmData, 'VGM');
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const handleExport = () => {
    const columns = [
      createColumnDef('VGM No.', (item) => item.vgm_no || '-'),
      createColumnDef('Backside No.', (item) => item.backside_no || '-'),
      createColumnDef('Date', (item) => formatDisplayDate(item.vgm_date || item.invoice_date)),
      createColumnDef('Client', (item) => item.client_name || '-'),
      createColumnDef('Shipper', (item) => item.shipper_name || '-'),
      createColumnDef('Weight', (item) => parseFloat(item.gross_weight || 0).toLocaleString() + ' KG'),
      createColumnDef('Containers', (item) => item.container_count || 0),
      createColumnDef('VGM Status', (item) => item.vgm_no ? 'Created' : 'Pending'),
    ];
    exportData(filteredInvoices, columns, 'xlsx', 'vgm_documents');
  };

  const handleImportData = async (importedVGMs) => {
    try {
      for (const vgmData of importedVGMs) {
        await api.post('/vgm', {
          vgm_no: vgmData.vgmNo,
          vgm_date: vgmData.date,
          export_invoice_id: vgmData.invoiceId,
          shipper_name: vgmData.shipper,
          gross_weight: vgmData.weight,
          container_count: vgmData.containers || 0,
          status: vgmData.status || 'Draft',
        });
      }
      showSuccess(`Successfully imported ${importedVGMs.length} VGMs!`);
      fetchInvoices();
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import VGMs: ' + err.message);
    }
  };

  const canManageVGM =
    ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role) ||
    currentUser?.permissions?.includes('all') ||
    currentUser?.permissions?.includes('vgm') ||
    currentUser?.permissions?.includes('logistics');

  if (!canManageVGM) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access VGM Management.</p>
      </div>
    );
  }

  
  const canEdit = currentUser && ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      {/* Page Title */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">VGM Management</h2>
          <p className="text-muted small">SOLAS-compliant VGM documents for container weighing</p>
        </Col>
      </Row>



      {/* Dashboard Stats */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileText size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Invoices</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{invoices.length}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Scale size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Approved</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{invoices.filter(i => i.status === 'Approved').length}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Clock size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pending VGM</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{invoices.filter(i => i.status !== 'Approved').length}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Scale size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Weight</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{(invoices.reduce((sum, i) => sum + (parseFloat(i.gross_weight) || 0), 0) / 1000).toFixed(1)}T</h5>
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
            <Col lg={12} md={12} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Search VGMs</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search by Invoice No, Client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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
                  <CheckCircle size={14} className="me-1" /> Mark Finalized
                </Button>
                <Button 
                  variant="light" 
                  size="sm" 
                  className="text-primary fw-bold d-flex align-items-center"
                  onClick={() => handleBulkAction('mark_draft')}
                >
                  <RefreshCw size={14} className="me-1" /> Mark Draft
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

      {/* VGM Records List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4">
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">VGM Documents ({pagination.total})</h5>
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
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => { sessionStorage.removeItem('vgm_invoice_id'); onNavigate('vgm-form'); }} style={{ width: 'auto' }}>
              <Plus size={16} className="me-1" /> 
              <span className="d-none d-sm-inline small">Create VGM</span>
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
                      onChange={() => multiSelect.toggleSelectAll(invoices)}
                    />
                  </th>
                  <th className="ps-4 fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>SR. NO.</th>
                  <th className="fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>VGM Status</th>
                  <th className="fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>VGM No.</th>
                  <th className="fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>Backside No.</th>
                  <th className="fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>Date</th>
                  <th className="fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>Client</th>
                  <th className="fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>Shipper</th>
                  <th className="fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>Weight</th>
                  <th className="fw-bold text-center" style={{fontSize: '12px', letterSpacing: '0.5px'}}>Containers</th>
                  <th className="pe-4 text-end fw-bold" style={{fontSize: '12px', letterSpacing: '0.5px'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="12" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                ) : invoices.length > 0 ? (
                  invoices.map((invoice, index) => (
                    <tr key={invoice.id} style={{borderBottom: '1px solid #f0f0f0'}} className={multiSelect.isSelected(invoice.id) ? 'table-active' : ''}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(invoice.id)}
                          onChange={() => multiSelect.toggleSelect(invoice.id)}
                        />
                      </td>
                      <td className="ps-4 text-center">{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                      <td>
                        <DashboardStatusDropdown 
                          module="VGM" 
                          endpoint="vgm" 
                          documentId={invoice.id} 
                          value={(invoice.is_locked || invoice.isLocked) ? 'Locked' : (invoice.status || 'Draft')} 
                          disabled={!canEdit || invoice.is_locked || invoice.isLocked} 
                          onSuccess={fetchInvoices} 
                        />
                      </td>
                      <td className="fw-semibold text-primary">{invoice.vgm_no || '-'}</td>
                      <td className="fw-semibold text-dark">{invoice.backside_no || '-'}</td>
                      <td className="text-muted">{formatDisplayDate(invoice.vgm_date || invoice.invoice_date)}</td>
                      <td className="text-dark">{invoice.client_name || '-'}</td>
                      <td className="text-muted">{invoice.shipper_name || '-'}</td>
                      <td className="text-dark">{parseFloat(invoice.gross_weight || 0).toLocaleString()} KG</td>
                      <td className="text-center">
                        <Badge bg="secondary" className="rounded-pill px-2" style={{fontSize: '11px'}}>{invoice.container_count || 0}</Badge>
                      </td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                            
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => handleEdit(invoice.export_invoice_id || invoice.id)}
                                title="Edit"
                                disabled={invoice.is_locked || invoice.isLocked}
                              >
                                <Edit size={14} />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleView(invoice.export_invoice_id || invoice.id)} title="View Details"><Eye size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handlePrint(invoice)} title="Print Document"><Printer size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleDownloadPDF(invoice)} title="Download PDF"><Download size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleExportProductXLSX(invoice)} title="Download XLSX"><FileSpreadsheet size={14} /></Button>
                            <LockDocumentButton 
                              documentType="VGM" 
                              documentId={invoice.id} 
                              isLocked={invoice.is_locked || invoice.isLocked}
                              onLockSuccess={fetchInvoices} 
                              getSnapshotData={async () => {
                                const res = await api.get(`/vgm/${invoice.id}`);
                                return res.data?.data || res.data;
                              }}
                            />
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDelete(invoice.id)}
                                title="Delete"
                                disabled={invoice.is_locked || invoice.isLocked}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="11" className="text-center py-5 text-muted">No VGM documents found.</td></tr>
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedInvoices.length > 0 ? (
              paginatedInvoices.map((invoice, index) => (
                <Card key={invoice.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{invoice.vgm_no || 'Pending VGM'}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDisplayDate(invoice.vgm_date || invoice.invoice_date)}</div>
                      </div>
                      <div className="status-container">
                        <DashboardStatusDropdown 
                          module="VGM" 
                          endpoint="vgm" 
                          documentId={invoice.id} 
                          value={(invoice.is_locked || invoice.isLocked) ? 'Locked' : (invoice.status || 'Draft')} 
                          disabled={!canEdit || invoice.is_locked || invoice.isLocked} 
                          onSuccess={fetchInvoices} 
                        />
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                          <div className="text-dark fw-bold">{invoice.client_name || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Backside No:</label>
                          <div className="text-dark">{invoice.backside_no || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Weight:</label>
                          <div className="text-dark">{parseFloat(invoice.gross_weight || 0).toLocaleString()} KG</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                        
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => handleEdit(invoice.export_invoice_id || invoice.id)}
                            disabled={invoice.is_locked || invoice.isLocked}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Edit size={14} className="me-1" /> Edit
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleView(invoice.export_invoice_id || invoice.id)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Eye size={14} className="me-1" /> View</Button>
                        <Button variant="outline" size="sm" className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handlePrint(invoice)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Printer size={14} className="me-1" /> Print</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleDownloadPDF(invoice)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Download size={14} className="me-1" /> PDF</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleExportProductXLSX(invoice)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><FileSpreadsheet size={14} className="me-1" /> XLSX</Button>
                        <LockDocumentButton 
                            documentType="VGM" 
                            documentId={invoice.id} 
                            isLocked={invoice.is_locked || invoice.isLocked}
                            onLockSuccess={fetchInvoices} 
                            getSnapshotData={async () => {
                              const res = await api.get(`/vgm/${invoice.id}`);
                              return res.data?.data || res.data;
                            }}
                          />
                        
                      {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => handleDelete(invoice.id)}
                            disabled={invoice.is_locked || invoice.isLocked}
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
                No VGM documents found
              </div>
            )}
          </div>
          {pagination.totalPages > 1 && (
            <div className="p-3 border-top">
              <PaginationControls 
                currentPage={pagination.page} 
                totalPages={pagination.totalPages} 
                onPageChange={handlePageChange} 
                totalItems={pagination.total} 
                pageSize={pagination.limit} 
              />
            </div>
          )}
        </Card.Body>
      </Card>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="vgm"
      />

      {showPrintView && selectedVGM && (
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
              
            <div className="d-flex justify-content-center p-4">
              <div ref={printRef}>
                <VGMPrintView data={selectedVGM} />
              </div>
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={selectedVGM?.id || selectedVGM?.export_invoice_id} />
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

export default VGMDashboard;






