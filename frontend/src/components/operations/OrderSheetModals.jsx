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
import { Modal, Form, Badge, Table, Alert } from 'react-bootstrap';
import { X, Save, AlertCircle, Trash2, Plus, Box, Layout, ShieldCheck } from 'lucide-react';
import Button from '../shared/Button.jsx';
import api from '../../services/api';
import LogProductionModal from './LogProductionModal.jsx';

export const CreateOrderSheetModal = ({ isOpen, onClose, onSave, availableFactories }) => {
  const [formData, setFormData] = useState({
    proforma_order_id: '',
    booking_number: '',
    priority: 'Medium',
    shipment_date: '',
    internal_notes: ''
  });

  const [availablePOs, setAvailablePOs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loadingPOs, setLoadingPOs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchApprovedPOs();
    } else {
      setFormData({
        proforma_order_id: '',
        booking_number: '',
        priority: 'Medium',
        shipment_date: '',
        internal_notes: ''
      });
      setSelectedPO(null);
    }
  }, [isOpen]);

  const fetchApprovedPOs = async () => {
    try {
      setLoadingPOs(true);
      const response = await api.get('/proforma-orders?status=Approved&limit=100');
      const responseData = response.data?.data || response.data;
      const items = responseData?.data || responseData?.items || responseData || [];
      
      // Fetch existing Master Order Sheets to filter out already used POs
      const msResponse = await api.get('/order-sheets?limit=1000');
      const msData = msResponse.data?.data?.items || msResponse.data?.data?.data || msResponse.data?.data || [];
      const usedPoIds = new Set(msData.map(ms => ms.proformaOrderId || ms.proforma_order_id));

      const filteredItems = Array.isArray(items) ? items.filter(po => !usedPoIds.has(po.id)) : [];
      setAvailablePOs(filteredItems);
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const handlePOselect = async (e) => {
    const poId = e.target.value;
    setFormData(prev => ({ ...prev, proforma_order_id: poId }));
    
    if (!poId) {
      setSelectedPO(null);
      return;
    }

    try {
      const response = await api.get(`/proforma-orders/${poId}`);
      const poData = response.data?.data || response.data;
      setSelectedPO(poData);
    } catch (error) {
      console.error('Error fetching PO details:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="xl" centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h5 fw-bold mb-0">Create Master Order Sheet</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Alert variant="info" className="d-flex align-items-center py-2 mb-4">
            <AlertCircle size={16} className="me-2 flex-shrink-0" />
            <div className="small">
              Creating a Master Order Sheet will automatically import all product lines from the selected Proforma Order.
            </div>
          </Alert>

          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Select Approved PO <span className="text-danger">*</span></Form.Label>
                <Form.Select 
                  onChange={handlePOselect} 
                  value={formData.proforma_order_id}
                  disabled={loadingPOs}
                  required
                >
                  <option value="">-- Select PO --</option>
                  {availablePOs.map(po => {
                    let snapName = '';
                    if (po.snapshot_data) {
                      try {
                        const snap = typeof po.snapshot_data === 'string' ? JSON.parse(po.snapshot_data) : po.snapshot_data;
                        snapName = snap.client_details?.client_name || snap.client_details?.name || snap.client_name || snap.company_details?.name || snap.company_name || '';
                      } catch(e) {}
                    }
                    const displayName = po.piClient || po.pi_client || po.supplierNameRef || po.supplier_name_ref || po.supplierName || po.supplier_name || po.clientName || po.client_name || snapName || 'Unknown Supplier';
                    return (
                      <option key={po.id} value={po.id}>
                        {po.order_no || po.orderNo} - {displayName}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="small fw-medium">Priority</Form.Label>
                <Form.Select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="small fw-medium">Expected Shipment Date</Form.Label>
                <Form.Control type="date" name="shipment_date" value={formData.shipment_date} onChange={handleChange} />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Container Booking Number</Form.Label>
                <Form.Control type="text" name="booking_number" value={formData.booking_number} onChange={handleChange} placeholder="Optional" />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Internal Notes</Form.Label>
                <Form.Control type="text" name="internal_notes" value={formData.internal_notes} onChange={handleChange} placeholder="Internal instructions..." />
              </Form.Group>
            </div>
          </div>

          {selectedPO && (
            <div className="border rounded">
              <div className="bg-light p-2 border-bottom fw-bold text-dark d-flex align-items-center">
                <Box size={16} className="me-2 text-primary" />
                Products to be Included ({(selectedPO.lines || selectedPO.product_lines || []).length})
              </div>
              <div className="table-responsive" style={{ maxHeight: '300px' }}>
                <Table hover size="sm" className="mb-0 align-middle">
                  <thead className="bg-white sticky-top shadow-sm">
                    <tr>
                      <th className="text-secondary small fw-bold">Product</th>
                      <th className="text-secondary small fw-bold">Size</th>
                      <th className="text-secondary small fw-bold">Surface</th>
                      <th className="text-secondary small fw-bold text-end">Required SQM</th>
                      <th className="text-secondary small fw-bold text-end">Total Boxes</th>
                      <th className="text-secondary small fw-bold text-end">Total Production</th>
                      <th className="text-secondary small fw-bold text-end">Production Completed</th>
                      <th className="text-secondary small fw-bold text-end">Production Pending</th>
                      <th className="text-secondary small fw-bold text-end">Total Pallets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPO.lines || selectedPO.product_lines || []).length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-3 text-muted small">No products found in this PO.</td>
                      </tr>
                    ) : (
                      (selectedPO.lines || selectedPO.product_lines || []).map((line, idx) => {
                        const pName = (typeof line.product === 'string' && line.product.trim() !== '') ? line.product : (line.product_name || line.productName || line.product?.name || line.name || line.product_category || 'Unknown Product');
                        const pDesign = line.color || line.design || line.design_name || '';
                        return (
                          <tr key={idx}>
                            <td className="fw-medium small">{pDesign ? `${pName} - ${pDesign}` : pName}</td>
                            <td className="small">{line.size || '-'}</td>
                            <td className="small">{line.surface || '-'}</td>
                            <td className="text-end fw-bold small text-primary">{parseFloat(line.sqmAuto || line.sqm_auto || line.total_sqm || line.totalSqm || line.sqm || 0).toLocaleString()}</td>
                            <td className="text-end small">{(line.totalBoxes ?? line.total_boxes ?? line.boxes ?? '-') || '-'}</td>
                            <td className="text-end small fw-bold text-info">{(line.totalBoxes ?? line.total_boxes ?? line.boxes ?? '-') || '-'}</td>
                            <td className="text-end small text-success">0</td>
                            <td className="text-end small text-danger">{(line.totalBoxes ?? line.total_boxes ?? line.boxes ?? '-') || '-'}</td>
                            <td className="text-end small">{(line.totalPallets ?? line.total_pallets ?? line.pallets ?? '-') || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button variant="outline-secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!formData.proforma_order_id} className="d-flex align-items-center">
            <Save size={16} className="me-2" />
            Create Master Sheet
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export const UpdateProductionModal = ({ isOpen, onClose, sheet, onSave }) => {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (sheet && sheet.lines) {
      setLines(JSON.parse(JSON.stringify(sheet.lines)));
    }
  }, [sheet]);

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);

  if (!sheet) return null;

  const handleUpdateLine = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(sheet.id, { lines });
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="xl" centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h5 fw-bold mb-0">Production & QC Updates</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="bg-primary-light p-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '10px' }}>Master Order Sheet</small>
              <span className="fw-bold fs-5 text-primary">{sheet.production_sheet_no || sheet.productionSheetNo}</span>
            </div>
            <div className="text-end">
              <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '10px' }}>Total Required Boxes</small>
              <span className="fw-bold text-dark fs-5">{parseFloat(sheet.total_required_boxes || sheet.totalRequiredBoxes || 0).toLocaleString()} Boxes</span>
            </div>
          </div>

          <div className="table-responsive">
            <Table hover className="align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="bg-light sticky-top">
                <tr>
                  <th className="text-secondary fw-bold" style={{ width: '25%' }}>Product</th>
                  <th className="text-secondary fw-bold text-end">Req. Boxes</th>
                  <th className="text-secondary fw-bold text-end">Completed</th>
                  <th className="text-secondary fw-bold text-end">Pending</th>
                  <th className="text-secondary fw-bold text-center">Status</th>
                  <th className="text-secondary fw-bold text-center">QC Status</th>
                  <th className="text-secondary fw-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const productCategory = line.product_category || line.productCategory || 'Unknown Product';
                  const design = line.design || '';
                  const factoryName = line.factory_name || line.factoryName;
                  const reqBoxes = parseFloat(line.total_production_boxes || line.totalProductionBoxes || 0);
                  const completedBoxes = parseFloat(line.production_completed_boxes || line.productionCompletedBoxes || 0);
                  const status = line.production_status || line.productionStatus || line.status;
                  const qcStatus = line.qc_status || line.qcStatus || 'Pending';
                  
                  return (
                  <tr key={line.id || index}>
                    <td>
                      <div className="fw-bold text-dark">{design ? `${productCategory} - ${design}` : productCategory}</div>
                      <div className="small text-muted">{line.size} | {line.surface}</div>
                      {factoryName && <Badge bg="info" className="mt-1 fw-normal">{factoryName}</Badge>}
                    </td>
                    <td className="text-end fw-bold">{reqBoxes.toLocaleString()}</td>
                    <td className="text-end fw-medium text-success">{completedBoxes.toLocaleString()}</td>
                    <td className="text-end fw-medium text-danger">{(reqBoxes - completedBoxes).toLocaleString()}</td>
                    <td className="text-center">
                      {status === 'Production Completed' ? (
                        <Badge bg="success">Completed</Badge>
                      ) : status === 'In Production' ? (
                        <Badge bg="primary">In Production</Badge>
                      ) : (
                        <Badge bg="secondary">Not Started</Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <Form.Select 
                        size="sm" 
                        value={qcStatus}
                        onChange={(e) => handleUpdateLine(index, 'qc_status', e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Under Review">Under Review</option>
                      </Form.Select>
                    </td>
                    <td className="text-center">
                      <Button size="sm" variant="outline-primary" onClick={() => { setSelectedLine(line); setLogModalOpen(true); }}>
                        Log Production
                      </Button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button variant="outline-secondary" onClick={onClose}>Close</Button>
        </Modal.Footer>
      </Form>
      <LogProductionModal 
        isOpen={logModalOpen} 
        onClose={() => { setLogModalOpen(false); onSave(); /* trigger refresh */ }} 
        sheetId={sheet.id} 
        line={selectedLine} 
      />
    </Modal>
  );
};

export const FactoryAssignmentModal = ({ isOpen, onClose, sheet, availableFactories, onSave }) => {
  const [lines, setLines] = useState([]);
  
  useEffect(() => {
    if (sheet && sheet.lines) {
      setLines(JSON.parse(JSON.stringify(sheet.lines)));
    }
  }, [sheet]);

  if (!sheet) return null;

  const handleChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(sheet.id, { lines });
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h5 fw-bold mb-0">Assign Factories to Products</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="bg-primary-light p-3 border-bottom">
            <span className="fw-bold fs-5 text-primary">{sheet.production_sheet_no || sheet.productionSheetNo}</span>
            <span className="mx-2 text-muted">|</span>
            <span className="fw-medium text-dark">{sheet.po_no || sheet.poNo}</span>
          </div>

          <div className="table-responsive">
            <Table hover className="align-middle mb-0" style={{ fontSize: '0.9rem' }}>
              <thead className="bg-light">
                <tr>
                  <th className="text-secondary fw-bold" style={{ width: '45%' }}>Product Line</th>
                  <th className="text-secondary fw-bold text-end">Required SQM</th>
                  <th className="text-secondary fw-bold">Factory Allocation</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const productCategory = line.product_category || line.productCategory || 'Unknown Product';
                  const design = line.design || '';
                  const reqBoxes = parseFloat(line.required_sqm || line.total_production_boxes || line.totalProductionBoxes || 0);
                  
                  return (
                  <tr key={line.id || index}>
                    <td>
                      <div className="fw-bold text-dark">{design ? `${productCategory} - ${design}` : productCategory}</div>
                      <div className="small text-muted">{line.size} | {line.surface}</div>
                    </td>
                    <td className="text-end fw-bold text-primary">{reqBoxes.toLocaleString()}</td>
                    <td>
                      <Form.Select
                        value={line.factory_id || ''}
                        onChange={(e) => handleChange(index, 'factory_id', e.target.value)}
                        size="sm"
                      >
                        <option value="">-- Unassigned --</option>
                        {(availableFactories || []).map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </Form.Select>
                    </td>
                  </tr>
                )})}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button variant="outline-secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" className="d-flex align-items-center">
            <Save size={16} className="me-2" />
            Save Assignments
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export const EditOrderSheetModal = ({ isOpen, onClose, sheet, onSave }) => {
  const [formData, setFormData] = useState({
    booking_number: '',
    priority: 'Medium',
    shipment_date: '',
    internal_notes: '',
    container_no: '',
    status: 'Pending'
  });

  useEffect(() => {
    if (sheet) {
      setFormData({
        booking_number: sheet.booking_number || sheet.bookingNumber || '',
        priority: sheet.priority || 'Medium',
        shipment_date: (sheet.shipment_date || sheet.shipmentDate) ? new Date(sheet.shipment_date || sheet.shipmentDate).toISOString().split('T')[0] : '',
        internal_notes: sheet.internal_notes || sheet.internalNotes || '',
        container_no: sheet.container_no || sheet.containerNo || '',
        status: sheet.status || 'Pending'
      });
    }
  }, [sheet]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(sheet.id, formData);
  };

  if (!sheet) return null;

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h5 fw-bold mb-0">Edit Master Order Sheet</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="bg-primary-light p-3 border-bottom mb-4 rounded d-flex flex-wrap align-items-center">
            <span className="fw-bold fs-5 text-primary me-2">{sheet.production_sheet_no || sheet.productionSheetNo}</span>
            <span className="text-muted me-2">|</span>
            <span className="fw-medium text-dark me-2">{sheet.po_no || sheet.poNo}</span>
            <span className="text-muted me-2">|</span>
            <span className="fw-bold text-dark">{sheet.client_name || sheet.clientName}</span>
          </div>

          <div className="row g-4">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Priority</Form.Label>
                <Form.Select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Expected Shipment Date</Form.Label>
                <Form.Control type="date" name="shipment_date" value={formData.shipment_date} onChange={handleChange} />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Container Booking Number</Form.Label>
                <Form.Control type="text" name="booking_number" value={formData.booking_number} onChange={handleChange} placeholder="Optional" />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Container No</Form.Label>
                <Form.Control type="text" name="container_no" value={formData.container_no} onChange={handleChange} placeholder="Optional" />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-medium">Overall Status</Form.Label>
                <Form.Select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="In Production">In Production</option>
                  <option value="QC Complete">QC Complete</option>
                  <option value="Ready for Export">Ready for Export</option>
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group>
                <Form.Label className="small fw-medium">Internal Notes</Form.Label>
                <Form.Control as="textarea" rows={3} name="internal_notes" value={formData.internal_notes} onChange={handleChange} placeholder="Internal instructions..." />
              </Form.Group>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button variant="outline-secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" className="d-flex align-items-center">
            <Save size={16} className="me-2" />
            Save Changes
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
