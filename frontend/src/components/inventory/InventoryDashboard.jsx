import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const MOVEMENT_TYPES = ['IN', 'OUT', 'PRODUCTION', 'DISPATCH', 'ADJUSTMENT', 'TRANSFER'];

const InventoryDashboard = ({ onNavigate, showSuccess, showError }) => {
  const [summary, setSummary] = useState(null);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_id: '',
    movement_type: 'IN',
    quantity_boxes: '',
    warehouse_location: 'Main Warehouse',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, stockRes, movRes, resvRes, prodRes, sanProdRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get('/inventory/register?limit=100'),
        api.get('/inventory/movements?limit=20'),
        api.get('/inventory/reservations'),
        api.get('/products?limit=1000').catch(() => ({ data: { data: { data: [] } } })),
        api.get('/sanitaryware-products?limit=1000').catch(() => ({ data: { data: { data: [] } } })),
      ]);
      const stockItems = stockRes.data?.data?.items ?? stockRes.data?.data;
      
      const tileProducts = prodRes.data?.data?.data ?? prodRes.data?.data?.items ?? prodRes.data?.data ?? [];
      const sanProducts = sanProdRes.data?.data?.data ?? sanProdRes.data?.data?.items ?? sanProdRes.data?.data ?? [];
      
      const allProducts = [
        ...(Array.isArray(tileProducts) ? tileProducts : []),
        ...(Array.isArray(sanProducts) ? sanProducts : [])
      ];

      setSummary(summaryRes.data?.data || summaryRes.data || {});
      setStock(Array.isArray(stockItems) ? stockItems : []);
      setMovements(Array.isArray(movRes.data?.data) ? movRes.data.data : []);
      setReservations(Array.isArray(resvRes.data?.data) ? resvRes.data.data : []);
      setProducts(allProducts);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load inventory';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        showError?.('Cannot reach the server. Please ensure the backend is running on port 8000.');
      } else {
        showError?.(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMovement = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/movements', form);
      showSuccess?.('Stock movement recorded');
      setShowModal(false);
      setForm({ product_id: '', movement_type: 'IN', quantity_boxes: '', warehouse_location: 'Main Warehouse', notes: '' });
      loadData();
    } catch (err) {
      showError?.(err.response?.data?.message || 'Movement failed');
    }
  };

  const handleRelease = async (id) => {
    try {
      await api.post(`/inventory/reservations/${id}/release`);
      showSuccess?.('Reservation released');
      loadData();
    } catch (err) {
      showError?.(err.response?.data?.message || 'Release failed');
    }
  };

  if (loading && !summary) {
    return <div className="text-center p-5"><Spinner animation="border" /></div>;
  }

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Inventory & Stock Register</h4>
          <p className="text-muted mb-0">Warehouse stock, movements, and reservations</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>Record Movement</Button>
      </div>

      <Row className="g-3 mb-4">
        {[
          { label: 'Total SKUs', value: summary?.total_skus ?? 0 },
          { label: 'Total Boxes', value: summary?.total_boxes ?? 0 },
          { label: 'Reserved', value: summary?.total_reserved ?? 0 },
          { label: 'Available', value: summary?.total_available ?? 0 },
        ].map((kpi) => (
          <Col md={3} key={kpi.label}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="text-muted small">{kpi.label}</div>
                <div className="fs-4 fw-bold">{kpi.value}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white fw-bold">Stock Register</Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Boxes</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>SQM</th>
              </tr>
            </thead>
            <tbody>
              {stock.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted py-4">No stock records yet. Record an IN movement to add stock.</td></tr>
              ) : stock.map((row) => (
                <tr key={row.id}>
                  <td>{row.product_name || row.product_code || row.product_id?.slice(0, 8)}</td>
                  <td>{row.warehouse_location}</td>
                  <td>{row.quantity_boxes}</td>
                  <td>{row.reserved_boxes}</td>
                  <td><Badge bg={row.available_boxes > 0 ? 'success' : 'secondary'}>{row.available_boxes}</Badge></td>
                  <td>{row.quantity_sqm}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Row className="g-3">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-bold">Recent Movements</Card.Header>
            <Card.Body className="p-0">
              <Table responsive size="sm" className="mb-0">
                <thead><tr><th>Type</th><th>Product</th><th>Qty</th><th>Date</th></tr></thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td><Badge bg={m.movement_type === 'IN' ? 'success' : 'warning'}>{m.movement_type}</Badge></td>
                      <td>{m.product_name || '—'}</td>
                      <td>{m.quantity_boxes}</td>
                      <td>{new Date(m.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-bold">Active Reservations</Card.Header>
            <Card.Body className="p-0">
              <Table responsive size="sm" className="mb-0">
                <thead><tr><th>Product</th><th>Reserved</th><th>Ref</th><th></th></tr></thead>
                <tbody>
                  {reservations.length === 0 ? (
                    <tr><td colSpan={4} className="text-muted text-center py-3">No active reservations</td></tr>
                  ) : reservations.map((r) => (
                    <tr key={r.id}>
                      <td>{r.product_name || '—'}</td>
                      <td>{r.reserved_boxes}</td>
                      <td>{r.reference_no || r.reference_type}</td>
                      <td><Button size="sm" variant="outline-danger" onClick={() => handleRelease(r.id)}>Release</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton><Modal.Title>Record Stock Movement</Modal.Title></Modal.Header>
        <Form onSubmit={handleMovement}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Product</Form.Label>
              <Form.Select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name || p.product_code}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Movement Type</Form.Label>
              <Form.Select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
                {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Quantity (Boxes)</Form.Label>
              <Form.Control type="number" min="0.01" step="0.01" required value={form.quantity_boxes}
                onChange={(e) => setForm({ ...form, quantity_boxes: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Warehouse</Form.Label>
              <Form.Control value={form.warehouse_location}
                onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Movement</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryDashboard;
