import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Row, Col, Badge } from 'react-bootstrap';
import { FileText } from 'lucide-react';
import api from '../../services/api';

const StockLedger = ({ showError, products, warehouses }) => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ product_id: '', warehouse_location: '' });

  const loadLedger = async () => {
    if (!filters.product_id) return;
    try {
      setLoading(true);
      const res = await api.get('/inventory/ledger', { params: filters });
      setLedger(res.data?.data || []);
    } catch (err) {
      showError('Failed to load stock ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [filters]);

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white py-3 border-bottom">
        <h5 className="mb-3">Detailed Stock Ledger</h5>
        <Row>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Select Product *</Form.Label>
              <Form.Select value={filters.product_id} onChange={e => setFilters({...filters, product_id: e.target.value})}>
                <option value="">-- Choose Product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Filter by Warehouse</Form.Label>
              <Form.Select value={filters.warehouse_location} onChange={e => setFilters({...filters, warehouse_location: e.target.value})}>
                <option value="">All Warehouses</option>
                {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {!filters.product_id ? (
          <div className="text-center py-5 text-muted">
            <FileText size={48} className="mb-3 opacity-25" />
            <h6>Please select a product to view its stock ledger</h6>
          </div>
        ) : loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
        ) : (
          <Table hover responsive bordered className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date & Time</th>
                <th>Warehouse</th>
                <th>Movement Type</th>
                <th>Reference</th>
                <th>Notes</th>
                <th className="text-end">Qty In</th>
                <th className="text-end">Qty Out</th>
                <th className="text-end bg-light fw-bold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(row => {
                const isAdd = ['IN', 'PRODUCTION', 'ADJUSTMENT'].includes(row.movement_type);
                return (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{row.warehouse_location}</td>
                    <td><Badge bg={isAdd ? 'success' : 'danger'}>{row.movement_type}</Badge></td>
                    <td>
                      {row.reference_type ? <span className="small text-muted">{row.reference_type}</span> : ''}
                      {row.reference_no ? <div><strong>{row.reference_no}</strong></div> : ''}
                    </td>
                    <td className="small text-muted">{row.notes || '-'}</td>
                    <td className="text-end text-success fw-medium">{isAdd ? row.quantity_boxes : '-'}</td>
                    <td className="text-end text-danger fw-medium">{!isAdd ? row.quantity_boxes : '-'}</td>
                    <td className="text-end bg-light fw-bold">{row.balance}</td>
                  </tr>
                );
              })}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No transactions found for this product.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default StockLedger;
