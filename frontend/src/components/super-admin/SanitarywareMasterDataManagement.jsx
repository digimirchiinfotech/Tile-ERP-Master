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

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Form,
  Modal,
  Badge,
  Spinner,
  Alert,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import FilterPanel from '../shared/FilterPanel.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { Search, RotateCcw, Download, Plus, Edit, Trash2, RefreshCw, AlertCircle, LayoutGrid, Info } from 'lucide-react';
import sanitarywareMasterService from '../../services/sanitarywareMasterDataService.js';

import './MasterDataManagement.css';

const categories = [
  { key: 'productIdentity', label: 'Product Identity', icon: '🏷️' },
  { key: 'technicalSpecs', label: 'Technical Specs', icon: '🎨' },
  { key: 'logistics', label: 'Logistics & Packaging', icon: '📦' }
];

const productIdentitySubCategories = [
  { key: 'sanitarywareCategories', label: 'Categories / Product Types', apiType: 'sanitarywareCategories' },
  { key: 'sanitarywareBrands', label: 'Brands', apiType: 'sanitarywareBrands' },
  { key: 'sanitarywareCollections', label: 'Collections', apiType: 'sanitarywareCollections' }
];

const technicalSpecsSubCategories = [
  { key: 'sanitarywareMaterialTypes', label: 'Material Types', apiType: 'sanitarywareMaterialTypes' },
  { key: 'sanitarywareColors', label: 'Colors', apiType: 'sanitarywareColors' },
  { key: 'sanitarywareShapes', label: 'Shapes', apiType: 'sanitarywareShapes' },
  { key: 'sanitarywareFlushTypes', label: 'Flush Types', apiType: 'sanitarywareFlushTypes' },
  { key: 'sanitarywareTrapTypes', label: 'Trap Types', apiType: 'sanitarywareTrapTypes' },
  { key: 'sanitarywareMountTypes', label: 'Mount Types', apiType: 'sanitarywareMountTypes' },
  { key: 'sanitarywareSeatCoverTypes', label: 'Seat Cover Types', apiType: 'sanitarywareSeatCoverTypes' },
  { key: 'sanitarywareFinishTypes', label: 'Finish Types', apiType: 'sanitarywareFinishTypes' }
];

const logisticsSubCategories = [
  { key: 'sanitarywarePackagingTypes', label: 'Packaging Types', apiType: 'sanitarywarePackagingTypes' },
  { key: 'sanitarywareDimensionStandards', label: 'Dimension Standards', apiType: 'sanitarywareDimensionStandards' },
  { key: 'sanitarywareContainerCapacityRules', label: 'Container Capacity Rules', apiType: 'sanitarywareContainerCapacityRules' }
];

