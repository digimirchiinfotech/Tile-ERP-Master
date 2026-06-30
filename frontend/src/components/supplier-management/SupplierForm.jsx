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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Form, Row, Col, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Save, X, Info, Check } from 'lucide-react';
import api from '../../services/api.js';

import Button from '../shared/Button.jsx';
import { supplierSchema, defaultSupplierValues } from '../../utils/validation/supplierSchema.js';
import { restrictToNumbers, restrictToLetters } from '../../utils/inputHelpers.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { getAllCountries, getCitiesByCountry, getAllFactories } from '../../services/masterDataService.js';
import { formatDisplayDate } from '../../utils/formatters.js';
import AddableDropdown from '../shared/AddableDropdown.jsx';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';

function SupplierForm({ supplier, onSave, onCancel }) {
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting, isValid } } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultSupplierValues,
    mode: 'onChange',
  });

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [factories, setFactories] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalOrders: 0,
    totalPurchaseValue: 0,
    lastOrderDate: null,
    createdDate: formatDisplayDate(new Date()),
  });
  
  const [gstinStatus, setGstinStatus] = useState(null);

  const validateGstin = async (gstinValue) => {
    if (!gstinValue || gstinValue.length !== 15) {
      showError('Please enter a valid 15-character GSTIN');
      return;
    }
    try {
      setGstinStatus('loading');
      const res = await api.post('/gstin/validate', { gstin: gstinValue });
      if (res.data?.data?.isValid) {
        setGstinStatus('valid');
        showSuccess('GSTIN is valid!');
      } else {
        setGstinStatus('invalid');
        showError('Invalid GSTIN format');
      }
    } catch (error) {
      setGstinStatus('error');
      showError('Failed to validate GSTIN');
    }
  };

  const watchCountry = watch('country');

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name || '',
        country: supplier.country || '',
        city: supplier.city || '',
        address: supplier.address || '',
        contactPersonName: supplier.contactPersonName || '',
        emailId: supplier.emailId || '',
        contactNumber: supplier.contactNumber || '',
        gstn: supplier.gstn || '',
        pan: supplier.pan || '',
        productCategories: supplier.productCategories || [],
        qualityRating: supplier.qualityRating ? Number(supplier.qualityRating) : null,
        status: supplier.status || 'Active',
        notes: supplier.notes || '',
        bankDetails: supplier.bankDetails || {
          bankName: '',
          branch: '',
          accountNumber: '',
          ifscCode: '',
        },
        website: supplier.website || '',
        leadTime: supplier.leadTime || '',
        paymentTerms: supplier.paymentTerms || '',
      });

      setPerformanceMetrics({
        totalOrders: supplier.totalOrders || 0,
        totalPurchaseValue: supplier.totalPurchaseValue || 0,
        lastOrderDate: supplier.lastOrderDate || null,
        createdDate: supplier.createdAt ? formatDisplayDate(supplier.createdAt) : formatDisplayDate(new Date()),
      });
    }
  }, [supplier, reset]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const countriesData = await getAllCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    const fetchFactories = async () => {
      try {
        const factoriesData = await getAllFactories();
        setFactories(factoriesData);
      } catch (error) {
        console.error('Error loading factories:', error);
      }
    };
    fetchCountries();
    fetchFactories();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      if (watchCountry) {
        try {
          const selectedCountry = countries.find(c => 
            String(c.countryName || c.name || c).trim().toLowerCase() === String(watchCountry).trim().toLowerCase()
          );
          if (selectedCountry && selectedCountry.countryCode) {
            const citiesData = await getCitiesByCountry(selectedCountry.countryCode);
            setCities(citiesData);
          } else {
            setCities([]);
          }
        } catch (error) {
          console.error('Error loading cities:', error);
        }
      } else {
        setCities([]);
      }
    };
    fetchCities();
  }, [watchCountry, countries]);

  // Keyboard shortcut listener for saving
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  const uppercaseFields = ['name', 'address', 'gstn', 'pan', 'contactPersonName', 'leadTime', 'paymentTerms', 'notes', 'country', 'city', 'bankName', 'branch'];

  const handleControlledChange = (field, value, onChange, isBankDetail = false) => {
    let formattedValue = value;
    
    // Formatting logic
    if (['contactPersonName'].includes(field)) {
      formattedValue = restrictToLetters(formattedValue, true);
    } else if (['contactNumber', 'accountNumber'].includes(field)) {
      formattedValue = restrictToNumbers(formattedValue, true);
    }

    if (typeof formattedValue === 'string' && uppercaseFields.includes(field)) {
      formattedValue = formattedValue.toUpperCase();
    }
    
    onChange(formattedValue);
  };

  const handleProductCategoryChange = (category, currentCategories, onChange) => {
    const categories = currentCategories || [];
    if (categories.includes(category)) {
      onChange(categories.filter((c) => c !== category));
    } else {
      onChange([...categories, category]);
    }
  };

  const onSubmit = async (data) => {
    const dataToSubmit = {
      supplier_name: data.name,
      contact_person_name: data.contactPersonName || null,
      email_id: data.emailId || null,
      contact_number: data.contactNumber || null,
      address: data.address || null,
      city: data.city || null,
      country: data.country,
      product_categories: data.productCategories,
      gstn: data.gstn || null,
      pan: data.pan || null,
      quality_rating: data.qualityRating || null,
      status: data.status,
      notes: data.notes || null,
      website: data.website || null,
      lead_time: data.leadTime || null,
      payment_terms: data.paymentTerms || null,
    };
    
    try {
      await onSave(dataToSubmit);
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const onError = (errors) => {
    setShowErrorModal(true);
    scrollToFirstError();
    showError('Please fill all mandatory fields correctly.');
  };

  const productCategoriesList = [
    'Porcelain Tiles', 'Ceramic Tiles', 'Wall Tiles', 'Floor Tiles', 'Vitrified Tiles',
    'Marble Look Tiles', 'Glazed Vitrified Tiles (GVT / PGVT)', 'Double-Charge Vitrified Tiles',
    'Full-Body Vitrified Tiles', 'Soluble-Salt / Nano-Polished Vitrified Tiles',
    'Porcelain Slabs', 'Mosaic Tile', 'Decorative Tiles', 'Outdoor Tiles', 'Parking Tiles',
    'Sanitaryware', 'Bath Fittings', 'Adhesives & Grouts', 'Step & Riser Tiles', 'Roofing Tiles'
  ];

  const renderInput = (name, label, placeholder, isRequired, isTextarea = false, isEmail = false) => (
    <Form.Group>
      {isRequired ? (
        <OverlayTrigger placement="top" overlay={<Tooltip>{label} is mandatory.</Tooltip>}>
          <Form.Label className="text-danger" style={{cursor: 'help'}}>
            {label} * <Info size={12} className="ms-1" />
          </Form.Label>
        </OverlayTrigger>
      ) : (
        <Form.Label>{label}</Form.Label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Form.Control className="premium-input"
            as={isTextarea ? 'textarea' : 'input'}
            rows={isTextarea ? 2 : undefined}
            type={isEmail ? 'email' : 'text'}
            {...field}
            onChange={(e) => handleControlledChange(name, e.target.value, field.onChange)}
            isInvalid={!!errors[name]}
            placeholder={placeholder}
          />
        )}
      />
      {errors[name] && <Form.Control.Feedback type="invalid">{errors[name].message}</Form.Control.Feedback>}
    </Form.Group>
  );

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{supplier ? 'Edit Supplier' : 'Create Supplier'} <small className="text-muted ms-2" style={{fontSize: '0.6em'}}>(Press Ctrl+S to save)</small></Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <Form onSubmit={handleSubmit(onSubmit, onError)}>
          <Row className="g-4">
            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Basic Information</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Official registered supplier business name</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>Supplier Factory Name * <Info size={12} className="ms-1" /></Form.Label>
                        </OverlayTrigger>
                        <Controller name="name" control={control} render={({ field }) => (
                          <AddableDropdown
                            value={field.value}
                            onChange={(val) => handleControlledChange('name', val, field.onChange)}
                            options={factories.map(f => typeof f === 'object' ? (f.value || f.name || f.factoryName) : f)}
                            masterDataType="factoryNames"
                            label="Supplier Factory Name"
                            placeholder={FIELD_PLACEHOLDERS?.supplierName?.placeholder || "Enter supplier name"}
                            isInvalid={!!errors.name}
                          />
                        )} />
                        {errors.name && <div className="text-danger small mt-1">{errors.name.message}</div>}
                        <Form.Text className="text-muted">{FIELD_PLACEHOLDERS.supplierName.validation}</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Country is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>Country * <Info size={12} className="ms-1" /></Form.Label>
                        </OverlayTrigger>
                        <Controller name="country" control={control} render={({ field }) => (
                          <AddableDropdown
                            value={field.value}
                            onChange={(val) => { handleControlledChange('country', val, field.onChange); setValue('city', ''); }}
                            options={(Array.isArray(countries) ? countries : []).map(c => String(c.countryName || c.name || c).toUpperCase())}
                            masterDataType="countries"
                            label="Country"
                            placeholder="Select Country"
                            isInvalid={!!errors.country}
                          />
                        )} />
                        {errors.country && <div className="text-danger small mt-1">{errors.country.message}</div>}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>City is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>City * <Info size={12} className="ms-1" /></Form.Label>
                        </OverlayTrigger>
                        <Controller name="city" control={control} render={({ field }) => (
                          <AddableDropdown
                            value={field.value}
                            onChange={(val) => handleControlledChange('city', val, field.onChange)}
                            options={(Array.isArray(cities) ? cities : []).map(c => String(c.cityName || c.city_name || c.value || c).toUpperCase())}
                            masterDataType="cities"
                            label="City"
                            placeholder="Select City"
                            isInvalid={!!errors.city}
                            disabled={!watchCountry}
                            disableAutoFetch={true}
                            extraBodyData={{ countryCode: countries.find(c => String(c.countryName || c.name || c).trim().toLowerCase() === String(watchCountry).trim().toLowerCase())?.countryCode }}
                          />
                        )} />
                        {errors.city && <div className="text-danger small mt-1">{errors.city.message}</div>}
                      </Form.Group>
                    </Col>
                    <Col md={12}>{renderInput('address', 'Address', FIELD_PLACEHOLDERS.address.placeholder, true, true)}</Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Status</Form.Label>
                        <Controller name="status" control={control} render={({ field }) => (
                          <Form.Select className="premium-input" {...field}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Blacklisted">Blacklisted</option>
                          </Form.Select>
                        )} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Quality Rating</Form.Label>
                        <Controller name="qualityRating" control={control} render={({ field }) => (
                          <Form.Select className="premium-input" {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}>
                            <option value="">Select Rating</option>
                            <option value="1">1 - Poor</option>
                            <option value="2">2 - Fair</option>
                            <option value="3">3 - Good</option>
                            <option value="4">4 - Very Good</option>
                            <option value="5">5 - Excellent</option>
                          </Form.Select>
                        )} />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Website</Form.Label>
                        <Controller name="website" control={control} render={({ field }) => (
                          <Form.Control className="premium-input" type="url" {...field} placeholder="e.g., https://www.supplier.com" isInvalid={!!errors.website} />
                        )} />
                        {errors.website && <Form.Control.Feedback type="invalid">{errors.website.message}</Form.Control.Feedback>}
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Contact Information</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={12}>{renderInput('contactPersonName', 'Contact Person Name', FIELD_PLACEHOLDERS.contactPersonName.placeholder, true)}</Col>
                    <Col md={6}>{renderInput('emailId', 'Email ID', FIELD_PLACEHOLDERS.emailId.placeholder, true, false, true)}</Col>
                    <Col md={6}>{renderInput('contactNumber', 'Contact Number', FIELD_PLACEHOLDERS.contactNumber.placeholder, true)}</Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>GSTIN</Form.Label>
                        <Controller
                          name="gstn"
                          control={control}
                          render={({ field }) => (
                            <>
                              <div className="d-flex gap-2 align-items-center">
                                <Form.Control 
                                  className="premium-input" 
                                  type="text" 
                                  maxLength={15}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())} 
                                  placeholder="15-digit GSTIN" 
                                  isInvalid={!!errors.gstn}
                                />
                                <Button 
                                  variant="outline-primary" 
                                  onClick={() => validateGstin(field.value)}
                                  disabled={!field.value || field.value.length !== 15 || gstinStatus === 'loading'}
                                >
                                  {gstinStatus === 'loading' ? 'Checking...' : 'Validate'}
                                </Button>
                              </div>
                              {errors.gstn && <Form.Control.Feedback type="invalid">{errors.gstn.message}</Form.Control.Feedback>}
                              {gstinStatus === 'valid' && <div className="text-success small mt-1"><Check size={12} className="me-1" /> Valid GSTIN</div>}
                              {gstinStatus === 'invalid' && <div className="text-danger small mt-1">Invalid GSTIN format</div>}
                            </>
                          )}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>{renderInput('pan', 'PAN', FIELD_PLACEHOLDERS.pan.placeholder, false)}</Col>
                    <Col md={6}>{renderInput('leadTime', 'Lead Time', 'e.g., 15-20 Days', false)}</Col>
                    <Col md={6}>{renderInput('paymentTerms', 'Payment Terms', 'e.g., 30% Advance, 70% LC', false)}</Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Product Categories</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Controller name="productCategories" control={control} render={({ field }) => (
                      <>
                        {productCategoriesList.map((category) => (
                          <Col key={category} xs={12} sm={6} md={4} lg={3} className="mb-2">
                            <Form.Check
                              type="checkbox" id={`category-${category}`} label={category}
                              checked={(field.value || []).includes(category)}
                              onChange={() => handleProductCategoryChange(category, field.value, field.onChange)}
                              className="d-flex align-items-start gap-2"
                            />
                          </Col>
                        ))}
                      </>
                    )} />
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Bank Details</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Bank Name</Form.Label>
                        <Controller name="bankDetails.bankName" control={control} render={({ field }) => (
                          <Form.Control className="premium-input" type="text" {...field} onChange={(e) => handleControlledChange('bankName', e.target.value, field.onChange, true)} placeholder="e.g., HDFC Bank" />
                        )} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Branch</Form.Label>
                        <Controller name="bankDetails.branch" control={control} render={({ field }) => (
                          <Form.Control className="premium-input" type="text" {...field} onChange={(e) => handleControlledChange('branch', e.target.value, field.onChange, true)} placeholder="e.g., Morbi Branch" />
                        )} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Account Number</Form.Label>
                        <Controller name="bankDetails.accountNumber" control={control} render={({ field }) => (
                          <Form.Control className="premium-input" type="text" {...field} onChange={(e) => handleControlledChange('accountNumber', e.target.value, field.onChange, true)} placeholder="Enter account number" maxLength={18} isInvalid={!!errors.bankDetails?.accountNumber} />
                        )} />
                        {errors.bankDetails?.accountNumber && <Form.Control.Feedback type="invalid">{errors.bankDetails.accountNumber.message}</Form.Control.Feedback>}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>IFSC Code</Form.Label>
                        <Controller name="bankDetails.ifscCode" control={control} render={({ field }) => (
                          <Form.Control className="premium-input" type="text" {...field} onChange={(e) => handleControlledChange('ifscCode', e.target.value, field.onChange, true)} placeholder="e.g., HDFC0000123" maxLength={11} isInvalid={!!errors.bankDetails?.ifscCode} />
                        )} />
                        {errors.bankDetails?.ifscCode && <Form.Control.Feedback type="invalid">{errors.bankDetails.ifscCode.message}</Form.Control.Feedback>}
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Performance Metrics</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={3}><div className="text-center p-3 bg-light rounded"><div className="text-muted small mb-2">Total Orders</div><div className="h5 mb-0 text-primary fw-bold">{performanceMetrics.totalOrders}</div></div></Col>
                    <Col md={3}><div className="text-center p-3 bg-light rounded"><div className="text-muted small mb-2">Total Purchase Value</div><div className="h5 mb-0 text-success fw-bold">₹{performanceMetrics.totalPurchaseValue ? performanceMetrics.totalPurchaseValue.toLocaleString('en-IN') : '0'}</div></div></Col>
                    <Col md={3}><div className="text-center p-3 bg-light rounded"><div className="text-muted small mb-2">Last Order Date</div><div className="small mb-0 fw-bold">{performanceMetrics.lastOrderDate || 'No orders yet'}</div></div></Col>
                    <Col md={3}><div className="text-center p-3 bg-light rounded"><div className="text-muted small mb-2">Created Date</div><div className="small mb-0 fw-bold">{performanceMetrics.createdDate}</div></div></Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Additional Notes</h6></Card.Header>
                <Card.Body>
                  <Controller name="notes" control={control} render={({ field }) => (
                    <Form.Control className="premium-input" as="textarea" rows={3} {...field} onChange={(e) => handleControlledChange('notes', e.target.value, field.onChange)} placeholder="Enter any additional notes... (optional)" />
                  )} />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
        <ValidationErrorModal show={showErrorModal} errors={Object.keys(errors).reduce((acc, key) => ({ ...acc, [key]: errors[key]?.message }), {})} onClose={() => setShowErrorModal(false)} title="Supplier Form Validation Error" />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} className="flex-fill flex-sm-grow-0" disabled={isSubmitting}><X size={16} className="me-1" />Cancel</Button>
        <Button variant="primary" onClick={handleSubmit(onSubmit, onError)} className="flex-fill flex-sm-grow-0" disabled={isSubmitting} loading={isSubmitting} loadingText="Saving..." title="Save changes"><Save size={16} className="me-1" />{supplier ? 'Update Supplier' : 'Create Supplier'}</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SupplierForm;


