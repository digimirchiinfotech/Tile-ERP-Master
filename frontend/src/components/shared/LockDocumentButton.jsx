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
import { Button, Modal, OverlayTrigger, Tooltip, Form } from 'react-bootstrap';
import { Lock, Unlock, Check } from 'lucide-react';
import { showSuccess, showError } from './NotificationManager.jsx';
import api from '../../services/api';
import { useUserContext } from '../../contexts/UserContext.jsx';

export default function LockDocumentButton({ documentType, documentId, isLocked, onLockSuccess, disabled, size = 'sm', getSnapshotData, className = '' }) {
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useUserContext();

  const canLock = currentUser && ['super_admin', 'company_admin', 'admin', 'sales_manager', 'export_documents', 'account'].includes(currentUser.role);
  const canUnlock = currentUser && ['super_admin', 'company_admin', 'admin'].includes(currentUser.role);

  if (!canLock && !isLocked) {
    return null;
  }

  const handleLock = async () => {
    setLoading(true);
    try {
      const snapshotData = getSnapshotData ? await getSnapshotData() : null;
      await api.post('/locks/lock', { documentType, documentId, snapshotData });
      showSuccess('Document locked successfully. It is now immutable.');
      setShowSecondConfirm(false);
      if (onLockSuccess) onLockSuccess();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to lock document');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      showError('Unlock reason is required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/locks/unlock', { documentType, documentId, unlockReason });
      showSuccess('Document unlocked successfully.');
      setShowUnlockConfirm(false);
      setUnlockReason('');
      if (onLockSuccess) onLockSuccess();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to unlock document');
    } finally {
      setLoading(false);
    }
  };

  if (isLocked) {
    if (canUnlock) {
      return (
        <>
          <Button variant="danger" size={size} onClick={() => setShowUnlockConfirm(true)} className={`d-flex align-items-center justify-content-center gap-1 ${(className || '').replace(/text-\w+|border-\w+-subtle/g, '')}`} title="Unlock Document">
            <Lock size={14} />
            {size !== 'sm' || (className && className.includes('flex-fill')) ? 'Locked' : ''}
          </Button>

          <Modal show={showUnlockConfirm} onHide={() => setShowUnlockConfirm(false)} centered>
            <Modal.Header closeButton className="bg-danger text-white">
              <Modal.Title><Unlock size={20} className="me-2 mb-1"/>Unlock Document</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="fw-bold text-danger">You are about to unlock this document.</p>
              <Form.Group className="mt-3">
                <Form.Label>Reason for unlocking <span className="text-danger">*</span></Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Enter reason for audit log..."
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowUnlockConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleUnlock} disabled={loading || !unlockReason.trim()}>
                {loading ? 'Unlocking...' : 'Unlock Document'}
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      );
    }

    return (
      <OverlayTrigger overlay={<Tooltip>Document is finalized and cannot be modified</Tooltip>}>
        <span className="d-inline-block">
          <Button variant="danger" size={size} disabled style={{ pointerEvents: 'none', backgroundColor: '#8B0000', borderColor: '#8B0000' }} className={`d-flex align-items-center justify-content-center gap-1 ${(className || '').replace(/text-\w+|border-\w+-subtle/g, '')}`}>
            <Lock size={14} />
            {size !== 'sm' || (className && className.includes('flex-fill')) ? 'Locked' : ''}
          </Button>
        </span>
      </OverlayTrigger>
    );
  }

  return (
    <>
      <OverlayTrigger overlay={<Tooltip>Document is editable</Tooltip>}>
        <Button 
          variant="secondary" 
          size={size} 
          disabled={disabled}
          onClick={() => setShowFirstConfirm(true)}
          className={`d-flex align-items-center justify-content-center gap-1 text-white border-secondary ${className}`}
        >
          <Unlock size={14} />
          {size !== 'sm' || className.includes('flex-fill') ? 'Lock' : ''}
        </Button>
      </OverlayTrigger>

      {/* First Confirmation */}
      <Modal show={showFirstConfirm} onHide={() => setShowFirstConfirm(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title><Lock size={20} className="me-2 mb-1"/>Lock Document?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You are about to lock this document.</p>
          <p>Once locked, no future changes from:</p>
          <ul>
            <li>Company Profile</li>
            <li>Product Master</li>
            <li>Client Master</li>
            <li>Supplier Master</li>
            <li>Banking Details</li>
            <li>Tax Settings</li>
            <li>Document Revisions</li>
          </ul>
          <p>will affect this document.</p>
          <p className="fw-bold text-danger mb-0">Do you want to continue?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFirstConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => {
            setShowFirstConfirm(false);
            setUnderstood(false);
            setShowSecondConfirm(true);
          }}>
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Second Confirmation */}
      <Modal show={showSecondConfirm} onHide={() => setShowSecondConfirm(false)} centered backdrop="static">
        <Modal.Header closeButton className="bg-danger text-white border-0">
          <Modal.Title><Lock size={20} className="me-2 mb-1"/>Final Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="fw-bold text-danger">This action is irreversible for regular users.</p>
          <p>Only Company Admin or Super Admin can unlock.</p>
          <p>Are you sure you want to lock this document?</p>
          <Form.Check 
            type="checkbox"
            id="understand-lock"
            label="I understand this action."
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-3 fw-semibold text-danger"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSecondConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleLock} disabled={loading || !understood}>
            {loading ? 'Locking...' : 'Lock Document'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
