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
import { Modal, Form, Table, Spinner, Badge } from 'react-bootstrap';
import { Plus } from 'lucide-react';
import Button from '../shared/Button.jsx';
import api from '../../services/api';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';

const LogProductionModal = ({ isOpen, onClose, sheetId, line }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    update_date: new Date().toISOString().split('T')[0],
    boxes_produced: '',
    remarks: ''
  });



  useEffect(() => {
    if (isOpen && sheetId && line) {
      fetchLogs();
    }
  }, [isOpen, sheetId, line]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/order-sheets/${sheetId}/lines/${line.id}/production-log`);
      setLogs(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      showError('Failed to fetch production history');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post(`/order-sheets/${sheetId}/lines/${line.id}/production-log`, formData);
      showSuccess('Production log added successfully');
      setFormData({
        update_date: new Date().toISOString().split('T')[0],
        boxes_produced: '',
        remarks: ''
      });
      fetchLogs();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Error saving log');
    } finally {
      setSubmitting(false);
    }
  };

  if (!line) return null;

  const totalProd = parseFloat(line.total_production_boxes || line.totalProductionBoxes || 0);
  const totalCompleted = logs.reduce((sum, log) => sum + parseFloat(log.boxes_produced || log.boxesProduced || 0), 0);
  const pending = totalProd - totalCompleted;

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="h6 fw-bold mb-0">Production Log: {line.product_category || line.productCategory}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between mb-4 bg-primary-light p-3 rounded border">
          <div>
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: '10px' }}>Total Boxes Required</small>
            <span className="fw-bold text-dark fs-5">{totalProd.toLocaleString()}</span>
          </div>
          <div>
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: '10px' }}>Completed Boxes</small>
            <span className="fw-bold text-success fs-5">{totalCompleted.toLocaleString()}</span>
          </div>
          <div className="text-end">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: '10px' }}>Pending Boxes</small>
            <span className="fw-bold text-danger fs-5">{pending.toLocaleString()}</span>
          </div>
        </div>

        <h6 className="fw-bold mb-3">Add New Log</h6>
        <Form onSubmit={handleSubmit} className="mb-4">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="small fw-medium text-muted">Date</Form.Label>
                <Form.Control 
                  type="date" 
                  size="sm"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.update_date}
                  onChange={e => setFormData({...formData, update_date: e.target.value})}
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="small fw-medium text-muted">Boxes Produced</Form.Label>
                <Form.Control 
                  type="number" 
                  size="sm"
                  step="0.01" 
                  min="0.01"
                  max={pending > 0 ? pending : 0}
                  required
                  placeholder={`Max: ${pending}`}
                  value={formData.boxes_produced}
                  onChange={e => setFormData({...formData, boxes_produced: e.target.value})}
                  disabled={pending <= 0}
                />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group>
                <Form.Label className="small fw-medium text-muted">Remarks (Optional)</Form.Label>
                <Form.Control 
                  type="text" 
                  size="sm"
                  value={formData.remarks}
                  onChange={e => setFormData({...formData, remarks: e.target.value})}
                  placeholder="E.g., Shift A, Batch 1"
                  disabled={pending <= 0}
                />
              </Form.Group>
            </div>
            <div className="col-md-2">
              <Button type="submit" variant="primary" disabled={submitting || pending <= 0} className="w-100 py-1">
                {submitting ? <Spinner size="sm" /> : <><Plus size={14} className="me-1"/> Add</>}
              </Button>
            </div>
          </div>
        </Form>

        <h6 className="fw-bold mb-3 border-top pt-3">Production History Log</h6>
        {loading ? (
          <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
        ) : logs.length === 0 ? (
          <div className="text-muted text-center py-4 bg-light rounded small">No production updates found for this line item.</div>
        ) : (
          <div className="table-responsive">
            <Table size="sm" hover className="align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="bg-light">
                <tr>
                  <th className="text-secondary fw-bold">Date</th>
                  <th className="text-secondary fw-bold text-end">Boxes Produced</th>
                  <th className="text-secondary fw-bold">Remarks</th>
                  <th className="text-secondary fw-bold">Updated By</th>
                  <th className="text-secondary fw-bold text-end">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td data-label="Date" className="fw-medium text-start">{new Date(log.update_date || log.updateDate).toLocaleDateString()}</td>
                    <td data-label="Boxes Produced" className="fw-bold text-success text-start">+{parseFloat(log.boxes_produced || log.boxesProduced).toLocaleString()}</td>
                    <td data-label="Remarks" className="text-muted text-start">{log.remarks || '-'}</td>
                    <td data-label="Updated By" className="text-start">{log.user_name || log.userName || 'System'}</td>
                    <td data-label="Timestamp" className="text-muted small text-start">{new Date(log.created_at || log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default LogProductionModal;
