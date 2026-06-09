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

import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Table, Badge, Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { Shield, Users, Building, LogOut, RefreshCw, AlertTriangle, Activity, Clock, Trash2, Globe } from 'lucide-react';
import api from '../../services/api';

const fmtDate = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (_) { return d; }
};

const roleColor = (role) => {
  if (role === 'super_admin') return 'danger';
  if (role === 'company_admin') return 'primary';
  if (role === 'sales_manager') return 'success';
  return 'secondary';
};

function SessionManagement() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, type: null, id: null, name: '' });
  const [revoking, setRevoking] = useState(false);
  const [filter, setFilter] = useState('all'); // all | company | super_admin

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/session/admin/all');
      // API normalizer converts snake_case → camelCase
      const data = res.data?.data || [];
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load sessions. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchSessions, 60000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleRevokeCompany = (companyId, companyName) => {
    setConfirmModal({ show: true, type: 'company', id: companyId, name: companyName });
  };

  const handleRevokeUser = (userId, userName) => {
    setConfirmModal({ show: true, type: 'user', id: userId, name: userName });
  };

  const confirmRevoke = async () => {
    try {
      setRevoking(true);
      const endpoint = confirmModal.type === 'company'
        ? `/session/admin/company/${confirmModal.id}`
        : `/session/admin/user/${confirmModal.id}`;
      const res = await api.delete(endpoint);
      setSuccess(`✓ ${res.data?.revoked ?? 0} session(s) revoked for ${confirmModal.name}`);
      setConfirmModal({ show: false, type: null, id: null, name: '' });
      setTimeout(() => fetchSessions(), 500);
    } catch (err) {
      setError('Failed to revoke sessions: ' + (err.response?.data?.message || err.message));
    } finally {
      setRevoking(false);
    }
  };

  // After camelCase normalization by API interceptor:
  // company_name → companyName, user_name → userName,
  // company_id → companyId, user_id → userId,
  // created_at → createdAt, expires_at → expiresAt,
  // session_status → sessionStatus, company_status → companyStatus
  const getName = (s) => s.userName || s.user_name || s.name || '—';
  const getEmail = (s) => s.email || s.emailId || s.email_id || '—';
  const getCompanyName = (s) => s.companyName || s.company_name || null;
  const getCompanyId = (s) => s.companyId || s.company_id || null;
  const getUserId = (s) => s.userId || s.user_id || s.id;
  const getRole = (s) => s.role || '—';
  const getStatus = (s) => s.sessionStatus || s.session_status || 'Active';
  const getCreatedAt = (s) => s.createdAt || s.created_at;
  const getExpiresAt = (s) => s.expiresAt || s.expires_at;

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (filter === 'super_admin') return getRole(s) === 'super_admin';
    if (filter === 'company') return getCompanyId(s) !== null;
    return true;
  });

  // Group by company
  const byCompany = filteredSessions.reduce((acc, s) => {
    const key = getCompanyId(s) || 'super-admin';
    if (!acc[key]) acc[key] = {
      companyName: getCompanyName(s) || (getRole(s) === 'super_admin' ? 'Super Admin' : 'N/A'),
      companyId: getCompanyId(s),
      sessions: []
    };
    acc[key].sessions.push(s);
    return acc;
  }, {});

  const stats = {
    total: sessions.length,
    companies: new Set(sessions.map(s => getCompanyId(s)).filter(Boolean)).size,
    superAdmins: sessions.filter(s => getRole(s) === 'super_admin').length,
  };

  return (
    <>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="p-2 rounded-3 bg-danger bg-opacity-10">
              <Shield size={28} className="text-danger" />
            </div>
            <div>
              <h4 className="mb-0 fw-bold">Active Session Management</h4>
              <p className="text-muted mb-0 small">Monitor and revoke user sessions across the entire platform</p>
            </div>
            <div className="ms-auto d-flex gap-2 align-items-center flex-wrap">
              <select className="form-select form-select-sm" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All Sessions ({sessions.length})</option>
                <option value="company">Company Users</option>
                <option value="super_admin">Super Admins</option>
              </select>
              <Button variant="outline-primary" size="sm" className="d-flex align-items-center gap-2" onClick={fetchSessions} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row className="mb-4 g-3">
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <Card.Body className="d-flex align-items-center gap-3 p-3">
              <div className="p-2 rounded-3 bg-primary bg-opacity-10"><Activity size={22} className="text-primary" /></div>
              <div>
                <div className="text-muted small fw-bold text-uppercase">Total Active Sessions</div>
                <div className="fw-bold fs-3 text-primary">{stats.total}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <Card.Body className="d-flex align-items-center gap-3 p-3">
              <div className="p-2 rounded-3 bg-success bg-opacity-10"><Building size={22} className="text-success" /></div>
              <div>
                <div className="text-muted small fw-bold text-uppercase">Companies Online</div>
                <div className="fw-bold fs-3 text-success">{stats.companies}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <Card.Body className="d-flex align-items-center gap-3 p-3">
              <div className="p-2 rounded-3 bg-danger bg-opacity-10"><Shield size={22} className="text-danger" /></div>
              <div>
                <div className="text-muted small fw-bold text-uppercase">Super Admin Sessions</div>
                <div className="fw-bold fs-3 text-danger">{stats.superAdmins}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-3">{success}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">{error}</Alert>}

      {/* Company Session Summary Cards */}
      {Object.values(byCompany).length > 0 && (
        <Row className="mb-4 g-3">
          {Object.values(byCompany).map(grp => (
            <Col key={grp.companyId || 'super-admin'} xs={12} md={6} lg={4}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-0 p-3 pb-0 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold text-dark">{grp.companyName}</div>
                    <Badge bg="success" className="mt-1">{grp.sessions.length} session{grp.sessions.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  {grp.companyId && (
                    <Button variant="outline-danger" size="sm" className="fw-semibold d-flex align-items-center gap-1"
                      onClick={() => handleRevokeCompany(grp.companyId, grp.companyName)}>
                      <LogOut size={12} /> Revoke All
                    </Button>
                  )}
                </Card.Header>
                <Card.Body className="p-3 pt-2">
                  {grp.sessions.slice(0, 3).map(s => (
                    <div key={s.id} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                      <div>
                        <div className="fw-semibold small text-dark">{getName(s)}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {getEmail(s)} · <span className="text-capitalize">{getRole(s).replace('_', ' ')}</span>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          <Clock size={10} className="me-1" />{fmtDate(getCreatedAt(s))}
                        </div>
                      </div>
                      <Button variant="outline-danger" size="sm" className="py-0 px-2" style={{ fontSize: '0.7rem' }}
                        onClick={() => handleRevokeUser(getUserId(s), getName(s))} title="Revoke this session">
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  ))}
                  {grp.sessions.length > 3 && (
                    <div className="text-muted small text-center pt-2">+{grp.sessions.length - 3} more session(s)</div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Full Sessions Table */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white p-3 border-0 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold">
            <Globe size={18} className="me-2" />
            All Active Sessions ({filteredSessions.length})
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Shield size={40} className="mb-2 opacity-25" />
              <p>No active sessions found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-responsive d-none d-lg-block">
                <Table hover className="mb-0 align-middle">
                  <thead>
                    <tr className="table-light text-muted small text-uppercase">
                      <th className="ps-4" style={{ width: 40 }}>#</th>
                      <th>User</th>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Expires</th>
                      <th className="pe-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s, idx) => (
                      <tr key={s.id}>
                        <td className="ps-4 text-muted small">{idx + 1}</td>
                        <td>
                          <div className="fw-semibold">{getName(s)}</div>
                          <div className="text-muted small">{getEmail(s)}</div>
                        </td>
                        <td>
                          {getCompanyName(s)
                            ? <span className="fw-medium">{getCompanyName(s)}</span>
                            : <span className="text-muted fst-italic small">Platform Level</span>
                          }
                        </td>
                        <td>
                          <Badge bg={roleColor(getRole(s))} className="text-capitalize">
                            {getRole(s).replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td><Badge bg="success">{getStatus(s)}</Badge></td>
                        <td><small className="text-muted">{fmtDate(getCreatedAt(s))}</small></td>
                        <td>
                          <small className={getExpiresAt(s) && new Date(getExpiresAt(s)) < new Date(Date.now() + 7 * 86400000) ? 'text-warning fw-semibold' : 'text-muted'}>
                            {fmtDate(getExpiresAt(s))}
                          </small>
                        </td>
                        <td className="pe-4 text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {getCompanyId(s) && (
                              <Button variant="outline-warning" size="sm" className="fw-semibold d-flex align-items-center gap-1"
                                onClick={() => handleRevokeCompany(getCompanyId(s), getCompanyName(s))} title="Revoke all company sessions">
                                <Building size={12} /> Company
                              </Button>
                            )}
                            <Button variant="outline-danger" size="sm" className="fw-semibold d-flex align-items-center gap-1"
                              onClick={() => handleRevokeUser(getUserId(s), getName(s))} title="Revoke this user's sessions">
                              <LogOut size={12} /> User
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="d-lg-none p-3">
                {filteredSessions.map((s, idx) => (
                  <Card key={s.id} className="mb-3 border shadow-sm" style={{ borderRadius: '10px' }}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="fw-bold">{getName(s)}</div>
                          <div className="text-muted small">{getEmail(s)}</div>
                        </div>
                        <Badge bg={roleColor(getRole(s))} className="text-capitalize">
                          {getRole(s).replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="small text-muted mb-2">
                        <Building size={12} className="me-1" />
                        {getCompanyName(s) || 'Platform Level'}
                      </div>
                      <div className="small text-muted mb-3">
                        <Clock size={12} className="me-1" />
                        Started: {fmtDate(getCreatedAt(s))} · Expires: {fmtDate(getExpiresAt(s))}
                      </div>
                      <div className="d-flex gap-2">
                        {getCompanyId(s) && (
                          <Button variant="outline-warning" size="sm" className="flex-fill fw-semibold"
                            onClick={() => handleRevokeCompany(getCompanyId(s), getCompanyName(s))}>
                            <Building size={12} className="me-1" /> Revoke Company
                          </Button>
                        )}
                        <Button variant="outline-danger" size="sm" className="flex-fill fw-semibold"
                          onClick={() => handleRevokeUser(getUserId(s), getName(s))}>
                          <LogOut size={12} className="me-1" /> Revoke User
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Confirm Revoke Modal */}
      <Modal show={confirmModal.show} onHide={() => setConfirmModal({ show: false })} centered backdrop="static">
        <Modal.Header className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2 text-danger">
            <AlertTriangle size={22} /> Confirm Session Revocation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1">
            You are about to revoke <strong>all active sessions</strong> for{' '}
            <strong>{confirmModal.name}</strong>.
          </p>
          <p className="text-muted small mb-0">
            {confirmModal.type === 'company'
              ? 'All users in this company will be immediately logged out and will need to sign in again.'
              : 'This user will be immediately logged out and will need to sign in again.'}
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={() => setConfirmModal({ show: false })} disabled={revoking}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRevoke} disabled={revoking} className="d-flex align-items-center gap-2">
            {revoking ? <><Spinner size="sm" animation="border" /> Revoking...</> : <><LogOut size={14} /> Revoke Sessions</>}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export default SessionManagement;
