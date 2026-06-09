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
} from 'react-bootstrap';
import { Save, X, Plus, Trash2, Edit } from 'lucide-react';
import { useClients } from '../../hooks/useClients.js';
import { useProducts } from '../../hooks/useProducts.js';
import { useInvoices } from '../../hooks/useInvoices.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';

function ClientOrderForm({ order, onSave, onCancel }) {
  const { clients } = useClients();
  const { products } = useProducts();
  const { invoices } = useInvoices();
  
  const [formData, setFormData] = useState({
    clientName: '',
    orderDate: new Date().toLocaleDateString('en-CA'),
    orderValue: 0,
    status: 'Pending',
    linkedInvoice: '',
    country: '',
    productLines: [],
    shippingAddress: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const orderStatuses = [
    'Pending',
    'Processing',
    'Dispatched',
    'Delivered',
    'Cancelled',
  ];

  useEffect(() => {
    if (order) {
      setFormData({
        clientName: order.clientName || order.supplierName || order.piClient || '',
        orderDate: order.orderDate || order.date || new Date().toLocaleDateString('en-CA'),
        orderValue: order.orderValue || order.totalAmount || order.amount || 0,
        status: order.status || 'Pending',
        linkedInvoice: order.invoiceRef || order.invoice_ref || order.linkedInvoice || order.piReference || '',
        country: order.country || order.supplierCountry || '',
        productLines: (order.productLines || []).map(p => ({
          ...p,
          productName: p.productName || p.product || p.itemDescription || '',
          size: p.size || '',
          surface: p.surface || '',
          quantity: p.quantity || p.totalBoxes || 0,
          unitPrice: p.unitPrice || p.rate || 0,
          totalValue: p.totalValue || p.amount || 0,
        })),
        shippingAddress: order.shippingAddress || order.supplierAddress || order.address || '',
        notes: order.notes || '',
      });
    }
  }, [order]);

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

  const handleClientChange = (clientName) => {
    const selectedClient = clients.find(
      (client) => client.clientName === clientName
    );
    if (selectedClient) {
      setFormData((prev) => ({
        ...prev,
        clientName,
        country: selectedClient.country,
        shippingAddress:
          selectedClient.address || selectedClient.consignee || '',
      }));
    } else {
      handleInputChange('clientName', clientName);
    }
  };

  const handleInvoiceChange = (invoiceValue) => {
    handleInputChange('linkedInvoice', invoiceValue);
    if (!invoiceValue) return;

    const selectedInvoice = invoices.find(inv => (inv.invoiceNo || inv.invoice_no || inv.id).toString() === invoiceValue.toString());
    if (selectedInvoice) {
      let rawLines = selectedInvoice.productLines || selectedInvoice.product_lines || [];
      if (typeof rawLines === 'string') {
        try { rawLines = JSON.parse(rawLines); } catch(e) { rawLines = []; }
      }
      
      if (Array.isArray(rawLines) && rawLines.length > 0) {
        const newProductLines = rawLines.map((p, index) => {
          const qty = parseFloat(p.quantity || p.totalBoxes || p.qty || 0);
          const price = parseFloat(p.unitPrice || p.rate || p.price || 0);
          return {
            id: Date.now() + index,
            productName: p.productName || p.product || p.itemDescription || '',
            size: p.size || '',
            surface: p.surface || '',
            quantity: qty,
            unitPrice: price,
            totalValue: parseFloat(p.totalValue || p.amount) || (qty * price),
          };
        });

        const newOrderValue = newProductLines.reduce((sum, p) => sum + p.totalValue, 0);

        setFormData((prev) => ({
          ...prev,
          productLines: newProductLines,
          orderValue: newOrderValue,
        }));
      }
    }
  };

  const handleAddProductLine = () => {
    const newProduct = {
      id: Date.now(),
      productName: '',
      size: '',
      surface: '',
      quantity: 0,
      unitPrice: 0,
      totalValue: 0,
    };
    setFormData((prev) => ({
      ...prev,
      productLines: [...prev.productLines, newProduct],
    }));
  };

  const handleDeleteProductLine = (index) => {
    setFormData((prev) => ({
      ...prev,
      productLines: prev.productLines.filter((_, i) => i !== index),
    }));
  };

  const handleProductLineChange = (index, field, value) => {
    const newProductLines = [...formData.productLines];
    const product = { ...newProductLines[index] };

    if (field === 'productName') {
      const selectedProduct = products.find((p) => p.name === value);
      if (selectedProduct) {
        product.productName = value;
        product.size = selectedProduct.size;
        product.surface = selectedProduct.surface;
      } else {
        product[field] = value;
      }
    } else {
      product[field] = ['quantity', 'unitPrice'].includes(field)
        ? value
        : value;
    }

    // Calculate total value
    product.totalValue = product.quantity * product.unitPrice;

    newProductLines[index] = product;
    setFormData((prev) => ({
      ...prev,
      productLines: newProductLines,
      orderValue: newProductLines.reduce((sum, p) => sum + p.totalValue, 0),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.orderDate) {
      newErrors.orderDate = 'Order date is required';
    }

    if (formData.productLines.length === 0) {
      newErrors.productLines = 'At least one product line is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const selectedClient = clients.find(c => c.clientName === formData.clientName);
      
      const orderData = {
        order_no: order ? (order.order_no || order.orderId) : `CO/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`,
        date: formData.orderDate,
        client_id: selectedClient?.id,
        invoice_ref: formData.linkedInvoice,
        total_amount: formData.orderValue,
        status: formData.status,
        country: formData.country,
        product_lines: formData.productLines,
        shipping_address: formData.shippingAddress,
        notes: formData.notes
      };
      onSave(orderData);
    }
  };

  return (
    <Modal show={true} onHide={onCancel} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {order ? 'Edit Client Order' : 'Create Client Order'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            {/* Order Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Order Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Client Firm Name *</Form.Label>
                        <Form.Select
                          value={formData.clientName}
                          onChange={(e) => handleClientChange(e.target.value)}
                          isInvalid={!!errors.clientName}
                        >
                          <option value="">Select Client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.clientName}>
                              {client.clientName}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.clientName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Order Date *</Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.orderDate}
                          onChange={(e) =>
                            handleInputChange('orderDate', e.target.value)
                          }
                          isInvalid={!!errors.orderDate}
                          placeholder={FIELD_PLACEHOLDERS.date.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.orderDate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Order Status</Form.Label>
                        <Form.Select
                          value={formData.status}
                          onChange={(e) =>
                            handleInputChange('status', e.target.value)
                          }
                        >
                          {orderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Linked Invoice</Form.Label>
                        <Form.Select
                          value={formData.linkedInvoice}
                          onChange={(e) => handleInvoiceChange(e.target.value)}
                          disabled={!formData.clientName}
                        >
                          <option value="">{formData.clientName ? "Select Invoice" : "Select a client first"}</option>
                          {invoices
                            .filter(inv => formData.clientName && (inv.clientName === formData.clientName || inv.client_name === formData.clientName || inv.client === formData.clientName) && (inv.status !== 'Revised') && (inv.status !== 'Deleted'))
                            .map((inv) => (
                            <option key={inv.id} value={inv.invoiceNo || inv.invoice_no || inv.id}>
                              {inv.invoiceNo || inv.invoice_no || `Invoice #${inv.id}`}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Country</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.country}
                          readOnly
                          className="bg-light"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Order Value (Auto-calculated)</Form.Label>
                        <Form.Control
                          type="number"
                          value={(formData.orderValue || 0).toFixed(2)}
                          readOnly
                          className="bg-light"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Shipping Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={formData.shippingAddress}
                          onChange={(e) =>
                            handleInputChange('shippingAddress', e.target.value)
                          }
                          placeholder={FIELD_PLACEHOLDERS.address.placeholder}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Product Lines */}
            <Col xs={12}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-primary">Product Lines</h6>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddProductLine}
                  >
                    <Plus size={16} className="me-1" />
                    Add Product
                  </Button>
                </Card.Header>
                <Card.Body>
                  {formData.productLines.length > 0 ? (
                    <div className="table-responsive">
                      <Table striped bordered>
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Size</th>
                            <th>Surface</th>
                            <th>Quantity (Boxes)</th>
                            <th>Unit Price</th>
                            <th>Total Value</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.productLines.map((product, index) => (
                            <tr key={product.id}>
                              <td>
                                <Form.Select
                                  size="sm"
                                  value={product.productName}
                                  onChange={(e) =>
                                    handleProductLineChange(
                                      index,
                                      'productName',
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">Select Product</option>
                                  {products.map((p) => (
                                    <option key={p.id} value={p.name}>
                                      {p.name}
                                    </option>
                                  ))}
                                </Form.Select>
                              </td>
                              <td>
                                <Form.Control
                                  size="sm"
                                  type="text"
                                  value={product.size}
                                  readOnly
                                  className="bg-light"
                                />
                              </td>
                              <td>
                                <Form.Control
                                  size="sm"
                                  type="text"
                                  value={product.surface}
                                  readOnly
                                  className="bg-light"
                                />
                              </td>
                              <td>
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  value={product.quantity}
                                  onChange={(e) =>
                                    handleProductLineChange(
                                      index,
                                      'quantity',
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  step="0.01"
                                  value={product.unitPrice}
                                  onChange={(e) =>
                                    handleProductLineChange(
                                      index,
                                      'unitPrice',
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  value={(product.totalValue || 0).toFixed(2)}
                                  readOnly
                                  className="bg-light"
                                />
                              </td>
                              <td>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteProductLine(index)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <p>
                        No products added yet. Click "Add Product" to get
                        started.
                      </p>
                    </div>
                  )}

                  {formData.productLines.length > 0 && (
                    <div className="mt-3 text-end">
                      <strong>
                        Total Order Value: â‚¹{(formData.orderValue || 0).toFixed(2)}
                      </strong>
                    </div>
                  )}

                  {errors.productLines && (
                    <div className="text-danger mt-2">
                      {errors.productLines}
                    </div>
                  )}
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
                          placeholder={FIELD_PLACEHOLDERS.notes.placeholder}
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
          {order ? 'Update Order' : 'Create Order'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ClientOrderForm;




