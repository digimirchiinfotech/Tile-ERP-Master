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

import { generateEnterpriseFilename } from '../../../utils/fileNamingUtils';
import { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Row, Col, Table, Spinner, Modal, OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import api from '../../../services/api';
import { exportMapper } from '../../../utils/exportMapper';
import { getAllPorts, getPortsOfLoading, getPortsOfDischarge } from '../../../services/masterDataService.js';
import DynamicDropdown from '../../shared/DynamicDropdown.jsx';
import AddableDropdown from '../../shared/AddableDropdown.jsx';
import Button from '../../shared/Button.jsx';
import {
  Ship,
  Save,
  X,
  Package,
  MapPin,
  FileText,
  Plus,
  Trash2,
  Hash,
  Globe,
  Anchor,
  ArrowLeft,
  Download,
  History,
  Info,
  RefreshCw
} from 'lucide-react';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import ShippingInstructionsPrintView from './ShippingInstructionsPrintView.jsx';
import { downloadPDF } from '../../../utils/pdfGenerator.js';
import { useExportDocumentReferences } from '../../../hooks/useExportDocumentReferences.js';
import DoubleScrollbarWrapper from '../../shared/DoubleScrollbarWrapper.jsx';
import ModuleAuditLog from '../../shared/ModuleAuditLog.jsx';
import { scrollToFirstError } from '../../../utils/validationUIHelper.js';


export default function ShippingInstructionsForm({
  exportInvoiceId,
  onBack,
  shippingInstruction,
  onSave,
  viewOnly = false,
}) {
  const { getShippingInheritedData, fetchExportInvoiceReferences, fetchVGMReferences } = useExportDocumentReferences();
  const [invoices, setInvoices] = useState([]);
  const [vgmList, setVgmList] = useState([]);
  const [loading, setLoading] = useState(false);
  const skipAutoFetchRef = useRef(false);
  const printRef = useRef(null);

  // determine which invoice id to use: prop first, then from existing record
  const initialInvoiceId = exportInvoiceId || shippingInstruction?.export_invoice_id || shippingInstruction?.exportInvoiceId || '';
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId);
  const [formData, setFormData] = useState({
    instructionNo: '',
    date: '',
    bookingNo: '',
    vgmNo: '',
    piNo: '',
    exportInvoiceNo: '',
    plNo: '',
    piDate: '',
    exportInvoiceDate: '',
    annexureNo: '',
    backsideNo: '',
    invoiceReference: '',
    clientName: '',
    exporterDetails: '',
    consigneeDetails: '',
    notifyParty1: '',
    notifyParty2: '',
    vesselName: '',
    voyageNo: '',
    etd: '',
    pol: '',
    pod: '',
    finalDestination: '',
    blType: '',
    freightPayableAt: '',
    bietcNumber: '',
    freightForwarder: '',
    placeOfIssue: '',
    hsCode: '',
    totalPallets: 0,
    totalBoxes: 0,
    totalSqm: 0,
    totalNetWeight: 0,
    totalGrossWeight: 0,
    sbNo: '',
    sbDate: '',
    containerDetails: [],
    vgmId: '',
    siDescription: '',
    exporterRef: '',
    countryOfOrigin: 'INDIA',
    ei_updated_at: '',
    updated_at: ''
  });

  const [errors, setErrors] = useState({});
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [masterData, setMasterData] = useState({
    ports: [],
    portsOfLoading: [],
    portsOfDischarge: []
  });

  // Fetch ports from master data
  useEffect(() => {
    const fetchPorts = async () => {
      try {
        const [portsData, polData, podData] = await Promise.all([
          getAllPorts().catch(() => []),
          getPortsOfLoading().catch(() => []),
          getPortsOfDischarge().catch(() => [])
        ]);
        setMasterData({
          ports: Array.isArray(portsData) ? portsData.map(p => p.portName || p) : [],
          portsOfLoading: Array.isArray(polData) ? polData.map(p => p.portName || p.value || p) : [],
          portsOfDischarge: Array.isArray(podData) ? podData.map(p => p.portName || p.value || p) : []
        });
      } catch (error) {
        console.error('Error fetching ports:', error);
      }
    };
    fetchPorts();
  }, []);

  // Fetch all valid export invoices for reference mapping
  useEffect(() => {
    const fetchRefs = async () => {
      const refs = await fetchExportInvoiceReferences();
      setInvoices(refs || []);
    };
    fetchRefs();
  }, [fetchExportInvoiceReferences]);

  // if no invoice selected and not viewOnly, allow selection

  useEffect(() => {
    const fetchVgms = async () => {
      try {
        const activeVgmId = shippingInstruction?.vgmId || shippingInstruction?.vgm_id || formData.vgmId || '';
        const refs = await fetchVGMReferences(null, '', activeVgmId);
        setVgmList(refs || []);
      } catch (err) {
        console.error('Error fetching VGMs:', err);
      }
    };
    fetchVgms();
  }, [fetchVGMReferences, shippingInstruction, formData.vgmId]);

  const handleVgmSelect = async (vgmId) => {
    if (!vgmId) return;
    try {
      setLoading(true);
      const inheritedData = await getShippingInheritedData(vgmId);


      if (inheritedData) {
        // Use the mapper to ensure all fields (including nested containers) are normalized for the SI form
        const mappedData = exportMapper.mapVGMToSI(inheritedData);

        // REINFORCED MAPPING: Explicitly pull data to avoid any mapper issues, but fallback to mappedData calculations
        const totalNet = inheritedData.net_weight || inheritedData.netWeight || mappedData.totalNetWeight || 0;
        const totalGross = inheritedData.gross_weight || inheritedData.grossWeight || mappedData.totalGrossWeight || 0;
        const totalSqm = inheritedData.total_sqm || inheritedData.totalSqm || mappedData.totalSqm || 0;
        const totalBoxes = inheritedData.total_boxes || inheritedData.totalBoxes || mappedData.totalBoxes || 0;

        setFormData(prev => ({
          ...prev,
          ...mappedData,
          instructionNo: prev.instructionNo || mappedData.instructionNo || '', // Preserve generated number
          vgmId: vgmId,
          // Explicitly set weights and totals to ensure they are captured
          totalNetWeight: totalNet,
          totalGrossWeight: totalGross,
          totalSqm: totalSqm,
          totalBoxes: totalBoxes,
          // Sync booking no and invoice reference - ensure no null/undefined values
          bookingNo: mappedData.bookingNo || inheritedData.bookingNo || inheritedData.booking_no || prev.bookingNo || '',
          invoiceReference: mappedData.exportInvoiceNo || inheritedData.exportInvoiceNo || inheritedData.export_invoice_no || prev.invoiceReference || '',
          // Final safety fallback for absolute critical fields
          exporterDetails: (inheritedData.backside_shipper_details || inheritedData.backsideShipperDetails || mappedData.exporterDetails || prev.exporterDetails || '').trim(),
          consigneeDetails: (inheritedData.consignee_details || inheritedData.pi_consignee_details || inheritedData.pi_consignee || inheritedData.consignee_details_pi || mappedData.consigneeDetails || prev.consigneeDetails || '').trim(),
          notifyParty1: (inheritedData.notify_party_details || inheritedData.notifyPartyDetails || inheritedData.pi_notify_party || mappedData.notifyParty1 || prev.notifyParty1 || '').trim(),
          vesselName: mappedData.vesselName || inheritedData.vessel_name || inheritedData.vesselName || inheritedData.vessel_flight_no || prev.vesselName || '',
          pol: mappedData.pol || inheritedData.port_of_loading || inheritedData.pol || prev.pol || '',
          pod: mappedData.pod || inheritedData.port_of_discharge || inheritedData.pod || prev.pod || '',
          finalDestination: mappedData.finalDestination || inheritedData.final_destination || inheritedData.finalDestination || prev.finalDestination || '',
          hsCode: mappedData.hsCode || inheritedData.hs_code || inheritedData.hsCode || inheritedData.tariff_code || prev.hsCode || '',
          siDescription: mappedData.siDescription || inheritedData.description_of_goods || inheritedData.goods_description || inheritedData.material_header_description || prev.siDescription || '',
          ei_updated_at: inheritedData.ei_updated_at || inheritedData.eiUpdatedAt || '',
          updated_at: inheritedData.updated_at || inheritedData.updatedAt || ''
        }));

        const backId = inheritedData.exportInvoiceId || inheritedData.export_invoice_id || inheritedData.invoiceId;
        if (backId) {
          skipAutoFetchRef.current = true;
          setInvoiceId(backId);
        }
        showSuccess('VGM data loaded successfully');
      }

    } catch (err) {
      console.error('VGM select error:', err);
      showError('Failed to fetch VGM data');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const loadData = async () => {
      if (shippingInstruction) {

        const mapped = exportMapper.mapVGMToSI(shippingInstruction);
        setFormData((prev) => ({
          ...prev,
          ...mapped,
          id: shippingInstruction.id || null
        }));
      } else if (invoiceId) {
        if (skipAutoFetchRef.current) {
          skipAutoFetchRef.current = false;
          return;
        }
        try {
          setLoading(true);
          const response = await api.get(`/shipping-instructions/by-export-invoice/${invoiceId}`);
          if (response.data?.success && response.data.data) {
            const rawData = response.data.data;
            const mappedData = exportMapper.mapVGMToSI(rawData);
            setFormData((prev) => ({
              ...prev,
              ...mappedData,
              id: rawData.id || null,
              exists: !!rawData.id,
              ei_updated_at: rawData.ei_updated_at || rawData.eiUpdatedAt || '',
              updated_at: rawData.updated_at || rawData.updatedAt || ''
            }));

            // If it's a fallback (no ID), ensure we fetch a fresh SI number
            if (!rawData.id) {
              try {
                const resNo = await api.get('/shipping-instructions/next-number');
                if (resNo.data?.data?.siNo) {
                  setFormData(p => ({ ...p, instructionNo: resNo.data.data.siNo }));
                }
              } catch (e) { }
            }
          } else {
            const inv = invoices.find((i) => String(i.id) === String(invoiceId));
            if (inv) {
              handleInvoiceChange(inv.invoiceNo || inv.invoice_no);
            }
            // Fetch next number for new record
            try {
              const resNo = await api.get('/shipping-instructions/next-number');
              if (resNo.data?.data?.siNo) {
                setFormData(p => ({ ...p, instructionNo: resNo.data.data.siNo }));
              }
            } catch (e) { }
          }
        } catch (err) {
          console.error('Error loading SI:', err);
        } finally {
          setLoading(false);
        }
      } else {
        // No invoice ID â€” just fetch next number
        try {
          const resNo = await api.get('/shipping-instructions/next-number');
          if (resNo.data?.data?.siNo) {
            setFormData(p => ({ ...p, instructionNo: resNo.data.data.siNo }));
          }
        } catch (e) { }
      }
    };
    loadData();
  }, [shippingInstruction, exportInvoiceId, invoices, invoiceId]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleContainerChange = (index, field, value) => {
    const newContainers = [...formData.containerDetails];
    const val = (['sqm', 'boxes', 'netWt', 'grossWt'].includes(field)) ? value : value;
    newContainers[index] = { ...newContainers[index], [field]: val };

    // Auto-calculate totals
    const totals = newContainers.reduce(
      (acc, curr) => ({
        sqm: acc.sqm + (parseFloat(curr.sqm) || 0),
        boxes: acc.boxes + (parseInt(curr.boxes) || 0),
        netWt: acc.netWt + (parseFloat(curr.netWt) || 0),
        grossWt: acc.grossWt + (parseFloat(curr.grossWt) || 0),
      }),
      { sqm: 0, boxes: 0, netWt: 0, grossWt: 0 }
    );

    setFormData((prev) => ({
      ...prev,
      containerDetails: newContainers,
      totalSqm: totals.sqm.toFixed(2),
      totalBoxes: totals.boxes,
      totalNetWeight: totals.netWt.toFixed(2),
      totalGrossWeight: totals.grossWt.toFixed(2),
    }));
  };

  const addContainer = () => {
    setFormData((prev) => ({
      ...prev,
      containerDetails: [
        ...prev.containerDetails,
        { containerNo: '', sealNo: '', sqm: 0, boxes: 0, netWt: 0, grossWt: 0 },
      ],
    }));
  };

  const removeContainer = (index) => {
    const newContainers = formData.containerDetails.filter((_, i) => i !== index);

    // Auto-calculate totals after removal
    const totals = newContainers.reduce(
      (acc, curr) => ({
        sqm: acc.sqm + (parseFloat(curr.sqm) || 0),
        boxes: acc.boxes + (parseInt(curr.boxes) || 0),
        netWt: acc.netWt + (parseFloat(curr.netWt) || 0),
        grossWt: acc.grossWt + (parseFloat(curr.grossWt) || 0),
      }),
      { sqm: 0, boxes: 0, netWt: 0, grossWt: 0 }
    );

    setFormData((prev) => ({
      ...prev,
      containerDetails: newContainers,
      totalSqm: totals.sqm.toFixed(2),
      totalBoxes: totals.boxes,
      totalNetWeight: totals.netWt.toFixed(2),
      totalGrossWeight: totals.grossWt.toFixed(2),
    }));
  };

  const handleInvoiceChange = async (invoiceNo) => {
    const inv = invoices.find((i) => (i.invoiceNo || i.invoice_no) === invoiceNo);
    if (inv) {
      setFormData((prev) => ({
        ...prev,
        invoiceReference: invoiceNo,
        clientName: inv.clientName || inv.client_name || '',
      }));
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.instructionNo) e.instructionNo = 'Required';
    if (!formData.bookingNo) e.bookingNo = 'Required';
    // Remove invoiceReference requirement as it is redundant with exportInvoiceNo which is read-only
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSyncPIData = async () => {
    const vgmId = formData.vgmId;
    if (!vgmId) return;
    try {
      setLoading(true);
      const inheritedData = await getShippingInheritedData(vgmId);
      if (inheritedData) {
        const mappedData = exportMapper.mapVGMToSI(inheritedData);
        setFormData(prev => ({
          ...prev,
          ...mappedData,
          instructionNo: prev.instructionNo || mappedData.instructionNo || '',
          vgmId: prev.vgmId,
          id: prev.id,
          exists: prev.exists,
          ei_updated_at: inheritedData.ei_updated_at || inheritedData.eiUpdatedAt || prev.ei_updated_at,
        }));
        showSuccess('Data synced from latest PI & VGM!');
      }
    } catch (e) {
      console.error('Sync failed:', e);
      showError('Failed to sync with latest master data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setShowPrintModal(true);
    setTimeout(async () => {
      if (printRef.current) {
        showSuccess('Generating PDF...');
        const filename = generateEnterpriseFilename({
          moduleName: 'SHIPPING-INSTRUCTIONS',
          documentNo: formData?.instructionNo || 'SI',
          clientName: formData?.client_name || formData?.clientName || '',
          date: formData?.invoice_date || formData?.invoiceDate || '',
          extension: 'pdf'
        });
        const result = await downloadPDF(printRef.current, filename);
        if (!result?.success) showError('Failed to generate PDF');
      } else {
        showError('Print view not ready, please try again');
      }
    }, 800);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      scrollToFirstError();
      showError('Please fill required fields');
      return;
    }
    try {
      const saveInvoiceId = invoiceId || formData.export_invoice_id || exportInvoiceId || '';
      const savePayload = { ...formData, export_invoice_id: saveInvoiceId, exportInvoiceId: saveInvoiceId };
      if (onSave) {
        // ensure invoice id included so caller can handle correctly (both snake and camel case)
        await onSave(savePayload);
      } else {
        // Fallback direct save if onSave not provided (full page mode)
        if (saveInvoiceId) {
          await api.post(`/shipping-instructions/by-export-invoice/${saveInvoiceId}`, savePayload);
        } else {
          await api.post('/shipping-instructions/', savePayload);
        }
      }
      showSuccess('Shipping Instruction saved');

      // Dispatch event for live update in dashboards
      window.dispatchEvent(new CustomEvent('shippingInstruction:changed'));

      if (onBack) onBack();
    } catch (err) {
      showError('Save failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <>
      <Container fluid className="py-4 bg-light min-vh-100">
        <div className="d-flex flex-row justify-content-between align-items-center gap-2 mb-2"
          style={{ padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div className="d-flex align-items-center gap-2">
            <Button variant="outline" onClick={onBack} className="p-1 bg-white shadow-sm" style={{ padding: '4px 8px', flexShrink: 0 }}>
              <ArrowLeft size={16} />
            </Button>
            <Ship size={18} className="text-primary" style={{ flexShrink: 0 }} />
            <div>
              <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem', color: '#1a1a2e' }}>Shipping Instruction Form</h5>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>Fill booking and container details for shipment</span>
            </div>
          </div>
          <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
            {!viewOnly && formData.vgmId && (
              <Button variant="info" onClick={handleSyncPIData} className="shadow-sm fw-bold text-white" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px' }}>
                <RefreshCw size={14} className="me-1" /> Sync Latest PI Data
              </Button>
            )}
            {!viewOnly && (
              <Button variant="primary" onClick={handleSubmit} className="shadow-sm fw-bold" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px' }}>
                <Save size={14} className="me-1" /> {formData.id ? 'Update' : 'Save'} SI
              </Button>
            )}
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {formData.exists && formData.ei_updated_at && formData.updated_at && new Date(formData.ei_updated_at) > new Date(formData.updated_at) && !viewOnly && (
            <Alert variant="warning" className="mb-4 d-flex align-items-center fw-bold shadow-sm rounded-3">
              <Info size={20} className="me-2" />
              PI data has been updated. Please click "Sync Latest PI Data" to refresh connected documents.
            </Alert>
          )}
          {/* BASIC INFORMATION */}
          <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
              <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">BASIC INFORMATION</h6>
            </Card.Header>
            <Card.Body className="p-4 bg-white">              <Row className="g-3">
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">VGM No.</Form.Label>
                  <Form.Select
                    onChange={(e) => handleVgmSelect(e.target.value)}
                    value={formData.vgmId || ''}
                    className="form-control-enhanced border-success border-2 fw-bold text-primary"
                  >
                    <option value="">Select VGM...</option>
                    {vgmList.map((v) => {
                      const expRef = (v.exportInvoiceNo || v.export_invoice_no || '').trim();
                      return (
                        <option key={v.id} value={v.id}>
                          {v.vgmNo || v.vgm_no}{expRef ? ` (${expRef})` : ''}
                        </option>
                      );
                    })}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">Instruction No.</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.instructionNo}
                    onChange={(e) => handleInputChange('instructionNo', e.target.value)}
                    readOnly={viewOnly}
                    className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-bold`}
                  />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">Backside No.</Form.Label>
                  <Form.Control value={formData.backsideNo} readOnly className="bg-light border-0 fw-bold read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">Annexure No.</Form.Label>
                  <Form.Control value={formData.annexureNo} readOnly className="bg-light border-0 fw-bold read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">PL No.</Form.Label>
                  <Form.Control value={formData.plNo} readOnly className="bg-light border-0 fw-bold read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">Export Inv No.</Form.Label>
                  <Form.Control value={formData.exportInvoiceNo} readOnly className="bg-light border-0 fw-bold read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">PI No.</Form.Label>
                  <Form.Control value={formData.piNo} readOnly className="bg-light border-0 fw-bold read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Booking No. is mandatory.</Tooltip>}>
                    <Form.Label className="small mb-2 text-uppercase text-danger fw-bold" style={{ cursor: 'help' }}>
                      Booking No. * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Control
                    type="text"
                    value={formData.bookingNo || ''}
                    readOnly
                    className="bg-light border-0 fw-bold read-only-inherited"
                  />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">Export Inv Date</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.exportInvoiceDate || ''}
                    readOnly
                    className="bg-light border-0 fw-bold read-only-inherited"
                  />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">Origin</Form.Label>
                  <Form.Control
                    value={formData.countryOfOrigin || 'INDIA'}
                    readOnly
                    className="bg-light border-0 fw-bold read-only-inherited"
                  />
                </Form.Group>
              </Col>
            </Row>
            </Card.Body>
          </Card>

          {/* PARTIES INFORMATION */}
          <section className="mb-4">
            <div className="blue-ribbon d-flex align-items-center justify-content-start">
              <Globe size={18} className="me-2 text-white" />
              <span className="text-white">PARTIES INFORMATION</span>
            </div>
            <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
              <Row className="g-4">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Exporter / Shipper</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={formData.exporterDetails}
                      onChange={(e) => handleInputChange('exporterDetails', e.target.value.toUpperCase())}
                      readOnly={viewOnly}
                      className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-medium shadow-none`}
                      style={{ resize: 'vertical' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Consignee</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={formData.consigneeDetails}
                      onChange={(e) => handleInputChange('consigneeDetails', e.target.value.toUpperCase())}
                      readOnly={viewOnly}
                      className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-medium shadow-none`}
                      style={{ resize: 'vertical' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Notify Party I</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={formData.notifyParty1}
                      onChange={(e) => handleInputChange('notifyParty1', e.target.value.toUpperCase())}
                      readOnly={viewOnly}
                      className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-medium shadow-none`}
                      style={{ resize: 'vertical' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase">Notify Party II</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={formData.notifyParty2}
                      onChange={(e) => handleInputChange('notifyParty2', e.target.value.toUpperCase())}
                      readOnly={viewOnly}
                      className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-medium shadow-none`}
                      style={{ resize: 'vertical' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </section>

          {/* VESSEL & CARGO DETAILS */}
          <section className="mb-4">
            <div className="blue-ribbon d-flex align-items-center justify-content-start">
              <Anchor size={18} className="me-2 text-white" />
              <span className="text-white">VESSEL & CARGO DETAILS</span>
            </div>
            <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
              <Row className="g-4">
                <Col lg={4}>
                  <div className="p-4 bg-white rounded-4 border shadow-sm h-100">
                    <h6 className="fw-bold text-dark mb-3 small text-uppercase tracking-wider border-bottom pb-2">Transit Details</h6>
                    <Row className="g-3">
                      <Col xs={8}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Vessel / Voyage</Form.Label>
                        <Form.Control
                          value={formData.vesselName}
                          onChange={(e) => handleInputChange('vesselName', e.target.value.toUpperCase())}
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-bold`}
                          style={{ borderRadius: '8px', height: '48px' }}
                        />
                      </Col>
                      <Col xs={4}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">ETD</Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.etd}
                          onChange={(e) => handleInputChange('etd', e.target.value)}
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-bold`}
                          style={{ borderRadius: '8px' }}
                        />
                      </Col>
                      <Col xs={6}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">POL</Form.Label>
                        <Form.Control
                          value={formData.pol}
                          onChange={(e) => handleInputChange('pol', e.target.value.toUpperCase())}
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-bold`}
                          style={{ borderRadius: '8px', height: '48px' }}
                        />
                      </Col>
                      <Col xs={6}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">POD</Form.Label>
                        <Form.Control
                          value={formData.pod}
                          onChange={(e) => handleInputChange('pod', e.target.value.toUpperCase())}
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-bold`}
                          style={{ borderRadius: '8px', height: '48px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">Final Destination</Form.Label>
                        <Form.Control
                          value={formData.finalDestination}
                          onChange={(e) => handleInputChange('finalDestination', e.target.value.toUpperCase())}
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-bold`}
                          style={{ borderRadius: '8px', height: '48px' }}
                        />
                      </Col>
                    </Row>
                  </div>
                </Col>

                <Col lg={4}>
                  <div className="p-4 bg-white rounded-4 border shadow-sm h-100">
                    <h6 className="fw-bold text-dark mb-3 small text-uppercase tracking-wider border-bottom pb-2">Compliance Details</h6>
                    <Row className="g-3">
                      <Col xs={6}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">HS Code</Form.Label>
                        <Form.Control
                          value={formData.hsCode}
                          onChange={(e) => handleInputChange('hsCode', e.target.value.toUpperCase())}
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'bg-white border-1'} fw-bold`}
                          style={{ borderRadius: '8px', height: '48px' }}
                        />
                      </Col>
                      <Col xs={6}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">SB No.</Form.Label>
                        <Form.Control
                          value={formData.sbNo}
                          onChange={(e) => handleInputChange('sbNo', e.target.value.toUpperCase())}
                          placeholder="Shipping Bill No."
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-bold`}
                          style={{ borderRadius: '8px' }}
                        />
                      </Col>
                      <Col xs={6}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">SB Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.sbDate}
                          onChange={(e) => handleInputChange('sbDate', e.target.value)}
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-bold`}
                          style={{ borderRadius: '8px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Form.Label className="small fw-bold text-muted text-uppercase">BIETC Number</Form.Label>
                        <Form.Control
                          value={formData.bietcNumber}
                          onChange={(e) => handleInputChange('bietcNumber', e.target.value.toUpperCase())}
                          placeholder="BIETC / CNCA No."
                          readOnly={viewOnly}
                          className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-bold`}
                          style={{ borderRadius: '8px' }}
                        />
                      </Col>
                    </Row>
                  </div>
                </Col>

                <Col lg={4}>
                  <div className="p-4 bg-white rounded-3 h-100 border-start border-4 border-primary shadow-sm">
                    <h6 className="fw-bold text-dark mb-4 small text-uppercase tracking-wider">Document Summary</h6>
                    <Row className="g-4">
                      <Col xs={6}>
                        <label className="small text-muted d-block text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Total SQM</label>
                        <span className="fw-bold h4 text-primary mb-0">{(parseFloat(formData.totalSqm) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </Col>
                      <Col xs={6}>
                        <label className="small text-muted d-block text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Total Boxes</label>
                        <span className="fw-bold h4 text-primary mb-0">{formData.totalBoxes || '0'}</span>
                      </Col>
                      <Col xs={6}>
                        <label className="small text-muted d-block text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Net Weight (KG)</label>
                        <span className="fw-bold h4 text-primary mb-0">{(parseFloat(formData.totalNetWeight) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </Col>
                      <Col xs={6}>
                        <label className="small text-muted d-block text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Gross Weight (KG)</label>
                        <span className="fw-bold h4 text-primary mb-0">{(parseFloat(formData.totalGrossWeight) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>
            </div>
          </section>

          {/* SI DESCRIPTION SECTION */}
          <section className="mb-4">
            <div className="p-4 border rounded-4 bg-white shadow-sm">
              <Row>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">SI Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={6}
                      value={formData.siDescription || ''}
                      onChange={(e) => handleInputChange('siDescription', e.target.value.toUpperCase())}
                      readOnly={viewOnly}
                      className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-medium`}
                      placeholder="Enter detailed shipping instructions and description of goods..."
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </section>

          <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Header className="bg-primary text-white py-3 border-0">
              <h6 className="mb-0 fw-bold text-uppercase tracking-wider d-flex align-items-center">
                <FileText size={18} className="me-2" />
                INSTRUCTIONS & TERMS
              </h6>
            </Card.Header>
            <Card.Body className="p-4 bg-white">
              <Row className="g-4">
                <Col md={12}>
                  <Form.Group className="mb-0">
                    <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">Bill of Lading Type</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g. Clean on Board / Shipped on Board"
                      value={formData.blType || ''}
                      onChange={(e) => handleInputChange('blType', e.target.value.toUpperCase())}
                      readOnly={viewOnly}
                      className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-bold`}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-0 mt-3">
                    <Form.Label className="small fw-bold text-muted text-uppercase tracking-wider">Freight Payable</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g. FREIGHT PAYABLE AT MUNDRA / PREPAID"
                      value={formData.freightPayableAt || ''}
                      onChange={(e) => handleInputChange('freightPayableAt', e.target.value.toUpperCase())}
                      readOnly={viewOnly}
                      className={`${viewOnly ? 'bg-light border-0' : 'border-1'} fw-bold`}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
              <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white d-flex align-items-center">
                <Hash size={18} className="me-2 text-white" />
                CONTAINERIZED CARGO DETAILS
              </h6>
            </Card.Header>
            <Card.Body className="p-4 bg-white">
              <DoubleScrollbarWrapper deps={[formData.containerDetails]} wrapperClassName="table-responsive mb-4 rounded-3 border shadow-sm">
                <Table hover size="sm" className="align-middle mb-0">
                  <thead className="bg-light small text-muted text-uppercase">
                    <tr style={{ height: '45px' }}>
                      <th className="ps-3 text-center" style={{ width: '60px' }}>Sr. No.</th>
                      <th className="ps-4" style={{ width: '220px', textAlign: 'left' }}>Container No.</th>
                      <th className="ps-4" style={{ width: '200px', textAlign: 'left' }}>Seal No.</th>
                      <th className="text-center" style={{ width: '100px' }}>SQM</th>
                      <th className="text-center" style={{ width: '100px' }}>Boxes</th>
                      <th className="text-center" style={{ width: '110px' }}>Net Wt</th>
                      <th className="text-center pe-3" style={{ width: '110px' }}>Gr. Wt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.containerDetails.map((c, i) => (
                      <tr key={i} style={{ height: '55px' }}>
                        <td data-label="Sr. No." className="ps-3 text-muted fw-bold text-center">{i + 1}</td>
                        <td data-label="Container No." className="ps-4 fw-bold">{c.containerNo || '-'}</td>
                        <td data-label="Seal No." className="ps-4 fw-bold">{c.sealNo || '-'}</td>
                        <td data-label="SQM" className="text-center fw-bold">{c.sqm || 0}</td>
                        <td data-label="Boxes" className="text-center fw-bold">{c.boxes || 0}</td>
                        <td data-label="Net Wt" className="text-center fw-bold">{c.netWt || 0}</td>
                        <td data-label="Gr. Wt" className="pe-3 text-center fw-bold">{c.grossWt || 0}</td>
                      </tr>
                    ))}
                    {(formData.containerDetails?.length || 0) > 0 && (
                      <tr className="bg-light fw-bold border-top" style={{ height: '50px' }}>
                        <td colSpan={3} className="text-end pe-4 small text-muted fw-bold text-uppercase">
                          TOTALS:
                        </td>
                        <td className="text-primary text-center">{parseFloat(formData.totalSqm || 0).toFixed(2)}</td>
                        <td className="text-primary text-center">{formData.totalBoxes || 0}</td>
                        <td className="text-primary text-center">{parseFloat(formData.totalNetWeight || 0).toFixed(2)}</td>
                        <td className="text-primary text-center pe-3">{parseFloat(formData.totalGrossWeight || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {(formData.containerDetails?.length || 0) === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-muted small bg-light fst-italic">
                          No containers added. Select a VGM to inherit details.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </DoubleScrollbarWrapper>

              {/* Mobile View: Container Cards */}
              <div className="d-block d-lg-none">
                {formData.containerDetails && formData.containerDetails.length > 0 ? (
                  <>
                    {formData.containerDetails.map((c, i) => (
                      <Card key={i} className="mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Header className="bg-white py-3 px-3 border-bottom d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
                            <Hash size={18} className="text-primary" />
                          </div>
                          <span className="fw-bold text-dark text-uppercase tracking-wider">Container #{i + 1}</span>
                        </Card.Header>
                        <Card.Body className="p-3">
                          <Row className="g-3 mb-4">
                            <Col xs={12}>
                              <div className="p-2 bg-light rounded-3 border">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '10px', fontWeight: '800' }}>Container Number</small>
                                <span className="fw-bold fs-6 text-primary">{c.containerNo || '-'}</span>
                              </div>
                            </Col>
                            <Col xs={12}>
                              <div className="p-2 bg-light rounded-3 border">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '10px', fontWeight: '800' }}>Seal / E-Seal Number</small>
                                <span className="fw-bold small">{c.sealNo || '-'}</span>
                              </div>
                            </Col>
                          </Row>

                          <div className="p-3 bg-primary bg-opacity-10 rounded-4 border border-primary border-opacity-10 mb-4 shadow-sm">
                            <Row className="g-3 text-center">
                              <Col xs={6} className="border-end border-primary border-opacity-10">
                                <small className="text-primary fw-bold text-uppercase d-block mb-1" style={{ fontSize: '10px' }}>Quantity (SQM)</small>
                                <span className="fw-bold fs-5">{c.sqm || 0}</span>
                              </Col>
                              <Col xs={6}>
                                <small className="text-primary fw-bold text-uppercase d-block mb-1" style={{ fontSize: '10px' }}>Total Boxes</small>
                                <span className="fw-bold fs-5">{c.boxes || 0}</span>
                              </Col>
                            </Row>
                          </div>

                          <div className="d-flex gap-2">
                            <div className="flex-grow-1 bg-white border rounded-3 p-2 text-center shadow-sm">
                              <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Net Wt</small>
                              <span className="fw-bold text-danger">{parseFloat(c.netWt || 0).toLocaleString()} <small>kg</small></span>
                            </div>
                            <div className="flex-grow-1 bg-white border rounded-3 p-2 text-center shadow-sm">
                              <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Gross Wt</small>
                              <span className="fw-bold text-danger">{parseFloat(c.grossWt || 0).toLocaleString()} <small>kg</small></span>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}

                    {/* Mobile Summary Card */}
                    <Card className="border-0 shadow-sm rounded-4 mb-4 bg-primary text-white">
                      <Card.Body className="p-3">
                        <h6 className="fw-bold mb-3 border-bottom border-white border-opacity-25 pb-2 text-uppercase small">Shipment Summary</h6>
                        <Row className="g-2 small">
                          <Col xs={6}>Total Containers:</Col>
                          <Col xs={6} className="text-end fw-bold">{formData.containerDetails.length}</Col>
                          <Col xs={6}>Total SQM:</Col>
                          <Col xs={6} className="text-end fw-bold">{parseFloat(formData.totalSqm || 0).toFixed(2)}</Col>
                          <Col xs={6}>Total Boxes:</Col>
                          <Col xs={6} className="text-end fw-bold">{formData.totalBoxes || 0}</Col>
                          <Col xs={12} className="my-2 border-top border-white border-opacity-25"></Col>
                          <Col xs={6}>TOTAL NET WT:</Col>
                          <Col xs={6} className="text-end fw-bold">{parseFloat(formData.totalNetWeight || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</Col>
                          <Col xs={6} className="fs-6">TOTAL GROSS WT:</Col>
                          <Col xs={6} className="text-end fw-bold fs-6">{parseFloat(formData.totalGrossWeight || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-5 bg-white rounded-4 border">
                    <Package size={32} className="text-muted opacity-50 mb-2" />
                    <p className="text-muted mb-0 small">No container details inherited.</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>







          <div className="mt-4 pt-4 border-top d-flex justify-content-end gap-2 bg-white p-3 rounded-4 shadow-sm">
            <Button
              variant="outline-secondary"
              onClick={onBack}
              className="px-5 py-2 fw-bold shadow-sm"
              style={{ borderRadius: '10px', height: '48px', minWidth: '120px' }}
            >
              Cancel
            </Button>
            {!viewOnly && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                className="px-5 py-2 fw-bold shadow-lg"
                style={{ borderRadius: '10px', height: '48px', minWidth: '200px' }}
              >
                <Save size={20} className="me-2" /> {formData.id ? 'Update' : 'Save'} Instruction
              </Button>
            )}
          </div>

          {/* Activity History */}
          {(formData.id || formData.exists) && (
            <Card className="mt-4 shadow-sm border-0 rounded-4 overflow-hidden mb-5">
              <Card.Header className="bg-light py-3 border-0 d-flex align-items-center">
                <History className="me-2 text-primary" size={20} />
                <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Activity History</h6>
              </Card.Header>
              <Card.Body className="p-0 bg-white">
                <ModuleAuditLog resourceType="shipping_instruction" resourceId={formData.id} />
              </Card.Body>
            </Card>
          )}
        </Form>
      </Container>

      {showPrintModal && (
        <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Shipping Instruction Preview â€” {formData.instructionNo || ''}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light">
            <div ref={printRef}>
              <ShippingInstructionsPrintView data={formData} />
            </div>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
}
