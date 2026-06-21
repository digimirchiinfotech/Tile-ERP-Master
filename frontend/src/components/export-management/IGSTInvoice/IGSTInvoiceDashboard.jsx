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
import { generateEnterpriseFilename } from '../../../utils/fileNamingUtils';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Row, Col, Card, Table, Badge, Spinner, Form, Modal } from 'react-bootstrap';
import Button from '../../shared/Button.jsx';
import { BarChart3, Power, Eye, Edit, FileText, Printer, Search, Plus, Trash2, RefreshCw, Download, FileSpreadsheet, Calculator, Percent, Check } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import LockDocumentButton from '../../shared/LockDocumentButton.jsx';
import StatusBadge from '../../common/StatusBadge.jsx';
import ActivityTimeline from '../../shared/ActivityTimeline.jsx';
import FilterPanel from '../../shared/FilterPanel.jsx';
import api from '../../../services/api';
import igstInvoiceService from '../../../services/igstInvoiceService';
import { downloadPDF } from '../../../utils/pdfGenerator.js';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import { exportData, createColumnDef } from '../../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../../utils/productExportUtils.js';
import PaginationControls from '../../common/PaginationControls.jsx';
import IGSTInvoicePrintView from './IGSTInvoicePrintView.jsx';
import { formatDisplayDate } from '../../../utils/formatters.js';
import { useMultiSelect } from '../../../hooks/useMultiSelect';
import DateRangeFilter, { filterByDateRange } from '../../common/DateRangeFilter.jsx';

