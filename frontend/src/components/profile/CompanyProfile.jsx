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

import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Form, Button, Alert, Spinner, Image } from 'react-bootstrap';
import {
  Building,
  MapPin,
  Globe,
  Mail,
  Phone,
  FileText,
  CreditCard,
  ShieldCheck,
  Save,
  Upload,
  RefreshCcw,
  Image as ImageIcon
} from 'lucide-react';
import api from '../../services/api';
import { showSuccess, showError } from '../shared/NotificationManager';
import { resolveImageUrl } from '../../utils/urlHelper';
import { transformKeysToSnake, transformKeys } from '../../utils/dataTransformers';
import { formatDateForInput } from '../../utils/formatters';
import { restrictToNumbers } from '../../utils/inputHelpers';
import DigitalSignature from './DigitalSignature';

const CompanyProfile = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCompanyData();
  }, [currentUser.companyId]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/companies/${currentUser.companyId}`);
      if (response.data?.success) {
        const camelData = transformKeys(response.data.data);
        const uppercaseFields = [
          'gstn', 'pan', 'iecNo', 'swiftCode', 'lutArnNo',
          'name', 'address', 'accountHolderName', 'bankAddress', 'bankName'
        ];
        uppercaseFields.forEach(field => {
          if (typeof camelData[field] === 'string') {
            camelData[field] = camelData[field].toUpperCase();
          }
        });
        setCompany(camelData);
        if (camelData.logoUrl || response.data.data.logo_url) {
          setLogoPreview(camelData.logoUrl || response.data.data.logo_url);
        }
      }
    } catch (error) {
      showError('Failed to fetch company profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-uppercase specific fields
    const uppercaseFields = [
      'gstn', 'pan', 'iecNo', 'swiftCode', 'lutArnNo',
      'name', 'address', 'accountHolderName', 'bankAddress', 'bankName'
    ];
    let finalValue = uppercaseFields.includes(name) ? value.toUpperCase() : value;

    if (name === 'contactNumber') {
      finalValue = restrictToNumbers(finalValue, true);
      e.target.value = finalValue;
    } else if (name === 'accountNumber') {
      finalValue = restrictToNumbers(finalValue, false);
      e.target.value = finalValue;
    }

    setCompany(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};

    if (!company?.name?.trim()) {
      newErrors.name = 'Company Name is required';
    }

    if (company?.contactNumber?.trim()) {
      const phoneRegex = /^\+?[\d\s-]{10,15}$/;
      if (!phoneRegex.test(company.contactNumber.trim())) {
        newErrors.contactNumber = 'Enter a valid contact number (10-15 digits)';
      }
    }

    if (company?.gstn?.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(company.gstn.trim())) {
        newErrors.gstn = 'Enter a valid 15-character GSTIN (e.g., 22AAAAA0000A1Z5)';
      }
    }

    if (company?.pan?.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
      if (!panRegex.test(company.pan.trim())) {
        newErrors.pan = 'Enter a valid 10-character PAN (e.g., ABCDE1234F)';
      }
    }

    if (company?.iecNo?.trim()) {
      const iecRegex = /^[A-Z0-9]{10}$/i;
      if (!iecRegex.test(company.iecNo.trim())) {
        newErrors.iecNo = 'Enter a valid 10-character IEC Code';
      }
    }

    if (company?.accountNumber?.trim()) {
      const accRegex = /^\d{9,18}$/;
      if (!accRegex.test(company.accountNumber.trim())) {
        newErrors.accountNumber = 'Account number must be 9-18 digits';
      }
    }

    if (company?.swiftCode?.trim()) {
      const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;
      if (!swiftRegex.test(company.swiftCode.trim())) {
        newErrors.swiftCode = 'Enter a valid 8 or 11 character SWIFT Code';
      }
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const failedFields = Object.keys(newErrors).map(k => newErrors[k]).join(' | ');
      showError(`Validation failed: ${failedFields}`);
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      // Convert company object to snake_case for backend compatibility
      const snakeCompany = transformKeysToSnake(company);

      Object.keys(snakeCompany).forEach(key => {
        if (snakeCompany[key] !== null && snakeCompany[key] !== undefined) {
          if (key === 'settings') {
            formData.append(key, JSON.stringify(snakeCompany[key]));
          } else {
            formData.append(key, snakeCompany[key]);
          }
        }
      });

      if (fileInputRef.current?.files[0]) {
        formData.append('logo', fileInputRef.current.files[0]);
      }

      const response = await api.put(`/companies/${currentUser.companyId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data?.success) {
        showSuccess('Company profile updated successfully');
        fetchCompanyData();
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update company profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Loading company profile...</span>
      </div>
    );
  }

  return (
    <div className="company-profile-container animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Company Profile</h3>
          <p className="text-muted mb-0">Manage your enterprise business details and branding</p>
        </div>
        <Button
          variant="outline-primary"
          onClick={fetchCompanyData}
          disabled={loading || saving}
          className="d-flex align-items-center gap-2"
        >
          <RefreshCcw size={18} className={loading ? 'spin' : ''} />
          Refresh
        </Button>
      </div>

      <Form onSubmit={handleSubmit}>
        <Row>
          {/* Left Column: General Info & Branding */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3 border-bottom-0">
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <ImageIcon size={20} className="text-primary" />
                  Branding
                </h5>
              </Card.Header>
              <Card.Body className="text-center pt-0">
                <div className="mb-4">
                  <div
                    className="logo-upload-preview mx-auto mb-3 d-flex align-items-center justify-content-center border rounded-circle overflow-hidden bg-light"
                    style={{ width: '150px', height: '150px', position: 'relative', cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img
                        src={resolveImageUrl(logoPreview)}
                        alt="Company Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="text-muted d-flex flex-column align-items-center">
                        <Upload size={40} className="mb-2" />
                        <span className="small">Upload Logo</span>
                      </div>
                    )}
                    <div className="upload-overlay">
                      <Upload size={24} />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="d-none"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                  <p className="text-muted small">Recommended size: 500x500px (PNG, JPG)</p>
                </div>

                <div className="text-start">
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Company Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={(company.name || '').toUpperCase()}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      isInvalid={!!errors.name}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.name}
                    </Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Industry Type</Form.Label>
                    <Form.Control
                      type="text"
                      name="industry"
                      value={company.industry || ''}
                      onChange={handleChange}
                      placeholder="e.g. Ceramic Tiles, Textiles"
                    />
                  </Form.Group>
                </div>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3 border-bottom-0">
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" />
                  Tax & Legal Info
                </h5>
              </Card.Header>
              <Card.Body className="pt-0">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small">GSTIN / Tax ID</Form.Label>
                  <Form.Control
                    type="text"
                    name="gstn"
                    value={company.gstn || ''}
                    onChange={handleChange}
                    placeholder="Enter GSTIN"
                    isInvalid={!!errors.gstn}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.gstn}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small">PAN Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="pan"
                    value={company.pan || ''}
                    onChange={handleChange}
                    placeholder="Enter PAN"
                    isInvalid={!!errors.pan}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.pan}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small">IEC Code</Form.Label>
                  <Form.Control
                    type="text"
                    name="iecNo"
                    value={company.iecNo || ''}
                    onChange={handleChange}
                    placeholder="Enter Import Export Code"
                    isInvalid={!!errors.iecNo}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.iecNo}
                  </Form.Control.Feedback>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Address, Contact, Banking & LUT */}
          <Col lg={8}>
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3 border-bottom-0">
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Contact & Location
                </h5>
              </Card.Header>
              <Card.Body className="pt-0">
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="address"
                        value={(company.address || '').toUpperCase()}
                        onChange={handleChange}
                        placeholder="Full business address"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">City</Form.Label>
                      <Form.Control
                        type="text"
                        name="city"
                        value={company.city || ''}
                        onChange={handleChange}
                        placeholder="City"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Country</Form.Label>
                      <Form.Control
                        type="text"
                        name="country"
                        value={company.country || ''}
                        onChange={handleChange}
                        placeholder="Country"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Contact Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="contactNumber"
                        value={company.contactNumber || ''}
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/[^0-9+]/g, '');
                        }}
                        onChange={handleChange}
                        placeholder="Phone number"
                        isInvalid={!!errors.contactNumber}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.contactNumber}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3 border-bottom-0">
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <CreditCard size={20} className="text-primary" />
                  Banking Information
                </h5>
              </Card.Header>
              <Card.Body className="pt-0">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Bank Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="bankName"
                        value={(company.bankName || '').toUpperCase()}
                        onChange={handleChange}
                        placeholder="Enter Bank Name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Account Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="accountHolderName"
                        value={company.accountHolderName || ''}
                        onChange={handleChange}
                        placeholder="Beneficiary Name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Account Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="accountNumber"
                        value={company.accountNumber || ''}
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/[^0-9]/g, '');
                        }}
                        onChange={handleChange}
                        placeholder="Enter Account Number"
                        isInvalid={!!errors.accountNumber}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.accountNumber}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">SWIFT Code</Form.Label>
                      <Form.Control
                        type="text"
                        name="swiftCode"
                        value={company.swiftCode || ''}
                        onChange={handleChange}
                        placeholder="Enter SWIFT Code"
                        isInvalid={!!errors.swiftCode}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.swiftCode}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Branch Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="branchName"
                        value={company.branchName || ''}
                        onChange={handleChange}
                        placeholder="Enter Branch Details"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Bank Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="bankAddress"
                        value={company.bankAddress || ''}
                        onChange={handleChange}
                        placeholder="Enter Bank Address"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3 border-bottom-0">
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <FileText size={20} className="text-primary" />
                  Exporter Details & LUT
                </h5>
              </Card.Header>
              <Card.Body className="pt-0">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">LUT ARN / BOND NO.</Form.Label>
                      <Form.Control
                        type="text"
                        name="lutArnNo"
                        value={company.lutArnNo || ''}
                        onChange={handleChange}
                        placeholder="Enter LUT number"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">LUT Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="lutDate"
                        value={formatDateForInput(company.lutDate)}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Digital Signature Section */}
            <DigitalSignature currentUser={currentUser} />

            <div className="d-flex justify-content-end gap-3 mb-5 mt-4">
              <Button
                variant="light"
                onClick={fetchCompanyData}
                disabled={saving}
              >
                Discard Changes
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={saving}
                className="px-5 fw-bold d-flex align-items-center gap-2 shadow-sm"
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Profile Settings
                  </>
                )}
              </Button>
            </div>
          </Col>
        </Row>
      </Form>

      <style>{`
        .company-profile-container {
          padding: 1rem;
        }
        .logo-upload-preview {
          transition: all 0.3s ease;
          border: 2px dashed #dee2e6 !important;
        }
        .logo-upload-preview:hover {
          border-color: var(--bs-primary) !important;
          background-color: #f8f9fa !important;
        }
        .upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .logo-upload-preview:hover .upload-overlay {
          opacity: 1;
        }
        .card {
          border-radius: 12px;
        }
        .form-label {
          color: #475569;
          margin-bottom: 0.4rem;
        }
        .form-control:focus {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.1);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CompanyProfile;
