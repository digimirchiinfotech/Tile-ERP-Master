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

import { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Table, Spinner, InputGroup, Badge } from 'react-bootstrap';
import { Save, X, Plus, Trash2, ArrowLeft, FileText, ChevronRight, Truck, Info, CheckCircle, History, Hash, Package } from 'lucide-react';
import api from '../../../services/api';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import Button from '../../shared/Button.jsx';
import { useExportDocumentReferences } from '../../../hooks/useExportDocumentReferences.js';
import DoubleScrollbarWrapper from '../../shared/DoubleScrollbarWrapper.jsx';
import { exportMapper } from '../../../utils/exportMapper';
import AddableDropdown from '../../shared/AddableDropdown.jsx';
import ModuleAuditLog from '../../shared/ModuleAuditLog.jsx';
import { scrollToFirstError } from '../../../utils/validationUIHelper.js';
import { extractValidationErrors } from '../../../utils/validationHelper.js';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
function InvoiceBacksideForm({ exportInvoiceId: initialExportInvoiceId, initialBacksideId, onBack, currentUser }) {
    const [exportInvoiceId, setExportInvoiceId] = useState(initialExportInvoiceId || '');
    const [backsideId, setBacksideId] = useState(initialBacksideId || '');
    const [loading, setLoading] = useState(!!initialExportInvoiceId || !!initialBacksideId);
    const [saving, setSaving] = useState(false);
    const [annexureOptions, setAnnexureOptions] = useState([]);
    const [selectedAnnexure, setSelectedAnnexure] = useState('');
    const [errors, setErrors] = useState({});
    const isFirstLoad = useRef(true);
    const isInheriting = useRef(false);

    const [companyDefaults, setCompanyDefaults] = useState(null);
    const { fetchAnnexureReferences, getBacksideInheritedData } = useExportDocumentReferences();

    const [formData, setFormData] = useState({
        id: null,
        export_invoice_id: '',
        backside_no: '',
        invoice_no: '',
        invoice_date: '',
        pi_no: '',

        pl_no: '',
        annexure_invoice_no: '',
        export_invoice_no: '',
        export_invoice_date: '',
        client_name: '',
        consignee_details: '',
        buyer_details: '',
        vessel_name: '',
        port_of_loading: '',
        port_of_discharge: '',
        final_destination: '',
        booking_no: '',
        shipping_line: '',
        weighbridge_name: '',
        max_permissible_weight: 0,
        cargo_type: '',

        range_name: '',
        division: '',
        commissionerate: '',
        c_no: '',
        c_date: '',
        shipping_bill_no: '',
        shipping_bill_date: '',
        manufacturer_name: '',
        manufacturer_address: '',
        factory_address: '',
        examination_date: '',
        examining_officer: '',
        appraiser_name: '',
        division_range: '',
        location_code: '',
        iec_no: '',
        company_name: '',
        company_address: '',
        total_packages: 0,
        package_type: '',
        total_pallets: 0,
        is_description_match: '',
        goods_description_match: '',
        samples_drawn: '',
        sample_seal_no: '',
        permission_no: '',
        permission_year: '',
        goods_description: '',
        declaration_text: 'EXAMINED THE EXPORT GOODS COVERED UNDER THIS INVOICE ,DESCRIPTION OF THE GOODS WITH REFERENCE TO DUTY DRAWBACK SCHEDULE .\nWEIGHT ARE AS UNDER',
        lut_arn_no: '',
        lut_date: '',
        branch_code_no: '',
        bin_no: '',
        country_of_origin: '',
        net_weight: 0,
        gross_weight: 0,

        container_details: [],
        status: 'Draft'
    });

    // ── Always load all annexures for the dropdown ──
    useEffect(() => {
        const activeId = (selectedAnnexure && selectedAnnexure !== 'current') ? selectedAnnexure : (formData.annexure_id || '');
        fetchAnnexureReferences(null, '', activeId)
            .then(refs => setAnnexureOptions(Array.isArray(refs) ? refs : []))
            .catch(() => { });
    }, [fetchAnnexureReferences, selectedAnnexure, formData.annexure_id]);

    // ── Fetch company profile for defaults (LUT ARN, IEC, etc.) ──
    useEffect(() => {
        const fetchCompanyProfile = async () => {
            const cid = currentUser?.company_id || currentUser?.companyId || localStorage.getItem('companyId');
            if (!cid) return;

            try {
                const res = await api.get(`/companies/${cid}`);
                if (res.data?.data) {
                    const comp = res.data.data;
                    const s = comp.settings || {};
                    const defaults = {
                        company_name: comp.name || '',
                        company_address: comp.address || '',
                        iec_no: comp.iec_no || comp.iecNo || '',
                        lut_arn_no: comp.lut_arn_no || comp.lutArnNo || comp.lut_bond_ref || comp.lutBondRef || comp.lut_arn_bond_no || '',
                        lut_date: (() => { const d = comp.lut_date || comp.lutDate; if (!d) return ''; if (typeof d === 'string' && d.includes('T')) return new Date(d).toLocaleDateString('en-CA'); return d; })(),
                        manufacturer_name: comp.manufacturer_name || '',
                        manufacturer_address: comp.manufacturer_address || '',
                        range_name: s.range_name || '',
                        division: s.division || '',
                        commissionerate: s.commissionerate || '',
                        permission_no: comp.permission_no || s.permission_no || '',
                    };
                    setCompanyDefaults(defaults);

                    setFormData(prev => ({
                        ...prev,
                        // General defaults use fallback (prev || default)
                        company_name: prev.company_name || defaults.company_name,
                        company_address: prev.company_address || defaults.company_address,
                        manufacturer_name: prev.manufacturer_name || defaults.manufacturer_name,
                        manufacturer_address: prev.manufacturer_address || defaults.manufacturer_address,
                        range_name: prev.range_name || defaults.range_name,
                        division: prev.division || defaults.division,
                        commissionerate: prev.commissionerate || defaults.commissionerate,
                        permission_no: prev.permission_no || defaults.permission_no,
                        
                        // Strict overrides: Company Data must absolute priority for these fields
                        iec_no: defaults.iec_no || prev.iec_no,
                        lut_arn_no: defaults.lut_arn_no || prev.lut_arn_no,
                        lut_date: defaults.lut_date || prev.lut_date,
                    }));
                }
            } catch (err) {
                console.error('[BacksideForm] Error fetching company profile:', err);
            }
        };
        fetchCompanyProfile();
    }, [currentUser]);


    useEffect(() => {
        const init = async () => {
            if (!isFirstLoad.current && !isInheriting.current) return;

            try {
                setLoading(true);


                let foundData = null;

                // Priority 1: Fetch by exact Backside ID
                if (backsideId) {
                    try {
                        const res = await api.get(`/invoice-backsides/${backsideId}`);
                        if (res.data?.data) foundData = res.data.data;
                    } catch (e) {
                        console.warn('Failed to fetch by backsideId', e);
                    }
                }

                // Priority 2: Fetch by Export Invoice ID if no exact Backside ID was found
                if (!foundData && exportInvoiceId) {
                    try {
                        const res = await api.get(`/invoice-backsides/export-invoice/${exportInvoiceId}`);
                        if (res.data?.data) foundData = res.data.data;
                    } catch (e) {
                        console.warn('Failed to fetch by exportInvoiceId', e);
                    }
                }

                if (foundData && (foundData.backsideNo || foundData.backside_no)) {
                    // Existing backside record found — load it for editing
                    const mappedData = exportMapper.mapAnnexureToBackside(foundData);

                    // Restore linked annexure state — use 'current' so dropdown
                    // always shows the annexure name even if the UUID is filtered
                    // from the options list (annexure marked is_used=TRUE).
                    if (foundData.annexure_invoice_no || foundData.annexure_id) {
                        setSelectedAnnexure('current');
                    }

                    setFormData(prev => ({
                        ...prev,
                        ...mappedData,
                        // Ensure saved record data takes absolute priority
                        iec_no: companyDefaults?.iec_no || companyDefaults?.iecNo || foundData.iec_no || foundData.iecNo || mappedData.iec_no || prev.iec_no || '',
                        lut_arn_no: companyDefaults?.lut_arn_no || companyDefaults?.lutArnNo || foundData.lut_arn_no || foundData.lutArnNo || mappedData.lut_arn_no || prev.lut_arn_no || '',
                        lut_date: exportMapper.formatDate(companyDefaults?.lut_date || companyDefaults?.lutDate) || exportMapper.formatDate(foundData.lut_date || foundData.lutDate) || mappedData.lut_date || prev.lut_date || '',
                        permission_no: foundData.permission_no || foundData.permissionNo || mappedData.permission_no || prev.permission_no || '',
                        manufacturer_name: foundData.manufacturer_name || foundData.manufacturerName || mappedData.manufacturer_name || prev.manufacturer_name || '',
                        manufacturer_address: foundData.manufacturer_address || foundData.manufacturerAddress || mappedData.manufacturer_address || prev.manufacturer_address || '',
                        samples_drawn: foundData.samples_drawn || foundData.samplesDrawn || mappedData.samples_drawn || prev.samples_drawn || 'N.A.',
                        sample_seal_no: foundData.sample_seal_no || foundData.sampleSealNo || mappedData.sample_seal_no || prev.sample_seal_no || '',
                        customs_seal_no: foundData.customs_seal_no || foundData.customsSealNo || mappedData.customs_seal_no || prev.customs_seal_no || '',
                        id: foundData.id,
                        annexure_id: foundData.annexure_id,
                        container_details: (() => {
                            let rawCD = (foundData.container_details && foundData.container_details.length > 0 && foundData.container_details !== '[]')
                                ? (typeof foundData.container_details === 'string' ? JSON.parse(foundData.container_details) : foundData.container_details)
                                : mappedData.container_details;
                            // Group by container_no in case the DB has ungrouped product-level rows
                            if (Array.isArray(rawCD) && rawCD.length > 0) {
                                const groups = {};
                                rawCD.forEach(c => {
                                    const cNo = (c.container_no || '').trim();
                                    const sNo = (c.line_seal_no || c.seal_no || '').trim();
                                    const eNo = (c.e_seal_no || '').trim();
                                    const key = `${cNo}|${sNo}|${eNo}`;
                                    if (!cNo) return;
                                    if (!groups[key]) {
                                        groups[key] = { ...c };
                                    } else {
                                        groups[key].total_sqm = parseFloat(((groups[key].total_sqm || 0) + (parseFloat(c.total_sqm) || 0)).toFixed(2));
                                        groups[key].boxes = (groups[key].boxes || 0) + (parseInt(c.boxes) || 0);
                                        groups[key].pallets = (groups[key].pallets || 0) + (parseInt(c.pallets) || 0);
                                        groups[key].net_weight = parseFloat(((groups[key].net_weight || 0) + (parseFloat(c.net_weight) || 0)).toFixed(2));
                                        groups[key].gross_weight = parseFloat(((groups[key].gross_weight || 0) + (parseFloat(c.gross_weight) || 0)).toFixed(2));
                                    }
                                });
                                rawCD = Object.values(groups).map((c, idx) => ({ ...c, sr_no: idx + 1 }));
                            }
                            return rawCD;
                        })(),
                        exists: true
                    }));

                } else if (isFirstLoad.current) {
                    // No backside exists — fetch next number and inheritance fallback for new record
                    try {
                        const resNum = await api.get('/invoice-backsides/next-number');
                        const nextNum = resNum.data?.data?.backsideNo;

                        let fallbackData = {};
                        if (exportInvoiceId) {
                            try {
                                const resFallback = await api.get(`/invoice-backsides/fallback/${exportInvoiceId}`);
                                if (resFallback.data?.data) {
                                    fallbackData = exportMapper.mapAnnexureToBackside(resFallback.data.data);
                                }
                            } catch (e) {
                                console.warn('Failed to fetch backside fallback data', e);
                            }
                        }

                        if (fallbackData.annexure_invoice_no || fallbackData.annexure_id) {
                            setSelectedAnnexure('current');
                        }

                        setFormData(prev => ({
                            ...prev,
                            ...fallbackData,
                            backside_no: nextNum || prev.backside_no,
                            invoice_no: nextNum || prev.invoice_no,
                            // Ensure company defaults take precedence over empty inherited fields
                            iec_no: fallbackData.iec_no || prev.iec_no || companyDefaults?.iec_no || companyDefaults?.iecNo || '',
                            lut_arn_no: fallbackData.lut_arn_no || prev.lut_arn_no || companyDefaults?.lut_arn_no || companyDefaults?.lutArnNo || '',
                            lut_date: fallbackData.lut_date || prev.lut_date || exportMapper.formatDate(companyDefaults?.lut_date || companyDefaults?.lutDate) || '',
                            permission_no: fallbackData.permission_no || prev.permission_no || companyDefaults?.permission_no || companyDefaults?.permissionNo || '',
                            exists: false
                        }));
                    } catch (e) {
                        console.error('Failed to initialize new backside record', e);
                    }
                }
            } catch (e) {
                console.error('Backside Init Error:', e);
            } finally {
                setLoading(false);
                isFirstLoad.current = false;
            }
        };
        init();
    }, [exportInvoiceId, backsideId]);


    const handleAnnexureChange = async (e) => {
        const id = e.target.value;
        setSelectedAnnexure(id);
        if (!id) return;

        isInheriting.current = true;
        try {
            // First ensure we have a backside number if starting fresh
            let nextNum = formData.backside_no || formData.invoice_no;
            if (!nextNum) {
                try {
                    const resNum = await api.get('/invoice-backsides/next-number');
                    nextNum = resNum.data?.data?.backsideNo;
                } catch (e) {
                    console.error('Failed to pre-fetch next number', e);
                }
            }
            const rawData = await getBacksideInheritedData(id);
            const mappedData = exportMapper.mapAnnexureToBackside(rawData);

            if (mappedData) {
                isInheriting.current = true;
                setFormData(prev => {
                    const finalBacksideNo = nextNum || prev.backside_no || prev.invoice_no;
                    const finalInvoiceNo = nextNum || prev.invoice_no || prev.backside_no;

                    const newData = {
                        ...prev,
                        ...mappedData,
                        // Protective merge for company fields
                        iec_no: mappedData.iec_no || rawData?.iec_no || rawData?.iecNo || prev.iec_no || companyDefaults?.iec_no || companyDefaults?.iecNo || '',
                        lut_arn_no: mappedData.lut_arn_no || rawData?.lut_arn_no || rawData?.lutArnNo || rawData?.inv_lut_bond_ref || prev.lut_arn_no || companyDefaults?.lut_arn_no || companyDefaults?.lutArnNo || '',
                        lut_date: mappedData.lut_date || rawData?.lut_date || rawData?.lutDate || rawData?.pi_lut_date || prev.lut_date || companyDefaults?.lut_date || companyDefaults?.lutDate || '',
                        permission_no: mappedData.permission_no || rawData?.permission_no || rawData?.permissionNo || prev.permission_no || '',
                        manufacturer_name: mappedData.manufacturer_name || rawData?.manufacturer_name || rawData?.manufacturerName || prev.manufacturer_name || '',
                        manufacturer_address: mappedData.manufacturer_address || rawData?.manufacturer_address || rawData?.manufacturerAddress || prev.manufacturer_address || '',
                        samples_drawn: mappedData.samples_drawn || rawData?.samples_drawn || rawData?.samplesDrawn || prev.samples_drawn || 'N.A.',
                        sample_seal_no: mappedData.sample_seal_no || rawData?.sample_seal_no || rawData?.sampleSealNo || prev.sample_seal_no || '',
                        customs_seal_no: mappedData.customs_seal_no || rawData?.customs_seal_no || rawData?.customsSealNo || prev.customs_seal_no || '',
                        id: prev.id,
                        exists: prev.exists,
                        backside_no: finalBacksideNo,
                        invoice_no: finalInvoiceNo,
                        export_invoice_id: mappedData.export_invoice_id || prev.export_invoice_id,
                        annexure_id: id
                    };
                    return newData;
                });

                // Also update the top-level state used for the save URL
                if (mappedData.export_invoice_id) {
                    setExportInvoiceId(mappedData.export_invoice_id);
                }

                showSuccess('Data inherited from Annexure');
            }
        } catch (err) {
            console.error('Annexure inheritance failed:', err);
            showError('Failed to fetch data from Annexure');
        } finally {
            isInheriting.current = false;
            setLoading(false);
        }
    };



    const validateForm = () => {
        const newErrors = {};
        if (!formData.backside_no) newErrors.backside_no = 'Backside No. is required';
        if (!formData.permission_no || !formData.permission_no.trim()) newErrors.permission_no = 'Permission No. is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!validateForm()) {
            scrollToFirstError();
            showError('Please fix the highlighted mandatory fields.');
            return;
        }

        const finalExportInvoiceId = exportInvoiceId || formData.export_invoice_id;
        if (!finalExportInvoiceId) {
            console.error('[Backside Save Blocked] Missing export_invoice_id');
            showError('Please load an Annexure first to link this backside to a valid Export Invoice.');
            return;
        }

        try {
            setSaving(true);

            const finalFormData = { ...formData };
            // Sync annexure_id if selectedAnnexure is set but not in formData
            if (selectedAnnexure && selectedAnnexure !== 'current' && !finalFormData.annexure_id) {
                finalFormData.annexure_id = selectedAnnexure;
            }

            const res = await api.post(`/invoice-backsides/export-invoice/${finalExportInvoiceId}`, finalFormData);


            // Sync state with saved data
            const savedData = res.data?.data || res.data || {};
            setFormData(prev => ({
                ...prev,
                ...savedData,
                exists: true
            }));

            showSuccess('Invoice Backside saved successfully');

            // Dispatch event for live update in dashboards
            window.dispatchEvent(new CustomEvent('invoiceBackside:changed'));

            // Navigate back to dashboard after save
            if (onBack) {
                setTimeout(() => onBack(), 1500);
            }
        } catch (error) {
            console.error('[Backside Save Error]', error);

            // Parse backend errors
            if (error.response?.status === 400 && error.response?.data?.errors) {
                const parsedErrors = extractValidationErrors(error.response.data.errors);
                if (Object.keys(parsedErrors).length > 0) {
                    setErrors(prev => ({ ...prev, ...parsedErrors }));
                    scrollToFirstError();
                    showError('Validation failed. Please check the highlighted fields.');
                    return;
                }
            }

            const errorMsg = error.response?.data?.message || error.message || 'Failed to save Invoice Backside';
            showError(`Save Failed: ${errorMsg}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

    return (
        <Container fluid className="py-4 bg-light min-vh-100">
            <div className="d-flex flex-row justify-content-between align-items-center gap-2 mb-2 px-3"
                style={{ padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <div className="d-flex align-items-center gap-2">
                    <Button variant="outline" onClick={onBack} className="p-1 bg-white shadow-sm border-0 rounded-3 text-primary" style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                        <ArrowLeft size={16} />
                    </Button>
                    <FileText className="text-primary" size={18} style={{ flexShrink: 0 }} />
                    <div>
                        <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem', color: '#1a1a2e' }}>Invoice Backside Form</h5>
                        <span className="text-muted" style={{ fontSize: '0.78rem' }}>Step 4: Annexure Verification & Customs Declaration</span>
                    </div>
                </div>
                <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
                    <Button variant="primary" onClick={handleSubmit} disabled={saving} className="fw-bold shadow-sm" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px', minWidth: '110px' }}>
                        {saving ? <Spinner animation="border" size="sm" /> : <><Save size={14} className="me-1" /> {formData.id || formData.exists ? 'Update' : 'Save'} Backside</>}
                    </Button>
                </div>
            </div>
            <Form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }} className="px-3">
                {/* Reference & logistics fields */}
                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                    <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
                        <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">BASIC INFORMATION</h6>
                    </Card.Header>

                    <Card.Body className="p-4 bg-white">
                        <Row className="g-4">
                            <Col style={{ flex: '1' }}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-secondary">
                                        Annexure No.
                                    </Form.Label>
                                    <Form.Select
                                        value={selectedAnnexure || ''}
                                        onChange={(e) => {
                                            handleAnnexureChange(e);
                                            if (errors.annexure) setErrors(prev => ({ ...prev, annexure: null }));
                                        }}
                                        className={`py-2 px-3 fw-bold text-primary ${errors.annexure ? 'border-danger' : 'border'}`}
                                        style={{ borderRadius: '10px', height: '48px' }}
                                        isInvalid={!!errors.annexure}
                                    >
                                        <option value="">Select Annexure...</option>
                                        {formData.annexure_invoice_no && (
                                            <option value="current">{formData.annexure_invoice_no}</option>
                                        )}
                                        {annexureOptions.map(ann => (
                                            <option key={ann.id} value={ann.id}>
                                                {ann.annexureNo || ann.annexure_no || ann.invoice_no || ann.id}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    {errors.annexure && <div className="invalid-feedback d-block">{errors.annexure}</div>}
                                </Form.Group>
                            </Col>
                            <Col style={{ flex: '1' }}>
                                <Form.Group>
                                    <OverlayTrigger placement="top" overlay={<Tooltip>Backside No. is mandatory.</Tooltip>}>
                                        <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{ cursor: 'help' }}>
                                            BACKSIDE NO. * <Info size={12} className="ms-1" />
                                        </Form.Label>
                                    </OverlayTrigger>
                                    <Form.Control
                                        type="text"
                                        value={formData.backside_no || ''}
                                        onChange={e => {
                                            setFormData({ ...formData, backside_no: e.target.value });
                                            if (errors.backside_no) setErrors(prev => ({ ...prev, backside_no: null }));
                                        }}
                                        className={`py-2 px-3 fw-bold text-primary ${errors.backside_no ? 'border-danger' : 'border'}`}
                                        style={{ borderRadius: '10px', height: '48px' }}
                                        isInvalid={!!errors.backside_no}
                                    />
                                    {errors.backside_no && <div className="invalid-feedback d-block">{errors.backside_no}</div>}
                                </Form.Group>
                            </Col>

                            <Col style={{ flex: '1' }}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">EXPORT INV NO.:</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.export_invoice_no || ''}
                                        readOnly
                                        className="bg-light border-0 py-2 px-3 fw-bold"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col style={{ flex: '1', minWidth: '150px' }}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">EXPORT INVOICE DATE:</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.export_invoice_date || ''}
                                        readOnly
                                        className="bg-light border-0 py-2 px-3 fw-bold"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col style={{ flex: '1' }}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">PI NO.:</Form.Label>
                                    <div
                                        title={formData.pi_no}
                                        className="form-control bg-light border-0 py-2 px-3 fw-bold d-flex align-items-center"
                                        style={{ borderRadius: '10px', minHeight: '48px', height: 'auto', wordBreak: 'break-word', whiteSpace: 'normal' }}
                                    >
                                        {formData.pi_no || '-'}
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col style={{ flex: '1' }}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">ORIGIN:</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.country_of_origin || ''}
                                        readOnly
                                        className="bg-light border-0 py-2 px-3 fw-bold"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                    />
                                </Form.Group>
                            </Col>

                            <Col style={{ flex: '1' }}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">PL NO.:</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.pl_no || ''}
                                        readOnly
                                        className="bg-light border-0 py-2 px-3 fw-bold"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="g-4 mt-1">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">VESSEL NAME:</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.vessel_name || ''}
                                        readOnly
                                        className="bg-light border-0 py-2 px-3 fw-bold"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">CARGO TYPE:</Form.Label>
                                    <Form.Select
                                        value={formData.cargo_type || 'NORMAL'}
                                        onChange={e => setFormData({ ...formData, cargo_type: e.target.value })}
                                        className="border py-2 px-3 fw-bold text-primary"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                    >
                                        <option value="NORMAL">NORMAL</option>
                                        <option value="REEFER">REEFER</option>
                                        <option value="HAZARDOUS">HAZARDOUS</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
                {/* Customs Reference */}
                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                    <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
                        <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">OFFICE OF THE SUPRINTENDENT OF CENTRAL GST</h6>
                    </Card.Header>

                    <Card.Body className="p-4 bg-white">
                        <Row className="g-4">
                            <Col md={4}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">RANGE</Form.Label><Form.Control value={formData.range_name || ''} onChange={e => setFormData({ ...formData, range_name: e.target.value.toUpperCase() })} className="bg-light border-0 py-2 px-3 fw-bold" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">DIVISION</Form.Label><Form.Control value={formData.division || ''} onChange={e => setFormData({ ...formData, division: e.target.value.toUpperCase() })} className="bg-light border-0 py-2 px-3 fw-bold" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">COMMISSIONERATE</Form.Label><Form.Control value={formData.commissionerate || ''} onChange={e => setFormData({ ...formData, commissionerate: e.target.value.toUpperCase() })} className="bg-light border-0 py-2 px-3 fw-bold" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>

                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">SHIPPING BILL NO.</Form.Label><Form.Control value={formData.shipping_bill_no} onChange={e => setFormData({ ...formData, shipping_bill_no: e.target.value })} className="bg-light border-0 py-2 px-3" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">SHIPPING BILL DATE</Form.Label><Form.Control type="date" value={formData.shipping_bill_date} onChange={e => setFormData({ ...formData, shipping_bill_date: e.target.value })} className="bg-light border-0 py-2 px-3" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">C. NO.</Form.Label><Form.Control value={formData.c_no} onChange={e => setFormData({ ...formData, c_no: e.target.value })} className="bg-light border-0 py-2 px-3" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">C. DATE</Form.Label><Form.Control type="date" value={formData.c_date} onChange={e => setFormData({ ...formData, c_date: e.target.value })} className="bg-light border-0 py-2 px-3" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>


                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">2(b) BRANCH CODE NO.</Form.Label><Form.Control value={formData.branch_code_no || ''} onChange={e => setFormData({ ...formData, branch_code_no: e.target.value })} className="bg-light border-0 py-2 px-3 fw-bold" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">2(c) BIN NO.</Form.Label><Form.Control value={formData.bin_no || ''} onChange={e => setFormData({ ...formData, bin_no: e.target.value })} className="bg-light border-0 py-2 px-3 fw-bold" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">8(b) LOCATION CODE</Form.Label><Form.Control value={formData.location_code || ''} onChange={e => setFormData({ ...formData, location_code: e.target.value })} className="bg-light border-0 py-2 px-3 fw-bold" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>

                        </Row>
                    </Card.Body>
                </Card>

                {/* Exporter & Manufacturer */}
                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                    <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
                        <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">EXPORTER & MANUFACTURER DETAILS</h6>
                    </Card.Header>

                    <Card.Body className="p-4 bg-white">
                        <Row className="g-4">
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">NAME OF EXPORTER</Form.Label>
                                    <Form.Control
                                        value={formData.company_name || ''}
                                        onChange={e => setFormData({ ...formData, company_name: e.target.value.toUpperCase() })}
                                        className="border py-2 px-3 fw-bold text-primary"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                        placeholder="Enter Exporter Name"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">NAME OF MANUFACTURER</Form.Label>
                                    <div className="bg-light p-2 border" style={{ borderRadius: '10px', minHeight: '48px' }}>
                                        <div className="d-flex flex-wrap gap-1 mb-1">
                                            {(formData.manufacturer_name ? formData.manufacturer_name.split(',').filter(m => m.trim()) : []).map((mfr, idx) => (
                                                <span key={idx} className="d-inline-flex align-items-center gap-1 px-2 py-1 fw-bold" style={{ borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#0d6efd', border: '1.5px solid #0d6efd' }}>
                                                    {mfr.trim()}
                                                    <span role="button" className="ms-1" style={{ cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, color: '#dc3545', fontWeight: 'bold' }} onClick={() => {
                                                        const parts = formData.manufacturer_name.split(',').filter(m => m.trim());
                                                        parts.splice(idx, 1);
                                                        setFormData({ ...formData, manufacturer_name: parts.join(', ') });
                                                    }}>&times;</span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="d-flex gap-1">
                                            <Form.Control
                                                type="text"
                                                placeholder="Type & press Enter to add"
                                                className="border-0 bg-white py-1 px-2 fw-bold"
                                                style={{ borderRadius: '6px', height: '34px', flex: 1 }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = e.target.value.trim().toUpperCase();
                                                        if (!val) return;
                                                        const existing = formData.manufacturer_name ? formData.manufacturer_name.split(',').filter(m => m.trim()) : [];
                                                        existing.push(val);
                                                        setFormData({ ...formData, manufacturer_name: existing.join(', ') });
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">EXPORTER ADDRESS</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.company_address || ''}
                                        onChange={e => setFormData({ ...formData, company_address: e.target.value.toUpperCase() })}
                                        className="border py-2 px-3 text-dark fw-bold"
                                        style={{ borderRadius: '10px', resize: 'none' }}
                                        placeholder="Enter Exporter Address"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">MANUFACTURER ADDRESS</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Manufacturer address"
                                        value={formData.manufacturer_address || ''}
                                        onChange={e => setFormData({ ...formData, manufacturer_address: e.target.value.toUpperCase() })}
                                        className="border py-2 px-3"
                                        style={{ borderRadius: '10px' }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">FACTORY ADDRESS</Form.Label>
                                    <Form.Control
                                        value={formData.factory_address || ''}
                                        onChange={e => setFormData({ ...formData, factory_address: e.target.value.toUpperCase() })}
                                        className="border py-2 px-3 fw-bold text-dark"
                                        style={{ borderRadius: '10px', height: '48px' }}
                                        placeholder="Enter Factory Address"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">INVOICE DATE</Form.Label><Form.Control type="date" value={formData.invoice_date} readOnly className="bg-light border-0 py-2 px-3" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Container Table */}
                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                    <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
                        <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">CONTAINERIZED CARGO DETAILS</h6>
                    </Card.Header>
                    <DoubleScrollbarWrapper deps={[formData.container_details]} wrapperClassName="table-responsive ">
                        <Table bordered hover className="mb-0 align-middle text-center small fw-medium">
                            <thead className="bg-light text-secondary">
                                <tr>
                                    <th style={{ width: '40px' }}>SR.</th>
                                    <th>CONTAINER NO.</th>
                                    <th>SEAL NO.</th>
                                    <th>E SEAL NO.</th>
                                    <th>CONTAINER SIZE</th>
                                    <th>TOTAL SQM</th>
                                    <th>BOXES/PCS</th>
                                    <th>NET WEIGHT</th>
                                    <th>GROSS WEIGHT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.container_details.map((c, i) => (
                                    <tr key={i}>
                                        <td data-label="Sr. No.">{c.sr_no || i + 1}</td>
                                        <td data-label="Container No." className="text-center">{c.container_no || ''}</td>
                                        <td data-label="Seal No." className="text-center">{c.line_seal_no || ''}</td>
                                        <td data-label="E Seal No." className="text-center">{c.e_seal_no || ''}</td>
                                        <td data-label="Container Size" className="text-center">
                                            <Form.Select
                                                value={c.type || (c.size && !String(c.size).includes('X') ? c.size : "20'")}
                                                onChange={(e) => {
                                                    const newDetails = [...formData.container_details];
                                                    newDetails[i] = { ...newDetails[i], type: e.target.value, size: e.target.value };
                                                    setFormData({ ...formData, container_details: newDetails });
                                                }}
                                                className="border-0 bg-white py-1 px-2 text-center text-primary fw-bold mx-auto"
                                                style={{ borderRadius: '6px', minWidth: '90px', maxWidth: '120px', boxShadow: 'inset 0 0 0 1px #e0e0e0' }}
                                            >
                                                <option value="20'">20'</option>
                                                <option value="40'">40'</option>
                                            </Form.Select>
                                        </td>
                                        <td data-label="Total SQM" className="text-center fw-bold text-primary">
                                            {parseFloat(c.total_sqm || 0).toFixed(2)}
                                        </td>
                                        <td data-label="Boxes/Pcs" className="text-center">{c.boxes || 0}</td>
                                        <td data-label="Net Weight" className="text-center">{parseFloat(c.net_weight || 0).toFixed(2)}</td>
                                        <td data-label="Gross Weight" className="text-center fw-bold text-danger">
                                            {parseFloat(c.gross_weight || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </DoubleScrollbarWrapper>

                    {/* Mobile View: Container Cards */}
                    <div className="d-block d-lg-none p-3 bg-light bg-opacity-50">
                        {formData.container_details && formData.container_details.length > 0 ? (
                            <>
                                {formData.container_details.map((c, i) => (
                                    <Card key={i} className="mb-3 border-0 shadow-sm rounded-4 overflow-hidden">
                                        <Card.Header className="bg-white py-2 px-3 border-bottom d-flex align-items-center">
                                            <div className="bg-primary bg-opacity-10 p-1 rounded-2 me-2">
                                                <Hash size={14} className="text-primary" />
                                            </div>
                                            <span className="fw-bold small text-uppercase">Container #{i + 1}</span>
                                        </Card.Header>
                                        <Card.Body className="p-3">
                                            <div className="mb-3">
                                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '10px' }}>Container No. / Container Size</small>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="fw-bold text-dark">{c.container_no || '-'}</span>
                                                    <Form.Select
                                                        size="sm"
                                                        value={c.type || c.size || "20'"}
                                                        onChange={(e) => {
                                                            const newDetails = [...formData.container_details];
                                                            newDetails[i] = { ...newDetails[i], type: e.target.value, size: e.target.value };
                                                            setFormData({ ...formData, container_details: newDetails });
                                                        }}
                                                        className="fw-bold text-primary border-primary border-opacity-25"
                                                        style={{ width: '80px', height: '30px' }}
                                                    >
                                                        <option value="20'">20'</option>
                                                        <option value="40'">40'</option>
                                                    </Form.Select>
                                                </div>
                                            </div>

                                            <Row className="g-2 mb-3">
                                                <Col xs={6}>
                                                    <small className="text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Seal No.</small>
                                                    <span className="fw-bold small">{c.line_seal_no || '-'}</span>
                                                </Col>
                                                <Col xs={6}>
                                                    <small className="text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>E-Seal</small>
                                                    <span className="fw-bold small">{c.e_seal_no || '-'}</span>
                                                </Col>
                                            </Row>

                                            <div className="p-2 bg-white rounded-3 border mb-2">
                                                <Row className="g-2 text-center">
                                                    <Col xs={6} className="border-end">
                                                        <small className="text-muted d-block" style={{ fontSize: '9px' }}>TOTAL SQM</small>
                                                        <span className="fw-bold text-primary">{parseFloat(c.total_sqm || 0).toFixed(2)}</span>
                                                    </Col>
                                                    <Col xs={6}>
                                                        <small className="text-muted d-block" style={{ fontSize: '9px' }}>BOXES/PCS</small>
                                                        <span className="fw-bold">{c.boxes || 0}</span>
                                                    </Col>
                                                </Row>
                                            </div>

                                            <Row className="g-2 small">
                                                <Col xs={6} className="text-muted fw-bold text-uppercase">Net Wt:</Col>
                                                <Col xs={6} className="text-end fw-bold">{parseFloat(c.net_weight || 0).toFixed(2)} kg</Col>
                                                <Col xs={6} className="text-muted fw-bold text-uppercase">Gross Wt:</Col>
                                                <Col xs={6} className="text-end fw-bold text-danger">{parseFloat(c.gross_weight || 0).toFixed(2)} kg</Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                ))}

                                {/* Mobile Summary Card */}
                                <Card className="border-0 shadow-sm rounded-4 mb-2 bg-primary text-white">
                                    <Card.Body className="p-3">
                                        <h6 className="fw-bold mb-3 border-bottom border-white border-opacity-25 pb-2 text-uppercase small">Cargo Summary</h6>
                                        <Row className="g-2 small">
                                            <Col xs={6}>Total Containers:</Col>
                                            <Col xs={6} className="text-end fw-bold">{formData.container_details.length}</Col>
                                            <Col xs={6}>Total SQM:</Col>
                                            <Col xs={6} className="text-end fw-bold">{parseFloat(formData.total_sqm || 0).toFixed(2)}</Col>
                                            <Col xs={6}>Total Boxes/Pcs:</Col>
                                            <Col xs={6} className="text-end fw-bold">{formData.total_packages || formData.total_boxes}</Col>
                                            <Col xs={12} className="my-2 border-top border-white border-opacity-25"></Col>
                                            <Col xs={6}>TOTAL NET WT:</Col>
                                            <Col xs={6} className="text-end fw-bold">{parseFloat(formData.net_weight || 0).toFixed(2)} kg</Col>
                                            <Col xs={6} className="fs-6">TOTAL GROSS WT:</Col>
                                            <Col xs={6} className="text-end fw-bold fs-6">{parseFloat(formData.gross_weight || 0).toFixed(2)} kg</Col>
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
                </Card>

                {/* Customs Declaration */}
                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                    <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
                        <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">CUSTOMS DECLARATION & PERMISSION</h6>
                    </Card.Header>

                    <Card.Body className="p-4 bg-white">
                        <Row className="g-4">
                            <Col md={12}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">9(a) IS THE DESCRIPTION OF THE GOODS MATCHING EXPORT INVOICE?</Form.Label><Form.Select value={formData.goods_description_match} onChange={e => setFormData({ ...formData, goods_description_match: e.target.value })} className="bg-light border-0 px-3 py-2 fw-bold overflow-hidden" style={{ borderRadius: '10px', height: '48px' }}><option value="YES">YES</option><option value="NO">NO</option></Form.Select></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">9(b) WHETHER SAMPLES IS DRAWN FOR BEING</Form.Label><Form.Control value={formData.samples_drawn} onChange={e => setFormData({ ...formData, samples_drawn: e.target.value.toUpperCase() })} className="bg-light border-0 py-2 px-3" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">9(c) SEAL NO. OF THE PACKAGE CONTAINING SAMPLE</Form.Label><Form.Control value={formData.sample_seal_no} onChange={e => setFormData({ ...formData, sample_seal_no: e.target.value.toUpperCase() })} className="bg-light border-0 py-2 px-3 fw-bold" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">Customs / Excise Seal No.</Form.Label><Form.Control value={formData.customs_seal_no || ''} onChange={e => setFormData({ ...formData, customs_seal_no: e.target.value.toUpperCase() })} placeholder="Enter Custom Seal No. if any" className="bg-light border-0 py-2 px-3 fw-bold text-dark" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>

                            <Col md={12}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">Declaration & Examination Notes</Form.Label><Form.Control as="textarea" rows={4} value={formData.declaration_text} onChange={e => setFormData({ ...formData, declaration_text: e.target.value.toUpperCase() })} className="bg-light border-0 px-3 py-3 fw-bold text-dark" style={{ borderRadius: '12px', fontSize: '0.9rem' }} /></Form.Group></Col>

                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <OverlayTrigger placement="top" overlay={<Tooltip>Permission No. is mandatory.</Tooltip>}>
                                        <Form.Label className="fw-bold small mb-2 tracking-wide text-danger" style={{ cursor: 'help' }}>
                                            PERMISSION NO. * <Info size={12} className="ms-1" />
                                        </Form.Label>
                                    </OverlayTrigger>
                                    <div className={`bg-light p-2 border ${errors.permission_no ? 'border-danger' : 'border-0'}`} style={{ borderRadius: '10px', minHeight: '48px' }}>
                                        <div className="d-flex flex-wrap gap-1 mb-1">
                                            {(formData.permission_no ? formData.permission_no.split(',').filter(p => p.trim()) : []).map((perm, idx) => (
                                                <span key={idx} className="d-inline-flex align-items-center gap-1 px-2 py-1 fw-bold" style={{ borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#0d6efd', border: '1.5px solid #0d6efd' }}>
                                                    {perm.trim()}
                                                    <span role="button" className="ms-1" style={{ cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, color: '#dc3545', fontWeight: 'bold' }} onClick={() => {
                                                        const parts = formData.permission_no.split(',').filter(p => p.trim());
                                                        parts.splice(idx, 1);
                                                        setFormData({ ...formData, permission_no: parts.join(', ') });
                                                    }}>&times;</span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="d-flex gap-1">
                                            <Form.Control
                                                type="text"
                                                placeholder="Type & press Enter to add permission"
                                                className="border-0 bg-white py-1 px-2 fw-bold"
                                                style={{ borderRadius: '6px', height: '34px', flex: 1 }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = e.target.value.trim().toUpperCase();
                                                        if (!val) return;
                                                        const existing = formData.permission_no ? formData.permission_no.split(',').filter(p => p.trim()) : [];
                                                        existing.push(val);
                                                        setFormData({ ...formData, permission_no: existing.join(', ') });
                                                        if (errors.permission_no) setErrors({ ...errors, permission_no: null });
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {errors.permission_no && <div className="text-danger mt-1" style={{ fontSize: '0.875em' }}>{errors.permission_no}</div>}
                                </Form.Group>
                            </Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">I.E.C. NO.</Form.Label><Form.Control value={formData.iec_no || ''} onChange={e => setFormData({ ...formData, iec_no: e.target.value.toUpperCase() })} className="bg-light border-0 py-2 px-3 fw-bold text-primary" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">LUT ARN BOND NO.</Form.Label><Form.Control value={formData.lut_arn_no || ''} onChange={e => setFormData({ ...formData, lut_arn_no: e.target.value.toUpperCase() })} className="bg-light border-0 py-2 px-3 fw-bold text-danger" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                            <Col md={3}><Form.Group><Form.Label className="fw-bold small text-secondary mb-2 tracking-wide">LUT DATE</Form.Label><Form.Control type="date" value={formData.lut_date || ''} onChange={e => setFormData({ ...formData, lut_date: e.target.value })} className="bg-light border-0 py-2 px-3" style={{ borderRadius: '10px', height: '48px' }} /></Form.Group></Col>
                        </Row>

                        {/* Final Totals Table as shown in sample footer */}
                        <div className="mt-5 pt-4 border-top">
                            <h6 className="fw-bold text-secondary mb-3 small text-uppercase tracking-wider">Weight Summary (Footer Section)</h6>
                            <Table bordered className="mb-0 text-center shadow-sm">
                                <thead className="bg-secondary text-white">
                                    <tr>
                                        <th style={{ width: '50%' }}>TOTAL NET WEIGHT (KGS)</th>
                                        <th>TOTAL GROSS WEIGHT (KGS)</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-bold h4">
                                    <tr>
                                        <td className="py-3 text-primary">{parseFloat(formData.net_weight || 0).toFixed(2)}</td>
                                        <td className="py-3 text-danger">{parseFloat(formData.gross_weight || 0).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>

                {/* Bottom Actions Container */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-4 border-top">
                    <Button
                        variant="outline-secondary"
                        onClick={onBack}
                        className="shadow-sm px-5 py-3 fw-bold rounded-4"
                        style={{ height: '55px' }}
                    >
                        <X size={20} className="me-2" /> Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-5 py-3 shadow-lg fw-bold rounded-4"
                        style={{ height: '55px', minWidth: '160px' }}
                    >
                        {saving ? <Spinner animation="border" size="sm" className="me-2" /> : <Save size={20} className="me-2" />}
                        {formData.id || formData.exists ? 'Update Backside' : 'Save Backside'}
                    </Button>
                </div>

                {/* Activity History */}
                {(backsideId || formData.id || formData.exists) && (
                    <Card className="mt-4 shadow-sm border-0 rounded-4 overflow-hidden mb-5">
                        <Card.Header className="bg-light py-3 border-0 d-flex align-items-center">
                            <History className="me-2 text-primary" size={20} />
                            <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Activity History</h6>
                        </Card.Header>
                        <Card.Body className="p-0 bg-white">
                            <ModuleAuditLog resourceType="invoice_backside" resourceId={backsideId || formData.id} />
                        </Card.Body>
                    </Card>
                )}
            </Form>
        </Container>
    );
}

export default InvoiceBacksideForm;

