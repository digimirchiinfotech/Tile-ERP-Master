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
import { Save, X, IndianRupee, Info } from 'lucide-react';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';

function SubscriptionPlanForm({ plan, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    duration: 1,
    durationType: 'month',
    maxUsers: 10,
    maxCompanies: 1,
    status: 'Active',
    description: '',
  });
  const [errors, setErrors] = useState({});

  const durationTypes = [
    { value: 'days', label: 'Days' },
    { value: 'month', label: 'Month(s)' },
    { value: 'year', label: 'Year(s)' },
  ];

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        price: plan.price || 0,
        duration: plan.duration || 1,
        durationType: plan.durationType || 'month',
        maxUsers: plan.maxUsers || 10,
        maxCompanies: plan.maxCompanies || 1,
        status: plan.status || 'Active',
        description: plan.description || '',
      });
    }
  }, [plan]);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    if (!formData.maxUsers || formData.maxUsers < -1) {
      newErrors.maxUsers =
        'Max users must be -1 (unlimited) or positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
    } else {
      scrollToFirstError();
    }
  };

  return (
    <Modal show={true} onHide={onCancel} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <IndianRupee size={20} className="me-2" />
          {plan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            {/* Basic Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Plan Details</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Plan Name is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Plan Name * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
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
                        <OverlayTrigger placement="top" overlay={<Tooltip>Price is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Price (INR) * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) =>
                            handleInputChange(
                              'price',
                              e.target.value
                            )
                          }
                          isInvalid={!!errors.price}
                          placeholder={FIELD_PLACEHOLDERS.amount.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.price}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Duration is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Duration * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="number"
                          min="1"
                          value={formData.duration}
                          onChange={(e) =>
                            handleInputChange(
                              'duration',
                              parseInt(e.target.value) || 1
                            )
                          }
                          isInvalid={!!errors.duration}
                          placeholder="Enter duration"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.duration}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Duration Type</Form.Label>
                        <Form.Select
                          value={formData.durationType}
                          onChange={(e) =>
                            handleInputChange('durationType', e.target.value)
                          }
                        >
                          {durationTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Max Users is mandatory.</Tooltip>}>
                          <Form.Label className="text-danger" style={{cursor: 'help'}}>
                            Max Users * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="number"
                          min="-1"
                          value={formData.maxUsers}
                          onChange={(e) =>
                            handleInputChange(
                              'maxUsers',
                              parseInt(e.target.value) || 0
                            )
                          }
                          isInvalid={!!errors.maxUsers}
                          placeholder="Enter max users (-1 for unlimited)"
                        />
                        <Form.Text className="text-muted">
                          Use -1 for unlimited users
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                          {errors.maxUsers}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                          value={formData.status}
                          onChange={(e) =>
                            handleInputChange('status', e.target.value)
                          }
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={formData.description}
                          onChange={(e) =>
                            handleInputChange('description', e.target.value)
                          }
                          placeholder={FIELD_PLACEHOLDERS.description.placeholder}
                        />
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
        <Button variant="primary" onClick={handleSubmit}>
          <Save size={16} className="me-1" />
          {plan ? 'Update Plan' : 'Save Plan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SubscriptionPlanForm;
