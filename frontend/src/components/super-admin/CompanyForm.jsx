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
import { Modal, Form, Button, Row, Col, Card, ProgressBar, Badge, Alert, OverlayTrigger, Tooltip, Accordion } from 'react-bootstrap';
import { Save, X, Building, User, Mail, Phone, Globe, Eye, EyeOff, Check, Info, ChevronRight, ChevronLeft, CreditCard, Layers, ShieldCheck, Edit, Lock } from 'lucide-react';
import {
  validateCompanyName,
  validateFullName,
  validateEmail,
  validateContactNumber,
} from '../../utils/validators.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { getAllCountries, getCitiesByCountry } from '../../services/masterDataService';
import { convertToSnakeCase } from '../../utils/dataTransformers.js';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';

const STEPS = [
  { id: 1, title: 'Company Profile', icon: Building },
  { id: 2, title: 'Modules & Plans', icon: Layers },
  { id: 3, title: 'Admin Setup', icon: ShieldCheck },
];

function CompanyForm({ company, onSave, onCancel, saving = false }) {
  const { subscriptionPlans, fetchPlans } = useSubscriptions();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    contactPersonName: '',
    emailId: '',
    contactNumber: '',
    country: '',
    city: '',
    address: '',
    website: '',
    gstn: '',
    pan: '',
    iecNo: '',
    subscriptionPlan: 'Basic',
    status: 'Active',
    logo: null,
    enabledModules: [],
    adminUsername: '',
    adminPassword: '',
    adminConfirmPassword: '',
    adminEmailId: '',
  });

  const [errors, setErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const industries = [
    'Ceramics Manufacturing', 'Tile Distribution', 'Import/Export', 'Construction',
    'Interior Design', 'Architecture', 'Real Estate', 'Business Services',
  ];

  const AUTO_ENABLED_MODULES = [
    { id: 'reports_analytics', name: 'Reports & Analytics' },
    { id: 'business_intelligence', name: 'Business Intelligence' },
    { id: 'administration', name: 'Administration' },
    { id: 'master_data_management', name: 'Master Data Management' },
    { id: 'sanitaryware_master_data', name: 'Sanitaryware Master Data' }
  ];

  const MODULE_HIERARCHY = [
    {
      id: 'business_management',
      name: 'Business Management',
      subModules: [
        { id: 'user_management', name: 'User Management' },
        { id: 'client_management', name: 'Client Management' },
        { id: 'supplier_management', name: 'Supplier Management' },
        { id: 'lead_management', name: 'Lead Management' },
        { id: 'salesperson_management', name: 'Salesperson Management' },
        { id: 'client_order', name: 'Client Orders' }
      ]
    },
    {
      id: 'product_catalogue',
      name: 'Product & Catalogue',
      subModules: [
        { id: 'product_management', name: 'Tile Products' },
        { id: 'sanitaryware_management', name: 'Sanitaryware Products' },
        { id: 'catalogue_management', name: 'Catalogue Management' }
      ]
    },
    {
      id: 'proforma_management',
      name: 'Proforma Management',
      subModules: [
        { id: 'proforma_invoice', name: 'Proforma Invoices' },
        { id: 'proforma_order', name: 'Proforma Orders' }
      ]
    },
    {
      id: 'operations_qc',
      name: 'Operations & QC',
      subModules: [
        { id: 'order_sheet', name: 'Order Sheet Management' },
        { id: 'qc_management', name: 'QC Management' }
      ]
    },
    {
      id: 'export_management',
      name: 'Export Management',
      subModules: [
        { id: 'export_overview', name: 'Export Overview' },
        { id: 'export_invoice', name: 'Export Invoice' },
        { id: 'igst_invoice', name: 'IGST Invoice Management' },
        { id: 'packing_list', name: 'Packing List Management' },
        { id: 'annexure', name: 'Annexure' },
        { id: 'invoice_backside', name: 'Invoice Backside' },
        { id: 'vgm', name: 'VGM (Verified Gross Mass)' },
        { id: 'shipping_instructions', name: 'Shipping Instructions' }
      ]
    },
    {
      id: 'finance_management',
      name: 'Finance & Management',
      subModules: [
        { id: 'account_finance', name: 'Accounts' },
        { id: 'receivables', name: 'Receivables' },
        { id: 'payables', name: 'Payables' },
        { id: 'expenses', name: 'Expenses' },
        { id: 'financial_dashboard', name: 'Financial Dashboard' }
      ]
    }
  ];

  useEffect(() => {
    fetchPlans();
    if (company) {
      setFormData({
        name: company.name || '',
        industry: company.industry || '',
        contactPersonName: company.contactPersonName || '',
        emailId: company.emailId || '',
        contactNumber: company.contactNumber || '',
        country: company.country || '',
        city: company.city || '',
        address: company.address || '',
        website: company.website || '',
        gstn: company.gstn || '',
        pan: company.pan || '',
        iecNo: company.iecNo || '',
        subscriptionPlan: company.subscriptionPlan || 'Basic',
        status: company.status || 'Active',
        logo: company.logoUrl || null,
        enabledModules: company.enabledModules ? 
          Array.from(new Set([...company.enabledModules, ...AUTO_ENABLED_MODULES.map(m => m.id)])) : 
          AUTO_ENABLED_MODULES.map(m => m.id),
        adminUsername: company.adminUsername || '',
        adminPassword: '',
        adminConfirmPassword: '',
        adminEmailId: company.adminEmailId || '',
        bank_details: company.settings?.bank_details || {
          accountName: '',
          accountNumber: '',
          bankName: '',
          bankAddress: '',
          swiftCode: '',
          ifscCode: ''
        }
      });
    } else {
      setFormData(prev => ({
        ...prev,
        enabledModules: AUTO_ENABLED_MODULES.map(m => m.id)
      }));
    }
  }, [company]);

  useEffect(() => {
    const fetchCountriesData = async () => {
      try {
        const data = await getAllCountries();
        setCountries(data);
      } catch (err) { console.error('Countries fetch failed', err); }
    };
    fetchCountriesData();
  }, []);

  useEffect(() => {
    const fetchCitiesData = async () => {
      if (formData.country) {
        const selectedCountry = countries.find(c => c.countryName === formData.country);
        if (selectedCountry) {
          try {
            const data = await getCitiesByCountry(selectedCountry.countryCode);
            setCities(data);
          } catch (err) { console.error('Cities fetch failed', err); }
        }
      }
    };
    fetchCitiesData();
  }, [formData.country, countries]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'country' ? { city: '' } : {})
    }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleModuleToggle = (moduleId) => {
    if (AUTO_ENABLED_MODULES.find(m => m.id === moduleId)) return; // Prevent toggling auto-enabled
    setFormData(prev => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(moduleId)
        ? prev.enabledModules.filter(id => id !== moduleId)
        : [...prev.enabledModules, moduleId]
    }));
  };

  const handleParentToggle = (parentGroup) => {
    const childIds = parentGroup.subModules.map(m => m.id);
    const allChecked = childIds.every(id => formData.enabledModules.includes(id));
    
    setFormData(prev => {
      let newModules = [...prev.enabledModules];
      if (allChecked) {
        // Deselect all children
        newModules = newModules.filter(id => !childIds.includes(id));
      } else {
        // Select all children
        const toAdd = childIds.filter(id => !newModules.includes(id));
        newModules = [...newModules, ...toAdd];
      }
      return { ...prev, enabledModules: newModules };
    });
  };

  const handleSelectAllModules = () => {
    const allChildIds = MODULE_HIERARCHY.flatMap(group => group.subModules.map(m => m.id));
    const allSelected = allChildIds.every(id => formData.enabledModules.includes(id));
    
    if (allSelected) {
      setFormData(prev => ({ 
        ...prev, 
        enabledModules: AUTO_ENABLED_MODULES.map(m => m.id) 
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        enabledModules: Array.from(new Set([...allChildIds, ...AUTO_ENABLED_MODULES.map(m => m.id)]))
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      const nameVal = validateCompanyName(formData.name);
      if (!nameVal.isValid) newErrors.name = nameVal.error;
      if (!formData.industry) newErrors.industry = 'Industry is required';
      if (!validateFullName(formData.contactPersonName).isValid) newErrors.contactPersonName = 'Valid name required';
      if (!validateEmail(formData.emailId).isValid) newErrors.emailId = 'Valid email required';
      if (!formData.contactNumber) {
        newErrors.contactNumber = 'Phone number is required';
      } else if (!validateContactNumber(formData.contactNumber).isValid) {
        newErrors.contactNumber = validateContactNumber(formData.contactNumber).error || 'Valid phone number required';
      }
      if (!formData.country) newErrors.country = 'Country is required';
    }
    if (step === 3) {
      if (!formData.adminUsername) newErrors.adminUsername = 'Username required';
      if (!validateEmail(formData.adminEmailId).isValid) newErrors.adminEmailId = 'Valid admin email required';
      if (!company && !formData.adminPassword) newErrors.adminPassword = 'Password required';
      if (formData.adminPassword !== formData.adminConfirmPassword) newErrors.adminConfirmPassword = 'Passwords mismatch';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    else {
      setShowErrorModal(true);
      scrollToFirstError();
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (saving) return;
    // Validate all required steps before submitting
    const step1Valid = validateStep(1);
    if (!step1Valid) {
      setCurrentStep(1);
      setShowErrorModal(true);
      scrollToFirstError();
      return;
    }
    const step3Valid = validateStep(3);
    if (!step3Valid) {
      setCurrentStep(3);
      setShowErrorModal(true);
      scrollToFirstError();
      return;
    }
    const data = convertToSnakeCase(formData);
    data.settings = company?.settings || {};
    data.settings.bank_details = formData.bank_details;
    if (!company) {
      data.admin_email = data.admin_email_id;
      data.selected_modules = data.enabled_modules || [];
    }
    onSave(data);
  };

  return (
    <Modal show onHide={onCancel} size="xl" backdrop="static" className="premium-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold d-flex align-items-center">
          <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
            <Building className="text-primary" size={24} />
          </div>
          <div>
            <div className="h4 mb-0">{company ? 'Edit Company Profile' : 'Register New Enterprise'}</div>
            <div className="small text-muted fw-normal">Complete the steps below to {company ? 'update' : 'onboard'} the organization.</div>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Progress Tracker */}
        <div className="step-tracker mb-5 px-lg-5">
          <div className="d-flex justify-content-between position-relative">
            <div className="progress-line" style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }} />
            <div className="progress-bg" />
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div key={step.id} className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="step-circle">
                    {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  <div className="step-label d-none d-md-block">{step.title}</div>
                </div>
              );
            })}
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div className="fade-in">
              <Row className="g-4">
                <Col md={8}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-4">Core Identity</h5>
                      <Row className="g-3">
                        <Col md={12}>
                          <Form.Group>
                            <OverlayTrigger placement="top" overlay={<Tooltip>Legal Company Name is mandatory.</Tooltip>}>
                              <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                                Legal Company Name * <Info size={12} className="ms-1" />
                              </Form.Label>
                            </OverlayTrigger>
                            <Form.Control
                              type="text"
                              className="form-control-lg bg-light-subtle"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              isInvalid={!!errors.name}
                              placeholder="e.g. Acme Ceramics Pvt Ltd"
                            />
                            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <OverlayTrigger placement="top" overlay={<Tooltip>Industry Segment is mandatory.</Tooltip>}>
                              <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                                Industry Segment * <Info size={12} className="ms-1" />
                              </Form.Label>
                            </OverlayTrigger>
                            <Form.Select
                              className="form-control-lg bg-light-subtle"
                              value={formData.industry}
                              onChange={(e) => handleInputChange('industry', e.target.value)}
                              isInvalid={!!errors.industry}
                            >
                              <option value="">Select Segment</option>
                              {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">Website URL</Form.Label>
                            <Form.Control
                              type="text"
                              className="form-control-lg bg-light-subtle"
                              value={formData.website}
                              onChange={(e) => handleInputChange('website', e.target.value)}
                              placeholder="www.company.com"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">GSTN / Tax ID</Form.Label>
                            <Form.Control
                              type="text"
                              className="form-control-lg bg-light-subtle"
                              value={formData.gstn}
                              onChange={(e) => handleInputChange('gstn', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">IEC Number</Form.Label>
                            <Form.Control
                              type="text"
                              className="form-control-lg bg-light-subtle"
                              value={formData.iecNo}
                              onChange={(e) => handleInputChange('iecNo', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <hr className="my-4" />
                      <h5 className="fw-bold mb-4">Bank Account Details (Live Data)</h5>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">Account Name</Form.Label>
                            <Form.Control
                              type="text"
                              className="bg-light-subtle"
                              value={formData.bank_details?.accountName || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, accountName: e.target.value }
                              })}
                              placeholder="e.g. Acme Ceramics Pvt Ltd"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">Account Number</Form.Label>
                            <Form.Control
                              type="text"
                              className="bg-light-subtle"
                              value={formData.bank_details?.accountNumber || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, accountNumber: e.target.value }
                              })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">Bank Name</Form.Label>
                            <Form.Control
                              type="text"
                              className="bg-light-subtle"
                              value={formData.bank_details?.bankName || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, bankName: e.target.value }
                              })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">IFSC Code / Branch Code</Form.Label>
                            <Form.Control
                              type="text"
                              className="bg-light-subtle"
                              value={formData.bank_details?.ifscCode || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, ifscCode: e.target.value }
                              })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">SWIFT Code</Form.Label>
                            <Form.Control
                              type="text"
                              className="bg-light-subtle"
                              value={formData.bank_details?.swiftCode || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, swiftCode: e.target.value }
                              })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">Bank Address</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              className="bg-light-subtle"
                              value={formData.bank_details?.bankAddress || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, bankAddress: e.target.value }
                              })}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-4">Contact Details</h5>
                      <div className="mb-3">
                        <OverlayTrigger placement="top" overlay={<Tooltip>Contact Person is mandatory.</Tooltip>}>
                          <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                            Contact Person * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          value={formData.contactPersonName}
                          onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                          className="bg-light-subtle"
                          isInvalid={!!errors.contactPersonName}
                        />
                        <Form.Control.Feedback type="invalid">{errors.contactPersonName}</Form.Control.Feedback>
                      </div>
                      <div className="mb-3">
                        <OverlayTrigger placement="top" overlay={<Tooltip>Email Address is mandatory.</Tooltip>}>
                          <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                            Email Address * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="email"
                          value={formData.emailId}
                          onChange={(e) => handleInputChange('emailId', e.target.value)}
                          className="bg-light-subtle"
                          isInvalid={!!errors.emailId}
                        />
                        <Form.Control.Feedback type="invalid">{errors.emailId}</Form.Control.Feedback>
                      </div>
                      <div className="mb-3">
                        <OverlayTrigger placement="top" overlay={<Tooltip>Phone Number is mandatory.</Tooltip>}>
                          <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                            Phone Number * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="tel"
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                          className="bg-light-subtle"
                          isInvalid={!!errors.contactNumber}
                        />
                        <Form.Control.Feedback type="invalid">{errors.contactNumber}</Form.Control.Feedback>
                      </div>
                      <hr className="my-4" />
                      <div className="mb-3">
                        <OverlayTrigger placement="top" overlay={<Tooltip>Country is mandatory.</Tooltip>}>
                          <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                            Country * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Select
                          value={formData.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className="bg-light-subtle"
                          isInvalid={!!errors.country}
                        >
                          <option value="">Select Country</option>
                          {(countries || []).map(c => <option key={c.id} value={c.countryName}>{c.countryName}</option>)}
                        </Form.Select>
                      </div>
                      <div className="mb-0">
                        <Form.Label className="small fw-bold text-muted">City</Form.Label>
                        <Form.Select
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="bg-light-subtle"
                          disabled={!formData.country}
                        >
                          <option value="">Select City</option>
                          {(cities || []).map(c => <option key={c.id} value={c.cityName}>{c.cityName}</option>)}
                        </Form.Select>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {currentStep === 2 && (
            <div className="fade-in">
              <Row className="g-4">
                <Col md={12}>
                  <h5 className="fw-bold mb-3 d-flex align-items-center">
                    <CreditCard className="me-2 text-primary" size={20} />
                    Select Subscription Plan
                  </h5>
                  <Row className="g-3 mb-5">
                    {subscriptionPlans.map(plan => (
                      <Col key={plan.id} md={3}>
                        <div
                          className={`plan-card p-4 rounded-4 border-2 cursor-pointer transition-all h-100 ${formData.subscriptionPlan === plan.name ? 'border-primary bg-primary text-white shadow-lg' : 'border-light-subtle bg-white text-dark'
                            }`}
                          onClick={() => handleInputChange('subscriptionPlan', plan.name)}
                          style={{ transform: formData.subscriptionPlan === plan.name ? 'scale(1.02)' : 'scale(1)' }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <Badge
                              bg={formData.subscriptionPlan === plan.name ? 'light' : 'primary'}
                              text={formData.subscriptionPlan === plan.name ? 'primary' : 'white'}
                              className="px-3 py-2 rounded-pill fw-bold"
                            >
                              {plan.name}
                            </Badge>
                            {formData.subscriptionPlan === plan.name && <Check className="text-white" size={24} strokeWidth={3} />}
                          </div>
                          <div className={`h3 fw-bold mb-1 ${formData.subscriptionPlan === plan.name ? 'text-white' : 'text-primary'}`}>
                            ₹{plan.price}<small className={`${formData.subscriptionPlan === plan.name ? 'text-white-50' : 'text-muted'} fs-6`}>/mo</small>
                          </div>
                          <div className={`small ${formData.subscriptionPlan === plan.name ? 'text-white-50' : 'text-muted'}`}>
                            {plan.duration} {plan.durationType} validity
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 d-flex align-items-center">
                      <Layers className="me-2 text-primary" size={20} />
                      Enable Operational Modules
                    </h5>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={handleSelectAllModules}
                      className="fw-bold px-3 rounded-pill"
                    >
                      {MODULE_HIERARCHY.flatMap(g => g.subModules.map(m => m.id)).every(id => formData.enabledModules.includes(id)) ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <Row>
                    <Col md={8}>
                      <Accordion alwaysOpen>
                        {MODULE_HIERARCHY.map((group, index) => {
                          const childIds = group.subModules.map(m => m.id);
                          const selectedCount = childIds.filter(id => formData.enabledModules.includes(id)).length;
                          const allChecked = selectedCount === childIds.length && childIds.length > 0;
                          const someChecked = selectedCount > 0 && selectedCount < childIds.length;

                          return (
                            <Accordion.Item eventKey={index.toString()} key={group.id} className="mb-3 border rounded-3 overflow-hidden shadow-sm">
                              <Accordion.Header className="module-accordion-header bg-light">
                                <div className="d-flex align-items-center w-100" onClick={(e) => e.stopPropagation()}>
                                  <Form.Check 
                                    type="checkbox"
                                    id={`parent-${group.id}`}
                                    className="me-3 custom-checkbox"
                                    checked={allChecked}
                                    ref={el => { if (el) el.indeterminate = someChecked; }}
                                    onChange={() => handleParentToggle(group)}
                                  />
                                  <span className="fw-bold text-dark">{group.name}</span>
                                  <Badge bg={selectedCount > 0 ? "primary" : "secondary"} className="ms-2 rounded-pill">
                                    {selectedCount} / {childIds.length}
                                  </Badge>
                                </div>
                              </Accordion.Header>
                              <Accordion.Body className="p-0 border-top bg-white">
                                <div className="list-group list-group-flush">
                                  {group.subModules.map(subModule => {
                                    const isEnabled = formData.enabledModules.includes(subModule.id);
                                    return (
                                      <label key={subModule.id} className={`list-group-item list-group-item-action d-flex align-items-center px-4 py-3 cursor-pointer ${isEnabled ? 'bg-primary-subtle' : ''}`}>
                                        <Form.Check 
                                          type="checkbox"
                                          id={`child-${subModule.id}`}
                                          className="me-3 custom-checkbox"
                                          checked={isEnabled}
                                          onChange={() => handleModuleToggle(subModule.id)}
                                        />
                                        <div>
                                          <div className={`fw-semibold ${isEnabled ? 'text-primary' : 'text-dark'}`}>{subModule.name}</div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </Accordion.Body>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion>
                    </Col>
                    <Col md={4}>
                      <div className="bg-light rounded-4 p-4 border h-100">
                        <h6 className="fw-bold mb-3 d-flex align-items-center text-secondary">
                          <Lock size={16} className="me-2" />
                          Core System Modules
                        </h6>
                        <div className="d-flex flex-column gap-2">
                          {AUTO_ENABLED_MODULES.map(module => (
                            <div key={module.id} className="bg-white p-3 rounded-3 border d-flex justify-content-between align-items-center shadow-sm">
                              <div>
                                <div className="fw-bold text-dark mb-1" style={{fontSize: '0.9rem'}}>{module.name}</div>
                                <div className="d-flex align-items-center text-success small fw-semibold">
                                  <Lock size={12} className="me-1" />
                                  Enabled by Default
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </div>
          )}

          {currentStep === 3 && (
            <div className="fade-in">
              <Row className="justify-content-center">
                <Col md={8}>
                  <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="bg-primary p-4 text-white">
                      <h4 className="fw-bold mb-1 d-flex align-items-center text-white">
                        <ShieldCheck className="me-2 text-white" size={24} />
                        Security & Administrator Configuration
                      </h4>
                      <p className="mb-0 text-white opacity-75">Define the primary administrative account for this organization.</p>
                    </div>
                    <Card.Body className="p-5">
                      <Row className="g-4">
                        <Col md={6}>
                          <Form.Group>
                            <OverlayTrigger placement="top" overlay={<Tooltip>Admin Username is mandatory.</Tooltip>}>
                              <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                                Admin Username * <Info size={12} className="ms-1" />
                              </Form.Label>
                            </OverlayTrigger>
                            <Form.Control
                              className="form-control-lg bg-light"
                              value={formData.adminUsername}
                              onChange={(e) => handleInputChange('adminUsername', e.target.value)}
                              isInvalid={!!errors.adminUsername}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <OverlayTrigger placement="top" overlay={<Tooltip>Admin Primary Email is mandatory.</Tooltip>}>
                              <Form.Label className="small fw-bold text-danger" style={{cursor: 'help'}}>
                                Admin Primary Email * <Info size={12} className="ms-1" />
                              </Form.Label>
                            </OverlayTrigger>
                            <Form.Control
                              type="email"
                              className="form-control-lg bg-light"
                              value={formData.adminEmailId}
                              onChange={(e) => handleInputChange('adminEmailId', e.target.value)}
                              isInvalid={!!errors.adminEmailId}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">Security Password {!company && '*'}</Form.Label>
                            <div className="position-relative">
                              <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                className="form-control-lg bg-light"
                                value={formData.adminPassword}
                                onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                                isInvalid={!!errors.adminPassword}
                              />
                              <button
                                type="button"
                                className="btn position-absolute end-0 top-50 translate-middle-y"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff size={20} className="text-muted" /> : <Eye size={20} className="text-muted" />}
                              </button>
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted">Confirm Security Password</Form.Label>
                            <div className="position-relative">
                              <Form.Control
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-control-lg bg-light"
                                value={formData.adminConfirmPassword}
                                onChange={(e) => handleInputChange('adminConfirmPassword', e.target.value)}
                                isInvalid={!!errors.adminConfirmPassword}
                              />
                              <button
                                type="button"
                                className="btn position-absolute end-0 top-50 translate-middle-y"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff size={20} className="text-muted" /> : <Eye size={20} className="text-muted" />}
                              </button>
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Alert variant="info" className="border-0 rounded-3 mb-0">
                            <div className="small fw-bold">Note:</div>
                            <div className="small">This user will have full administrative control over the company tenant, including billing and user management.</div>
                          </Alert>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer className="border-0 p-4 pt-0">
        <Button variant="link" className="text-muted text-decoration-none" onClick={onCancel}>
          Cancel
        </Button>
        <div className="ms-auto d-flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline-primary" className="px-4 py-2 fw-bold" onClick={prevStep}>
              <ChevronLeft size={18} className="me-1" /> Previous
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button variant="primary" className="px-4 py-2 fw-bold" onClick={nextStep}>
              Next Step <ChevronRight size={18} className="ms-1" />
            </Button>
          ) : (
            <Button variant="success" className="px-5 py-2 fw-bold" onClick={handleSubmit} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" role="status" />{company ? 'Updating...' : 'Registering...'}</> : <><Save size={18} className="me-2" />{company ? 'Update Organization' : 'Complete Registration'}</>}
            </Button>
          )}
        </div>
      </Modal.Footer>

      <ValidationErrorModal
        show={showErrorModal}
        errors={errors}
        onClose={() => setShowErrorModal(false)}
        title="Input Validation Failed"
      />

      <style>{`
        .premium-modal .modal-content {
          border-radius: 24px;
          border: none;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .step-tracker {
          position: relative;
        }
        .progress-bg {
          position: absolute;
          top: 18px;
          left: 0;
          right: 0;
          height: 4px;
          background: #e2e8f0;
          z-index: 1;
        }
        .progress-line {
          position: absolute;
          top: 18px;
          left: 0;
          height: 4px;
          background: #0d6efd;
          z-index: 2;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .step-item {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.3s ease;
        }
        .step-item.active .step-circle {
          background: #0d6efd;
          border-color: #0d6efd;
          color: #fff;
          box-shadow: 0 0 0 5px rgba(13, 110, 253, 0.15);
        }
        .step-item.completed .step-circle {
          background: #198754;
          border-color: #198754;
          color: #fff;
        }
        .step-label {
          margin-top: 8px;
          font-weight: 600;
          color: #64748b;
          font-size: 0.9rem;
        }
        .step-item.active .step-label {
          color: #0d6efd;
          font-weight: 700;
        }
        .step-item.completed .step-label {
          color: #198754;
        }
        .module-accordion-header button {
          background-color: transparent !important;
          box-shadow: none !important;
          padding: 1rem 1.25rem;
        }
        .module-accordion-header button:not(.collapsed) {
          color: inherit;
        }
        .custom-checkbox .form-check-input {
          width: 1.25rem;
          height: 1.25rem;
          margin-top: 0;
          cursor: pointer;
        }
        .bg-primary-subtle {
          background-color: rgba(13, 110, 253, 0.05) !important;
        }
        .plan-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bg-light-subtle {
          background-color: #f8fafc !important;
        }
      `}</style>
    </Modal>
  );
}

export default CompanyForm;




