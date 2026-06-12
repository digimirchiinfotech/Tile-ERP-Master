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
import { Modal, Form, Row, Col, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Save, X, Info, Edit, Check } from 'lucide-react';
import {
  validateCompanyName,
  validateFullName,
  validateEmail,
  validateContactNumber,
  validateCityOrState,
  validateAddress,
  validateGST,
  validatePAN,
  validateIFSC,
  validateAccountNumber
} from '../../utils/validators.js';
import {
  restrictToNumbers,
  restrictToLetters,
} from '../../utils/inputHelpers.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { getAllCountries, getCitiesByCountry, getAllFactories } from '../../services/masterDataService';
import { formatDisplayDate } from '../../utils/formatters.js';
import DynamicDropdown from '../shared/DynamicDropdown.jsx';
import AddableDropdown from '../shared/AddableDropdown.jsx';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { extractValidationErrors } from '../../utils/validationHelper.js';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';

function SupplierForm({ supplier, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    address: '',
    contactPersonName: '',
    emailId: '',
    contactNumber: '',
    gstn: '',
    pan: '',
    productCategories: [],
    qualityRating: null,
    status: 'Active',
    notes: '',
    bankDetails: {
      bankName: '',
      branch: '',
      accountNumber: '',
      ifscCode: '',
    },
    website: '',
    leadTime: '',
    paymentTerms: '',
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalOrders: 0,
    totalPurchaseValue: 0,
    lastOrderDate: null,
    createdDate: null,
  });
  const [errors, setErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [factories, setFactories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
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
        qualityRating: supplier.qualityRating || null,
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
  }, [supplier]);

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
      if (formData.country) {
        try {
          const selectedCountry = countries.find(c => 
            String(c.countryName || c.name || c).trim().toLowerCase() === String(formData.country).trim().toLowerCase()
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
  }, [formData.country, countries]);

  const fieldFilterMap = {
    contactPersonName: (val) => restrictToLetters(val, true),
    contactNumber: (val) => restrictToNumbers(val, true),
  };

  const handleInputChange = (field, value) => {
    let filteredValue = value;
    if (fieldFilterMap[field]) {
      filteredValue = fieldFilterMap[field](value);
    }

    // Auto-uppercase specific fields
    const uppercaseFields = ['name', 'address', 'gstn', 'pan', 'contactPersonName', 'leadTime', 'paymentTerms', 'notes', 'country', 'city'];
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

  const handleBankDetailsChange = (field, value) => {
    let filteredValue = value;
    if (typeof filteredValue === 'string') {
      filteredValue = filteredValue.toUpperCase();
    }
    setFormData((prev) => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: filteredValue,
      },
    }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleProductCategoryChange = (category) => {
    const currentCategories = formData.productCategories || [];
    if (currentCategories.includes(category)) {
      setFormData((prev) => ({
        ...prev,
        productCategories: currentCategories.filter((c) => c !== category),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        productCategories: [...currentCategories, category],
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const nameValidation = validateCompanyName(formData.name);
    if (!nameValidation.isValid) newErrors.name = nameValidation.error;

    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.city) newErrors.city = 'City is required';

    if (!formData.address || !formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else {
      const addressValidation = validateAddress(formData.address);
      if (!addressValidation.isValid) newErrors.address = addressValidation.error;
    }

    if (!formData.emailId || !formData.emailId.trim()) {
      newErrors.emailId = 'Email ID is required';
    } else {
      const emailValidation = validateEmail(formData.emailId);
      if (!emailValidation.isValid) newErrors.emailId = emailValidation.error;
    }

    if (!formData.contactNumber || !formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required';
    } else {
      const phoneValidation = validateContactNumber(formData.contactNumber);
      if (!phoneValidation.isValid) newErrors.contactNumber = phoneValidation.error;
    }

    // GSTN is optional, but if provided, validate format
    if (formData.gstn && formData.gstn.trim()) {
      const gstnValidation = validateGST(formData.gstn);
      if (!gstnValidation.isValid) {
        newErrors.gstn = gstnValidation.error;
      }
    }

    if (!formData.contactPersonName || !formData.contactPersonName.trim()) {
      newErrors.contactPersonName = 'Contact Person Name is required';
    } else {
      const contactPersonValidation = validateFullName(formData.contactPersonName);
      if (!contactPersonValidation.isValid) newErrors.contactPersonName = contactPersonValidation.error;
    }

    if (formData.pan && formData.pan.trim()) {
      const panValidation = validatePAN(formData.pan);
      if (!panValidation.isValid) newErrors.pan = panValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    return (
      (formData.name && formData.name.trim()) &&
      (formData.country && formData.country.trim()) &&
      (formData.city && formData.city.trim()) &&
      (formData.address && formData.address.trim()) &&
      (formData.contactPersonName && formData.contactPersonName.trim()) &&
      (formData.emailId && formData.emailId.trim() && validateEmail(formData.emailId).isValid) &&
      (formData.contactNumber && formData.contactNumber.trim() && validateContactNumber(formData.contactNumber).isValid)
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      setShowErrorModal(true);
      scrollToFirstError();
      showError('Please fill all mandatory fields correctly.');
      return;
    }
    const dataToSubmit = {
      supplier_name: formData.name,
      contact_person_name: formData.contactPersonName || null,
      email_id: formData.emailId || null,
      contact_number: formData.contactNumber || null,
      address: formData.address || null,
      city: formData.city || null,
      country: formData.country,
      product_categories: formData.productCategories,
      gstn: formData.gstn || null,
      pan: formData.pan || null,
      quality_rating: formData.qualityRating || null,
      status: formData.status,
      notes: formData.notes || null,
      website: formData.website || null,
      lead_time: formData.leadTime || null,
      payment_terms: formData.paymentTerms || null,
    };
    
    try {
      setIsSubmitting(true);
      await onSave(dataToSubmit);
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const productCategories = [
    'Porcelain Tiles', 'Ceramic Tiles', 'Wall Tiles', 'Floor Tiles', 'Vitrified Tiles',
    'Marble Look Tiles', 'Glazed Vitrified Tiles (GVT / PGVT)', 'Double-Charge Vitrified Tiles',
    'Full-Body Vitrified Tiles', 'Soluble-Salt / Nano-Polished Vitrified Tiles',
    'Porcelain Slabs', 'Mosaic Tile', 'Decorative Tiles', 'Outdoor Tiles', 'Parking Tiles',
    'Sanitaryware', 'Bath Fittings', 'Adhesives & Grouts', 'Step & Riser Tiles', 'Roofing Tiles'
  ];

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{supplier ? 'Edit Supplier' : 'Create Supplier'}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Basic Information</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Official registered supplier business name</Tooltip>}>
                            <Form.Label className="text-danger" style={{cursor: 'help'}}>
                              Supplier Factory Name * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <AddableDropdown
                          value={formData.name || ''}
                          onChange={(val) => handleInputChange('name', val)}
                          options={factories.map(f => typeof f === 'object' ? (f.value || f.name || f.factoryName) : f)}
                          masterDataType="factoryNames"
                          label="Supplier Factory Name"
                          placeholder={FIELD_PLACEHOLDERS?.supplierName?.placeholder || "Enter supplier name"}
                          isInvalid={!!errors.name}
                        />
                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                        <Form.Text className="text-muted">{FIELD_PLACEHOLDERS.supplierName.validation}</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Country is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Country * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.country}
                          onChange={(val) => {
                            handleInputChange('country', val);
                            handleInputChange('city', '');
                          }}
                          options={(Array.isArray(countries) ? countries : []).map(c => String(c.countryName || c.name || c).toUpperCase())}
                          masterDataType="countries"
                          label="Country"
                          placeholder="Select Country"
                          isInvalid={!!errors.country}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>City is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            City * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <AddableDropdown
                          value={formData.city}
                          onChange={(val) => handleInputChange('city', val)}
                          options={(Array.isArray(cities) ? cities : []).map(c => String(c.cityName || c.city_name || c.value || c).toUpperCase())}
                          masterDataType="cities"
                          label="City"
                          placeholder="Select City"
                          isInvalid={!!errors.city}
                          disabled={!formData.country}
                          disableAutoFetch={true}
                          extraBodyData={{
                            countryCode: countries.find(c => 
                              String(c.countryName || c.name || c).trim().toLowerCase() === String(formData.country).trim().toLowerCase()
                            )?.countryCode
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Address is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Address * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          as="textarea" rows={2}
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          isInvalid={!!errors.address}
                          placeholder={FIELD_PLACEHOLDERS.address.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">{errors.address}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}><Form.Group><Form.Label>Status</Form.Label><Form.Select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Blacklisted">Blacklisted</option></Form.Select></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>Quality Rating</Form.Label><Form.Select value={formData.qualityRating || ''} onChange={(e) => handleInputChange('qualityRating', e.target.value ? parseInt(e.target.value) : null)}><option value="">Select Rating</option><option value="1">1 - Poor</option><option value="2">2 - Fair</option><option value="3">3 - Good</option><option value="4">4 - Very Good</option><option value="5">5 - Excellent</option></Form.Select></Form.Group></Col>
                    <Col md={12}><Form.Group><Form.Label>Website</Form.Label><Form.Control type="url" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} placeholder="e.g., https://www.supplier.com" /></Form.Group></Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Contact Information</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Contact Person Name is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Contact Person Name * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="text" value={formData.contactPersonName}
                          onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                          isInvalid={!!errors.contactPersonName}
                          placeholder={FIELD_PLACEHOLDERS.contactPersonName.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">{errors.contactPersonName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Email ID is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Email ID * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="email" value={formData.emailId}
                          onChange={(e) => handleInputChange('emailId', e.target.value)}
                          isInvalid={!!errors.emailId}
                          placeholder={FIELD_PLACEHOLDERS.emailId.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">{errors.emailId}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Contact Number is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Contact Number * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="tel" value={formData.contactNumber}
                          onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value) {
                              const validation = validateContactNumber(e.target.value);
                              if (!validation.isValid) setErrors(prev => ({ ...prev, contactNumber: validation.error }));
                            }
                          }}
                          isInvalid={!!errors.contactNumber}
                          placeholder={FIELD_PLACEHOLDERS.contactNumber.placeholder}
                          maxLength={15}
                        />
                        <Form.Control.Feedback type="invalid">{errors.contactNumber}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}><Form.Group><Form.Label>GSTN</Form.Label><Form.Control type="text" value={formData.gstn} onChange={(e) => handleInputChange('gstn', e.target.value)} placeholder={FIELD_PLACEHOLDERS.gstn.placeholder} maxLength={15} isInvalid={!!errors.gstn} /><Form.Control.Feedback type="invalid">{errors.gstn}</Form.Control.Feedback></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>PAN</Form.Label><Form.Control type="text" value={formData.pan} onChange={(e) => handleInputChange('pan', e.target.value)} placeholder={FIELD_PLACEHOLDERS.pan.placeholder} maxLength={10} isInvalid={!!errors.pan} /><Form.Control.Feedback type="invalid">{errors.pan}</Form.Control.Feedback></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>Lead Time</Form.Label><Form.Control type="text" value={formData.leadTime} onChange={(e) => handleInputChange('leadTime', e.target.value)} placeholder="e.g., 15-20 Days" /></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>Payment Terms</Form.Label><Form.Control type="text" value={formData.paymentTerms} onChange={(e) => handleInputChange('paymentTerms', e.target.value)} placeholder="e.g., 30% Advance, 70% LC" /></Form.Group></Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Product Categories</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {productCategories.map((category) => (
                      <Col key={category} xs={12} sm={6} md={4} lg={3} className="mb-2">
                        <Form.Check
                          type="checkbox" id={`category-${category}`} label={category}
                          checked={formData.productCategories?.includes(category)}
                          onChange={() => handleProductCategoryChange(category)}
                          className="d-flex align-items-start gap-2"
                        />
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Bank Details</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}><Form.Group><Form.Label>Bank Name</Form.Label><Form.Control type="text" value={formData.bankDetails.bankName} onChange={(e) => handleBankDetailsChange('bankName', e.target.value)} placeholder="e.g., HDFC Bank" /></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>Branch</Form.Label><Form.Control type="text" value={formData.bankDetails.branch} onChange={(e) => handleBankDetailsChange('branch', e.target.value)} placeholder="e.g., Morbi Branch" /></Form.Group></Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Account Number</Form.Label>
                        <Form.Control type="text" value={formData.bankDetails.accountNumber} onChange={(e) => handleBankDetailsChange('accountNumber', restrictToNumbers(e.target.value))} onBlur={(e) => { if(e.target.value) { const val = validateAccountNumber(e.target.value); if(!val.isValid) setErrors(prev => ({...prev, accountNumber: val.error})); } }} isInvalid={!!errors.accountNumber} placeholder="Enter account number" maxLength={18} />
                        <Form.Control.Feedback type="invalid">{errors.accountNumber}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>IFSC Code</Form.Label>
                        <Form.Control type="text" value={formData.bankDetails.ifscCode} onChange={(e) => handleBankDetailsChange('ifscCode', e.target.value)} onBlur={(e) => { if(e.target.value) { const val = validateIFSC(e.target.value); if(!val.isValid) setErrors(prev => ({...prev, ifscCode: val.error})); } }} isInvalid={!!errors.ifscCode} placeholder="e.g., HDFC0000123" maxLength={11} />
                        <Form.Control.Feedback type="invalid">{errors.ifscCode}</Form.Control.Feedback>
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
                  <Form.Control
                    as="textarea" rows={3} value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Enter any additional notes... (optional)"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
        <ValidationErrorModal show={showErrorModal} errors={errors} onClose={() => setShowErrorModal(false)} title="Supplier Form Validation Error" />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} className="flex-fill flex-sm-grow-0" disabled={isSubmitting}><X size={16} className="me-1" />Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} className="flex-fill flex-sm-grow-0" disabled={!isFormValid() || isSubmitting} loading={isSubmitting} loadingText="Saving..." title={!isFormValid() ? "Please fill all required fields (*) to enable" : "Save changes"}><Save size={16} className="me-1" />{supplier ? 'Update Supplier' : 'Create Supplier'}</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SupplierForm;
