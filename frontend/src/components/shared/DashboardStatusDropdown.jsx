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

import React, { useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import StatusDropdown from './StatusDropdown';
import api from '../../services/api';
import { showSuccess, showError } from './NotificationManager';

export default function DashboardStatusDropdown({ module, endpoint, documentId, value, disabled, onSuccess, className }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (val) => {
    if (val === value) return;
    setNewStatus(val);
    setShowConfirm(true);
  };

  const confirmChange = async () => {
    try {
      setLoading(true);
      const res = await api.patch(`/${endpoint}/${documentId}/status`, { status: newStatus });
      if (res.data?.success || res.status === 200 || res.status === 204) {
        showSuccess('Status updated successfully');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res.data?.message || 'Failed to update status');
      }
    } catch (err) {
      showError('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="status-dropdown-wrapper">
      <StatusDropdown
        module={module}
        value={value}
        onChange={handleChange}
        disabled={disabled || loading}
        className={className}
      />
      <Modal show={showConfirm} onHide={() => !loading && setShowConfirm(false)} centered>
        <Modal.Header closeButton={!loading}>
          <Modal.Title>Confirm Status Change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to change the status to <strong>{newStatus}</strong>?
          {newStatus === 'Locked' && (
            <div className="alert alert-danger mt-3 mb-0">
              Locking this document will make it permanently read-only!
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={confirmChange} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Confirm'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
