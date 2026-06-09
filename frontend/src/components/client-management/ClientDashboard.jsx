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
import { Plus, Search, Edit, Trash2, Eye, Download, Upload, RotateCcw, Building, Power, Trash, Printer, Users as UsersIcon, CheckCircle, XCircle, TrendingUp, DollarSign, Check } from 'lucide-react';
import ClientForm from './ClientForm.jsx';
import ClientView from './ClientView.jsx';
import ClientPrintView from './ClientPrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { useRef } from 'react';
import FilterPanel from '../shared/FilterPanel.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import ImportModal from '../shared/ImportModal.jsx';

import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import bulkDeleteService from '../../services/bulkDeleteService.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import { formatPrice } from '../../utils/formatters.js';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';


function ClientDashboard({ currentUser, clientsData, usersData, navigationData }) {
  // Use props if provided, otherwise call hooks (for backward compatibility)
  const clientsHook = useClients();
  const usersHook = useUsers();

  const { clients, loading, error, fetchClients, createClient, updateClient, deleteClient, toggleClientStatus } = clientsData || clientsHook;
  const { users, loading: usersLoading } = usersData || usersHook;
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showClientForm, setShowClientForm] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [confirmPendingData, setConfirmPendingData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);

  // Multi-select hook
  const multiSelect = useMultiSelect(clients);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [filters, setFilters] = useState({
    clientFirmName: '',
    contactPerson: '',
    country: '',
    assignedSales: '',
    businessType: '',
  });

  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    variant: 'danger'
  });

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
  const salespersons = useMemo(() => users
    .filter(user => user.role && ['sales_executive', 'sales_manager', 'company_admin'].includes(user.role.toLowerCase()))
    .map(user => ({
      id: user.id,
      name: user.name || user.email,
      role: user.role
    })), [users]);

  // Helper function to get salesperson name from ID
  const getSalespersonName = (salespersonId) => {
    if (!salespersonId) return 'Unassigned';
    const person = salespersons.find(sp => sp.id === salespersonId);
    return person ? person.name : 'Unassigned';
  };

  const dashboardStats = useMemo(() => ({
    total: (clients || []).length,
    active: (clients || []).filter((client) => client.status === 'Active').length,
    inactive: (clients || []).filter((client) => client.status === 'Inactive').length,
    totalValue: (clients || []).reduce(
      (sum, client) => sum + (client.totalOrderValue || 0),
      0
    ),
  }), [clients]);

  const filteredClients = useMemo(() => {
    let filtered = clients;

    if (filters.clientFirmName) {
      filtered = filtered.filter(
        (client) =>
          client.clientName?.toLowerCase().includes(filters.clientFirmName.toLowerCase())
      );
    }

    if (filters.contactPerson) {
      filtered = filtered.filter(
        (client) =>
          client.contactPersonName?.toLowerCase().includes(filters.contactPerson.toLowerCase())
      );
    }

    if (filters.country) {
      filtered = filtered.filter(
        (client) => client.country === filters.country
      );
    }

    if (filters.businessType) {
      filtered = filtered.filter(
        (client) => client.businessType === filters.businessType
      );
    }



    if (filters.assignedSales) {
      filtered = filtered.filter(
        (client) => client.assignedSalesperson === filters.assignedSales
      );
    }

    return filterByDateRange(filtered, dateRange.start, dateRange.end, "created_at");
  }, [filters, clients, dateRange]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange]);

  // Real-time synchronization listener
  useEffect(() => {
    const handleSync = () => {
      if (fetchClients) fetchClients();
    };
    window.addEventListener('clients:changed', handleSync);
    return () => window.removeEventListener('clients:changed', handleSync);
  }, [fetchClients]);

  // Deep-link effect: handle navigation from search results
  useEffect(() => {
    if (navigationData?.id && clients.length > 0) {
      const client = clients.find(c => c.id === navigationData.id);
      if (client) {
        setEditingClient(client);
        setShowClientForm(true);
      }
    }
  }, [navigationData, clients]);

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleViewClient = (client) => {
    setViewingClient(client);
    setShowClientView(true);
  };

  const handlePrintClient = (client) => {
    setViewingClient(client);
    setShowPrintModal(true);
    setTimeout(() => {
      if (printRef.current) window.print();
    }, 500);
  };

  const handleDownloadPDF = async (client) => {
    try { await api.post('/document-activity/doc/' + (client?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    setViewingClient(client);
    setShowPrintModal(true);
    setTimeout(async () => {
      if (printRef.current) {
        showSuccess('Generating PDF...');
        const filename = `Client_${(client.clientName || client.name).replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
        const result = await downloadPDF(printRef.current, filename);
        if (!result?.success) showError('Failed to generate PDF');
      }
      setShowPrintModal(false);
    }, 800);
  };

  const handleDeleteClient = (clientId) => {
    setDeleteTargetId(clientId);
  };

  const confirmDeleteClient = async () => {
    try {
      await deleteClient(deleteTargetId);
      showSuccess('Client deleted successfully');
    } catch (err) {
      console.error('❌ Delete error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete client';
      showError(msg);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleToggleClientStatus = (client) => {
    const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmConfig({
      title: `${newStatus === 'Active' ? 'Activate' : 'Deactivate'} Client`,
      message: `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} client "${client.clientName}"?`,
      variant: newStatus === 'Active' ? 'success' : 'warning',
      onConfirm: async () => {
        try {
          await toggleClientStatus(client.id);
          showSuccess(`Client ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
        } catch (err) {
          console.error('❌ Toggle status error:', err);
          showError('Failed to toggle client status');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleSaveClient = (clientData) => {
    if (editingClient?.id) {
      setConfirmPendingData(clientData);
      setShowConfirmModal(true);
    } else {
      performSaveClient(clientData);
    }
  };

  const performSaveClient = async (clientData) => {
    setIsSaving(true);
    try {
      if (editingClient?.id) {
        await updateClient({ id: editingClient.id, data: clientData });
        showSuccess('Client updated successfully! All modules are synced.');
      } else {
        await createClient(clientData);
        showSuccess('Client created successfully!');
      }
      setShowClientForm(false);
      setEditingClient(null);
      setShowConfirmModal(false);
      setConfirmPendingData(null);
    } catch (err) {
      console.error('❌ Client save error:', err?.response?.data || err);
      showErrorModal(err, 'Failed to save client');
    } finally {
      setIsSaving(false);
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
      clientFirmName: '',
      contactPerson: '',
      country: '',
      assignedSales: '',
      businessType: '',
    });
  };



  const exportClients = () => {
    const columns = [
      createColumnDef('Client Firm Name', 'clientName'),
      createColumnDef('Contact Person', 'contactPersonName'),
      createColumnDef('Email', 'emailId'),
      createColumnDef('Phone', 'contactNumber'),
      createColumnDef('Country', 'country'),
      createColumnDef('City', 'city'),
      createColumnDef('Business Type', 'businessType'),
      createColumnDef('Status', 'status'),
      createColumnDef('Assigned Sales', 'assignedSalesperson'),
      createColumnDef('Total Value', (item) => item.totalOrderValue || 0),
    ];
    exportData(filteredClients, columns, 'csv', 'clients');
    showSuccess('Clients exported to CSV successfully!');
  };

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      const ids = Array.isArray(multiSelect.getSelectedIds)
        ? multiSelect.getSelectedIds()
        : [];

      if (!Array.isArray(ids) || ids.length === 0) {
        showError('Please select at least one client to delete');
        return;
      }

      const result = await bulkDeleteService.deleteClients(ids);

      // If backend returns deletedCount, report it; otherwise assume success
      const deleted = result?.data?.deletedCount ?? result?.deletedCount ?? null;
      multiSelect.clearSelection();
      await fetchClients(); // Refresh data

      if (deleted !== null) {
        showSuccess(`${deleted} client(s) deleted successfully`);
      } else {
        showSuccess('Selected clients deleted successfully');
      }
    } catch (err) {
      const message = err?.message || err?.error || (err?.response && err.response.data && err.response.data.message) || 'Bulk delete failed';
      showError('Bulk delete failed: ' + message);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      await bulk.bulkUpdateStatus(filteredClients, updateClient, newStatus);
      showSuccess(`${filteredClients.length} clients status updated to ${newStatus}`);
    } catch (err) {
      alert('Bulk status update failed: ' + err.message);
    }
  };

  const handleImportData = async (importData) => {
    try {
      let successCount = 0;
      for (const data of importData) {
        try {
          await createClient({
            client_name: data.clientName || data.name || data['Client Name'] || '',
            email_id: data.emailId || data.email_id || data.Email || '',
            contact_number: data.contactNumber || data.contact_number || data['Contact Number'] || '',
            country: data.country || data.Country || '',
            city: data.city || data.City || '',
            address: data.address || data.Address || '',
            website: data.website || data.Website || '',
            business_type: data.businessType || data.business_type || data['Business Type'] || 'Importer',
            contact_person_name: data.contactPersonName || data.contact_person_name || data['Contact Person'] || '',
            port_of_loading: '',
            port_of_discharge: '',
            final_destination: data.country || data.Country || '',
            currency: 'INR',
            consignee_details: '',
            buyer_details: '',
            assigned_salesperson: data.assignedSalesperson || null,
            status: data.status || data.Status || 'Active',
          });
          successCount++;
        } catch (itemErr) {
          console.error('Error importing individual client:', itemErr);
        }
      }
      showSuccess(`Successfully imported ${successCount} out of ${importData.length} clients`);
    } catch (err) {
      alert('Failed to import clients: ' + err.message);
    }
  };

  // Professional Role-Based Access Control (RBAC) with administrative fallbacks
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = ['super_admin', 'company_admin', 'admin'].includes(userRole);
  const hasGlobalPermission = currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('company_all');

  const canManageClients =
    isAdmin ||
    hasGlobalPermission ||
    currentUser?.permissions?.includes('client_management') ||
    userRole === 'client';

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const paginatedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!canManageClients) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Client Management.</p>
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading clients...</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Title */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Client Management</h2>
          <p className="text-muted">Maintain customer relationships, manage profiles, and track order history</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><UsersIcon size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Clients</p>
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
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active Clients</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><TrendingUp size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Value</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{formatPrice(dashboardStats.totalValue)}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><XCircle size={18} className="text-danger" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Inactive Clients</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.inactive}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="secondary" dismissible onClose={() => fetchClients()}>
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
            <Col lg={3} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Client Firm Name</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.clientFirmName}
                  onChange={(e) => handleFilterChange('clientFirmName', e.target.value)}
                >
                  <option value="">All Clients</option>
                  {[...new Set(clients.map(c => c.clientName).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Contact Person</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.contactPerson}
                  onChange={(e) => handleFilterChange('contactPerson', e.target.value)}
                >
                  <option value="">All Contacts</option>
                  {[...new Set(clients.map(c => c.contactPersonName).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Country</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                >
                  <option value="">All Countries</option>
                  {[...new Set(clients.map(c => c.country).filter(Boolean))].sort().map((country, idx) => (
                    <option key={idx} value={country}>{country}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Assigned Sales</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.assignedSales}
                  onChange={(e) => handleFilterChange('assignedSales', e.target.value)}
                >
                  <option value="">All Sales</option>
                  {salespersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Business Type</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.businessType}
                  onChange={(e) => handleFilterChange('businessType', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Importer">Importer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Contractor">Contractor</option>
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
            multiSelect.toggleSelectAll(filteredClients);
          } else {
            multiSelect.clearSelection();
          }
        }}
        onClearSelection={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        isLoading={isSaving}
        selectAllChecked={multiSelect.selectAll}
        totalItems={filteredClients.length}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Clients ({filteredClients.length})</h5>
          <div className="d-flex gap-2 flex-wrap align-items-center justify-content-end">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportClients}
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
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateClient} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Client</span>
                <span className="d-sm-none small">Create</span>
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive d-none d-lg-block">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr className="table-light text-muted small text-uppercase">
                  <th className="ps-4" style={{ width: '80px' }}>SR. NO.</th>
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredClients)}
                      title="Select All"
                    />
                  </th>
                  <th>Status</th>
                  <th>Client Firm Name</th>
                  <th>Contact Person</th>
                  <th>Country</th>
                  <th>Assigned Sales</th>
                  <th>Total Orders</th>
                  <th>Total Value</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length > 0 ? (
                  paginatedClients.map((client, index) => (
                    <tr key={client.id} className={multiSelect.isSelected(client.id) ? 'table-active' : ''}>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(client.id)}
                          onChange={() => multiSelect.toggleSelect(client.id)}
                        />
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1 align-items-start">
                          <StatusBadge status={client.status} />
                          <Badge bg="info" style={{ fontSize: '0.65rem' }} title="External client collaboration enabled">Portal Access</Badge>
                        </div>
                      </td>
                      <td className="fw-semibold text-primary">{client.clientName}</td>
                      <td>{client.contactPersonName || '-'}</td>
                      <td>{client.country}</td>
                      <td>{getSalespersonName(client.assignedSalesperson)}</td>
                      <td>{client.totalOrders || 0}</td>
                      <td>{formatPrice(client.totalOrderValue || 0)}</td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewClient(client)}
                            title="View Profile"
                          >
                            <Eye size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handleEditClient(client)}
                              title="Edit Client"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(client)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant={client.status === 'Active' ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              className={client.status === 'Active' ? 'border-warning-subtle text-warning' : 'border-success-subtle text-success'}
                              onClick={() => handleToggleClientStatus(client)}
                              title={client.status === 'Active' ? 'Deactivate' : 'Activate'}
                            >
                              <Power size={14} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-danger border-danger-subtle"
                              onClick={() => handleDeleteClient(client.id)}
                              title="Delete Client"
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
                    <td colSpan="10" className="p-0 border-0">
                      <EmptyState
                        title="No Clients Found"
                        description="Start by adding your first client profile to manage orders efficiently."
                        actionLabel={canEdit ? "Create Client" : null}
                        onAction={canEdit ? handleCreateClient : undefined}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedClients.length > 0 ? (
              paginatedClients.map((client, index) => (
                <Card key={client.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{client.clientName}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {client.businessType || 'N/A'}</div>
                      </div>
                      <div className="status-container d-flex flex-column align-items-end gap-1">
                        <StatusBadge status={client.status} />
                        <Badge bg="info" size="sm">Portal Access</Badge>
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Email:</label>
                          <div className="text-dark">{client.emailId}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Country:</label>
                          <div className="text-dark">{client.country}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Total Value:</label>
                          <div className="text-dark fw-bold">{formatPrice(client.totalOrderValue || 0)}</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewClient(client)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleEditClient(client)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(client)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintClient(client)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${client.status === 'Active' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold`}
                          onClick={() => handleToggleClientStatus(client)}
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
                          onClick={() => handleDeleteClient(client.id)}
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
                No clients found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredClients.length} pageSize={PAGE_SIZE} />
      </Card>

      {showClientForm && (
        <ClientForm
          client={editingClient}
          onSave={handleSaveClient}
          onCancel={() => setShowClientForm(false)}
          salespersons={salespersons}
        />
      )}

      {showClientView && viewingClient && (
        <ClientView
          client={viewingClient}
          onClose={() => setShowClientView(false)}
          onEdit={() => {
            setShowClientView(false);
            handleEditClient(viewingClient);
          }}
          onPrint={() => {
            setShowClientView(false);
            handlePrintClient(viewingClient);
          }}
          canEdit={canEdit}
        />
      )}

      {/* Client Print Modal */}
      {showPrintModal && viewingClient && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Client Profile Print — {viewingClient.clientName || viewingClient.name}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printRef}>
              <ClientPrintView clientData={viewingClient} />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={null} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Save / status-change confirmation modal */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title || "Confirm Client Update"}
        message={confirmConfig.message || `Are you sure you want to update this client? The changes will be saved and synced across all modules instantly.`}
        details={confirmConfig.details || {
          'Client Name': editingClient?.clientName,
          'Email': editingClient?.emailId,
          'Status': 'Will be updated'
        }}
        onConfirm={confirmConfig.onConfirm || (() => performSaveClient(confirmPendingData))}
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmPendingData(null);
          setConfirmConfig({ title: '', message: '', onConfirm: null, variant: 'danger' });
        }}
        isLoading={isSaving}
        confirmText="Yes, Confirm"
        cancelText="Cancel"
        variant={confirmConfig.variant || 'primary'}
      />

      {/* Delete confirmation modal */}
      <ConfirmationModal
        show={!!deleteTargetId}
        title="Confirm Delete"
        message="Are you sure you want to delete this client? This action cannot be undone."
        onConfirm={confirmDeleteClient}
        onCancel={() => setDeleteTargetId(null)}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="clients"
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
        .client-mobile-card {
          transition: transform 0.2s ease;
        }
        
        .client-mobile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 576px) {
          .client-mobile-card {
            margin: 0.5rem !important;
          }
          
          .client-mobile-card .card-body {
            padding: 1rem;
          }
          
          .client-mobile-card h6 {
            font-size: 0.9rem;
          }
          
          .client-mobile-card .small {
            font-size: 0.75rem;
          }
          
          .client-mobile-card .btn {
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

export default ClientDashboard;





