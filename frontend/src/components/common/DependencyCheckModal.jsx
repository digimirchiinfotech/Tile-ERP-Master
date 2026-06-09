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

import { Modal, Button, ListGroup } from 'react-bootstrap';
import { AlertTriangle } from 'lucide-react';

function DependencyCheckModal({ show, onHide, onConfirm, title, message, dependencies = [], loading = false }) {
  const hasDependencies = dependencies && dependencies.length > 0;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <AlertTriangle size={20} className={hasDependencies ? 'text-danger' : 'text-warning'} />
          {title || 'Confirm Delete'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {hasDependencies ? (
          <>
            <p className="text-danger fw-bold">This record cannot be deleted because it is referenced by:</p>
            <ListGroup variant="flush">
              {dependencies.map((dep, i) => (
                <ListGroup.Item key={i} className="py-2">
                  <strong>{dep.module}:</strong> {dep.count} record{dep.count !== 1 ? 's' : ''}
                  {dep.details && <small className="d-block text-muted">{dep.details}</small>}
                </ListGroup.Item>
              ))}
            </ListGroup>
            <p className="mt-3 text-muted small">Remove or reassign the dependent records first, then try again.</p>
          </>
        ) : (
          <p>{message || 'Are you sure you want to delete this record? This action cannot be undone.'}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        {!hasDependencies && (
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default DependencyCheckModal;
