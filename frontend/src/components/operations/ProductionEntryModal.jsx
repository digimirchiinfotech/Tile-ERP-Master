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
import { Modal, Form, Button, Table, Spinner, Badge } from 'react-bootstrap';
import api from '../../services/api';

const ProductionEntryModal = ({ show, onHide, sheet, onSuccess }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    production_date: new Date().toISOString().split('T')[0],
    produced_qty: '',
    remarks: ''
  });

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/production-sheets/${sheet.id}/entries`);
      setEntries(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sheet && show) {
      fetchEntries();
      setFormData({
        production_date: new Date().toISOString().split('T')[0],
        produced_qty: '',
        remarks: ''
      });
    }
  }, [sheet, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post(`/production-sheets/${sheet.id}/entries`, formData);
      onSuccess();
      onHide();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Error saving production entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (!sheet) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="text-primary h5">Update Production - {sheet.po_no}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between mb-4 bg-light p-3 rounded">
          <div>
            <small className="text-muted d-block">Product</small>
            <span className="fw-bold">{sheet.product_name}</span>
          </div>
          <div>
            <small className="text-muted d-block">Required Qty</small>
            <span className="fw-bold">{Number(sheet.required_qty).toLocaleString()}</span>
          </div>
          <div>
            <small className="text-muted d-block">Produced Qty</small>
            <span className="fw-bold text-success">{Number(sheet.produced_qty).toLocaleString()}</span>
          </div>
          <div>
            <small className="text-muted d-block">Pending Qty</small>
            <span className="fw-bold text-danger">{Number(sheet.pending_qty).toLocaleString()}</span>
          </div>
        </div>

        <h6 className="mb-3 border-bottom pb-2">New Production Entry</h6>
        <Form onSubmit={handleSubmit} className="mb-4">
          <div className="row g-3">
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Date</Form.Label>
                <Form.Control 
                  type="date" 
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.production_date}
                  onChange={e => setFormData({...formData, production_date: e.target.value})}
                />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Produced Qty</Form.Label>
                <Form.Control 
                  type="number" 
                  step="0.01" 
                  min="0"
                  max={sheet.pending_qty}
                  required
                  placeholder={`Max: ${sheet.pending_qty}`}
                  value={formData.produced_qty}
                  onChange={e => setFormData({...formData, produced_qty: e.target.value})}
                />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Remarks</Form.Label>
                <Form.Control 
                  type="text" 
                  value={formData.remarks}
                  onChange={e => setFormData({...formData, remarks: e.target.value})}
                  placeholder="E.g., Batch 1"
                />
              </Form.Group>
            </div>
            <div className="col-12 text-end mt-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </div>
        </Form>

        <h6 className="mb-3 border-bottom pb-2">Production History</h6>
        {loading ? (
          <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
        ) : entries.length === 0 ? (
          <div className="text-muted text-center py-3">No previous entries.</div>
        ) : (
          <Table size="sm" bordered hover className="text-center align-middle" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light text-muted">
              <tr>
                <th>Date</th>
                <th>Produced Qty</th>
                <th>Remarks</th>
                <th>Updated By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.production_date).toLocaleDateString()}</td>
                  <td className="fw-bold text-success">+{Number(e.produced_qty).toLocaleString()}</td>
                  <td>{e.remarks || '-'}</td>
                  <td>{e.first_name} {e.last_name}</td>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ProductionEntryModal;
