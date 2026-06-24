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
import { Modal, Form, Button, Row, Col, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Save, X, Info, Edit } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { accountEntryService } from '../../services/accountEntryService';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { formatPrice } from '../../utils/formatters';

function AccountEntryForm({ entry, onSave, onCancel, viewOnly = false }) {
  const { clients } = useClients();
  const [formData, setFormData] = useState({
    entryNo: '',
    type: 'Receivable',
    partyName: '',
    invoiceNo: '',
    amount: 0,
    status: 'Pending',
    dueDate: '',
    paymentMode: '',
    date: new Date().toLocaleDateString('en-CA'),
    remarks: '',
  });
  const [errors, setErrors] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const entryTypes = ['Receivable', 'Payable'];
  const statuses = ['Pending', 'Paid', 'Overdue', 'Partial'];
  const paymentModes = [
    'Bank Transfer',
    'Cash',
    'Cheque',
    'Credit Card',
    'Online Payment',
    'LC (Letter of Credit)',
  ];

  useEffect(() => {
    if (entry) {
      setFormData({
        entryNo: entry.entryNo || '',
        type: entry.type || 'Receivable',
        partyName: entry.partyName || '',
        invoiceNo: entry.invoiceNo || '',
        amount: entry.amount || 0,
        status: entry.status || 'Pending',
        dueDate: entry.dueDate || '',
        paymentMode: entry.paymentMode || '',
        date: entry.date || new Date().toLocaleDateString('en-CA'),
        remarks: entry.remarks || '',
      });
    } else {
      const newEntryNo = `ACC/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}/Auto`;
      setFormData((prev) => ({
        ...prev,
        entryNo: newEntryNo,
      }));
    }
  }, [entry]);

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

    // Fetch invoices when party name changes
    if (field === 'partyName' && value) {
      fetchInvoicesByPartyName(value);
    } else if (field === 'partyName' && !value) {
      setInvoices([]);
    }
  };

  const fetchInvoicesByPartyName = async (partyName) => {
    try {
      setLoadingInvoices(true);
      const response = await accountEntryService.getInvoicesByPartyName(partyName);
      const invoiceData = response?.data?.data || [];
      
      // Data already comes in camelCase from the API, just use it as-is
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.partyName) {
      newErrors.partyName = 'Party name is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.invoiceNo) {
      newErrors.invoiceNo = 'Linked Invoice is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required';
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
    <Modal show={true} onHide={onCancel} size="lg" backdrop="static" centered className="finance-modal">
      <Modal.Header closeButton className="bg-primary text-white p-4 border-0">
        <Modal.Title className="fw-bold d-flex align-items-center">
          <div className="bg-white bg-opacity-25 p-2 rounded-3 me-3">
            <Save size={24} className="text-white" />
          </div>
          {viewOnly ? 'View Account Entry' : (entry ? 'Edit Account Entry' : 'Create Account Entry')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 bg-light-subtle">
        <Form onSubmit={handleSubmit}>
          {/* Transaction Summary Section */}
          <div className="bg-white p-4 rounded-4 shadow-sm mb-4 border border-primary border-opacity-10">
            <h6 className="fw-bold text-primary text-uppercase small tracking-wider mb-4 border-bottom pb-2">
              Transaction Details
            </h6>
            <Row className="g-4">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">Entry No.</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.entryNo}
                    readOnly
                    className="bg-light border-0 fw-bold fs-6 text-primary py-2"
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">Entry Type</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    disabled={viewOnly}
                    className="form-control-enhanced py-2 border-1 fw-medium"
                    style={{ borderRadius: '10px' }}
                  >
                    {entryTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Transaction Date is mandatory.</Tooltip>}>
                    <Form.Label className="small fw-bold text-danger text-uppercase tracking-wider" style={{cursor: 'help'}}>
                      Transaction Date * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Control
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    isInvalid={!!errors.date}
                    disabled={viewOnly}
                    className="form-control-enhanced py-2 border-1"
                    style={{ borderRadius: '10px' }}
                  />
                  <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Party & Financials Section */}
          <div className="bg-white p-4 rounded-4 shadow-sm mb-4 border border-primary border-opacity-10">
            <h6 className="fw-bold text-primary text-uppercase small tracking-wider mb-4 border-bottom pb-2">
              Party & Financials
            </h6>
            <Row className="g-4">
              <Col md={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Party / Client is mandatory.</Tooltip>}>
                    <Form.Label className="small fw-bold text-danger text-uppercase tracking-wider" style={{cursor: 'help'}}>
                      Party / Client * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Select
                    value={formData.partyName}
                    onChange={(e) => handleInputChange('partyName', e.target.value)}
                    isInvalid={!!errors.partyName}
                    disabled={viewOnly}
                    className="form-control-enhanced py-2 border-1 fw-bold"
                    style={{ borderRadius: '10px' }}
                  >
                    <option value="" disabled hidden>Select Party</option>
                    {clients.filter(c => c.status !== 'Inactive').map((client) => (
                      <option key={client.id} value={client.clientName}>
                        {client.clientName}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.partyName}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Linked Invoice is mandatory.</Tooltip>}>
                    <Form.Label className="small fw-bold text-danger text-uppercase tracking-wider" style={{cursor: 'help'}}>
                      Linked Invoice * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  {formData.partyName ? (
                    <Form.Select
                      value={formData.invoiceNo}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleInputChange('invoiceNo', val);
                        if (val) {
                          const selectedInvoice = invoices.find(inv => (inv.invoiceNo || inv.invoice_no) === val);
                          if (selectedInvoice) {
                            handleInputChange('amount', selectedInvoice.total_amount || selectedInvoice.amount || 0);
                          }
                        }
                      }}
                      isInvalid={!!errors.invoiceNo}
                      disabled={viewOnly || loadingInvoices}
                      className="form-control-enhanced py-2 border-1 fw-medium"
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="" disabled hidden>Select Invoice</option>
                      {invoices && invoices.length > 0 ? (
                        invoices.map((invoice) => (
                          <option key={invoice.id} value={invoice.invoiceNo || invoice.invoice_no}>
                            {invoice.invoiceNo || invoice.invoice_no} ({formatPrice(invoice.total_amount || invoice.amount, 'USD')})
                          </option>
                        ))
                      ) : (
                        <option disabled>No open invoices found</option>
                      )}
                    </Form.Select>
                  ) : (
                    <Form.Control
                      type="text"
                      placeholder="Select party name first"
                      disabled={true}
                      className="bg-light-subtle border-1 py-2 italic"
                      style={{ borderRadius: '10px', fontStyle: 'italic' }}
                    />
                  )}
                  <Form.Control.Feedback type="invalid">{errors.invoiceNo}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Amount is mandatory.</Tooltip>}>
                    <Form.Label className="small fw-bold text-danger text-uppercase tracking-wider" style={{cursor: 'help'}}>
                      Amount (USD) * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-1 fw-bold text-muted">$</span>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      isInvalid={!!errors.amount}
                      disabled={viewOnly}
                      className="form-control-enhanced py-2 border-1 fw-bold text-primary fs-5"
                      style={{ borderRadius: '0 10px 10px 0' }}
                    />
                  </div>
                  <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Payment Mode is mandatory.</Tooltip>}>
                    <Form.Label className="small fw-bold text-danger text-uppercase tracking-wider" style={{cursor: 'help'}}>
                      Payment Mode * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Select
                    value={formData.paymentMode}
                    onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                    isInvalid={!!errors.paymentMode}
                    disabled={viewOnly}
                    className="form-control-enhanced py-2 border-1"
                    style={{ borderRadius: '10px' }}
                  >
                    <option value="" disabled hidden>Select Mode</option>
                    {paymentModes.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.paymentMode}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    disabled={viewOnly}
                    className={`form-control-enhanced py-2 border-1 fw-bold ${
                      formData.status === 'Paid' ? 'text-success' : 
                      formData.status === 'Overdue' ? 'text-danger' : 'text-warning'
                    }`}
                    style={{ borderRadius: '10px' }}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Additional Info Section */}
          <div className="bg-white p-4 rounded-4 shadow-sm border border-primary border-opacity-10">
            <h6 className="fw-bold text-primary text-uppercase small tracking-wider mb-4 border-bottom pb-2">
              Additional Information
            </h6>
            <Row className="g-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    disabled={viewOnly}
                    className="form-control-enhanced py-2 border-1"
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">Remarks / Internal Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    placeholder="Enter transaction details, bank references, or notes..."
                    disabled={viewOnly}
                    className="form-control-enhanced py-2 border-1"
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {!viewOnly && Object.keys(errors).length > 0 && (
            <Alert variant="danger" className="mt-4 border-0 shadow-sm d-flex align-items-center rounded-3">
              <X size={18} className="me-2" />
              <span className="small fw-bold">Please correct the highlighted errors before saving.</span>
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer className="p-4 bg-white border-0 d-flex justify-content-end gap-3 rounded-bottom-4">
        <Button 
          variant="outline-secondary" 
          onClick={onCancel}
          className="px-4 py-2 fw-bold"
          style={{ borderRadius: '10px', minWidth: '120px' }}
        >
          {viewOnly ? 'Close' : 'Discard'}
        </Button>
        {!viewOnly && (
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            className="px-5 py-2 fw-bold shadow-lg"
            style={{ borderRadius: '10px', minWidth: '180px' }}
          >
            <Save size={18} className="me-2" />
            {entry ? 'Update Entry' : 'Create Entry'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default AccountEntryForm;



