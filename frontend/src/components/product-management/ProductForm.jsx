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
  Badge,
  Card,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { Save, X, Plus, Upload, Trash2, Eye, Camera, Info, Edit } from 'lucide-react';
import DynamicDropdown from '../shared/DynamicDropdown.jsx';
import AddableDropdown from '../shared/AddableDropdown.jsx';
import ImageUploadServer from '../shared/ImageUploadServer.jsx';
import PDFUpload from '../shared/PDFUpload.jsx';
import api from '../../services/api';
import { 
  restrictToNumbers, 
  restrictToDecimal,
  validateThicknessFormat,
} from '../../utils/inputHelpers.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { useCatalogues } from '../../hooks/useCatalogues.js';

function ProductForm({
  product,
  onSave,
  onCancel,
  masterData,
  onMasterDataUpdate,
}) {
  const [formData, setFormData] = useState({
    factoryName: '',
    factoryProductName: '',
    companyProductName: '',
    catalogueName: '',
    description: '',
    productCode: '',
    category: '',
    size: '',
    surface: [],
    thickness: [],
    application: [],
    hsCode: '',
    boxPcs: '',
    sqmPerBox: '',
    defaultBoxesPerPallet: '',
    defaultBoxesPerKathali: '',
    boxWeight: '',
    defaultPerPalletWeight: '',
    status: 'Active',
    images: [], // Mandatory field
  });
  const [errors, setErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [productId, setProductId] = useState(null);
  const [savedProductId, setSavedProductId] = useState(null);
  const [autoFillPacking, setAutoFillPacking] = useState(true);
  const [showSaveTemplatePrompt, setShowSaveTemplatePrompt] = useState(false);
  const [saveAsDefaultTemplate, setSaveAsDefaultTemplate] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [displayCompanyName, setDisplayCompanyName] = useState('Company');
  const { catalogues } = useCatalogues();

  const combinedCatalogueOptions = [...new Set([
    ...(masterData?.masterData?.catalogueNames || []),
    ...(catalogues || []).map(c => c.name)
  ])].filter(Boolean);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('current_user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj && (userObj.company_name || userObj.companyName)) {
          setDisplayCompanyName(userObj.company_name || userObj.companyName);
        }
      }
    } catch (e) {
      console.error('Failed to parse current_user', e);
    }
  }, []);

  useEffect(() => {
    if (product) {
      setProductId(product.id || null);
      setFormData({
        factoryName: product.factoryName || '',
        factoryProductName: product.factoryProductName || '',
        companyProductName: product.companyProductName || product.name || '',
        description: product.description || '',
        productCode: product.productCode || '',
        category: product.category || '',
        // Extract first size if array, otherwise use string
        size: Array.isArray(product.size)
          ? (product.size[0] || '')
          : product.size
            ? product.size.split(',')[0].trim()
            : '',
        surface: Array.isArray(product.surface)
          ? product.surface
          : product.surface
            ? product.surface.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        thickness: Array.isArray(product.thickness)
          ? product.thickness
          : product.thickness
            ? product.thickness.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        application: Array.isArray(product.application)
          ? product.application
          : product.application
            ? product.application.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        boxPcs: product.boxPcs || product.boxPC || product.box_pcs || 0,
        boxWeight: product.boxWeight || product.box_weight || product.defaultPerBoxWeight || product.default_per_box_weight || 0,
        sqmPerBox: product.sqmPerBox || product.sqm_per_box || 0,
        defaultBoxesPerPallet: product.boxesPerPallet || product.defaultBoxesPerPallet || product.boxes_per_pallet || 0,
        defaultBoxesPerKathali: product.defaultBoxesPerKathali || product.default_boxes_per_kathali || 0,
        defaultPerPalletWeight: product.defaultPerPalletWeight || product.default_per_pallet_weight || 0,
        hsCode: product.hsCode || product.hs_code || '',

        status: product.status || 'Active',
        images: product.images || [],
      });
      
      // If we are editing an existing product, we shouldn't auto-fill on initial load
      // because it would overwrite the product's saved packing data.
      setIsInitialLoad(true);
      // Wait for state to settle, then clear initial load flag
      setTimeout(() => setIsInitialLoad(false), 500);
    } else {
      setIsInitialLoad(false);
    }
  }, [product]);

  // Auto-fetch packing details when size changes
  useEffect(() => {
    const fetchPackingDetails = async () => {
      if (!formData.size || !autoFillPacking || isInitialLoad) {
        setShowSaveTemplatePrompt(false);
        return;
      }
      try {
        const response = await api.get(`/size-packing-master/size/${encodeURIComponent(formData.size)}`);
        if (response.data && response.data.data) {
          const template = response.data.data;
          setFormData(prev => ({
            ...prev,
            boxPcs: template.boxPcs || template.box_pcs || 0,
            sqmPerBox: template.sqmPerBox || template.sqm_per_box || 0,
            defaultBoxesPerPallet: template.boxesPerPallet || template.boxes_per_pallet || 0,
            defaultBoxesPerKathali: template.boxesPerKathli || template.boxes_per_kathli || 0,
            boxWeight: template.perBoxWeight || template.per_box_weight || 0,
            defaultPerPalletWeight: template.perPalletWeight || template.per_pallet_weight || 0,
          }));
          setShowSaveTemplatePrompt(false);
          setAlertMessage(`Auto-filled packing details for ${formData.size} from template`);
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 3000);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // Template not found, show prompt
          setShowSaveTemplatePrompt(true);
          setSaveAsDefaultTemplate(true);
        }
      }
    };

    fetchPackingDetails();
  }, [formData.size, autoFillPacking]);

  // Field-type mapping for real-time input filtering
  const fieldFilterMap = {
    // Integer fields - numbers only
    boxPcs: (val) => restrictToNumbers(val, false),
    boxPC: (val) => restrictToNumbers(val, false),
    defaultBoxesPerPallet: (val) => restrictToNumbers(val, false),
    defaultBoxesPerKathali: (val) => restrictToNumbers(val, false),
    
    // Decimal fields - numbers with decimals
    boxWeight: (val) => restrictToDecimal(val, 2),
    sqmPerBox: (val) => restrictToDecimal(val, 2),
    defaultPerBoxWeight: (val) => restrictToDecimal(val, 2),
    defaultPerPalletWeight: (val) => restrictToDecimal(val, 2),

  };

  const handleInputChange = (field, value) => {
    // Apply field-specific filtering
    let filteredValue = value;
    if (fieldFilterMap[field]) {
      filteredValue = fieldFilterMap[field](value);
    }

    // Auto-uppercase for text fields
    const uppercaseFields = ['factoryProductName', 'companyProductName', 'description', 'productCode'];
    if (typeof filteredValue === 'string' && uppercaseFields.includes(field)) {
      filteredValue = filteredValue.toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      [field]: filteredValue,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleMultiSelectChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Array.isArray(value) ? value : [value],
    }));
  };

  const isFormValid = () => {
    const productName = formData.companyProductName || formData.factoryProductName || formData.name;
    return productName && productName.trim().length > 0;
  };

  const validateForm = () => {
    const newErrors = {};

    // REQUIRED FIELDS (marked with * in form)
    const productName = formData.companyProductName;
    if (!productName || !productName.trim()) {
      newErrors.companyProductName = 'Product Name is required';
    } else if (productName.trim().length < 2) {
      newErrors.companyProductName = 'Product Name must be at least 2 characters long';
    } else if (productName.trim().length > 255) {
      newErrors.companyProductName = 'Product Name must not exceed 255 characters';
    }

    // Category - required
    if (!formData.category || !formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    // Size - required
    if (!formData.size || !formData.size.trim()) {
      newErrors.size = 'Size is required';
    }

    // Surface - required
    if (!formData.surface || formData.surface.length === 0) {
      newErrors.surface = 'Surface is required';
    }

    // Thickness - required
    if (!formData.thickness || formData.thickness.length === 0) {
      newErrors.thickness = 'Thickness is required';
    }

    // Application - required
    if (!formData.application || formData.application.length === 0) {
      newErrors.application = 'Application is required';
    }

    // HSN Code - required
    if (!formData.hsCode || !formData.hsCode.trim()) {
      newErrors.hsCode = 'HSN Code is required';
    }

    // Packing weights and calculations are optional but cannot be negative
    if (formData.sqmPerBox && parseFloat(formData.sqmPerBox) < 0) {
      newErrors.sqmPerBox = 'SQM per Box cannot be negative';
    }
    if (formData.boxWeight && parseFloat(formData.boxWeight) < 0) {
      newErrors.boxWeight = 'Per Box Weight cannot be negative';
    }
    if (formData.defaultPerPalletWeight && parseFloat(formData.defaultPerPalletWeight) < 0) {
      newErrors.defaultPerPalletWeight = 'Per Pallet Weight cannot be negative';
    }

    // OPTIONAL FIELDS - Only validate if provided (don't set errors for empty values)
    // Product Code - optional, only validate if provided
    if (formData.productCode && formData.productCode.trim() && formData.productCode.length > 100) {
      newErrors.productCode = 'Product Code must not exceed 100 characters';
    }

    if (formData.category && formData.category.trim() && formData.category.length > 100) {
      newErrors.category = 'Category must not exceed 100 characters';
    }

    // Size validation
    if (formData.size && formData.size.length > 100) {
      newErrors.size = 'Size selection is too long (max 100 characters).';
    }

    // Surface validation - check joined string length only if provided
    if (formData.surface && formData.surface.length > 0) {
      const surfaceString = formData.surface.join(', ');
      if (surfaceString.length > 100) {
        newErrors.surface = 'Surface selection is too long (max 100 characters). Please select fewer options.';
      }
    }

    // Boxes per Big Pallet - optional field, only validate if provided
    if (formData.defaultBoxesPerPallet && parseInt(formData.defaultBoxesPerPallet) < 0) {
      newErrors.defaultBoxesPerPallet = 'Boxes per Big Pallet cannot be negative';
    }

    // Boxes per Kathali - optional field, only validate if provided
    if (formData.defaultBoxesPerKathali && parseInt(formData.defaultBoxesPerKathali) < 0) {
      newErrors.defaultBoxesPerKathali = 'Boxes per Kathali cannot be negative';
    }



    // Status validation - required
    const allowedStatuses = ['Active', 'Inactive', 'Discontinued'];
    if (!formData.status || !allowedStatuses.includes(formData.status)) {
      newErrors.status = 'Invalid status. Must be Active, Inactive, or Discontinued';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setShowErrorModal(true);
      scrollToFirstError();
      showAlertMessage('Please fill all mandatory fields correctly.', 'danger');
      return;
    }

      const productName = formData.companyProductName || formData.factoryProductName || 'PROD';
      
      // Prepare product data with proper structure - match backend field names exactly
      const productData = {
        product_code: formData.productCode || null,
        item_ref: formData.productCode || `${productName.substring(0, 3).toUpperCase()}-${Date.now()}`,
        name: productName,
        description: formData.description || null,
        category: formData.category || null,
        // Single select size
        size: formData.size || null,
        // Convert arrays to comma-separated strings for VARCHAR columns
        surface: formData.surface && formData.surface.length > 0 ? formData.surface.join(', ') : null,
        thickness: formData.thickness && formData.thickness.length > 0 ? formData.thickness.join(', ') : null,
        sqm_per_box: formData.sqmPerBox !== '' && formData.sqmPerBox !== 0 ? parseFloat(formData.sqmPerBox) : (formData.sqmPerBox === 0 ? 0 : null),
        boxes_per_pallet: formData.defaultBoxesPerPallet !== '' ? parseInt(formData.defaultBoxesPerPallet) : null,
        box_weight: formData.boxWeight !== '' && formData.boxWeight !== 0 ? parseFloat(formData.boxWeight) : (formData.boxWeight === 0 ? 0 : null),

        status: formData.status || 'Active',
        hs_code: formData.hsCode || null,
        // Images and PDFs are arrays - backend stores them as JSONB
        images: formData.images || [],
        factory_name: formData.factoryName || null,
        factory_product_name: formData.factoryProductName || null,
        company_product_name: formData.companyProductName || null,
        catalogue_name: 'Tiles',
        // Convert application array to comma-separated string for VARCHAR column
        application: formData.application && formData.application.length > 0 ? formData.application.join(', ') : null,
        box_pcs: formData.boxPcs !== '' ? parseInt(formData.boxPcs) : null,
        default_boxes_per_kathali: formData.defaultBoxesPerKathali !== '' ? parseInt(formData.defaultBoxesPerKathali) : null,
        default_per_box_weight: formData.boxWeight !== '' && formData.boxWeight !== 0 ? parseFloat(formData.boxWeight) : (formData.boxWeight === 0 ? 0 : null),
        default_per_pallet_weight: formData.defaultPerPalletWeight !== '' && formData.defaultPerPalletWeight !== 0 ? parseFloat(formData.defaultPerPalletWeight) : (formData.defaultPerPalletWeight === 0 ? 0 : null),

      };

    try {
      // First, handle saving the template if requested
      if (showSaveTemplatePrompt && saveAsDefaultTemplate && formData.size) {
        // Prevent saving a template if no packing information was actually provided
        const hasPackingDetails = 
          (parseFloat(productData.box_pcs || 0) > 0) || 
          (parseFloat(productData.sqm_per_box || 0) > 0) || 
          (parseFloat(productData.boxes_per_pallet || 0) > 0) || 
          (parseFloat(productData.box_weight || productData.default_per_box_weight || 0) > 0);

        if (hasPackingDetails) {
          try {
            await api.post('/size-packing-master', {
              size: formData.size,
              box_pcs: productData.box_pcs || 0,
              sqm_per_box: productData.sqm_per_box || 0,
              boxes_per_pallet: productData.boxes_per_pallet || 0,
              boxes_per_kathli: productData.default_boxes_per_kathali || 0,
              per_box_weight: productData.box_weight || 0,
              per_pallet_weight: productData.default_per_pallet_weight || 0,
              status: 'Active'
            });
            // Do not fail product save if template fails, just catch it
          } catch (templateError) {
            console.error("Failed to save default template", templateError);
          }
        }
      }

      const savedProduct = await onSave(productData);
      if (savedProduct?.id) {
        setSavedProductId(savedProduct.id);
        setProductId(savedProduct.id);
      }
      showAlertMessage('Product saved successfully! You can now upload images.', 'success');
    } catch (error) {
      // Parse backend validation errors
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
          // Map backend field names back to frontend field names
          const mappedErrors = {
            ...beErrors,
            ...(beErrors.factory_name ? { factoryName: beErrors.factory_name } : {}),
            ...(beErrors.factory_product_name ? { factoryProductName: beErrors.factory_product_name } : {}),
            ...(beErrors.company_product_name ? { companyProductName: beErrors.company_product_name } : {}),
          };
          setErrors(mappedErrors);
          errorMsg = 'Validation failed. Please check the highlighted fields.';
          scrollToFirstError();
        }
      }
      showAlertMessage(errorMsg, 'danger');
    }
  };

  const showAlertMessage = (message, type = 'info') => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleMasterDataAdd = (field, newValue) => {
    // Validate thickness format before adding
    if (field === 'thickness') {
      const error = validateThicknessFormat(newValue);
      if (error) {
        showAlertMessage('Invalid thickness format: ' + error, 'danger');
        return;
      }
    }
    onMasterDataUpdate(field, newValue);
    showAlertMessage(`${field} added successfully!`, 'success');
  };

  return (
    <Modal
      show={true}
      onHide={onCancel}
      size="xl"
      backdrop="static"
      className="product-form-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <Camera size={20} className="me-2" />
          {product?.id ? 'Edit' : 'New'} Product
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {showAlert && (
          <Alert
            variant="primary"
            dismissible
            onClose={() => setShowAlert(false)}
          >
            {alertMessage}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} noValidate>
          <Row className="g-4">
            {/* Factory Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Factory Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Official name of the manufacturing factory</Tooltip>}>
                            <Form.Label className="text-danger" style={{cursor: 'help'}}>
                              Factory Name * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <AddableDropdown
                          value={formData.factoryName}
                          onChange={(value) =>
                            handleInputChange('factoryName', value)
                          }
                          masterDataType="factoryNames"
                          label="Factory Name"
                          placeholder="Select or add factory name"
                          isInvalid={!!errors.factoryName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.factoryName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Product name as per factory records</Tooltip>}>
                            <Form.Label className="text-danger" style={{cursor: 'help'}}>
                              Factory Product Name * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <Form.Control
                          type="text"
                          value={formData.factoryProductName}
                          onChange={(e) =>
                            handleInputChange(
                              'factoryProductName',
                              e.target.value
                            )
                          }
                          isInvalid={!!errors.factoryProductName}
                          placeholder="e.g., Marble Polished Tile"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.factoryProductName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Company Product Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">
                    {displayCompanyName} Product Information
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Your official selling name for this product</Tooltip>}>
                            <Form.Label className="text-danger" style={{cursor: 'help'}}>
                              Product Name * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <Form.Control
                          type="text"
                          value={formData.companyProductName}
                          onChange={(e) =>
                            handleInputChange(
                              'companyProductName',
                              e.target.value
                            )
                          }
                          isInvalid={!!errors.companyProductName}
                          placeholder="e.g., Premium Marble Floor Tile"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.companyProductName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={formData.description}
                          onChange={(e) =>
                            handleInputChange('description', e.target.value)
                          }
                          placeholder="Enter product description (optional)"
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Product Code</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.productCode}
                          onChange={(e) =>
                            handleInputChange('productCode', e.target.value)
                          }
                          isInvalid={!!errors.productCode}
                          placeholder="e.g., TILE-001"
                        />
                        <Form.Text className="text-muted">
                          Optional: Leave blank if not needed
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Catalogue mapping for this product</Tooltip>}>
                          <Form.Label className="text-primary" style={{cursor: 'help'}}>
                            Catalogue Name <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.catalogueName}
                          onChange={(value) =>
                            handleInputChange('catalogueName', value)
                          }
                          masterDataType="catalogueNames"
                          label="Catalogue Name"
                          placeholder="Select or add catalogue name"
                          options={combinedCatalogueOptions}
                          isInvalid={!!errors.catalogueName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.catalogueName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Product Specifications */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Product Specifications</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Product category is mandatory (e.g. Porcelain, Ceramic).</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Categories * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.category}
                          onChange={(value) =>
                            handleInputChange('category', value)
                          }
                          masterDataType="categories"
                          label="Category"
                          placeholder="Select or add categories"
                          isMultiple={false}
                          isInvalid={!!errors.category}
                          addButtonLabel="+ Create Category"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.category}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Size is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Size * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.size}
                          onChange={(value) =>
                            handleInputChange('size', value)
                          }
                          masterDataType="sizes"
                          label="Size"
                          placeholder="Select or add size"
                          isMultiple={false}
                          isInvalid={!!errors.size}
                          addButtonLabel="+ Create Size"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.size}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Surface is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Surface * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.surface}
                          onChange={(value) =>
                            handleMultiSelectChange('surface', value)
                          }
                          masterDataType="surfaces"
                          label="Surface"
                          placeholder="Select or add surfaces"
                          isMultiple={true}
                          isInvalid={!!errors.surface}
                          addButtonLabel="+ Create Surface"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.surface}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Thickness is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Thickness * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.thickness}
                          onChange={(value) =>
                            handleMultiSelectChange('thickness', value)
                          }
                          masterDataType="thickness"
                          label="Thickness"
                          placeholder="Select or add thickness"
                          isMultiple={true}
                          isInvalid={!!errors.thickness}
                          validateFunction={validateThicknessFormat}
                          addButtonLabel="+ Create Thickness"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.thickness}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Application is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Application * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.application}
                          onChange={(value) =>
                            handleMultiSelectChange('application', value)
                          }
                          masterDataType="applications"
                          label="Application"
                          placeholder="Select or add applications"
                          isMultiple={true}
                          isInvalid={!!errors.application}
                          addButtonLabel="+ Create Application"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.application}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>HSN Code is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            HSN Code * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.hsCode}
                          onChange={(value) => handleInputChange('hsCode', value)}
                          masterDataType="tariffCodes"
                          label="HSN Code"
                          placeholder="Select or add HSN/Tariff code"
                          isInvalid={!!errors.hsCode}
                          numbersOnly={true}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.hsCode}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          Harmonised System Nomenclature code (e.g. 69072100)
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Packing Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Packing Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <Form.Label>Box Pcs</Form.Label>
                        <Form.Control
                          type="number"
                          step="1"
                          min="0"
                          value={formData.boxPcs}
                          onChange={(e) => {
                            const value = e.target.value;
                            const parsed = value === '' ? 0 : parseInt(value);
                            handleInputChange(
                              'boxPcs',
                              isNaN(parsed) || parsed < 0 ? 0 : parsed
                            );
                          }}
                          placeholder="0"
                        />
                        <Form.Text className="text-muted">
                          Optional: Pieces per box
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={4}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>SQM per Box is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            SQM per Box * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.sqmPerBox}
                          onChange={(e) => {
                            handleInputChange('sqmPerBox', restrictToDecimal(e.target.value, 3));
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              handleInputChange('sqmPerBox', val.toFixed(2));
                            }
                          }}
                          placeholder="0.00"
                          isInvalid={!!errors.sqmPerBox}
                        />
                        <Form.Text className="text-muted">
                          Default: 0 (for area calculations)
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                          {errors.sqmPerBox}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <Form.Label>Boxes per Big Pallet</Form.Label>
                        <Form.Control
                          type="number"
                          step="1"
                          min="0"
                          value={formData.defaultBoxesPerPallet}
                          onChange={(e) => {
                            const value = e.target.value;
                            const parsed = value === '' ? 0 : parseInt(value);
                            handleInputChange(
                              'defaultBoxesPerPallet',
                              isNaN(parsed) || parsed < 0 ? 0 : parsed
                            );
                          }}
                          placeholder="0"
                          isInvalid={!!errors.defaultBoxesPerPallet}
                        />
                        <Form.Text className="text-muted">
                          Optional: Number of boxes per pallet
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                          {errors.defaultBoxesPerPallet}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <Form.Label>Boxes per Kathali</Form.Label>
                        <Form.Control
                          type="number"
                          step="1"
                          min="0"
                          value={formData.defaultBoxesPerKathali}
                          onChange={(e) => {
                            const value = e.target.value;
                            const parsed = value === '' ? 0 : parseInt(value);
                            handleInputChange(
                              'defaultBoxesPerKathali',
                              isNaN(parsed) || parsed < 0 ? 0 : parsed
                            );
                          }}
                          placeholder="0"
                          isInvalid={!!errors.defaultBoxesPerKathali}
                        />
                        <Form.Text className="text-muted">
                          Optional: Number of boxes per kathali
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                          {errors.defaultBoxesPerKathali}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Per Box Weight is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Per Box Weight (kg) * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.defaultPerBoxWeight}
                          onChange={(e) => {
                            handleInputChange('defaultPerBoxWeight', restrictToDecimal(e.target.value, 3));
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              handleInputChange('defaultPerBoxWeight', val.toFixed(2));
                            }
                          }}
                          placeholder="0.00"
                          isInvalid={!!errors.defaultPerBoxWeight}
                        />
                        <Form.Text className="text-muted">
                          Default: 0 kg (for net weight calculations)
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                          {errors.defaultPerBoxWeight}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Per Pallet Weight is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Per Pallet Weight (kg) * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.defaultPerPalletWeight}
                          onChange={(e) => {
                            handleInputChange('defaultPerPalletWeight', restrictToDecimal(e.target.value, 3));
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              handleInputChange('defaultPerPalletWeight', val.toFixed(2));
                            }
                          }}
                          placeholder="0.00"
                          isInvalid={!!errors.defaultPerPalletWeight}
                        />
                        <Form.Text className="text-muted">
                          Default: 0 kg (for gross weight calculations)
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                          {errors.defaultPerPalletWeight}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={4}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Status is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Status * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <div className="status-segmented-control mt-2">
                          {['Active', 'Inactive', 'Discontinued'].map((status) => (
                            <Button
                              key={status}
                              variant={formData.status === status ? (status === 'Active' ? 'success' : status === 'Inactive' ? 'secondary' : 'danger') : 'outline-light'}
                              size="sm"
                              className={`status-btn ${formData.status === status ? 'active shadow-sm' : 'text-muted'}`}
                              onClick={() => handleInputChange('status', status)}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                        {errors.status && (
                          <Form.Text className="text-danger">
                            {errors.status}
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  {showSaveTemplatePrompt && formData.size && (
                    <div className="mt-4 p-3 bg-light rounded border border-primary-subtle">
                      <Form.Check 
                        type="checkbox"
                        id="save-template-prompt"
                        label={<span className="fw-bold text-primary">Save as default packing template for {formData.size}</span>}
                        checked={saveAsDefaultTemplate}
                        onChange={(e) => setSaveAsDefaultTemplate(e.target.checked)}
                      />
                      <small className="text-muted ms-4 d-block mt-1">
                        This will automatically fill these packing details the next time you create a product with size "{formData.size}".
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            {/* PRODUCT IMAGES (RECOMMENDED) */}
            <Col xs={12}>
              <Card className="border-0 shadow-sm">
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
                      <li>
                        Product selection dropdowns in invoices and orders
                      </li>
                      <li>QC inspection forms for quality verification</li>
                      <li>Packing lists for accurate product identification</li>
                      <li>Client catalogues and product presentations</li>
                    </ul>
                  </Alert>

                  <ImageUploadServer
                    productId={savedProductId || product?.id || 'temp'}
                    images={formData.images}
                    onChange={(images) => handleInputChange('images', images)}
                    maxFileSize={5 * 1024 * 1024} // 5MB limit
                    maxFiles={10}
                    onError={(err) => {
                      setAlertMessage(err || 'Error uploading image');
                      setShowAlert(true);
                    }}
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
          disabled={!isFormValid()}
          style={!isFormValid() ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
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
            margin: 0.5rem auto;
          }
        }
        
        @media (max-width: 768px) {
          .product-form-modal .modal-dialog {
            margin: 0;
            max-width: 100%;
            width: 100%;
            height: 100%;
          }

          .product-form-modal .modal-content {
            height: 100%;
            border-radius: 0;
            border: none;
            overflow-y: auto;
          }
          
          .product-form-modal .modal-body {
            padding: 0.75rem !important;
            overflow-y: auto;
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

          /* Prevent any child from overflowing horizontally */
          .product-form-modal .modal-body * {
            max-width: 100%;
            box-sizing: border-box;
          }

          /* Tighten card sections */
          .product-form-modal .card {
            margin-bottom: 0.75rem;
          }

          .product-form-modal .card-body {
            padding: 0.75rem;
          }
        }

        @media (max-width: 576px) {
          .product-form-modal .modal-body {
            padding: 0.5rem !important;
          }
          
          .product-form-modal .modal-header,
          .product-form-modal .modal-footer {
            padding: 0.5rem 0.75rem !important;
          }
          
          .product-form-modal h6 {
            font-size: 0.875rem;
          }
          
          .form-label {
            font-size: 0.875rem;
          }
          
          .badge {
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
          }

          .product-form-modal .row.g-4 {
            --bs-gutter-x: 0.5rem;
            --bs-gutter-y: 0.5rem;
          }
        }
        .status-segmented-control {
          display: flex;
          flex-wrap: wrap;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
          width: fit-content;
          max-width: 100%;
        }
        
        .status-btn {
          border: none !important;
          border-radius: 8px !important;
          padding: 6px 16px !important;
          font-weight: 600 !important;
          font-size: 0.85rem !important;
          transition: all 0.2s ease !important;
        }

        .status-btn:not(.active):hover {
          background: #e2e8f0 !important;
          color: #475569 !important;
        }

        .status-btn.active {
          transform: scale(1.02);
        }

        /* Cursor utility */
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </Modal>
  );
}

export default ProductForm;
