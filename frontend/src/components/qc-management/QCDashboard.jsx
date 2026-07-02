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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Form, Alert, Spinner, Button } from 'react-bootstrap';
import { Plus, Search, Edit, Trash2, Eye, Download, Printer, RotateCcw } from 'lucide-react';
import QCForm from './QCForm.jsx';
import QCView from './QCView.jsx';
import FilterPanel from '../shared/FilterPanel.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import { useQCRecords } from '../../hooks/useQCRecords.js';
import { useOrders } from '../../hooks/useOrders.js';
import { useUsers } from '../../hooks/useUsers.js';
import { formatDisplayDate } from '../../utils/formatters.js';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import StatusBadge from '../common/StatusBadge.jsx';
import DashboardStatusDropdown from '../shared/DashboardStatusDropdown.jsx';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import PaginationControls from '../common/PaginationControls.jsx';
import LockDocumentButton from '../shared/LockDocumentButton.jsx';
import SkeletonTable from '../shared/SkeletonTable.jsx';
import TableErrorBoundary from '../shared/TableErrorBoundary.jsx';
import api from '../../services/api.js';
import { Modal } from 'react-bootstrap';
import QCPrintView from './QCPrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';

function QCDashboard({ currentUser, onNavigate, navigationData }) {
  const { qcRecords, loading, error, fetchQCRecords, createQCRecord, updateQCRecord, deleteQCRecord, toggleQCRecordStatus } = useQCRecords();
  const { users } = useUsers();
  
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);
  const [filters, setFilters] = useState({
    qcId: '',
    orderNumber: '',
    clientName: '',
    productName: '',
    assignedQC: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const filteredRecords = useMemo(() => {
    let filtered = qcRecords || [];
    if (filters.qcId) {
      filtered = filtered.filter(r => (r.qcId || '').toLowerCase().includes(filters.qcId.toLowerCase()));
    }
    if (filters.orderNumber) {
      filtered = filtered.filter(r => (r.orderNumber || '').toLowerCase().includes(filters.orderNumber.toLowerCase()));
    }
    if (filters.clientName) {
      filtered = filtered.filter(r => (r.clientName || '') === filters.clientName);
    }
    if (filters.productName) {
      filtered = filtered.filter(r => (r.productName || '') === filters.productName);
    }
    if (filters.status) {
      filtered = filtered.filter(r => (r.qcStatus || r.status || '') === filters.status);
    }
    if (filters.assignedQC) {
      filtered = filtered.filter(record => {
        const assignedUser = users?.find(u => u.id === record.inspectorId || u.id === record.inspector_id || u.id === record.assignedTo || u.id === record.assigned_to);
        const assignedName = assignedUser ? assignedUser.name : (record.inspector || record.assignedToName || '');
        return assignedName === filters.assignedQC;
      });
    }
    return filtered;
  }, [qcRecords, filters, users]);

  const multiSelect = useMultiSelect(filteredRecords);

  const uniqueClients = [...new Set((qcRecords || []).map(r => r.clientName).filter(Boolean))].sort();
  const uniqueProducts = [...new Set((qcRecords || []).map(r => r.productName).filter(Boolean))].sort();
  const uniqueQCPersons = [...new Set((qcRecords || []).map(record => {
    const assignedUser = users?.find(u => u.id === record.inspectorId || u.id === record.inspector_id || u.id === record.assignedTo || u.id === record.assigned_to);
    return assignedUser ? assignedUser.name : (record.inspector || record.assignedToName || '');
  }).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set((qcRecords || []).map(r => r.qcStatus || r.status).filter(Boolean))].sort();

  useEffect(() => {
    if (navigationData?.id && (qcRecords || []).length > 0) {
      const rec = qcRecords.find(r => r.id === navigationData.id);
      if (rec) {
        setEditingRecord(rec);
        setShowForm(true);
      }
    }
  }, [navigationData, qcRecords]);

  const handleCreate = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleView = (record) => {
    setViewingRecord(record);
    setShowView(true);
  };

  const handlePrintQC = async (record) => {
    try { await api.post('/document-activity/doc/' + (record?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    setViewingRecord(record);
    setShowPrintModal(true);
    setTimeout(() => {
      if (printRef.current) window.print();
    }, 500);
  };

  const handleDownloadQC = async (record) => {
    try { await api.post('/document-activity/doc/' + (record?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    setViewingRecord(record);
    setShowPrintModal(true);
    setTimeout(async () => {
      if (printRef.current) {
        showSuccess('Generating PDF...');
        const filename = `QC_${record.qcId || 'Report'}_${new Date().toLocaleDateString('en-CA')}.pdf`;
        const result = await downloadPDF(printRef.current, filename);
        if (!result?.success) showError('Failed to generate PDF');
      }
      setShowPrintModal(false);
    }, 800);
  };

  const handleDelete = (id) => {
    setConfirmConfig({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this QC record?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteQCRecord(id);
          showSuccess('QC record deleted successfully');
        } catch (err) {
          showError('Failed to delete: ' + (err.response?.data?.message || err.message));
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = { Passed: 'success', Failed: 'danger', Pending: 'warning', 'Under Process': 'info' };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (showForm) {
    return (
      <QCForm 
        qcRecord={editingRecord} 
        existingRecords={qcRecords}
        onBack={() => { setShowForm(false); setEditingRecord(null); }} 
        onSave={async (data) => {
          try {
            if (editingRecord) {
              await updateQCRecord({ id: editingRecord.id, data });
            } else {
              await createQCRecord(data);
            }
            setShowForm(false);
            setEditingRecord(null);
            showSuccess('QC record saved successfully');
          } catch(err) {
            showError('Failed to save QC record: ' + (err.response?.data?.message || err.message || err.toString()));
          }
        }} 
        currentUser={currentUser} 
      />
    );
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">QC Management</h2>
          <p className="text-muted small">Manage Quality Control Inspections</p>
        </Col>
      </Row>

      {error && <Alert variant="danger" dismissible>{error.message || error.toString()}</Alert>}

      <FilterPanel onClear={() => setFilters({ qcId: '', orderNumber: '', clientName: '', productName: '', assignedQC: '', status: '' })} title="Search & Filters">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3 align-items-end">
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">QC ID</Form.Label>
                <Form.Control
                  type="text"
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  placeholder="Enter QC ID"
                  value={filters.qcId}
                  onChange={(e) => setFilters({ ...filters, qcId: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Order Number</Form.Label>
                <Form.Control
                  type="text"
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  placeholder="Enter Order No"
                  value={filters.orderNumber}
                  onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Supplier Name</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.clientName} onChange={(e) => setFilters({ ...filters, clientName: e.target.value })}>
                  <option value="">All Suppliers</option>
                  {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Product Name</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.productName} onChange={(e) => setFilters({ ...filters, productName: e.target.value })}>
                  <option value="">All Products</option>
                  {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Assigned QC Person</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.assignedQC} onChange={(e) => setFilters({ ...filters, assignedQC: e.target.value })}>
                  <option value="">All Assignees</option>
                  {uniqueQCPersons.map(a => <option key={a} value={a}>{a}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select className="py-2 border-primary-subtle" style={{ borderRadius: '10px' }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                                    <option value="">All Status</option>
                                      <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Revised">Revised</option>
                    
                    <option value="Finalized">Finalized</option>
                    <option value="Rejected">Rejected</option>
                  </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      <Card className="border-0 shadow-sm overflow-hidden mb-4">
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">QC Records ({filteredRecords.length})</h5>
          <div className="d-flex gap-2">
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center" onClick={handleCreate}>
              <Plus size={16} className="me-1" /> Create QC Record
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0 bg-light bg-md-white">
          {loading ? (
            <div className="p-3"><SkeletonTable columns={10} rows={5} /></div>
          ) : paginatedRecords.length === 0 ? (
            <div className="text-center py-5 text-muted">No QC records found</div>
          ) : (
            <>
              <TableErrorBoundary>
              {/* Desktop Table View */}
              <div className="table-responsive d-none d-md-block">
                <Table hover className="mb-0 align-middle bg-white">
                  <thead>
                    <tr className="table-light text-muted small text-uppercase">
                      <th style={{ width: '40px' }} className="ps-4">
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.selectAll}
                          onChange={() => multiSelect.toggleSelectAll(filteredRecords)}
                        />
                      </th>
                      <th style={{ width: '60px' }}>SR. NO.</th>
                      <th>Status</th>
                      <th className="ps-4">QC ID</th>
                      <th>Order Number</th>
                      <th>Supplier Name</th>
                      <th>Product Name</th>
                      <th>QC Date</th>
                      <th>Assigned QC Person</th>
                      <th className="pe-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record, index) => {
                      const assignedUser = users?.find(u => u.id === record.inspectorId || u.id === record.inspector_id || u.id === record.assignedTo || u.id === record.assigned_to);
                      const assignedName = assignedUser ? assignedUser.name : (record.inspector || record.assignedToName || '-');
                      
                      return (
                        <tr key={record.id} className={multiSelect.isSelected(record.id) ? 'table-primary bg-opacity-10' : ''}>
                          <td data-label="" className="ps-4">
                            <Form.Check
                              type="checkbox"
                              checked={multiSelect.isSelected(record.id)}
                              onChange={() => multiSelect.toggleSelect(record.id)}
                            />
                          </td>
                          <td data-label="Sr." className="text-muted small">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                          <td data-label="Status">
                            <div className="d-flex align-items-center gap-1">
                              <DashboardStatusDropdown 
                                module="QC" 
                                endpoint="qc-records" 
                                documentId={record.id} 
                                value={(record.is_locked || record.isLocked) ? 'Locked' : (record.qcStatus || record.status || 'Draft')} 
                                disabled={!(currentUser && ['super_admin', 'company_admin', 'quality_manager'].includes(currentUser?.role)) || record.is_locked || record.isLocked} 
                                onSuccess={fetchQCRecords} 
                              />
                            </div>
                          </td>
                          <td data-label="QC ID" className="ps-4 fw-semibold text-primary">{record.qcId}</td>
                          <td data-label="Order No.">{record.orderNumber}</td>
                          <td data-label="Client">{record.clientName}</td>
                          <td data-label="Product">{record.productName}</td>
                          <td data-label="QC Date">{formatDisplayDate(record.qcDate)}</td>
                          <td data-label="Assigned To">{assignedName}</td>
                          <td data-label="Actions" className="pe-4 text-end">
                            <div className="d-flex justify-content-end gap-1">
                              <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleView(record)}>
                                <Eye size={14} />
                              </Button>
                              <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handleEdit(record)} disabled={record.is_locked || record.isLocked}>
                                <Edit size={14} />
                              </Button>
                              <LockDocumentButton 
                                documentType="QC" 
                                documentId={record.id} 
                                isLocked={record.is_locked || record.isLocked}
                                onLockSuccess={fetchQCRecords}
                                getSnapshotData={async () => {
                                  const res = await api.get(`/qc-records/${record.id}`);
                                  return res.data?.data || res.data;
                                }}
                              />
                              <Button variant="outline" size="sm" className="text-danger border-danger-subtle" onClick={() => handleDelete(record.id)} disabled={record.is_locked || record.isLocked}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="d-md-none p-2">
                {paginatedRecords.map((record, index) => {
                  const assignedUser = users?.find(u => u.id === record.inspectorId || u.id === record.inspector_id || u.id === record.assignedTo || u.id === record.assigned_to);
                  const assignedName = assignedUser ? assignedUser.name : (record.inspector || record.assignedToName || '-');
                  
                  return (
                    <Card key={record.id} className="mb-3 border-0 shadow-sm rounded-3">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <div className="fw-bold text-primary mb-1">{record.qcId}</div>
                            <div className="text-muted small">Sr. {(currentPage - 1) * PAGE_SIZE + index + 1}</div>
                          </div>
                          <DashboardStatusDropdown 
                            module="QC" 
                            endpoint="qc-records" 
                            documentId={record.id} 
                            value={(record.is_locked || record.isLocked) ? 'Locked' : (record.qcStatus || record.status || 'Draft')} 
                            disabled={!(currentUser && ['super_admin', 'company_admin', 'quality_manager'].includes(currentUser?.role)) || record.is_locked || record.isLocked} 
                            onSuccess={fetchQCRecords} 
                          />
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted small">Order:</span>
                          <span className="fw-semibold small">{record.orderNumber}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted small">Supplier:</span>
                          <span className="fw-semibold small">{record.clientName}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted small">Product:</span>
                          <span className="fw-semibold small text-truncate" style={{maxWidth: '150px'}}>{record.productName}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted small">QC Date:</span>
                          <span className="fw-semibold small">{formatDisplayDate(record.qcDate)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-3">
                          <span className="text-muted small">Assigned:</span>
                          <span className="fw-semibold small">{assignedName}</span>
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                          <Form.Check
                            type="checkbox"
                            checked={multiSelect.isSelected(record.id)}
                            onChange={() => multiSelect.toggleSelect(record.id)}
                            label="Select"
                            className="small text-muted"
                          />
                          <div className="d-flex gap-2">
                            <Button variant="outline-info" size="sm" onClick={() => handleView(record)}>
                              <Eye size={14} />
                            </Button>
                            <Button variant="outline-primary" size="sm" onClick={() => handleEdit(record)} disabled={record.is_locked || record.isLocked}>
                              <Edit size={14} />
                            </Button>
                            <LockDocumentButton 
                              documentType="QC" 
                              documentId={record.id} 
                              isLocked={record.is_locked || record.isLocked}
                              onLockSuccess={fetchQCRecords}
                              getSnapshotData={async () => {
                                const res = await api.get(`/qc-records/${record.id}`);
                                return res.data?.data || res.data;
                              }}
                            />
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(record.id)} disabled={record.is_locked || record.isLocked}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
              </TableErrorBoundary>
            </>
          )}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredRecords.length}
          />
        </Card.Body>
      </Card>

      {showView && viewingRecord && (
        <QCView 
          qcRecord={viewingRecord} 
          onClose={() => setShowView(false)} 
          onEdit={() => { setShowView(false); handleEdit(viewingRecord); }}
          onPrint={() => handlePrintQC(viewingRecord)}
          onDownload={() => handleDownloadQC(viewingRecord)}
          canEdit={!(viewingRecord.is_locked || viewingRecord.isLocked)}
        />
      )}

      {showPrintModal && viewingRecord && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>QC Report Preview — {viewingRecord.qcId}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              <div ref={printRef}>
                <QCPrintView qcRecord={viewingRecord} />
              </div>
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={viewingRecord?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      <ConfirmationModal 
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        variant={confirmConfig.variant}
      />
    </>
  );
}

export default QCDashboard;
