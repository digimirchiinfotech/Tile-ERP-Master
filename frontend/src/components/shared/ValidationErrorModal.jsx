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

import React, { useState, useEffect } from 'react';
import { Modal, Alert, Button, ListGroup } from 'react-bootstrap';
import { AlertCircle } from 'lucide-react';

/**
 * ValidationErrorModal - Display form validation errors in a user-friendly popup
 * Shows specific field errors with exact corrections needed
 */
const ValidationErrorModal = ({ show, errors, onClose, onHide, title = 'Validation Error' }) => {
  const handleClose = onClose || onHide;
  const [displayErrors, setDisplayErrors] = useState([]);

  useEffect(() => {
    if (errors) {
      // Convert errors object to array format
      if (typeof errors === 'string') {
        setDisplayErrors([{ field: 'General', message: errors }]);
      } else if (Array.isArray(errors)) {
        // Map express-validator objects { path/param, msg } to standard { field, message }
        const mappedErrors = errors.map((err, idx) => ({
          field: String(err.field || err.path || err.param || `Field ${idx + 1}`)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()),
          message: typeof (err.message || err.msg) === 'string'
            ? (err.message || err.msg)
            : String(err.message || err.msg || 'Invalid value')
        }));
        setDisplayErrors(mappedErrors);
      } else if (typeof errors === 'object') {
        // Handle object format: { fieldName: 'error message' }
        const errorArray = Object.entries(errors)
          .filter(([, message]) => message)
          .map(([field, message]) => ({
            field: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            message: typeof message === 'string' ? message : String(message)
          }));
        setDisplayErrors(errorArray);
      }
    }
  }, [errors]);

  if (!show || displayErrors.length === 0) {
    return null;
  }

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title>
          <AlertCircle size={20} className="me-2" style={{ display: 'inline' }} />
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-4">
        <Alert variant="secondary" className="mb-3">
          <strong>Please review and correct the following fields:</strong>
        </Alert>

        <ListGroup variant="flush">
          {displayErrors.map((error, index) => (
            <ListGroup.Item key={index} className="border-start-3 ps-3">
              <div className="d-flex align-items-start">
                <div className="badge bg-danger me-2 mt-1">
                  {error.field || `Field ${index + 1}`}
                </div>
                <div>
                  <p className="mb-0 text-dark">{error.message}</p>
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>

        {displayErrors.length > 0 && (
          <Alert variant="info" className="mt-3 mb-0">
            <small>
              💡 <strong>Tip:</strong> Make sure all required fields are filled correctly and follow the specified format.
            </small>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close & Fix Errors
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ValidationErrorModal;




