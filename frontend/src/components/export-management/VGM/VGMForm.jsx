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
import { Container, Row, Col, Card, Form, Table, Spinner, Badge, OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import { Save, ChevronRight, Scale, RefreshCcw, ArrowLeft, History, Hash, Package, FileText, Info, Check } from 'lucide-react';
import api from '../../../services/api';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import Button from '../../shared/Button.jsx';
import HelpTooltip from '../../shared/HelpTooltip.jsx';
import DoubleScrollbarWrapper from '../../shared/DoubleScrollbarWrapper.jsx';
import { useExportDocumentReferences } from '../../../hooks/useExportDocumentReferences.js';
import { exportMapper } from '../../../utils/exportMapper';
import ModuleAuditLog from '../../shared/ModuleAuditLog.jsx';
import { useMasterData } from '../../../hooks/useMasterData.js';
import AddableDropdown from '../../shared/AddableDropdown.jsx';
import { scrollToFirstError } from '../../../utils/validationUIHelper.js';
import DocumentLockHeader from '../../shared/DocumentLockHeader.jsx';

function VGMForm({ exportInvoiceId: propExportInvoiceId, onBack, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Master data for dropdowns â€” same hook used across all forms
  const masterData = useMasterData();

  const { fetchBacksideReferences, getVGMInheritedData, references } = useExportDocumentReferences();
  const backsides = references?.backsides || [];

  // Track the initial invoice ID separately so backside selection doesn't retrigger init
  const initialInvoiceId = propExportInvoiceId || sessionStorage.getItem('vgm_invoice_id') || '';
  const initRanRef = useRef(false);
  const backsideJustSelectedRef = useRef(false);

  const [formData, setFormData] = useState({
    export_invoice_id: initialInvoiceId,
    vgm_no: '', vgm_date: '',
    export_invoice_no: '',
    export_invoice_date: '',
    annexure_no: '',
    pi_no: '',
    pi_date: '',
    pl_no: '',
    shipper_name: '',
    shipper_iec: '',
    authorized_person: '',
    contact_details: '',
    max_permissible_weight: '',
    weighbridge_name: '',
    weighing_method: '',
    cargo_type: '',
    un_no_imdg: 'NA',
    container_no: 'AS PER ATTACHMENT',
    container_size: 'TEU',
    box_type: '',
    pallet_type: '',
    weighing_slip_no: 'AS PER BELOW DETAILS',
    weighing_date: 'AS PER BELOW DETAILS',
    container_sheet: [],
    backside_no: '',
    invoice_backside_id: '',
    client_name: '',
    vessel_name: '',
    voyage_no: '',
    port_of_loading: '',
    country_of_origin: 'INDIA',
    product_description: 'AS PER ATTACHMENT',
    id: null,
    status: 'Draft',
    ei_updated_at: '',
    updated_at: ''
  });
  const [errors, setErrors] = useState({});

  const [selectedBackside, setSelectedBackside] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);

  // Using references from useExportDocumentReferences hook

  const loadVGMData = useCallback(async (invoiceId) => {
    try {
      setLoading(true);
      // Use the smart module endpoint
      const res = await api.get(`/vgm/by-export-invoice/${invoiceId}`);
      const data = res.data?.data;

      if (data) {
        // Ensure we merge the overall response (containing fallbacks like pi_no) with the specific VGM record
        const targetVgm = data.vgm ? { ...data, ...data.vgm } : data;
        const mappedData = exportMapper.mapBacksideToVGM(targetVgm);

        // Data loaded successfully

        const finalData = {
          ...mappedData,
          vgm_no: mappedData.vgm_no || (targetVgm.vgm_no || targetVgm.vgmNo) || '',
          id: targetVgm.id || null, // Preserve real ID for existing records
          exists: !!targetVgm.id && targetVgm.id !== '',
          status: targetVgm.status || 'Draft',
          export_invoice_id: invoiceId, // Explicitly preserve the ID we passed in
          ei_updated_at: targetVgm.ei_updated_at || targetVgm.eiUpdatedAt || '',
          updated_at: targetVgm.updated_at || targetVgm.updatedAt || ''
        };

        setFormData(prev => ({
          ...prev,
          ...finalData
        }));

        if (targetVgm.invoice_backside_id) {
          setSelectedBackside(targetVgm.invoice_backside_id);
        }
        return finalData;
      }
    } catch (e) {
      console.error('VGM Data Load Error:', e);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);


  // Run init only once on mount (not on formData.export_invoice_id changes)
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    const init = async () => {
      const currentInvoiceId = initialInvoiceId;

      setLoading(true);
      try {
        if (!currentInvoiceId) {

          await fetchBacksideReferences(); // Fetch all available backsides for selection
          // Fetch next sequential VGM number for new standalone VGMs
          try {
            const res = await api.get('/vgm/next-number');
            if (res.data?.data?.vgmNo) {
              setFormData(p => ({
                ...p,
                vgm_no: p.vgm_no || res.data.data.vgmNo,
                vgm_date: p.vgm_date || new Date().toLocaleDateString('en-CA')
              }));
            }
          } catch (e) {
            console.error('[VGMForm] Failed to fetch next number:', e);
          }
          setLoading(false);
          return;
        }

        const loadedData = await loadVGMData(currentInvoiceId);


        // Fetch references for the dropdown
        const activeBacksideId = loadedData?.invoice_backside_id || '';
        await fetchBacksideReferences(null, '', currentInvoiceId, activeBacksideId);

        // Peek next number only if we have NO existing ID AND NO fallback number was provided
        if (!loadedData?.id && (!loadedData?.vgm_no || loadedData.vgm_no === '' || loadedData.vgm_no.includes('undefined'))) {
          try {
            const res = await api.get('/vgm/next-number');
            if (res.data?.data?.vgmNo) {
              setFormData(p => ({
                ...p,
                vgm_no: p.vgm_no && !p.vgm_no.includes('undefined') ? p.vgm_no : res.data.data.vgmNo
              }));
            }
          } catch (e) {
            console.error('[VGMForm] Failed to fetch next number:', e);
          }
        }
      } catch (err) {
        console.error('[VGMForm] Init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
     
  }, []);


  const handleBacksideChange = async (e) => {
    const id = e.target.value;
    setSelectedBackside(id);
    if (!id) return;

    backsideJustSelectedRef.current = true;
    setLoading(true);
    try {
      const resp = await api.get(`/export-documents/inherit/vgm/${id}`);
      const rawData = resp.data?.data;

      if (rawData) {
        const mappedData = exportMapper.mapBacksideToVGM(rawData);

        const invoiceId = rawData.exportInvoiceId || rawData.export_invoice_id || formData.export_invoice_id;

        // CRITICAL: Check if a VGM already exists for this invoice
        if (invoiceId) {
          const existingData = await loadVGMData(invoiceId);
          if (existingData && existingData.id) {

            setLoading(false);
            return;
          }
        }

        // For new documents (inherited), we ignore the current form state number to allow fresh generation
        let nextVgmNo = mappedData.vgm_no || '';

        // Fetch sequential number if inheritance provided nothing
        if (!nextVgmNo || nextVgmNo === '' || nextVgmNo.includes('undefined')) {
          try {
            const res = await api.get('/vgm/next-number');
            if (res.data?.data?.vgmNo) {
              nextVgmNo = res.data.data.vgmNo;
            }
          } catch (e) {
            console.error('[VGMForm] Failed to fetch next number on backside change:', e);
          }
        }

        // Inherited from backside

        setFormData(prev => ({
          ...prev,
          ...mappedData,
          vgm_no: nextVgmNo,
          invoice_backside_id: id,
          export_invoice_id: invoiceId,
          ei_updated_at: rawData?.ei_updated_at || rawData?.eiUpdatedAt || '',
          updated_at: rawData?.updated_at || rawData?.updatedAt || ''
        }));
      }
    } catch (err) {
      console.error('Backside select error:', err);
      showError('Failed to fetch data from Backside');
    } finally {
      setLoading(false);
    }
  };


  const handleSheetChange = (index, field, value) => {
    setFormData(prev => {
      const newSheet = [...prev.container_sheet];
      const updatedRow = { ...newSheet[index], [field]: value };

      if (field === 'cargo_wt' || field === 'tare_wt') {
        const c = parseFloat(updatedRow.cargo_wt || 0);
        const t = parseFloat(updatedRow.tare_wt || 0);
        updatedRow.vgm_weight = parseFloat((c + t).toFixed(2));
      }
      
      newSheet[index] = updatedRow;
      return { ...prev, container_sheet: newSheet };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.vessel_name) newErrors.vessel_name = 'Vessel name is required';
    if (!formData.port_of_loading) newErrors.port_of_loading = 'Port of loading is required';
    if (!formData.shipper_name) newErrors.shipper_name = 'Shipper name is required';
    if (!formData.weighbridge_name) newErrors.weighbridge_name = 'Weighbridge name is required';
    if (!formData.container_no) newErrors.container_no = 'Container number is required';
    if (!formData.product_description) newErrors.product_description = 'Description is required';
    if (!(formData.booking_number || formData.booking_no)) newErrors.booking_number = 'Booking number is required';
    if (!formData.authorized_person) newErrors.authorized_person = 'Authorized signatory is required';
    if (!formData.contact_details) newErrors.contact_details = 'Contact details are required';
    if (!formData.max_permissible_weight) newErrors.max_permissible_weight = 'Max permissible weight is required';
    if (!formData.weighing_method) newErrors.weighing_method = 'Weighing method is required';
    
    // ISO and Weight Validations (Phase 2)
    if (formData.container_sheet && formData.container_sheet.length > 0) {
      const maxPermissible = parseFloat(formData.max_permissible_weight);
      const containerErrors = [];
      
      formData.container_sheet.forEach((c, idx) => {
        const vgmWt = parseFloat(c.vgm_weight || 0);
        const cargoWt = parseFloat(c.cargo_wt || 0);
        const tareWt = parseFloat(c.tare_wt || 0);
        
        if (cargoWt <= 0) containerErrors.push(`Container ${idx+1} (${c.container_no || 'Unknown'}): Cargo weight must be > 0.`);
        if (tareWt <= 0) containerErrors.push(`Container ${idx+1} (${c.container_no || 'Unknown'}): Tare weight must be > 0.`);
        
        // Hard Stop: Exceeds ISO limit
        if (!isNaN(maxPermissible) && vgmWt > maxPermissible) {
          containerErrors.push(`Container ${idx+1} (${c.container_no || 'Unknown'}): VGM Weight (${vgmWt} kg) exceeds ISO Max Permissible Payload (${maxPermissible} kg).`);
        }
      });
      
      if (containerErrors.length > 0) {
        newErrors.container_weights = containerErrors.join(' | ');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSyncPIData = async () => {
    const backsideId = selectedBackside || formData.invoice_backside_id;
    if (!backsideId || backsideId === 'current') return;
    try {
      setSaving(true);
      const resp = await api.get(`/export-documents/inherit/vgm/${backsideId}`);
      const rawData = resp.data?.data;
      if (rawData) {
        const mappedData = exportMapper.mapBacksideToVGM(rawData);
        setFormData(prev => ({
          ...prev,
          ...mappedData,
          ei_updated_at: rawData.ei_updated_at || rawData.eiUpdatedAt || prev.ei_updated_at,
        }));
        showSuccess('Data auto-fetched from Export Invoice & Backside!');
      }
    } catch (e) {
      console.error('Sync failed:', e);
      showError('Failed to sync with latest master data');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      scrollToFirstError();
      if (errors.container_weights) {
        showError('WEIGHT VALIDATION FAILED:\n' + errors.container_weights.split(' | ').join('\n'));
      } else {
        showError('Please fill all mandatory fields correctly.');
      }
      return;
    }
    const finalInvoiceId = formData.export_invoice_id;

    if (!finalInvoiceId || finalInvoiceId === 'undefined') {
      showError('Cannot save: Export Invoice reference is lost. Please reload the page or re-select the Backside No.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        export_invoice_id: finalInvoiceId,
        max_permissible_weight: formData.max_permissible_weight || null,
        // Calculate totals on the fly to be safe
        total_cargo_weight: formData.container_sheet.reduce((sum, c) => sum + (parseFloat(c.cargo_wt) || 0), 0),
        total_tare_weight: formData.container_sheet.reduce((sum, c) => sum + (parseFloat(c.tare_wt) || 0), 0),
        total_vgm_weight: formData.container_sheet.reduce((sum, c) => sum + (parseFloat(c.vgm_weight) || 0), 0)
      };

      const res = await api.post(`/vgm/by-export-invoice/${finalInvoiceId}`, payload);
      const raw = res.data?.data || res.data;



      if (raw) {
        // Handle containers from response (may be camelCase from normalizer)
        let containers = raw.container_sheet || raw.containerSheet || raw.containers || [];
        if (typeof containers === 'string') {
          try { containers = JSON.parse(containers); } catch (e) { containers = []; }
        }
        containers = (Array.isArray(containers) ? containers : []).map(c => ({
          container_no: c.container_no || c.containerNo || '',
          line_seal_no: c.line_seal_no || c.lineSealNo || c.seal_no || c.sealNo || '',
          e_seal_no: c.e_seal_no || c.eSealNo || '',
          type: c.type || "20'",
          cargo_wt: parseFloat(c.cargo_wt || c.cargoWt || 0),
          tare_wt: parseFloat(c.tare_wt || c.tareWt || 0),
          vgm_weight: parseFloat(c.vgm_weight || c.vgmWeight || 0),
          slip_no: c.slip_no || c.slipNo || '',
          slip_no_date: c.slip_no_date || c.slipNoDate || ''
        }));

        const vgmDate = raw.vgm_date || raw.vgmDate || '';
        const invDate = raw.invoice_date || raw.invoiceDate || '';

        setFormData(prev => ({
          ...prev,
          id: raw.id || prev.id,
          vgm_no: raw.vgm_no || raw.vgmNo || prev.vgm_no,
          container_sheet: containers,
          vgm_date: vgmDate ? ((String(vgmDate)) ? new Date(String(vgmDate)).toLocaleDateString('en-CA') : '') : prev.vgm_date,
          invoice_date: invDate ? ((String(invDate)) ? new Date(String(invDate)).toLocaleDateString('en-CA') : '') : prev.invoice_date,
          product_description: raw.product_description || raw.productDescription || prev.product_description || 'AS PER ATTACHMENT',
          status: raw.status || prev.status
        }));
      }

      showSuccess('VGM Document saved successfully');

      // Dispatch event for live update in dashboards
      window.dispatchEvent(new CustomEvent('vgm:changed'));

      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Failed to save VGM:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const serverMsg = error.response?.data?.message || error.response?.data?.error;
      showError(serverMsg || `Failed to save VGM document: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    // First save the current data
    await handleSubmit();

    // Then update status to Finalized
    try {
      setSaving(true);
      const finalInvoiceId = formData.export_invoice_id;
      const res = await api.patch(`/vgm/${formData.id || finalInvoiceId}/status`, { status: 'Finalized' });
      const raw = res.data?.data || res.data;
      if (raw) {
        setFormData(prev => ({ ...prev, status: 'Finalized' }));
        showSuccess('VGM Document Finalized successfully');
        setTimeout(() => onBack(), 1500);
      }
    } catch (error) {
      showError('Failed to finalize: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  const piDataOutdated = formData.exists && formData.ei_updated_at && formData.updated_at && new Date(formData.ei_updated_at) > new Date(formData.updated_at);

  return (
    <Container fluid className="py-3 bg-white min-vh-100">
      {/* Breadcrumb Area */}


      <div className="d-flex flex-row justify-content-between align-items-center gap-2 mb-2 px-3"
        style={{ padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <div className="d-flex align-items-center gap-2">
          <Button variant="link" onClick={onBack} className="text-primary p-0" style={{ flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </Button>
          <Scale size={18} className="text-primary" style={{ flexShrink: 0 }} />
          <div>
            <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem', color: '#1a1a2e' }}>VGM Document Form</h5>
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>Step 5: Verified Gross Mass (Method 1)</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
          <DocumentLockHeader isLocked={formData.is_locked} documentType="VGM" documentNo={formData.vgm_no} lockedBy={formData.locked_by_name || formData.locked_by} lockedAt={formData.locked_at} />
          {formData.export_invoice_id && !formData.is_locked && (
             <Button variant="info" onClick={handleSyncPIData} className="fw-bold shadow-sm text-white" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px' }}>
                <RefreshCcw size={14} className="me-1" /> Sync Latest PI Data
             </Button>
          )}

          <OverlayTrigger overlay={formData.is_locked ? <Tooltip>Locked by {formData.locked_by_name || 'Admin'}</Tooltip> : <Tooltip>Save VGM</Tooltip>}>
            <span className="d-inline-block">
              <Button variant={formData.is_locked ? 'secondary' : 'primary'} onClick={handleSubmit} disabled={saving || formData.status === 'Finalized' || formData.is_locked} className="fw-bold shadow-sm" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px', pointerEvents: formData.is_locked ? 'none' : 'auto' }}>
                {saving ? <Spinner animation="border" size="sm" /> : <><Save size={14} className="me-1" /> {!formData.id ? 'Save VGM' : 'Update VGM'}</>}
              </Button>
            </span>
          </OverlayTrigger>
        </div>
      </div>

      <Form 
        onSubmit={handleSubmit} 
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
        className="px-3"
      >
        {piDataOutdated && !formData.is_locked && (
          <Alert variant="warning" className="mb-4 d-flex align-items-center fw-bold shadow-sm rounded-3">
            <Info size={20} className="me-2" />
            PI data has been updated. Please click "Sync Latest PI Data" to refresh connected documents.
          </Alert>
        )}

        {/* BASIC INFORMATION */}
        <section className="mb-4">
          <div className="blue-ribbon">BASIC INFORMATION</div>
          <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
            <Row className="g-3">
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">BACKSIDE NO.</label>
                  <Form.Select
                    value={selectedBackside || ''}
                    onChange={handleBacksideChange}
                    className="vgm-input-style fw-bold text-primary"
                  >
                    <option value="">Select Backside...</option>
                    {formData.backside_no && (
                      <option value="current" disabled>{formData.backside_no}</option>
                    )}
                    {backsides.map((b, i) => (
                      <option key={b.id || i} value={b.id}>
                        {b.backside_no || b.backsideNo || b.invoice_no || b.id}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">VGM NO.</label>
                  <Form.Control value={formData.vgm_no} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">VGM DATE</label>
                  <Form.Control
                    type="date"
                    value={formData.vgm_date || ''}
                    onChange={e => setFormData({ ...formData, vgm_date: e.target.value })}
                    className="vgm-input-style fw-bold text-primary"
                  />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">ANNEXURE NO.</label>
                  <Form.Control value={formData.annexure_no} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">PL NO.</label>
                  <Form.Control value={formData.pl_no} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">EXPORT INV NO.</label>
                  <Form.Control value={formData.export_invoice_no} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">ORIGIN</label>
                  <Form.Control value={formData.country_of_origin || 'INDIA'} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">EXPORT INV DATE</label>
                  <Form.Control value={formData.export_invoice_date} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">CLIENT NAME</label>
                  <Form.Control value={formData.client_name || '-'} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">PI NO.</label>
                  <Form.Control value={formData.pi_no} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <label className="vgm-label">PI DATE</label>
                  <Form.Control value={formData.pi_date} readOnly className="vgm-input-style fw-bold text-dark read-only-inherited" />
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Vessel Name is mandatory.</Tooltip>}>
                    <label className="vgm-label text-danger" style={{cursor: 'help'}}>
                      VESSEL NAME * <Info size={12} className="ms-1" />
                    </label>
                  </OverlayTrigger>
                  <Form.Control
                    value={formData.vessel_name || ''}
                    onChange={e => {
                      setFormData({ ...formData, vessel_name: e.target.value });
                      if (errors.vessel_name) setErrors({...errors, vessel_name: null});
                    }}
                    isInvalid={!!errors.vessel_name}
                    className="vgm-input-style fw-bold text-primary"
                  />
                  <Form.Control.Feedback type="invalid">{errors.vessel_name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Port of Loading is mandatory.</Tooltip>}>
                    <label className="vgm-label text-danger" style={{cursor: 'help'}}>
                      POL * <Info size={12} className="ms-1" />
                    </label>
                  </OverlayTrigger>
                  <Form.Control
                    value={formData.port_of_loading || ''}
                    onChange={e => {
                      setFormData({ ...formData, port_of_loading: e.target.value });
                      if (errors.port_of_loading) setErrors({...errors, port_of_loading: null});
                    }}
                    isInvalid={!!errors.port_of_loading}
                    className="vgm-input-style fw-bold text-primary"
                  />
                  <Form.Control.Feedback type="invalid">{errors.port_of_loading}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </div>
        </section>

        {/* INFORMATION ABOUT VERIFIED GROSS MASS */}
        <section className="mb-4">
          <div className="blue-ribbon">INFORMATION ABOUT VERIFIED GROSS MASS</div>
          <div className="p-4 border border-top-0 rounded-bottom-3 bg-white shadow-sm">
            <Row className="g-4 mb-4">
              <Col md={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Main container identifying number is mandatory.</Tooltip>}>
                    <label className="vgm-label text-danger" style={{cursor: 'help'}}>
                      CONTAINER NO. * <Info size={12} className="ms-1" />
                    </label>
                  </OverlayTrigger>
                  <Form.Control
                    value={formData.container_no || ''}
                    onChange={e => {
                      setFormData({ ...formData, container_no: e.target.value.toUpperCase() });
                      if (errors.container_no) setErrors({...errors, container_no: null});
                    }}
                    isInvalid={!!errors.container_no}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="Enter Container Number"
                  />
                  <Form.Control.Feedback type="invalid">{errors.container_no}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <label className="vgm-label text-primary">CONTAINER SIZE</label>
                  <Form.Select
                    value={formData.container_size || 'TEU'}
                    onChange={e => setFormData({ ...formData, container_size: e.target.value })}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                  >
                    <option value="TEU">TEU (20 FT)</option>
                    <option value="FEU">FEU (40 FT)</option>
                    <option value="OTHER">OTHER</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row className="g-4 mb-4">
              <Col md={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Shipper Name is mandatory.</Tooltip>}>
                    <label className="vgm-label text-danger" style={{cursor: 'help'}}>
                      NAME OF THE SHIPPER * <Info size={12} className="ms-1" />
                    </label>
                  </OverlayTrigger>
                  <Form.Control
                    value={formData.shipper_name}
                    onChange={e => {
                      setFormData({ ...formData, shipper_name: e.target.value.toUpperCase() });
                      if (errors.shipper_name) setErrors({...errors, shipper_name: null});
                    }}
                    isInvalid={!!errors.shipper_name}
                    className="vgm-input-style"
                  />
                  <Form.Control.Feedback type="invalid">{errors.shipper_name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <label className="vgm-label text-danger">BOOKING NUMBER *</label>
                  <Form.Control
                    value={formData.booking_number || formData.booking_no || ''}
                    onChange={e => {
                      setFormData({ ...formData, booking_number: e.target.value.toUpperCase() });
                      if (errors.booking_number) setErrors({...errors, booking_number: null});
                    }}
                    isInvalid={!!errors.booking_number}
                    className="vgm-input-style fw-bold text-dark"
                  />
                  <Form.Control.Feedback type="invalid">{errors.booking_number}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4 mb-4">
              <Col md={6}>
                <Form.Group>
                  <label className="vgm-label">SHIPPER REGISTRATION (IEC NO)</label>
                  <Form.Control
                    value={formData.shipper_iec}
                    onChange={e => setFormData({ ...formData, shipper_iec: e.target.value.toUpperCase() })}
                    className="vgm-input-style"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Where the container was weighed is mandatory.</Tooltip>}>
                    <label className="vgm-label text-danger" style={{cursor: 'help'}}>
                      WEIGHBRIDGE REG. & ADDRESS * <Info size={12} className="ms-1" />
                    </label>
                  </OverlayTrigger>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.weighbridge_name}
                    onChange={e => {
                      setFormData({ ...formData, weighbridge_name: e.target.value.toUpperCase() });
                      if (errors.weighbridge_name) setErrors({...errors, weighbridge_name: null});
                    }}
                    isInvalid={!!errors.weighbridge_name}
                    className="vgm-input-style fw-bold"
                    style={{ resize: 'none' }}
                    placeholder="Enter Weighbridge Details"
                  />
                  <Form.Control.Feedback type="invalid">{errors.weighbridge_name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4 mb-4">
              <Col md={5}>
                <Form.Group>
                  <label className="vgm-label text-danger">NAME AND DESIGNATION OF OFFICIAL OF SHIPPER AUTHORIZED SIGN DOCUMENT *</label>
                  <AddableDropdown
                    value={formData.authorized_person}
                    onChange={(val) => {
                      setFormData({ ...formData, authorized_person: val });
                      if (errors.authorized_person) setErrors({...errors, authorized_person: null});
                    }}
                    masterDataType="authorizedSignatories"
                    label="Authorized Signatory"
                    placeholder="Select Authorized Person"
                    addButtonLabel="+ Create"
                    className="vgm-input-style"
                    isInvalid={!!errors.authorized_person}
                  />
                  {errors.authorized_person && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.authorized_person}</div>}
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <label className="vgm-label text-danger">CONTACT DETAILS *</label>
                  <AddableDropdown
                    value={formData.contact_details}
                    onChange={(val) => {
                      setFormData({ ...formData, contact_details: val });
                      if (errors.contact_details) setErrors({...errors, contact_details: null});
                    }}
                    masterDataType="contactDetails"
                    label="Contact Detail"
                    placeholder="Select Contact"
                    addButtonLabel="+ Create"
                    className="vgm-input-style"
                    isInvalid={!!errors.contact_details}
                  />
                  {errors.contact_details && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.contact_details}</div>}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label text-danger">MAX PERMISSIBLE WT *</label>
                  <AddableDropdown
                    value={String(formData.max_permissible_weight || '')}
                    onChange={(val) => {
                      setFormData({ ...formData, max_permissible_weight: val });
                      if (errors.max_permissible_weight) setErrors({...errors, max_permissible_weight: null});
                    }}
                    masterDataType="maxPermissibleWeights"
                    label="Max Permissible Weight"
                    placeholder="Select Weight"
                    addButtonLabel="+ Create"
                    className="vgm-input-style"
                    isInvalid={!!errors.max_permissible_weight}
                    numbersOnly={true}
                  />
                  {errors.max_permissible_weight && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.max_permissible_weight}</div>}
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <label className="vgm-label text-danger">WEIGHING METHOD *</label>
                  <Form.Select
                    value={formData.weighing_method}
                    onChange={e => {
                      setFormData({ ...formData, weighing_method: e.target.value });
                      if (errors.weighing_method) setErrors({...errors, weighing_method: null});
                    }}
                    isInvalid={!!errors.weighing_method}
                    className="vgm-input-style"
                  >
                    <option value="METHOD-1">METHOD-1</option>
                    <option value="METHOD-2">METHOD-2</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.weighing_method}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4">
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">WEIGHING SLIP NO.</label>
                  <Form.Control
                    value={formData.weighing_slip_no}
                    onChange={e => setFormData({ ...formData, weighing_slip_no: e.target.value.toUpperCase() })}
                    className="vgm-input-style"
                    placeholder="AS PER BELOW DETAILS"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">DATE AND TIME OF WEIGHING SLIP</label>
                  <Form.Control
                    value={formData.weighing_date}
                    onChange={e => setFormData({ ...formData, weighing_date: e.target.value.toUpperCase() })}
                    className="vgm-input-style"
                    placeholder="AS PER BELOW DETAILS"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">TYPE (NORMAL/REEFER/HAZARDOUS)</label>
                  <Form.Select
                    value={formData.cargo_type}
                    onChange={e => setFormData({ ...formData, cargo_type: e.target.value })}
                    className="vgm-input-style"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="REEFER">REEFER</option>
                    <option value="HAZARDOUS">HAZARDOUS</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <label className="vgm-label">IF HAZARDOUS UN NO.IMDG CLASS</label>
                  <Form.Control
                    value={formData.un_no_imdg}
                    onChange={e => setFormData({ ...formData, un_no_imdg: e.target.value.toUpperCase() })}
                    className="vgm-input-style"
                    placeholder="NA"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4 mt-2">
              <Col md={12}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Description of Goods is mandatory.</Tooltip>}>
                    <label className="vgm-label text-danger" style={{cursor: 'help'}}>
                      DESCRIPTION OF GOODS * <Info size={12} className="ms-1" />
                    </label>
                  </OverlayTrigger>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.product_description || ''}
                    onChange={e => {
                      setFormData({ ...formData, product_description: e.target.value.toUpperCase() });
                      if (errors.product_description) setErrors({...errors, product_description: null});
                    }}
                    isInvalid={!!errors.product_description}
                    className="vgm-input-style fw-bold border-primary border-opacity-25"
                    placeholder="Enter Description of Goods"
                  />
                  <Form.Control.Feedback type="invalid">{errors.product_description}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

          </div>
        </section>

        {/* ATTACHED CONTAINER SHEET */}
        <section className="mb-5">
          <div className="blue-ribbon">ATTACHED CONTAINER SHEET</div>
          <div className="border border-top-0 rounded-bottom-3 overflow-hidden bg-white shadow-sm">
            <DoubleScrollbarWrapper deps={[formData.container_sheet]} wrapperClassName="table-responsive ">
              <Table bordered hover className="mb-0 text-center align-middle" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th className="table-header-custom" style={{ width: '60px' }}>SR. NO.</th>
                    <th className="table-header-custom">CONTAINER NO.</th>
                    <th className="table-header-custom">SEAL NO.</th>
                    <th className="table-header-custom">E SEAL NO.</th>
                    <th className="table-header-custom">CONTAINER SIZE</th>
                    <th className="table-header-custom">CARGO WT (KG)</th>
                    <th className="table-header-custom">TARE WT (KG)</th>
                    <th className="table-header-custom">VGM WEIGHT (KG)</th>
                    <th className="table-header-custom">SLIP NO. DATE & TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.container_sheet.map((c, i) => (
                    <tr key={i}>
                      <td data-label="Sr. No." className="fw-bold text-muted">{i + 1}</td>
                      <td data-label="Container No." className="fw-bold">{c.container_no}</td>
                      <td data-label="Seal No.">{c.line_seal_no || c.seal_no || '-'}</td>
                      <td data-label="E Seal No.">{c.e_seal_no || '-'}</td>
                      <td data-label="Container Size">{c.type}</td>
                      <td data-label="Cargo Wt" className="fw-bold text-success">{c.cargo_wt}</td>
                      <td data-label="Tare Wt">
                        <Form.Control
                          size="sm"
                          type="number"
                          value={c.tare_wt !== undefined ? c.tare_wt : ''}
                          onChange={e => handleSheetChange(i, 'tare_wt', e.target.value)}
                          className="text-center fw-bold text-primary border-primary border-opacity-25"
                          style={{ width: '90px', margin: '0 auto', backgroundColor: '#f8f9fa' }}
                        />
                      </td>
                      <td data-label="VGM Weight" className="fw-bold text-primary">{c.vgm_weight}</td>
                      <td data-label="Slip Details">
                        <div className="d-flex flex-column gap-1">
                          <Form.Control
                            size="sm"
                            type="date"
                            value={c.slip_no_date || ''}
                            onChange={e => handleSheetChange(i, 'slip_no_date', e.target.value)}
                            className="border-0 text-center bg-light bg-opacity-50"
                            style={{ fontWeight: 'bold', fontSize: '0.8rem', borderRadius: '4px' }}
                          />
                          <Form.Control
                            size="sm"
                            type="text"
                            value={c.slip_no || ''}
                            onChange={e => handleSheetChange(i, 'slip_no', e.target.value)}
                            className="border-0 text-center bg-transparent border-bottom"
                            style={{ fontWeight: 'bold', fontSize: '0.75rem', borderRadius: '0' }}
                            placeholder="Enter Slip No."
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </DoubleScrollbarWrapper>

            {/* Mobile View: Container Cards */}
            <div className="d-block d-lg-none p-3 bg-light bg-opacity-50">
              {formData.container_sheet && formData.container_sheet.length > 0 ? (
                <>
                  {formData.container_sheet.map((c, i) => (
                    <Card key={i} className="mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
                      <Card.Header className="bg-white py-3 px-3 border-bottom d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
                          <Hash size={18} className="text-primary" />
                        </div>
                        <span className="fw-bold text-dark text-uppercase tracking-wider">Container #{i + 1}</span>
                      </Card.Header>
                      <Card.Body className="p-3">
                        <div className="mb-4 p-2 bg-light rounded-3 d-flex align-items-center justify-content-between">
                          <div>
                            <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '10px', fontWeight: '800' }}>Container No.</small>
                            <span className="fw-bold fs-6 text-primary">{c.container_no}</span>
                          </div>
                          <div className="text-end">
                            <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '10px', fontWeight: '800' }}>Container Size</small>
                            <Badge bg="primary" className="bg-opacity-75">{c.type}</Badge>
                          </div>
                        </div>

                        <Row className="g-3 mb-4">
                          <Col xs={6}>
                            <div className="p-2 border rounded-3 bg-white shadow-sm">
                              <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '9px', fontWeight: '700' }}>Line Seal</small>
                              <span className="fw-bold small d-block truncate">{c.line_seal_no || c.seal_no || '-'}</span>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="p-2 border rounded-3 bg-white shadow-sm">
                              <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '9px', fontWeight: '700' }}>E-Seal</small>
                              <span className="fw-bold small d-block truncate">{c.e_seal_no || '-'}</span>
                            </div>
                          </Col>
                        </Row>

                        <div className="p-3 bg-primary bg-opacity-10 rounded-4 border border-primary border-opacity-10 mb-3 shadow-sm">
                          <Row className="g-3">
                            <Col xs={6}>
                              <small className="text-primary fw-bold text-uppercase d-block" style={{ fontSize: '10px' }}>Cargo Wt (kg)</small>
                              <span className="fw-bold text-success fs-5">{c.cargo_wt}</span>
                            </Col>
                            <Col xs={6}>
                              <small className="text-primary fw-bold text-uppercase d-block" style={{ fontSize: '10px' }}>Tare Wt (kg)</small>
                              <Form.Control
                                size="sm"
                                type="number"
                                value={c.tare_wt !== undefined ? c.tare_wt : ''}
                                onChange={e => handleSheetChange(i, 'tare_wt', e.target.value)}
                                className="fw-bold border-primary border-opacity-25 mt-1 text-primary"
                                style={{ height: '36px', borderRadius: '8px', fontSize: '15px', backgroundColor: '#f8f9fa' }}
                              />
                            </Col>
                            <Col xs={12} className="pt-3 border-top border-primary border-opacity-10">
                              <div className="d-flex justify-content-between align-items-center">
                                <small className="text-primary fw-bold text-uppercase" style={{ fontSize: '11px' }}>Verified Gross Mass (VGM)</small>
                                <div className="h3 mb-0 fw-bold text-primary">{c.vgm_weight} <small className="fs-6 opacity-75">kg</small></div>
                              </div>
                            </Col>
                          </Row>
                        </div>

                        <div className="mt-2 p-2 bg-light rounded-3 small text-muted">
                          <div className="d-flex align-items-center mb-2">
                            <FileText size={14} className="me-2 opacity-50" />
                            <span className="me-2" style={{ minWidth: '70px' }}>Slip Date:</span>
                            <Form.Control
                              size="sm"
                              type="date"
                              value={c.slip_no_date || ''}
                              onChange={e => handleSheetChange(i, 'slip_no_date', e.target.value)}
                              className="fw-bold border-0 bg-transparent p-0"
                              style={{ fontSize: '13px' }}
                            />
                          </div>
                          <div className="d-flex align-items-center">
                            <div style={{ width: '14px', marginRight: '8px' }}></div>
                            <span className="me-2" style={{ minWidth: '70px' }}>Slip No:</span>
                            <Form.Control
                              size="sm"
                              type="text"
                              value={c.slip_no || ''}
                              onChange={e => handleSheetChange(i, 'slip_no', e.target.value)}
                              className="fw-bold border-0 bg-transparent p-0 border-bottom"
                              style={{ fontSize: '12px' }}
                              placeholder="Enter Slip No."
                            />
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </>
              ) : (
                <div className="text-center py-5 bg-white rounded-4 border shadow-sm">
                  <Package size={48} className="text-muted opacity-25 mb-3" />
                  <p className="text-muted mb-0 fw-medium">No containers linked.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="d-flex justify-content-end gap-2 mb-5 pt-4 border-top">
          <Button
            variant="outline-secondary"
            onClick={onBack}
            className="px-5 py-2 fw-bold shadow-sm"
            style={{ borderRadius: '10px', height: '48px' }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving || formData.status === 'Finalized'}
            className="px-5 py-2 fw-bold shadow-lg"
            style={{ borderRadius: '10px', height: '48px' }}
          >
            {saving ? <Spinner animation="border" size="sm" /> : <><Save size={18} className="me-2" /> {!formData.id ? 'Save VGM' : 'Update VGM'}</>}
          </Button>
        </div>

        {/* Activity History */}
        {(formData.id || formData.exists) && (
          <Card className="mt-4 shadow-sm border-0 rounded-4 overflow-hidden mb-5">
            <Card.Header className="bg-light py-3 border-0 d-flex align-items-center">
              <History className="me-2 text-primary" size={20} />
              <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Activity History</h6>
            </Card.Header>
            <Card.Body className="p-0 bg-white">
              <ModuleAuditLog resourceType="vgm" resourceId={formData.id} />
            </Card.Body>
          </Card>
        )}

      </Form>
    </Container>
  );
}

export default VGMForm;

