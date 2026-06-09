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

import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Form, Table, Spinner, Badge } from 'react-bootstrap';
import { Save, ChevronRight, Calculator, ArrowLeft, Percent, FileText, Plus, Trash2, X } from 'lucide-react';
import api from '../../../services/api';
import igstInvoiceService from '../../../services/igstInvoiceService';
import DoubleScrollbarWrapper from '../../shared/DoubleScrollbarWrapper.jsx';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import Button from '../../shared/Button.jsx';
import { formatDisplayDate } from '../../../utils/formatters.js';

// Front-end Number to Words converter helper
function amountToWords(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return '';
  const num = Math.floor(amount);
  const paise = Math.round((amount - num) * 100);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const units = ['', 'Thousand', 'Lakh', 'Crore'];

  function convertWords(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertWords(n % 100) : '');
  }

  function getIndianWords(n) {
    if (n === 0) return 'Zero';
    let wordStr = '';
    let unitIdx = 0;

    const temp = n % 1000;
    if (temp > 0) {
      wordStr = convertWords(temp) + ' ';
    }
    n = Math.floor(n / 1000);
    unitIdx = 1;

    while (n > 0) {
      const divisor = unitIdx === 3 ? 10000000 : 100;
      const segment = n % divisor;
      if (segment > 0) {
        wordStr = convertWords(segment) + ' ' + units[unitIdx] + ' ' + wordStr;
      }
      n = Math.floor(n / divisor);
      unitIdx++;
      if (unitIdx > 3) unitIdx = 3;
    }

    return wordStr.trim();
  }

  let finalWords = 'INR ' + getIndianWords(num);
  if (paise > 0) {
    finalWords += ' and ' + convertWords(paise) + ' Paise';
  }
  finalWords += ' Only';
  return finalWords;
}

