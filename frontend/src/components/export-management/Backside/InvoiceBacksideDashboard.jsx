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
import ReactDOM from 'react-dom/client';
import { Row, Col, Card, Table, Badge, Spinner, Form, InputGroup, Modal, ListGroup } from 'react-bootstrap';
import Button from '../../shared/Button.jsx';
import { Power, Eye, Edit, FileText, Printer, Search, FileCheck, Plus, Trash2, Calendar, RefreshCcw, Download, Upload, X, RotateCcw, FileSpreadsheet, Check } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import ImportModal from '../../shared/ImportModal.jsx';
import FilterPanel from '../../shared/FilterPanel.jsx';
import api from '../../../services/api';
import { downloadPDF } from '../../../utils/pdfGenerator.js';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import PaginationControls from '../../common/PaginationControls.jsx';
import InvoiceBacksidePrintView from './InvoiceBacksidePrintView.jsx';
import { formatDisplayDate } from '../../../utils/formatters.js';
import { useMultiSelect } from '../../../hooks/useMultiSelect.js';
import DateRangeFilter, { filterByDateRange } from '../../common/DateRangeFilter.jsx';
import StatusBadge from '../../common/StatusBadge';
import ActivityTimeline from '../../shared/ActivityTimeline.jsx';
import { exportData, createColumnDef } from '../../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../../utils/productExportUtils.js';
function InvoiceBacksideDashboard({ currentUser, onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewBackside, setViewBackside] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, variant: 'danger' });
  const printRef = useRef(null);
  const multiSelect = useMultiSelect(invoices);
  const PAGE_SIZE = 25;

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        (inv.backside_no || inv.invoice_no || '').toLowerCase().includes(term) ||
        (inv.export_invoice_no || inv.ei_invoice_no || '').toLowerCase().includes(term) ||
        (inv.annexure_invoice_no || '').toLowerCase().includes(term) ||
        (inv.client_name || '').toLowerCase().includes(term)
      );
    }

    // Apply Date Range Filter
    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "invoice_date");

    return filtered;
  }, [invoices, searchTerm, dateRange]);

  const dashboardStats = useMemo(() => ({
    total: invoices.length,
    ready: invoices.filter(i => i.status === 'Approved' || i.status === 'Finalized').length,
    pending: invoices.filter(i => i.status !== 'Approved' && i.status !== 'Finalized').length
  }), [invoices]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/invoice-backsides', {
        params: { limit: 1000 }
      });

      const payload = response.data?.data;
      const data = payload?.data || payload || [];
      const normalizedData = data.map(inv => normalizeBackside(inv));

      setInvoices(normalizedData);
    } catch (error) {
      showError('Failed to load invoice backsides');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id) => {
    try {
      const response = await api.patch(`/invoice-backsides/${id}/toggle-status`);
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
              resource: 'invoice_backside',
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
          resource: 'invoice_backside',
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

  const handleExportProductXLSX = async (inv) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const response = await api.get(`/invoice-backsides/${inv.id}`);
      const invData = response.data?.data || inv;
      await exportProductDetailsToXLSX(normalizeBackside(invData), 'Invoice Backside');
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const handleExportData = () => {
    try {
      if (filteredInvoices.length === 0) { showError('No backsides to export'); return; }

      const columns = [
        createColumnDef('Backside No', (inv) => inv.backside_no || inv.invoice_no || ''),
        createColumnDef('Annexure No', (inv) => inv.annexure_invoice_no || ''),
        createColumnDef('Export Inv No', (inv) => inv.export_invoice_no || inv.ei_invoice_no || ''),
        createColumnDef('Date', (inv) => formatDisplayDate(inv.invoice_date)),
        createColumnDef('Client', (inv) => inv.client_name || ''),
        createColumnDef('Status', (inv) => inv.status || 'Draft')
      ];

      exportData(filteredInvoices, columns, 'xlsx', 'invoice-backsides');
      showSuccess('Backsides exported successfully!');
    } catch (err) {
      showError('Failed to export: ' + err.message);
    }
  };

  const handleImportData = async (importedBacksides) => {
    try {
      for (const backData of importedBacksides) {
        await api.post('/invoice-backsides', {
          invoice_no: backData.invoiceNo,
          annexure_no: backData.annexureNo,
          status: backData.status || 'Draft',
          invoice_date: backData.invoiceDate || new Date().toISOString(),
        });
      }
      showSuccess(`Successfully imported ${importedBacksides.length} backsides!`);
      fetchInvoices();
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import backsides: ' + err.message);
    }
  };

  const normalizeBackside = (inv) => {
    if (!inv) return null;
    
    // Parse container details safely, prioritizing inherited data if direct data is missing/empty
    const getContainers = () => {
      const direct = inv.container_details || inv.containerDetails;
      const inherited = inv.inherited_container_details || inv.inheritedContainerDetails || inv.annexure_container_details;
      
      let raw = direct;
      // If direct is missing or is an empty array/string, try inherited
      if (!raw || (Array.isArray(raw) && raw.length === 0) || (typeof raw === 'string' && (raw === '[]' || raw === ''))) {
        raw = inherited;
      }
      
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      try { return JSON.parse(raw); } catch (e) { return []; }
    };

    return {
      ...inv,
      id: inv.id,
      export_invoice_id: inv.exportInvoiceId || inv.export_invoice_id,
      backside_no: inv.backsideNo || inv.backside_no || inv.invoiceNo || inv.invoice_no,
      invoice_no: inv.invoiceNo || inv.invoice_no,
      export_invoice_no: inv.exportInvoiceNo || inv.export_invoice_no || inv.eiInvoiceNo || inv.ei_invoice_no,
      ei_invoice_no: inv.eiInvoiceNo || inv.ei_invoice_no,
      annexure_invoice_no: inv.annexureNo || inv.annexure_no || inv.annexure_invoice_no,
      invoice_date: inv.invoiceDate || inv.invoice_date,
      ei_invoice_date: inv.eiInvoiceDate || inv.ei_invoice_date,
      client_name: inv.clientName || inv.client_name,
      status: inv.status,
      shipping_bill_no: inv.shippingBillNo || inv.shipping_bill_no,
      shipping_bill_date: inv.shippingBillDate || inv.shipping_bill_date,
      vessel_name: inv.vesselName || inv.vessel_name,
      port_of_loading: inv.portOfLoading || inv.port_of_loading,
      port_of_discharge: inv.portOfDischarge || inv.port_of_discharge,
      final_destination: inv.finalDestination || inv.final_destination,
      lut_arn_no: inv.lutArnNo || inv.lut_arn_no,
      permission_no: inv.permissionNo || inv.permission_no,
      container_details: getContainers()
    };
  };

  const handleEdit = (inv) => {
    onNavigate('invoice-backside-form', {
      exportInvoiceId: inv.export_invoice_id,
      backsideId: inv.id
    });
  };

  const handleView = async (inv) => {
    try {
      setLoading(true);
      const response = await api.get(`/invoice-backsides/${inv.id}`);
      const data = response.data?.data || inv;
      setPrintData(normalizeBackside(data));
      setShowPrintModal(true);
    } catch {
      setPrintData(inv);
      setShowPrintModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (inv) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this invoice backside? All container mappings and specific notes will be lost.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/invoice-backsides/${inv.id}`);
          showSuccess('Deleted successfully');
          fetchInvoices();
        } catch (error) {
          showError('Failed to delete');
        } finally {
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDownloadPDF = async (inv) => {
    try { await api.post('/document-activity/doc/' + (inv?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      const response = await api.get(`/invoice-backsides/${inv.id}`);
      const data = response.data?.data || inv;
      setPrintData(normalizeBackside(data));
      setShowPrintModal(true);
      const backsideNo = data.backside_no || data.invoice_no || 'Backside';
      setTimeout(async () => {
        if (printRef.current) {
          showSuccess('Generating PDF...');
          const filename = generateEnterpriseFilename({
              moduleName: 'INVOICE-BACKSIDE',
              documentNo: backsideNo,
              clientName: inv?.client_name || inv?.clientName || '',
              date: inv?.invoice_date || inv?.invoiceDate || '',
              extension: 'pdf'
            });
          const result = await downloadPDF(printRef.current, filename);
          if (!result?.success) showError('Failed to generate PDF');
        } else {
          showError('Print view not ready, please try again');
        }
        setShowPrintModal(false);
      }, 800);
    } catch {
      showError('Failed to prepare PDF');
    }
  };

  const handlePrint = async (inv) => {
    try { await api.post('/document-activity/doc/' + (inv?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    try {
      setLoading(true);
      const response = await api.get(`/invoice-backsides/${inv.id}`);
      const data = response.data?.data || inv;
      setPrintData(normalizeBackside(data));
      setShowPrintModal(true);
      // Wait for modal to fully render before triggering print
      setTimeout(() => {
        window.print();
      }, 600);
    } catch {
      setPrintData(normalizeBackside(inv));
      setShowPrintModal(true);
      setTimeout(() => {
        window.print();
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  
  const canEdit = currentUser && ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Invoice Backside Management</h2>
          <p className="text-muted small">GST/Customs Annexure for export invoices</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileText size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total</p>
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
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Calendar size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pending</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.pending}</h5>
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
                <Form.Label className="fw-bold small text-muted text-uppercase">Search Backsides</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search backside no, client..."
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

      {/* Backside Records List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4">
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Backside Details ({filteredInvoices.length})</h5>
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
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => onNavigate('invoice-backside-form', { isNew: true })} style={{ width: 'auto' }}>
              <Plus size={16} className="me-1" />
              <span className="d-none d-sm-inline small">Create Backside</span>
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
                  <th>Backside No</th>
                  <th>Export Inv No</th>
                  <th>Annexure No.</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-5 text-muted">No backsides found</td></tr>
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
                              module="InvoiceBackside" 
                              endpoint="invoice-backsides" 
                              documentId={inv.id} 
                              value={(inv.is_locked || inv.isLocked) ? 'Locked' : (inv.status || 'Draft')} 
                              disabled={!canEdit || inv.is_locked || inv.isLocked} 
                              onSuccess={fetchInvoices} 
                            />
                    </td>
                    <td className="fw-semibold text-primary">{inv.backside_no || inv.invoice_no || '-'}</td>
                    <td className="text-muted small">{inv.export_invoice_no || inv.ei_invoice_no || '-'}</td>
                    <td>{inv.annexure_invoice_no || '-'}</td>
                    <td>{formatDate(inv.invoice_date || inv.ei_invoice_date)}</td>
                    <td>{inv.client_name || '-'}</td>
                    <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                            
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => onNavigate('invoice-backside-form', { backsideId: inv.id })}
                                title="Edit"
                                disabled={inv.is_locked || inv.isLocked}
                              >
                                <Edit size={14} />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleView(inv)} title="View Details"><Eye size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handlePrint(inv)} title="Print Document"><Printer size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleDownloadPDF(inv)} title="Download PDF"><Download size={14} /></Button>
                            <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleExportProductXLSX(inv)} title="Download XLSX"><FileSpreadsheet size={14} /></Button>
                            <LockDocumentButton 
                              documentType="INVOICE_BACKSIDE" 
                              documentId={inv.id} 
                              isLocked={inv.is_locked || inv.isLocked}
                              onLockSuccess={fetchInvoices} 
                              getSnapshotData={async () => {
                                const res = await api.get(`/invoice-backsides/${inv.id}`);
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
                <Card key={inv.id} className="mb-3 border-0 shadow-sm backside-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{inv.backside_no || inv.invoice_no || '-'}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDate(inv.invoice_date || inv.ei_invoice_date)}</div>
                      </div>
                      <div className="status-container">
                        <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${inv.status === 'Finalized' ? 'success' :
                            inv.status === 'Draft' ? 'secondary' : 'warning'
                          }`}>
                          {inv.status || 'Draft'}
                        </div>
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                          <div className="text-dark fw-bold">{inv.client_name || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">EXP No:</label>
                          <div className="text-dark">{inv.export_invoice_no || inv.ei_invoice_no || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Annexure No:</label>
                          <div className="text-dark">{inv.annexure_invoice_no || '-'}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                        
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => onNavigate('invoice-backside-form', { backsideId: inv.id })}
                            disabled={inv.is_locked || inv.isLocked}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Edit size={14} className="me-1" /> Edit
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleView(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Eye size={14} className="me-1" /> View</Button>
                        <Button variant="outline" size="sm" className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handlePrint(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Printer size={14} className="me-1" /> Print</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleDownloadPDF(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Download size={14} className="me-1" /> PDF</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleExportProductXLSX(inv)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><FileSpreadsheet size={14} className="me-1" /> XLSX</Button>
                        <LockDocumentButton 
                            documentType="INVOICE_BACKSIDE" 
                            documentId={inv.id} 
                            isLocked={inv.is_locked || inv.isLocked}
                            onLockSuccess={fetchInvoices} 
                            getSnapshotData={async () => {
                              const res = await api.get(`/invoice-backsides/${inv.id}`);
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
                No backside records found
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
        moduleType="invoice-backsides"
      />

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
                <InvoiceBacksidePrintView data={printData} />
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
        .backside-mobile-card {
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

export default InvoiceBacksideDashboard;

