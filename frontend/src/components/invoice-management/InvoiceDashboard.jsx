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

import Button from '../shared/Button.jsx';
import { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Dropdown, Alert, Spinner, Form } from 'react-bootstrap';
import {
  Plus,
  FileText,
  Download,
  Eye,
  Edit,
  Printer,
  Upload,
  Link,
  BarChart3,
  Trash2,
  Power,
} from 'lucide-react';
import { useMultiSelect } from '../../hooks/useMultiSelect.js';
import bulkDeleteService from '../../services/bulkDeleteService.js';
import BulkActionBar from '../shared/BulkActionBar.jsx';
import FilterSection from '../shared/FilterSection.jsx';
import InvoicePrintView from '../proforma-invoice/InvoicePrintView.jsx';
import ImportModal from '../shared/ImportModal.jsx';
import WorkflowTracker from '../shared/WorkflowTracker.jsx';
import { Modal } from 'react-bootstrap';
import { useInvoices } from '../../hooks/useInvoices';
import { downloadPDF, previewPDF } from '../../utils/pdfGenerator.js';
import { workflowConnections } from '../../utils/helpers.jsx';
import masterDataService from '../../services/masterDataService.js';


function InvoiceDashboard({ onAddNew, onEdit, invoicesData, productsData, clientsData, currentUser }) {
  // Use props if provided, otherwise call hooks
  const invoicesHook = useInvoices();
  const { invoices, loading, error, fetchInvoices, createInvoice, updateInvoice, deleteInvoice, toggleInvoiceStatus } = invoicesData || invoicesHook;
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  
  // Multi-select hook
  const multiSelect = useMultiSelect(invoices);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [boxTypeObjects, setBoxTypeObjects] = useState([]);

  useEffect(() => {
    masterDataService.getAllBoxTypes()
      .then(data => {
        if (Array.isArray(data)) setBoxTypeObjects(data);
      })
      .catch(err => console.error('Failed to fetch box types for images:', err));
  }, []);

  const [showPrintView, setShowPrintView] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showWorkflowView, setShowWorkflowView] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    clientName: '',
    country: '',
    status: '',
    dateRange: { start: '', end: '' },
  });

  // Helper function to calculate totals from product_lines
  const calculateProductLineTotals = (invoice) => {
    if (!invoice) return { pallets: 0, sqm: 0, amount: 0 };
    
    let productLines = invoice.productLines || invoice.product_lines || [];
    
    // Parse if it's a string
    if (typeof productLines === 'string') {
      try {
        productLines = JSON.parse(productLines);
      } catch (e) {
        productLines = [];
      }
    }
    
    if (!Array.isArray(productLines) || productLines.length === 0) {
      return {
        pallets: invoice.pallets || 0,
        sqm: invoice.total_sqm || 0,
        amount: invoice.total_amount || 0
      };
    }

    // Calculate from product lines
    let totalPallets = 0;
    let totalSqm = 0;
    let totalAmount = 0;

    const uniquePallets = new Set();
    productLines.forEach(line => {
      if (line.pallets) uniquePallets.add(line.pallets);
      if (line.sqm) totalSqm += parseFloat(line.sqm) || 0;
      if (line.amount) totalAmount += parseFloat(line.amount) || 0;
    });
    
    totalPallets = Math.max(...uniquePallets, 0);

    // Use calculated values if > 0, otherwise use stored values
    return {
      pallets: totalPallets > 0 ? totalPallets : (invoice.pallets || 0),
      sqm: totalSqm > 0 ? totalSqm : (invoice.total_sqm || 0),
      amount: totalAmount > 0 ? totalAmount : (invoice.total_amount || 0)
    };
  };

  useEffect(() => {
    // Ensure invoices is always an array
    let filtered = Array.isArray(invoices) ? invoices : [];

    if (filters.search) {
      filtered = filtered.filter(
        (invoice) =>
          (invoice.invoiceNo || invoice.invoice_no || '')
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          (invoice.clientName || invoice.client_name || '')
            .toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    if (filters.clientName) {
      filtered = filtered.filter((invoice) =>
        (invoice.clientName || invoice.client_name || '')
          .toLowerCase()
          .includes(filters.clientName.toLowerCase())
      );
    }

    if (filters.country) {
      filtered = filtered.filter(
        (invoice) => (invoice.country || '') === filters.country
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (invoice) => (invoice.status || '') === filters.status
      );
    }

    setFilteredInvoices(filtered);
  }, [filters, invoices]);

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      await bulkDeleteService.deleteInvoices(multiSelect.getSelectedIds());
      multiSelect.clearSelection();
      await fetchInvoices(); // Refresh data
      alert('Selected invoices deleted successfully');
    } catch (err) {
      alert('Bulk delete failed: ' + err.message);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      Draft: 'secondary',
      Sent: 'info',
      Accepted: 'success',
      Rejected: 'danger',
      Expired: 'warning',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleExport = (format) => {
    if (format === 'pdf') {
      const dataStr = filteredInvoices
        .map(
          (invoice) =>
            `${invoice.invoiceNo || invoice.invoice_no},${invoice.date},${invoice.clientName || invoice.client_name},${invoice.country},${invoice.pallets},${invoice.total_sqm},${invoice.total_amount},${invoice.status}`
        )
        .join('\n');

      const dataBlob = new Blob(
        [
          `Invoice No,Date,Client Name,Country,Pallets,Total SQM,Amount,Status\n${dataStr}`,
        ],
        { type: 'text/csv' }
      );
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      const dataStr = filteredInvoices
        .map(
          (invoice) =>
            `${invoice.invoiceNo || invoice.invoice_no}\t${invoice.date}\t${invoice.clientName || invoice.client_name}\t${invoice.country}\t${invoice.pallets}\t${invoice.total_sqm}\t${invoice.total_amount}\t${invoice.status}`
        )
        .join('\n');

      const dataBlob = new Blob(
        [
          `Invoice No\tDate\tClient Name\tCountry\tPallets\tTotal SQM\tAmount\tStatus\n${dataStr}`,
        ],
        { type: 'text/tab-separated-values' }
      );
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const printViewRef = useRef(null);

  const handleViewPDF = async () => {
    if (filteredInvoices.length > 0) {
      const invoice = filteredInvoices[0];
      setSelectedInvoice(invoice);
      setShowPrintView(true);
      
      // Wait for component to render, then show PDF preview
      setTimeout(async () => {
        if (printViewRef.current) {
          try {
            const result = await previewPDF(printViewRef.current, {
              format: 'a4',
              orientation: 'portrait',
            });
            if (result.success) {
            } else {
              alert('Failed to open PDF preview: ' + result.message);
            }
          } catch (error) {
            console.error('❌ Error generating PDF preview:', error);
            alert('Failed to generate PDF: ' + error.message);
          }
        }
      }, 500);
    }
  };

  const handleViewInvoice = async (invoice) => {
    try {
      // Fetch full invoice details from backend
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`/api/proforma-invoices/${invoice.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch invoice: ${response.status}`);
      }

      const data = await response.json();
      const fullInvoice = data.data;

      // Parse product_lines if it's a string
      if (fullInvoice.product_lines && typeof fullInvoice.product_lines === 'string') {
        try {
          fullInvoice.product_lines = JSON.parse(fullInvoice.product_lines);
        } catch (e) {
          fullInvoice.product_lines = [];
        }
      }

      // Transform snake_case to camelCase for display
      const transformedInvoice = {};
      for (const [key, value] of Object.entries(fullInvoice)) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        transformedInvoice[camelKey] = value;
      }

      setSelectedInvoice(transformedInvoice);
      setShowPrintView(true);
    } catch (err) {
      console.error('❌ Error viewing invoice:', err);
      alert('Failed to view invoice: ' + err.message);
    }
  };

  const handleDownloadPDF = async (invoice) => {
    if (!invoice) return;
    setSelectedInvoice(invoice);
    setShowPrintView(true);
    
    // Wait for component to render, then download PDF
    setTimeout(async () => {
      if (printViewRef.current) {
        try {
          const filename = `Invoice_${invoice.invoiceNo || 'document'}_${new Date().toISOString().split('T')[0]}.pdf`;
          const result = await downloadPDF(printViewRef.current, filename, {
            format: 'a4',
            orientation: 'portrait',
          });
          if (result.success) {
            setShowPrintView(false);
          } else {
            alert('Failed to download PDF: ' + result.message);
          }
        } catch (error) {
          console.error('❌ Error downloading PDF:', error);
          alert('Failed to download PDF: ' + error.message);
        }
      }
    }, 500);
  };

  const handlePrintInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPrintView(true);
    
    // Wait for component to render, then print
    setTimeout(() => {
      if (printViewRef.current) {
        try {
          const printWindow = window.open('', '_blank');
          const printContent = printViewRef.current.innerHTML;
          const styles = `
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .invoice-print-view { width: 100%; }
              }
            </style>
          `;
          printWindow.document.write('<!DOCTYPE html><html><head>' + styles + '</head><body>');
          printWindow.document.write(printContent);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
        } catch (error) {
          console.error('❌ Error printing invoice:', error);
          alert('Failed to print: ' + error.message);
        }
      }
    }, 500);
  };

  const handleImportData = async (importData) => {
    // Enhanced import with complete field support
    const newInvoices = importData.map((data, index) => ({
      id: Math.max(...invoices.map((i) => i.id), 0) + index + 1,
      invoiceNo:
        data.invoiceNo ||
        `PI/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(
          new Date().getFullYear()
        ).slice(-2)}/${String(Math.floor(Math.random() * 1000) + 1).padStart(
          3,
          '0'
        )}`,
      date: data.date || new Date().toISOString().split('T')[0],
      clientName: data.clientName || '',
      client: data.clientName || '',
      country: data.country || '',
      consignee: data.consignee || '',
      buyer: data.buyer || '',
      portOfLoading: data.portOfLoading || 'MUNDRA PORT',
      portOfDischarge: data.portOfDischarge || '',
      finalDestination: data.finalDestination || data.country || '',
      tariffCode: data.tariffCode || '',
      currency: data.currency || 'INR',
      palletType: data.palletType || 'Normal Wooden Pallet',
      tilesBack: data.tilesBack || 'WITH MADE IN INDIA',
      boxesMarking: data.boxesMarking || 'WITH',
      boxType: data.boxType || 'NON BRANDED BOXES',
      fumigation: data.fumigation || 'YES',
      legalisation: data.legalisation || 'YES',
      otherInstructions: data.otherInstructions || '',
      amount: parseFloat(data.amount) || 0,
      totalAmount: parseFloat(data.amount) || 0,
      status: data.status || 'Draft',
      pallets: 0,
      totalSQM: 0,
      productLines: [],
      importedAt: new Date().toISOString(),
      importBatch: `BATCH_${Date.now()}`,
    }));

    try {
      // Persist imported invoices via API and refresh list
      for (const inv of newInvoices) {
        if (createInvoice) await createInvoice(inv);
      }
      if (fetchInvoices) await fetchInvoices();
      setShowImportModal(false);
      alert('Imported invoices successfully');
    } catch (err) {
      console.error('Error importing invoices:', err);
      alert('Failed to import invoices: ' + (err.message || err));
    }
  };

  const handleViewWorkflow = (invoice) => {
    const workflowData = workflowConnections.getRelatedDocuments(
      invoice.invoiceNo
    );
    setSelectedWorkflow({
      invoice,
      ...workflowData,
      status: workflowConnections.getWorkflowStatus(invoice.invoiceNo),
    });
    setShowWorkflowView(true);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteInvoice(invoiceId);
        alert('Invoice deleted successfully');
      } catch (err) {
        console.error('❌ Delete error:', err);
        alert('Failed to delete invoice: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleToggleInvoiceStatus = async (invoiceId) => {
    try {
      await toggleInvoiceStatus(invoiceId);
      alert('Invoice status updated successfully');
    } catch (err) {
      console.error('❌ Toggle status error:', err);
      alert('Failed to toggle invoice status: ' + (err.response?.data?.message || err.message));
    }
  };

  const canEdit = currentUser && ['super_admin', 'company_admin', 'sales_manager', 'sales_executive'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading invoices...</p>
      </div>
    );
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Proforma Invoice Dashboard</h2>
          <p className="text-muted">
            Manage proforma invoices with complete workflow tracking
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible>
          {error}
        </Alert>
      )}

      <FilterSection filters={filters} onFiltersChange={setFilters} />

      <BulkActionBar
        selectedCount={multiSelect.getSelectedCount()}
        onSelectAll={(shouldSelect) => {
          if (shouldSelect) {
            multiSelect.toggleSelectAll(filteredInvoices);
          } else {
            multiSelect.clearSelection();
          }
        }}
        onClearSelection={multiSelect.clearSelection}
        onDelete={handleBulkDelete}
        isLoading={isSaving}
        selectAllChecked={multiSelect.selectAll}
        totalItems={filteredInvoices.length}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Proforma Invoices ({filteredInvoices.length})
          </h5>
          <div className="d-flex gap-2">
            <Dropdown>
              <Dropdown.Toggle variant="outline" size="sm">
                <Download size={16} className="me-1" />
                Export Data
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => handleExport('excel')}>
                  Export as Excel
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
            >
              <Upload size={16} className="me-1" />
              Import Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewPDF}>
              <FileText size={16} className="me-1" />
              View PDF Format
            </Button>
            <Button variant="primary" size="sm" onClick={onAddNew}>
              <Plus size={16} className="me-1" />
              Add New Invoice
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead>
                <tr>
                  <th style={{width: '40px'}}>
                    <Form.Check
                      type="checkbox"
                      checked={multiSelect.selectAll}
                      onChange={() => multiSelect.toggleSelectAll(filteredInvoices)}
                      title="Select All"
                    />
                  </th>
                  <th>Proforma Invoice No.</th>
                  <th>Date</th>

                  <th>Client Firm Name</th>
                  <th>Destination Country</th>
                  <th>No. of Pallets</th>
                  <th>Total Quantity (SQM)</th>
                  <th>Amount (USD)</th>
                  <th>Status</th>

                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => {
                    const totals = calculateProductLineTotals(invoice);
                    return (
                      <tr key={invoice.id} className={multiSelect.isSelected(invoice.id) ? 'table-active' : ''}>
                        <td data-label="Select">
                          <Form.Check
                            type="checkbox"
                            checked={multiSelect.isSelected(invoice.id)}
                            onChange={() => multiSelect.toggleSelect(invoice.id)}
                          />
                        </td>
                        <td className="fw-medium" data-label="Proforma Invoice No.">{invoice.invoiceNo || invoice.invoice_no}</td>
                        <td data-label="Date">{invoice.date}</td>

                        <td data-label="Client">{invoice.clientName || invoice.client_name || 'N/A'}</td>
                        <td data-label="Country">{invoice.country || 'N/A'}</td>
                        <td data-label="Pallets">{totals.pallets || 0}</td>
                        <td data-label="Quantity">{totals.sqm || 0}</td>
                        <td data-label="Amount">${(totals.amount || 0).toLocaleString()}</td>
                        <td data-label="Status">{getStatusBadge(invoice.status || 'Unknown')}</td>

                        <td data-label="Actions">
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInvoice(invoice)}
                            >
                              <Eye size={14} />
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onEdit(invoice)}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  variant={invoice.status === 'Accepted' || invoice.status === 'Sent' ? 'outline-warning' : 'outline-success'}
                                  size="sm"
                                  onClick={() => handleToggleInvoiceStatus(invoice.id)}
                                  title="Toggle Status"
                                >
                                  <Power size={14} />
                                </Button>
                              </>
                            )}
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                title="Delete Invoice"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(invoice)}
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintInvoice(invoice)}
                              title="Print Invoice"
                            >
                              <Printer size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center py-4 text-muted">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Print/PDF View Modal */}
      {showPrintView && selectedInvoice && (
        <div
          className="print-modal-overlay no-print"
          onClick={() => setShowPrintView(false)}
        >
          <div
            className="print-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="print-modal-header no-print">
              <h5>Invoice Preview - {selectedInvoice.invoiceNo}</h5>
              <div>
                <Button
                  variant="primary"
                  onClick={() => {
                    const printContent = document.querySelector('.invoice-print-view');
                    if (printContent) {
                      window.print();
                    }
                  }}
                  className="me-2"
                >
                  <Printer size={16} className="me-1" />
                  Print
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowPrintView(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <InvoicePrintView 
              ref={printViewRef} 
              invoiceData={selectedInvoice} 
              boxTypeImageUrl={(() => {
                const searchVal = String(selectedInvoice?.boxType || selectedInvoice?.box_type || '').trim().toLowerCase();
                const matched = boxTypeObjects?.find(b => String(b.value || b).trim().toLowerCase() === searchVal);
                return matched?.image_url || matched?.imageUrl;
              })()}
            />
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleImportData}
        moduleType="proforma-invoice-enhanced"
      />

      {/* Workflow View Modal */}
      {showWorkflowView && selectedWorkflow && (
        <Modal
          show={showWorkflowView}
          onHide={() => setShowWorkflowView(false)}
          size="xl"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <Link size={20} className="me-2" />
              Workflow Status - {selectedWorkflow.invoice.invoiceNo}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <WorkflowTracker
              piNumber={selectedWorkflow.invoice.invoiceNo}
              onNavigate={(view) => {
                setShowWorkflowView(false);
                // Handle navigation based on view
              }}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowWorkflowView(false)}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}

export default InvoiceDashboard;
