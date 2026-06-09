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
import { Modal, Form, Button, Row, Col, Alert, Card } from 'react-bootstrap';
import { Save, X, Edit, Check } from 'lucide-react';
import { validateFullName, validateEmail, validateContactNumber } from '../../utils/validators.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { useCatalogues } from '../../hooks/useCatalogues';
import { useMasterData } from '../../hooks/useMasterData';

function SalespersonForm({ salesperson, onSave, onCancel }) {
  const { catalogues } = useCatalogues();
  const { countries: masterCountries, cities: masterCities, fetchCitiesByCountry } = useMasterData();
  const [formData, setFormData] = useState({
    name: '',
    emailId: '',
    contactNumber: '',
    employeeId: '',
    department: '',
    country: '',
    city: '',
    salesTarget: 0,
    commission: 0,
    status: 'Active',
    assignedCatalogues: [],
  });
  const [errors, setErrors] = useState({});

  const departments = [
    'Sales',
    'Marketing',
    'Business Development',
  ];

  useEffect(() => {
    if (salesperson) {
      setFormData({
        name: salesperson.name || '',
        emailId: salesperson.emailId || '',
        contactNumber: salesperson.contactNumber || '',
        employeeId: salesperson.employeeId || '',
        department: salesperson.department || '',
        country: salesperson.country || '',
        city: salesperson.city || '',
        salesTarget: salesperson.salesTarget || 0,
        commission: salesperson.commission || 0,
        status: salesperson.status || 'Active',
        assignedCatalogues: salesperson.assignedCatalogues || [],
      });
    }
  }, [salesperson]);

  useEffect(() => {
    if (formData.country) {
      const selectedCountry = masterCountries.find(c => c.countryName === formData.country);
      if (selectedCountry) {
        fetchCitiesByCountry(selectedCountry.countryCode);
      }
    }
  }, [formData.country, masterCountries, fetchCitiesByCountry]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleCatalogueSelection = (catalogueId) => {
    const isSelected = formData.assignedCatalogues.includes(catalogueId);
    if (isSelected) {
      setFormData((prev) => ({
        ...prev,
        assignedCatalogues: prev.assignedCatalogues.filter(
          (id) => id !== catalogueId
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        assignedCatalogues: [...prev.assignedCatalogues, catalogueId],
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Salesperson name validation (full name)
    const nameValidation = validateFullName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }

    // Email validation
    const emailValidation = validateEmail(formData.emailId);
    if (!emailValidation.isValid) {
      newErrors.emailId = emailValidation.error;
    }

    // Phone validation (international)
    const phoneValidation = validateContactNumber(formData.contactNumber);
    if (!phoneValidation.isValid) {
      newErrors.contactNumber = phoneValidation.error;
    }

    // Employee ID validation
    if (!formData.employeeId || !formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    }

    // Department validation
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    // Country validation
    if (!formData.country) {
      newErrors.country = 'Country is required';
    }

    // City validation
    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    // Sales target validation
    if (!formData.salesTarget || formData.salesTarget <= 0) {
      newErrors.salesTarget = 'Sales target must be greater than 0';
    }

    // Commission validation
    if (formData.commission === null || formData.commission === undefined || formData.commission < 0) {
      newErrors.commission = 'Commission must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {

      onSave(formData);
    }
  };

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {salesperson ? 'Edit Salesperson' : 'Create Salesperson'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            {/* Personal Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Personal Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Full Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange('name', e.target.value)
                          }
                          isInvalid={!!errors.name}
                          placeholder={FIELD_PLACEHOLDERS.name.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Employee ID *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.employeeId}
                          onChange={(e) =>
                            handleInputChange('employeeId', e.target.value)
                          }
                          isInvalid={!!errors.employeeId}
                          placeholder="Enter employee ID"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.employeeId}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Email Address *</Form.Label>
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
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Phone Number *</Form.Label>
                        <Form.Control
                          type="tel"
                          value={formData.contactNumber}
                          onChange={(e) =>
                            handleInputChange('contactNumber', e.target.value)
                          }
                          isInvalid={!!errors.contactNumber}
                          placeholder={FIELD_PLACEHOLDERS.phone.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.contactNumber}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Professional Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">
                    Professional Information
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Department *</Form.Label>
                        <Form.Select
                          value={formData.department}
                          onChange={(e) =>
                            handleInputChange('department', e.target.value)
                          }
                          isInvalid={!!errors.department}
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.department}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Country *</Form.Label>
                        <Form.Select
                          value={formData.country}
                          onChange={(e) =>
                            handleInputChange('country', e.target.value)
                          }
                          isInvalid={!!errors.country}
                        >
                          <option value="">Select Country</option>
                          {masterCountries.map((c) => (
                            <option key={c.countryCode} value={c.countryName}>
                              {c.countryName}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.country}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>City *</Form.Label>
                        <Form.Select
                          value={formData.city}
                          onChange={(e) =>
                            handleInputChange('city', e.target.value)
                          }
                          isInvalid={!!errors.city}
                        >
                          <option value="">Select City</option>
                          {masterCities.map((c) => (
                            <option key={c.id || c.cityName} value={c.cityName}>
                              {c.cityName} {c.stateProvince ? `(${c.stateProvince})` : ''}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.city}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Sales Target *</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={formData.salesTarget}
                          onChange={(e) =>
                            handleInputChange(
                              'salesTarget',
                              parseInt(e.target.value) || 0
                            )
                          }
                          isInvalid={!!errors.salesTarget}
                          placeholder="Enter sales target"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.salesTarget}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Commission (%) *</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.commission}
                          onChange={(e) =>
                            handleInputChange(
                              'commission',
                              e.target.value
                            )
                          }
                          isInvalid={!!errors.commission}
                          placeholder="Enter commission percentage"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.commission}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* System Access */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">System Access</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Account Status</Form.Label>
                        <div className="status-segmented-control mt-2">
                          {['Active', 'Inactive'].map((status) => (
                            <Button
                              key={status}
                              variant={formData.status === status ? (status === 'Active' ? 'success' : 'secondary') : 'outline-light'}
                              size="sm"
                              className={`status-btn ${formData.status === status ? 'active shadow-sm' : 'text-muted'}`}
                              onClick={() => handleInputChange('status', status)}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Catalogue Assignment */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">
                    Assigned Catalogues ({formData.assignedCatalogues.length}{' '}
                    assigned)
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {catalogues.map((catalogue) => (
                      <Col key={catalogue.id} xs={12} sm={6} lg={4}>
                        <Card
                          className={`catalogue-card ${formData.assignedCatalogues.includes(catalogue.id)
                              ? 'selected'
                              : ''
                            }`}
                          onClick={() => handleCatalogueSelection(catalogue.id)}
                        >
                          <Card.Body className="p-3">
                            <div className="d-flex align-items-center">
                              <Form.Check
                                type="checkbox"
                                checked={formData.assignedCatalogues.includes(
                                  catalogue.id
                                )}
                                onChange={() =>
                                  handleCatalogueSelection(catalogue.id)
                                }
                                className="me-2"
                              />
                              <div>
                                <h6 className="mb-1">{catalogue.name}</h6>
                                <small className="text-muted">
                                  {catalogue.description}
                                </small>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
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
        <Button variant="primary" onClick={handleSubmit}>
          <Save size={16} className="me-1" />
          {salesperson ? 'Update Salesperson' : 'Save Salesperson'}
        </Button>
      </Modal.Footer>

      <style>{`
        .catalogue-card {
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .catalogue-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .catalogue-card.selected {
          border-color: #0d6efd;
          background-color: #e7f3ff;
        }

        .status-segmented-control {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
          width: fit-content;
        }
        
        .status-btn {
          border: none !important;
          border-radius: 8px !important;
          padding: 6px 20px !important;
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
      `}</style>
    </Modal>
  );
}

export default SalespersonForm;




