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
import { Row, Col, Card, Table, Badge, Spinner, Form, InputGroup, Modal, Button as BsButton } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Eye, Edit, FileText, Search, Plus, Trash2, RefreshCcw, Package, FileCheck, Download, Upload, Truck, Clock, X, MapPin, Calendar, Printer, Check } from 'lucide-react';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import api from '../../services/api';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { formatDisplayDate } from '../../utils/formatters.js';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import SkeletonTable from '../shared/SkeletonTable.jsx';
import TableErrorBoundary from '../shared/TableErrorBoundary.jsx';

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
  const [loadingView, setLoadingView] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });
  const multiSelect = useMultiSelect(packingLists);

  const dashboardStats = {
    total: packingLists.length,
    ready: packingLists.filter(pl => pl.status === 'Approved').length,
    dispatched: packingLists.filter(pl => pl.status === 'Dispatched').length,
    pending: packingLists.filter(pl => pl.status !== 'Approved' && pl.status !== 'Dispatched').length,
    totalPallets: packingLists.reduce((sum, pl) => sum + (parseInt(pl.totalPallets || pl.total_pallets) || 0), 0),
    totalWeight: packingLists.reduce((sum, pl) => sum + (parseFloat(pl.totalWeight || pl.total_weight) || 0), 0)
  };

  useEffect(() => {
    fetchPackingLists();
    
    // Refresh when user returns to this browser tab
    const handleWindowFocus = () => {
      fetchPackingLists();
    };
    
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, monthFilter, dateFrom, dateRange]);

  const fetchPackingLists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/packing-lists?limit=1000');
      const data = response.data?.data || response.data || [];
      
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

  const handleViewPackingList = async (pl) => {
    try {
      setLoadingView(true);
      const response = await api.get(`/packing-lists/${pl.id}`);
      const data = response.data?.data || response.data;
      setViewingPL(data || pl);
    } catch (error) {
      setViewingPL(pl);
    } finally {
      setLoadingView(false);
    }
  };

  const handleDeletePackingList = (pl) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete packing list ${pl.packingListNo || pl.packing_list_no}? This will also delete all associated product lines and weight calculations.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setDeleting(pl.id);
          await api.delete(`/packing-lists/${pl.id}`);
          showSuccess('Packing list deleted successfully');
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

  const handleDownload = async (pl) => {
    try {
      const response = await api.get(`/packing-lists/${pl.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PL_${pl.packingListNo || pl.packing_list_no || pl.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError('PDF download not available for this packing list');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setMonthFilter('');
    setDateFrom('');
    setCurrentPage(1);
  };

  const handleExportData = () => {
    try {
      if (packingLists.length === 0) {
        showError('No packing lists to export');
        return;
      }
      const exportData = packingLists.map((pl) => ({
        'PL No': pl.packingListNo || pl.packing_list_no || '-',
        'EXP No': pl.exportInvoiceNo || pl.export_invoice_no || '-',
        'Date': formatDisplayDate(pl.date),
        'Client': pl.clientName || pl.client_name || '-',
        'Pallets': pl.totalPallets || pl.total_pallets || 0,
        'Weight (KG)': pl.totalWeight || pl.total_weight || 0,
        'Status': pl.status || '-',
      }));
      const csv = [Object.keys(exportData[0]).join(','), ...exportData.map((row) => Object.values(row).map((val) => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `packing-lists-${new Date().toLocaleDateString('en-CA')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess('Packing lists exported successfully!');
    } catch (err) {
      showError('Failed to export packing lists: ' + err.message);
    }
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

  const dateFilteredPackingLists = filterByDateRange(packingLists, dateRange.start, dateRange.end, "created_at");
  const filteredPackingLists = dateFilteredPackingLists.filter(pl => {
    const matchesSearch = !searchTerm || 
      (pl.packingListNo || pl.packing_list_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pl.clientName || pl.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || pl.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPackingLists.length / PAGE_SIZE);
  const paginatedPackingLists = filteredPackingLists.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  const canManagePackingList =
    ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role) ||
    currentUser?.permissions?.includes('all') ||
    currentUser?.permissions?.includes('packing_list') ||
    currentUser?.permissions?.includes('logistics');

  if (!canManagePackingList) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Packing List Management.</p>
      </div>
    );
  }

  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' }, { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' }, { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' }, { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Packing List Management</h2>
          <p className="text-muted">Manage packing operations and dispatch documentation</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '150px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Package size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '150px', flex: '1 0 0' }}>
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
        <Col className="flex-shrink-0" style={{ minWidth: '150px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Truck size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Dispatched</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.dispatched}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '150px', flex: '1 0 0' }}>
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
        <Col className="flex-shrink-0" style={{ minWidth: '150px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-secondary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Package size={18} className="text-secondary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pallets</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.totalPallets}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '150px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-dark-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FileText size={18} className="text-dark" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Weight</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{(dashboardStats.totalWeight / 1000).toFixed(1)}T</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4 shadow-sm border-0 filter-card">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}><InputGroup size="sm"><InputGroup.Text className="bg-white border-end-0"><Search size={16} /></InputGroup.Text><Form.Control placeholder="Search by PL No. or Client..." className="border-start-0" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></InputGroup></Col>
            <Col md={3}><Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>                  <option value="">All Status</option>
                                      <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Revised">Revised</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Finalized">Finalized</option>
                    <option value="Rejected">Rejected</option>
                  </Form.Select></Col>
            <Col md={2}><Form.Select size="sm" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}><option value="">All Months</option>{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</Form.Select></Col>
            <Col md={2}><Form.Control type="date" size="sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Col>
            <Col md={1}><Button variant="outline" size="sm" className="w-100 border" onClick={resetFilters}><RefreshCcw size={16} /></Button></Col>
          </Row>
          <Row className="mt-2"><Col><DateRangeFilter onFilterChange={(start, end) => setDateRange({ start, end })} /></Col></Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Packing Lists ({filteredPackingLists.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            <Button
              variant="outline-light"
              size="sm"
              onClick={handleExportData}
              className="d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Download size={14} className="me-1" />
              <span className="d-none d-md-inline small">Export Data</span>
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Upload size={14} className="me-1" />
              <span className="d-none d-md-inline small">Import Data</span>
            </Button>
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => onNavigate('packing-list-form')} style={{ width: 'auto' }}>
              <Plus size={18} className="me-1" />
              <span className="d-none d-sm-inline small">Create Packing list</span>
              <span className="d-sm-none small">Create</span>
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <TableErrorBoundary>
          {/* Desktop Table View */}
          <div className="table-responsive d-none d-lg-block">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">SR. NO.</th>
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredPackingLists)}
                    />
                  </th>
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
                  <tr><td colSpan="10" className="p-3"><SkeletonTable columns={10} rows={5} /></td></tr>
                ) : paginatedPackingLists.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-5 text-muted">No packing lists found</td></tr>
                ) : paginatedPackingLists.map((pl, index) => (
                  <tr key={pl.id} className={multiSelect.isSelected(pl.id) ? 'table-active' : ''}>
                    <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={multiSelect.isSelected(pl.id)}
                        onChange={() => multiSelect.toggleSelect(pl.id)}
                      />
                    </td>
                    <td>
                      <StatusBadge status={pl.status} />
                    </td>
                    <td className="fw-semibold text-primary">{pl.packingListNo || pl.packing_list_no || '-'}</td>
                    <td className="text-muted">{(pl.exportInvoiceNo || pl.export_invoice_no) && (pl.exportInvoiceNo || pl.export_invoice_no) !== (pl.packingListNo || pl.packing_list_no) ? (pl.exportInvoiceNo || pl.export_invoice_no) : '-'}</td>
                    <td>{pl.clientName || pl.client_name || '-'}</td>
                    <td>{formatDate(pl.date || pl.packingListDate || pl.packing_list_date)}</td>
                    <td>{pl.totalPallets || pl.total_pallets || 0}</td>
                    <td>{parseFloat(pl.totalWeight || pl.total_weight || 0).toLocaleString()}</td>
                    <td className="pe-4 text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle"
                          title="Edit"
                          onClick={() => onNavigate('packing-list-form', { packingList: pl })}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-info border-info-subtle"
                          title="View Details"
                          onClick={() => handleViewPackingList(pl)}
                          disabled={loadingView}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle"
                          title="Print"
                          onClick={() => handleDownload(pl)}
                        >
                          <Printer size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-success border-success-subtle"
                          title="Download PDF"
                          onClick={() => handleDownload(pl)}
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger border-danger-subtle"
                          title="Delete"
                          onClick={() => handleDeletePackingList(pl)}
                          disabled={deleting === pl.id}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {loading ? (
              <div className="p-3"><SkeletonTable columns={4} rows={3} /></div>
            ) : paginatedPackingLists.length > 0 ? (
              paginatedPackingLists.map((pl, index) => (
                <Card key={pl.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{pl.packingListNo || pl.packing_list_no || '-'}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDate(pl.date || pl.packingListDate || pl.packing_list_date)}</div>
                      </div>
                      <div className="status-container">
                        <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                          getStatusVariant(pl.status)
                        }`}>
                          {pl.status || 'Pending'}
                        </div>
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                          <div className="text-dark fw-bold">{pl.clientName || pl.client_name || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">EXP No:</label>
                          <div className="text-dark">{(pl.exportInvoiceNo || pl.export_invoice_no) && (pl.exportInvoiceNo || pl.export_invoice_no) !== (pl.packingListNo || pl.packing_list_no) ? (pl.exportInvoiceNo || pl.export_invoice_no) : '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Weight (KG):</label>
                          <div className="text-primary fw-bold">{parseFloat(pl.totalWeight || pl.total_weight || 0).toLocaleString()}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Pallets:</label>
                          <div className="text-dark">{pl.totalPallets || pl.total_pallets || 0}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => onNavigate('packing-list-form', { packingList: pl })}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Edit size={14} className="me-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewPackingList(pl)}
                        disabled={loadingView}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownload(pl)} 
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownload(pl)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDeletePackingList(pl)}
                        disabled={deleting === pl.id}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Trash2 size={14} className="me-1" /> Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))
            ) : (
              <div className="text-center py-5 text-muted">
                No packing lists found
              </div>
            )}
          </div>
          </TableErrorBoundary>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredPackingLists.length} pageSize={PAGE_SIZE} />
      </Card>

      <style>{`
        .pl-mobile-card {
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
        .bg-dark-light { background-color: rgba(33, 37, 41, 0.1); }
      `}</style>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="packing-lists"
      />

      {viewingPL && (
        <Modal show={true} onHide={() => setViewingPL(null)} size="xl" backdrop="static">
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="d-flex align-items-center gap-2">
              <Package size={20} className="text-primary" />
              Packing List Details — {viewingPL.packingListNo || viewingPL.packing_list_no || '-'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Row className="g-4">
              <Col md={6}>
                <Card className="h-100 border-0 bg-light">
                  <Card.Body>
                    <h6 className="fw-bold text-primary mb-3"><FileText size={16} className="me-1" />Basic Information</h6>
                    <table className="w-100 small">
                      <tbody>
                        <tr><td className="text-muted fw-semibold py-1" style={{width:'45%'}}>PL Number:</td><td className="fw-bold">{viewingPL.packingListNo || viewingPL.packing_list_no || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Date:</td><td>{formatDate(viewingPL.packingListDate || viewingPL.packing_list_date || viewingPL.date)}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Export Invoice:</td><td>{viewingPL.exportInvoiceNo || viewingPL.export_invoice_no || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">PI Reference:</td><td>{viewingPL.proformaInvoiceNo || viewingPL.proforma_invoice_no || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Client:</td><td>{viewingPL.clientName || viewingPL.client_name || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Status:</td><td><Badge bg={getStatusVariant(viewingPL.status)}>{viewingPL.status || '-'}</Badge></td></tr>
                      </tbody>
                    </table>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="h-100 border-0 bg-light">
                  <Card.Body>
                    <h6 className="fw-bold text-primary mb-3"><MapPin size={16} className="me-1" />Shipping Details</h6>
                    <table className="w-100 small">
                      <tbody>
                        <tr><td className="text-muted fw-semibold py-1" style={{width:'45%'}}>Port of Loading:</td><td>{viewingPL.portOfLoading || viewingPL.port_of_loading || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Port of Discharge:</td><td>{viewingPL.portOfDischarge || viewingPL.port_of_discharge || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Final Destination:</td><td>{viewingPL.finalDestination || viewingPL.final_destination || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Vessel/Flight No:</td><td>{viewingPL.vesselFlightNo || viewingPL.vessel_flight_no || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Payment Terms:</td><td>{viewingPL.paymentTerms || viewingPL.payment_terms || '-'}</td></tr>
                        <tr><td className="text-muted fw-semibold py-1">Delivery Terms:</td><td>{viewingPL.deliveryTerms || viewingPL.delivery_terms || '-'}</td></tr>
                      </tbody>
                    </table>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={12}>
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <h6 className="fw-bold text-primary mb-3"><Package size={16} className="me-1" />Summary</h6>
                    <Row className="g-3">
                      <Col md={3} className="text-center"><div className="p-3 bg-white rounded shadow-sm"><h5 className="fw-bold text-primary mb-0">{viewingPL.totalPallets || viewingPL.total_pallets || 0}</h5><small className="text-muted">Total Pallets</small></div></Col>
                      <Col md={3} className="text-center"><div className="p-3 bg-white rounded shadow-sm"><h5 className="fw-bold text-success mb-0">{viewingPL.totalBoxes || viewingPL.total_boxes || 0}</h5><small className="text-muted">Total Boxes</small></div></Col>
                      <Col md={3} className="text-center"><div className="p-3 bg-white rounded shadow-sm"><h5 className="fw-bold text-info mb-0">{parseFloat(viewingPL.netWeight || viewingPL.net_weight || 0).toLocaleString()}</h5><small className="text-muted">Net Weight (KG)</small></div></Col>
                      <Col md={3} className="text-center"><div className="p-3 bg-white rounded shadow-sm"><h5 className="fw-bold text-warning mb-0">{parseFloat(viewingPL.grossWeight || viewingPL.gross_weight || 0).toLocaleString()}</h5><small className="text-muted">Gross Weight (KG)</small></div></Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              {((Array.isArray(viewingPL.productLines) && viewingPL.productLines.length > 0) || (Array.isArray(viewingPL.product_lines) && viewingPL.product_lines.length > 0)) && (
                <Col md={12}>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="fw-bold text-primary mb-3">Product Lines</h6>
                      <Table size="sm" className="mb-0">
                        <thead className="table-light"><tr><th>Product</th><th>Size</th><th>Pallets</th><th>Boxes</th><th>Net Wt (KG)</th></tr></thead>
                        <tbody>
                          {(viewingPL.productLines || viewingPL.product_lines).map((line, idx) => (
                            <tr key={idx}>
                              <td>{line.product || line.product_name || '-'}</td>
                              <td>{line.size || '-'}</td>
                              <td>{line.totalPallet ?? line.total_pallet ?? '-'}</td>
                              <td>{line.totalBoxes ?? line.total_boxes ?? '-'}</td>
                              <td>{line.netWeight ?? line.net_weight ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <BsButton variant="outline-secondary" onClick={() => setViewingPL(null)}>Close</BsButton>
            <BsButton variant="primary" onClick={() => { setViewingPL(null); onNavigate('packing-list-form', { packingList: viewingPL }); }}>
              <Edit size={14} className="me-1" />Edit
            </BsButton>
          </Modal.Footer>
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
    </>
  );
}

export default PackingListDashboard;
