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

import { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Form, Spinner, Modal } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Plus, Search, Edit, Trash2, Eye, Download, Upload, RotateCcw, Power, Users as UsersIcon, Printer, CheckCircle, XCircle, TrendingUp, ShieldCheck } from 'lucide-react';
import UserForm from './UserForm.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { useUsers } from '../../hooks/useUsers.js';
import { useErrorModal } from '../../hooks/useErrorModal.js';
import UserService from '../../services/userService.js';
import api from '../../services/api.js';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { showSuccess } from '../shared/NotificationManager.jsx';
import PaginationControls from '../common/PaginationControls.jsx';
import UserPrintView from './UserPrintView.jsx';
import UserView from './UserView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import FilterPanel from '../shared/FilterPanel.jsx';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import PremiumCard from '../shared/PremiumCard.jsx';
import PremiumDataGrid from '../shared/PremiumDataGrid.jsx';


function UserDashboard({ currentUser, onNavigate, navigationData }) {
  const { users: apiUsers, loading, error, createUser, updateUser, deleteUser, toggleUserStatus, fetchUsers } = useUsers();
  const { showError, errors, errorTitle, showErrorModal, closeErrorModal } = useErrorModal();
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [showUserForm, setShowUserForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);

  // Visibility logic:
  // - company_admin sees everyone except other admins
  // - super_admin sees EVERYONE (unfiltered)
  const visibleUsers = useMemo(() => {
    return Array.isArray(apiUsers)
      ? apiUsers.filter((u) => {
        // Hide administrative roles from the general user list to prevent accidental deletion
        return !['super_admin', 'company_admin'].includes(u.role);
      })
      : [];
  }, [apiUsers]);

  const dashboardStats = {
    total: visibleUsers.length,
    active: visibleUsers.filter((u) => u.status === 'Active').length,
    inactive: visibleUsers.filter((u) => u.status === 'Inactive').length,
  };

  useEffect(() => {
    // Start from visible users (hide super_admin and company_admin)
    let filtered = visibleUsers;
    if (filters.search) {
      filtered = filtered.filter(
        (user) =>
          (user.name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
          (user.emailId || '').toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.role) {
      filtered = filtered.filter((user) => user.role === filters.role);
    }
    if (filters.status) {
      filtered = filtered.filter((user) => user.status === filters.status);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [filters, visibleUsers]);

  // Real-time synchronization listener
  useEffect(() => {
    const handleSync = () => {
      if (fetchUsers) fetchUsers();
    };
    window.addEventListener('users:changed', handleSync);
    return () => window.removeEventListener('users:changed', handleSync);
  }, [fetchUsers]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = async (user) => {
    try {
      const response = await UserService.getUserById(user.id);
      const userData = response?.data?.data || response?.data;
      setEditingUser(userData);
      setShowUserForm(true);
    } catch (err) {
      console.error('❌ Error fetching user:', err);
      showErrorModal(err, 'Failed to Load User');
    }
  };

  const handleViewUser = async (user) => {
    try {
      const response = await UserService.getUserById(user.id);
      const userData = response?.data?.data || response?.data;
      setViewingUser(userData);
    } catch (err) {
      console.error('❌ Error fetching user:', err);
      showErrorModal(err, 'Failed to Load User');
    }
  };

  const handlePrintUser = async (user) => {
    try { await api.post('/document-activity/doc/' + (user?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch (e) { }
    try {
      const response = await UserService.getUserById(user.id);
      const userData = response?.data?.data || response?.data;
      setViewingUser(userData);
      setShowPrintModal(true);
      setTimeout(() => {
        if (printRef.current) {
          window.print();
          setShowPrintModal(false);
        }
      }, 500);
    } catch (err) {
      showErrorModal(err, 'Failed to Load User');
    }
  };

  const handleDownloadPDF = async (user) => {
    try { await api.post('/document-activity/doc/' + (user?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch (e) { }
    try {
      const response = await UserService.getUserById(user.id);
      const userData = response?.data?.data || response?.data;
      setViewingUser(userData);
      setShowPrintModal(true);
      setTimeout(async () => {
        if (printRef.current) {
          showSuccess('Generating PDF...');
          const filename = `User_${userData.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
          const result = await downloadPDF(printRef.current, filename);
          if (!result?.success) showErrorModal(new Error('PDF generation failed'), 'Export Error');
          setShowPrintModal(false);
        }
      }, 800);
    } catch (err) {
      showErrorModal(err, 'Failed to Load User');
    }
  };

  const handleDeleteUser = (userId) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteUser(userId);
          showSuccess('User deleted successfully');
        } catch (error) {
          console.error('❌ Delete error:', error);
          showErrorModal(error, 'Failed to Delete User');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleUserStatus = (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmConfig({
      title: `${newStatus === 'Active' ? 'Activate' : 'Deactivate'} User`,
      message: `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} user "${user.name}"?`,
      variant: newStatus === 'Active' ? 'success' : 'warning',
      onConfirm: async () => {
        try {
          await toggleUserStatus(user.id);
          showSuccess(`User ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
          console.error('❌ Toggle status error:', error);
          showErrorModal(error, 'Failed to Toggle User Status');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const exportUsers = () => {
    const columns = [
      createColumnDef('Name', 'name'),
      createColumnDef('Email', 'emailId'),
      createColumnDef('Contact Number', 'contactNumber'),
      createColumnDef('Role', 'role'),
      createColumnDef('Status', 'status'),
    ];
    exportData(filteredUsers, columns, 'xlsx', 'users', typeof currentUser !== 'undefined' ? currentUser?.role === 'super_admin' : false);
    showSuccess('Users exported to Excel successfully!');
  };

  const handleImportData = async (importData) => {
    try {
      for (const data of importData) {
        await createUser({
          name: data.name || data.Name || '',
          emailId: data.emailId || data.email_id || data.Email || '',
          contactNumber: data.contactNumber || data.contact_number || data['Contact Number'] || '',
          role: data.role || data.Role || 'sales_executive',
          status: data.status || data.Status || 'Active',
          password: data.password || data.Password || 'TempPassword@123',
          confirmPassword: data.password || data.Password || 'TempPassword@123',
        });
      }
      showSuccess(`Successfully imported ${importData.length} users!`);
      resetFilters();
    } catch (err) {
      showErrorModal(err, 'Failed to Import Users');
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        await updateUser({ id: editingUser.id, data: userData });
      } else {
        await createUser(userData);
      }
      setShowUserForm(false);
      resetFilters(); // Reset filters to ensure the new/updated user is visible
    } catch (error) {
      showErrorModal(error, 'Failed to Save User');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: '',
      status: '',
    });
  };



  const userRoles = {
    company_admin: 'Company Admin',
    sales_manager: 'Sales Manager',
    sales_executive: 'Sales Executive',
    qc: 'QC',
    export_documents: 'Export Document',
    account: 'Accounter',
  };

  const canEdit = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading users...</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Title */}
      <Row className="mb-3">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">User Management</h2>
          <p className="text-muted">Manage system users, roles, and access permissions</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><UsersIcon size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Users</p>
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
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active Users</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><ShieldCheck size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Admin Access</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{apiUsers.filter(u => ['administration', 'company_admin', 'super_admin'].includes(u.role)).length}</h5>
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
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={4} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Search Users</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search by name, email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={4} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Role</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="">All Roles</option>
                  {Object.entries(userRoles).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={4} md={6} sm={12}>
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
          </Row>
        </Form>
      </FilterPanel>

      {/* Users List Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Users ({filteredUsers.length})</h5>
          <div className="d-flex gap-2 flex-wrap align-items-center justify-content-end">
            <Button
              variant="outline-light"
              size="sm"
              onClick={exportUsers}
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
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateUser} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create User</span>
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
                  <th className="ps-4" style={{ width: '80px' }}>SR. NO.</th>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id} className="align-middle">
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td><StatusBadge status={user.status} /></td>
                      <td className="fw-semibold text-primary">{user.name}</td>
                      <td>{user.emailId}</td>
                      <td>
                        <Badge bg="secondary-subtle" text="dark" className="fw-normal border">
                          {userRoles[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewUser(user)}
                            title="View Profile"
                          >
                            <Eye size={14} />
                          </Button>
                          {canEdit && user.status !== 'Deleted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-subtle"
                              onClick={() => handleEditUser(user)}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(user)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && user.status !== 'Deleted' && (
                            <Button
                              variant={user.status === 'Active' ? 'outline-danger' : 'outline-success'}
                              size="sm"
                              className={user.status === 'Active' ? 'border-danger-subtle text-danger' : 'border-success-subtle text-success'}
                              onClick={() => handleToggleUserStatus(user)}
                              title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                            >
                              <Power size={14} />
                            </Button>
                          )}
                          {canDelete && user.status !== 'Deleted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-danger border-danger-subtle"
                              onClick={() => handleDeleteUser(user.id)}
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
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user, index) => (
                <Card key={user.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{user.name}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {userRoles[user.role] || user.role}</div>
                      </div>
                      <div className="status-container">
                        <StatusBadge status={user.status} />
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Email:</label>
                          <div className="text-dark text-truncate" title={user.emailId}>
                            {user.emailId}
                          </div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Contact:</label>
                          <div className="text-dark">
                            {user.contactNumber || '-'}
                          </div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Employee ID:</label>
                          <div className="text-dark">
                            {user.employeeId || '-'}
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewUser(user)}
                        style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && user.status !== 'Deleted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleEditUser(user)}
                          style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(user)}
                        style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintUser(user)}
                        style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canEdit && user.status !== 'Deleted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${user.status === 'Active' ? 'text-danger border-danger-subtle' : 'text-success border-success-subtle'} flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold`}
                          onClick={() => handleToggleUserStatus(user)}
                          style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                        >
                          <Power size={14} className="me-1" /> Status
                        </Button>
                      )}
                      {canDelete && user.status !== 'Deleted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleDeleteUser(user.id)}
                          style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
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
                No users found
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredUsers.length} pageSize={PAGE_SIZE} />
      </Card>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          onSave={handleSaveUser}
          onCancel={() => setShowUserForm(false)}
        />
      )}

      {/* User View Modal */}
      {viewingUser && (
        <UserView
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={() => {
            const userToEdit = viewingUser;
            setViewingUser(null);
            handleEditUser(userToEdit);
          }}
          canEdit={canEdit}
          userRoles={userRoles}
        />
      )}

      {/* User Print Modal */}
      {showPrintModal && viewingUser && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>User Profile Print — {viewingUser.name}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">

              <div ref={printRef}>
                <UserPrintView userData={viewingUser} />
              </div>

            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="user" resourceId={viewingUser?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="users"
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Confirm"
        variant={confirmConfig.variant}
      />

      {/* Error Modal */}
      <ValidationErrorModal
        show={showError}
        errors={errors}
        onClose={closeErrorModal}
        title={errorTitle}
      />
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

export default UserDashboard;





