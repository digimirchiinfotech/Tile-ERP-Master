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
import { Modal, Form, Row, Col, Alert, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Save, X, Eye, EyeOff, Info, Edit } from 'lucide-react';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { 
  validateFullName, 
  validateEmail, 
  validatePassword, 
  validateConfirmPassword, 
  validateContactNumber 
} from '../../utils/validators.js';
import { 
  restrictToNumbers, 
  restrictToLetters,
  sanitizeEmail 
} from '../../utils/inputHelpers.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';


const userRoles = {
  company_admin: 'Company Admin',
  sales_manager: 'Sales Manager',
  sales_executive: 'Sales Executive',
  qc: 'QC',
  export_documents: 'Export Document',
  account: 'Accounter',
};

function UserForm({ user, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    emailId: '',
    role: '',
    department: '',
    designation: '',
    employeeId: '',
    status: 'Active',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});


  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        contactNumber: user.contactNumber || '',
        emailId: user.emailId || '',
        role: user.role || '',
        department: user.department || '',
        designation: user.designation || '',
        employeeId: user.employee_id || user.employeeId || '',
        status: user.status || 'Active',
        password: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  // Field-type mapping for real-time input filtering
  const fieldFilterMap = {
    // Name fields - letters and spaces only
    name: (val) => restrictToLetters(val, true),
    
    // Phone fields - numbers only
    contactNumber: (val) => restrictToNumbers(val, true),
    
    // Other fields - no filtering needed
  };

  const handleInputChange = (field, value) => {
    // Apply field-specific filtering
    let filteredValue = value;
    if (fieldFilterMap[field]) {
      filteredValue = fieldFilterMap[field](value);
    }
    
    // Auto-uppercase specific fields
    const uppercaseFields = ['name', 'employeeId', 'department', 'designation'];
    if (uppercaseFields.includes(field)) {
      filteredValue = filteredValue.toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      [field]: filteredValue,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    const nameValidation = validateFullName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }

    // Email validation
    const emailValidation = validateEmail(formData.emailId);
    if (!emailValidation.isValid) {
      newErrors.emailId = emailValidation.error;
    }

    // Contact number validation (international)
    const contactValidation = validateContactNumber(formData.contactNumber);
    if (!contactValidation.isValid) {
      newErrors.contactNumber = contactValidation.error;
    }

    // Role validation (required dropdown)
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Password validation only for new users or when password is provided
    if (!user || formData.password) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.error;
      }

      const confirmPasswordValidation = validateConfirmPassword(
        formData.password,
        formData.confirmPassword
      );
      if (!confirmPasswordValidation.isValid) {
        newErrors.confirmPassword = confirmPasswordValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      scrollToFirstError();
      return;
    }

    // Transform to snake_case for backend
    const userData = {
      name: formData.name,
      email_id: formData.emailId,
      contact_number: formData.contactNumber,
      role: formData.role,
      department: formData.department,
      designation: formData.designation,
      employee_id: formData.employeeId,
      status: formData.status,
    };

    // Only include password for new users or if password is provided
    if (!user || formData.password) {
      userData.password = formData.password;
    }

    onSave(userData);
  };

  return (
    <Modal show={true} onHide={onCancel} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{user ? 'Edit User' : 'Create User'}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            {/* Basic Information Card */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Basic Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {/* Name - Full Width */}
                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Name is mandatory.</Tooltip>}>
                          <Form.Label className="fw-bold text-danger" style={{cursor: 'help'}}>
                            Name * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          isInvalid={!!errors.name}
                          placeholder={FIELD_PLACEHOLDERS.name.placeholder}
                          className="py-2"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Email ID - Full Width */}
                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Email ID is mandatory.</Tooltip>}>
                          <Form.Label className="fw-bold text-danger" style={{cursor: 'help'}}>
                            Email ID * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="email"
                          value={formData.emailId}
                          onChange={(e) => handleInputChange('emailId', e.target.value)}
                          isInvalid={!!errors.emailId}
                          placeholder={FIELD_PLACEHOLDERS.emailId.placeholder}
                          className="py-2"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.emailId}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Contact Number - Full Width */}
                    <Col xs={12}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Contact Number is mandatory.</Tooltip>}>
                          <Form.Label className="fw-bold text-danger" style={{cursor: 'help'}}>
                            Contact Number * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="text"
                          value={formData.contactNumber}
                          onChange={(e) =>
                            handleInputChange('contactNumber', e.target.value)
                          }
                          isInvalid={!!errors.contactNumber}
                          placeholder={FIELD_PLACEHOLDERS.contactNumber.placeholder}
                          className="py-2"
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

            {/* Organization Card */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Organization Details</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={12} md={4}>
                      <Form.Group>
                        <Form.Label className="fw-bold">Employee ID</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.employeeId}
                          onChange={(e) => handleInputChange('employeeId', e.target.value)}
                          placeholder="e.g. EMP-001"
                          className="py-2"
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Group>
                        <Form.Label className="fw-bold">Department</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          placeholder="e.g. Sales"
                          className="py-2"
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Group>
                        <Form.Label className="fw-bold">Designation</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.designation}
                          onChange={(e) => handleInputChange('designation', e.target.value)}
                          placeholder="e.g. Senior Manager"
                          className="py-2"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Role & Status Card */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Role & Status</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {/* Role */}
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Role is mandatory.</Tooltip>}>
                          <Form.Label className="fw-bold text-danger" style={{cursor: 'help'}}>
                            Role * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Select
                          value={formData.role}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          isInvalid={!!errors.role}
                          className="py-2"
                        >
                          <option value="">Select Role</option>
                          {Object.entries(userRoles).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.role}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Status */}
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold">Status</Form.Label>
                        <Form.Select
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                          className="py-2"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Authentication Card */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Authentication</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {/* Password */}
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold">
                          Password {!user && '*'}
                          {user && (
                            <small className="text-muted ms-2" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>
                              (Leave blank to keep current)
                            </small>
                          )}
                        </Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) =>
                              handleInputChange('password', e.target.value)
                            }
                            isInvalid={!!errors.password}
                            placeholder={FIELD_PLACEHOLDERS.password.placeholder}
                            className="py-2"
                          />
                          <Button
                            variant="link"
                            className="position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                        <Form.Control.Feedback type="invalid">
                          {errors.password}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Confirm Password */}
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold">
                          Confirm Password {!user && '*'}
                        </Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              handleInputChange('confirmPassword', e.target.value)
                            }
                            isInvalid={!!errors.confirmPassword}
                            placeholder="Confirm password (must match above)"
                            className="py-2"
                          />
                          <Button
                            variant="link"
                            className="position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            type="button"
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </Button>
                        </div>
                        <Form.Control.Feedback type="invalid">
                          {errors.confirmPassword}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

        </Form>
      </Modal.Body>



      <Modal.Footer>
        <Button
          variant="secondary"
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
          {user ? 'Update User' : 'Create User'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default UserForm;





