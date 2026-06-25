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

import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RotateCcw,
  Users,
  Power,
  Printer,
  Target,
  Users as UsersIcon,
  CheckCircle,
  TrendingUp,
  XCircle
} from 'lucide-react';
import SalespersonForm from './SalespersonForm.jsx';
import SalespersonView from './SalespersonView.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import FilterPanel from '../shared/FilterPanel.jsx';
import PaginationControls from '../common/PaginationControls.jsx';
import DateRangeFilter, { filterByDateRange } from '../common/DateRangeFilter.jsx';
import { useUsers } from '../../hooks/useUsers.js';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import UserService from '../../services/userService.js';
import { formatPrice, formatDisplayDate } from '../../utils/formatters.js';
import SalespersonPrintView from './SalespersonPrintView.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { useRef } from 'react';
import { Modal } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import { useMasterData } from '../../hooks/useMasterData';



function SalespersonDashboard({ currentUser }) {
  const { users, loading, error, fetchUsers, createUser: create, updateUser, deleteUser, toggleUserStatus } = useUsers();
  const { countries: masterCountries, cities: masterCities, fetchCitiesByCountry } = useMasterData();
  const [salespersons, setSalespersons] = useState([]);
  const [filteredSalespersons, setFilteredSalespersons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showSalespersonForm, setShowSalespersonForm] = useState(false);
  const [showSalespersonView, setShowSalespersonView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState(null);
  const [viewingSalesperson, setViewingSalesperson] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    emailId: '',
    department: '',
    country: '',
    city: '',
    status: '',
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    // Real-time synchronization listener
    const handleSync = () => fetchUsers();
    window.addEventListener('users:changed', handleSync);
    return () => window.removeEventListener('users:changed', handleSync);
  }, [fetchUsers]);

  useEffect(() => {
    if (users && users.length > 0) {
      const filteredByRole = users.filter(user =>
        ['sales_manager', 'sales_executive'].includes(user.role)
      );

      setSalespersons(filteredByRole);
    }
  }, [users]);

  const dashboardStats = {
    total: (salespersons || []).length,
    active: (salespersons || []).filter((s) => s.status === 'Active').length,
    inactive: (salespersons || []).filter((s) => s.status === 'Inactive').length,
    totalTarget: (salespersons || []).reduce((sum, s) => sum + (s.salesTarget || 0), 0),
  };

  useEffect(() => {
    let filtered = salespersons;

    if (filters.name) {
      filtered = filtered.filter(
        (salesperson) =>
          (salesperson.name || '').toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.emailId) {
      filtered = filtered.filter(
        (salesperson) =>
          (salesperson.emailId || '').toLowerCase().includes(filters.emailId.toLowerCase())
      );
    }

    if (filters.department) {
      filtered = filtered.filter((salesperson) => salesperson.department === filters.department);
    }

    if (filters.country) {
      filtered = filtered.filter((salesperson) => salesperson.country === filters.country);
    }

    if (filters.city) {
      filtered = filtered.filter((salesperson) => (salesperson.city || '').toLowerCase().includes(filters.city.toLowerCase()));
    }

    if (filters.status) {
      filtered = filtered.filter((salesperson) => salesperson.status === filters.status);
    }

    filtered = filterByDateRange(filtered, dateRange.start, dateRange.end, "created_at");
    setFilteredSalespersons(filtered);
    setCurrentPage(1);
  }, [filters, salespersons, dateRange]);

  useEffect(() => {
    if (filters.country) {
      const selectedCountry = masterCountries.find(c => c.countryName === filters.country);
      if (selectedCountry) {
        fetchCitiesByCountry(selectedCountry.countryCode);
      }
    }
  }, [filters.country, masterCountries, fetchCitiesByCountry]);

  const handleCreateSalesperson = () => {
    setEditingSalesperson(null);
    setShowSalespersonForm(true);
  };

  const handleEditSalesperson = async (salesperson) => {
    try {
      const response = await UserService.getUserById(salesperson.id);
      const userData = response?.data || response;
      setEditingSalesperson(userData);
      setShowSalespersonForm(true);
    } catch (err) {
      console.error('Error fetching salesperson:', err);
      showError('Failed to load salesperson details: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewSalesperson = async (salesperson) => {
    try {
      const response = await UserService.getUserById(salesperson.id);
      const userData = response?.data || response;
      setViewingSalesperson(userData);
      setShowSalespersonView(true);
    } catch (err) {
      console.error('Error fetching salesperson:', err);
      showError('Failed to load salesperson details: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrintSalesperson = async (salesperson) => {
    try { await api.post('/document-activity/doc/' + (salesperson?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    try {
      const response = await UserService.getUserById(salesperson.id);
      const userData = response?.data || response;
      setViewingSalesperson(userData);
      setShowPrintModal(true);
      setTimeout(() => {
        if (printRef.current) {
          window.print();
          setShowPrintModal(false);
        }
      }, 500);
    } catch (err) {
      showError('Failed to load salesperson for printing');
    }
  };

  const handleDownloadPDF = async (salesperson) => {
    try { await api.post('/document-activity/doc/' + (salesperson?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      const response = await UserService.getUserById(salesperson.id);
      const userData = response?.data || response;
      setViewingSalesperson(userData);
      setShowPrintModal(true);
      setTimeout(async () => {
        if (printRef.current) {
          showSuccess('Generating PDF...');
          const filename = `Salesperson_${(userData.name || 'Sales').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
          const result = await downloadPDF(printRef.current, filename);
          if (!result?.success) showError('Failed to generate PDF');
        }
        setShowPrintModal(false);
      }, 800);
    } catch (err) {
      showError('Failed to generate PDF');
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const handleDeleteSalesperson = (salespersonId) => {
    setDeleteTargetId(salespersonId);
  };

  const confirmDeleteSalesperson = async () => {
    try {
      await deleteUser(deleteTargetId);
      showSuccess('Salesperson deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      showError('Failed to delete salesperson');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, variant: 'danger' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleToggleStatus = (salesperson) => {
    const newStatus = salesperson.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmConfig({
      title: `${newStatus === 'Active' ? 'Activate' : 'Deactivate'} Salesperson`,
      message: `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} salesperson "${salesperson.name}"?`,
      variant: newStatus === 'Active' ? 'success' : 'warning',
      onConfirm: async () => {
        try {
          await toggleUserStatus(salesperson.id);
          showSuccess(`Salesperson ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
        } catch (err) {
          console.error('❌ Toggle status error:', err);
          showError('Failed to toggle salesperson status');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleSaveSalesperson = async (salespersonData) => {
    try {
      if (editingSalesperson) {
        await updateUser({ id: editingSalesperson.id, data: salespersonData });
        showSuccess('Salesperson updated successfully');
      } else {
        const newData = {
          ...salespersonData,
          role: 'sales_executive',
          password: 'TempPassword@123'
        };
        await create(newData);
        showSuccess('Salesperson created successfully');
      }
      setShowSalespersonForm(false);
      setEditingSalesperson(null);
    } catch (err) {
      showError('Failed to save salesperson: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      name: '',
      emailId: '',
      department: '',
      country: '',
      city: '',
      status: '',
    });
  };

  const exportSalespersons = () => {
    const columns = [
      createColumnDef('Name', 'name'),
      createColumnDef('Email', 'emailId'),
      createColumnDef('Contact Number', 'contactNumber'),
      createColumnDef('Employee ID', 'employeeId'),
      createColumnDef('Department', 'department'),
      createColumnDef('Country', 'country'),
      createColumnDef('City', 'city'),
      createColumnDef('Sales Target', 'salesTarget'),
      createColumnDef('Commission', 'commission'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredSalespersons, columns, 'xlsx', 'salespersons', typeof currentUser !== 'undefined' ? currentUser?.role === 'super_admin' : false);
    showSuccess('Salespersons exported to Excel successfully!');
  };

  const handleImportData = async (importData) => {
    try {
      let successCount = 0;
      for (const data of importData) {
        try {
          await create({
            name: data.name || data.Name || '',
            emailId: data.emailId || data.email_id || data.Email || '',
            contactNumber: data.contactNumber || data.contact_number || data['Contact Number'] || '',
            employeeId: data.employeeId || data.employee_id || data['Employee ID'] || '',
            department: data.department || data.Department || '',
            country: data.country || data.Country || '',
            city: data.city || data.City || '',
            salesTarget: parseFloat(data.salesTarget || data.sales_target || data['Sales Target'] || 0),
            commission: parseFloat(data.commission || data.Commission || 0),
            status: data.status || data.Status || 'Active',
            role: 'sales_executive',
          });
          successCount++;
        } catch (itemErr) {
          console.error('Error importing individual salesperson:', itemErr);
        }
      }
      showSuccess(`Successfully imported ${successCount} out of ${importData.length} salespersons`);
    } catch (err) {
      showError('Failed to import salespersons: ' + err.message);
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  const totalPages = Math.ceil(filteredSalespersons.length / PAGE_SIZE);
  const paginatedSalespersons = filteredSalespersons.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="py-4">
        <Skeleton type="card" rows={4} className="mb-4" />
        <Skeleton type="table" rows={10} />
      </div>
    );
  }

  return (
    <>
      {/* Page Title & Breadcrumbs Section */}
      <div className="dashboard-header-modern mb-4">
        <Row className="align-items-center">
          <Col md={7}>
            <h2 className="mb-1 fw-bold text-dark tracking-tight">Salesperson Management</h2>
            <p className="text-muted small mb-0">Manage your sales team, track performance targets, and territories</p>
          </Col>
          <Col md={5} className="text-md-end mt-3 mt-md-0">
            <div className="d-flex gap-2 justify-content-md-end">
              <Button variant="outline-primary" size="sm" onClick={() => fetchUsers()} className="rounded-pill px-3">
                <RotateCcw size={14} className="me-1" /> Refresh
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><UsersIcon size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Salespersons</p>
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
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active</p>
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
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Target</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>₹{(dashboardStats.totalTarget / 100000).toFixed(1)}L</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><XCircle size={18} className="text-danger" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Inactive</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.inactive}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => fetchUsers()} className="mx-3 mt-3">
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
            <Col lg={2} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Name</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                >
                  <option value="">All Names</option>
                  {[...new Set(salespersons.map(s => s.name).filter(Boolean))].sort().map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Email</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.emailId}
                  onChange={(e) => handleFilterChange('emailId', e.target.value)}
                >
                  <option value="">All Emails</option>
                  {[...new Set(salespersons.map(s => s.emailId).filter(Boolean))].sort().map((email, idx) => (
                    <option key={idx} value={email}>{email}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Department</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                >
                  <option value="">All Departments</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Business Development">Business Development</option>
                  <option value="Customer Service">Customer Service</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Country</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                >
                  <option value="">All Countries</option>
                  {masterCountries.map(c => (
                    <option key={c.countryCode} value={c.countryName}>{c.countryName}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">City</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  disabled={!filters.country}
                >
                  <option value="">All Cities</option>
                  {masterCities.map(c => (
                    <option key={c.id || c.cityName} value={c.cityName}>
                      {c.cityName} {c.stateProvince ? `(${c.stateProvince})` : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle rounded-3"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                                    <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </FilterPanel>


      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Salespersons ({filteredSalespersons.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportSalespersons}
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
              <Button
                variant="light"
                size="sm"
                className="text-primary fw-bold d-flex align-items-center flex-shrink-0"
                onClick={handleCreateSalesperson}
                style={{ width: 'auto' }}
              >
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Salesperson</span>
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
                  <th>Status</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Country</th>
                  <th>City</th>
                  <th>Sales Target</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSalespersons.length > 0 ? (
                  paginatedSalespersons.map((salesperson, index) => (
                    <tr key={salesperson.id}>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td><StatusBadge status={salesperson.status} /></td>
                      <td className="fw-semibold text-primary">{salesperson.name}</td>
                      <td>{salesperson.emailId}</td>
                      <td>{salesperson.department || '-'}</td>
                      <td>{salesperson.country || '-'}</td>
                      <td>{salesperson.city || '-'}</td>
                      <td>₹{(salesperson.salesTarget / 100000).toFixed(1)}L</td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewSalesperson(salesperson)}
                            title="View Profile"
                          >
                            <Eye size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handleEditSalesperson(salesperson)}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(salesperson)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && (
                            <Button
                              variant={salesperson.status === 'Active' ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              className={salesperson.status === 'Active' ? 'border-warning-subtle text-warning' : 'border-success-subtle text-success'}
                              onClick={() => handleToggleStatus(salesperson)}
                              title={salesperson.status === 'Active' ? 'Deactivate' : 'Activate'}
                            >
                              <Power size={14} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-danger border-danger-subtle"
                              onClick={() => handleDeleteSalesperson(salesperson.id)}
                              title="Delete"
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
                    <td colSpan="8" className="text-center py-5 text-muted">
                      No salespersons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedSalespersons.length > 0 ? (
              paginatedSalespersons.map((salesperson, index) => (
                <Card key={salesperson.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{salesperson.name}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {salesperson.department}</div>
                      </div>
                      <div className="status-container">
                        <StatusBadge status={salesperson.status} />
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Email:</label>
                          <div className="text-dark">{salesperson.emailId}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Country:</label>
                          <div className="text-dark">{salesperson.country || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">City:</label>
                          <div className="text-dark">{salesperson.city || '-'}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Target:</label>
                          <div className="text-dark fw-bold">₹{(salesperson.salesTarget / 100000).toFixed(1)}L</div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewSalesperson(salesperson)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleEditSalesperson(salesperson)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(salesperson)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintSalesperson(salesperson)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${salesperson.status === 'Active' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold`}
                          onClick={() => handleToggleStatus(salesperson)}
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
                          onClick={() => handleDeleteSalesperson(salesperson.id)}
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
                No salespersons found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredSalespersons.length}
          pageSize={PAGE_SIZE}
        />
      </Card>

      {showSalespersonForm && (
        <SalespersonForm
          salesperson={editingSalesperson}
          onSave={handleSaveSalesperson}
          onCancel={() => setShowSalespersonForm(false)}
        />
      )}

      {showSalespersonView && viewingSalesperson && (
        <SalespersonView
          salesperson={viewingSalesperson}
          onClose={() => setShowSalespersonView(false)}
          onEdit={() => {
            setShowSalespersonView(false);
            handleEditSalesperson(viewingSalesperson);
          }}
          onPrint={() => {
            setShowSalespersonView(false);
            handlePrintSalesperson(viewingSalesperson);
          }}
        />
      )}

      {/* Salesperson Print Modal */}
      {showPrintModal && viewingSalesperson && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Salesperson Profile Print — {viewingSalesperson.name}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printRef}>
              <SalespersonPrintView salespersonData={viewingSalesperson} />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={selectedDocument?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {showImportModal && (
        <ImportModal
          show={showImportModal}
          onHide={() => setShowImportModal(false)}
          onImport={handleImportData}
          moduleType="users"
        />
      )}

      <ConfirmationModal
        show={!!deleteTargetId || showConfirmModal}
        onHide={() => {
          setDeleteTargetId(null);
          setShowConfirmModal(false);
        }}
        title={deleteTargetId ? "Confirm Delete" : confirmConfig.title}
        message={deleteTargetId ? "Are you sure you want to delete this salesperson? This action cannot be undone." : confirmConfig.message}
        variant={deleteTargetId ? "danger" : confirmConfig.variant}
        onConfirm={deleteTargetId ? confirmDeleteSalesperson : confirmConfig.onConfirm}
      />
      <style>{`
        .pl-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
          border: 1px solid #f1f5f9 !important;
        }
        .dashboard-header-modern h2 {
          letter-spacing: -0.02em;
        }
        .hover-lift {
          transition: all 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2) !important;
        }
        .detail-item label {
          letter-spacing: 0.5px;
          color: #94a3b8;
          font-size: 0.7rem;
        }
        .detail-item div {
          font-weight: 600;
          font-size: 0.9rem;
          color: #1e293b;
        }
        .bg-light-subtle {
          background-color: #fcfdfe;
        }
        .icon-box {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .stats-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stats-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05) !important;
        }
        .stats-card:hover .icon-box {
          transform: scale(1.1);
        }
        .bg-primary-light { background-color: #eff6ff; }
        .bg-warning-light { background-color: #fffbeb; }
        .bg-info-light { background-color: #ecfeff; }
        .bg-success-light { background-color: #f0fdf4; }
        .bg-danger-light { background-color: #fef2f2; }
        
        .tracking-tight { letter-spacing: -0.02em; }
        .table-card { border-radius: 16px !important; }
        
        @media (max-width: 768px) {
          .stats-card h5 { font-size: 1.1rem; }
          .stats-card .extra-small { font-size: 0.65rem; }
        }
      `}</style>
    </>
  );
}

export default SalespersonDashboard;
