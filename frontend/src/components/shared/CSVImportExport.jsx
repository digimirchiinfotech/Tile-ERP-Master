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
import { Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * CSV Import/Export Component
 * Allows users to bulk import/export products, clients, and leads
 */
function CSVImportExport({ currentUser, onRefresh, openImportModal = false, openExportModal = false, onlyModule = null }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [module, setModule] = useState(onlyModule || 'products');
  const [csvFile, setCsvFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  const modules = [
    { value: 'products', label: 'Products' },
    { value: 'clients', label: 'Clients' },
    { value: 'leads', label: 'Leads' },
    { value: 'export-invoices', label: 'Export Invoices' },
    { value: 'packing-lists', label: 'Packing Lists' },
    { value: 'shipping-instructions', label: 'Shipping Instructions' },
    { value: 'bills-of-lading', label: 'Bills of Lading' },
    { value: 'support-tickets', label: 'Support Tickets' }
  ];

  const getModuleLabel = (m) => {
    const found = modules.find(x => x.value === m);
    return found ? found.label : m;
  };

  const getTemplateCols = (m) => {
    switch(m) {
      case 'export-invoices': return 'invoice_no,invoice_date,client_name,total_amount';
      case 'packing-lists': return 'packing_list_no,invoice_no,total_boxes,total_pallets';
      case 'shipping-instructions': return 'instruction_no,invoice_ref,freight_forwarder';
      case 'products': return 'name,category,description,price';
      case 'clients': return 'name,city,state,country,email,phone';
      case 'leads': return 'title,client_name,city,description';
      case 'support-tickets': return 'ticket_id,subject,description,category,priority,status';
      default: return 'id,name';
    }
  };

  // allow parent components to open import/export modals
  useEffect(() => {
    if (openImportModal) setShowImportModal(true);
  }, [openImportModal]);

  useEffect(() => {
    if (openExportModal) setShowExportModal(true);
  }, [openExportModal]);

  /**
   * Handle CSV file upload and import
   */
  const handleImport = async () => {
    try {
      setImportLoading(true);
      setError(null);
      setImportResult(null);

      if (!csvFile) {
        setError('Please select a CSV file');
        setImportLoading(false);
        return;
      }

      const fileContent = await csvFile.text();
      const token = localStorage.getItem('access_token');
      const selectedCompanyId = localStorage.getItem('selected_company_id');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (selectedCompanyId) {
        headers['x-company-id'] = selectedCompanyId;
        headers['x-selected-company-id'] = selectedCompanyId;
      }

      const response = await fetch(`${(import.meta.env.DEV || import.meta.env.MODE === 'development' ? '/api' : 'https://tile-erp-master-production.railway.app/api')}/import/${module}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ csvData: fileContent })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.details?.join('\n') || result.error || 'Import failed');
      } else {
        setImportResult({
          success: true,
          message: result.message,
          count: result.data?.length || 0
        });
        setCsvFile(null);
        onRefresh?.();
        setTimeout(() => setShowImportModal(false), 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  /**
   * Handle CSV export
   */
  const handleExport = async () => {
    try {
      setExportLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      const selectedCompanyId = localStorage.getItem('selected_company_id');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      if (selectedCompanyId) {
        headers['x-company-id'] = selectedCompanyId;
        headers['x-selected-company-id'] = selectedCompanyId;
      }

      const response = await fetch(`${(import.meta.env.DEV || import.meta.env.MODE === 'development' ? '/api' : 'https://tile-erp-master-production.railway.app/api')}/export/${module}`, {
        headers: headers
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${module}-${new Date().toLocaleDateString('en-CA')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      {/* Import/Export Buttons */}
      <div className="csv-actions d-flex gap-2 p-0 bg-transparent border-0 shadow-none mb-0">
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => setShowImportModal(true)}
          disabled={!['sales_manager', 'company_admin', 'super_admin'].includes(currentUser?.role)}
          className="btn btn-primary" style={{padding: "8px 12px", fontSize: "13px", height: "36px", minWidth: "120px", whiteSpace: "nowrap"}}
        >
          <Upload size={16} className="me-2" />
          Import CSV
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowExportModal(true)}
          className="btn btn-outline-primary" style={{padding: "8px 12px", fontSize: "13px", height: "36px", minWidth: "120px", whiteSpace: "nowrap"}}
        >
          <Download size={16} className="me-2" />
          Export CSV
        </Button>
      </div>

      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => { setShowImportModal(false); setError(null); setCsvFile(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Upload size={20} className="me-2" />
            Import {module}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="secondary" className="mb-3">
              <AlertCircle size={16} className="me-2" />
              {error}
            </Alert>
          )}

          {importResult?.success && (
            <Alert variant="primary" className="mb-3">
              <CheckCircle size={16} className="me-2" />
              {importResult.message} ({importResult.count} records)
            </Alert>
          )}

          {!importResult?.success && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Select Module</Form.Label>
                {onlyModule ? (
                  <Form.Control plaintext readOnly defaultValue={getModuleLabel(module)} />
                ) : (
                  <Form.Select 
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    disabled={importLoading}
                  >
                    {modules.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>CSV File</Form.Label>
                <Form.Control
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0])}
                  disabled={importLoading}
                />
                <Form.Text className="text-muted">
                  Required columns: {getTemplateCols(module)}
                </Form.Text>
              </Form.Group>

              <div className="mb-3">
                <small className="text-muted d-block mb-2">
                  <strong>CSV Format:</strong>
                </small>
                <code className="d-block p-2 bg-light">{getTemplateCols(module)}</code>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => { setShowImportModal(false); setError(null); setCsvFile(null); }}
          >
            Close
          </Button>
          {!importResult?.success && (
            <Button 
              variant="primary" 
              onClick={handleImport}
              disabled={!csvFile || importLoading}
            >
              {importLoading && <Spinner size="sm" className="me-2" />}
              Import
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Export Modal */}
      <Modal show={showExportModal} onHide={() => { setShowExportModal(false); setError(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Download size={20} className="me-2" />
            Export {module}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="secondary" className="mb-3">
              <AlertCircle size={16} className="me-2" />
              {error}
            </Alert>
          )}

          <div className="text-center py-4">
            <FileText size={48} className="text-primary mb-3" />
            <p>
              Export all <strong>{module}</strong> data as CSV format
            </p>
            <small className="text-muted">
              You'll be able to import this file later to migrate data
            </small>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Select Module</Form.Label>
            {onlyModule ? (
              <Form.Control plaintext readOnly defaultValue={getModuleLabel(module)} />
            ) : (
              <Form.Select 
                value={module}
                onChange={(e) => setModule(e.target.value)}
                disabled={exportLoading}
              >
                {modules.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => { setShowExportModal(false); setError(null); }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading && <Spinner size="sm" className="me-2" />}
            Download CSV
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .csv-actions {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
      `}</style>
    </>
  );
}

export default CSVImportExport;