function SanitarywareMasterDataManagement({ currentUser }) {
  const [activeCategory, setActiveCategory] = useState('productIdentity');
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [masterData, setMasterData] = useState({
    productIdentity: {},
    technicalSpecs: {},
    logistics: {}
  });

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      const allSubCats = [...productIdentitySubCategories, ...technicalSpecsSubCategories, ...logisticsSubCategories];
      
      const results = await Promise.all(
        allSubCats.map(sub => sanitarywareMasterService.getMasterData(sub.apiType).catch(() => []))
      );

      const newMasterData = {
        productIdentity: {},
        technicalSpecs: {},
        logistics: {}
      };

      let idx = 0;
      productIdentitySubCategories.forEach(sub => {
        newMasterData.productIdentity[sub.key] = results[idx++];
      });
      technicalSpecsSubCategories.forEach(sub => {
        newMasterData.technicalSpecs[sub.key] = results[idx++];
      });
      logisticsSubCategories.forEach(sub => {
        newMasterData.logistics[sub.key] = results[idx++];
      });

      setMasterData(newMasterData);
    } catch (error) {
      console.error('Error loading master data:', error);
      showError('Failed to load master data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  const handleCloseModal = () => {
    setEditingItem(null);
    setNewValue('');
    setValidationError('');
    setActiveSubCategory(null);
    setShowAddModal(false);
  };

  const handleCreateItem = (subcategory) => {
    setEditingItem(null);
    setNewValue('');
    setValidationError('');
    setActiveSubCategory(subcategory);
    setShowAddModal(true);
  };

  const handleEditItem = (item, subcategory) => {
    setEditingItem({ ...item, subcategory });
    setNewValue(item.value || '');
    setActiveSubCategory(subcategory);
    setValidationError('');
    setShowAddModal(true);
  };

  const handleDeleteClick = (item, subcategory) => {
    setDeleteConfig({ ...item, subcategory });
  };

  const confirmDelete = async () => {
    try {
      await sanitarywareMasterService.deleteMasterData(deleteConfig.subcategory, deleteConfig.id);
      showSuccess('Item deleted successfully');
      fetchMasterData();
    } catch (error) {
      showError('Failed to delete item');
      console.error(error);
    } finally {
      setDeleteConfig(null);
    }
  };

  const handleToggleStatus = async (item, subcategory) => {
    try {
      await sanitarywareMasterService.toggleStatus(subcategory, item.id);
      showSuccess('Status updated successfully');
      fetchMasterData();
    } catch (error) {
      showError('Failed to update status');
      console.error(error);
    }
  };

  const handleSaveItem = async () => {
    if (!newValue.trim()) {
      setValidationError('Value cannot be empty');
      return;
    }

    const currentList = masterData[activeCategory][activeSubCategory] || [];
    const isDuplicate = currentList.some(item => {
      if (editingItem && item.id === editingItem.id) return false;
      return String(item.value).trim().toLowerCase() === newValue.trim().toLowerCase();
    });

    if (isDuplicate) {
      setValidationError(`"${newValue.trim()}" already exists`);
      return;
    }

    try {
      setSaving(true);
      if (editingItem && editingItem.id) {
        await sanitarywareMasterService.updateMasterData(activeSubCategory, editingItem.id, { value: newValue.trim() });
        showSuccess('Item updated successfully');
      } else {
        await sanitarywareMasterService.createMasterData(activeSubCategory, newValue.trim());
        showSuccess('Item added successfully');
      }
      handleCloseModal();
      fetchMasterData();
    } catch (error) {
      if (error.response?.status === 409) {
        setValidationError(error.response.data.message || 'This item already exists');
      } else {
        showError('Failed to save item');
      }
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const dataToExport = [];
    let subCats = [];

    if (activeCategory === 'productIdentity') subCats = productIdentitySubCategories;
    else if (activeCategory === 'technicalSpecs') subCats = technicalSpecsSubCategories;
    else if (activeCategory === 'logistics') subCats = logisticsSubCategories;

    subCats.forEach(sub => {
      const items = masterData[activeCategory][sub.key] || [];
      items.forEach(item => {
        dataToExport.push({
          Category: sub.label,
          Value: item.value,
          Status: item.status || 'Active'
        });
      });
    });

    if (dataToExport.length === 0) {
      showError('No data available to export');
      return;
    }

    const columns = [
      createColumnDef('Category', 'Category'),
      createColumnDef('Value', 'Value'),
      createColumnDef('Status', 'Status')
    ];

    exportData(dataToExport, columns, 'csv', `sanitaryware_master_${activeCategory}`);
    showSuccess('Exported successfully');
  };

  const renderDataTab = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading data...</p>
        </div>
      );
    }

    let subCats = [];
    if (activeCategory === 'productIdentity') subCats = productIdentitySubCategories;
    else if (activeCategory === 'technicalSpecs') subCats = technicalSpecsSubCategories;
    else if (activeCategory === 'logistics') subCats = logisticsSubCategories;

    return (
      <>
        <div className="d-flex justify-content-end mb-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="d-flex align-items-center px-3 py-2 border-primary-subtle text-primary fw-bold text-nowrap shadow-sm hover-elevate"
            style={{ borderRadius: '10px', fontSize: '0.8rem' }}
          >
            <Download size={16} className="me-2" />
            EXPORT {categories.find(c => c.key === activeCategory)?.label.toUpperCase()}
          </Button>
        </div>
        <Row className="g-4">
          {subCats.map((sub) => {
            let list = masterData[activeCategory]?.[sub.key] || [];
            
            if (searchQuery.trim()) {
              list = list.filter(item => 
                String(item.value || '').toLowerCase().includes(searchQuery.toLowerCase())
              );
            }

            return (
              <Col md={6} lg={6} key={sub.key}>
                <Card className="h-100 border-0 shadow-sm overflow-hidden master-category-card" style={{ borderRadius: '16px' }}>
                  <Card.Header className="bg-primary text-white p-2 p-md-3 border-0 d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 fw-bold text-nowrap">{sub.label} ({list.length})</h6>
                    <Button 
                      variant="light" 
                      size="sm" 
                      className="text-primary fw-bold shadow-sm px-3 d-flex align-items-center flex-shrink-0" 
                      style={{ borderRadius: '8px', fontSize: '0.75rem', height: '32px', width: 'auto' }}
                      onClick={() => handleCreateItem(sub.key)}
                    >
                      <Plus size={14} className="me-1" />
                      <span className="d-none d-sm-inline small">Add</span>
                      <span className="d-sm-none small">Add</span>
                    </Button>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {list.length > 0 ? (
                      <>
                        <div className="table-responsive d-none d-md-block" style={{ maxHeight: '400px' }}>
                          <Table hover className="mb-0 align-middle">
                            <thead className="table-light">
                              <tr className="small text-muted text-uppercase">
                                <th className="ps-4 text-center" style={{ width: '60px' }}>SR.</th>
                                <th>Name / Value</th>
                                <th>Status</th>
                                <th className="pe-4 text-end">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((item, index) => (
                                <tr key={item.id || index}>
                                  <td className="ps-4 text-center text-muted small">{index + 1}</td>
                                  <td className="fw-medium">{item.value}</td>
                                  <td>
                                    <Badge 
                                      bg={item.status === 'Active' ? 'success' : 'secondary'} 
                                      className="px-2 py-1 cursor-pointer hover-elevate"
                                      style={{ borderRadius: '6px', fontSize: '0.75rem' }}
                                      onClick={() => handleToggleStatus(item, sub.key)}
                                    >
                                      {item.status || 'Active'}
                                    </Badge>
                                  </td>
                                  <td className="pe-4 text-end">
                                    <div className="d-flex justify-content-end gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-primary border-primary-subtle hover-bg-primary-light"
                                        onClick={() => handleEditItem(item, sub.key)}
                                        title="Edit"
                                      >
                                        <Edit size={14} />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-danger border-danger-subtle hover-bg-danger-light"
                                        onClick={() => handleDeleteClick(item, sub.key)}
                                        title="Delete"
                                      >
                                        <Trash2 size={14} />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>

                        <div className="d-md-none p-3 bg-light-subtle">
                          <div className="d-flex flex-column gap-3">
                            {list.map((item, index) => (
                              <div key={item.id || index} className="master-mobile-card-premium bg-white p-3 rounded-3 shadow-sm border-start border-4 border-primary">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-2">
                                      <span className="badge bg-primary-light text-primary me-2 px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                        SR. #{index + 1}
                                      </span>
                                      <Badge 
                                        bg={item.status === 'Active' ? 'success' : 'secondary'} 
                                        className="px-2 py-1 cursor-pointer"
                                        style={{ fontSize: '0.65rem' }}
                                        onClick={() => handleToggleStatus(item, sub.key)}
                                      >
                                        {item.status || 'Active'}
                                      </Badge>
                                    </div>
                                    <div className="ps-1">
                                      <h6 className="fw-800 text-dark mb-0">{item.value}</h6>
                                    </div>
                                  </div>
                                  <div className="d-flex flex-column gap-2 ms-2">
                                    <Button variant="outline-primary" size="sm" className="btn-action-mobile shadow-sm" onClick={() => handleEditItem(item, sub.key)}>
                                      <Edit size={14} />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" className="btn-action-mobile shadow-sm" onClick={() => handleDeleteClick(item, sub.key)}>
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-5">
                        <AlertCircle size={32} className="text-muted mb-2 opacity-50" />
                        <p className="text-muted small mb-0">No {sub.label.toLowerCase()} found.</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </>
    );
  };

  return (
    <div className="master-data-container">
      <Card className="border-0 shadow-sm overflow-hidden mb-4 bg-primary text-white">
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center gap-3">
                <div className="bg-white-20 p-3 rounded-3">
                  <LayoutGrid size={32} />
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-white">Sanitaryware Master Data</h2>
                  <p className="text-white text-opacity-75 mb-0">Manage sanitaryware parameters, colors, trap types, and standards.</p>
                </div>
              </div>
            </Col>
            <Col xs="auto">
              <Button
                variant="light"
                className="text-primary fw-bold shadow-sm d-flex align-items-center gap-2 px-4 py-2 rounded-pill"
                onClick={fetchMasterData}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'spin' : ''} /> Sync Data
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <FilterPanel
        onClear={() => setSearchQuery('')}
        title={`Search in ${categories.find(c => c.key === activeCategory)?.label}`}
        className="mb-4"
      >
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3 align-items-center">
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Search Term</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Search value..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      <Card className="border-0 shadow-sm mb-4 bg-white overflow-hidden" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-2">
          <div className="d-flex gap-2 overflow-auto premium-scroll pb-2 px-2" style={{ whiteSpace: 'nowrap' }}>
            {categories.map((cat) => (
              <button
                key={cat.key}
                className={`category-premium-btn ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setSearchQuery('');
                }}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-label">{cat.label}</span>
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col xs={12}>
          {renderDataTab()}
        </Col>
      </Row>

      <Modal show={showAddModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton className="bg-primary text-white border-0">
          <Modal.Title className="fw-bold text-white">
            {editingItem ? 'Edit' : 'Add'} {
              [...productIdentitySubCategories, ...technicalSpecsSubCategories, ...logisticsSubCategories]
                .find(s => s.key === activeSubCategory)?.label
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {validationError && (
            <Alert variant="danger" className="py-2 px-3 small d-flex align-items-center border-0 shadow-sm">
              <AlertCircle size={16} className="me-2" />
              {validationError}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <OverlayTrigger placement="top" overlay={<Tooltip>Value is mandatory.</Tooltip>}>
              <Form.Label className="fw-bold small text-uppercase text-danger" style={{cursor: 'help'}}>
                Value * <Info size={12} className="ms-1" />
              </Form.Label>
            </OverlayTrigger>
            <Form.Control
              type="text"
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value.toUpperCase());
                setValidationError('');
              }}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 p-4 pt-0">
          <Button variant="light" className="fw-bold px-4 rounded-pill" onClick={handleCloseModal}>Cancel</Button>
          <Button variant="primary" className="fw-bold px-4 rounded-pill shadow-sm" onClick={handleSaveItem} disabled={saving}>
            {saving ? <Spinner size="sm" className="me-2" /> : null}
            {editingItem ? 'Update Item' : 'Save Item'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={!!deleteConfig}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete "${deleteConfig?.value}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfig(null)}
      />
      
      <style>{`
        .master-data-container { padding-bottom: 2rem; }
        .bg-white-20 { background-color: rgba(255, 255, 255, 0.2); }
        
        .category-premium-btn {
          border: none;
          background: transparent;
          padding: 12px 24px;
          border-radius: 12px;
          color: #64748b;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: fit-content;
        }

        .category-premium-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .category-premium-btn.active {
          background: #e0e7ff;
          color: #4f46e5;
        }

        .category-premium-btn .cat-icon { font-size: 1.25rem; }
        
        .master-category-card { transition: transform 0.2s; }
        .master-category-card:hover { transform: translateY(-2px); }
        
        .btn-action-mobile { padding: 8px; border-radius: 8px; }
        .hover-elevate { transition: transform 0.15s; }
        .hover-elevate:hover { transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

export default SanitarywareMasterDataManagement;
