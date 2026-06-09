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
import { Modal, Form, Button } from 'react-bootstrap';
import api from '../../services/api';

const QCApprovalModal = ({ show, onHide, sheet, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    decision: 'Approved',
    comments: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post(`/production-sheets/${sheet.id}/qc`, formData);
      onSuccess();
      onHide();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Error saving QC inspection');
    } finally {
      setSubmitting(false);
    }
  };

  if (!sheet) return null;

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="text-primary h5">QC Inspection - {sheet.po_no}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="alert alert-info py-2 small mb-4">
            You are inspecting production for <strong>{sheet.product_name}</strong> from <strong>{sheet.factory_name}</strong>.
            Total produced: {Number(sheet.produced_qty).toLocaleString()} / {Number(sheet.required_qty).toLocaleString()}
          </div>
          
          <Form.Group className="mb-3">
            <Form.Label>QC Decision <span className="text-danger">*</span></Form.Label>
            <Form.Select 
              value={formData.decision}
              onChange={e => setFormData({...formData, decision: e.target.value})}
              required
            >
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Inspector Comments</Form.Label>
            <Form.Control 
              as="textarea"
              rows={3}
              value={formData.comments}
              onChange={e => setFormData({...formData, comments: e.target.value})}
              placeholder="Note any defects, variations, or packing issues here..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Submit QC'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default QCApprovalModal;
