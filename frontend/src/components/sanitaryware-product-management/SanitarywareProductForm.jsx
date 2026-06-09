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
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Card,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { Save, X, Plus, Upload, Trash2, Camera, Info, Edit } from 'lucide-react';
import AddableDropdown from '../shared/AddableDropdown.jsx';
import ImageUploadServer from '../shared/ImageUploadServer.jsx';
import PDFUpload from '../shared/PDFUpload.jsx';
import { restrictToNumbers, restrictToDecimal } from '../../utils/inputHelpers.js';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';

const SANITARYWARE_CATEGORIES = [
  'Wash Basin', 'One Piece WC', 'Two Piece WC', 'Table Top Basin',
  'Wall Hung WC', 'Urinal', 'Pedestal Basin', 'Sink', 'EWC', 'Orissa Pan', 'Accessories', 'Other'
];

function SanitarywareProductForm({
  product,
  onSave,
  onCancel,
  masterData,
  onMasterDataUpdate,
}) {
  const [formData, setFormData] = useState({
    productCode: '',
    itemRef: '',
    name: '',
    description: '',
    category: '',
    brand: '',
    collection: '',
    color: '',
    materialType: '',
    shape: '',
    flushType: '',
    trapType: '',
    mountType: '',
    seatCoverType: '',
    finishType: '',
    dimensionStandard: '',
    
    dimensionsL: '',
    dimensionsW: '',
    dimensionsH: '',
    
    weightPerPiece: '',
    pcsPerBox: '1',
    boxPcs: '1',
    boxWeight: '',
    
    factoryPrice: '',
    sellingPrice: '',
    basePrice: '',
    margin: '',
    hsnCode: '',
    status: 'Active',
    
    factoryName: '',
    factoryProductName: '',
    factoryProductCode: '',
    catalogueName: '',
    
    images: [],
    pdfs: [],
  });

  const [errors, setErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [productId, setProductId] = useState(null);

  useEffect(() => {
    if (product) {
      setProductId(product.id || null);
      setFormData({
        productCode: product.productCode || product.product_code || '',
        itemRef: product.itemRef || product.item_ref || '',
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        brand: product.brand || '',
        collection: product.collection || '',
        color: product.color || '',
        materialType: product.materialType || product.material_type || '',
        shape: product.shape || '',
        flushType: product.flushType || product.flush_type || '',
        trapType: product.trapType || product.trap_type || '',
        mountType: product.mountType || product.mount_type || '',
        seatCoverType: product.seatCoverType || product.seat_cover_type || '',
        finishType: product.finishType || product.finish_type || '',
        dimensionStandard: product.dimensionStandard || product.dimension_standard || '',
        
        dimensionsL: product.dimensionsL || product.dimensions_l || '',
        dimensionsW: product.dimensionsW || product.dimensions_w || '',
        dimensionsH: product.dimensionsH || product.dimensions_h || '',
        
        weightPerPiece: product.weightPerPiece || product.weight_per_piece || '',
        pcsPerBox: String(product.pcsPerBox || product.pcs_per_box || '1'),
        boxPcs: String(product.boxPcs || product.box_pcs || '1'),
        boxWeight: product.boxWeight || product.box_weight || '',
        
        factoryPrice: product.factoryPrice || product.factory_price || '',
        sellingPrice: product.sellingPrice || product.selling_price || '',
        basePrice: product.basePrice || product.base_price || '',
        margin: product.margin || '',
        hsnCode: product.hsnCode || product.hsn_code || product.hsCode || product.hs_code || '',
        status: product.status || 'Active',
        
        factoryName: product.factoryName || product.factory_name || '',
        factoryProductName: product.factoryProductName || product.factory_product_name || '',
        factoryProductCode: product.factoryProductCode || product.factory_product_code || '',
        catalogueName: product.catalogueName || product.catalogue_name || '',
        
        images: product.images || [],
        pdfs: product.pdfs || [],
      });
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto calculations for pricing
      if (field === 'factoryPrice' || field === 'sellingPrice') {
        const fp = parseFloat(updated.factoryPrice) || 0;
        const sp = parseFloat(updated.sellingPrice) || 0;
        if (sp > 0) {
          updated.margin = (((sp - fp) / sp) * 100).toFixed(2);
        } else {
          updated.margin = '0';
        }
      }

      // Sync Box Pcs and Box Weight
      if (field === 'weightPerPiece' || field === 'pcsPerBox') {
        const wpp = parseFloat(updated.weightPerPiece) || 0;
        const ppb = parseInt(updated.pcsPerBox) || 1;
        updated.boxWeight = (wpp * ppb).toFixed(2);
      }
      if (field === 'hsnCode') {
        updated.hsnCode = String(value).toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
      }

      // Auto-uppercase specific fields
      if (['name', 'productCode', 'itemRef', 'description'].includes(field)) {
        updated[field] = String(value).toUpperCase();
      }
      
      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Product Name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.weightPerPiece || parseFloat(formData.weightPerPiece) <= 0) {
      newErrors.weightPerPiece = 'Weight per piece must be greater than 0';
    }
    if (!formData.hsnCode || formData.hsnCode.trim() === '') {
      newErrors.hsnCode = 'HSN Code is required';
    } else if (formData.hsnCode.length < 4 || formData.hsnCode.length > 10) {
      newErrors.hsnCode = 'HSN Code must be between 4 and 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setShowErrorModal(true);
      scrollToFirstError();
      showError('Please fill all mandatory fields correctly.');
      return;
    }

    const payload = {
      product_code: formData.productCode || null,
      item_ref: formData.itemRef || null,
      name: formData.name,
      description: formData.description || null,
      category: formData.category || null,
      brand: formData.brand || null,
      collection: formData.collection || null,
      color: formData.color || null,
      material_type: formData.materialType || null,
      shape: formData.shape || null,
      flush_type: formData.flushType || null,
      trap_type: formData.trapType || null,
      mount_type: formData.mountType || null,
      seat_cover_type: formData.seatCoverType || null,
      finish_type: formData.finishType || null,
      dimension_standard: formData.dimensionStandard || null,
      
      dimensions_l: formData.dimensionsL !== '' ? parseFloat(formData.dimensionsL) : null,
      dimensions_w: formData.dimensionsW !== '' ? parseFloat(formData.dimensionsW) : null,
      dimensions_h: formData.dimensionsH !== '' ? parseFloat(formData.dimensionsH) : null,
      
      weight_per_piece: formData.weightPerPiece !== '' ? parseFloat(formData.weightPerPiece) : 0,
      pcs_per_box: formData.pcsPerBox !== '' ? parseInt(formData.pcsPerBox) : 1,
      box_pcs: formData.boxPcs !== '' ? parseInt(formData.boxPcs) : 1,
      box_weight: formData.boxWeight !== '' ? parseFloat(formData.boxWeight) : 0,
      
      factory_price: formData.factoryPrice !== '' ? parseFloat(formData.factoryPrice) : 0,
      selling_price: formData.sellingPrice !== '' ? parseFloat(formData.sellingPrice) : 0,
      base_price: formData.basePrice !== '' ? parseFloat(formData.basePrice) : 0,
      margin: formData.margin !== '' ? parseFloat(formData.margin) : 0,
      hsn_code: formData.hsnCode || null,
      status: formData.status || 'Active',
      
      factory_name: formData.factoryName || null,
      factory_product_name: formData.factoryProductName || null,
      factory_product_code: formData.factoryProductCode || null,
      catalogue_name: formData.catalogueName || null,
      
      images: formData.images || [],
      pdfs: formData.pdfs || [],
    };

    try {
      await onSave(payload);
      showSuccess('Product saved successfully!');
      setTimeout(() => onCancel(), 1500);
    } catch (error) {
      let errorMsg = 'Error saving product. Please try again.';
      if (error.response?.data?.errors) {
        let beErrors = {};
        if (Array.isArray(error.response.data.errors)) {
          error.response.data.errors.forEach(e => {
            const field = e.path || e.param;
            if (field) beErrors[field] = e.msg || e.message;
          });
        } else if (typeof error.response.data.errors === 'object') {
          beErrors = error.response.data.errors;
        }
        
        if (Object.keys(beErrors).length > 0) {
          const mappedErrors = {
            ...beErrors,
            ...(beErrors.weight_per_piece ? { weightPerPiece: beErrors.weight_per_piece } : {}),
            ...(beErrors.hsn_code ? { hsnCode: beErrors.hsn_code } : {}),
          };
          setErrors(mappedErrors);
          errorMsg = 'Validation failed. Please check the highlighted fields.';
          scrollToFirstError();
        }
      }
      showError(errorMsg);
    }
  };

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static" className="product-form-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <Camera size={20} className="me-2" />
          {product?.id ? 'Edit' : 'New'} Sanitaryware Product
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {showAlert && (
          <Alert variant="info" dismissible onClose={() => setShowAlert(false)} className="shadow-sm">
            {alertMessage}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} noValidate>
          <Row className="g-4">
            {/* Core Details */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Product Identity</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Official name of the manufacturing factory</Tooltip>}>
                          <Form.Label className="fw-semibold small text-secondary" style={{cursor: 'help'}}>
                            Factory Name <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.factoryName}
                          onChange={(value) => handleInputChange('factoryName', value)}
                          masterDataType="factoryNames"
                          placeholder="Select or add factory name"
                          isInvalid={!!errors.factoryName}
                          selectClassName="py-2"
                        />
                        <Form.Control.Feedback type="invalid" className={errors.factoryName ? "d-block" : ""}>
                          {errors.factoryName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>The primary name for this sanitaryware product</Tooltip>}>
                            <Form.Label className="fw-semibold small text-danger" style={{cursor: 'help'}}>
                              Product Name * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <Form.Control
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          isInvalid={!!errors.name}
                          placeholder="e.g., Ceramic Wall Hung Closet"
                          className="py-2"
                        />
                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Category is mandatory.</Tooltip>}>
                          <Form.Label className="fw-semibold small text-danger" style={{cursor: 'help'}}>
                            Category * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Select
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          isInvalid={!!errors.category}
                          className="py-2"
                        >
                          <option value="">Select Category</option>
                          {SANITARYWARE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.category}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Product Code (SKU)</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.productCode}
                          onChange={(e) => handleInputChange('productCode', e.target.value)}
                          placeholder="e.g., SW-101"
                          className="py-2"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Item Reference</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.itemRef}
                          onChange={(e) => handleInputChange('itemRef', e.target.value)}
                          placeholder="e.g., REF-4022"
                          className="py-2"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Harmonized System Nomenclature code for export</Tooltip>}>
                            <Form.Label className="fw-semibold small text-danger" style={{cursor: 'help'}}>
                              HSN CODE * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <AddableDropdown
                          value={formData.hsnCode}
                          onChange={(val) => handleInputChange('hsnCode', val)}
                          masterDataType="tariffCodes"
                          placeholder="e.g., 69109000"
                          isInvalid={!!errors.hsnCode}
                          selectClassName="py-2 fw-bold text-primary"
                          addButtonLabel="+ Add New"
                          numbersOnly={true}
                        />
                        <Form.Control.Feedback type="invalid" className={errors.hsnCode ? "d-block" : ""}>
                          {errors.hsnCode}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="Technical attributes or marketing copy..."
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Attributes */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Technical Specifications</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Brand</Form.Label>
                        <AddableDropdown
                          value={formData.brand}
                          onChange={(val) => handleInputChange('brand', val)}
                          masterDataType="sanitarywareBrands"
                          label="Brand"
                          placeholder="Select/Add Brand"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Collection</Form.Label>
                        <AddableDropdown
                          value={formData.collection}
                          onChange={(val) => handleInputChange('collection', val)}
                          masterDataType="sanitarywareCollections"
                          label="Collection"
                          placeholder="Select/Add Collection"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Color</Form.Label>
                        <AddableDropdown
                          value={formData.color}
                          onChange={(val) => handleInputChange('color', val)}
                          masterDataType="sanitarywareColors"
                          label="Color"
                          placeholder="Select/Add Color"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Material Type</Form.Label>
                        <AddableDropdown
                          value={formData.materialType}
                          onChange={(val) => handleInputChange('materialType', val)}
                          masterDataType="sanitarywareMaterialTypes"
                          label="Material Type"
                          placeholder="Select/Add Material"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Shape</Form.Label>
                        <AddableDropdown
                          value={formData.shape}
                          onChange={(val) => handleInputChange('shape', val)}
                          masterDataType="sanitarywareShapes"
                          label="Shape"
                          placeholder="Select/Add Shape"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Flush Type</Form.Label>
                        <AddableDropdown
                          value={formData.flushType}
                          onChange={(val) => handleInputChange('flushType', val)}
                          masterDataType="sanitarywareFlushTypes"
                          label="Flush Type"
                          placeholder="Select/Add Flush"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Trap Type</Form.Label>
                        <AddableDropdown
                          value={formData.trapType}
                          onChange={(val) => handleInputChange('trapType', val)}
                          masterDataType="sanitarywareTrapTypes"
                          label="Trap Type"
                          placeholder="Select/Add Trap"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Mount Type</Form.Label>
                        <AddableDropdown
                          value={formData.mountType}
                          onChange={(val) => handleInputChange('mountType', val)}
                          masterDataType="sanitarywareMountTypes"
                          label="Mount Type"
                          placeholder="Select/Add Mount"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Seat Cover Type</Form.Label>
                        <AddableDropdown
                          value={formData.seatCoverType}
                          onChange={(val) => handleInputChange('seatCoverType', val)}
                          masterDataType="sanitarywareSeatCoverTypes"
                          label="Seat Cover"
                          placeholder="Select/Add Seat Cover"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Dimensions & Packaging Formulas */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Dimensions & Packing Formula</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Length (mm)</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.dimensionsL}
                          onChange={(e) => handleInputChange('dimensionsL', restrictToDecimal(e.target.value, 2))}
                          placeholder="e.g., 550"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Width (mm)</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.dimensionsW}
                          onChange={(e) => handleInputChange('dimensionsW', restrictToDecimal(e.target.value, 2))}
                          placeholder="e.g., 360"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Height (mm)</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.dimensionsH}
                          onChange={(e) => handleInputChange('dimensionsH', restrictToDecimal(e.target.value, 2))}
                          placeholder="e.g., 400"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Weight per Piece is mandatory.</Tooltip>}>
                          <Form.Label className="fw-semibold small text-danger" style={{cursor: 'help'}}>
                            Weight per Piece (kg) * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="number"
                          value={formData.weightPerPiece}
                          onChange={(e) => handleInputChange('weightPerPiece', restrictToDecimal(e.target.value, 2))}
                          isInvalid={!!errors.weightPerPiece}
                          placeholder="e.g., 28.5"
                        />
                        <Form.Control.Feedback type="invalid">{errors.weightPerPiece}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Pieces per Box</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.pcsPerBox}
                          onChange={(e) => handleInputChange('pcsPerBox', restrictToNumbers(e.target.value, false))}
                          placeholder="1"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-secondary">Calculated Box Weight (kg)</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.boxWeight}
                          readOnly
                          className="bg-light fw-bold"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* PRODUCT IMAGES (RECOMMENDED) */}
            <Col xs={12}>
              <Card>
                <Card.Header className="bg-primary text-white border-0">
                  <h6 className="mb-0" style={{ fontSize: '1rem', fontWeight: 600 }}>
                    <Camera size={18} className="me-2" />
                    Product Image (Recommended)
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info" className="mb-3">
                    <strong>📷 Recommended Product Images:</strong> Product images
                    help with visual identification across all modules.
                    Images appear in:
                    <ul className="mb-0 mt-2">
                      <li>Product selection dropdowns in invoices and orders</li>
                      <li>QC inspection forms for quality verification</li>
                      <li>Packing lists for accurate product identification</li>
                      <li>Client catalogues and product presentations</li>
                    </ul>
                  </Alert>

                  <ImageUploadServer
                    productId={productId || product?.id || 'temp'}
                    images={formData.images}
                    onChange={(images) => handleInputChange('images', images)}
                    maxFileSize={5 * 1024 * 1024} // 5MB limit
                    maxFiles={10}
                    onError={(err) => {
                      setAlertMessage(err || 'Error uploading image');
                      setShowAlert(true);
                    }}
                    entityType="sanitaryware-products"
                  />
                  
                  {errors.images && (
                    <Alert variant="secondary" className="mt-3">
                      <strong>⚠️ {errors.images}</strong>
                    </Alert>
                  )}

                  {formData.images.length > 0 && (
                    <div className="mt-3">
                      <small className="text-success">
                        ✅ {formData.images.length} product image(s) uploaded
                        successfully
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
        <ValidationErrorModal 
          show={showErrorModal} 
          errors={errors} 
          onClose={() => setShowErrorModal(false)}
          title="Product Form Validation Error"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          type="button"
          onClick={onCancel}
          className="flex-fill flex-sm-grow-0"
        >
          <X size={16} className="me-1" />
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          className="flex-fill flex-sm-grow-0"
        >
          <Save size={16} className="me-1" />
          {product?.id ? 'Update Product' : 'Create Product'}
        </Button>
      </Modal.Footer>

      <style>{`
        .product-form-modal .modal-dialog {
          max-width: 95%;
        }

        @media (max-width: 992px) {
          .product-form-modal .modal-dialog {
            max-width: 98%;
            margin: 0.5rem;
          }
        }
        
        @media (max-width: 768px) {
          .product-form-modal .modal-dialog {
            margin: 0.25rem;
            max-width: calc(100% - 0.5rem);
          }
          
          .product-form-modal .modal-body {
            padding: 0.75rem !important;
          }
          
          .product-form-modal .modal-header,
          .product-form-modal .modal-footer {
            padding: 0.75rem !important;
          }
          
          .product-form-modal .modal-footer {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .product-form-modal .modal-footer .btn {
            width: 100%;
          }
        }

        @media (max-width: 576px) {
          .product-form-modal .modal-dialog {
            margin: 0.1rem;
            max-width: calc(100% - 0.2rem);
          }
          
          .product-form-modal .modal-body {
            padding: 0.5rem !important;
          }
          
          .product-form-modal .modal-header,
          .product-form-modal .modal-footer {
            padding: 0.5rem !important;
          }
          
          .product-form-modal h6 {
            font-size: 0.9rem;
          }
          
          .form-label {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </Modal>
  );
}

export default SanitarywareProductForm;
