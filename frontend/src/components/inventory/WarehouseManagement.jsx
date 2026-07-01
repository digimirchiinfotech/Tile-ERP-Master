import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Badge } from 'react-bootstrap';
import { Edit, Plus } from 'lucide-react';
import { api } from '../../services/api';

const WarehouseManagement = ({ showSuccess, showError }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', is_active: true });

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/warehouses');
      setWarehouses(res.data?.data || []);
    } catch (err) {
      showError('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/inventory/warehouses/${editingId}`, form);
        showSuccess('Warehouse updated');
      } else {
        await api.post('/inventory/warehouses', form);
        showSuccess('Warehouse created');
      }
      setShowModal(false);
      loadWarehouses();
    } catch (err) {
      showError('Failed to save warehouse');
    }
  };

  const openModal = (wh = null) => {
    if (wh) {
      setEditingId(wh.id);
      setForm({ name: wh.name, code: wh.code || '', address: wh.address || '', is_active: wh.is_active });
    } else {
      setEditingId(null);
      setForm({ name: '', code: '', address: '', is_active: true });
    }
    setShowModal(true);
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
        <h5 className="mb-0">Warehouse Management</h5>
        <Button variant="primary" onClick={() => openModal()}>
          <Plus size={16} className="me-2" /> Add Warehouse
        </Button>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
        ) : (
          <Table hover responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map(w => (
                <tr key={w.id}>
                  <td className="fw-medium">{w.name}</td>
                  <td>{w.code || '-'}</td>
                  <td>{w.address || '-'}</td>
                  <td>
                    <Badge bg={w.is_active ? 'success' : 'danger'}>{w.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td>
                    <Button variant="light" size="sm" onClick={() => openModal(w)}>
                      <Edit size={14} className="me-1" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {warehouses.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">No warehouses configured.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Warehouse' : 'New Warehouse'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Warehouse Name *</Form.Label>
              <Form.Control required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Warehouse Code</Form.Label>
              <Form.Control value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </Form.Group>
            {editingId && (
              <Form.Check type="switch" id="active-switch" label="Is Active"
                checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default WarehouseManagement;
