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
  Table,
  Badge,
  Spinner,
  Collapse,
  Button
} from 'react-bootstrap';
import {
  ChevronDown,
  ChevronUp,
  History,
  Info
} from 'lucide-react';
import api from '../../services/api.js';
import { formatDisplayDate } from '../../utils/formatters.js';

const ACTION_COLORS = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
  STATUS_CHANGE: 'warning'
};

/**
 * ModuleAuditLog component displays the activity history for a specific record.
 * @param {string} resourceType - The type of resource (e.g., 'proforma_invoice', 'proforma_order')
 * @param {string} resourceId - The UUID of the record
 */
const ModuleAuditLog = ({ resourceType, resourceId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchLogs = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);
    try {
      // Filter by resource_type and resource_id
      const response = await api.get(`/admin/audit-logs`, {
        params: { resource_type: resourceType, resource_id: resourceId, limit: 100 }
      });
      if (response.data.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch module audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
    return `${formatDisplayDate(dateStr)} ${new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderJsonDiff = (oldValues, newValues) => {
    const old = typeof oldValues === 'string' ? JSON.parse(oldValues || '{}') : (oldValues || {});
    const current = typeof newValues === 'string' ? JSON.parse(newValues || '{}') : (newValues || {});

    const skipFields = ['updated_at', 'created_at', 'id', 'company_id'];
    const allKeys = [...new Set([...Object.keys(old), ...Object.keys(current)])]
      .filter(k => !skipFields.includes(k));

    if (allKeys.length === 0) return <em className="text-muted small">No specific field changes recorded</em>;

    // Filter only changed keys
    const changedKeys = allKeys.filter(k => JSON.stringify(old[k]) !== JSON.stringify(current[k]));

    return (
      <Table size="sm" bordered className="mb-0 mt-1 bg-white" style={{ fontSize: '0.75rem' }}>
        <thead className="table-light">
          <tr>
            <th style={{ width: '30%' }}>Field</th>
            {Object.keys(old).length > 0 && <th>Old Value</th>}
            <th>{Object.keys(old).length > 0 ? 'New Value' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map(key => (
            <tr key={key}>
              <td className="fw-medium text-muted">{key.replace(/_/g, ' ').toUpperCase()}</td>
              {Object.keys(old).length > 0 && (
                <td className="text-danger-emphasis bg-danger-subtle">
                  {typeof old[key] === 'object' ? 'Complex Object' : String(old[key] ?? '-')}
                </td>
              )}
              <td className="text-success-emphasis bg-success-subtle">
                {typeof current[key] === 'object' ? 'Complex Object' : String(current[key] ?? '-')}
              </td>
            </tr>
          ))}
          {changedKeys.length === 0 && (
            <tr>
              <td colSpan={Object.keys(old).length > 0 ? 3 : 2} className="text-center text-muted py-2">
                Action performed without field-level modifications (e.g., re-save)
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" size="sm" />
        <div className="mt-2 small text-muted">Loading activity history...</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-5 bg-light rounded-3 border">
        <Info size={32} className="text-muted mb-2 opacity-50" />
        <p className="mb-0 text-muted small">No activity history found for this record.</p>
      </div>
    );
  }

  return (
    <div className="module-audit-log">
      <div className="table-responsive">
        <Table hover className="mb-0 align-middle border-top" style={{ fontSize: '0.8rem' }}>
          <thead className="table-light small text-uppercase text-muted">
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Timestamp</th>
              <th>Action</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <React.Fragment key={log.id}>
                <tr 
                  onClick={() => toggleRow(log.id)} 
                  style={{ cursor: 'pointer' }}
                  className={expandedRows.has(log.id) ? 'table-active' : ''}
                >
                  <td>
                    {expandedRows.has(log.id) ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-muted" />}
                  </td>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    <Badge bg={ACTION_COLORS[log.action] || 'secondary'} className="px-2">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="fw-bold">{log.userName || log.userEmail?.split('@')[0] || 'System'}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="p-0 border-0">
                    <Collapse in={expandedRows.has(log.id)}>
                      <div className="p-3 bg-light-subtle border-start border-primary border-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-bold text-primary small">Change Details</span>
                          <span className="text-muted extra-small">ID: {log.id}</span>
                        </div>
                        {renderJsonDiff(log.changes?.old, log.changes?.new)}
                      </div>
                    </Collapse>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      </div>
      <style>{`
        .extra-small { font-size: 0.65rem; }
        .bg-light-subtle { background-color: #f8f9fa; }
      `}</style>
    </div>
  );
};

export default ModuleAuditLog;
