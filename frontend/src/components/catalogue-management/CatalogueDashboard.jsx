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

import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { Row, Col, Card, Table, Badge, Form } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Plus, Search, Edit, Trash2, Eye, Download, RotateCcw, Power, Printer, CheckCircle, Check } from 'lucide-react';
import CatalogueForm from './CatalogueForm.jsx';
import CatalogueView from './CatalogueView.jsx';
import CataloguePrintView from './CataloguePrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import { useRef } from 'react';
import { Modal } from 'react-bootstrap';
import FilterPanel from '../shared/FilterPanel.jsx';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import bulkDeleteService from '../../services/bulkDeleteService.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import { useProducts } from '../../hooks/useProducts.js';
import { useSanitarywareProducts } from '../../hooks/useSanitarywareProducts.js';
import { useCatalogues } from '../../hooks/useCatalogues.js';
import userService from '../../services/userService.js';
import { useClients } from '../../hooks/useClients';
import { BookOpen } from 'lucide-react';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { formatDisplayDate } from '../../utils/formatters.js';
import PaginationControls from '../common/PaginationControls.jsx';
import { normalizeCatalogue, normalizeCatalogueArray } from '../../utils/dataTransformers.js';
import StatusBadge from '../common/StatusBadge';
import ActivityTimeline from '../shared/ActivityTimeline.jsx';