function IGSTInvoiceForm({ exportInvoiceId: propExportInvoiceId, onBack, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportInvoices, setExportInvoices] = useState([]);

  const initialInvoiceId = propExportInvoiceId || sessionStorage.getItem('igst_invoice_id') || '';
  const initRanRef = useRef(false);

  const [formData, setFormData] = useState({
    id: null,
    igst_invoice_no: '',
    date: new Date().toLocaleDateString('en-CA'),
    export_invoice_id: initialInvoiceId,
    status: 'Draft',

    // GST Details
    gstin: '',
    iec_no: '',
    lut_bond_ref: '',
    lut_date: '',
    pi_no: '',
    tariff_code: '',
    buyer_order_no: '',
    buyer_order_date: '',
    country_of_origin: 'INDIA',
    payment_terms: '',
    delivery_terms: '',
    other_instructions: '',

    // Parties
    exporter_name: '',
    exporter_address: '',
    buyer_details: '',
    consignee_details: '',
    country: 'INDIA',
    final_destination: '',

    // Logistical Details
    port_of_loading: 'MUNDRA PORT',
    port_of_discharge: '',
    vessel_flight_no: '',
    pre_carriage_by: '',
    place_of_receipt: '',
    shipping_bill_no: '',
    shipping_bill_date: '',

    // Product list
    product_lines: [],

    // Packing Specs
    pallet_type: '',
    tiles_back: '',
    box_type: '',
    boxes_marking: '',
    fumigation: '',
    legalisation: '',

    // Weights & Qty
    net_weight: 0,
    gross_weight: 0,
    total_pallets: 0,
    total_quantity: 0,

    // Exchange Info
    exchange_rate: 87.35274,
    currency: 'USD',

    // Totals
    total_before_tax: 0,
    total_igst: 0,
    grand_total: 0,
    amount_in_words: '',
    remarks: ''
  });

  useEffect(() => {
    fetchExportInvoicesList();
    if (initialInvoiceId) {
      loadIGSTInvoiceData(initialInvoiceId);
    } else {
      setLoading(false);
    }
  }, [initialInvoiceId]);

  const fetchExportInvoicesList = async () => {
    try {
      const response = await api.get('/export-invoices?limit=500');
      const data = response.data?.data?.data || response.data?.data || response.data || [];
      setExportInvoices(data);
    } catch (e) {
      console.error('Failed to load export invoices list:', e);
    }
  };

  const loadIGSTInvoiceData = async (invoiceId) => {
    try {
      setLoading(true);
      const res = await igstInvoiceService.getByExportInvoice(invoiceId);
      if (res.data?.success) {
        const rawDoc = res.data.data?.igstInvoice || res.data.data?.igst_invoice;
        if (rawDoc) {
          const docExchangeRate = parseFloat(rawDoc.exchange_rate || rawDoc.exchangeRate || 87.35274);
          const mappedLines = (rawDoc.productLines || rawDoc.product_lines || []).map(l => ({
            product_id: l.productId || l.product_id || null,
            product_name: l.productName || l.product_name || l.materialDescription || l.material_description || '',
            material_description: l.materialDescription || l.material_description || l.productName || l.product_name || '',
            hsnCode: l.hsnCode || l.hsn_code || l.hsCode || l.hs_code || '',
            hsn_code: l.hsnCode || l.hsn_code || l.hsCode || l.hs_code || '',
            box_quantity: parseInt(l.boxQuantity || l.box_quantity || 0),
            pcs: parseInt(l.pcs || 0),
            sqm: parseFloat(l.sqm || 0),
            usd_rate: parseFloat(l.usd_rate || l.usdRate || 0),
            exchange_rate: parseFloat(l.exchange_rate || l.exchangeRate || docExchangeRate),
            rate: parseFloat(l.rate || 0),
            taxable_amount: parseFloat(l.taxableAmount || l.taxable_amount || 0),
            igst_rate: parseFloat(l.igstRate || l.igst_rate || 18.00),
            igst_amount: parseFloat(l.igstAmount || l.igst_amount || 0),
            total_amount: parseFloat(l.totalAmount || l.total_amount || 0)
          }));

          setFormData({
            id: rawDoc.id || null,
            igst_invoice_no: rawDoc.igstInvoiceNo || rawDoc.igst_invoice_no || '',
            date: rawDoc.date ? ((rawDoc.date) ? new Date(rawDoc.date).toLocaleDateString('en-CA') : '') : new Date().toLocaleDateString('en-CA'),
            export_invoice_id: invoiceId,
            status: rawDoc.status || 'Draft',
            gstin: rawDoc.gstin || '',
            iec_no: rawDoc.iecNo || rawDoc.iec_no || '',
            lut_bond_ref: rawDoc.lutBondRef || rawDoc.lut_bond_ref || '',
            lut_date: rawDoc.lutDate ? ((rawDoc.lutDate) ? new Date(rawDoc.lutDate).toLocaleDateString('en-CA') : '') : (rawDoc.lut_date ? ((rawDoc.lut_date) ? new Date(rawDoc.lut_date).toLocaleDateString('en-CA') : '') : ''),
            pi_no: rawDoc.piNo || rawDoc.pi_no || '',
            tariff_code: rawDoc.tariff_code || rawDoc.tariffCode || '',
            buyer_order_no: rawDoc.buyers_order_no || rawDoc.buyersOrderNo || rawDoc.buyer_order_no || rawDoc.buyerOrderNo || '',
            buyer_order_date: rawDoc.buyers_order_date ? ((rawDoc.buyers_order_date) ? new Date(rawDoc.buyers_order_date).toLocaleDateString('en-CA') : '') : (rawDoc.buyersOrderDate ? ((rawDoc.buyersOrderDate) ? new Date(rawDoc.buyersOrderDate).toLocaleDateString('en-CA') : '') : (rawDoc.buyer_order_date ? ((rawDoc.buyer_order_date) ? new Date(rawDoc.buyer_order_date).toLocaleDateString('en-CA') : '') : '')),
            exporter_name: rawDoc.exporterName || rawDoc.exporter_name || '',
            exporter_address: rawDoc.exporterAddress || rawDoc.exporter_address || '',
            buyer_details: rawDoc.buyerDetails || rawDoc.buyer_details || '',
            consignee_details: rawDoc.consigneeDetails || rawDoc.consignee_details || '',
            country: rawDoc.country_of_origin || rawDoc.countryOfOrigin || rawDoc.country || 'INDIA',
            final_destination: rawDoc.finalDestination || rawDoc.final_destination || '',
            payment_terms: rawDoc.payment_terms || rawDoc.paymentTerms || '',
            delivery_terms: rawDoc.delivery_terms || rawDoc.deliveryTerms || '',
            other_instructions: rawDoc.other_instructions || rawDoc.otherInstructions || '',
            port_of_loading: rawDoc.portOfLoading || rawDoc.port_of_loading || 'MUNDRA PORT',
            port_of_discharge: rawDoc.portOfDischarge || rawDoc.port_of_discharge || '',
            vessel_flight_no: rawDoc.vesselFlightNo || rawDoc.vessel_flight_no || '',
            pre_carriage_by: rawDoc.preCarriageBy || rawDoc.pre_carriage_by || '',
            place_of_receipt: rawDoc.placeOfReceipt || rawDoc.place_of_receipt || '',
            shipping_bill_no: rawDoc.shippingBillNo || rawDoc.shipping_bill_no || '',
            shipping_bill_date: rawDoc.shippingBillDate ? ((rawDoc.shippingBillDate) ? new Date(rawDoc.shippingBillDate).toLocaleDateString('en-CA') : '') : (rawDoc.shipping_bill_date ? ((rawDoc.shipping_bill_date) ? new Date(rawDoc.shipping_bill_date).toLocaleDateString('en-CA') : '') : ''),

            exchange_rate: docExchangeRate,
            currency: rawDoc.currency || 'USD',

            product_lines: mappedLines,
            pallet_type: rawDoc.palletType || rawDoc.pallet_type || '',
            tiles_back: rawDoc.tilesBack || rawDoc.tiles_back || '',
            box_type: rawDoc.boxType || rawDoc.box_type || '',
            boxes_marking: rawDoc.boxesMarking || rawDoc.boxes_marking || '',
            fumigation: rawDoc.fumigation || 'YES',
            legalisation: rawDoc.legalisation || 'NO',
            net_weight: parseFloat(rawDoc.netWeight || rawDoc.net_weight || 0),
            gross_weight: parseFloat(rawDoc.grossWeight || rawDoc.gross_weight || 0),
            total_pallets: parseInt(rawDoc.totalPallets || rawDoc.total_pallets || 0),
            total_quantity: parseFloat(rawDoc.totalQuantity || rawDoc.total_quantity || 0),
            total_before_tax: parseFloat(rawDoc.totalBeforeTax || rawDoc.total_before_tax || 0),
            taxable_amount: parseFloat(rawDoc.taxableAmount || rawDoc.taxable_amount || 0),
            total_igst: parseFloat(rawDoc.totalIgst || rawDoc.total_igst || 0),
            igst_amount: parseFloat(rawDoc.igstAmount || rawDoc.igst_amount || 0),
            grand_total: parseFloat(rawDoc.grandTotal || rawDoc.grand_total || 0),
            total_amount_after_tax: parseFloat(rawDoc.totalAmountAfterTax || rawDoc.total_amount_after_tax || 0),
            amount_in_words: rawDoc.amountInWords || rawDoc.amount_in_words || '',
            remarks: rawDoc.remarks || ''
          });
        }
      }
    } catch (err) {
      console.error('Failed to load IGST Invoice data:', err);
      showError('Error retrieving IGST data from backend');
    } finally {
      setLoading(false);
    }
  };

  const handleExportInvoiceChange = async (e) => {
    const invId = e.target.value;
    if (!invId) return;

    setFormData(prev => ({ ...prev, export_invoice_id: invId }));
    await loadIGSTInvoiceData(invId);
  };

  // Live Calculation Pipeline
  const runLiveCalculations = useCallback((lines, currentExchangeRate) => {
    let totalBeforeTax = 0;
    let totalIgst = 0;
    let grandTotal = 0;
    let totalQty = 0;

    const updatedLines = lines.map(l => {
      const box_qty = parseInt(l.box_quantity || 0);
      const sqm = parseFloat(l.sqm || 0);
      const pcs = box_qty;
      const rate = parseFloat(l.rate || 0);

      const exRate = parseFloat(currentExchangeRate || l.exchange_rate || 87.35274);
      const usdRate = parseFloat(l.usd_rate || l.usdRate || 0);

      // Taxable Amount calculated directly from unrounded USD rate and Exchange Rate to match prints exactly
      let taxable = 0;
      if (usdRate > 0 && exRate > 0) {
        taxable = sqm > 0 ? (sqm * usdRate * exRate) : (pcs * usdRate * exRate);
      } else {
        taxable = sqm > 0 ? (sqm * rate) : (pcs * rate);
      }

      const igstRate = parseFloat(l.igst_rate || 18.00);
      const igstAmt = taxable * (igstRate / 100);
      const totalAmt = taxable + igstAmt;

      totalBeforeTax += taxable;
      totalIgst += igstAmt;
      grandTotal += totalAmt;
      totalQty += sqm > 0 ? sqm : pcs;

      return {
        ...l,
        pcs,
        hsnCode: l.hsnCode || l.hsn_code || l.hsCode || l.hs_code || '',
        hsn_code: l.hsnCode || l.hsn_code || l.hsCode || l.hs_code || '',
        usd_rate: usdRate,
        exchange_rate: exRate,
        rate,
        taxable_amount: parseFloat(taxable.toFixed(2)),
        igst_amount: parseFloat(igstAmt.toFixed(2)),
        total_amount: parseFloat(totalAmt.toFixed(2))
      };
    });

    const beforeTax = parseFloat(totalBeforeTax.toFixed(2));
    const igstVal = parseFloat(totalIgst.toFixed(2));
    const grandVal = parseFloat(grandTotal.toFixed(2));

    setFormData(prev => ({
      ...prev,
      product_lines: updatedLines,
      total_before_tax: beforeTax,
      taxable_amount: beforeTax,
      total_igst: igstVal,
      igst_amount: igstVal,
      grand_total: grandVal,
      total_amount_after_tax: grandVal,
      amount_in_words: amountToWords(grandVal),
      total_quantity: totalQty
    }));
  }, []);

  const handleExchangeRateChange = (newExRate) => {
    const parsedRate = parseFloat(newExRate) || 0;
    setFormData(prev => ({ ...prev, exchange_rate: newExRate }));

    // Dynamically recalculate display rate (INR) for each product line based on new exchange rate
    const updatedLines = formData.product_lines.map(l => {
      const usdRate = parseFloat(l.usd_rate || l.usdRate || 0);
      if (usdRate > 0 && parsedRate > 0) {
        return {
          ...l,
          exchange_rate: parsedRate,
          rate: parseFloat((usdRate * parsedRate).toFixed(2))
        };
      }
      return { ...l, exchange_rate: parsedRate };
    });

    runLiveCalculations(updatedLines, parsedRate);
  };

  const handleLineFieldChange = (index, field, value) => {
    const newLines = [...formData.product_lines];
    newLines[index][field] = value;

    // Recalculate unrounded usd_rate if user manually edits display rate (INR)
    if (field === 'rate') {
      const exRate = parseFloat(formData.exchange_rate || 87.35274);
      if (exRate > 0) {
        newLines[index]['usd_rate'] = value / exRate;
      }
    }

    runLiveCalculations(newLines, formData.exchange_rate);
  };

  const handleAddLine = () => {
    const newLines = [...formData.product_lines, {
      product_name: '',
      material_description: '',
      hsn_code: formData.tariff_code || '',
      hsnCode: formData.tariff_code || '',
      box_quantity: 0,
      pcs: 0,
      sqm: 0,
      rate: 0,
      usd_rate: 0,
      exchange_rate: parseFloat(formData.exchange_rate || 87.35274),
      taxable_amount: 0,
      igst_rate: 18.00,
      igst_amount: 0,
      total_amount: 0
    }];
    runLiveCalculations(newLines, formData.exchange_rate);
  };

  const handleRemoveLine = (index) => {
    const newLines = formData.product_lines.filter((_, idx) => idx !== index);
    runLiveCalculations(newLines, formData.exchange_rate);
  };

  const handleSave = async (status = 'Draft') => {
    if (!formData.export_invoice_id) {
      showError('Please select a linked Export Invoice first.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        status: status
      };

      const res = await igstInvoiceService.createOrUpdate(formData.export_invoice_id, payload);
      if (res.data?.success) {
        showSuccess(`IGST Invoice successfully saved as ${status}!`);
        // Refresh local cache & return
        sessionStorage.setItem('igst_invoice_id', formData.export_invoice_id);
        setTimeout(() => {
          onBack();
        }, 1200);
      }
    } catch (e) {
      showError(e.response?.data?.message || 'Error occurred while saving IGST Invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;

  return (
    <Container fluid className="py-3 bg-white min-vh-100">
      {/* Form Header Action Bar */}
      <div className="d-flex flex-row justify-content-between align-items-center gap-2 mb-2 px-3"
        style={{ padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <div className="d-flex align-items-center gap-2">
          <Button variant="link" onClick={onBack} className="text-primary p-0" style={{ flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </Button>
          <Percent size={18} className="text-primary" style={{ flexShrink: 0 }} />
          <div>
            <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem', color: '#1a1a2e' }}>IGST Invoice Editor</h5>
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>Step 4: GST & Customs Export Tax Invoice Form</span>
          </div>
        </div>
        <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
          <Button variant="outline-primary" onClick={() => handleSave('Draft')} disabled={saving} className="fw-bold shadow-sm" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px' }}>
            {saving ? <Spinner animation="border" size="sm" /> : 'Save as Draft'}
          </Button>
        </div>
      </div>

      <Form className="px-3" onSubmit={e => e.preventDefault()}>
        {/* Linked Document Selector */}
        <section className="mb-4">
          <div className="blue-ribbon">LINKED DOCUMENTS & REGISTRATION</div>
          <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
            <Row className="g-3">
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label text-primary">SELECT EXPORT INVOICE</label>
                  <Form.Select
                    value={formData.export_invoice_id || ''}
                    onChange={handleExportInvoiceChange}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    disabled={!!propExportInvoiceId || !!formData.id}
                  >
                    <option value="">Select Export Invoice...</option>
                    {exportInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo || inv.invoice_no} ({inv.clientName || inv.client_name || 'No Client'}) - {formatDisplayDate(inv.invoiceDate || inv.invoice_date)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label text-primary">PROFORMA INVOICE NO.</label>
                  <Form.Control
                    type="text"
                    value={formData.pi_no || ''}
                    onChange={e => setFormData({ ...formData, pi_no: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="Enter PI No"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">IGST INVOICE NUMBER</label>
                  <Form.Control
                    value={formData.igst_invoice_no || 'AUTO-GENERATED'}
                    readOnly
                    className="vgm-input-style fw-bold text-dark read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">INVOICE DATE</label>
                  <Form.Control
                    type="date"
                    value={formData.date || ''}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="vgm-input-style fw-bold text-primary"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-2">
              <Col md={4}>
                <Form.Group>
                  <label className="vgm-label text-primary">TARIFF CODE</label>
                  <Form.Control
                    type="text"
                    value={formData.tariff_code || ''}
                    onChange={e => setFormData({ ...formData, tariff_code: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="Enter Tariff / HS Code"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <label className="vgm-label text-primary">BUYER'S ORDER NO.</label>
                  <Form.Control
                    type="text"
                    value={formData.buyer_order_no || ''}
                    onChange={e => setFormData({ ...formData, buyer_order_no: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="Enter Buyer's Order No"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <label className="vgm-label text-primary">BUYER'S ORDER DATE</label>
                  <Form.Control
                    type="date"
                    value={formData.buyer_order_date || ''}
                    onChange={e => setFormData({ ...formData, buyer_order_date: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-2">
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">EXPORTER GSTIN</label>
                  <Form.Control
                    type="text"
                    value={formData.gstin || ''}
                    readOnly
                    className="vgm-input-style fw-bold text-dark read-only-inherited bg-light"
                    placeholder="Enter GSTIN"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">EXPORTER IEC NUMBER</label>
                  <Form.Control
                    type="text"
                    value={formData.iec_no || ''}
                    readOnly
                    className="vgm-input-style fw-bold text-dark read-only-inherited bg-light"
                    placeholder="Enter IEC Code"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">LUT / BOND REFERENCE</label>
                  <Form.Control
                    type="text"
                    value={formData.lut_bond_ref || ''}
                    readOnly
                    className="vgm-input-style fw-bold text-dark read-only-inherited bg-light"
                    placeholder="LUT ARN Number"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">LUT DATE</label>
                  <Form.Control
                    type="date"
                    value={formData.lut_date || ''}
                    readOnly
                    className="vgm-input-style fw-bold text-dark read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </section>

        {/* Exporter & Buyer Parties */}
        <section className="mb-4">
          <div className="blue-ribbon">PARTIES DETAILS</div>
          <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <label className="vgm-label text-primary">EXPORTER NAME & ADDRESS</label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={formData.exporter_name ? `${formData.exporter_name}\n${formData.exporter_address}` : formData.exporter_address || ''}
                    readOnly
                    className="vgm-input-style fw-medium read-only-inherited bg-light"
                    style={{ minHeight: '100px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <label className="vgm-label text-primary">BUYER NAME & ADDRESS</label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={formData.buyer_details || ''}
                    onChange={e => setFormData({ ...formData, buyer_details: e.target.value })}
                    className="vgm-input-style fw-medium border-primary border-opacity-25"
                    style={{ minHeight: '100px' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-2">
              <Col md={6}>
                <Form.Group>
                  <label className="vgm-label text-primary">CONSIGNEE DETAILS</label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.consignee_details || ''}
                    onChange={e => setFormData({ ...formData, consignee_details: e.target.value })}
                    className="vgm-input-style border-primary border-opacity-25"
                    style={{ minHeight: '80px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label text-primary">COUNTRY OF ORIGIN</label>
                  <Form.Control
                    type="text"
                    value={formData.country || 'INDIA'}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="e.g. INDIA"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label text-primary">FINAL DESTINATION</label>
                  <Form.Control
                    type="text"
                    value={formData.final_destination || ''}
                    onChange={e => setFormData({ ...formData, final_destination: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="Enter Final Destination"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label text-primary">PAYMENT TERMS</label>
                  <Form.Control
                    type="text"
                    value={formData.payment_terms || ''}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="e.g. 100% ADVANCE, L/C, CAD"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label text-primary">SHIPMENT TERMS</label>
                  <Form.Control
                    type="text"
                    value={formData.delivery_terms || ''}
                    onChange={e => setFormData({ ...formData, delivery_terms: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="e.g. FOB MUNDRA, CIF GENOA"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </section>

        {/* Logistical Details */}
        <section className="mb-4">
          <div className="blue-ribbon">LOGISTICAL & SHIPPING DETAILS</div>
          <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
            <Row className="g-3">
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">VESSEL / FLIGHT NO.</label>
                  <Form.Control
                    type="text"
                    value={formData.vessel_flight_no || ''}
                    readOnly
                    className="vgm-input-style read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">PORT OF LOADING</label>
                  <Form.Control
                    type="text"
                    value={formData.port_of_loading || 'MUNDRA PORT'}
                    readOnly
                    className="vgm-input-style read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">PORT OF DISCHARGE</label>
                  <Form.Control
                    type="text"
                    value={formData.port_of_discharge || ''}
                    readOnly
                    className="vgm-input-style read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">PLACE OF RECEIPT</label>
                  <Form.Control
                    type="text"
                    value={formData.place_of_receipt || ''}
                    readOnly
                    className="vgm-input-style read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-2">
              <Col md={4}>
                <Form.Group>
                  <label className="vgm-label">PRE-CARRIAGE BY</label>
                  <Form.Control
                    type="text"
                    value={formData.pre_carriage_by || ''}
                    readOnly
                    className="vgm-input-style read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <label className="vgm-label">SHIPPING BILL NO.</label>
                  <Form.Control
                    type="text"
                    value={formData.shipping_bill_no || ''}
                    readOnly
                    className="vgm-input-style fw-bold text-dark read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <label className="vgm-label">SHIPPING BILL DATE</label>
                  <Form.Control
                    type="date"
                    value={formData.shipping_bill_date || ''}
                    readOnly
                    className="vgm-input-style fw-bold text-dark read-only-inherited bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </section>

        {/* Product Items Table with Live Calculations */}
        <section className="mb-4">
          <div className="blue-ribbon d-flex justify-content-between align-items-center py-2">
            <span>PRODUCTS TABLE & TAX CALCULATIONS</span>
            <div className="d-flex align-items-center gap-2">
              <span className="text-white fw-bold small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                Exchange Rate (USD → INR):
              </span>
              <Form.Control
                type="number"
                step="0.00001"
                value={formData.exchange_rate !== undefined && formData.exchange_rate !== null ? formData.exchange_rate : 87.35274}
                onChange={e => handleExchangeRateChange(e.target.value)}
                className="exchange-rate-glass-input"
                placeholder="87.35274"
              />
            </div>
          </div>
          <div className="border border-top-0 rounded-bottom-3 overflow-hidden bg-white shadow-sm">
            <DoubleScrollbarWrapper deps={[formData.product_lines]} wrapperClassName="table-responsive">
              <Table bordered hover className="mb-0 text-center align-middle" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr className="table-light text-muted small text-uppercase">
                    <th style={{ width: '50px' }}>SR.</th>
                    <th>MATERIAL DESCRIPTION</th>
                    <th style={{ width: '100px' }}>HSN CODE</th>
                    <th style={{ width: '110px' }}>BOX QTY</th>
                    <th style={{ width: '110px' }}>SQM</th>
                    <th style={{ width: '120px' }}>RATE</th>
                    <th style={{ width: '140px' }}>TAXABLE AMT</th>
                    <th style={{ width: '90px' }}>IGST %</th>
                    <th style={{ width: '120px' }}>IGST AMT</th>
                    <th style={{ width: '150px' }}>TOTAL AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.product_lines.map((l, i) => (
                    <tr key={i}>
                      <td className="fw-bold text-muted">{i + 1}</td>
                      <td className="text-start ps-3 fw-semibold text-dark">
                        {l.material_description || l.product_name || ''}
                      </td>
                      <td>
                        <Form.Control
                          value={l.hsn_code || l.hsnCode || l.hsCode || l.hs_code || formData.tariff_code || ''}
                          onChange={e => handleLineFieldChange(i, 'hsn_code', e.target.value)}
                          className="fw-bold text-center border-primary border-opacity-25"
                          size="sm"
                        />
                      </td>
                      <td className="font-monospace text-dark fw-medium">
                        {(l.box_quantity || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="font-monospace text-dark fw-semibold">
                        {parseFloat(l.sqm || 0).toFixed(2)}
                      </td>
                      <td className="font-monospace fw-bold text-primary">
                        ₹{parseFloat(l.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="font-monospace fw-bold text-dark">
                        ₹{parseFloat(l.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="font-monospace text-info fw-semibold">
                        {parseFloat(l.igst_rate || 18.00).toFixed(2)}%
                      </td>
                      <td className="font-monospace fw-medium text-info">
                        ₹{parseFloat(l.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="font-monospace fw-bold text-success">
                        ₹{parseFloat(l.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {formData.product_lines.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center py-4 text-muted small">
                        No product lines loaded. Select a valid Export Invoice to auto-load products.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </DoubleScrollbarWrapper>
          </div>
        </section>

        {/* Weights, Package Specs & Totals Footer */}
        <section className="mb-5">
          <Row className="g-4">
            <Col lg={6}>
              <div className="blue-ribbon">PACKAGING SPECS & WEIGHT SUMMARY</div>
              <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <label className="vgm-label text-primary">PALLET TYPE</label>
                      <Form.Control
                        type="text"
                        value={formData.pallet_type || ''}
                        onChange={e => setFormData({ ...formData, pallet_type: e.target.value })}
                        className="vgm-input-style border-primary border-opacity-25"
                        placeholder="e.g. WOODEN PALLET"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <label className="vgm-label text-primary">BOX TYPE</label>
                      <Form.Control
                        type="text"
                        value={formData.box_type || ''}
                        onChange={e => setFormData({ ...formData, box_type: e.target.value })}
                        className="vgm-input-style border-primary border-opacity-25"
                        placeholder="e.g. CORRUGATED BOXES"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <label className="vgm-label text-primary">TILES BACKSIDE MARKING</label>
                      <Form.Control
                        type="text"
                        value={formData.tiles_back || ''}
                        onChange={e => setFormData({ ...formData, tiles_back: e.target.value })}
                        className="vgm-input-style border-primary border-opacity-25"
                        placeholder="e.g. MADE IN INDIA"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <label className="vgm-label text-primary">BOXES MARKINGS</label>
                      <Form.Control
                        type="text"
                        value={formData.boxes_marking || ''}
                        onChange={e => setFormData({ ...formData, boxes_marking: e.target.value })}
                        className="vgm-input-style border-primary border-opacity-25"
                        placeholder="e.g. STANDARD SHADING"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <label className="vgm-label text-primary">FUMIGATION</label>
                      <Form.Select
                        value={formData.fumigation || 'YES'}
                        onChange={e => setFormData({ ...formData, fumigation: e.target.value })}
                        className="vgm-input-style fw-bold border-primary border-opacity-25"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <label className="vgm-label text-primary">LEGALISATION</label>
                      <Form.Select
                        value={formData.legalisation || 'NO'}
                        onChange={e => setFormData({ ...formData, legalisation: e.target.value })}
                        className="vgm-input-style fw-bold border-primary border-opacity-25"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <label className="vgm-label text-primary">OTHER INSTRUCTIONS / SPECIFICATIONS</label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={formData.other_instructions || ''}
                        onChange={e => setFormData({ ...formData, other_instructions: e.target.value })}
                        className="vgm-input-style border-primary border-opacity-25"
                        placeholder="Enter other specific instructions"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <label className="vgm-label text-primary">SUPPLY DECLARATION</label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={formData.supply_declaration !== undefined ? formData.supply_declaration : 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND'}
                        onChange={e => setFormData({ ...formData, supply_declaration: e.target.value.toUpperCase() })}
                        className="vgm-input-style fw-semibold border-primary border-opacity-25"
                        placeholder="Enter supply declaration text"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <label className="vgm-label text-primary">FTP INCENTIVE DECLARATION</label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={formData.ftp_incentive_declaration !== undefined ? formData.ftp_incentive_declaration : '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'}
                        onChange={e => setFormData({ ...formData, ftp_incentive_declaration: e.target.value.toUpperCase() })}
                        className="vgm-input-style fw-semibold border-primary border-opacity-25"
                        placeholder="Enter FTP incentive declaration text"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3 mt-2">
                  <Col md={4}>
                    <Form.Group>
                      <label className="vgm-label text-success">NET WEIGHT (KG)</label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={formData.net_weight || 0}
                        readOnly
                        className="vgm-input-style fw-bold text-success font-monospace read-only-inherited bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <label className="vgm-label text-success">GROSS WEIGHT (KG)</label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={formData.gross_weight || 0}
                        readOnly
                        className="vgm-input-style fw-bold text-success font-monospace read-only-inherited bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <label className="vgm-label text-success">TOTAL PALLETS</label>
                      <Form.Control
                        type="number"
                        value={formData.total_pallets || 0}
                        readOnly
                        className="vgm-input-style fw-bold text-success read-only-inherited bg-light"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Col>

            <Col lg={6}>
              <div className="blue-ribbon text-end">SUMMARY TOTALS (INR)</div>
              <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted fw-semibold">Total Taxable Amount (Value Before Tax):</span>
                  <span className="fw-bold font-monospace text-dark">
                    ₹{parseFloat(formData.total_before_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                  <span className="text-muted fw-semibold">Total Integrated GST (18.00%):</span>
                  <span className="fw-bold font-monospace text-info">
                    + ₹{parseFloat(formData.total_igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-extrabold text-uppercase text-dark">Grand Total (Value After Tax):</h6>
                  <h4 className="mb-0 fw-bold font-monospace text-success">
                    ₹{parseFloat(formData.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h4>
                </div>

                <Form.Group className="mb-3">
                  <label className="vgm-label">AMOUNT IN WORDS</label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.amount_in_words || ''}
                    readOnly
                    className="vgm-input-style bg-light font-monospace text-muted"
                    style={{ fontSize: '0.85rem', resize: 'none' }}
                  />
                </Form.Group>

                <Form.Group>
                  <label className="vgm-label">REMARKS / LUT DESCRIPTION</label>
                  <Form.Control
                    type="text"
                    value={formData.remarks || ''}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="vgm-input-style text-muted"
                    placeholder="e.g. EXPORT UNDER LUT WITHOUT PAYMENT OF INTEGRATED TAX"
                  />
                </Form.Group>
              </div>
            </Col>
          </Row>
        </section>

        {/* Bottom Actions Container */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top mb-4">
          <Button
            variant="outline-secondary"
            onClick={onBack}
            className="shadow-sm px-4 fw-bold d-flex align-items-center"
            style={{ height: 48, borderRadius: 10, fontSize: '0.88rem' }}
          >
            <X size={18} className="me-2" /> Cancel
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => handleSave('Draft')}
            disabled={saving}
            className="shadow-sm px-4 fw-bold"
            style={{ height: 48, borderRadius: 10, fontSize: '0.88rem' }}
          >
            {saving ? <Spinner animation="border" size="sm" /> : 'Save as Draft'}
          </Button>
        </div>
      </Form>

      <style>{`
        .blue-ribbon {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 1px;
          border-radius: 8px 8px 0 0;
          text-transform: uppercase;
        }
        .exchange-rate-glass-input {
          background: rgba(255, 255, 255, 0.15) !important;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
          color: white !important;
          font-weight: 700;
          font-size: 0.85rem;
          border-radius: 6px;
          height: 32px;
          width: 120px;
          text-align: center;
          transition: all 0.2s ease;
        }
        .exchange-rate-glass-input:focus {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2) !important;
          outline: none;
        }
        .exchange-rate-glass-input::placeholder {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        .vgm-label {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          color: #4b5563;
          margin-bottom: 5px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .vgm-input-style {
          border-radius: 6px;
          border: 1px solid #d1d5db;
          padding: 6px 12px;
          font-size: 0.88rem;
          color: #1f2937;
          transition: border-color 0.2s ease;
        }
        .vgm-input-style:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          outline: none;
        }
        .read-only-inherited {
          background-color: #f9fafb !important;
          color: #4b5563 !important;
        }
      `}</style>
    </Container>
  );
}

export default IGSTInvoiceForm;
