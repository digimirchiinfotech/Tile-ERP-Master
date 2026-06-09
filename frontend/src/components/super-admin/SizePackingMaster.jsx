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
import { Card, Table, Button, Form, Modal, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { Search, Plus, Edit, Trash2, Copy, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';

function SizePackingMaster() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Available sizes to copy from / select from
  const [availableSizes, setAvailableSizes] = useState([]);
  const [copyFromId, setCopyFromId] = useState('');

  const [deleteConfig, setDeleteConfig] = useState(null);

  const [formData, setFormData] = useState({
    size: '',
    boxPcs: 0,
    sqmPerBox: 0,
    boxesPerPallet: 0,
    boxesPerKathli: 0,
    perBoxWeight: 0,
    perPalletWeight: 0,
    status: 'Active'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
    fetchAvailableSizes();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/size-packing-master');
      setData(response.data.data || []);
    } catch (error) {
      showError('Failed to fetch size packing master data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSizes = async () => {
    try {
      const response = await api.get('/master-data/sizes');
      setAvailableSizes(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch sizes', error);
    }
  };

  const handleOpenModal = (item = null) => {
    setErrors({});
    setCopyFromId('');
    if (item) {
      setEditingItem(item);
      setFormData({
        size: item.size || '',
        boxPcs: item.boxPcs || 0,
        sqmPerBox: item.sqmPerBox || 0,
        boxesPerPallet: item.boxesPerPallet || 0,
        boxesPerKathli: item.boxesPerKathli || 0,
        perBoxWeight: item.perBoxWeight || 0,
        perPalletWeight: item.perPalletWeight || 0,
        status: item.status || 'Active'
      });
    } else {
      setEditingItem(null);
      setFormData({
        size: '',
        boxPcs: 0,
        sqmPerBox: 0,
        boxesPerPallet: 0,
        boxesPerKathli: 0,
        perBoxWeight: 0,
        perPalletWeight: 0,
        status: 'Active'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleCopyFromChange = (e) => {
    const selectedId = e.target.value;
    setCopyFromId(selectedId);
    
    if (selectedId) {
      const templateToCopy = data.find(d => d.id === selectedId);
      if (templateToCopy) {
        setFormData(prev => ({
          ...prev,
          boxPcs: templateToCopy.boxPcs,
          sqmPerBox: templateToCopy.sqmPerBox,
          boxesPerPallet: templateToCopy.boxesPerPallet,
          boxesPerKathli: templateToCopy.boxesPerKathli,
          perBoxWeight: templateToCopy.perBoxWeight,
          perPalletWeight: templateToCopy.perPalletWeight
        }));
        showSuccess(`Copied packing details from ${templateToCopy.size}`);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.size) newErrors.size = 'Size is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingItem) {
        await api.put(`/size-packing-master/${editingItem.id}`, formData);
        showSuccess('Template updated successfully');
      } else {
        await api.post('/size-packing-master', formData);
        showSuccess('Template created successfully');
      }
      handleCloseModal();
      fetchData();
      fetchAvailableSizes(); // Refresh sizes in case a new one was added
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfig) return;
    try {
      await api.delete(`/size-packing-master/${deleteConfig.id}`);
      showSuccess('Template deleted successfully');
      fetchData();
    } catch (error) {
      showError('Failed to delete template');
    } finally {
      setDeleteConfig(null);
    }
  };

  const filteredData = data.filter(item => 
    item.size.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Size Packing Master</h4>
          <p className="text-muted small mb-0">Manage default packing templates for product sizes</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="d-flex align-items-center rounded-3">
          <Plus size={16} className="me-2" />
          Add Template
        </Button>
      </div>

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Header className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
          <div className="position-relative" style={{ width: '300px' }}>
            <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
            <Form.Control
              type="text"
              placeholder="Search sizes..."
              className="ps-5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Badge bg="primary" className="px-3 py-2 rounded-pill">Total: {filteredData.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <AlertCircle size={40} className="mb-3 opacity-50" />
              <h5>No templates found</h5>
              <p>Create a new packing template to get started.</p>
            </div>
          ) : (
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Size</th>
                  <th>Box Pcs</th>
                  <th>SQM / Box</th>
                  <th>Boxes / Pallet</th>
                  <th>Box Wt (kg)</th>
                  <th>Pallet Wt (kg)</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Size" className="ps-4 fw-bold text-primary">{item.size}</td>
                    <td data-label="Box Pcs">{item.boxPcs || 0}</td>
                    <td data-label="SQM / Box">{item.sqmPerBox || 0}</td>
                    <td data-label="Boxes / Pallet">{item.boxesPerPallet || 0}</td>
                    <td data-label="Box Wt (kg)">{item.perBoxWeight || 0}</td>
                    <td data-label="Pallet Wt (kg)">{item.perPalletWeight || 0}</td>
                    <td data-label="Actions" className="text-end pe-4">
                      <Button variant="light" size="sm" className="me-2 text-primary" onClick={() => handleOpenModal(item)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="light" size="sm" className="text-danger" onClick={() => setDeleteConfig(item)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{editingItem ? 'Edit' : 'Add'} Packing Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            {!editingItem && data.length > 0 && (
              <Row className="mb-4">
                <Col md={12}>
                  <Card className="bg-light border-0">
                    <Card.Body className="py-2 px-3 d-flex align-items-center">
                      <Copy size={16} className="text-primary me-2" />
                      <Form.Group className="mb-0 flex-grow-1 d-flex align-items-center">
                        <Form.Label className="mb-0 me-3 text-nowrap fw-bold small">Copy From Existing Size:</Form.Label>
                        <Form.Select 
                          size="sm" 
                          value={copyFromId}
                          onChange={handleCopyFromChange}
                          className="w-auto"
                        >
                          <option value="">-- Select Template to Copy --</option>
                          {data.map(d => (
                            <option key={d.id} value={d.id}>{d.size}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold">Size *</Form.Label>
                  <div className="d-flex">
                     {/* Allow free text OR selection for sizes. Usually an input with datalist works well. */}
                     <Form.Control
                       list="size-options"
                       value={formData.size}
                       onChange={(e) => handleInputChange('size', e.target.value)}
                       isInvalid={!!errors.size}
                       placeholder="e.g. 600x1200"
                       disabled={!!editingItem} // Disable changing size string if editing, to prevent conflicts. 
                     />
                     <datalist id="size-options">
                       {availableSizes.map((s, idx) => (
                         <option key={idx} value={s.value || s} />
                       ))}
                     </datalist>
                  </div>
                  <Form.Control.Feedback type="invalid">{errors.size}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Box Pcs</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.boxPcs}
                    onChange={(e) => handleInputChange('boxPcs', parseInt(e.target.value) || 0)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>SQM per Box</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.sqmPerBox}
                    onChange={(e) => handleInputChange('sqmPerBox', parseFloat(e.target.value) || 0)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Boxes per Pallet</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.boxesPerPallet}
                    onChange={(e) => handleInputChange('boxesPerPallet', parseInt(e.target.value) || 0)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Boxes per Kathli</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.boxesPerKathli}
                    onChange={(e) => handleInputChange('boxesPerKathli', parseInt(e.target.value) || 0)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Per Box Weight (kg)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.perBoxWeight}
                    onChange={(e) => handleInputChange('perBoxWeight', parseFloat(e.target.value) || 0)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Per Pallet Weight (kg)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.perPalletWeight}
                    onChange={(e) => handleInputChange('perPalletWeight', parseFloat(e.target.value) || 0)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="light" onClick={handleCloseModal}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'Save Template'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <ConfirmationModal
        show={!!deleteConfig}
        title="Delete Template"
        message={`Are you sure you want to delete the packing template for size "${deleteConfig?.size}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfig(null)}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}

export default SizePackingMaster;
