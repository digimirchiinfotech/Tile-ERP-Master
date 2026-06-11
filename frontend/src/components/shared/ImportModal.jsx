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

import { useState } from 'react';
import {
  Modal,
  Form,
  Button,
  Alert,
  Table,
  Badge,
  ProgressBar,
} from 'react-bootstrap';
import { Upload, Download, FileText, CheckCircle, AlertTriangle, X, Eye, RefreshCw, Check } from 'lucide-react';
import {
  processImportWithProgress,
  getImportTemplate,
} from '../../utils/importUtils.js';
import { exportToCSV } from '../../utils/exportUtils.js';
import { validateFileUpload } from '../../utils/validators.js';
import { showWarning, showError, showSuccess } from './NotificationManager.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * Professional Import Modal Component
 * Features:
 * - Enhanced file validation and processing
 * - Real-time progress tracking
 * - Comprehensive data validation
 * - Error reporting with suggestions
 * - Template download functionality
 * - Preview before import
 */
function ImportModal({ show, onHide, onImport, moduleType }) {
  const [importData, setImportData] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // upload, processing, validate, confirm
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});

  /**
   * Get template information for current module
   */
  const getTemplateInfo = () => {
    const template = getImportTemplate(moduleType);
    return template || { name: moduleType, fields: [] };
  };

  /**
   * Download template file with template data
   */
  const handleDownloadTemplate = () => {
    try {
      const template = getImportTemplate(moduleType);
      if (!template) {
        throw new Error(`Template not found for module: ${moduleType}`);
      }
      
      const sampleData = template.fields.reduce((obj, field) => {
        obj[field.name] = field.example || '';
        return obj;
      }, {});
      
      // exportToCSV returns boolean true/false
      const ok = exportToCSV([sampleData], `${moduleType}_template`);
      if (ok) {
        showSuccess('Template downloaded successfully!');
      } else {
        showError('No data to export');
      }
    } catch (error) {
      showError('Failed to download template: ' + error.message);
    }
  };

  /**
   * Handle file selection with validation
   */
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file using centralized validator
    const fileValidation = validateFileUpload(file, {
      allowedTypes: ['csv', 'xlsx', 'xls'],
      maxSizeMB: 10,
      fieldName: 'Import file'
    });

    if (!fileValidation.isValid) {
      showError(fileValidation.error);
      return;
    }

    setSelectedFile(file);
    setImportStep('processing');
    setIsProcessing(true);

    try {
      // Process file with progress tracking
      const result = await processImportWithProgress(
        file,
        moduleType,
        (progressValue, message) => {
          setProgress(progressValue);
          setProgressMessage(message);
        }
      );

      if (result.success) {
        setImportData(result.data);
        setValidationResults(result.validation);
        setImportStep('confirm');

        if (result.summary.invalidRows > 0) {
          showWarning(
            `Import completed with ${result.summary.invalidRows} validation errors`
          );
        } else {
          showSuccess('All data validated successfully!');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showError('Import failed: ' + error.message);
      setImportStep('upload');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  /**
   * Handle final import confirmation
   */
  const handleImport = async () => {
    if (validationResults && validationResults.valid.length > 0) {
      try {
        setIsProcessing(true);
        await onImport(validationResults.valid);
        showSuccess(
          `Successfully imported ${validationResults.valid.length} records!`
        );
        handleClose();
      } catch (error) {
        showError('Import failed: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  /**
   * Reset modal state
   */
  const handleClose = () => {
    setImportData([]);
    setValidationResults(null);
    setImportStep('upload');
    setSelectedFile(null);
    setProgress(0);
    setProgressMessage('');
    setIsProcessing(false);
    onHide();
  };

  /**
   * Get module display name
   */
  const getModuleDisplayName = () => {
    const names = {
      'proforma-invoice-enhanced': 'Proforma Invoices',
      'proforma-order': 'Proforma Orders',
      leads: 'Leads',
      clients: 'Clients',
      'packing-lists': 'Packing Lists',
      'account-entries': 'Account Entries',
      users: 'Users',
      products: 'Products',
    };
    return names[moduleType] || moduleType;
  };

  const templateInfo = getTemplateInfo();

  return (
    <Modal show={show} onHide={handleClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <Upload size={20} className="me-2" />
          Import {getModuleDisplayName()}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Step 1: Upload */}
        {importStep === 'upload' && (
          <div>
            <Alert variant="info" className="import-info-alert">
              <div className="d-flex align-items-start">
                <FileText size={20} className="me-3 mt-1" />
                <div>
                  <Alert.Heading className="h6">
                    🚀 Advanced Import System v3.0
                  </Alert.Heading>
                  <p className="mb-2">
                    Import complete business data with intelligent validation,
                    automatic relationship linking, and real-time error
                    detection. The system ensures data integrity and maintains
                    workflow compatibility across all modules.
                  </p>
                  <ul className="mb-0 small">
                    <li>
                      ✅ Multi-format support: CSV, Excel, TSV (max 10MB, 10,000
                      records)
                    </li>
                    <li>
                      🔍 Real-time validation with intelligent error detection
                      and suggestions
                    </li>
                    <li>
                      🔗 Automatic relationship validation and cross-reference
                      checking
                    </li>
                    <li>
                      👁️ Preview and verify data before final import with
                      rollback capability
                    </li>
                    <li>
                      📊 Progress tracking with detailed import analytics and
                      reporting
                    </li>
                  </ul>
                </div>
              </div>
            </Alert>

            {/* Template Information */}
            <div className="template-section mb-4">
              <h6 className="text-primary mb-3">Template Information</h6>
              <div className="template-info-card">
                <div className="template-header">
                  <h6 className="mb-2">{templateInfo.name} Import Template</h6>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                  >
                    <Download size={16} className="me-1" />
                    Download Template
                  </Button>
                </div>

                {templateInfo.fields.length > 0 && (
                  <div className="template-fields">
                    <small className="text-muted mb-2 d-block">
                      Required fields:
                    </small>
                    <div className="field-tags">
                      {templateInfo.fields
                        .filter((field) => field.required)
                        .map((field) => (
                          <Badge
                            key={field.name}
                            bg="danger"
                            className="me-1 mb-1"
                          >
                            {field.label}
                          </Badge>
                        ))}
                    </div>
                    <small className="text-muted mb-2 d-block mt-2">
                      Optional fields:
                    </small>
                    <div className="field-tags">
                      {templateInfo.fields
                        .filter((field) => !field.required)
                        .map((field) => (
                          <Badge
                            key={field.name}
                            bg="secondary"
                            className="me-1 mb-1"
                          >
                            {field.label}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className="upload-section">
              <h6 className="text-primary mb-3">Upload Your File</h6>
              <div className="upload-area">
                <Form.Control
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="file-input"
                  id="import-file"
                />
                <label htmlFor="import-file" className="file-label">
                  <div className="upload-content">
                    <Upload size={48} className="upload-icon mb-3" />
                    <h6>Choose file to import</h6>
                    <p className="text-muted mb-2">
                      Drag and drop your CSV or Excel file here, or click to
                      browse
                    </p>
                    <small className="text-muted">
                      Supported formats: CSV, XLS, XLSX (Max: 10MB, 1000
                      records)
                    </small>
                  </div>
                </label>
              </div>
            </div>

            {/* Import Instructions */}
            <div className="instructions-section mt-4">
              <h6 className="text-primary mb-3">Import Instructions</h6>
              <div className="instruction-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <strong>Download Template:</strong> Use the template file to
                    ensure correct format
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <strong>Fill Data:</strong> Complete all required fields and
                    follow the format
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <strong>Upload File:</strong> Select your completed file for
                    validation and import
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <strong>Review & Import:</strong> Check validation results
                    and confirm import
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {importStep === 'processing' && (
          <div className="processing-section">
            <div className="text-center mb-4">
              <LoadingSpinner size="lg" />
            </div>

            <h5 className="text-center mb-3">Processing Import File</h5>
            <p className="text-center text-muted mb-4">
              {progressMessage ||
                'Analyzing file structure and validating data...'}
            </p>

            <ProgressBar
              now={progress}
              label={`${progress}%`}
              className="progress-enhanced mb-3"
              striped
              animated
            />

            <div className="processing-info">
              <div className="info-item">
                <strong>File:</strong> {selectedFile?.name}
              </div>
              <div className="info-item">
                <strong>Size:</strong>{' '}
                {selectedFile ? Math.round(selectedFile.size / 1024) : 0} KB
              </div>
              <div className="info-item">
                <strong>Module:</strong> {getModuleDisplayName()}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Validation Results */}
        {importStep === 'confirm' && validationResults && (
          <div>
            {/* Summary Alert */}
            <Alert
              variant={
                validationResults.invalid.length > 0 ? 'warning' : 'success'
              }
              className="validation-summary-alert"
            >
              <div className="d-flex align-items-center">
                {validationResults.invalid.length > 0 ? (
                  <AlertTriangle size={20} className="me-2" />
                ) : (
                  <CheckCircle size={20} className="me-2" />
                )}
                <div>
                  <Alert.Heading className="h6 mb-1">
                    Validation Complete
                  </Alert.Heading>
                  <p className="mb-0">
                    <strong>{validationResults.valid.length}</strong> valid
                    records,
                    <strong className="ms-1">
                      {validationResults.invalid.length}
                    </strong>{' '}
                    invalid records out of{' '}
                    <strong className="ms-1">
                      {validationResults.summary.total}
                    </strong>{' '}
                    total.
                  </p>
                </div>
              </div>
            </Alert>

            {/* Valid Records Preview */}
            {validationResults.valid.length > 0 && (
              <div className="validation-section mb-4">
                <h6 className="text-success mb-3">
                  <CheckCircle size={18} className="me-2" />
                  Valid Records ({validationResults.valid.length})
                </h6>

                <div className="table-container">
                  <Table striped hover size="sm" className="validation-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        {templateInfo.fields.slice(0, 4).map((field) => (
                          <th key={field.name}>{field.label}</th>
                        ))}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResults.valid
                        .slice(0, 10)
                        .map((record, index) => (
                          <tr key={index}>
                            <td>
                              <Badge bg="light" text="dark">
                                {record.rowIndex}
                              </Badge>
                            </td>
                            {templateInfo.fields.slice(0, 4).map((field) => (
                              <td
                                key={field.name}
                                className="text-truncate"
                                style={{ maxWidth: '150px' }}
                              >
                                {record[field.name] || '-'}
                              </td>
                            ))}
                            <td>
                              <Badge bg="success">
                                <CheckCircle size={12} className="me-1" />
                                Valid
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>

                {validationResults.valid.length > 10 && (
                  <div className="preview-note">
                    <small className="text-muted">
                      Showing first 10 records.{' '}
                      {validationResults.valid.length - 10} more valid records
                      ready for import.
                    </small>
                  </div>
                )}
              </div>
            )}

            {/* Invalid Records */}
            {validationResults.invalid.length > 0 && (
              <div className="validation-section">
                <h6 className="text-danger mb-3">
                  <AlertTriangle size={18} className="me-2" />
                  Invalid Records ({validationResults.invalid.length})
                </h6>

                <div className="table-container">
                  <Table striped hover size="sm" className="validation-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Data Preview</th>
                        <th>Validation Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResults.invalid
                        .slice(0, 10)
                        .map((record, index) => (
                          <tr key={index}>
                            <td>
                              <Badge bg="danger">{record.rowIndex}</Badge>
                            </td>
                            <td className="data-preview">
                              <small>
                                {Object.entries(record)
                                  .filter(
                                    ([key]) =>
                                      !['rowIndex', 'errors'].includes(key)
                                  )
                                  .slice(0, 3)
                                  .map(
                                    ([key, value]) =>
                                      `${key}: ${value || 'empty'}`
                                  )
                                  .join(', ')}
                              </small>
                            </td>
                            <td className="error-list">
                              {record.errors.map((error, i) => (
                                <Badge
                                  key={i}
                                  bg="danger"
                                  className="me-1 mb-1 error-badge"
                                >
                                  {error}
                                </Badge>
                              ))}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>

                {validationResults.invalid.length > 10 && (
                  <div className="preview-note">
                    <small className="text-muted">
                      Showing first 10 invalid records.{' '}
                      {validationResults.invalid.length - 10} more records have
                      validation errors.
                    </small>
                  </div>
                )}

                {/* Error Summary */}
                <Alert variant="warning" className="mt-3 error-summary">
                  <Alert.Heading className="h6">
                    Common Issues Found:
                  </Alert.Heading>
                  <ul className="mb-0 small">
                    <li>
                      Missing required fields - ensure all mandatory columns are
                      filled
                    </li>
                    <li>Invalid email formats - use format: user@domain.com</li>
                    <li>
                      Invalid phone numbers - include country code: +1-555-0123
                    </li>
                    <li>Invalid dates - use format: YYYY-MM-DD</li>
                    <li>Invalid amounts - use numeric values only</li>
                  </ul>
                </Alert>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="import-footer">
        {importStep === 'upload' && (
          <Button variant="secondary" onClick={handleClose}>
            <X size={16} className="me-1" />
            Cancel
          </Button>
        )}

        {importStep === 'processing' && (
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel Import
          </Button>
        )}

        {importStep === 'confirm' && (
          <>
            <Button
              variant="outline"
              onClick={() => setImportStep('upload')}
              disabled={isProcessing}
            >
              <RefreshCw size={16} className="me-1" />
              Upload Different File
            </Button>

            <Button
              variant="primary"
              onClick={handleImport}
              disabled={
                !validationResults ||
                validationResults.valid.length === 0 ||
                isProcessing
              }
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} className="me-1" />
                  Import {validationResults?.valid.length || 0} Records
                </>
              )}
            </Button>
          </>
        )}
      </Modal.Footer>

      <style>{`
        .import-info-alert {
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left: 4px solid #3b82f6;
        }

        .template-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
        }

        .template-info-card {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
        }

        .template-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .field-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .upload-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
        }

        .upload-area {
          position: relative;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          background: white;
          transition: all 0.3s ease;
        }

        .upload-area:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .file-input {
          position: absolute;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .file-label {
          display: block;
          padding: 3rem 2rem;
          cursor: pointer;
          margin: 0;
        }

        .upload-content {
          text-align: center;
          pointer-events: none;
        }

        .upload-icon {
          color: #6b7280;
          transition: color 0.3s ease;
        }

        .upload-area:hover .upload-icon {
          color: #3b82f6;
        }

        .instructions-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
        }

        .instruction-steps {
          display: grid;
          gap: 1rem;
        }

        .step {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
          padding-top: 0.25rem;
        }

        .processing-section {
          text-align: center;
          padding: 2rem;
        }

        .progress-enhanced {
          height: 12px;
          border-radius: 6px;
          background: #f1f5f9;
        }

        .progress-enhanced .progress-bar {
          border-radius: 6px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .processing-info {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1rem;
          text-align: left;
          display: inline-block;
          margin-top: 1rem;
        }

        .info-item {
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .info-item:last-child {
          margin-bottom: 0;
        }

        .validation-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
        }

        .validation-summary-alert {
          border-radius: 12px;
          border: none;
          border-left: 4px solid;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          max-height: 300px;
          overflow-y: auto;
        }

        .validation-table {
          margin: 0;
        }

        .validation-table th {
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          color: #374151;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .validation-table td {
          border-color: #f1f5f9;
          vertical-align: middle;
        }

        .data-preview {
          max-width: 200px;
        }

        .error-list {
          max-width: 250px;
        }

        .error-badge {
          font-size: 0.7rem;
          padding: 0.3rem 0.5rem;
        }

        .preview-note {
          text-align: center;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #f1f5f9;
          border-radius: 6px;
        }

        .error-summary {
          border-radius: 8px;
          border: none;
          background: rgba(255, 193, 7, 0.1);
          border-left: 4px solid #ffc107;
        }

        .import-footer {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-radius: 0 0 16px 16px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .template-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .upload-area .file-label {
            padding: 2rem 1rem;
          }

          .instruction-steps {
            gap: 0.75rem;
          }

          .step {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .table-container {
            font-size: 0.8rem;
          }

          .validation-table th,
          .validation-table td {
            padding: 0.5rem 0.25rem;
          }
        }

        @media (max-width: 576px) {
          .upload-area .file-label {
            padding: 1.5rem 0.75rem;
          }

          .upload-icon {
            width: 32px;
            height: 32px;
          }

          .processing-section {
            padding: 1rem;
          }

          .validation-section {
            padding: 1rem;
          }
        }
      `}</style>
    </Modal>
  );
}

export default ImportModal;




