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
import { Row, Col, Card, Button, Badge, Form, Table } from 'react-bootstrap';
import FilterPanel from '../shared/FilterPanel.jsx';
import { Plus, Edit, Trash2, Eye, Power, UserCheck, Building, IndianRupee, Download, Upload, RotateCcw } from 'lucide-react';
import CompanyForm from './CompanyForm.jsx';
import CompanyView from './CompanyView.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import { exportCompanies } from '../../utils/exportUtils.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import { useCompanies } from '../../hooks/useCompanies';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { useUserContext } from '../../contexts/UserContext';

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  try {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (e) {
    return 'Never';
  }
};

function CompanyManagement({ currentUser, onNavigate }) {
  const { setSelectedCompany } = useUserContext();
  
  const { companies, loading: companiesLoading, error, fetchCompanies, createCompany, updateCompany, deleteCompany, toggleCompanyStatus, getCompanyById } = useCompanies();

  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showCompanyView, setShowCompanyView] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [loginTargetCompany, setLoginTargetCompany] = useState(null);
  const [filters, setFilters] = useState({ companyName: '', industry: '', subscriptionPlan: '', users: '', status: '' });

  const industries = [...new Set((companies || []).map(c => c.industry).filter(Boolean))].sort();
  const companyNames = [...new Set((companies || []).map(c => c.name).filter(Boolean))].sort();

  useEffect(() => {
    let filtered = companies || [];
    if (filters.companyName) filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(filters.companyName.toLowerCase()));
    if (filters.industry) filtered = filtered.filter(c => c.industry === filters.industry);
    if (filters.subscriptionPlan) filtered = filtered.filter(c => c.subscriptionPlan === filters.subscriptionPlan);
    if (filters.status) filtered = filtered.filter(c => c.status === filters.status);
    if (filters.users) filtered = filtered.filter(c => (c.totalUsers || 0).toString() === filters.users);
    setFilteredCompanies(filtered);
  }, [filters, companies]);

  const handleEditCompany = async (company) => {
    try {
      setFormLoading(true);
      const fullCompanyData = await getCompanyById(company.id);
      setEditingCompany(fullCompanyData);
      setShowCompanyForm(true);
    } catch (err) {
      showError('Failed to fetch company details: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewCompany = async (company) => {
    try {
      setFormLoading(true);
      const fullCompanyData = await getCompanyById(company.id);
      setViewingCompany(fullCompanyData);
      setShowCompanyView(true);
    } catch (err) {
      showError('Failed to fetch company details: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteCompany = async () => {
    try {
      await deleteCompany(deleteTargetId);
      showSuccess('Company deleted successfully');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete company');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleSaveCompany = async (companyData) => {
    if (saving) return;
    setSaving(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, companyData);
        showSuccess('Company updated successfully!');
      } else {
        await createCompany(companyData, true);
        showSuccess('Company registered successfully! Admin account has been created.');
      }
      setShowCompanyForm(false);
      setEditingCompany(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message || 'Failed to save company';
      showError(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (companyId) => {
    try {
      await toggleCompanyStatus(companyId);
      showSuccess('Company status updated');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to toggle company status');
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin'].includes(currentUser?.role);

  const confirmLoginAsCompany = () => {
    if (loginTargetCompany) {
      setSelectedCompany(loginTargetCompany.id);
      showSuccess(`Successfully switched to ${loginTargetCompany.name}`);
      onNavigate('dashboard');
      window.scrollTo(0, 0);
    }
    setLoginTargetCompany(null);
  };

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const getStatusBadge = (status) => {
    const variants = { Active: 'success', Suspended: 'danger', Trial: 'warning', Expired: 'secondary' };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPlanBadge = (plan) => {
    const variants = { Free: 'secondary', Basic: 'info', Pro: 'primary', Enterprise: 'success' };
    return <Badge bg={variants[plan] || 'secondary'}>{plan}</Badge>;
  };

  const handleExportCompanies = () => {
    try {
      const result = exportCompanies(filteredCompanies);
      if (result.success) showSuccess('Companies exported successfully!');
      else showError(result.message || 'Export failed');
    } catch (error) {
      showError('Failed to export companies');
    }
  };

  const handleImportData = async (importData) => {
    try {
      await Promise.all(importData.map(c => createCompany(c)));
      showSuccess(`Successfully imported ${importData.length} company(ies)`);
    } catch (error) {
      showError('Failed to import companies');
    }
  };

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Company Management</h2>
          <p className="text-muted">Onboard new companies, manage tenant settings, and monitor business status</p>
        </Col>
      </Row>

      {/* Stats Row */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        {[
          { label: 'Total Companies', value: companies?.length || 0, color: 'primary', icon: <Building size={16} className="text-primary" /> },
          { label: 'Active', value: companies?.filter(c => c.status === 'Active').length || 0, color: 'success', icon: <UserCheck size={16} className="text-success" /> },
          { label: 'Trial', value: companies?.filter(c => c.status === 'Trial').length || 0, color: 'warning', icon: <RotateCcw size={16} className="text-warning" /> },
          { label: 'Inactive', value: companies?.filter(c => c.status === 'Suspended' || c.status === 'Expired').length || 0, color: 'danger', icon: <Power size={16} className="text-danger" /> },
          { label: 'Est. MRR', value: `₹${(companies?.reduce((acc, c) => acc + (c.monthlyRevenue || 0), 0) || 0).toLocaleString()}`, color: 'info', icon: <IndianRupee size={16} className="text-info" /> },
        ].map((stat, i) => (
          <Col key={i} className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
            <Card className="text-center h-100 shadow-sm border-0">
              <Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">
                <div className={`icon-box bg-${stat.color}-light mb-1 mx-auto`} style={{ width: '32px', height: '32px' }}>{stat.icon}</div>
                <h5 className={`fw-bold mb-0 text-${stat.color}`}>{stat.value}</h5>
                <p className="text-muted extra-small mb-0 text-nowrap">{stat.label}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <FilterPanel onClear={() => setFilters({ companyName: '', industry: '', subscriptionPlan: '', users: '', status: '' })} title="Search & Filters">
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={3} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Company Name</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.companyName} onChange={e => handleFilterChange('companyName', e.target.value)}>
                  <option value="">All Companies</option>
                  {companyNames.map(name => <option key={name} value={name}>{name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Subscription</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.subscriptionPlan} onChange={e => handleFilterChange('subscriptionPlan', e.target.value)}>
                  <option value="">All Plans</option>
                  <option value="Free">Free</option>
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Users</Form.Label>
                <Form.Control type="number" className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} placeholder="Users" value={filters.users} onChange={e => handleFilterChange('users', e.target.value)} />
              </Form.Group>
            </Col>
            <Col lg={2} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Industry</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.industry} onChange={e => handleFilterChange('industry', e.target.value)}>
                  <option value="">All Industries</option>
                  {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Expired">Expired</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Registered Companies ({filteredCompanies.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            <Button variant="outline-light" size="sm" onClick={handleExportCompanies} className="border-white text-white d-flex align-items-center flex-shrink-0">
              <Download size={14} className="me-1" /><span className="d-none d-md-inline small">Export</span>
            </Button>
            <Button variant="outline-light" size="sm" onClick={() => setShowImportModal(true)} className="border-white text-white d-flex align-items-center flex-shrink-0">
              <Upload size={14} className="me-1" /><span className="d-none d-md-inline small">Import</span>
            </Button>
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => { setEditingCompany(null); setShowCompanyForm(true); }}>
              <Plus size={16} className="me-1" />
              <span className="d-none d-sm-inline small">Register Company</span>
              <span className="d-sm-none small">Register</span>
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Desktop Table */}
          {filteredCompanies.length > 0 ? (
            <div className="table-responsive d-none d-lg-block">
              <Table hover className="mb-0 align-middle">
                <thead>
                  <tr className="table-light text-muted small text-uppercase">
                    <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                    <th>Status</th>
                    <th>Health</th>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Industry</th>
                    <th>Subscription</th>
                    <th>Revenue</th>
                    <th>Users</th>
                    <th>Last Login</th>
                    <th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company, index) => (
                    <tr key={company.id}>
                      <td className="ps-4 text-center">{index + 1}</td>
                      <td>{getStatusBadge(company.status)}</td>
                      <td>
                        <Badge bg={
                          company.healthStatus === 'Healthy' ? 'success' :
                          company.healthStatus === 'At Risk' ? 'danger' :
                          company.healthStatus === 'Expiring Soon' ? 'warning' : 'secondary'
                        }>{company.healthStatus || 'Healthy'}</Badge>
                      </td>
                      <td className="fw-semibold">{company.name}</td>
                      <td>{company.contactPersonName || '-'}</td>
                      <td><small className="text-muted">{company.industry}</small></td>
                      <td>{getPlanBadge(company.subscriptionPlan)}</td>
                      <td><span className="text-muted">₹{company.monthlyRevenue || 0}</span></td>
                      <td><Badge bg="light" text="dark" className="border">{company.totalUsers || 0}</Badge></td>
                      <td><small className="text-muted">{formatDate(company.lastLogin)}</small></td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleViewCompany(company)} title="View Details"><Eye size={14} /></Button>
                          {canEdit && (
                            <>
                              <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handleEditCompany(company)} title="Edit Company"><Edit size={14} /></Button>
                              <Button variant="outline" size="sm" className={company.status === 'Active' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} onClick={() => handleStatusToggle(company.id)} title="Toggle Status"><Power size={14} /></Button>
                            </>
                          )}
                          <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => setLoginTargetCompany(company)} title="Login as Company"><UserCheck size={14} /></Button>
                          {canDelete && (
                            <Button variant="outline" size="sm" className="text-danger border-danger-subtle" onClick={() => setDeleteTargetId(company.id)} title="Delete"><Trash2 size={14} /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5 d-none d-lg-block"><p className="text-muted">No companies found</p></div>
          )}

          {/* Mobile Cards */}
          <div className="d-lg-none bg-light-subtle p-3">
            {filteredCompanies.length > 0 ? filteredCompanies.map((company, index) => (
              <Card key={company.id} className="mb-3 border-0 shadow-sm company-mobile-card">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="fw-bold mb-1 text-dark">{company.name}</h5>
                      <div className="text-muted small">#{index + 1} • {company.industry}</div>
                    </div>
                    <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${company.status === 'Active' ? 'success' : company.status === 'Suspended' ? 'danger' : company.status === 'Trial' ? 'warning' : 'secondary'}`}>
                      {company.status || 'Active'}
                    </div>
                  </div>
                  <Row className="g-2 mb-3">
                    <Col xs={6}><small className="text-muted d-block">Contact</small><span className="fw-semibold small">{company.contactPersonName || '-'}</span></Col>
                    <Col xs={6}><small className="text-muted d-block">Plan</small>{getPlanBadge(company.subscriptionPlan)}</Col>
                    <Col xs={6}><small className="text-muted d-block">Revenue</small><span className="fw-semibold text-primary small">₹{company.monthlyRevenue || 0}</span></Col>
                    <Col xs={6}><small className="text-muted d-block">Users</small><span className="fw-semibold small">{company.totalUsers || 0}</span></Col>
                  </Row>
                  <div className="d-flex gap-2 flex-nowrap pt-2 border-top overflow-auto">
                    <Button variant="outline" size="sm" className="text-info border-info-subtle flex-fill py-2 fw-bold" onClick={() => handleViewCompany(company)} style={{ fontSize: '0.75rem' }}><Eye size={14} className="me-1" />View</Button>
                    {canEdit && <Button variant="outline" size="sm" className="text-primary border-primary-subtle flex-fill py-2 fw-bold" onClick={() => handleEditCompany(company)} style={{ fontSize: '0.75rem' }}><Edit size={14} className="me-1" />Edit</Button>}
                    <Button variant="outline" size="sm" className="text-primary border-primary-subtle flex-fill py-2 fw-bold" onClick={() => setLoginTargetCompany(company)} style={{ fontSize: '0.75rem' }}><UserCheck size={14} className="me-1" />Login</Button>
                    {canEdit && <Button variant="outline" size="sm" className={`${company.status === 'Active' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} flex-fill py-2 fw-bold`} onClick={() => handleStatusToggle(company.id)} style={{ fontSize: '0.75rem' }}><Power size={14} className="me-1" />Status</Button>}
                    {canDelete && <Button variant="outline" size="sm" className="text-danger border-danger-subtle flex-fill py-2 fw-bold" onClick={() => setDeleteTargetId(company.id)} style={{ fontSize: '0.75rem' }}><Trash2 size={14} className="me-1" />Delete</Button>}
                  </div>
                </Card.Body>
              </Card>
            )) : <div className="text-center py-5 text-muted">No companies found</div>}
          </div>
        </Card.Body>
      </Card>

      {showCompanyForm && (
        <CompanyForm
          company={editingCompany}
          onSave={handleSaveCompany}
          onCancel={() => { if (!saving) { setShowCompanyForm(false); setEditingCompany(null); } }}
          saving={saving}
        />
      )}

      {showCompanyView && (
        <CompanyView
          company={viewingCompany}
          onClose={() => setShowCompanyView(false)}
          onEdit={() => { setShowCompanyView(false); handleEditCompany(viewingCompany); }}
        />
      )}

      <ImportModal show={showImportModal} onImport={handleImportData} moduleType="companies" onHide={() => setShowImportModal(false)} />

      <ConfirmationModal show={!!deleteTargetId} onHide={() => setDeleteTargetId(null)} title="Confirm Delete" message="Are you sure you want to delete this company? This action cannot be undone." variant="danger" onConfirm={confirmDeleteCompany} />

      <ConfirmationModal show={!!loginTargetCompany} onHide={() => setLoginTargetCompany(null)} title="Confirm Session Switch" message={`Login as ${loginTargetCompany?.name}? This will update your active dashboard context to this company.`} variant="warning" onConfirm={confirmLoginAsCompany} confirmText="Login as Company" />

      <style>{`
        .icon-box { display: flex; align-items: center; justify-content: center; border-radius: 10px; }
        .bg-primary-light { background-color: rgba(30,64,175,0.1); }
        .bg-warning-light { background-color: rgba(245,158,11,0.1); }
        .bg-info-light { background-color: rgba(6,182,212,0.1); }
        .bg-success-light { background-color: rgba(16,185,129,0.1); }
        .bg-danger-light { background-color: rgba(239,68,68,0.1); }
        .extra-small { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .stats-row-container::-webkit-scrollbar { height: 4px; }
        .stats-row-container::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .company-mobile-card { border-radius: 12px; transition: transform 0.2s ease; }
        .status-box { letter-spacing: 0.5px; font-size: 0.75rem; min-width: 80px; text-align: center; }
        .bg-light-subtle { background-color: #f8f9fa; }
      `}</style>
    </>
  );
}

export default CompanyManagement;
