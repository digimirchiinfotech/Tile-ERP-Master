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
import { Row, Col, Card, Form, Button, Table, Badge, Modal, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const FactoryMaster = ({ currentUser }) => {
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    factoryCode: '',
    contactPerson: '',
    contactNumber: '',
    emailId: '',
    location: '',
    gstNumber: '',
    factoryType: 'Manufacturer',
    manufacturingCapacity: '',
    preferredSupplier: '',
    status: 'Active'
  });
  const [search, setSearch] = useState('');
  
  // Basic permission check
  const canManage = currentUser?.role === 'super_admin' || currentUser?.role === 'company_admin' || currentUser?.permissions?.includes('qc_management');

  const fetchFactories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/factory-master', { params: { search, limit: 100 } });
      setFactories(res.data.data);
    } catch (error) {
      console.error('Error fetching factories', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactories();
  }, [search]);

  const handleShow = (factory = null) => {
    if (factory) {
      setEditingId(factory.id);
      setFormData({
        name: factory.name || '',
        factoryCode: factory.factoryCode || '',
        contactPerson: factory.contactPerson || '',
        contactNumber: factory.contactNumber || '',
        emailId: factory.emailId || '',
        location: factory.location || '',
        gstNumber: factory.gstNumber || '',
        factoryType: factory.factoryType || 'Manufacturer',
        manufacturingCapacity: factory.manufacturingCapacity || '',
        preferredSupplier: factory.preferredSupplier || '',
        status: factory.status || 'Active'
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', factoryCode: '', contactPerson: '', contactNumber: '', emailId: '',
        location: '', gstNumber: '', factoryType: 'Manufacturer', manufacturingCapacity: '',
        preferredSupplier: '', status: 'Active'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        factory_code: formData.factoryCode,
        contact_person: formData.contactPerson,
        contact_number: formData.contactNumber,
        email_id: formData.emailId,
        location: formData.location,
        gst_number: formData.gstNumber,
        factory_type: formData.factoryType,
        manufacturing_capacity: formData.manufacturingCapacity,
        preferred_supplier: formData.preferredSupplier,
        status: formData.status
      };

      if (editingId) {
        await api.put(`/factory-master/${editingId}`, payload);
      } else {
        await api.post('/factory-master', payload);
      }
      setShowModal(false);
      fetchFactories();
    } catch (error) {
      console.error('Error saving factory', error);
      alert('Error saving factory details');
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 text-primary fw-bold">Factory Master</h4>
        {canManage && (
          <Button variant="primary" onClick={() => handleShow()}>+ Add Factory</Button>
        )}
      </div>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Form.Control
            type="text"
            placeholder="Search Factory Name, Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Factory Code</th>
                  <th>Factory Name</th>
                  <th>Contact Person</th>
                  <th>Phone / Email</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  {canManage && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-4"><Spinner animation="border" size="sm"/> Loading...</td></tr>
                ) : factories.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">No factories found</td></tr>
                ) : factories.map(f => (
                  <tr key={f.id}>
                    <td className="fw-bold">{f.factoryCode || '-'}</td>
                    <td>{f.name}</td>
                    <td>{f.contactPerson || '-'}</td>
                    <td>
                      <div>{f.contactNumber || '-'}</div>
                      <small className="text-muted">{f.emailId}</small>
                    </td>
                    <td>{f.manufacturingCapacity || '-'}</td>
                    <td>
                      <Badge bg={f.status === 'Active' ? 'success' : 'secondary'}>{f.status}</Badge>
                    </td>
                    {canManage && (
                      <td className="text-end">
                        <Button variant="link" size="sm" onClick={() => handleShow(f)}>Edit</Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Factory' : 'Add New Factory'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Factory Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Factory Code</Form.Label>
                  <Form.Control value={formData.factoryCode} onChange={e=>setFormData({...formData, factoryCode: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Contact Person</Form.Label>
                  <Form.Control value={formData.contactPerson} onChange={e=>setFormData({...formData, contactPerson: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Contact Number</Form.Label>
                  <Form.Control value={formData.contactNumber} onChange={e=>setFormData({...formData, contactNumber: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email ID</Form.Label>
                  <Form.Control type="email" value={formData.emailId} onChange={e=>setFormData({...formData, emailId: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>GST Number</Form.Label>
                  <Form.Control value={formData.gstNumber} onChange={e=>setFormData({...formData, gstNumber: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Factory Type</Form.Label>
                  <Form.Select value={formData.factoryType} onChange={e=>setFormData({...formData, factoryType: e.target.value})}>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Processor">Processor</option>
                    <option value="Trader">Trader</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Manufacturing Capacity</Form.Label>
                  <Form.Control value={formData.manufacturingCapacity} onChange={e=>setFormData({...formData, manufacturingCapacity: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Location / Address</Form.Label>
                  <Form.Control as="textarea" rows={2} value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Factory</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default FactoryMaster;
