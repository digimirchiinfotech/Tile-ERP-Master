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

import { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Dropdown, Alert, Spinner, Form, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import '../shared/DashboardButtons.css';
import {
  Plus,
  FileText,
  Download,
  Eye,
  Edit,
  Printer,
  Upload,
  Link,
  BarChart3,
  Trash2,
  Power,
  Send,
  CheckCircle,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import bulkDeleteService from '../../services/bulkDeleteService.js';
import bulkActionService from '../../services/bulkActionService.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import FilterSection from '../shared/FilterSection.jsx';
import InvoicePrintView from './InvoicePrintView.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import WorkflowTracker from '../shared/WorkflowTracker.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { useInvoices } from '../../hooks/useInvoices';
import { useProducts } from '../../hooks/useProducts';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { downloadPDF, previewPDF } from '../../utils/pdfGenerator.js';
import { workflowConnections } from '../../utils/helpers.jsx';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { formatPrice, formatDisplayDate, formatSQM } from '../../utils/formatters.js';
import api from '../../services/api';
import { invoiceService } from '../../services/invoiceService';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { exportProductDetailsToXLSX } from '../../utils/productExportUtils.js';
import { generateEnterpriseFilename } from '../../utils/fileNamingUtils.js';
import StatusBadge from '../common/StatusBadge';
import DashboardStatusDropdown from '../shared/DashboardStatusDropdown.jsx';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import LockDocumentButton from '../shared/LockDocumentButton.jsx';
import masterDataService from '../../services/masterDataService.js';


function InvoiceDashboard({ onAddNew, onEdit, invoicesData, productsData, clientsData, currentUser }) {
  // Use props if provided, otherwise call hooks
  const invoicesHook = useInvoices();
  const productsHook = useProducts();
  const { invoices, loading, error, fetchInvoices, createInvoice, updateInvoice, deleteInvoice, toggleInvoiceStatus } = invoicesData || invoicesHook;
  const { products } = productsData || productsHook;
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Multi-select hook
  const multiSelect = useMultiSelect(invoices);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [boxTypeObjects, setBoxTypeObjects] = useState([]);

  useEffect(() => {
    masterDataService.getAllBoxTypes()
      .then(data => {
        if (Array.isArray(data)) setBoxTypeObjects(data);
      })
      .catch(err => console.error('Failed to fetch box types for images:', err));
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      if (fetchInvoices) fetchInvoices();
    };

    window.addEventListener('invoice:changed', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('invoice:changed', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [fetchInvoices]);

  const [showPrintView, setShowPrintView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showWorkflowView, setShowWorkflowView] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [approvalModal, setApprovalModal] = useState({ show: false, invoice: null, action: '', remarks: '' });
  const [isApproving, setIsApproving] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    clientName: '',
    country: '',
    status: '',
    dateRange: { start: '', end: '' },
  });

  // Helper function to calculate totals from product_lines
  const calculateProductLineTotals = (invoice) => {
    if (!invoice) return { pallets: 0, sqm: 0, amount: 0 };

    let productLines = invoice.productLines || invoice.product_lines || [];

    // Parse if it's a string
    if (typeof productLines === 'string') {
      try {
        productLines = JSON.parse(productLines);
      } catch (e) {
        productLines = [];
      }
    }

    if (!Array.isArray(productLines) || productLines.length === 0) {
      return {
        pallets: invoice.pallets || 0,
        sqm: invoice.totalSqm || invoice.total_sqm || 0,
        amount: invoice.totalAmount || invoice.total_amount || 0
      };
    }

    // Calculate from product lines
    let totalPallets = 0;
    let totalSqm = 0;
    let totalAmount = 0;

    productLines.forEach(line => {
      totalPallets += parseFloat(line.pallets || line.totalPallet || line.total_pallet) || 0;
      totalSqm += parseFloat(line.sqm || line.sqmAuto || line.totalSqm || line.total_sqm) || 0;
      totalAmount += parseFloat(line.amount || line.totalAmount || line.total_amount) || 0;
    });

    // Use calculated values if > 0, otherwise use stored values
    return {
      pallets: totalPallets > 0 ? totalPallets : (invoice.pallets || 0),
      sqm: totalSqm > 0 ? totalSqm : (invoice.totalSqm || invoice.total_sqm || 0),
      amount: totalAmount > 0 ? totalAmount : (invoice.totalAmount || invoice.total_amount || 0)
    };
  };

  const groupAndSequenceInvoices = (list) => {
    if (!Array.isArray(list) || list.length === 0) return [];
    
    // Group invoices by their base/original invoice number
    const groups = {};
    list.forEach(inv => {
      const baseNo = inv.originalInvoiceNo || inv.original_invoice_no || inv.invoiceNo || inv.invoice_no || '';
      if (!groups[baseNo]) {
        groups[baseNo] = [];
      }
      groups[baseNo].push(inv);
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

  useEffect(() => {
    // Ensure invoices is always an array
    let filtered = Array.isArray(invoices) ? invoices : [];

    if (filters.search) {
      filtered = filtered.filter(
        (invoice) =>
          (invoice.invoiceNo || invoice.invoice_no || '')
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          (invoice.clientName || invoice.client_name || '')
            .toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    if (filters.clientName) {
      filtered = filtered.filter((invoice) =>
        (invoice.clientName || invoice.client_name || '')
          .toLowerCase()
          .includes(filters.clientName.toLowerCase())
      );
    }

    if (filters.country) {
      filtered = filtered.filter(
        (invoice) => (invoice.country || '') === filters.country
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (invoice) => (invoice.status || '') === filters.status
      );
    }

    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "date");
    const groupedAndSorted = groupAndSequenceInvoices(filtered);
    setFilteredInvoices(groupedAndSorted);
    setCurrentPage(1);
  }, [filters, invoices, dateRange]);

  const nonRevisedInvoices = (invoices || []).filter(i => i.status !== 'Revised');
  const dashboardStats = {
    total: nonRevisedInvoices.length,
    approved: nonRevisedInvoices.filter(i => i.status === 'Approved').length,
    submitted: nonRevisedInvoices.filter(i => i.status === 'Submitted' || i.status === 'Pending').length,
    draft: nonRevisedInvoices.filter(i => i.status === 'Draft').length,
    totalAmount: nonRevisedInvoices.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount || inv.total_amount) || 0), 0)
  };

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      await bulkActionService.bulkDelete('invoices', multiSelect.getSelectedIds());
      multiSelect.clearSelection();
      await fetchInvoices();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const invoiceBulkActions = [
    { label: 'Mark as Approved', type: 'update', data: { status: 'Approved' }, icon: <CheckCircle size={14} />, requireConfirm: true },
    { label: 'Mark as Submitted', type: 'update', data: { status: 'Submitted' }, icon: <Send size={14} />, requireConfirm: true },
    { label: 'Mark as Draft', type: 'update', data: { status: 'Draft' }, variant: 'warning', icon: <FileText size={14} />, requireConfirm: true },
    { label: 'Lock Invoices', type: 'update', data: { status: 'Locked' }, variant: 'danger', icon: <Lock size={14} />, requireConfirm: true }
  ];

  const handleBulkAction = async (action) => {
    try {
      setIsSaving(true);
      const selectedIds = multiSelect.getSelectedIds();

      if (action.type === 'update') {
        await bulkActionService.bulkUpdate('invoices', selectedIds, action.data);
      } else if (action.type === 'export') {
        // Will be implemented in Phase 3
        await bulkActionService.bulkExport('invoices', selectedIds, action.format || 'pdf');
      }

      multiSelect.clearSelection();
      if (fetchInvoices) await fetchInvoices();
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState(null);


  const handleStatusChange = (invoiceId, newStatus) => {
    setStatusChangeData({ invoiceId, newStatus });
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = async () => {
    if (!statusChangeData) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.patch(`/proforma-invoices/${statusChangeData.invoiceId}/status`, {
        status: statusChangeData.newStatus
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update status');
      }
      if (fetchInvoices) await fetchInvoices();
    } catch (err) {
      showError('Failed to update status: ' + err.message);
    } finally {
      setShowStatusConfirm(false);
      setStatusChangeData(null);
    }
  };

  const getStatusActions = (invoice) => {
    const status = invoice.status || 'Draft';
    const buttons = [];
    if (status === 'Draft') {
      buttons.push(
        <Button key="submit" variant="outline-warning" size="sm" onClick={() => handleStatusChange(invoice.id, 'Submitted')} title="Submit">
          <Send size={14} />
        </Button>
      );
    }
    if (status === 'Pending') {
      buttons.push(
        <Button key="approve" variant="outline-success" size="sm" onClick={() => handleStatusChange(invoice.id, 'Approved')} title="Approve">
          <CheckCircle size={14} />
        </Button>
      );
    }
    if (status === 'Approved') {
      buttons.push(
        <Button key="lock" variant="outline-dark" size="sm" onClick={() => handleStatusChange(invoice.id, 'Locked')} title="Lock">
          <Lock size={14} />
        </Button>
      );
    }
    return buttons;
  };

  const handleApprovalSubmit = async () => {
    try {
      setIsApproving(true);
      await invoiceService.approve(approvalModal.invoice.id, {
        action: approvalModal.action,
        remarks: approvalModal.remarks
      });
      if (fetchInvoices) await fetchInvoices();
      window.dispatchEvent(new CustomEvent('invoice:changed'));
      setApprovalModal({ show: false, invoice: null, action: '', remarks: '' });
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleExport = () => {
    const columns = [
      createColumnDef('Invoice No', (item) => item.invoiceNo || item.invoice_no),
      createColumnDef('Date', 'date'),
      createColumnDef('Client Name', (item) => item.clientName || item.client_name),
      createColumnDef('Country', 'country'),
      createColumnDef('Pallets', 'pallets'),
      createColumnDef('Total SQM', (item) => item.totalSqm || item.total_sqm),
      createColumnDef('Amount', (item) => item.totalAmount || item.total_amount),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredInvoices, columns, 'xlsx', 'proforma_invoices', typeof currentUser !== 'undefined' ? currentUser?.role === 'super_admin' : false);
  };

  const printViewRef = useRef(null);
  const downloadPrintViewRef = useRef(null);
  const [downloadInvoiceData, setDownloadInvoiceData] = useState(null);

  const handleViewPDF = async () => {
    if (filteredInvoices.length > 0) {
      const invoice = filteredInvoices[0];
      setSelectedInvoice(invoice);
      setShowPrintView(true);

      // Wait for component to render, then show PDF preview
      setTimeout(async () => {
        if (printViewRef.current) {
          try {
            const result = await previewPDF(printViewRef.current, {
              format: 'a4',
              orientation: 'portrait',
            });
            if (result.success) {
            } else {
              showError('Failed to open PDF preview: ' + result.message);
            }
          } catch (error) {
            console.error('❌ Error generating PDF preview:', error);
            showError('Failed to generate PDF: ' + error.message);
          }
        }
      }, 500);
    }
  };

  const handleViewInvoice = async (invoice) => {
    try {
      setIsSaving(true);
      const response = await api.get(`/proforma-invoices/${invoice.id}`);
      
      // Defensive data extraction to handle different API response structures
      const responseData = response.data?.data || response.data;
      const fullInvoice = responseData?.data || responseData;
      
      if (fullInvoice && fullInvoice.id) {
        // Ensure productLines is a proper array and normalized
        let productLines = fullInvoice.productLines || fullInvoice.product_lines || [];
        if (typeof productLines === 'string') {
          try {
            productLines = JSON.parse(productLines);
          } catch (e) { 
            console.error('Failed to parse product lines:', e);
            productLines = []; 
          }
        }
        
        // Final normalization pass for product lines to ensure consistency
        if (Array.isArray(productLines)) {
          const { transformKeys } = await import('../../utils/dataTransformers');
          productLines = productLines.map(line => transformKeys(line));
        }
        
        fullInvoice.productLines = productLines;
        setSelectedInvoice(fullInvoice);
        setShowPrintView(true);
      } else {
        throw new Error('Invoice data not found in response');
      }
    } catch (err) {
      console.error('Error viewing invoice:', err);
      showError('Failed to view invoice: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintInvoice = async (invoice) => {
    api.post('/document-activity/proforma_invoice/' + invoice.id + '/action', { action: 'PRINT' }).catch(() => {});
    await handleViewInvoice(invoice);
    setTimeout(() => {
      if (printViewRef.current) {
        window.print();
        setShowPrintView(false);
      }
    }, 500);
  };

  const handleExportProductXLSX = async (invoice) => {
    try {
      showSuccess('Preparing Product XLSX...');
      const response = await api.get(`/proforma-invoices/${invoice.id}`);
      const invoiceData = response.data?.data || invoice;
      const searchVal = String(invoiceData?.boxType || invoiceData?.box_type || '').trim().toLowerCase();
      const matched = boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
      const imageUrl = matched?.image_url || matched?.imageUrl;
      await exportProductDetailsToXLSX(invoiceData, 'Proforma Invoice', imageUrl);
      showSuccess('Product data exported successfully');
    } catch (error) {
      showError('Failed to export product data');
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try { await api.post('/document-activity/proforma_invoice/' + invoice.id + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      showSuccess('Fetching invoice data...');
      setIsSaving(true);
      const response = await api.get(`/proforma-invoices/${invoice.id}`);
      const responseData = response.data?.data || response.data;
      const fullInvoice = responseData?.data || responseData;
      
      let productLines = fullInvoice.productLines || fullInvoice.product_lines || [];
      if (typeof productLines === 'string') {
        try { productLines = JSON.parse(productLines); } catch (e) { productLines = []; }
      }
      
      if (Array.isArray(productLines)) {
        const { transformKeys } = await import('../../utils/dataTransformers');
        productLines = productLines.map(line => transformKeys(line));
      }
      
      const hydratedInvoice = { ...fullInvoice, productLines };
      setDownloadInvoiceData(hydratedInvoice);
      setIsSaving(false);

      showSuccess('Generating PDF...');
      
      // Wait for hidden component to fully render with all props and images
      setTimeout(async () => {
        if (downloadPrintViewRef.current) {
          const result = await downloadPDF(downloadPrintViewRef.current, {
            format: 'a4',
            orientation: 'portrait',
            filename: generateEnterpriseFilename({
              moduleName: 'PROFORMA-INVOICE',
              documentNo: invoice.invoiceNo || invoice.invoice_no || 'document',
              clientName: invoice.clientName || invoice.client_name || '',
              date: invoice.date || new Date().toISOString(),
              extension: 'pdf'
            })
          });
          if (!result.success) {
            showError('Failed to download PDF: ' + result.message);
          }
          setDownloadInvoiceData(null);
        }
      }, 1500);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showError('Failed to download PDF: ' + error.message);
      setIsSaving(false);
      setDownloadInvoiceData(null);
    }
  };

  const handleImportData = async (importData) => {
    // Enhanced import with complete field support
    const newInvoices = importData.map((data, index) => ({
      id: Math.max(...invoices.map((i) => i.id), 0) + index + 1,
      invoiceNo:
        data.invoiceNo ||
        `PI/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(
          new Date().getFullYear()
        ).slice(-2)}/${String(Math.floor(Math.random() * 1000) + 1).padStart(
          3,
          '0'
        )}`,
      date: data.date || new Date().toLocaleDateString('en-CA'),
      clientName: data.clientName || '',
      client: data.clientName || '',
      country: data.country || '',
      consignee: data.consignee || '',
      buyer: data.buyer || '',
      portOfLoading: data.portOfLoading || '',
      portOfDischarge: data.portOfDischarge || '',
      finalDestination: data.finalDestination || data.country || '',
      tariffCode: data.tariffCode || '',
      currency: data.currency || 'USD ($)',
      palletType: data.palletType || 'Normal Wooden Pallet',
      tilesBack: data.tilesBack || 'WITH MADE IN INDIA',
      boxesMarking: data.boxesMarking || 'WITH',
      boxType: data.boxType || 'NON BRANDED BOXES',
      fumigation: data.fumigation || 'YES',
      legalisation: data.legalisation || 'YES',
      otherInstructions: data.otherInstructions || '',
      amount: parseFloat(data.amount) || 0,
      totalAmount: parseFloat(data.amount) || 0,
      status: data.status || 'Draft',
      pallets: 0,
      totalSQM: 0,
      productLines: [],
      importedAt: new Date().toISOString(),
      importBatch: `BATCH_${Date.now()}`,
    }));

    try {
      // Persist imported invoices via API and refresh list
      for (const inv of newInvoices) {
        if (createInvoice) await createInvoice(inv);
      }
      if (fetchInvoices) await fetchInvoices();
      setShowImportModal(false);
      showSuccess('Imported invoices successfully');
    } catch (err) {
      console.error('Error importing invoices:', err);
      showError('Failed to import invoices: ' + (err.message || err));
    }
  };

  const handleViewWorkflow = (invoice) => {
    const workflowData = workflowConnections.getRelatedDocuments(
      invoice.invoiceNo
    );
    setSelectedWorkflow({
      invoice,
      ...workflowData,
      status: workflowConnections.getWorkflowStatus(invoice.invoiceNo),
    });
    setShowWorkflowView(true);
  };

  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const handleDeleteInvoice = (invoiceId) => {
    setDeleteTargetId(invoiceId);
  };

  const confirmDeleteInvoice = async () => {
    try {
      await deleteInvoice(deleteTargetId);
      showSuccess('Invoice deleted successfully');
    } catch (err) {
      console.error('❌ Delete error:', err);
      showError('Failed to delete invoice: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleToggleInvoiceStatus = async (invoiceId) => {
    try {
      await toggleInvoiceStatus(invoiceId);
      showSuccess('Invoice status updated successfully');
    } catch (err) {
      console.error('❌ Toggle status error:', err);
      showError('Failed to toggle invoice status: ' + (err.response?.data?.message || err.message));
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin', 'sales_manager', 'sales_executive'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading invoices...</p>
      </div>
    );
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Proforma Invoices</h2>
          <p className="text-muted small">
            Manage proforma invoices with complete workflow tracking
          </p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileText size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Invoices</p>
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
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><BarChart3 size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Value</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{formatPrice(dashboardStats.totalAmount, 'USD')}</h5>
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

      <FilterSection filters={filters} onFiltersChange={setFilters} />


      <BulkActionBar
        selectedCount={multiSelect.getSelectedCount()}
        onSelectAll={(shouldSelect) => {
          if (shouldSelect) {
            multiSelect.toggleSelectAll(filteredInvoices);
          } else {
            multiSelect.clearSelection();
          }
        }}
        onClearSelection={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        isLoading={isSaving}
        selectAllChecked={multiSelect.selectAll}
        totalItems={filteredInvoices.length}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        actions={canEdit ? invoiceBulkActions : []}
        onAction={handleBulkAction}
      />

      {/* Invoices List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Proforma Invoices ({filteredInvoices.length})</h5>
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
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={onAddNew} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Invoice</span>
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
                      onChange={() => multiSelect.toggleSelectAll(filteredInvoices)}
                    />
                  </th>
                  <th className="ps-4">SR. NO.</th>
                  <th>Status</th>
                  <th>PI NO.</th>
                  <th>Date</th>

                  <th>Client Firm Name</th>
                  <th>Destination Country</th>
                  <th>Pallets</th>
                  <th>SQM</th>
                  <th>Amount</th>
                  <th className="text-center">Workflow</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice, index) => {
                    const totals = calculateProductLineTotals(invoice);
                    return (
                      <tr key={invoice.id} className={`${multiSelect.isSelected(invoice.id) ? 'table-active' : ''} ${invoice.status === 'Revised' ? 'table-light text-muted opacity-75' : ''}`}>
                        <td data-label="Select">
                          <Form.Check
                            type="checkbox"
                            checked={multiSelect.isSelected(invoice.id)}
                            onChange={() => multiSelect.toggleSelect(invoice.id)}
                          />
                        </td>
                      <td className="text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                        <td data-label="Status">
                          <div className="d-flex align-items-center gap-1">
                            <DashboardStatusDropdown 
                                module="PI" 
                                endpoint="proforma-invoices" 
                                documentId={invoice.id} 
                                value={(invoice.is_locked || invoice.isLocked) ? 'Locked' : (invoice.status || 'Draft')} 
                                disabled={!canEdit || invoice.is_locked || invoice.isLocked} 
                                onSuccess={fetchInvoices} 
                              />
                          </div>
                        </td>
                        <td className="fw-medium" data-label="PI NO.">
                          {invoice.status === 'Revised' ? (
                            <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.85rem' }}>
                              <span className="text-secondary opacity-50">↳</span> {invoice.invoiceNo || invoice.invoice_no}
                            </span>
                          ) : (
                            invoice.invoiceNo || invoice.invoice_no
                          )}
                        </td>
                        <td data-label="Date">{formatDisplayDate(invoice.date)}</td>

<td data-label="Client">{invoice.clientName || invoice.client_name || 'N/A'}</td>
<td data-label="Country">{invoice.country || 'N/A'}</td>
<td data-label="Pallets">{totals.pallets || 0}</td>
<td data-label="Quantity">{formatSQM(totals.sqm)}</td>
<td data-label="Amount">{formatPrice(totals.amount, invoice.currency)}</td>
<td data-label="Workflow" className="text-center">
  <Button
    variant="outline"
    size="sm"
    className="text-primary border-primary-subtle"
    onClick={() => handleViewWorkflow(invoice)}
    title="View Workflow"
  >
    <Link size={14} />
  </Button>
</td>
<td className="text-end pe-4">
  <div className="d-flex justify-content-end gap-1">
    {canEdit && (
      <Button
        variant="outline"
        size="sm"
        className="text-primary border-primary-subtle"
        onClick={() => onEdit(invoice)}
        title={invoice.status === 'Revised' ? 'Cannot edit revised history' : 'Edit'}
        disabled={invoice.status === 'Revised'}
      >
        <Edit size={14} />
      </Button>
    )}
    <Button
      variant="outline"
      size="sm"
      className="text-info border-info-subtle"
      onClick={() => handleViewInvoice(invoice)}
      title="View Details"
    >
      <Eye size={14} />
    </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handlePrintInvoice(invoice)}
                              title="Print Invoice"
                            >
                              <Printer size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success border-success-subtle"
                              onClick={() => handleDownloadPDF(invoice)}
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success border-success-subtle"
                              onClick={() => handleExportProductXLSX(invoice)}
                              title="Download XLSX"
                            >
                              <FileSpreadsheet size={14} />
                            </Button>
                            <LockDocumentButton
                              documentType="PROFORMA_INVOICE"
                              documentId={invoice.id}
                              isLocked={invoice.is_locked || invoice.isLocked}
                              onLockSuccess={fetchInvoices}
                              getSnapshotData={async () => {
                                const res = await api.get(`/proforma-invoices/${invoice.id}`);
                                return res.data?.data || res.data;
                              }}
                            />
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="13" className="p-0 border-0">
                      <EmptyState
                        title="No Invoices Found"
                        description="Get started by creating your first Proforma Invoice. It takes just a few clicks."
                        actionLabel={canEdit ? "Create Proforma Invoice" : null}
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
            {paginatedInvoices.length > 0 ? (
              paginatedInvoices.map((invoice, index) => {
                const totals = calculateProductLineTotals(invoice);
                return (
                  <Card key={invoice.id} className="mb-3 border-0 shadow-sm invoice-mobile-card">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                          <h5 className="fw-bold mb-1 text-dark">{invoice.invoiceNo || invoice.invoice_no}</h5>
                          <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDisplayDate(invoice.date)}</div>
                        </div>
                        <div className="status-container">
                          <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${invoice.status === 'Approved' ? 'success' :
                            invoice.status === 'Rejected' ? 'danger' :
                              invoice.status === 'Pending' ? 'warning' : 'secondary'
                            }`}>
                            {invoice.status || 'Draft'}
                          </div>
                        </div>
                      </div>

                      <Row className="g-3 mb-4">
                        <Col xs={12}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                            <div className="text-dark fw-bold">{invoice.clientName || invoice.client_name || 'N/A'}</div>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Country:</label>
                            <div className="text-dark">{invoice.country || 'N/A'}</div>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Amount:</label>
                            <div className="text-primary fw-bold">{formatPrice(totals.amount, invoice.currency)}</div>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Pallets:</label>
                            <div className="text-dark">{totals.pallets || 0}</div>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">SQM:</label>
                            <div className="text-dark">{totals.sqm || 0}</div>
                          </div>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => onEdit(invoice)}
                            disabled={invoice.status === 'Revised'}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Edit size={14} className="me-1" /> Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handleViewInvoice(invoice)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Eye size={14} className="me-1" /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handleViewWorkflow(invoice)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <BarChart3 size={14} className="me-1" /> Workflow
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handlePrintInvoice(invoice)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Printer size={14} className="me-1" /> Print
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handleDownloadPDF(invoice)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Download size={14} className="me-1" /> PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handleExportProductXLSX(invoice)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <FileSpreadsheet size={14} className="me-1" /> XLSX
                        </Button>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`${invoice.status === 'Accepted' || invoice.status === 'Sent' ? 'border-warning-subtle text-warning' : 'border-success-subtle text-success'} flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold`}
                            onClick={() => handleToggleInvoiceStatus(invoice.id)}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Power size={14} className="me-1" /> Status
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            <Trash2 size={14} className="me-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                );
              })
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
                <InvoicePrintView 
                  invoiceData={selectedInvoice} 
                  products={productsData?.products || products || []} 
                  boxTypeImageUrl={(() => {
                    const searchVal = String(selectedInvoice?.boxType || selectedInvoice?.box_type || '').trim().toLowerCase();
                    const matched = boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
                    return matched?.image_url || matched?.imageUrl;
                  })()}
                />
              </div>
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="proforma_invoice" resourceId={selectedInvoice.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="proforma-invoice-enhanced"
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

      {/* Workflow View Modal */}
      {showWorkflowView && selectedWorkflow && (
        <Modal
          show={showWorkflowView}
          onHide={() => setShowWorkflowView(false)}
          size="xl"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <Link size={20} className="me-2" />
              Workflow Status - {selectedWorkflow.invoice.invoiceNo}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <WorkflowTracker
              piNumber={selectedWorkflow.invoice.invoiceNo}
              onNavigate={(view) => {
                setShowWorkflowView(false);
                // Handle navigation based on view
              }}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowWorkflowView(false)}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      
      {/* Approval Modal */}
      <Modal show={approvalModal.show} onHide={() => setApprovalModal({ show: false, invoice: null, action: '', remarks: '' })} centered>
        <Modal.Header closeButton className={approvalModal.action === 'reject' ? "bg-danger text-white" : "bg-primary text-white"}>
          <Modal.Title className="fw-bold text-white">
            {approvalModal.action === 'reject' ? 'Reject Invoice' : approvalModal.action === 'submit' ? 'Submit for Approval' : 'Approve Invoice'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Remarks (Optional):</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={approvalModal.remarks}
              onChange={(e) => setApprovalModal({ ...approvalModal, remarks: e.target.value })}
              placeholder="Enter any remarks or notes..."
              className="form-control-enhanced"
              required={approvalModal.action === 'reject'}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setApprovalModal({ show: false, invoice: null, action: '', remarks: '' })}>
            Cancel
          </Button>
          <Button
            variant={approvalModal.action === 'reject' ? "danger" : "primary"}
            onClick={async () => {
              await handleApprovalSubmit();
            }}
            disabled={isApproving}
          >
            {isApproving ? 'Processing...' : 'Confirm'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={!!deleteTargetId}
        onHide={() => setDeleteTargetId(null)}
        title="Confirm Delete"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        variant="danger"
        onConfirm={confirmDeleteInvoice}
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
          {downloadInvoiceData && (
            <InvoicePrintView 
              invoiceData={downloadInvoiceData} 
              products={productsData?.products || products || []} 
              boxTypeImageUrl={(() => {
                const searchVal = String(downloadInvoiceData?.boxType || downloadInvoiceData?.box_type || '').trim().toLowerCase();
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

export default InvoiceDashboard;






