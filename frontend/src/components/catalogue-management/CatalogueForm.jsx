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

import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Row, Col, Alert, Card, Badge, Table, Spinner } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Save, X, Upload, Eye, Trash2, Search, Edit, Check } from 'lucide-react';
import ImageUpload from '../shared/ImageUpload.jsx';
import PDFUpload from '../shared/PDFUpload.jsx';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { tokenManager } from '../../utils/tokenManager.js';

function CatalogueForm({
  catalogue,
  onSave,
  onCancel,
  products = [],
  allCatalogues = [],
  salespersons = [],
  clients = [],
  isSaving = false,
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
    coverImage: [],
    pdfFile: [],
    selectedProducts: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tile');
  const [errors, setErrors] = useState({});
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const assignedInOtherCatalogues = useMemo(() => {
    const assigned = new Set();
    allCatalogues.forEach(cat => {
      if (cat.id !== catalogue?.id) {
        const rawIds = cat.productIds || (cat.products || []).map(p => p.id || p);
        // Normalize: productIds may be plain UUIDs or {id, productType} objects
        rawIds.forEach(item => assigned.add(typeof item === 'object' ? (item.id || item) : item));
      }
    });
    return assigned;
  }, [allCatalogues, catalogue]);

  useEffect(() => {
    if (catalogue) {
      // Determine the cover image and PDF file URLs with tokens for security
      const token = tokenManager.getAccessToken();
      
      const coverPath = catalogue.coverImagePath;
      const normalizedCoverPath = coverPath ? (coverPath.startsWith('/') ? coverPath : `/${coverPath}`) : null;
      const coverImage = normalizedCoverPath ? [{
        id: 'existing-cover',
        name: 'Current Cover Image',
        url: `${normalizedCoverPath}${token ? `?token=${token}` : ''}`,
        isExisting: true,
        size: 0,
        type: 'image/jpeg'
      }] : [];

      const pdfPath = catalogue.pdfFilePath;
      const normalizedPdfPath = pdfPath ? (pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`) : null;
      const pdfFile = normalizedPdfPath ? [{
        id: 'existing-pdf',
        name: 'Current PDF Catalogue',
        url: `${normalizedPdfPath}${token ? `?token=${token}` : ''}`,
        isExisting: true,
        size: 0,
        type: 'application/pdf'
      }] : [];

      // Normalize selectedProducts: existing catalogues may have plain IDs or {id, productType} objects
      const rawProducts = catalogue.products || [];
      const selectedProducts = rawProducts.map(p => ({
        id: p.id || p,
        productType: p.productType || p.product_type || 'tile'
      }));

      // Normalize legacy statuses (Draft/Archived) to 'Active' since only Active/Inactive are supported
      const rawStatus = catalogue.status || 'Active';
      const normalizedStatus = ['Active', 'Inactive'].includes(rawStatus) ? rawStatus : 'Active';

      setFormData({
        name: catalogue.name || '',
        description: catalogue.description || '',
        status: normalizedStatus,
        coverImage,
        pdfFile,
        selectedProducts,
      });
    }
  }, [catalogue]);

  const toggleProductSelection = (productId, productType) => {
    setFormData((prev) => {
      const isSelected = prev.selectedProducts.some(p => (typeof p === 'object' ? p.id : p) === productId);
      const newSelection = isSelected
        ? prev.selectedProducts.filter((p) => (typeof p === 'object' ? p.id : p) !== productId)
        : [...prev.selectedProducts, { id: productId, productType: productType || 'tile' }];
      return { ...prev, selectedProducts: newSelection };
    });
  };

  // Helper: check if a product ID is selected
  const isProductSelected = (productId) => {
    return formData.selectedProducts.some(p => (typeof p === 'object' ? p.id : p) === productId);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.productCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isAvailable = !assignedInOtherCatalogues.has(p.id) || isProductSelected(p.id);
    const matchesType = p.productType === activeTab;
    return matchesSearch && isAvailable && matchesType;
  });

  const handleInputChange = (field, value) => {
    let processedValue = value;
    if (['name', 'description'].includes(field) && typeof value === 'string') {
      processedValue = value.toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      [field]: processedValue,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Catalogue name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.selectedProducts.length === 0) {
      newErrors.selectedProducts = 'At least one product must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    if (validateForm()) {
      const catalogueFormData = new FormData();
      catalogueFormData.append('name', formData.name);
      catalogueFormData.append('description', formData.description);
      catalogueFormData.append('status', formData.status);
      
      if (formData.coverImage.length > 0 && formData.coverImage[0].file) {
        catalogueFormData.append('coverImage', formData.coverImage[0].file);
      }
      
      if (formData.pdfFile.length > 0 && formData.pdfFile[0].file) {
        catalogueFormData.append('pdfFile', formData.pdfFile[0].file);
      }

      // Tag each product with its productType so the backend avoids FK violations
      const taggedProductIds = formData.selectedProducts.map(item => {
        if (typeof item === 'object' && item.id) return item;
        // Fallback: look up productType from the products prop
        const found = products.find(p => p.id === item);
        return { id: item, productType: found?.productType || 'tile' };
      });
      catalogueFormData.append('product_ids', JSON.stringify(taggedProductIds));
      
      onSave(catalogueFormData);
    }
  };

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {catalogue ? 'Edit Catalogue' : 'Create New Catalogue'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {showAlert && (
          <Alert variant="primary" dismissible onClose={() => setShowAlert(false)}>
            {alertMessage}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-primary text-white py-3">
                  <h6 className="mb-0 fw-bold">Basic Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-4">
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label className="fw-bold">Catalogue Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          isInvalid={!!errors.name}
                          placeholder="Enter catalogue name (e.g. Summer 2026 Collection)"
                        />
                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label className="fw-bold">Description *</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          isInvalid={!!errors.description}
                          placeholder="Enter a brief description of this catalogue"
                        />
                        <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={12}>
                      <Form.Group>
                        <Form.Label className="fw-bold">Status</Form.Label>
                        <Form.Select
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                        >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                      </Form.Group>
                    </Col>

                    {/* Media Uploads Row */}
                    <Col xs={12}>
                      <Row className="g-4">
                        <Col xs={12} md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">Cover Image</Form.Label>
                            <ImageUpload
                              images={formData.coverImage}
                              onChange={(images) => handleInputChange('coverImage', images)}
                              maxFiles={1}
                            />
                          </Form.Group>
                        </Col>

                        <Col xs={12} md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">PDF File</Form.Label>
                            <PDFUpload
                              pdfs={formData.pdfFile}
                              onChange={(pdfs) => handleInputChange('pdfFile', pdfs)}
                              maxFiles={1}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white py-3">
                  <h6 className="mb-0 fw-bold">Manage Products</h6>
                  <Badge bg="light" text="primary">{formData.selectedProducts.length} Products Selected</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="bg-light px-3 pt-3 border-bottom">
                    <ul className="nav nav-tabs border-bottom-0">
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'tile' ? 'active fw-bold' : 'text-muted'}`}
                          onClick={(e) => { e.preventDefault(); setActiveTab('tile'); }}
                          type="button"
                        >
                          Tile Products
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'sanitaryware' ? 'active fw-bold' : 'text-muted'}`}
                          onClick={(e) => { e.preventDefault(); setActiveTab('sanitaryware'); }}
                          type="button"
                        >
                          Sanitaryware Products
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="p-3 border-bottom bg-white">
                    <div className="position-relative">
                      <Search size={18} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                      <Form.Control
                        type="text"
                        placeholder="Search available products by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ps-5 py-2"
                      />
                    </div>
                    {errors.selectedProducts && (
                      <div className="text-danger small mt-2">{errors.selectedProducts}</div>
                    )}
                    <div className="text-muted extra-small mt-2">
                      * Products already assigned to other catalogues are hidden to prevent duplication.
                    </div>
                  </div>

                  <div className="product-list-container">
                    <Table hover responsive className="mb-0 align-middle">
                      <thead className="table-light small text-uppercase">
                        <tr>
                          <th className="ps-4" style={{ width: '50px' }}>Select</th>
                          <th>Product Name</th>
                          <th>{activeTab === 'sanitaryware' ? 'Category / Brand' : 'Factory Product Name'}</th>
                          <th>Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <tr 
                              key={product.id} 
                              onClick={() => toggleProductSelection(product.id, product.productType)}
                              style={{ cursor: 'pointer' }}
                              className={isProductSelected(product.id) ? 'table-primary-light' : ''}
                            >
                              <td className="ps-4">
                                <Form.Check
                                  type="checkbox"
                                  checked={isProductSelected(product.id)}
                                  onChange={() => {}}
                                />
                              </td>
                              <td className="fw-medium">{product.name}</td>
                              <td>{activeTab === 'sanitaryware' ? (product.category || product.brand || 'N/A') : (product.factoryProductName || 'N/A')}</td>
                              <td>{product.size || 'N/A'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center py-5 text-muted">
                              No available products found matching your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {Object.keys(errors).length > 0 && (
            <Alert variant="danger" className="mt-3 py-2 small">
              Please fix the errors above before saving the catalogue.
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer className="bg-light border-top-0">
        <Button variant="outline-secondary" onClick={onCancel}>
          <X size={16} className="me-1" /> Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          className="px-4"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="me-1" /> {catalogue ? 'Update Catalogue' : 'Save Catalogue'}
            </>
          )}
        </Button>
      </Modal.Footer>

      <style>{`
        .product-list-container {
          max-height: 450px;
          overflow-y: auto;
        }
        .table-primary-light {
          background-color: rgba(13, 110, 253, 0.05);
        }
        .product-list-container table tr:hover {
          background-color: rgba(13, 110, 253, 0.08) !important;
        }
        .extra-small {
          font-size: 0.75rem;
        }
      `}</style>
    </Modal>
  );
}

export default CatalogueForm;
