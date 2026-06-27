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
import { Button as BsButton, Row, Col, Card, Table, Form, Badge, Spinner, Modal, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Button from '../../shared/Button.jsx';
import '../../shared/DashboardButtons.css';
import { Power, BarChart3, Plus, Edit, Trash2, Eye, FileText, Printer, Search, FileInput, ClipboardList, FileCheck, Package, Download, Upload, Filter, Calendar, RefreshCcw, RotateCcw, Truck, Clock, FileSpreadsheet, Check } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import ImportModal from '../../shared/ImportModal.jsx';
import api from '../../../services/api';
import ExportInvoiceForm from './ExportInvoiceForm.jsx';
import ExportInvoicePrintView from './ExportInvoicePrintView.jsx';
import ExportInvoiceAnnexureForm from '../Annexure/ExportInvoiceAnnexureForm.jsx';
import FilterPanel from '../../shared/FilterPanel.jsx';
import InvoiceBacksideForm from '../Backside/InvoiceBacksideForm.jsx';
import PackingListForm from '../PackingList/PackingListForm.jsx';
import PackingListPrintView from '../PackingList/PackingListPrintView.jsx';
import { downloadPDF } from '../../../utils/pdfGenerator.js';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import { formatDisplayDate } from '../../../utils/formatters.js';
import { useMultiSelect } from '../../../hooks/useMultiSelect.js';
import { useMasterData } from '../../../hooks/useMasterData.js';
import StatusBadge from '../../common/StatusBadge';
import ActivityTimeline from '../../shared/ActivityTimeline.jsx';
import PaginationControls from '../../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../../common/DateRangeFilter.jsx';
import { transformSnakeToCamelKeys } from '../../../utils/helpers';
import { exportData, createColumnDef } from '../../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../../utils/productExportUtils.js';
import VirtualizedTable from '../../shared/VirtualizedTable.jsx';
import { Lock } from 'lucide-react';

function ExportInvoiceDashboard({ currentUser, onCreate, onNavigate, navigationData }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const printRef = useRef(null);
  const fileInputRef = useRef(null);
  const masterData = useMasterData();

  const dashboardStats = useMemo(() => ({
    total: invoices.length,
    converted: invoices.filter(i => i.status === 'Approved').length,
    dispatched: invoices.filter(i => i.status === 'Dispatched').length,
    draft: invoices.filter(i => i.status === 'Draft' || !i.status).length,
    completed: invoices.filter(i => ['Completed', 'Finalized', 'Confirmed'].includes(i.status)).length,
    totalPallets: invoices.reduce((sum, i) => sum + (parseInt(i.pallets) || 0), 0),
    totalValue: invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0)
  }), [invoices]);

  const formatStatValue = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const multiSelect = useMultiSelect(invoices);

  const handleExportData = () => {
    try {
      if (filteredInvoices.length === 0) {
        showError('No invoices to export');
        return;
      }

      const columns = [
        createColumnDef('EXP No', 'exp_no'),
        createColumnDef('PI No', 'pi_no'),
        createColumnDef('Date', (item) => formatDisplayDate(item.invoice_date)),
        createColumnDef('Client', 'client_name'),
        createColumnDef('LC Number', 'lc_number'),
        createColumnDef('LC Date', (item) => formatDisplayDate(item.lc_date)),
        createColumnDef('EPCG No', 'epcg_no'),
        createColumnDef('Amount', 'total_amount'),
        createColumnDef('Status', 'status'),
        createColumnDef('Dispatch Date', (item) => formatDisplayDate(item.dispatch_date)),
      ];

      exportData(filteredInvoices, columns, 'xlsx', 'export-invoices');
      showSuccess('Export invoices exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      showError('Failed to export invoices: ' + err.message);
    }
  };

  const handleExportProductXLSX = async (invoice) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const response = await api.get(`/export-invoices/${invoice.id}`);
      const invoiceData = response.data?.data || invoice;
      const searchVal = String(invoiceData?.boxType || invoiceData?.box_type || '').trim().toLowerCase();
      const matched = masterData?.boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
      const imageUrl = matched?.image_url || matched?.imageUrl;
      await exportProductDetailsToXLSX(invoiceData, 'Export Invoice', imageUrl);
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const handleImportData = async (importedInvoices) => {
    try {
      for (const invData of importedInvoices) {
        await api.post('/export-invoices', {
          invoice_no: invData.invoiceNo,
          proforma_invoice_no: invData.piNo,
          client_name: invData.clientName,
          total_amount: invData.amount,
          status: invData.status || 'Draft',
          invoice_date: invData.invoiceDate || new Date().toISOString(),
        });
      }
      showSuccess(`Successfully imported ${importedInvoices.length} invoices!`);
      fetchInvoices();
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import invoices: ' + err.message);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setMonthFilter('');
    setDateFrom('');
    setCurrentPage(1);
  };

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
    { value: '12', label: 'December' }
  ];

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  useEffect(() => {
    fetchInvoices();

    const onChanged = () => fetchInvoices();
    window.addEventListener('exportInvoice:changed', onChanged);
    return () => window.removeEventListener('exportInvoice:changed', onChanged);
  }, []);

  // Deep-link effect: handle navigation from search results
  useEffect(() => {
    if (!navigationData?.id || invoices.length === 0) return;

    const invoice = invoices.find(i => i.id === navigationData.id);
    if (!invoice) return;

    // Based on the search result type, route to the specific form
    if (navigationData.type === 'Packing List') {
      onNavigate('packing-list-form', { exportInvoiceId: invoice.id });
    } else if (navigationData.type === 'Annexure') {
      onNavigate('export-invoice-annexure-form', { exportInvoiceId: invoice.id });
    } else if (navigationData.type === 'VGM') {
      onNavigate('vgm-form', { exportInvoiceId: invoice.id });
    } else if (navigationData.type === 'Shipping Instruction') {
      onNavigate('shipping-instructions-form', { exportInvoiceId: invoice.id });
    } else {
      // Default: Edit invoice
      onNavigate('export-invoice-form', { invoiceId: invoice.id });
    }
  }, [navigationData, invoices, onNavigate]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/export-invoices');


      const dataRoot = response?.data?.data || response?.data;
      let raw = [];
      if (Array.isArray(dataRoot)) raw = dataRoot;
      else if (dataRoot && Array.isArray(dataRoot.items)) raw = dataRoot.items;
      else if (dataRoot && Array.isArray(dataRoot.data)) raw = dataRoot.data;

      const normalized = (raw || []).map(inv => {
        const totalRaw = inv.total_amount ?? inv.totalAmount ?? inv.total_price ?? inv.total ?? 0;
        return {
          id: inv.id ?? inv._id ?? inv.invoice_id ?? inv.export_invoice_id,
          invoice_no: inv.invoice_no ?? inv.invoiceNo ?? inv.invoice_number ?? inv.export_no ?? inv.number ?? '',
          invoice_date: inv.invoice_date ?? inv.date ?? inv.created_at ?? inv.createdAt ?? '',
          client_name: inv.client_name ?? inv.clientName ?? (inv.client && (inv.client.name || inv.client.companyName || inv.client.company_name)) ?? inv.buyer_name ?? '',
          proforma_invoice_no: inv.proforma_invoice_no ?? inv.proformaInvoiceNo ?? inv.proforma_no ?? inv.pi_no ?? '',
          total_amount: parseFloat(totalRaw) || 0,
          pallets: parseInt(inv.pallets) || 0,
          status: inv.status ?? inv.invoice_status ?? inv.state ?? 'Draft',
          // New status flags from optimized backend
          hasAnnexure: inv.has_annexure || inv.hasAnnexure,
          hasSI: inv.has_si,
          hasVGM: inv.has_vgm,
          hasPL: inv.has_pl,
          hasBackside: inv.has_backside,
          is_locked: inv.is_locked,
          locked_by_name: inv.locked_by_name || 'Admin',
          locked_at: inv.locked_at,
          raw: inv
        };
      });

      setInvoices(normalized);
    } catch (error) {
      console.error('Error fetching export invoices:', error);
      showError('Failed to load export invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id) => {
    try {
      const response = await api.patch(`/export-invoices/${id}/toggle-status`);
      if (response.data.success) {
        showSuccess(response.data.message || 'Status updated successfully');
        fetchInvoices();
      }
    } catch (err) {
      showError('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkAction = async (action, value) => {
    if (multiSelect.selectedIds.length === 0) {
      showError('No records selected');
      return;
    }

    if (action === 'delete') {
      setConfirmConfig({
        title: 'Confirm Bulk Delete',
        message: `Are you sure you want to delete ${multiSelect.selectedIds.length} export invoices and all their related documents?`,
        variant: 'danger',
        onConfirm: async () => {
          try {
            await api.post('/bulk/delete', {
              resource: 'export-invoices',
              ids: multiSelect.selectedIds
            });
            showSuccess('Bulk deletion completed successfully');
            multiSelect.clearSelection();
            fetchInvoices();
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
          resource: 'export-invoices',
          ids: multiSelect.selectedIds,
          data: { status: value }
        });
        showSuccess('Bulk status update completed');
        multiSelect.clearSelection();
        fetchInvoices();
      } catch (err) {
        showError('Bulk update failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleDelete = (id) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this export invoice and all its linked documents (Packing List, Annexure, VGM, Shipping Instructions, etc.)?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/export-invoices/${id}?force=true`);
          showSuccess('Export invoice deleted successfully');
          fetchInvoices();
        } catch (error) {
          console.error('Error deleting export invoice:', error);
          showError('Failed to delete export invoice.');
        } finally {
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const normalizeInvoiceData = (data) => {
    if (!data) return null;
    // Standardized product lines normalization
    let productLinesRaw = data.product_lines || data.productLines || [];
    if (typeof productLinesRaw === 'string') {
      try { productLinesRaw = JSON.parse(productLinesRaw); } catch (e) { productLinesRaw = []; }
    }

    return {
      ...data,
      product_lines: (Array.isArray(productLinesRaw) ? productLinesRaw : []).map(line => {
        const camelLine = transformSnakeToCamelKeys(line);
        return {
          ...camelLine,
          productName: camelLine.productName || camelLine.product || camelLine.name || 'Unknown',
          description: camelLine.description || camelLine.productDescription || camelLine.materialDescription || [camelLine.size, camelLine.surface].filter(Boolean).join(' ') || '',
          totalBoxes: parseInt(camelLine.totalBoxes || 0, 10),
          sqmAuto: parseFloat(camelLine.sqmAuto || 0),
          rate: parseFloat(camelLine.rate || 0),
          amount: parseFloat(camelLine.amount || 0)
        };
      })
    };
  };

  const handleView = async (invoiceOrId) => {
    try {
      const id = typeof invoiceOrId === 'object' ? invoiceOrId.id : invoiceOrId;
      const response = await api.get(`/export-invoices/${id}`);
      const normalized = normalizeInvoiceData(response.data?.data);

      setSelectedInvoice(normalized);
      setShowPrintView(true);
      return normalized;
    } catch (error) {
      showError('Failed to load invoice details');
      return null;
    }
  };

  const handlePrint = async (invoice) => {
    try { await api.post('/document-activity/doc/' + (invoice?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    const data = await handleView(invoice);
    if (!data) return;

    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintView(false);
      }
    }, 500);
  };

  const handleDownloadPDF = async (invoice) => {
    try { await api.post('/document-activity/doc/' + (invoice?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      const data = await handleView(invoice);
      if (!data) return;

      setTimeout(async () => {
        if (printRef.current) {
          showSuccess('Generating PDF...');
          const filename = generateEnterpriseFilename({
            moduleName: 'EXPORT-INVOICE',
            documentNo: data?.invoice_no || data?.invoiceNo || 'EXP',
            clientName: data?.client_name || data?.clientName || '',
            date: data?.invoice_date || data?.invoiceDate || '',
            extension: 'pdf'
          });
          const result = await downloadPDF(printRef.current, filename);
          if (!result?.success) showError('Failed to generate PDF');
        }
        setShowPrintView(false);
      }, 800);
    } catch (error) {
      showError('Failed to generate PDF');
    }
  };

  const dateFilteredInvoices = filterByDateRange(invoices, dateRange.start, dateRange.end, "invoice_date");
  const filteredInvoices = dateFilteredInvoices.filter(inv => {
    const matchesSearch = !searchTerm || inv.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    let matchesMonth = true;
    if (monthFilter) {
      const invoiceDate = inv.invoice_date || inv.date;
      if (invoiceDate) matchesMonth = (new Date(invoiceDate).getMonth() + 1).toString().padStart(2, '0') === monthFilter;
      else matchesMonth = false;
    }
    let matchesDate = true;
    if (dateFrom) {
      const invoiceDate = inv.invoice_date || inv.date;
      if (invoiceDate) matchesDate = new Date(invoiceDate) >= new Date(dateFrom);
      else matchesDate = false;
    }
    return matchesSearch && matchesStatus && matchesMonth && matchesDate;
  });


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, monthFilter, dateFrom, dateRange]);
  const canManageExportInvoice =
    ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role) ||
    currentUser?.permissions?.includes('all') ||
    currentUser?.permissions?.includes('export_invoice') ||
    currentUser?.permissions?.includes('logistics');

  if (!canManageExportInvoice) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Export Invoice Management.</p>
      </div>
    );
  }

  
  const canEdit = currentUser && ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns = [
    {
      key: 'select', label: (
        <Form.Check
          type="checkbox"
          checked={multiSelect.selectAll}
          onChange={() => multiSelect.toggleSelectAll(filteredInvoices)}
        />
      ),
      width: '40px', sortable: false,
      render: (_, invoice) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Form.Check
            type="checkbox"
            checked={multiSelect.isSelected(invoice.id)}
            onChange={() => multiSelect.toggleSelect(invoice.id)}
          />
        </div>
      )
    },
    { key: 'index', label: 'SR. NO.', width: '80px', sortable: false, render: (_, __, index) => <div className="text-center">{index + 1}</div> },
    { key: 'status', label: 'Status', width: '150px', render: (_, invoice) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DashboardStatusDropdown 
            module="ExportInvoice" 
            endpoint="export-invoices" 
            documentId={invoice.id} 
            value={(invoice.is_locked || invoice.isLocked) ? 'Locked' : (invoice.status || 'Draft')} 
            disabled={!canEdit || invoice.is_locked || invoice.isLocked} 
            onSuccess={fetchInvoices} 
          />
        </div>
      ) 
    },
    { key: 'invoice_no', label: 'EXP no.', width: '15%', render: (_, invoice) => (
        <div className="fw-semibold text-primary d-flex align-items-center gap-2">
          {invoice.invoice_no}
          {(invoice.is_locked || invoice.isLocked) && (
            <OverlayTrigger placement="top" overlay={<Tooltip><strong>Locked By:</strong> {invoice.locked_by_name}<br/><strong>Date:</strong> {invoice.locked_at ? new Date(invoice.locked_at).toLocaleDateString() : 'N/A'}</Tooltip>}>
              <Badge bg="danger" className="d-flex align-items-center" style={{ fontSize: '0.65rem' }}>
                <Lock size={10} className="me-1" /> LOCKED
              </Badge>
            </OverlayTrigger>
          )}
        </div>
      )
    },
    { key: 'proforma_invoice_no', label: 'PI no.', width: '12%', render: (val) => val || '-' },
    { key: 'invoice_date', label: 'Date', width: '10%', render: (val) => formatDate(val) },
    { key: 'client_name', label: 'Client', width: '15%', render: (val) => val || '-' },
    { key: 'total_amount', label: 'Amount', width: '10%', render: (val) => <div className="fw-bold">${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div> },
    { key: 'actions', label: 'Actions', width: '220px', sortable: false, render: (_, invoice) => (
        <div className="d-flex justify-content-end gap-1" onClick={(e) => e.stopPropagation()}>
           {canEdit && (
              <BsButton variant="outline-primary" size="sm" className="border-primary-subtle p-2" onClick={() => onNavigate('export-invoice-form', { invoiceId: invoice.id })} title="Edit" disabled={invoice.is_locked || invoice.isLocked}>
                <Edit size={14} />
              </BsButton>
            )}
            <BsButton variant="outline-info" size="sm" className="border-info-subtle p-2" onClick={() => handleView(invoice)} title="View Details"><Eye size={14} /></BsButton>
            <BsButton variant="outline-primary" size="sm" className="border-primary-subtle p-2" onClick={() => handlePrint(invoice)} title="Print Document"><Printer size={14} /></BsButton>
            <BsButton variant="outline-success" size="sm" className="border-success-subtle p-2" onClick={() => handleDownloadPDF(invoice)} title="Download PDF"><Download size={14} /></BsButton>
            <BsButton variant="outline-success" size="sm" className="border-success-subtle p-2" onClick={() => handleExportProductXLSX(invoice)} title="Download XLSX"><FileSpreadsheet size={14} /></BsButton>
            <LockDocumentButton documentType="EXPORT_INVOICE" documentId={invoice.id} isLocked={invoice.is_locked || invoice.isLocked} onLockSuccess={fetchInvoices} getSnapshotData={async () => { const res = await api.get(`/export-invoices/${invoice.id}`); return res.data?.data || res.data; }} />
            {canDelete && (
              <BsButton variant="outline-danger" size="sm" className="border-danger-subtle p-2" onClick={() => handleDelete(invoice.id)} title="Delete" disabled={invoice.is_locked || invoice.isLocked}>
                <Trash2 size={14} />
              </BsButton>
            )}
        </div>
      )
    }
  ];

  return (
    <>
      <style>
        {`
          .pointer-on-hover { cursor: pointer; transition: all 0.2s ease-in-out; }
          .pointer-on-hover:hover { transform: scale(1.05); filter: brightness(0.95); }
          .bg-primary-light { background-color: rgba(13, 110, 253, 0.1); }
          .bg-success-light { background-color: rgba(25, 135, 84, 0.1); }
          .bg-info-light { background-color: rgba(13, 202, 240, 0.1); }
          .bg-warning-light { background-color: rgba(255, 193, 7, 0.1); }
          .bg-secondary-light { background-color: rgba(108, 117, 125, 0.1); }
          .bg-dark-light { background-color: rgba(33, 37, 41, 0.1); }
        `}
      </style>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Export Invoice Management</h2>
          <p className="text-muted">Manage export invoices generated from approved Proforma Invoices</p>
        </Col>
      </Row>

      {/* Dashboard Widgets */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <FileText size={18} className="text-primary" />
              </div>
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
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <FileCheck size={18} className="text-success" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Approved</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.converted}</h5>
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
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.draft}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-secondary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Package size={18} className="text-secondary" />
              </div>
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
              <div className="icon-box bg-dark-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <FileText size={18} className="text-dark" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Value</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{formatStatValue(dashboardStats.totalValue)}</h5>
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
            <Col lg={6} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Search Invoices</Form.Label>
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
            <Col lg={6} md={6} sm={12}>
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
                  <option value="Dispatched">Dispatched</option>
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

      {/* Bulk Actions Bar */}
      {multiSelect.selectedIds.length > 0 && (
        <Card className="mb-4 border-primary bg-primary-light animate__animated animate__fadeIn">
          <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <Badge bg="primary" className="rounded-pill p-2 px-3 fs-6">
                {multiSelect.selectedIds.length} Selected
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
                <option value="Dispatched">Dispatched</option>
                <option value="Finalized">Finalized</option>
                <option value="Rejected">Rejected</option>
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

      {/* Export Invoices List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4">
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Export Invoices ({filteredInvoices.length})</h5>
          <div className="d-flex gap-2 flex-wrap align-items-center justify-content-end">
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
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => onNavigate('export-invoice-form')} style={{ width: 'auto' }}>
              <Plus className="me-1" size={14} />
              <span className="d-none d-sm-inline small">Create Export Invoice</span>
              <span className="d-sm-none small">Create</span>
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Desktop Table View */}
          <div className="d-none d-lg-block">
            {loading ? (
              <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
              <VirtualizedTable
                data={filteredInvoices}
                columns={columns}
                height={600}
                rowHeight={60}
              />
            )}
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedInvoices.length > 0 ? (
              paginatedInvoices.map((invoice, index) => (
                <Card key={invoice.id} className="mb-3 border-0 shadow-sm invoice-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h5 className="fw-bold mb-1 text-dark">{invoice.invoice_no}</h5>
                          {(invoice.is_locked || invoice.isLocked) && (
                            <Badge bg="danger" className="d-flex align-items-center" style={{ fontSize: '0.65rem' }}>
                              <Lock size={10} className="me-1" /> LOCKED
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDate(invoice.invoice_date)}</div>
                      </div>
                      <div className="status-container">
                        <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${invoice.status === 'Finalized' || invoice.status === 'Dispatched' ? 'success' :
                            invoice.status === 'Draft' ? 'warning' : 'secondary'
                          }`}>
                          {invoice.status || 'Draft'}
                        </div>
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
                          <label className="text-muted small fw-bold mb-1 d-block">PI No:</label>
                          <div className="text-dark">{invoice.proforma_invoice_no || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Amount:</label>
                          <div className="text-primary fw-bold">${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                        
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => onNavigate('export-invoice-form', { invoiceId: invoice.id })}
                            disabled={invoice.is_locked || invoice.isLocked}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Edit size={14} className="me-1" /> Edit
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleView(invoice)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Eye size={14} className="me-1" /> View</Button>
                        <Button variant="outline" size="sm" className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handlePrint(invoice)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Printer size={14} className="me-1" /> Print</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleDownloadPDF(invoice)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><Download size={14} className="me-1" /> PDF</Button>
                        <Button variant="outline" size="sm" className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold" onClick={() => handleExportProductXLSX(invoice)} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}><FileSpreadsheet size={14} className="me-1" /> XLSX</Button>
                        <LockDocumentButton 
                            documentType="EXPORT_INVOICE" 
                            documentId={invoice.id} 
                            isLocked={invoice.is_locked || invoice.isLocked}
                            onLockSuccess={fetchInvoices} 
                            getSnapshotData={async () => {
                              const res = await api.get(`/export-invoices/${invoice.id}`);
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
                No invoices found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredInvoices.length} pageSize={PAGE_SIZE} />
      </Card>


      {showPrintView && selectedInvoice && (
        <Modal show={showPrintView} onHide={() => setShowPrintView(false)} fullscreen>
          <Modal.Body className="p-0 bg-light">
            <div className="no-print p-3 d-flex justify-content-end bg-white border-bottom">
              <Button variant="secondary" size="sm" onClick={() => setShowPrintView(false)}>Close Preview</Button>
            </div>
            <div className="d-flex flex-column flex-md-row">
              <div className="flex-grow-1 overflow-auto bg-light">
                <div ref={printRef}>
                  <ExportInvoicePrintView 
                    invoiceData={selectedInvoice} 
                    boxTypeImageUrl={(() => {
                      const searchVal = String(selectedInvoice?.boxType || selectedInvoice?.box_type || '').trim().toLowerCase();
                      const matched = masterData?.boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
                      return matched?.image_url || matched?.imageUrl;
                    })()}
                  />
                </div>
              </div>
              <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
                <ActivityTimeline resourceType="export_invoice" resourceId={selectedInvoice.id} />
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="export-invoices"
      />

      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
        variant={confirmConfig.variant}
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
      `}</style>
    </>
  );
}

export default ExportInvoiceDashboard;