function IGSTInvoiceDashboard({ currentUser, onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    igstInvoiceNo: '',
    exportInvoiceRef: '',
    exporterName: '',
    status: ''
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => {} });
  
  const [stats, setStats] = useState({
    totalCount: 0,
    draftCount: 0,
    approvedCount: 0,
    totalValue: 0
  });

  const PAGE_SIZE = 25;
  const printRef = useRef(null);

  useEffect(() => {
    fetchInvoicesAndStats();
  }, []);

  const fetchInvoicesAndStats = async () => {
    try {
      setLoading(true);
      // Fetch List (we get up to 1000 for local searching/filtering)
      const listResponse = await igstInvoiceService.getAll({ limit: 1000 });
      const rawData = listResponse.data?.data?.data || listResponse.data?.data || [];
      setInvoices(rawData);

      // Fetch Stats
      const statsResponse = await igstInvoiceService.getStats();
      if (statsResponse.data?.success) {
        setStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error('Fetch IGST Invoices error:', error);
      showError('Failed to load IGST invoices list');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    if (filters.igstInvoiceNo) {
      const term = filters.igstInvoiceNo.toLowerCase();
      filtered = filtered.filter(inv => (inv.igstInvoiceNo || inv.igst_invoice_no || '').toLowerCase().includes(term));
    }
    if (filters.exportInvoiceRef) {
      const term = filters.exportInvoiceRef.toLowerCase();
      filtered = filtered.filter(inv => (inv.exportInvoiceNo || inv.export_invoice_no || '').toLowerCase().includes(term));
    }
    if (filters.exporterName) {
      const term = filters.exporterName.toLowerCase();
      filtered = filtered.filter(inv => (inv.exporterName || inv.exporter_name || '').toLowerCase().includes(term));
    }
    if (filters.status) {
      filtered = filtered.filter(inv => (inv.status || 'Draft') === filters.status);
    }
    
    // Apply Date Range Filter
    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "date");
    
    return filtered;
  }, [invoices, filters, dateRange]);

  const multiSelect = useMultiSelect(filteredInvoices);

  const handleStatusToggle = async (id) => {
    try {
      const response = await igstInvoiceService.toggleStatus(id);
      if (response.data.success) {
        showSuccess(response.data.message || 'Status updated');
        fetchInvoicesAndStats();
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
              resource: 'igst_invoice',
              ids: multiSelect.selectedIds
            });
            showSuccess(`Successfully deleted ${multiSelect.selectedIds.length} records`);
            multiSelect.clearSelection();
            fetchInvoicesAndStats();
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
        const newStatus = action === 'mark_approved' ? 'Approved' : 'Draft';
        await api.post('/bulk/update', {
          resource: 'igst_invoice',
          ids: multiSelect.selectedIds,
          data: { status: newStatus }
        });
        showSuccess(`Successfully updated ${multiSelect.selectedIds.length} records to ${newStatus}`);
        multiSelect.clearSelection();
        fetchInvoicesAndStats();
      } catch (error) {
        showError('Bulk update failed');
      }
    }
  };

  const resetFilters = () => {
    setFilters({
      igstInvoiceNo: '',
      exportInvoiceRef: '',
      exporterName: '',
      status: ''
    });
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  const handleEdit = (invoice) => {
    onNavigate('igst-invoice-form', { 
      exportInvoiceId: invoice.exportInvoiceId || invoice.export_invoice_id, 
      isNew: false 
    });
  };

  const handleCreateNew = () => {
    // Show a modal to select an existing Export Invoice that doesn't have an IGST Invoice
    // Or just navigate to igst-invoice-form if there is navigation data, or let form ask for exportInvoiceId
    sessionStorage.removeItem('igst_invoice_id');
    onNavigate('igst-invoice-form', { isNew: true });
  };

  const handleView = async (invoiceId) => {
    try {
      setLoading(true);
      const response = await igstInvoiceService.getByExportInvoice(invoiceId);
      if (response.data?.success) {
        setSelectedInvoice(response.data.data);
        setShowPrintView(true);
      } else {
        showError('Failed to load IGST invoice preview');
      }
    } catch (error) {
      showError('Failed to load IGST invoice preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (invoice) => {
    try { await api.post('/document-activity/doc/' + (invoice?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    await handleView(invoice.exportInvoiceId || invoice.export_invoice_id);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintView(false);
      }
    }, 500);
  };

  const handleDelete = (invoice) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this IGST Invoice record? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await igstInvoiceService.delete(invoice.exportInvoiceId || invoice.export_invoice_id);
          showSuccess('IGST Invoice deleted successfully');
          fetchInvoicesAndStats();
        } catch (error) {
          showError(error.response?.data?.message || 'Failed to delete record');
        } finally {
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDownloadPDF = async (invoice) => {
    try { await api.post('/document-activity/doc/' + (invoice?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      showSuccess('Initializing PDF download...');
      const response = await igstInvoiceService.getByExportInvoice(invoice.exportInvoiceId || invoice.export_invoice_id);
      if (response.data?.success) {
        const fullData = response.data.data;
        setSelectedInvoice(fullData);
        setShowPrintView(true);
        
        setTimeout(async () => {
          if (printRef.current) {
            const displayNo = invoice.igstInvoiceNo || invoice.igst_invoice_no || 'IGST';
            const filename = generateEnterpriseFilename({
              moduleName: 'IGST-INVOICE',
              documentNo: displayNo,
              clientName: invoice.clientName || invoice.client_name || '',
              date: invoice.invoiceDate || invoice.invoice_date || '',
              extension: 'pdf'
            });
            const result = await downloadPDF(printRef.current, filename);
            if (result?.success) showSuccess('PDF downloaded successfully');
            else showError('Failed to generate PDF');
          }
          setShowPrintView(false);
        }, 800);
      }
    } catch (e) {
      showError('Failed to prepare PDF data');
    }
  };

  const handleExportProductXLSX = async (invoice) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const response = await igstInvoiceService.getByExportInvoice(invoice.exportInvoiceId || invoice.export_invoice_id);
      const invoiceData = response.data?.data || invoice;
      await exportProductDetailsToXLSX(invoiceData, 'IGST Invoice', null);
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
      console.error('XLSX export error:', error);
    }
  };

  const handleExport = () => {
    const columns = [
      createColumnDef('IGST Invoice No.', (item) => item.igstInvoiceNo || item.igst_invoice_no || '-'),
      createColumnDef('Export Invoice No.', (item) => item.exportInvoiceNo || item.export_invoice_no || '-'),
      createColumnDef('Date', (item) => formatDisplayDate(item.date)),
      createColumnDef('Exporter Name', (item) => item.exporterName || item.exporter_name || '-'),
      createColumnDef('Taxable Value', (item) => parseFloat(item.totalBeforeTax || item.total_before_tax || 0).toLocaleString() + ' INR'),
      createColumnDef('IGST Total', (item) => parseFloat(item.totalIgst || item.total_igst || 0).toLocaleString() + ' INR'),
      createColumnDef('Grand Total', (item) => parseFloat(item.grandTotal || item.grand_total || 0).toLocaleString() + ' INR'),
      createColumnDef('Status', (item) => item.status || 'Draft')
    ];
    exportData(filteredInvoices, columns, 'xlsx', 'igst_invoices_export');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const totalPages = useMemo(() => {
    return Math.ceil(filteredInvoices.length / PAGE_SIZE);
  }, [filteredInvoices]);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  const canEdit = currentUser && ['super_admin', 'company_admin', 'export_documents', 'admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);

  return (
    <>
      {/* Title */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark d-flex align-items-center">
            <Percent className="text-primary me-2" size={28} />
            IGST Invoice Management
          </h2>
          <p className="text-muted small">Generate and manage official SOLAS/GST Export Tax Invoices with integrated real-time computations</p>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <FileText size={18} className="text-primary" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Invoices</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.totalCount}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Percent size={18} className="text-success" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Approved/Finalized</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.approvedCount}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <RefreshCw size={18} className="text-warning animate-spin-slow" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Drafts</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.draftCount}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Calculator size={18} className="text-info" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Cumulative Value</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>₹{parseFloat(stats.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filter Panel */}
      <FilterPanel onClear={resetFilters} title="Filter Invoices">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3 align-items-end">
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase mb-1">IGST Invoice No.</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle rounded-3"
                    placeholder="Search IGST No."
                    value={filters.igstInvoiceNo}
                    onChange={(e) => setFilters(prev => ({ ...prev, igstInvoiceNo: e.target.value }))}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase mb-1">Export Invoice Ref</Form.Label>
                <Form.Control
                  type="text"
                  className="py-2 border-primary-subtle rounded-3"
                  placeholder="Search Export Ref."
                  value={filters.exportInvoiceRef}
                  onChange={(e) => setFilters(prev => ({ ...prev, exportInvoiceRef: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase mb-1">Exporter Name</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.exporterName}
                  onChange={(e) => setFilters(prev => ({ ...prev, exporterName: e.target.value }))}
                >
                  <option value="">All Exporters</option>
                  {[...new Set(invoices.map(i => i.exporterName || i.exporter_name).filter(Boolean))].sort().map(exporter => (
                    <option key={exporter} value={exporter}>{exporter}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase mb-1">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Finalized">Finalized</option>
                  <option value="Rejected">Rejected</option>
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

      {/* Bulk Action Bar */}
      {multiSelect.selectedIds.length > 0 && (
        <Card className="mb-4 border-0 shadow-sm bg-primary text-white bulk-action-bar animate__animated animate__fadeInDown">
          <Card.Body className="py-2 px-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center">
                <Badge bg="light" text="primary" className="me-3 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                  {multiSelect.selectedIds.length}
                </Badge>
                <span className="fw-bold">IGST Invoices Selected</span>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                
                <Button variant="outline-danger" size="sm" className="d-flex align-items-center" onClick={() => handleBulkAction('delete')}>
                  <Trash2 size={16} className="me-1" /> Delete Selected
                </Button>
                <Button variant="light" size="sm" className="d-flex align-items-center text-primary fw-bold ms-auto" onClick={() => multiSelect.clearSelection()}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Main Table Card */}
      <Card className="border-0 shadow-sm animate__animated animate__fadeInUp animate__delay-1s">
        <Card.Header className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold d-flex align-items-center">
            IGST Tax Invoices ({filteredInvoices.length})
          </h5>
          <div className="d-flex gap-2">
            <Button variant="outline-light" size="sm" onClick={() => handleExport()} className="d-flex align-items-center">
              <Download size={16} className="me-1" /> Export XLSX
            </Button>
            {canEdit && (
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center" onClick={handleCreateNew}>
                <Plus size={16} className="me-1" /> Create IGST Invoice
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr className="text-muted small text-uppercase fw-bold">
                  <th style={{ width: '40px' }} className="ps-4">
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredInvoices)}
                    />
                  </th>
                  <th style={{ width: '60px' }}>SR. NO.</th>
                  <th style={{ width: '180px' }}>STATUS</th>
                  <th>IGST INVOICE NO.</th>
                  <th>EXPORT INVOICE REF</th>
                  <th>INVOICE DATE</th>
                  <th>EXPORTER NAME</th>
                  <th className="text-end">TAXABLE AMT</th>
                  <th className="text-end">IGST (18%)</th>
                  <th className="text-end">GRAND TOTAL</th>
                  <th className="text-end pe-4">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice, index) => (
                    <tr key={invoice.id} className={multiSelect.isSelected(invoice.id) ? 'table-primary bg-opacity-10' : ''}>
                      <td data-label="Select" className="ps-4">
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(invoice.id)}
                          onChange={() => multiSelect.toggleSelect(invoice.id)}
                        />
                      </td>
                      <td data-label="Sr." className="text-muted small">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td data-label="Status">
                        <DashboardStatusDropdown 
                          module="IGST" 
                          endpoint="igst-invoices" 
                          documentId={invoice.id} 
                          value={(invoice.is_locked || invoice.isLocked) ? 'Locked' : (invoice.status || 'Draft')} 
                          disabled={!canEdit || invoice.is_locked || invoice.isLocked} 
                          onSuccess={fetchInvoicesAndStats} 
                        />
                      </td>
                      <td data-label="IGST Invoice No." className="fw-bold text-dark">{invoice.igst_invoice_no || invoice.igstInvoiceNo}</td>
                      <td data-label="Export Invoice Ref" className="text-muted">{invoice.export_invoice_no || invoice.exportInvoiceNo}</td>
                      <td data-label="Invoice Date">{formatDisplayDate(invoice.date || invoice.invoice_date || invoice.invoiceDate)}</td>
                      <td data-label="Exporter Name">{invoice.exporter_name || invoice.exporterName}</td>
                      <td data-label="Taxable Amt" className="text-end">₹{(invoice.taxable_amount || invoice.taxableAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td data-label="IGST (18%)" className="text-end text-info">₹{(invoice.igst_amount || invoice.igstAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td data-label="Grand Total" className="text-end fw-bold text-success">₹{(invoice.grand_total || invoice.grandTotal || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>

                      <td data-label="Actions" className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handleEdit(invoice)}
                              title="Edit"
                              disabled={invoice.is_locked || invoice.isLocked}
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleView(invoice.exportInvoiceId || invoice.export_invoice_id)} title="View Details"><Eye size={14} /></Button>
                          <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handlePrint(invoice)} title="Print Document"><Printer size={14} /></Button>
                          <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleDownloadPDF(invoice)} title="Download PDF"><Download size={14} /></Button>
                          <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleExportProductXLSX(invoice)} title="Export Detailed XLSX"><FileSpreadsheet size={14} /></Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-warning border-warning-subtle"
                              onClick={() => handleStatusToggle(invoice.id)}
                              title="Mark as Finalized"
                              disabled={invoice.is_locked || invoice.isLocked}
                            >
                              <Check size={14} />
                            </Button>
                          )}
                          <LockDocumentButton 
                            documentType="IGST_INVOICE" 
                            documentId={invoice.id} 
                            isLocked={invoice.is_locked || invoice.isLocked}
                            onLockSuccess={fetchInvoicesAndStats} 
                            getSnapshotData={async () => {
                              const res = await igstInvoiceService.getByExportInvoice(invoice.exportInvoiceId || invoice.export_invoice_id);
                              return res.data?.data || res.data;
                            }}
                          />
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-danger border-danger-subtle"
                              onClick={() => handleDelete(invoice)}
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
                  <tr><td colSpan="11" className="text-center py-5 text-muted">No IGST invoices found. Select "Create IGST Invoice" to start!</td></tr>
                )}
              </tbody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="p-3 border-top">
              <PaginationControls 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
                totalItems={filteredInvoices.length} 
                pageSize={PAGE_SIZE} 
              />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Print View Modal */}
      {showPrintView && selectedInvoice && (
        <Modal show={showPrintView} onHide={() => setShowPrintView(false)} fullscreen>
          <div className="no-print p-3 d-flex justify-content-end bg-white border-bottom shadow-sm">
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
                <IGSTInvoicePrintView data={selectedInvoice} />
              </div>
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={selectedInvoice?.igstInvoice?.id || selectedInvoice?.igst_invoice?.id || selectedInvoice?.id} />
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
        onCancel={() => setShowConfirmModal(false)}
        variant={confirmConfig.variant}
      />

      <style>{`
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
        
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default IGSTInvoiceDashboard;