function CatalogueDashboard({ currentUser }) {
  const { products } = useProducts();
  const { sanitarywareProducts } = useSanitarywareProducts();
  const allProducts = [
    ...(products || []).map(p => ({ ...p, productType: 'tile' })), 
    ...(sanitarywareProducts || []).map(p => ({ ...p, productType: 'sanitaryware' }))
  ];
  
  const { catalogues, loading, error, createCatalogue, updateCatalogue, deleteCatalogue, toggleCatalogueStatus, fetchCatalogues } = useCatalogues();
  const [filteredCatalogues, setFilteredCatalogues] = useState([]);
  
  // Multi-select hook
  const multiSelect = useMultiSelect(catalogues);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showCatalogueForm, setShowCatalogueForm] = useState(false);
  const [showCatalogueView, setShowCatalogueView] = useState(false);
  const [editingCatalogue, setEditingCatalogue] = useState(null);
  const [viewingCatalogue, setViewingCatalogue] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [filters, setFilters] = useState({
    catalogueName: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [salespersons, setSalespersons] = useState([]);
  const { clients } = useClients();

  useEffect(() => {
    const fetchSalespersons = async () => {
      try {
        const list = await userService.getSalespersons();
        setSalespersons(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to fetch salespersons for catalogue:', err);
        setSalespersons([]);
      }
    };

    fetchSalespersons();
  }, []);

  useEffect(() => {
    let filtered = catalogues;

    if (filters.catalogueName) {
      filtered = filtered.filter(
        (catalogue) =>
          (catalogue.name || '').toLowerCase().includes(filters.catalogueName.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (catalogue) => catalogue.status === filters.status
      );
    }

    setFilteredCatalogues(filtered);
    setCurrentPage(1);
  }, [filters, catalogues]);

  const dashboardStats = {
    total: (catalogues || []).length,
    active: (catalogues || []).filter(c => c.status === 'Active').length,
    inactive: (catalogues || []).filter(c => c.status === 'Inactive').length,
    products: (catalogues || []).reduce((sum, c) => sum + (c.productCount || c.totalProducts || 0), 0)
  };

  const handleCreateCatalogue = () => {
    setEditingCatalogue(null);
    setShowCatalogueForm(true);
  };

  const handleEditCatalogue = async (catalogue) => {
    try {
      const { catalogueService } = await import('../../services/catalogueService.js');
      const response = await catalogueService.getById(catalogue.id);
      const data = response?.data?.data || response?.data;
      setEditingCatalogue(normalizeCatalogue(data));
      setShowCatalogueForm(true);
    } catch (err) {
      console.error('❌ Error fetching catalogue:', err);
      showError('Failed to load catalogue: ' + err.message);
    }
  };

  const handleViewCatalogue = async (catalogue) => {
    try {
      const { catalogueService } = await import('../../services/catalogueService.js');
      const response = await catalogueService.getById(catalogue.id);
      const data = response?.data?.data || response?.data;
      setViewingCatalogue(normalizeCatalogue(data));
      setShowCatalogueView(true);
    } catch (err) {
      console.error('❌ Error fetching catalogue:', err);
      showError('Failed to load catalogue: ' + err.message);
    }
  };

  const handlePrintCatalogue = async (catalogue) => {
    try { await api.post('/document-activity/doc/' + (catalogue?.id || 'unknown') + '/action', { action: 'PRINT' }); } catch(e){}
    try {
      const { catalogueService } = await import('../../services/catalogueService.js');
      const response = await catalogueService.getById(catalogue.id);
      const data = response?.data?.data || response?.data;
      setViewingCatalogue(normalizeCatalogue(data));
      setShowPrintModal(true);
      setTimeout(() => {
        if (printRef.current) window.print();
      }, 500);
    } catch (err) {
      showError('Failed to load catalogue for printing');
    }
  };

  const handleDownloadPDF = async (catalogue) => {
    try { await api.post('/document-activity/doc/' + (catalogue?.id || 'unknown') + '/action', { action: 'DOWNLOAD' }); } catch(e){}
    try {
      const { catalogueService } = await import('../../services/catalogueService.js');
      const response = await catalogueService.getById(catalogue.id);
      const data = response?.data?.data || response?.data;
      setViewingCatalogue(normalizeCatalogue(data));
      setShowPrintModal(true);
      setTimeout(async () => {
        if (printRef.current) {
          showSuccess('Generating PDF...');
          const filename = `Catalogue_${(data.name || 'Catalogue').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.pdf`;
          const result = await downloadPDF(printRef.current, filename);
          if (!result?.success) showError('Failed to generate PDF');
        }
        setShowPrintModal(false);
      }, 800);
    } catch (err) {
      showError('Failed to generate PDF');
    }
  };

  const handleDeleteCatalogue = (catalogueId) => {
    setDeleteTargetId(catalogueId);
  };

  const confirmDeleteCatalogue = async () => {
    try {
      await deleteCatalogue(deleteTargetId);
      showSuccess('Catalogue deleted successfully');
    } catch (error) {
      console.error('❌ Delete error:', error);
      showError('Failed to delete catalogue');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      await bulkDeleteService.deleteCatalogues(multiSelect.getSelectedIds());
      multiSelect.clearSelection();
      await fetchCatalogues();
      showSuccess('Selected catalogues deleted successfully');
    } catch (err) {
      showError('Bulk delete failed: ' + err.message);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveCatalogue = async (catalogueData) => {
    try {
      setIsSaving(true);
      if (editingCatalogue) {
        await updateCatalogue(editingCatalogue.id, catalogueData);
        showSuccess('Catalogue updated successfully');
      } else {
        await createCatalogue(catalogueData);
        showSuccess('Catalogue created successfully');
      }
      setShowCatalogueForm(false);
      // Manually trigger a refresh just in case the hook's internal refresh is delayed
      await fetchCatalogues();
    } catch (error) {
      console.error('Failed to save catalogue:', error);
      showError('Failed to save catalogue: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggleCatalogueStatus = async (catalogueId) => {
    try {
      await toggleCatalogueStatus(catalogueId);
    } catch (error) {
      console.error('Failed to toggle catalogue status:', error);
      showError('Failed to toggle catalogue status');
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin', 'administration'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin', 'administration'].includes(currentUser?.role);

  const resetFilters = () => {
    setFilters({
      catalogueName: '',
      status: '',
    });
  };

  const totalPages = Math.ceil(filteredCatalogues.length / PAGE_SIZE);
  const paginatedCatalogues = filteredCatalogues.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Catalogue Management</h2>
          <p className="text-muted">Manage product catalogues and digital brochures</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><BookOpen size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Catalogues</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><CheckCircle size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Edit size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Inactive</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.inactive}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Plus size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Products</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.products}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Collapsible Filter Panel */}
      <FilterPanel 
        onClear={resetFilters} 
        title="Search & Filters"
      >
        <Form>
          <Row className="g-3 align-items-end">
            <Col lg={6} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Catalogue Name</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                  <Form.Control
                    type="text"
                    className="ps-5 py-2 border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="Catalogue Name"
                    value={filters.catalogueName}
                    onChange={(e) => handleFilterChange('catalogueName', e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col lg={6} md={6} sm={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                                    <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </FilterPanel>

      <BulkActionBar
        selectedCount={multiSelect.getSelectedCount()}
        onSelectAll={(shouldSelect) => {
          if (shouldSelect) {
            multiSelect.toggleSelectAll(filteredCatalogues);
          } else {
            multiSelect.clearSelection();
          }
        }}
        onClearSelection={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        isLoading={isSaving}
        selectAllChecked={multiSelect.selectAll}
        totalItems={filteredCatalogues.length}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Catalogues ({filteredCatalogues.length})</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">
            {canEdit && (
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateCatalogue} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Catalogue</span>
                <span className="d-sm-none small">Create</span>
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Desktop Table View */}
          <div className="table-responsive d-none d-lg-block">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr className="table-light text-muted small text-uppercase">
                  <th className="ps-4">SR. NO.</th>
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredCatalogues)}
                      title="Select All"
                    />
                  </th>
                  <th>Status</th>
                  <th>Catalogue Name</th>
                  <th>Description</th>
                  <th>Total Products</th>
                  <th>Created Date & Time</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCatalogues.length > 0 ? (
                  paginatedCatalogues.map((catalogue, index) => (
                    <tr key={catalogue.id} className={multiSelect.isSelected(catalogue.id) ? 'table-active' : ''}>
                      <td className="text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={multiSelect.isSelected(catalogue.id)}
                          onChange={() => multiSelect.toggleSelect(catalogue.id)}
                        />
                      </td>
                      <td>
                        <StatusBadge status={catalogue.status} />
                      </td>
                      <td className="fw-medium">{catalogue.name}</td>
                      <td>{catalogue.description}</td>
                      <td>{catalogue.productCount || catalogue.totalProducts || 0}</td>
                      <td>{catalogue.createdAt ? formatDisplayDate(catalogue.createdAt) : '-'}</td>
                              <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-info border-info-subtle"
                            onClick={() => handleViewCatalogue(catalogue)}
                            title="View Catalogue"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary-subtle"
                            onClick={() => handlePrintCatalogue(catalogue)}
                            title="Print Catalogue"
                          >
                            <Printer size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success border-success-subtle"
                            onClick={() => handleDownloadPDF(catalogue)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle"
                                onClick={() => handleEditCatalogue(catalogue)}
                                title="Edit"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                variant={catalogue.status === 'Active' ? 'outline-warning' : 'outline-success'}
                                size="sm"
                                className={catalogue.status === 'Active' ? 'border-warning-subtle text-warning' : 'border-success-subtle text-success'}
                                onClick={() => handleToggleCatalogueStatus(catalogue.id)}
                                title={catalogue.status === 'Active' ? 'Deactivate' : 'Activate'}
                              >
                                <Power size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle"
                                onClick={() => handleDeleteCatalogue(catalogue.id)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No catalogues found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {filteredCatalogues.length > 0 ? (
              filteredCatalogues.map((catalogue, index) => (
                <Card key={catalogue.id} className="mb-3 border-0 shadow-sm catalogue-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{catalogue.name}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE}</div>
                      </div>
                      <div className="status-container">
                        {catalogue.status === 'Active' ? (
                          <div className="status-box bg-success text-white px-3 py-1 rounded fw-bold small text-uppercase">
                            Active
                          </div>
                        ) : (
                          <div className="status-box bg-danger text-white px-3 py-1 rounded fw-bold small text-uppercase">
                            Inactive
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-muted small mb-4">{catalogue.description}</p>

                    <Row className="g-3 mb-4">
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Products:</label>
                          <div className="text-dark">{catalogue.productCount || catalogue.totalProducts || 0}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Created:</label>
                          <div className="text-dark">
                            {catalogue.createdAt ? formatDisplayDate(catalogue.createdAt) : '-'}
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewCatalogue(catalogue)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleEditCatalogue(catalogue)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit size={14} className="me-1" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success border-success-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleDownloadPDF(catalogue)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Download size={14} className="me-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handlePrintCatalogue(catalogue)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={14} className="me-1" /> Print
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${catalogue.status === 'Active' ? 'text-warning border-warning-subtle' : 'text-success border-success-subtle'} flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold`}
                          onClick={() => handleToggleCatalogueStatus(catalogue.id)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Power size={14} className="me-1" /> Status
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger border-danger-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                          onClick={() => handleDeleteCatalogue(catalogue.id)}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Trash2 size={14} className="me-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))
            ) : (
              <div className="text-center py-5 text-muted">
                <BookOpen size={48} className="mb-3 opacity-50" />
                <p>No catalogues found</p>
              </div>
            )}
          </div>
        </Card.Body>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredCatalogues.length}
          pageSize={PAGE_SIZE}
        />
      </Card>

      {/* Catalogue Form Modal */}
      {showCatalogueForm && (
        <CatalogueForm
          catalogue={editingCatalogue}
          allCatalogues={catalogues || []}
          onSave={handleSaveCatalogue}
          onCancel={() => setShowCatalogueForm(false)}
          products={allProducts}
          salespersons={salespersons}
          clients={clients || []}
          isSaving={isSaving}
        />
      )}

      {/* Catalogue View Modal */}
      {showCatalogueView && viewingCatalogue && (
        <CatalogueView
          catalogue={viewingCatalogue}
          onClose={() => setShowCatalogueView(false)}
          onEdit={() => {
            setShowCatalogueView(false);
            handleEditCatalogue(viewingCatalogue);
          }}
          onPrint={() => {
            setShowCatalogueView(false);
            handlePrintCatalogue(viewingCatalogue);
          }}
          canEdit={canEdit}
          products={allProducts}
        />
      )}

      {/* Catalogue Print Modal */}
      {showPrintModal && viewingCatalogue && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Catalogue Preview — {viewingCatalogue.name}</Modal.Title>
            <div className="ms-auto me-3">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="me-1" /> Direct Print
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light d-flex flex-column flex-md-row">
            <div className="flex-grow-1 overflow-auto bg-light">
              
            <div ref={printRef}>
              <CataloguePrintView catalogueData={viewingCatalogue} />
            </div>
          
            </div>
            <div className="no-print bg-white border-start p-3 shadow-sm" style={{ width: '100%', maxWidth: '350px', overflowY: 'auto' }}>
              <ActivityTimeline resourceType="document" resourceId={viewingCatalogue?.id} />
            </div>
          </Modal.Body>
        </Modal>
      )}

      <ConfirmationModal
        show={!!deleteTargetId}
        onHide={() => setDeleteTargetId(null)}
        title="Confirm Delete"
        message="Are you sure you want to delete this catalogue? This action cannot be undone."
        variant="danger"
        onConfirm={confirmDeleteCatalogue}
      />

      <style>{`
        .catalogue-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        .status-box {
          letter-spacing: 0.5px;
          font-size: 0.75rem;
        }
        .detail-item label {
          letter-spacing: 0.5px;
          color: #6c757d;
        }
        .detail-item div {
          font-weight: 500;
          font-size: 0.95rem;
        }
        .bg-light-subtle {
          background-color: #f8f9fa;
        }
        .icon-box {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        .bg-primary-light { background-color: rgba(30, 64, 175, 0.1); }
        .bg-warning-light { background-color: rgba(245, 158, 11, 0.1); }
        .bg-info-light { background-color: rgba(6, 182, 212, 0.1); }
        .bg-success-light { background-color: rgba(16, 185, 129, 0.1); }
        .bg-danger-light { background-color: rgba(239, 68, 68, 0.1); }
      `}</style>
    </>
  );
}

export default CatalogueDashboard;
