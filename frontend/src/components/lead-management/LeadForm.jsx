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
  Table,
  Badge,
  Tabs,
  Tab,
} from 'react-bootstrap';
import { Save, X, Plus, Trash2, Package, Calculator, Edit } from 'lucide-react';
import ProductLineTable from '../shared/ProductLineTable.jsx';
import SanitarywareProductLineTable from '../shared/SanitarywareProductLineTable.jsx';
import sanitarywareProductService from '../../services/sanitarywareProductService.js';
import { useProducts } from '../../hooks/useProducts';
import { useClients } from '../../hooks/useClients';
import {
  validateFullName,
  validateCompanyName,
  validateEmail,
  validateContactNumber
} from '../../utils/validators.js';
import {
  restrictToNumbers,
  restrictToLetters,
  restrictToDecimal,
} from '../../utils/inputHelpers.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { getAllCountries, getCitiesByCountry } from '../../services/masterDataService';
import AddableDropdown from '../shared/AddableDropdown.jsx';

function LeadForm({ lead, onSave, onCancel, salespersons = [], clients: propsClients = [] }) {
  const { products } = useProducts();
  const { clients: hookClients } = useClients();
  const clients = propsClients.length > 0 ? propsClients : hookClients;
  const [formData, setFormData] = useState({
    companyName: '',
    clientName: '',
    contactNumber: '',
    emailId: '',
    country: '',
    city: '',
    address: '',
    source: '',
    priority: 'Medium',
    salesPerson: '',
    status: 'New',
    expectedCloseDate: '',
    leadValue: 0,
    productInterests: [],
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [selectedClient, setSelectedClient] = useState('');
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [sanitarywareProducts, setSanitarywareProducts] = useState([]);
  const [activeProductTab, setActiveProductTab] = useState('tiles');

  useEffect(() => {
    const fetchSWProducts = async () => {
      try {
        const sw = await sanitarywareProductService.getProducts();
        setSanitarywareProducts(sw || []);
      } catch (err) {
        console.error('Failed to fetch sanitaryware products:', err);
      }
    };
    fetchSWProducts();
  }, []);

  const leadSources = [
    'Website',
    'Trade Show',
    'Referral',
    'Cold Call',
    'Social Media',
    'Email Campaign',
    'Partner',
  ];
  const priorities = ['High', 'Medium', 'Low'];
  const statuses = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal Sent',
    'Negotiation',
    'Won',
    'Lost',
  ];

  useEffect(() => {
    if (lead) {
      const normalizedProductInterests = Array.isArray(lead.productInterests)
        ? lead.productInterests.map(product => ({
          ...product,
          quantity: parseFloat(product.quantity) || 0,
          unitPrice: parseFloat(product.unitPrice) || 0,
          totalValue: parseFloat(product.totalValue) || 0,
        }))
        : [];

      // Sanitize nulls to empty strings for controlled inputs
      const safeLead = { ...lead };
      Object.keys(safeLead).forEach(k => { if (safeLead[k] === null) safeLead[k] = ''; });

      setFormData({
        companyName: safeLead.companyName || '',
        clientName: safeLead.clientName || '',
        contactNumber: safeLead.contactNumber || '',
        emailId: safeLead.emailId || '',
        country: safeLead.country || '',
        city: safeLead.city || '',
        address: safeLead.address || '',
        source: safeLead.source || '',
        priority: safeLead.priority || 'Medium',
        salesPerson: safeLead.salesPerson || safeLead.assignedTo || '',
        status: safeLead.status || 'New',
        expectedCloseDate: safeLead.expectedCloseDate || '',
        leadValue: parseFloat(safeLead.leadValue) || 0,
        productInterests: normalizedProductInterests,
        notes: safeLead.notes || '',
      });

      // Bind the select client dropdown to lead.client_id or clientName fallback match
      if (safeLead.client_id) {
        setSelectedClient(safeLead.client_id);
      } else if (clients && clients.length > 0) {
        const matchingClient = clients.find(c => 
          c.clientName && safeLead.companyName &&
          c.clientName.trim().toLowerCase() === safeLead.companyName.trim().toLowerCase()
        );
        if (matchingClient) {
          setSelectedClient(matchingClient.id);
        } else {
          setSelectedClient('');
        }
      }
    }
  }, [lead, clients]);

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
          const selectedCountry = countries.find(c => c.countryName === formData.country);
          if (selectedCountry) {
            const citiesData = await getCitiesByCountry(selectedCountry.countryCode);
            setCities(citiesData);
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

  // Field-type mapping for real-time input filtering
  const fieldFilterMap = {
    // Name fields - letters and spaces only
    companyName: (val) => restrictToLetters(val, true),
    clientName: (val) => restrictToLetters(val, true),

    // Phone fields - numbers only
    contactNumber: (val) => restrictToNumbers(val, true),

    // Decimal fields
    leadValue: (val) => restrictToDecimal(val, 2),

    // Other fields - no filtering needed
  };

  const handleInputChange = (field, value) => {
    // Apply field-specific filtering
    let filteredValue = typeof value === 'string' && (field === 'country' || field === 'city') ? value.toUpperCase() : value;
    if (fieldFilterMap[field]) {
      filteredValue = fieldFilterMap[field](value);
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


  const handleClientSelection = (clientId) => {
    setSelectedClient(clientId);

    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setFormData(prev => ({
          ...prev,
          companyName: client.clientName || '',
          clientName: client.contactPersonName || '',
          contactNumber: client.contactNumber || '',
          emailId: client.emailId || '',
          country: client.country || '',
          city: client.city || '',
          address: client.address || '',
        }));
      }
    }
  };
  const handleAddProductInterest = () => {
    const newProduct = {
      id: Date.now(),
      productName: '',
      size: '',
      surface: '',
      quantity: 0,
      unitPrice: 0,
      totalValue: 0,
      imageUrl: '',
    };
    setFormData((prev) => ({
      ...prev,
      productInterests: [...(Array.isArray(prev.productInterests) ? prev.productInterests : []), newProduct],
    }));
  };

  const handleDeleteProductInterest = (index) => {
    setFormData((prev) => ({
      ...prev,
      productInterests: Array.isArray(prev.productInterests) ? prev.productInterests.filter((_, i) => i !== index) : [],
    }));
  };

  const handleProductLinesChange = (updatedLines, type = 'tile') => {
    setFormData((prev) => {
      const otherLines = Array.isArray(prev.productInterests) 
        ? prev.productInterests.filter(
            line => type === 'tile' ? line.product_type === 'sanitaryware' : line.product_type !== 'sanitaryware'
          )
        : [];
      
      const newProductInterests = [...otherLines, ...updatedLines];

      const totalLeadValue = newProductInterests.reduce(
        (sum, line) => sum + (parseFloat(line.amount) || 0),
        0
      );

      return {
        ...prev,
        productInterests: newProductInterests,
        leadValue: totalLeadValue,
      };
    });
  };

  const isFormValid = () => {
    return (
      formData.clientName && formData.clientName.trim().length > 0 &&
      formData.companyName && formData.companyName.trim().length > 0 &&
      formData.emailId && formData.emailId.trim().length > 0 &&
      formData.country &&
      formData.city &&
      formData.source &&
      formData.salesPerson &&
      formData.expectedCloseDate
    );
  };

  const validateForm = () => {
    const newErrors = {};

    // Company name validation
    const companyNameValidation = validateCompanyName(formData.companyName);
    if (!companyNameValidation.isValid) {
      newErrors.companyName = companyNameValidation.error;
    }

    // Contact person name validation
    const clientNameValidation = validateFullName(formData.clientName);
    if (!clientNameValidation.isValid) {
      newErrors.clientName = clientNameValidation.error;
    }

    // Contact number validation (international)
    const contactValidation = validateContactNumber(formData.contactNumber);
    if (!contactValidation.isValid) {
      newErrors.contactNumber = contactValidation.error;
    }

    // Email validation
    const emailValidation = validateEmail(formData.emailId);
    if (!emailValidation.isValid) {
      newErrors.emailId = emailValidation.error;
    }

    // Country validation (required dropdown)
    if (!formData.country) {
      newErrors.country = 'Country is required';
    }

    // Lead source validation (required dropdown)
    if (!formData.source) {
      newErrors.source = 'Lead source is required';
    }

    // Sales person validation (required dropdown)
    if (!formData.salesPerson) {
      newErrors.salesPerson = 'Sales person assignment is required';
    }

    // City validation (required)
    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    // Address validation (required)
    if (!formData.address || !formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    // Expected Close Date validation (required)
    if (!formData.expectedCloseDate) {
      newErrors.expectedCloseDate = 'Expected Close Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const leadData = {
        company_name: formData.companyName,
        contact_person_name: formData.clientName,
        email_id: formData.emailId,
        contact_number: formData.contactNumber,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        assigned_to: formData.salesPerson,
        source: formData.source,
        priority: formData.priority,
        status: formData.status,
        product_interest: Array.isArray(formData.productInterests) && formData.productInterests.length > 0
          ? JSON.stringify(formData.productInterests)
          : '',
        expected_value: formData.leadValue || 0,
        timeline: formData.expectedCloseDate || null,
        notes: formData.notes || '',
        client_id: selectedClient || null,
      };
      onSave(leadData);
    }
  };

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{lead ? 'Edit Lead' : 'Create Lead'}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            {/* Customer Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Customer Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12}>
                      <div className="mb-4 pb-3 border-bottom">
                        <Form.Group>
                          <Form.Label>Select Existing Client (Optional)</Form.Label>
                          <Form.Select
                            value={selectedClient}
                            onChange={(e) => handleClientSelection(e.target.value)}
                            style={{ color: '#000' }}
                          >
                            <option value="" style={{ color: '#000' }}>-- Select a client to auto-fill details, or enter manually below --</option>
                            {clients.filter(c => c.status !== 'Inactive' || c.id === selectedClient).map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.clientName}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted">
                            Select a client to auto-fill details, or enter manually below
                          </Form.Text>
                        </Form.Group>
                      </div>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Company Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.companyName}
                          onChange={(e) =>
                            handleInputChange('companyName', e.target.value)
                          }
                          isInvalid={!!errors.companyName}
                          placeholder={FIELD_PLACEHOLDERS.companyName.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.companyName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Contact Person Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.clientName}
                          onChange={(e) =>
                            handleInputChange('clientName', e.target.value)
                          }
                          isInvalid={!!errors.clientName}
                          placeholder={FIELD_PLACEHOLDERS.contactPersonName.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.clientName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Contact Number *</Form.Label>
                        <Form.Control
                          type="tel"
                          value={formData.contactNumber}
                          onChange={(e) =>
                            handleInputChange('contactNumber', e.target.value)
                          }
                          isInvalid={!!errors.contactNumber}
                          placeholder={FIELD_PLACEHOLDERS.contactNumber.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.contactNumber}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Email ID *</Form.Label>
                        <Form.Control
                          type="email"
                          value={formData.emailId}
                          onChange={(e) =>
                            handleInputChange('emailId', e.target.value)
                          }
                          isInvalid={!!errors.emailId}
                          placeholder={FIELD_PLACEHOLDERS.emailId.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.emailId}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Country *</Form.Label>
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
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>City *</Form.Label>
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
                            countryCode: countries.find(c => c.countryName === formData.country)?.countryCode
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Address *</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={formData.address}
                          onChange={(e) =>
                            handleInputChange('address', e.target.value)
                          }
                          placeholder={FIELD_PLACEHOLDERS.address.placeholder}
                          isInvalid={!!errors.address}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.address}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Lead Management */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Lead Management</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Lead Source *</Form.Label>
                        <Form.Select
                          value={formData.source}
                          onChange={(e) =>
                            handleInputChange('source', e.target.value)
                          }
                          isInvalid={!!errors.source}
                        >
                          <option value="">Select Source</option>
                          {leadSources.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.source}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Assigned Salesperson *</Form.Label>
                        <Form.Select
                          value={formData.salesPerson}
                          onChange={(e) =>
                            handleInputChange('salesPerson', e.target.value)
                          }
                          isInvalid={!!errors.salesPerson}
                        >
                          <option value="">Select Salesperson</option>
                          {salespersons.filter(person => person.status !== 'Inactive' || person.id === formData.salesPerson).map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.salesPerson}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Priority</Form.Label>
                        <Form.Select
                          value={formData.priority}
                          onChange={(e) =>
                            handleInputChange('priority', e.target.value)
                          }
                        >
                          {priorities.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Lead Status</Form.Label>
                        <Form.Select
                          value={formData.status}
                          onChange={(e) =>
                            handleInputChange('status', e.target.value)
                          }
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Expected Close Date *</Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.expectedCloseDate}
                          onChange={(e) =>
                            handleInputChange(
                              'expectedCloseDate',
                              e.target.value
                            )
                          }
                          placeholder={FIELD_PLACEHOLDERS.date.placeholder}
                          isInvalid={!!errors.expectedCloseDate}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.expectedCloseDate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Product Interests */}
            <Col xs={12}>
              <Card className="product-lines-card">
                <Card.Header className="invoice-card-header">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <Calculator size={20} className="me-2 text-primary" />
                      <h5 className="mb-0">Product Interests</h5>
                    </div>
                    <div className="product-summary">
                      <Badge bg="primary" className="me-2">
                        {formData.productInterests.length} Products
                      </Badge>
                      <Badge bg="success">
                        Total: ${(parseFloat(formData.leadValue) || 0).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body className="p-4">
                  <Tabs
                    id="product-type-tabs"
                    activeKey={activeProductTab}
                    onSelect={(k) => setActiveProductTab(k)}
                    className="custom-tabs mb-4"
                  >
                    <Tab eventKey="tiles" title={<span><Package size={16} className="me-2" />Tile Products</span>}>
                      <ProductLineTable
                        productLines={formData.productInterests.filter(line => line.product_type !== 'sanitaryware')}
                        onChange={(lines) => handleProductLinesChange(lines, 'tile')}
                        products={products}
                        onProductsChange={() => { }}
                        showRateHistory={false}
                        currentClient={formData.companyName}
                        masterData={{}}
                        onMasterDataUpdate={() => { }}
                        showAddNewProductButton={false}
                      />
                    </Tab>
                    <Tab eventKey="sanitaryware" title={<span><Package size={16} className="me-2" />Sanitaryware Products</span>}>
                      <SanitarywareProductLineTable
                        productLines={formData.productInterests.filter(line => line.product_type === 'sanitaryware')}
                        onChange={(lines) => handleProductLinesChange(lines, 'sanitaryware')}
                        products={sanitarywareProducts}
                        currency="USD"
                      />
                    </Tab>
                  </Tabs>
                </Card.Body>
              </Card>
            </Col>

            {/* Additional Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Additional Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Lead Value (Auto-calculated)</Form.Label>
                        <Form.Control
                          type="number"
                          value={(parseFloat(formData.leadValue) || 0).toFixed(2)}
                          readOnly
                          className="bg-light"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Notes</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={formData.notes}
                          onChange={(e) =>
                            handleInputChange('notes', e.target.value)
                          }
                          placeholder="Enter any additional notes or comments... (optional)"
                        />
                        <Form.Text className="text-muted">
                          Optional: Free text (any characters allowed)
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {Object.keys(errors).length > 0 && (
            <Alert variant="secondary" className="mt-3">
              Please fix the errors above before submitting.
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          <X size={16} className="me-1" />
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid()}
          style={!isFormValid() ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
        >
          <Save size={16} className="me-1" />
          {lead ? 'Update Lead' : 'Save Lead'}
        </Button>
      </Modal.Footer>

      {/* Image Preview Modal */}
      <Modal
        show={!!imagePreviewUrl}
        onHide={() => setImagePreviewUrl(null)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Product Image</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          <img
            src={imagePreviewUrl}
            alt="Product Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </Modal.Body>
      </Modal>
    </Modal>
  );
}

export default LeadForm;




