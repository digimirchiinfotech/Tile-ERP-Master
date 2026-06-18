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
import { Power, BarChart3, Eye, Edit, FileText, Search, Plus, Trash2, RefreshCcw, Package, FileCheck, Download, Upload, X, Printer, RotateCcw, FileSpreadsheet, Check } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import FilterPanel from '../../shared/FilterPanel.jsx';
import ImportModal from '../../shared/ImportModal.jsx';
import api from '../../../services/api';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import { formatDisplayDate } from '../../../utils/formatters.js';
import { useMultiSelect } from '../../../hooks/useMultiSelect.js';
import PaginationControls from '../../common/PaginationControls.jsx';
import StatusBadge from '../../common/StatusBadge.jsx';
import ActivityTimeline from '../../shared/ActivityTimeline.jsx';
import ExportInvoiceAnnexurePrintView from './ExportInvoiceAnnexurePrintView.jsx';
import { downloadPDF } from '../../../utils/pdfGenerator.js';
import DateRangeFilter, { filterByDateRange } from '../../common/DateRangeFilter.jsx';
import { exportData, createColumnDef } from '../../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../../utils/productExportUtils.js';
function ExportInvoiceAnnexureDashboard({ currentUser, onNavigate }) {
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingAnnexure, setViewingAnnexure] = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isOfficePrint, setIsOfficePrint] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => {} });
  const multiSelect = useMultiSelect(invoices);
  const printRef = useRef(null);
  const PAGE_SIZE = 25;

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => 
        (inv.annexure_no || inv.annexureNo || '').toLowerCase().includes(term) ||
        (inv.export_invoice_no || inv.exportInvoiceNo || inv.invoice_no || inv.invoiceNo || '').toLowerCase().includes(term) ||
        (inv.packing_list_no || inv.packingListNo || '').toLowerCase().includes(term) ||
        (inv.client_name || inv.clientName || '').toLowerCase().includes(term)
      );
    }
    
    // Apply Date Range Filter
    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "invoice_date");
    
    return filtered;
  }, [invoices, searchTerm, dateRange]);

  const dashboardStats = useMemo(() => ({
    total: invoices.length,
    ready: invoices.filter(i => (i.annexure_status || i.annexureStatus) === 'Finalized').length,
    drafts: invoices.filter(i => (i.annexure_status || i.annexureStatus) !== 'Finalized').length
  }), [invoices]);

  useEffect(() => {
    fetchInvoices();

    // Real-time synchronization listener
    const handleSync = () => fetchInvoices();
    window.addEventListener('exportAnnexure:changed', handleSync);
    return () => window.removeEventListener('exportAnnexure:changed', handleSync);
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/export-invoice-annexures', {
        params: { limit: 1000 }
      });
      const payload = response.data?.data;
      const data = payload?.data || payload || [];
      setInvoices(data);
    } catch (error) {
      showError('Failed to load annexures');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id) => {
    try {
      const response = await api.patch(`/export-invoice-annexures/${id}/toggle-status`);
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
              resource: 'export_invoice_annexures',
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
          resource: 'export_invoice_annexures',
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

  const handleEdit = (exportInvoiceId, annexureId) => {
    if (!exportInvoiceId && !annexureId) {
      showError('Cannot edit: Missing invoice or annexure reference');
      return;
    }
    onNavigate('export-invoice-annexure-form', { 
      exportInvoiceId: exportInvoiceId, 
      annexureId: annexureId,
      isNew: !annexureId 
    });
  };

  const handleView = async (inv, isOffice = false) => {
    const annexureId = inv.id || inv.annexure_id || inv.annexureId;
    if (!annexureId) {
      showError('No annexure found for this invoice');
      return;
    }
    
    try {
      setLoadingView(true);
      setIsOfficePrint(isOffice);
      const response = await api.get(`/export-invoice-annexures/annexure/${annexureId}`);
      const data = response.data?.data || response.data;
      if (data) {
        setPrintData(data);
        setShowPrintModal(true);
      } else {
        showError('Failed to load annexure details');
      }
    } catch (error) {
      console.error('View Annexure error:', error);
      showError('Failed to load annexure details');
    } finally {
      setLoadingView(false);
    }
  };

  const handleDownloadPDF = async (inv, isOffice = false) => {
    try { await api.post('/document-activity/doc/' + (inv?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    const annexureId = inv.id || inv.annexure_id || inv.annexureId;
    if (!annexureId) {
      showError('No annexure found for this invoice');
      return;
    }
    try {
      setLoadingView(true);
      setIsOfficePrint(isOffice);
      showSuccess('Initializing download...');
      const response = await api.get(`/export-invoice-annexures/annexure/${annexureId}`);
      const data = response.data?.data || response.data;
      if (data) {
        setPrintData(data);
        setShowPrintModal(true);
        setTimeout(async () => {
          if (printRef.current) {
            const filename = generateEnterpriseFilename({
              moduleName: isOffice ? 'OFFICE-ANNEXURE' : 'ANNEXURE',
              documentNo: inv?.annexure_no || data?.annexure_no || 'ANX',
              clientName: inv?.client_name || inv?.clientName || data?.client_name || '',
              date: inv?.invoice_date || inv?.invoiceDate || data?.invoice_date || '',
              extension: 'pdf'
            });
            const result = await downloadPDF(printRef.current, filename);
            if (result?.success) showSuccess('Download complete');
            else showError('PDF generation failed');
          } else {
            showError('Print element search failed');
          }
          setShowPrintModal(false);
        }, 1500);
      } else {
        showError('Failed to load annexure for PDF');
      }
    } catch (e) {
      showError('Failed to prepare PDF data');
    } finally {
      setLoadingView(false);
    }
  };

  const handlePrint = async (inv, isOffice = false) => {
    try { await api.post('/document-activity/doc/' + (inv?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    const annexureId = inv.id || inv.annexure_id || inv.annexureId;
    if (!annexureId) {
      showError('No annexure found for this invoice');
      return;
    }
    try {
      setLoadingView(true);
      setIsOfficePrint(isOffice);
      const response = await api.get(`/export-invoice-annexures/annexure/${annexureId}`);
      const data = response.data?.data || response.data;
      if (data) {
        setPrintData(data);
        setShowPrintModal(true);
        // Wait for modal to render and images to load before triggering print
        setTimeout(() => {
          window.print();
        }, 1500);
      } else {
        showError('Failed to load annexure for print');
      }
    } catch (error) {
      console.error('Print Annexure error:', error);
      showError('Failed to load annexure for print');
    } finally {
      setLoadingView(false);
    }
  };

  const handleExportProductXLSX = async (inv) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const annexureId = inv.id || inv.annexure_id || inv.annexureId;
      if (!annexureId) { showError('Annexure ID not found'); return; }
      const response = await api.get(`/export-invoice-annexures/annexure/${annexureId}`);
      const annexureData = response.data?.data || inv;
      await exportProductDetailsToXLSX(annexureData, 'Annexure');
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const handleExportData = () => {
    try {
      if (filteredInvoices.length === 0) { showError('No annexures to export'); return; }

      const columns = [
        createColumnDef('Annexure No', (inv) => inv.annexure_no || inv.annexureNo || '-'),
        createColumnDef('Export Invoice No', (inv) => inv.export_invoice_no || inv.invoice_no || inv.invoiceNo || '-'),
        createColumnDef('PL No', (inv) => inv.packing_list_no || inv.packingListNo || '-'),
        createColumnDef('Date', (inv) => formatDisplayDate(inv.invoice_date || inv.invoiceDate)),
        createColumnDef('Client', (inv) => inv.client_name || inv.clientName || '-'),
        createColumnDef('Status', (inv) => inv.annexure_status || inv.annexureStatus || ((inv.annexure_id || inv.annexureId) ? 'Draft' : 'Pending'))
      ];

      exportData(filteredInvoices, columns, 'xlsx', 'invoice-annexures');
      showSuccess('Annexures exported successfully!');
    } catch (err) {
      showError('Failed to export: ' + err.message);
    }
  };

  const handleImportData = async (importedAnnexures) => {
    try {
      for (const annexData of importedAnnexures) {
        if (annexData.exportInvoiceId || annexData['Export Invoice ID']) {
          await api.post(`/export-invoice-annexures/export-invoice/${annexData.exportInvoiceId || annexData['Export Invoice ID']}`, {
            invoice_no: annexData.invoiceNo || annexData['Annexure No'],
            status: annexData.status || 'Draft',
          });
        }
      }
      showSuccess(`Successfully imported ${importedAnnexures.length} annexures!`);
      fetchInvoices();
    } catch (err) {
      showError('Failed to import annexures: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  const getStatusLabel = (inv) => {
    return inv.annexure_status || inv.annexureStatus || ((inv.annexure_id || inv.annexureId) ? 'Draft' : 'Pending');
  };

  
  const canEdit = currentUser && ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Annexure Management</h2>
          <p className="text-muted small">Manage container packing annexures for export invoices</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileText size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total || 0}</h5>
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
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.ready || 0}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Package size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pending</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.drafts || 0}</h5>
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
                <Form.Label className="fw-bold small text-muted text-uppercase">Search Annexures</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search by Annexure No, Invoice No, Client..."
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
                  <FileCheck size={14} className="me-1" /> Mark Finalized
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

      {/* Annexures List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4">
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Annexure List ({filteredInvoices.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            <Button
              variant="outline-light"
              size="sm"
              onClick={handleExportData}
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
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => onNavigate('export-invoice-annexure-form', { isNew: true })} style={{ width: 'auto' }}>
              <Plus size={16} className="me-1" /> 
              <span className="d-none d-sm-inline small">Create Annexure</span>
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
                  <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                  <th>Status</th>
                  <th>Annexure No</th>
                  <th>Export Invoice No</th>
                  <th>PL No.</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-5 text-muted">No annexures found</td></tr>
              ) : invoices.map((inv, index) => (
                <tr key={inv.id} className={multiSelect.isSelected(inv.id) ? 'table-active' : ''}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.isSelected(inv.id)}
                      onChange={() => multiSelect.toggleSelect(inv.id)}
                    />
                  </td>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                  <td>
                    <DashboardStatusDropdown 
                              module="Annexure" 
                              endpoint="export-invoice-annexures" 
                              documentId={inv.id} 
                              value={(inv.is_locked || inv.isLocked) ? 'Locked' : (inv.status || 'Draft')} 
                              disabled={!canEdit || inv.is_locked || inv.isLocked} 
                              onSuccess={fetchInvoices} 
                            />
                  </td>
                  <td className="fw-semibold text-primary">{inv.annexure_no || inv.annexureNo || '-'}</td>
                  <td className="text-muted">{inv.export_invoice_no || inv.exportInvoiceNo || inv.invoice_no || inv.invoiceNo || '-'}</td>
                  <td>{inv.packing_list_no || inv.packingListNo || '-'}</td>
                  <td>{formatDate(inv.invoice_date || inv.invoiceDate)}</td>
                  <td>{inv.client_name || inv.clientName || '-'}</td>
                  <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                            
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => onNavigate('export-invoice-annexure-form', { annexureId: inv.id })}
                                title="Edit"
                                disabled={inv.is_locked || inv.isLocked}
                              >
                                <Edit size={14} />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleView(inv)} title="Client View"><Eye size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-secondary border-secondary-subtle" onClick={() => handleView(inv, true)} title="Office View"><FileText size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handlePrint(inv)} title="Print Client Copy"><Printer size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-secondary border-secondary-subtle" onClick={() => handlePrint(inv, true)} title="Print Office Copy"><Printer size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleDownloadPDF(inv)} title="Download PDF"><Download size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleExportProductXLSX(inv)} title="Download XLSX"><FileSpreadsheet size={14} /></Button>
                            <LockDocumentButton 
                              documentType="ANNEXURE" 
                              documentId={inv.id} 
                              isLocked={inv.is_locked || inv.isLocked}
                              onLockSuccess={fetchInvoices} 
                              getSnapshotData={async () => {
                                const res = await api.get(`/export-invoice-annexures/${inv.id}`);
                                return res.data?.data || res.data;
                              }}
                            />
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDelete(inv.id)}
                                title="Delete"
                                disabled={inv.is_locked || inv.isLocked}
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

        {/* Mobile Card View */}
        <div className="d-lg-none bg-light-subtle p-3">
          {paginatedInvoices.length > 0 ? (
            paginatedInvoices.map((inv, index) => (
              <Card key={inv.id} className="mb-3 border-0 shadow-sm annexure-mobile-card">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h5 className="fw-bold mb-1 text-dark">{inv.annexure_no || inv.annexureNo || '-'}</h5>
                      <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDate(inv.invoice_date || inv.invoiceDate)}</div>
                    </div>
                    <div className="status-container">
                      <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                        getStatusLabel(inv) === 'Finalized' ? 'success' :
                        getStatusLabel(inv) === 'Draft' ? 'warning' : 'secondary'
                      }`}>
                        {getStatusLabel(inv)}
                      </div>
                    </div>
                  </div>

                  <Row className="g-3 mb-4">
                    <Col xs={12}>
                      <div className="detail-item">
                        <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                        <div className="text-dark fw-bold">{inv.client_name || inv.clientName || 'N/A'}</div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="detail-item">
                        <label className="text-muted small fw-bold mb-1 d-block">EXP No:</label>
                        <div className="text-dark">{inv.export_invoice_no || inv.exportInvoiceNo || inv.invoice_no || inv.invoiceNo || '-'}</div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="detail-item">
                        <label className="text-muted small fw-bold mb-1 d-block">PL No:</label>
                        <div className="text-dark">{inv.packing_list_no || inv.packingListNo || '-'}</div>
                      </div>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                        
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => onNavigate('export-invoice-annexure-form', { annexureId: inv.id })}
                            disabled={inv.is_locked || inv.isLocked}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Edit size={14} className="me-1" /> Edit
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleView(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Eye size={14} className="me-1" /> View</Button>
                        <Button variant="outline" size="sm" className="text-secondary border-secondary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleView(inv, true)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><FileText size={14} className="me-1" /> Office</Button>
                        <Button variant="outline" size="sm" className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handlePrint(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Printer size={14} className="me-1" /> Print</Button>
                        <Button variant="outline" size="sm" className="text-secondary border-secondary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handlePrint(inv, true)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Printer size={14} className="me-1" /> Print(O)</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleDownloadPDF(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Download size={14} className="me-1" /> PDF</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleExportProductXLSX(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><FileSpreadsheet size={14} className="me-1" /> XLSX</Button>
                        <LockDocumentButton 
                            documentType="ANNEXURE" 
                            documentId={inv.id} 
                            isLocked={inv.is_locked || inv.isLocked}
                            onLockSuccess={fetchInvoices} 
                            getSnapshotData={async () => {
                              const res = await api.get(`/export-invoice-annexures/${inv.id}`);
                              return res.data?.data || res.data;
                            }}
                          />
                        
                      {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => handleDelete(inv.id)}
                            disabled={inv.is_locked || inv.isLocked}
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
              No annexures found
            </div>
          )}
        </div>
      </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredInvoices.length} pageSize={PAGE_SIZE} />
      </Card>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="invoice-annexures"
      />



      {showPrintModal && printData && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <div className="no-print p-3 d-flex justify-content-between align-items-center bg-white border-bottom shadow-sm">
            <div className="d-flex align-items-center gap-3">
              <span className="fw-bold text-dark small text-uppercase">Print Format:</span>
              <div className="btn-group shadow-sm" role="group" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <button 
                  type="button" 
                  className={`btn btn-sm ${!isOfficePrint ? 'btn-primary fw-bold' : 'btn-outline-primary'}`} 
                  onClick={() => setIsOfficePrint(false)}
                >
                  Standard Copy
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${isOfficePrint ? 'btn-primary fw-bold' : 'btn-outline-primary'}`} 
                  onClick={() => setIsOfficePrint(true)}
                >
                  Office Copy (with Vehicle & Tare)
                </button>
              </div>
            </div>
            <div className="d-flex gap-2">
              <BsButton variant="success" size="sm" className="fw-bold d-flex align-items-center" onClick={async () => {
                showSuccess('Generating PDF...');
                const filename = generateEnterpriseFilename({
                  moduleName: isOfficePrint ? 'OFFICE-ANNEXURE' : 'ANNEXURE',
                  documentNo: printData?.annexure_no || 'ANX',
                  clientName: printData?.client_name || printData?.clientName || '',
                  date: printData?.invoice_date || printData?.invoiceDate || '',
                  extension: 'pdf'
                });
                await downloadPDF(printRef.current, filename);
                showSuccess('Download complete');
              }}>
                <Download size={14} className="me-1" /> Download PDF
              </BsButton>
              <BsButton variant="primary" size="sm" className="fw-bold d-flex align-items-center" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </BsButton>
              <BsButton variant="secondary" size="sm" onClick={() => setShowPrintModal(false)}>Close Preview</BsButton>
            </div>
          </div>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div className="d-flex justify-content-center p-4">
              <div ref={printRef}>
                <ExportInvoiceAnnexurePrintView data={printData} isOfficePrint={isOfficePrint} />
              </div>
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={printData?.id} />
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
        .annexure-mobile-card {
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
    </>
  );
}

export default ExportInvoiceAnnexureDashboard;

