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

import { generateEnterpriseFilename } from '../../utils/fileNamingUtils';
import { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Form, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Plus, Search, Edit, Trash2, Eye, Download, Upload, RotateCcw, Power, Printer, Check } from 'lucide-react';
import { useAccountEntries } from '../../hooks/useAccountEntries';
import { accountEntryService } from '../../services/accountEntryService';
import AccountEntryForm from './AccountEntryForm.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import AccountPrintView from './AccountPrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { formatPrice, formatDisplayDate } from '../../utils/formatters.js';
import FilterPanel from '../shared/FilterPanel.jsx';

function AccountFinanceDashboard({ currentUser }) {
  const { 
    accountEntries, 
    loading, 
    error, 
    summary,
    createAccountEntry, 
    updateAccountEntry, 
    deleteAccountEntry, 
    toggleAccountEntryStatus,
    fetchSummary
  } = useAccountEntries();
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showImportModal, setShowImportModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    upcomingDues: 0,
  });

  useEffect(() => {
    if (summary) {
      setDashboardStats(summary);
    }
  }, [summary]);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    partyName: '',
    status: '',
    dateRange: { start: '', end: '' },
  });

  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);


  useEffect(() => {
    let filtered = accountEntries;

    if (filters.search) {
      filtered = filtered.filter(
        (entry) =>
          entry.entryNo.toLowerCase().includes(filters.search.toLowerCase()) ||
          entry.partyName
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          entry.invoiceNo.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter((entry) => entry.type === filters.type);
    }

    if (filters.partyName) {
      filtered = filtered.filter((entry) =>
        entry.partyName.toLowerCase().includes(filters.partyName.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter((entry) => entry.status === filters.status);
    }

    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "date");
    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [filters, accountEntries, dateRange]);

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setShowEntryForm(true);
  };

  const handleEditEntry = async (entry) => {
    try {
      const response = await accountEntryService.getById(entry.id);
      const data = response.data;
      setEditingEntry(data.data);
      setViewingEntry(null);
      setShowEntryForm(true);
    } catch (error) {
      console.error('❌ Error fetching entry:', error);
      console.error('Failed to load entry: ' + error.message);
    }
  };

  const handleViewEntry = async (entry) => {
    try {
      const response = await accountEntryService.getById(entry.id);
      const data = response.data;
      setViewingEntry(data.data);
      setEditingEntry(null);
      setShowEntryForm(true);
    } catch (error) {
      console.error('❌ Error fetching entry:', error);
      showError('Failed to load entry: ' + error.message);
    }
  };

  const handlePrintEntry = async (entry) => {
    try { await api.post('/document-activity/doc/' + (entry?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    try {
      const response = await accountEntryService.getById(entry.id);
      const data = response.data;
      setViewingEntry(data.data);
      setShowPrintModal(true);
      setTimeout(() => {
        if (printRef.current) {
          window.print();
          setShowPrintModal(false);
        }
      }, 500);
    } catch (error) {
      showError('Failed to load entry for printing');
    }
  };

  const handleDownloadPDF = async (entry) => {
    try { await api.post('/document-activity/doc/' + (entry?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      const response = await accountEntryService.getById(entry.id);
      const data = response.data;
      const entryData = data.data;
      setViewingEntry(entryData);
      setShowPrintModal(true);
      setTimeout(async () => {
        if (printRef.current) {
          showSuccess('Generating PDF...');
          const filename = generateEnterpriseFilename({
            moduleName: 'VOUCHER',
            documentNo: entryData.entryNo || entryData.entry_no || 'ACC',
            clientName: entryData.clientName || entryData.client_name || '',
            date: entryData.entryDate || entryData.entry_date || '',
            extension: 'pdf'
          });
          const result = await downloadPDF(printRef.current, filename);
          if (!result?.success) showError('Failed to generate PDF');
        }
        setShowPrintModal(false);
      }, 800);
    } catch (error) {
      showError('Failed to generate PDF');
    }
  };

  const handleDeleteEntry = (entryId) => {
    setDeleteTargetId(entryId);
  };

  const confirmDeleteEntry = async () => {
    try {
      await deleteAccountEntry(deleteTargetId);
      fetchSummary();
      showSuccess('Entry deleted successfully');
    } catch (error) {
      console.error('❌ Delete error:', error);
      showError('Failed to delete entry');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleSaveEntry = async (entryData) => {
    try {
      if (editingEntry && editingEntry.id) {
        await updateAccountEntry(editingEntry.id, entryData);
      } else {
        await createAccountEntry(entryData);
      }
      fetchSummary();
      setShowEntryForm(false);
      setEditingEntry(null);
      setViewingEntry(null);
    } catch (error) {
      console.error('Failed to save entry:', error);
      showError('Failed to save entry');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };


  const handleToggleEntryStatus = async (entryId) => {
    try {
      await toggleAccountEntryStatus(entryId);
      fetchSummary();
    } catch (error) {
      console.error('Failed to toggle entry status:', error);
      showError('Failed to toggle entry status');
    }
  };

  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  const resetFilters = () => {
    setFilters({
      search: '',
      type: '',
      partyName: '',
      status: '',
      dateRange: { start: '', end: '' },
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      Paid: 'success',
      Pending: 'warning',
      Overdue: 'danger',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const variants = {
      Receivable: 'info',
      Payable: 'warning',
    };
    return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>;
  };

  const exportEntries = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Entry No,Type,Party Name,Invoice No,Amount,Status,Due Date,Payment Mode,Date,Remarks\n' +
      filteredEntries
        .map(
          (entry) =>
            `${entry.entryNo},${entry.type},${entry.partyName},${entry.invoiceNo},${entry.amount},${entry.status},${entry.dueDate},${entry.paymentMode},${entry.date},${entry.remarks}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `account_entries_${new Date().toLocaleDateString('en-CA')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = async (importData) => {
    try {
      for (const data of importData) {
        const entryData = {
          entryNo: `ACC/${String(new Date().getMonth() + 1).padStart(
            2,
            '0'
          )}/${String(new Date().getFullYear()).slice(-2)}/${String(
            Math.floor(Math.random() * 1000) + 1
          ).padStart(3, '0')}`,
          type: data.type || 'Receivable',
          partyName: data.partyName || '',
          invoiceNo: data.invoiceNo || '',
          amount: parseFloat(data.amount) || 0,
          status: data.status || 'Pending',
          dueDate: data.dueDate || '',
          paymentMode: data.paymentMode || '',
          date: data.date || new Date().toLocaleDateString('en-CA'),
          remarks: data.remarks || '',
        };
        await createAccountEntry(entryData);
      }
      setShowImportModal(false);
    } catch (error) {
      console.error('Failed to import entries:', error);
      showError('Failed to import entries');
    }
  };

  // Check permissions
  const canManageAccountFinance =
    ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role) ||
    currentUser?.role === 'account' ||
    currentUser?.permissions?.includes('all') ||
    currentUser?.permissions?.includes('account_finance') ||
    currentUser?.permissions?.includes('account');

  if (!canManageAccountFinance) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Account & Finance Management.</p>
      </div>
    );
  }

  const canEdit = ['super_admin', 'company_admin', 'account'].includes(
    currentUser?.role
  );

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      {/* Page Title */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Accounts & Finance</h2>
          <p className="text-muted">Manage financial records, track receivables/payables, and monitor cash flow</p>
        </Col>
      </Row>

      {/* Dashboard Widgets */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="text-center h-100 shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">
              <div className="icon-box bg-info-light mb-1 mx-auto" style={{ width: '32px', height: '32px', color: '#0891b2' }}><span className="fw-bold">$</span></div>
              <h5 className="fw-bold mb-0 text-info">${dashboardStats.totalReceivables.toLocaleString()}</h5>
              <p className="text-muted extra-small mb-0 text-nowrap">Receivables</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="text-center h-100 shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">
              <div className="icon-box bg-warning-light mb-1 mx-auto" style={{ width: '32px', height: '32px', color: '#d97706' }}><span className="fw-bold">$</span></div>
              <h5 className="fw-bold mb-0 text-warning">${dashboardStats.totalPayables.toLocaleString()}</h5>
              <p className="text-muted extra-small mb-0 text-nowrap">Payables</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="text-center h-100 shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">
              <div className="icon-box bg-success-light mb-1 mx-auto" style={{ width: '32px', height: '32px', color: '#059669' }}><span className="fw-bold">✓</span></div>
              <h5 className="fw-bold mb-0 text-success">{dashboardStats.paidInvoices}</h5>
              <p className="text-muted extra-small mb-0 text-nowrap">Paid</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="text-center h-100 shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">
              <div className="icon-box bg-danger-light mb-1 mx-auto" style={{ width: '32px', height: '32px', color: '#dc2626' }}><span className="fw-bold">!</span></div>
              <h5 className="fw-bold mb-0 text-danger">{dashboardStats.overdueInvoices}</h5>
              <p className="text-muted extra-small mb-0 text-nowrap">Overdue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="text-center h-100 shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">
              <div className="icon-box bg-primary-light mb-1 mx-auto" style={{ width: '32px', height: '32px', color: '#2563eb' }}><span className="fw-bold">⏱</span></div>
              <h5 className="fw-bold mb-0 text-primary">{dashboardStats.upcomingDues}</h5>
              <p className="text-muted extra-small mb-0 text-nowrap">Upcoming</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Collapsible Filter Panel */}
      <FilterPanel 
        onClear={resetFilters} 
        title="Search & Filters"
      >
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={4} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Search</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search by entry no, party..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={2} md={3} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Type</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Receivable">Receivable</option>
                  <option value="Payable">Payable</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={3} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Party Name</Form.Label>
                <Form.Control
                  type="text"
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  placeholder="Party name"
                  value={filters.partyName}
                  onChange={(e) => handleFilterChange('partyName', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col lg={3} md={12} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                                    <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <DateRangeFilter onFilterChange={(start, end) => setDateRange({ start, end })} />
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Accounts & Finance ({filteredEntries.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportEntries}
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
            {canEdit && (
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateEntry} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" /> 
                <span className="d-none d-sm-inline small">Create Entry</span>
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
                  <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                  <th>Status</th>
                  <th>Entry No.</th>
                  <th>Type</th>
                  <th>Party Name</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length > 0 ? (
                  paginatedEntries.map((entry, index) => (
                    <tr key={entry.id}>
                      <td className="text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td><StatusBadge status={entry.status} /></td>
                      <td className="fw-medium text-primary">{entry.entryNo}</td>
                      <td>{getTypeBadge(entry.type)}</td>
                      <td>{entry.partyName}</td>
                      <td className="fw-bold">{formatPrice(entry.amount, entry.currency || 'USD')}</td>
                      <td className="text-muted small">{formatDisplayDate(entry.dueDate)}</td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewEntry(entry)}
                            title="View Voucher"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle"
                            onClick={() => handlePrintEntry(entry)}
                            title="Print Voucher"
                          >
                            <Printer size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(entry)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => handleEditEntry(entry)}
                                title="Edit"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`${entry.status === 'Paid' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'}`}
                                onClick={() => handleToggleEntryStatus(entry.id)}
                                title={entry.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                              >
                                <Power size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDeleteEntry(entry.id)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedEntries.length > 0 ? (
              paginatedEntries.map((entry, index) => (
                <Card key={entry.id} className="mb-3 border-0 shadow-sm account-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{entry.entryNo}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {formatDisplayDate(entry.date)}</div>
                      </div>
                      <div className="status-container">
                        <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                          entry.status === 'Paid' ? 'success' :
                          entry.status === 'Overdue' ? 'danger' : 'warning'
                        }`}>
                          {entry.status || 'Pending'}
                        </div>
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Party Name:</label>
                          <div className="text-dark fw-bold">{entry.partyName || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Amount:</label>
                          <div className="text-dark fw-bold text-primary">{formatPrice(entry.amount, entry.currency || 'USD')}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Type:</label>
                          <div className={`fw-bold ${entry.type === 'Receivable' ? 'text-info' : 'text-warning'}`}>{entry.type}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Due Date:</label>
                          <div className="text-dark">{formatDisplayDate(entry.dueDate)}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Invoice:</label>
                          <div className="text-dark">{entry.invoiceNo || '-'}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                        onClick={() => handleViewEntry(entry)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handleEditEntry(entry)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                        onClick={() => handleDownloadPDF(entry)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => handleDeleteEntry(entry.id)}
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
                No entries found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredEntries.length} pageSize={PAGE_SIZE} />
      </Card>

      {/* Account Entry Form Modal */}
      {showEntryForm && (
        <AccountEntryForm
          entry={viewingEntry || editingEntry}
          onSave={handleSaveEntry}
          onCancel={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
            setViewingEntry(null);
          }}
          viewOnly={!!viewingEntry}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="account-entries"
      />

      {/* Account Print Modal */}
      {showPrintModal && viewingEntry && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Financial Voucher Print — {viewingEntry.entryNo}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printRef}>
              <AccountPrintView entryData={viewingEntry} />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={selectedDocument?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      <ConfirmationModal
        show={!!deleteTargetId}
        onHide={() => setDeleteTargetId(null)}
        title="Confirm Delete"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        variant="danger"
        onConfirm={confirmDeleteEntry}
      />
      <style>{`
        .account-mobile-card {
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

export default AccountFinanceDashboard;




