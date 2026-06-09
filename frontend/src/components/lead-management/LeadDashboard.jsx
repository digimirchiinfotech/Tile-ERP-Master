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

import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Badge, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Plus, Search, Edit, Trash2, Eye, Download, Upload, RotateCcw, Power, Printer, Target, Users as UsersIcon, CheckCircle, XCircle, TrendingUp, Check } from 'lucide-react';
import LeadForm from './LeadForm.jsx';
import LeadView from './LeadView.jsx';
import LeadPrintView from './LeadPrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { useRef } from 'react';
import FilterPanel from '../shared/FilterPanel.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';

import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import bulkDeleteService from '../../services/bulkDeleteService.js';
import bulkActionService from '../../services/bulkActionService.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import { useLeads } from '../../hooks/useLeads';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { formatDisplayDate } from '../../utils/formatters.js';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';


function LeadDashboard({ currentUser, leadsData, clientsData, usersData, productsData, navigationData }) {
  // Use props if provided, otherwise call hooks (for backward compatibility)
  const leadsHook = useLeads();
  const clientsHook = useClients();
  const usersHook = useUsers();

  const { leads, loading: leadsLoading, error: leadsError, createLead, updateLead, deleteLead: removeLead, toggleLeadStatus, convertToClient, fetchLeads } = leadsData || leadsHook;
  const { clients, loading: clientsLoading, error: clientsError } = clientsData || clientsHook;
  const { users, loading: usersLoading } = usersData || usersHook;
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Multi-select hook
  const multiSelect = useMultiSelect(leads);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);

  const loading = leadsLoading || clientsLoading || usersLoading;
  const error = leadsError || clientsError;
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadView, setShowLeadView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });
  const [filters, setFilters] = useState({
    leadId: '',
    companyName: '',
    clientName: '',
    country: '',
    priority: '',
    salesPerson: '',
    source: '',
    status: '',
  });

  const dashboardStats = {
    total: (leads || []).length,
    new: (leads || []).filter(l => l.status === 'New').length,
    contacted: (leads || []).filter(l => l.status === 'Contacted').length,
    qualified: (leads || []).filter(l => l.status === 'Qualified').length,
    converted: (leads || []).filter(l => l.status === 'Won').length,
  };

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId || u.userId === userId || u.name === userId);
    return user ? user.name : null;
  };

  const [errorModalConfig, setErrorModalConfig] = useState({
    show: false,
    errors: {},
    title: 'Validation Error',
    message: null
  });

  const showErrorModal = (error, title) => {
    if (error.response?.data?.errors) {
      setErrorModalConfig({
        show: true,
        errors: error.response.data.errors,
        title: title || 'Validation Error',
        message: error.response.data.message
      });
    } else {
      showError(title + ': ' + (error.response?.data?.message || error.message));
    }
  };

  // Use real users filtered to show sales personnel only
  const salespersons = users
    .filter(user => user.role && ['sales_executive', 'sales_manager'].includes(user.role.toLowerCase()))
    .map(user => ({
      id: user.id,
      name: user.name || user.email
    }));

  useEffect(() => {
    // Real-time synchronization listener
    const handleSync = () => fetchLeads();
    window.addEventListener('leads:changed', handleSync);
    return () => window.removeEventListener('leads:changed', handleSync);
  }, [fetchLeads]);

  // Memoized filtered leads to prevent infinite loops and improve performance
  const filteredLeads = useMemo(() => {
    let filtered = leads || [];

    if (filters.leadId) {
      filtered = filtered.filter((lead) =>
        (lead.leadId || '').toLowerCase().includes(filters.leadId.toLowerCase())
      );
    }

    if (filters.companyName) {
      filtered = filtered.filter((lead) =>
        (lead.companyName || '').toLowerCase().includes(filters.companyName.toLowerCase())
      );
    }

    if (filters.clientName) {
      filtered = filtered.filter((lead) =>
        (lead.clientName || '').toLowerCase().includes(filters.clientName.toLowerCase())
      );
    }



    if (filters.source) {
      filtered = filtered.filter((lead) => lead.source === filters.source);
    }

    if (filters.priority) {
      filtered = filtered.filter((lead) => lead.priority === filters.priority);
    }

    if (filters.status) {
      filtered = filtered.filter((lead) => lead.status === filters.status);
    }

    if (filters.country) {
      filtered = filtered.filter((lead) => lead.country === filters.country);
    }

    if (filters.salesPerson) {
      filtered = filtered.filter((lead) => (lead.salesPerson === filters.salesPerson || lead.assignedTo === filters.salesPerson));
    }

    return filterByDateRange(filtered, dateRange.start, dateRange.end, "createdAt");
  }, [filters, leads, dateRange]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange]);

  // Removed duplicate leads:changed event listener to prevent memory leaks and double API calls

  // Deep-link effect: handle navigation from search results
  useEffect(() => {
    if (navigationData?.id && leads.length > 0) {
      const lead = leads.find(l => l.id === navigationData.id);
      if (lead) {
        setEditingLead(lead);
        setShowLeadForm(true);
      }
    }
  }, [navigationData, leads]);

  const handleCreateLead = () => {
    setEditingLead(null);
    setShowLeadForm(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
  };

  const handleViewLead = (lead) => {
    const resolvedLead = {
      ...lead,
      salesPersonResolvedName: getUserName(lead.salesPerson) || lead.salesPersonName || lead.salesPerson || lead.assignedTo || '-'
    };
    setViewingLead(resolvedLead);
    setShowLeadView(true);
  };

  const handlePrintLead = (lead) => {
    const resolvedLead = {
      ...lead,
      salesPersonResolvedName: getUserName(lead.salesPerson) || lead.salesPersonName || lead.salesPerson || lead.assignedTo || '-'
    };
    setViewingLead(resolvedLead);
    setShowPrintModal(true);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setShowPrintModal(false);
      }
    }, 500);
  };

  const handleDownloadPDF = async (lead) => {
    try { await api.post('/document-activity/doc/' + (lead?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    const resolvedLead = {
      ...lead,
      salesPersonResolvedName: getUserName(lead.salesPerson) || lead.salesPersonName || lead.salesPerson || lead.assignedTo || '-'
    };
    setViewingLead(resolvedLead);
    setShowPrintModal(true);
    setTimeout(async () => {
      if (printRef.current) {
        showSuccess('Generating PDF...');
        const filename = `Lead_${(lead.companyName || lead.name || 'Lead').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
        const result = await downloadPDF(printRef.current, filename);
        if (!result?.success) showError('Failed to generate PDF');
        setShowPrintModal(false);
      }
    }, 800);
  };

  const handleDeleteLead = (leadId) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await removeLead(leadId);
          showSuccess('Lead deleted successfully');
        } catch (err) {
          console.error('❌ Delete error:', err);
          showError('Failed to delete lead: ' + (err.response?.data?.message || err.message));
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };


  const handleToggleLeadStatus = (lead) => {
    setConfirmConfig({
      title: 'Toggle Lead Status',
      message: `Are you sure you want to toggle the status of lead "${lead.companyName}"?`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          await toggleLeadStatus(lead.id);
          showSuccess('Lead status updated successfully');
        } catch (err) {
          console.error('❌ Toggle status error:', err);
          showError('Failed to toggle lead status: ' + (err.response?.data?.message || err.message));
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleConvertLead = (lead) => {
    setConfirmConfig({
      title: 'Convert Lead to Client',
      message: `Are you sure you want to convert "${lead.companyName}" into a permanent client? This will create a new client record and mark the lead as Won.`,
      variant: 'success',
      onConfirm: async () => {
        try {
          await convertToClient({ id: lead.id, data: { assigned_salesperson: lead.assignedTo || lead.salesPerson } });
          showSuccess('Lead converted to client successfully!');
          setShowLeadView(false);
        } catch (err) {
          console.error('❌ Conversion error:', err);
          showError('Failed to convert lead: ' + (err.response?.data?.message || err.message));
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleSaveLead = async (leadData) => {
    try {
      if (editingLead) {
        await updateLead({ id: editingLead.id, data: leadData });
      } else {
        await createLead(leadData);
      }
      setShowLeadForm(false);
    } catch (err) {
      showErrorModal(err, 'Failed to Save Lead');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      leadId: '',
      companyName: '',
      clientName: '',
      country: '',
      priority: '',
      salesPerson: '',
      source: '',
      status: '',
    });
  };



  const getPriorityBadge = (priority) => {
    const variants = {
      High: 'danger',
      Medium: 'warning',
      Low: 'success',
    };
    return <Badge bg={variants[priority] || 'secondary'}>{priority}</Badge>;
  };

  const exportLeads = () => {
    const columns = [
      createColumnDef('Lead ID', 'leadId'),
      createColumnDef('Company Name', 'companyName'),
      createColumnDef('Contact Name', 'clientName'),
      createColumnDef('Phone', 'contactNumber'),
      createColumnDef('Email', 'emailId'),
      createColumnDef('Country', 'country'),
      createColumnDef('Source', 'source'),
      createColumnDef('Priority', 'priority'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredLeads, columns, 'csv', 'leads');
  };

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      await bulkActionService.bulkDelete('leads', multiSelect.getSelectedIds());
      multiSelect.clearSelection();
      await fetchLeads(); // Refresh data
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const leadBulkActions = [
    { label: 'Mark as Qualified', type: 'update', data: { status: 'Qualified' }, icon: <CheckCircle size={14} />, requireConfirm: true },
    { label: 'Mark as Contacted', type: 'update', data: { status: 'Contacted' }, icon: <CheckCircle size={14} />, requireConfirm: true },
    { label: 'Mark as Lost', type: 'update', data: { status: 'Lost' }, variant: 'danger', icon: <XCircle size={14} />, requireConfirm: true }
  ];

  const handleBulkAction = async (action) => {
    try {
      setIsSaving(true);
      const selectedIds = multiSelect.getSelectedIds();
      
      if (action.type === 'update') {
        await bulkActionService.bulkUpdate('leads', selectedIds, action.data);
      }
      
      multiSelect.clearSelection();
      if (fetchLeads) await fetchLeads(); // Refresh data
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportData = async (importData) => {
    try {
      showSuccess(`Starting import of ${importData.length} leads...`);
      let successCount = 0;
      
      for (const data of importData) {
        try {
          await createLead({
            company_name: data.companyName || data.company_name || '',
            contact_person_name: data.clientName || data.contact_person_name || '',
            email_id: data.emailId || data.email_id || '',
            contact_number: data.contactNumber || data.contact_number || '',
            country: data.country || '',
            city: data.city || '',
            source: data.source || 'Import',
            priority: data.priority || 'Medium',
            status: 'New',
            notes: `Imported on ${new Date().toLocaleDateString()}`
          });
          successCount++;
        } catch (err) {
          console.error('Failed to import lead row:', data, err);
        }
      }
      
      showSuccess(`Successfully imported ${successCount} leads.`);
      if (fetchLeads) fetchLeads();
    } catch (err) {
      showError('Import failed: ' + err.message);
    } finally {
      setShowImportModal(false);
    }
  };
  // Check permissions
  // Professional Role-Based Access Control (RBAC) with administrative fallbacks
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = ['super_admin', 'company_admin', 'admin'].includes(userRole);
  const hasGlobalPermission = currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('company_all');
  
  const canManageLeads =
    isAdmin ||
    hasGlobalPermission ||
    currentUser?.permissions?.includes('lead_management');

  if (!canManageLeads) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Lead Management.</p>
      </div>
    );
  }

  const canEdit = [
    'super_admin',
    'company_admin',
    'sales_manager',
    'sales_executive',
  ].includes(currentUser?.role);
  const canDelete = ['super_admin', 'company_admin'].includes(
    currentUser?.role
  );

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading leads...</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Title */}
      <Row className="mb-2 mb-md-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark mobile-compact-title">Lead Management</h2>
          <p className="text-muted mobile-compact-subtitle">Track potential customers, manage sales inquiries, and follow-up activities</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Target size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Leads</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><UsersIcon size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>New Leads</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.new}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><TrendingUp size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Qualified</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.qualified}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><CheckCircle size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Won Leads</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.converted}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <XCircle size={18} className="text-danger" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Lost</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{leads.filter(l => l.status === 'Lost').length}</h5>
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

      {/* Collapsible Filter Panel */}
      <FilterPanel 
        onClear={resetFilters} 
        title="Search & Filters"
      >
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Lead ID</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Lead ID"
                    value={filters.leadId}
                    onChange={(e) => handleFilterChange('leadId', e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Company Name</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.companyName}
                  onChange={(e) => handleFilterChange('companyName', e.target.value)}
                >
                  <option value="">All Companies</option>
                  {[...new Set(leads.map(l => l.companyName).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Client Firm Name</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.clientName}
                  onChange={(e) => handleFilterChange('clientName', e.target.value)}
                >
                  <option value="">All Clients</option>
                  {[...new Set(leads.map(l => l.clientName).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Country</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                >
                  <option value="">All Countries</option>
                  {[...new Set(leads.map(l => l.country).filter(Boolean))].sort().map((country, idx) => (
                    <option key={idx} value={country}>{country}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Priority</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Sales Person</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.salesPerson}
                  onChange={(e) => handleFilterChange('salesPerson', e.target.value)}
                >
                  <option value="">All Sales Persons</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Source</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                >
                  <option value="">All Sources</option>
                  <option value="Website">Website</option>
                  <option value="Trade Show">Trade Show</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
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

      <BulkActionBar
        selectedCount={multiSelect.getSelectedCount()}
        onSelectAll={(shouldSelect) => {
          if (shouldSelect) {
            multiSelect.toggleSelectAll(filteredLeads);
          } else {
            multiSelect.clearSelection();
          }
        }}
        onClearSelection={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        isLoading={isSaving}
        selectAllChecked={multiSelect.selectAll}
        totalItems={filteredLeads.length}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        actions={leadBulkActions}
        onAction={handleBulkAction}
      />

      {/* Leads Table */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Leads ({filteredLeads.length})</h5>
          <div className="d-flex gap-2 flex-wrap align-items-center justify-content-end">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportLeads}
              className="border-white text-white d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Download size={14} className="me-1" />
              <span className="d-none d-md-inline small">Export</span>
            </Button>
            {canEdit && (
              <>
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
                <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateLead} style={{ width: 'auto' }}>
                  <Plus size={16} className="me-1" />
                  <span className="d-none d-sm-inline small">Create Lead</span>
                  <span className="d-sm-none small">Create</span>
                </Button>
              </>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive d-none d-lg-block">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr className="table-light text-muted small text-uppercase">
                  <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredLeads)}
                      title="Select All"
                    />
                  </th>
                  <th>Status</th>
                  <th>Lead ID</th>
                  <th>Company Name</th>
                  <th>Client Firm Name</th>
                  <th>Country</th>
                  <th>Priority</th>
                  <th>Sales Person</th>
                  <th>Created Date</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead, index) => (
                    <tr key={lead.id} className={multiSelect.isSelected(lead.id) ? 'table-active' : ''}>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(lead.id)}
                          onChange={() => multiSelect.toggleSelect(lead.id)}
                        />
                      </td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td className="fw-semibold text-primary">{lead.leadId}</td>
                      <td>{lead.companyName}</td>
                      <td>{lead.clientName}</td>
                      <td>{lead.country}</td>
                      <td>{getPriorityBadge(lead.priority)}</td>
                      <td>{getUserName(lead.salesPerson) || lead.salesPersonName || lead.salesPerson || lead.assignedTo || '-'}</td>
                      <td>{formatDisplayDate(lead.createdDate)}</td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewLead(lead)}
                            title="View Inquiry"
                          >
                            <Eye size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handleEditLead(lead)}
                              title="Edit Lead"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(lead)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant={lead.status === 'Converted' || lead.status === 'Qualified' ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              className={lead.status === 'Converted' || lead.status === 'Qualified' ? 'border-warning-subtle' : 'border-success-subtle'}
                              onClick={() => handleToggleLeadStatus(lead)}
                              title="Toggle Status"
                            >
                              <Power size={14} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-danger border-danger-subtle"
                              onClick={() => handleDeleteLead(lead.id)}
                              title="Delete Lead"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center py-5 text-muted">
                      No leads found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedLeads.length > 0 ? (
              paginatedLeads.map((lead, index) => (
                <Card key={lead.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{lead.companyName}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {lead.leadId}</div>
                      </div>
                      <div className="status-container d-flex flex-column align-items-end gap-1">
                        <StatusBadge status={lead.status} />
                        <Badge bg={lead.priority === 'High' ? 'danger' : lead.priority === 'Medium' ? 'warning' : 'success'} className="small">{lead.priority}</Badge>
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                          <div className="text-dark fw-bold">{lead.clientName || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Country:</label>
                          <div className="text-dark">{lead.country}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Sales Person:</label>
                          <div className="text-dark">{getUserName(lead.salesPerson) || lead.salesPersonName || lead.salesPerson || lead.assignedTo || '-'}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewLead(lead)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleEditLead(lead)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(lead)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintLead(lead)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${lead.status === 'Converted' || lead.status === 'Qualified' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold`}
                          onClick={() => handleToggleLeadStatus(lead)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Power size={14} className="me-1" /> Status
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleDeleteLead(lead.id)}
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
                No leads found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredLeads.length} pageSize={PAGE_SIZE} />
      </Card>

      {/* Lead Form Modal */}
      {showLeadForm && (
        <LeadForm
          lead={editingLead}
          onSave={handleSaveLead}
          onCancel={() => setShowLeadForm(false)}
          salespersons={salespersons}
          clients={clients}
        />
      )}

      {/* Lead View Modal */}
      {showLeadView && (
        <LeadView
          lead={viewingLead}
          onClose={() => setShowLeadView(false)}
          onEdit={() => {
            setShowLeadView(false);
            handleEditLead(viewingLead);
          }}
          onPrint={() => {
            setShowLeadView(false);
            handlePrintLead(viewingLead);
          }}
          onConvert={handleConvertLead}
          canEdit={canEdit}
        />
      )}

      {/* Lead Print Modal */}
      {showPrintModal && viewingLead && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Lead Inquiry Print — {viewingLead.companyName || viewingLead.name}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printRef}>
              <LeadPrintView leadData={viewingLead} />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={selectedDocument?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="leads"
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
        variant={confirmConfig.variant}
        confirmText="Confirm"
      />


      {/* Validation Error Modal */}
      <ValidationErrorModal
        show={errorModalConfig.show}
        onHide={() => setErrorModalConfig({ ...errorModalConfig, show: false })}
        errors={errorModalConfig.errors}
        title={errorModalConfig.title}
        message={errorModalConfig.message}
      />

      <style>{`
        .lead-mobile-card {
          transition: transform 0.2s ease;
        }
        
        .lead-mobile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 576px) {
          .lead-mobile-card {
            margin: 0.5rem !important;
          }
          
          .lead-mobile-card .card-body {
            padding: 1rem;
          }
          
          .lead-mobile-card h6 {
            font-size: 0.9rem;
          }
          
          .lead-mobile-card .small {
            font-size: 0.75rem;
          }
          
          .lead-mobile-card .btn {
            font-size: 0.75rem;
            padding: 0.375rem 0.5rem;
          }
        }
      `}</style>
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

export default LeadDashboard;
