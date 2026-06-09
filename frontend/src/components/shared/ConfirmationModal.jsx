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

import { Modal, Button, Row, Col, Alert } from 'react-bootstrap';
import { AlertCircle, Check, X } from 'lucide-react';

/**
 * Generic Confirmation Modal Component
 * Used for confirming destructive or important actions
 */
function ConfirmationModal({ 
  show, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  details = null,
  onConfirm, 
  onCancel,
  onHide,
  isDangerous = false,
  variant,
  confirmText = 'Yes, Confirm',
  cancelText = 'Cancel',
  isLoading = false
}) {
  // Support both onHide (Bootstrap convention) and onCancel
  const handleClose = onHide || onCancel || (() => {});
  // Support both variant='danger' and isDangerous=true
  const dangerous = variant === 'danger' || isDangerous;
  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <div className="d-flex align-items-center gap-2">
          {dangerous ? (
            <AlertCircle size={20} className="text-danger" />
          ) : (
            <AlertCircle size={20} className="text-warning" />
          )}
          <Modal.Title>{title}</Modal.Title>
        </div>
      </Modal.Header>
      <Modal.Body>
        {dangerous && (
          <Alert variant="secondary" className="mb-3">
            <strong>Warning:</strong> This action cannot be undone.
          </Alert>
        )}
        <p className="mb-2">{message}</p>
        {details && (
          <div className="bg-light p-3 rounded mb-3" style={{ fontSize: '0.9rem' }}>
            {typeof details === 'string' ? (
              <p className="mb-0">{details}</p>
            ) : (
              Object.entries(details).map(([key, value]) => (
                <div key={key} className="mb-2">
                  <strong>{key}:</strong> {String(value)}
                </div>
              ))
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Row className="w-100">
          <Col className="d-flex gap-2">
            <Button 
              variant="secondary" 
              onClick={handleClose}
              disabled={isLoading}
              className="w-100"
            >
              <X size={16} className="me-2" />
              {cancelText}
            </Button>
            <Button 
              variant={dangerous ? 'danger' : 'primary'} 
              onClick={onConfirm}
              disabled={isLoading}
              className="w-100"
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Check size={16} className="me-2" />
                  {confirmText}
                </>
              )}
            </Button>
          </Col>
        </Row>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmationModal;




