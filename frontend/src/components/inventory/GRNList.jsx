import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Row, Col, Badge, InputGroup } from 'react-bootstrap';
import { Plus, Search, Eye } from 'lucide-react';
import { api } from '../../services/api';

const GRNList = ({ showSuccess, showError, warehouses, products }) => {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [form, setForm] = useState({
    grn_number: '',
    grn_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    vehicle_number: '',
    inspector_name: '',
    weighbridge_ticket: '',
    notes: '',
    items: []
  });

  const loadGRNs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/grn');
      setGrns(res.data?.data || []);
    } catch (err) {
      showError('Failed to load GRNs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGRNs();
  }, []);

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { product_id: '', warehouse_location: '', quantity_boxes: '', quantity_sqm: '' }]
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    
    // Auto-calculate sqm if product changes or boxes change
    if ((field === 'product_id' || field === 'quantity_boxes') && newItems[index].product_id && newItems[index].quantity_boxes) {
       const prod = products.find(p => p.id === newItems[index].product_id);
       if (prod) {
          const boxes = parseFloat(newItems[index].quantity_boxes) || 0;
          const sqmPerBox = parseFloat(prod.sqm_per_box) || 0;
          newItems[index].quantity_sqm = (boxes * sqmPerBox).toFixed(4);
       }
    }
    
    setForm({ ...form, items: newItems });
  };

  const handleRemoveItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) {
      showError('Please add at least one item to receive.');
      return;
    }
    
    try {
      await api.post('/inventory/grn', form);
      showSuccess('GRN created successfully');
      setShowModal(false);
      loadGRNs();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create GRN');
    }
  };

  const filteredGRNs = grns.filter(g => 
    g.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
        <h5 className="mb-0">Goods Receipt Notes (GRN)</h5>
        <div className="d-flex gap-3">
          <InputGroup size="sm" style={{ width: '250px' }}>
            <InputGroup.Text className="bg-light border-end-0"><Search size={14}/></InputGroup.Text>
            <Form.Control className="border-start-0 bg-light" placeholder="Search GRNs..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </InputGroup>
          <Button variant="primary" onClick={() => {
            setForm({
              grn_number: `GRN-${Date.now().toString().slice(-6)}`,
              grn_date: new Date().toISOString().split('T')[0],
              supplier_name: '', vehicle_number: '', inspector_name: '', weighbridge_ticket: '', notes: '',
              items: []
            });
            setShowModal(true);
          }}>
            <Plus size={16} className="me-2" /> New GRN
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
        ) : (
          <Table hover responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th>GRN Number</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Vehicle No</th>
                <th>Total Boxes</th>
                <th>Inspector</th>
              </tr>
            </thead>
            <tbody>
              {filteredGRNs.map(g => (
                <tr key={g.id}>
                  <td className="fw-medium text-primary">{g.grn_number}</td>
                  <td>{new Date(g.grn_date).toLocaleDateString()}</td>
                  <td>{g.supplier_name || '-'}</td>
                  <td>{g.vehicle_number || '-'}</td>
                  <td><Badge bg="info">{g.total_boxes}</Badge></td>
                  <td>{g.inspector_name || '-'}</td>
                </tr>
              ))}
              {filteredGRNs.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">No GRNs found.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title>Create Goods Receipt Note (GRN)</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>GRN Number *</Form.Label>
                  <Form.Control required value={form.grn_number} onChange={e => setForm({...form, grn_number: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control type="date" required value={form.grn_date} onChange={e => setForm({...form, grn_date: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Supplier Name</Form.Label>
                  <Form.Control value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Vehicle Number</Form.Label>
                  <Form.Control value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>QA Inspector Name</Form.Label>
                  <Form.Control value={form.inspector_name} onChange={e => setForm({...form, inspector_name: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Weighbridge Ticket</Form.Label>
                  <Form.Control value={form.weighbridge_ticket} onChange={e => setForm({...form, weighbridge_ticket: e.target.value})} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-4">
              <Form.Label>Notes / Remarks</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-bold">Received Items</h6>
              <Button variant="outline-primary" size="sm" onClick={handleAddItem}>
                <Plus size={14} className="me-1" /> Add Item
              </Button>
            </div>
            
            <Table bordered hover size="sm">
              <thead className="table-light">
                <tr>
                  <th width="40%">Product *</th>
                  <th width="25%">Warehouse *</th>
                  <th width="15%">Quantity (Boxes) *</th>
                  <th width="15%">Quantity (SQM)</th>
                  <th width="5%"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <Form.Select required value={item.product_id} onChange={e => handleItemChange(index, 'product_id', e.target.value)}>
                        <option value="">Select Product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Select required value={item.warehouse_location} onChange={e => handleItemChange(index, 'warehouse_location', e.target.value)}>
                        <option value="">Select Warehouse...</option>
                        {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Control type="number" required min="1" value={item.quantity_boxes} onChange={e => handleItemChange(index, 'quantity_boxes', e.target.value)} />
                    </td>
                    <td>
                      <Form.Control type="number" step="0.0001" value={item.quantity_sqm} onChange={e => handleItemChange(index, 'quantity_sqm', e.target.value)} />
                    </td>
                    <td className="text-center align-middle">
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemoveItem(index)}>X</Button>
                    </td>
                  </tr>
                ))}
                {form.items.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-3">No items added. Click "Add Item" to begin.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="success" type="submit">Submit GRN</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default GRNList;
