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
  validateCompanyName,
  validateEmail,
  validateContactNumber,
  validateAddress,
  validateURL,
  validateCityOrState,
  validateFullName
} from '../../utils/validators.js';
import {
  restrictToNumbers,
  restrictToLetters,
  restrictToDecimal,
  getValidationError,
  sanitizeEmail
} from '../../utils/inputHelpers.js';
import { Modal, Form, Row, Col, Alert, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { businessTypes, ports, currencies, DEFAULT_PORT_OF_LOADING, DEFAULT_CURRENCY, autoFillFinalDestination } from '../../utils/clientConfig.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { getAllCountries, getCitiesByCountry, getAllPorts, getAllCurrencies, getPortsOfDischarge, getPortsOfLoading, getAllFinalDestinations } from '../../services/masterDataService';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { extractValidationErrors } from '../../utils/validationHelper.js';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import DynamicDropdown from '../shared/DynamicDropdown.jsx';
import AddableDropdown from '../shared/AddableDropdown.jsx';
import api from '../../services/api.js';

import { Save, X, Info, Edit } from 'lucide-react';

function ClientForm({ client, onSave, onCancel, salespersons = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    emailId: '',
    contactNumber: '',
    address: '',
    consigneeDetails: '',
    buyerDetails: '',
    status: 'Active',
    assignedSales: '',
    contactPersonName: '',
    businessType: '',
    creditLimit: 0,
    creditDays: 0,
    notes: '',
    portOfLoading: '',
    portOfDischarge: '',
    finalDestination: '',
    currency: '',
  });
  const [errors, setErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [portOptions, setPortOptions] = useState([]);
  const [loadingPortOptions, setLoadingPortOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [finalDestinationOptions, setFinalDestinationOptions] = useState([]);
  const [salesStaff, setSalesStaff] = useState(salespersons || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (salespersons && salespersons.length > 0) {
      setSalesStaff(salespersons);
    }
  }, [salespersons]);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.clientName || '',
        country: client.country || '',
        city: client.city || '',
        emailId: client.emailId || '',
        contactNumber: client.contactNumber || '',
        address: client.address || '',
        consigneeDetails: client.consigneeDetails || '',
        buyerDetails: client.buyerDetails || '',
        status: client.status || 'Active',
        assignedSales: client.assignedSalesperson || '',
        contactPersonName: client.contactPersonName || '',
        businessType: client.businessType || '',
        creditLimit: client.creditLimit || client.credit_limit || 0,
        creditDays: client.creditDays || client.credit_days || 0,
        notes: client.notes || '',
        portOfLoading: client.portOfLoading || '',
        portOfDischarge: client.portOfDischarge || '',
        finalDestination: client.finalDestination || '',
        currency: client.currency || '',
      });
    }
  }, [client]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const countriesData = await getAllCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    fetchCountries();
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

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [portsData, polData, currenciesData, finalDestData] = await Promise.all([
          getPortsOfDischarge(),
          getPortsOfLoading(),
          getAllCurrencies(),
          getAllFinalDestinations()
        ]);

        const podList = Array.isArray(portsData)
          ? portsData.map(p => p.value || p.portName || p.name || p)
          : [];
        const polList = Array.isArray(polData)
          ? polData.map(p => p.value || p.portName || p.name || p)
          : [];
        const currenciesList = Array.isArray(currenciesData)
          ? currenciesData.map(c => c.value || c.code || (typeof c === 'string' ? c : ''))
          : [];

        setPortOptions(podList.length > 0 ? podList : ports);
        setLoadingPortOptions(polList.length > 0 ? polList : []);

        const fallbackCurrencies = Array.isArray(currencies)
          ? currencies.map(c => typeof c === 'string' ? c : (c.code || ''))
          : [];

        setCurrencyOptions(currenciesList.length > 0 ? currenciesList : fallbackCurrencies);

        const destList = Array.isArray(finalDestData)
          ? finalDestData.map(d => d.value || d.destination || (typeof d === 'string' ? d : ''))
          : [];
        setFinalDestinationOptions(destList);
      } catch (error) {
        console.error('[ClientForm] Error loading master data:', error);
        setPortOptions(ports);
        setLoadingPortOptions([]);

        const fallbackCurrencies = Array.isArray(currencies)
          ? currencies.map(c => typeof c === 'string' ? c : (c.code || ''))
          : [];
        setCurrencyOptions(fallbackCurrencies);
      }
    };
    fetchMasterData();
  }, []);

  const fieldFilterMap = {
    name: (val) => restrictToLetters(val, true),
    contactPersonName: (val) => restrictToLetters(val, true),
    contactNumber: (val) => restrictToNumbers(val, true),
  };

  const handleInputChange = (field, value) => {
    let filteredValue = value;
    if (fieldFilterMap[field]) {
      filteredValue = fieldFilterMap[field](value);
    }

    // Auto-uppercase specific fields
    const uppercaseFields = ['name', 'contactPersonName', 'address', 'consigneeDetails', 'buyerDetails', 'country', 'city'];
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

  const validateForm = () => {
    const newErrors = {};
    const nameValidation = validateCompanyName(formData.name);
    if (!nameValidation.isValid) newErrors.name = nameValidation.error;
    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.city) newErrors.city = 'City is required';
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
    if (!formData.businessType) newErrors.businessType = 'Business Type is required';
    if (!formData.address || !formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else {
      const addressValidation = validateAddress(formData.address);
      if (!addressValidation.isValid) newErrors.address = addressValidation.error;
    }
    if (!formData.contactPersonName || !formData.contactPersonName.trim()) {
      newErrors.contactPersonName = 'Contact Person Name is required';
    } else {
      const contactPersonValidation = validateFullName(formData.contactPersonName);
      if (!contactPersonValidation.isValid) newErrors.contactPersonName = contactPersonValidation.error;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPort = async (newPort) => {
    try {
      await api.post('/master-data/portsOfDischarge', { value: newPort, portName: newPort, name: newPort });
      setPortOptions((prev) => [...prev, newPort]);
      showSuccess(`Port "${newPort}" added successfully`);
    } catch (error) {
      console.error('Error adding port of discharge:', error);
      showError(error.response?.data?.message || 'Failed to add port of discharge');
    }
  };

  const handleAddLoadingPort = async (newPort) => {
    try {
      await api.post('/master-data/portsOfLoading', { value: newPort, portName: newPort, name: newPort });
      setLoadingPortOptions((prev) => [...prev, newPort]);
      showSuccess(`Loading port "${newPort}" added successfully`);
    } catch (error) {
      console.error('Error adding port of loading:', error);
      showError(error.response?.data?.message || 'Failed to add port of loading');
    }
  };

  const isFormValid = () => {
    return formData.name &&
      formData.country &&
      formData.city &&
      formData.emailId &&
      formData.contactNumber &&
      formData.businessType &&
      formData.address &&
      formData.contactPersonName;
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
      client_name: formData.name,
      country: formData.country,
      city: formData.city || null,
      email_id: formData.emailId || null,
      contact_number: formData.contactNumber || null,
      address: formData.address || null,
      consignee_details: formData.consigneeDetails || null,
      buyer_details: formData.buyerDetails || null,
      status: formData.status,
      assigned_salesperson: formData.assignedSales || null,
      contact_person_name: formData.contactPersonName || null,
      business_type: formData.businessType || null,
      credit_limit: formData.creditLimit || 0,
      credit_days: formData.creditDays || 0,
      notes: formData.notes || null,
      port_of_loading: formData.portOfLoading || null,
      port_of_discharge: formData.portOfDischarge || null,
      final_destination: formData.finalDestination || null,
      currency: formData.currency || 'INR',
    };
    
    try {
      setIsSubmitting(true);
      await onSave(dataToSubmit);
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{client ? 'Edit Client' : 'Create Client'}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Basic Information</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Official registered business name</Tooltip>}>
                            <Form.Label className="text-danger" style={{cursor: 'help'}}>
                              Client Firm Name * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <Form.Control type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} isInvalid={!!errors.name} placeholder={FIELD_PLACEHOLDERS.clientName.placeholder} />
                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Contact Person Name is mandatory.</Tooltip>}>
                            <Form.Label className="text-danger" style={{cursor: 'help'}}>
                              Contact Person Name * <Info size={12} className="ms-1" />
                            </Form.Label>
                          </OverlayTrigger>
                        <Form.Control type="text" value={formData.contactPersonName} onChange={(e) => handleInputChange('contactPersonName', e.target.value)} isInvalid={!!errors.contactPersonName} placeholder={FIELD_PLACEHOLDERS.contactPersonName.placeholder} />
                        <Form.Control.Feedback type="invalid">{errors.contactPersonName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
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
                    <Col xs={12}>
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
                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Email ID is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Email ID * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control type="email" value={formData.emailId} onChange={(e) => handleInputChange('emailId', e.target.value)} isInvalid={!!errors.emailId} placeholder={FIELD_PLACEHOLDERS.emailId.placeholder} />
                        <Form.Control.Feedback type="invalid">{errors.emailId}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Contact Number is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Contact Number * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control type="tel" value={formData.contactNumber} onChange={(e) => handleInputChange('contactNumber', e.target.value)} isInvalid={!!errors.contactNumber} placeholder={FIELD_PLACEHOLDERS.contactNumber.placeholder} />
                        <Form.Control.Feedback type="invalid">{errors.contactNumber}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Business Type is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Business Type * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Select value={formData.businessType} onChange={(e) => handleInputChange('businessType', e.target.value)} isInvalid={!!errors.businessType}>
                          <option value="">Select Business Type</option>
                          {businessTypes.map((type) => (<option key={type} value={type}>{type}</option>))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.businessType}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Assigned Salesperson</Form.Label>
                        <Form.Select
                          value={formData.assignedSales}
                          onChange={(e) => handleInputChange('assignedSales', e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {salesStaff.filter(staff => staff.status !== 'Inactive' || staff.id === formData.assignedSales).map((staff) => (
                            <option key={staff.id} value={staff.id}>{staff.name || staff.email}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Address is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Address * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control as="textarea" rows={3} value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} isInvalid={!!errors.address} placeholder={FIELD_PLACEHOLDERS.address.placeholder} />
                        <Form.Control.Feedback type="invalid">{errors.address}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}><Form.Group><Form.Label>Consignee Details</Form.Label><Form.Control as="textarea" rows={3} value={formData.consigneeDetails} onChange={(e) => handleInputChange('consigneeDetails', e.target.value)} placeholder="e.g., Shipping address" /></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>Buyer Details</Form.Label><Form.Control as="textarea" rows={3} value={formData.buyerDetails} onChange={(e) => handleInputChange('buyerDetails', e.target.value)} placeholder="e.g., Billing address" /></Form.Group></Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Financial & Additional Details</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Credit Limit</Form.Label>
                        <Form.Control type="number" min="0" step="0.01" value={formData.creditLimit} onChange={(e) => handleInputChange('creditLimit', e.target.value)} placeholder="0.00" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Credit Days</Form.Label>
                        <Form.Control type="number" min="0" value={formData.creditDays} onChange={(e) => handleInputChange('creditDays', e.target.value)} placeholder="0" />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Notes</Form.Label>
                        <Form.Control as="textarea" rows={2} value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Additional notes about the client" />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header><h6 className="mb-0 text-primary">Shipping Information</h6></Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Port of Loading</Form.Label>
                        <AddableDropdown
                          value={formData.portOfLoading}
                          onChange={(val) => handleInputChange('portOfLoading', val)}
                          masterDataType="portsOfLoading"
                          label="Port of Loading"
                          placeholder="Select Port"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Port of Discharge</Form.Label>
                        <AddableDropdown
                          value={formData.portOfDischarge}
                          onChange={(val) => handleInputChange('portOfDischarge', val)}
                          masterDataType="portsOfDischarge"
                          label="Port of Discharge"
                          placeholder="Select Port"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Final Destination</Form.Label>
                        <AddableDropdown
                          value={formData.finalDestination}
                          onChange={(val) => handleInputChange('finalDestination', val)}
                          masterDataType="finalDestinations"
                          label="Final Destination"
                          placeholder="Select Destination"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Currency</Form.Label>
                        <AddableDropdown
                          value={formData.currency}
                          onChange={(val) => handleInputChange('currency', val)}
                          masterDataType="currencies"
                          label="Currency"
                          placeholder="Select Currency"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
        <ValidationErrorModal show={showErrorModal} errors={errors} onClose={() => setShowErrorModal(false)} title="Client Form Validation Error" />
      </Modal.Body>
      <Modal.Footer className="border-top p-3">
        <Button variant="secondary" onClick={onCancel} className="flex-fill flex-sm-grow-0" disabled={isSubmitting}><X size={16} className="me-1" />Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} className="flex-fill flex-sm-grow-0" disabled={isSubmitting} loading={isSubmitting} loadingText="Saving..." title="Save changes"><Save size={16} className="me-1" />{client ? 'Update Client' : 'Create Client'}</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ClientForm;
