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

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  Row,
  Col,
  Badge,
  Spinner,
  Pagination,
  Collapse,
  Alert,
  Modal
} from 'react-bootstrap';
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RefreshCcw,
  Filter,
  Search,
  RotateCcw
} from 'lucide-react';
import api from '../../services/api.js';
import FilterPanel from '../shared/FilterPanel.jsx';
import { formatDisplayDate } from '../../utils/formatters.js';
import VirtualizedTable from '../shared/VirtualizedTable.jsx';

const ACTION_COLORS = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
  STATUS_CHANGE: 'warning',
  LOGIN: 'info',
  LOGOUT: 'secondary'
};

function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    date_from: '',
    date_to: ''
  });
  const [filterOptions, setFilterOptions] = useState({ actions: [], resourceTypes: [] });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  const handleRowClick = (log) => {
    setSelectedLog(log);
    setShowLogModal(false); // Quick trick to reset if fast clicking
    setTimeout(() => setShowLogModal(true), 10);
  };

  const columns = [
    { key: 'action', label: 'Action', width: '15%', render: (val) => <Badge bg={ACTION_COLORS[val] || 'secondary'} className="px-2 py-1 text-uppercase" style={{ fontSize: '0.7rem' }}>{val}</Badge> },
    { key: 'resourceType', label: 'Resource', width: '20%', render: (val) => formatResourceType(val) },
    { key: 'userName', label: 'User', width: '30%', render: (_, log) => <div className="text-primary fw-bold" style={{ fontSize: '0.9rem' }}>{log.companyName || log.company_name ? `${log.companyName || log.company_name} - ` : ''}{log.userName || log.user_name || log.userEmail || log.user_email || 'System Activity'}</div> },
    { key: 'ipAddress', label: 'IP Address', width: '15%', render: (val) => val || '-' },
    { key: 'createdAt', label: 'Date', width: '20%', render: (val) => <span className="text-muted small fw-medium">{formatDate(val)}</span> }
  ];

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit });
      if (filters.action) params.append('action', filters.action);
      if (filters.resource_type) params.append('resource_type', filters.resource_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await api.get(`/admin/audit-logs?${params}`);
      if (response.data.success) {
        setLogs(response.data.data || []);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/admin/audit-logs/filters');
      if (response.data.success) {
        setFilterOptions({
          actions: response.data.actions || [],
          resourceTypes: response.data.resourceTypes || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return `${formatDisplayDate(dateStr)} ${new Date(dateStr).toLocaleTimeString('en-GB')}`;
  };

  const formatResourceType = (type) => {
    if (!type) return '-';
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const renderJsonDiff = (changes) => {
    if (!changes) return <em className="text-muted">No details available</em>;

    let oldValues = {};
    let newValues = {};

    if (changes.old || changes.new) {
      oldValues = changes.old || {};
      newValues = changes.new || {};
    } else {
      newValues = typeof changes === 'string' ? JSON.parse(changes || '{}') : { ...changes };
      if (newValues._metadata) delete newValues._metadata;
    }

    const old = typeof oldValues === 'string' ? JSON.parse(oldValues || '{}') : (oldValues || {});
    const current = typeof newValues === 'string' ? JSON.parse(newValues || '{}') : (newValues || {});

    const skipFields = ['updated_at', 'created_at', 'id', 'company_id'];
    const allKeys = [...new Set([...Object.keys(old), ...Object.keys(current)])].filter(k => !skipFields.includes(k));

    if (allKeys.length === 0) return <em className="text-muted">No details available</em>;

    const changedKeys = allKeys.filter(k => JSON.stringify(old[k]) !== JSON.stringify(current[k]));
    const keysToShow = changedKeys.length > 0 ? changedKeys : allKeys.slice(0, 10);

    return (
      <Table size="sm" bordered className="mb-0 mt-2" style={{ fontSize: '0.8rem' }}>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Field</th>
            {Object.keys(old).length > 0 && <th>Old Value</th>}
            <th>{Object.keys(old).length > 0 ? 'New Value' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          {keysToShow.map(key => (
            <tr key={key}>
              <td className="fw-medium">{key.replace(/_/g, ' ')}</td>
              {Object.keys(old).length > 0 && (
                <td className="text-danger">
                  {typeof old[key] === 'object' ? JSON.stringify(old[key])?.substring(0, 100) : String(old[key] ?? '-')}
                </td>
              )}
              <td className="text-success">
                {typeof current[key] === 'object' ? JSON.stringify(current[key])?.substring(0, 100) : String(current[key] ?? '-')}
              </td>
            </tr>
          ))}
          {allKeys.length > keysToShow.length && (
            <tr>
              <td colSpan={Object.keys(old).length > 0 ? 3 : 2} className="text-muted text-center">
                ... and {allKeys.length - keysToShow.length} more fields
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    );
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Timestamp', 'User', 'Action', 'Module', 'Record ID', 'IP Address'];
    const rows = logs.map(log => {
      const company = log.companyName || log.company_name;
      const user = log.userName || log.user_name || log.userEmail || log.user_email || 'System';
      const userStr = company ? `${company} - ${user}` : user;
      return [
        formatDate(log.createdAt || log.created_at),
        userStr,
        log.action,
        formatResourceType(log.resourceType || log.resource_type),
        log.resourceId || log.resource_id || '-',
        log.ipAddress || log.ip_address || '-'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePageChange = (page) => {
    fetchLogs(page);
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    const items = [];
    const maxPages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);
    if (endPage - startPage < maxPages - 1) startPage = Math.max(1, endPage - maxPages + 1);

    items.push(
      <Pagination.First key="first" disabled={pagination.page === 1} onClick={() => handlePageChange(1)} />,
      <Pagination.Prev key="prev" disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)} />
    );

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item key={i} active={i === pagination.page} onClick={() => handlePageChange(i)}>
          {i}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next key="next" disabled={pagination.page === pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)} />,
      <Pagination.Last key="last" disabled={pagination.page === pagination.totalPages} onClick={() => handlePageChange(pagination.totalPages)} />
    );

    return <Pagination className="mb-0 justify-content-center">{items}</Pagination>;
  };

  return (
    <div className="audit-log-container">
      {/* Page Title */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Audit Log Viewer</h2>
          <p className="text-muted">Monitor and track system activities, security events, and data changes</p>
        </Col>
      </Row>

      {/* 1. Module Header Card */}
      <Card className="border-0 shadow-sm overflow-hidden mb-3" style={{ borderRadius: '16px', background: '#ffffff' }}>
        <Card.Header 
          className="bg-primary py-3 px-4 border-0 d-flex flex-row align-items-center justify-content-between flex-nowrap text-white"
          style={{ transition: 'all 0.2s ease' }}
        >
          <div className="d-flex align-items-center gap-3 flex-nowrap overflow-hidden">
            <div className="p-2 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}>
              <FileText size={20} strokeWidth={2.5} />
            </div>
            <div className="overflow-hidden">
              <h5 className="mb-0 fw-bold text-white text-nowrap" style={{ letterSpacing: '0.01em', fontSize: '1.05rem' }}>
                Audit Log ({pagination.total})
              </h5>
            </div>
          </div>

          <div className="d-flex gap-2 flex-nowrap align-items-center flex-shrink-0">
            <Button 
              variant="white" 
              size="sm" 
              className="px-3 py-2 border-0 shadow-sm d-flex align-items-center gap-2 fw-bold text-primary hover-elevate bg-white" 
              onClick={() => fetchLogs(1)} 
              style={{ borderRadius: '10px', height: '38px', minWidth: '100px' }}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> 
              <span className="d-none d-sm-inline">Refresh</span>
            </Button>
            <Button 
              variant="white" 
              size="sm" 
              className="px-3 py-2 border-0 shadow-sm d-flex align-items-center gap-2 fw-bold text-primary hover-elevate bg-white" 
              onClick={exportToCSV} 
              disabled={logs.length === 0}
              style={{ borderRadius: '10px', height: '38px', minWidth: '110px' }}
            >
              <Download size={16} /> 
              <span className="d-none d-sm-inline">Export CSV</span>
              <span className="d-sm-none">CSV</span>
            </Button>
          </div>
        </Card.Header>
      </Card>

      {/* 2. Collapsible Filter Panel */}
      <FilterPanel 
        onClear={() => setFilters({ action: '', resource_type: '', date_from: '', date_to: '' })} 
        title="Search & Filters"
      >
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Action Type</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Module / Resource</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.resource_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, resource_type: e.target.value }))}
                >
                  <option value="">All Modules</option>
                  {filterOptions.resourceTypes.map(type => (
                    <option key={type} value={type}>{formatResourceType(type)}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Date From</Form.Label>
                <Form.Control
                  type="date"
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.date_from}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col lg={3} md={6} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Date To</Form.Label>
                <Form.Control
                  type="date"
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.date_to}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      {/* 3. Logs Content */}
      <div className="audit-logs-content mt-4">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted fw-medium">Loading audit logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <Alert variant="info" className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Search size={18} className="me-2" />
            No audit log entries found matching your criteria.
          </Alert>
        ) : (
          <div className="bg-white rounded-3 shadow-sm p-2">
            <VirtualizedTable
              data={logs}
              columns={columns}
              height={600}
              rowHeight={65}
              onRowClick={handleRowClick}
            />
          </div>
        )}
      </div>

      <Modal show={showLogModal} onHide={() => setShowLogModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold fs-5 d-flex align-items-center">
            <FileText size={20} className="me-2 text-primary" />
            Audit Log Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedLog && (
            <div>
              <Row className="mb-4 g-3 bg-light rounded-3 p-3 mx-0">
                <Col md={6}>
                  <div className="text-muted small text-uppercase fw-bold mb-1">Action</div>
                  <Badge bg={ACTION_COLORS[selectedLog.action] || 'secondary'} className="px-3 py-2 text-uppercase">{selectedLog.action}</Badge>
                </Col>
                <Col md={6}>
                  <div className="text-muted small text-uppercase fw-bold mb-1">Resource Type</div>
                  <div className="fw-bold">{formatResourceType(selectedLog.resourceType)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted small text-uppercase fw-bold mb-1">User</div>
                  <div className="text-primary fw-bold">
                    {selectedLog.companyName || selectedLog.company_name ? `${selectedLog.companyName || selectedLog.company_name} - ` : ''}
                    {selectedLog.userName || selectedLog.user_name || selectedLog.userEmail || selectedLog.user_email || 'System Activity'}
                  </div>
                </Col>
                <Col md={6}>
                  <div className="text-muted small text-uppercase fw-bold mb-1">IP Address & Time</div>
                  <div>
                    {selectedLog.ipAddress || '-'} <span className="text-muted ms-2">({formatDate(selectedLog.createdAt)})</span>
                  </div>
                </Col>
              </Row>
              <h6 className="fw-bold mb-3 d-flex align-items-center text-primary">
                <RefreshCw size={16} className="me-2" /> Data Changes
              </h6>
              {renderJsonDiff(selectedLog.changes)}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* 4. Pagination */}
      <div className="mt-5 pb-5">
        {renderPagination()}
      </div>

      <style>{`
        .audit-log-card:hover {
          background-color: #f8fafc;
        }
        .hover-elevate-subtle:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
        }
        .extra-small {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .bg-primary:hover {
          filter: brightness(1.05);
        }
        .hover-elevate {
          transition: all 0.2s ease;
        }
        .hover-elevate:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .hover-elevate:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

export default AuditLogViewer;
