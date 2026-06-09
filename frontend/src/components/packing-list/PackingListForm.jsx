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

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Save, X, Plus, Trash2, ArrowLeft, Info, Edit, Check } from 'lucide-react';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import api from '../../services/api';
import { exportMapper } from '../../utils/exportMapper.js';
import { getAllPorts, getPortsOfLoading, getPortsOfDischarge } from '../../services/masterDataService.js';
import DynamicDropdown from '../shared/DynamicDropdown.jsx';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { extractValidationErrors } from '../../utils/validationHelper.js';

const formatInputDate = (date) => {
        if (!date) return '';
        try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return '';
                // Use local date parts to avoid timezone shifts
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
        } catch (e) {
                return '';
        }
};

function PackingListForm({ exportInvoiceId, packingList, packingListData, onSave, onCancel }) {
        const [availableInvoices, setAvailableInvoices] = useState([]);
        const [loadingInvoices, setLoadingInvoices] = useState(false);
        const [saving, setSaving] = useState(false);

        const [formData, setFormData] = useState({
                packing_list_no: '',
                date: new Date().toLocaleDateString('en-CA'),
                pi_reference: exportInvoiceId || '',
                proforma_invoice_no: '',
                proforma_invoice_id: '',
                proforma_invoice_date: '',
                export_invoice_date: '',
                client_name: '',
                country: '',
                total_pallets: 0,
                total_boxes: 0,
                total_sqm: 0,
                total_weight: 0,
                net_weight: 0,
                total_amount: 0,
                gross_weight: 0,
                status: 'Pending',
                product_lines: [],
                pallet_type: '',
                tiles_back: '',
                boxes_marking: '',
                box_type: '',
                fumigation: 'YES',
                legalisation: 'NO',
                other_instructions: '',
                consignee_details: '',
                buyer_details: '',
                payment_terms: '',
                delivery_terms: '',
                port_of_loading: '',
                port_of_discharge: '',
                final_destination: '',
                vessel_name: '',
                vessel_flight_no: '',
                place_of_receipt: '',
                pre_carriage_by: '',
                tariff_code: '',
                product_description: 'GLAZED PORCELAIN TILES',
                hs_code: '',
                sqm_per_box: 1.44,
                net_weight_per_box: 46.72,
                gross_weight_per_box: 47.72,
                made_in_india: 'YES',
                buyers_order_no: '',
                buyers_order_date: '',
                container_details: []
        });

        const [errors, setErrors] = useState({});
        const [showErrorModal, setShowErrorModal] = useState(false);
        const [showAlert, setShowAlert] = useState(false);
        const [alertMessage, setAlertMessage] = useState('');
        const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);
        const [masterData, setMasterData] = useState({
                ports: [],
                portsOfLoading: [],
                portsOfDischarge: []
        });

        const generatePLNo = useCallback(async (invoiceId) => {
                try {
                        const url = invoiceId ? `/packing-lists/next-number?exportInvoiceId=${invoiceId}` : '/packing-lists/next-number';
                        const resp = await api.get(url);
                        const data = resp?.data?.data || resp?.data;
                        const num = data?.packing_list_no || data?.packingListNo;
                        if (num) {
                                setFormData(prev => ({ ...prev, packing_list_no: num }));
                        }
                } catch (err) {
                        console.warn('Could not fetch next packing list number:', err);
                        // Fallback if API fails
                        const date = new Date();
                        const y = String(date.getFullYear()).slice(-2);
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const rnd = Math.floor(Math.random() * 9000) + 1000;
                        setFormData(prev => ({ ...prev, packing_list_no: `PL/${m}/${y}/${rnd}` }));
                }
        }, []);

        // Fetch ports from master data
        useEffect(() => {
                const fetchPorts = async () => {
                        try {
                                const [portsData, polData, podData] = await Promise.all([
                                        getAllPorts(),
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

        // Fetch full invoice details when user selects from dropdown
        const fetchInvoiceDetails = async (invoiceId) => {
                if (!invoiceId) return;
                try {
                        const resp = await api.get(`/export-invoices/${invoiceId}`);
                        const inv = resp?.data?.data || resp?.data;

                        if (inv) {
                                // If proforma_invoice_no is empty but proforma_invoice_id exists, fetch it separately
                                if (!inv.proforma_invoice_no && !inv.proformaInvoiceNo && (inv.proforma_invoice_id || inv.proformaInvoiceId)) {
                                        try {
                                                const piResp = await api.get(`/proforma-invoices/${inv.proforma_invoice_id || inv.proformaInvoiceId}`);
                                                const piData = piResp?.data?.data || piResp?.data;
                                                if (piData) {
                                                        inv.proformaInvoiceNo = piData.invoiceNo || piData.invoice_no || '';
                                                        inv.proformaInvoiceDate = piData.date || piData.invoiceDate || piData.proforma_date || '';
                                                }
                                        } catch (piErr) {
                                                console.warn('Could not fetch proforma invoice details:', piErr);
                                        }
                                }
                                setSelectedInvoiceDetails(inv);
                                applyExportToForm(inv);
                        }
                } catch (e) {
                        console.error('Failed to fetch invoice details:', e);
                        showError('Failed to load invoice details');
                }
        };

        useEffect(() => {
                if (!formData.id && !formData.packing_list_no) {
                        generatePLNo(exportInvoiceId || formData.export_invoice_id || formData.pi_reference);
                }
        }, [formData.id, formData.packing_list_no, generatePLNo, exportInvoiceId, formData.export_invoice_id, formData.pi_reference]);

        useEffect(() => {
                const fetchExportInvoices = async () => {
                        try {
                                setLoadingInvoices(true);
                                // Using standardized reference endpoint which now includes Draft/Pending status
                                const resp = await api.get('/export-documents/references/export-invoices');

                                // Robust data extraction
                                let rawData = [];
                                if (Array.isArray(resp?.data?.data)) {
                                        rawData = resp.data.data;
                                } else if (Array.isArray(resp?.data)) {
                                        rawData = resp.data;
                                } else if (resp?.data?.items) {
                                        rawData = resp.data.items;
                                }

                                const normalized = (rawData || []).map(inv => ({
                                        id: inv.id ?? inv._id ?? inv.invoice_id,
                                        invoiceNo: inv.invoice_no ?? inv.invoiceNo ?? '',
                                        proforma_invoice_no: inv.proforma_invoice_no ?? inv.proformaNo ?? '',
                                        proforma_invoice_id: inv.proforma_invoice_id ?? '',
                                        client_name: inv.client_name ?? inv.clientName ?? '',
                                        // Essential inherited fields for the Packing List dropdown
                                        port_of_discharge: inv.port_of_discharge ?? '',
                                        final_destination: inv.final_destination ?? '',
                                        port_of_loading: inv.port_of_loading ?? '',
                                }));

                                setAvailableInvoices(normalized);
                        } catch (e) {
                                console.error('Failed to fetch export invoices for packing list', e);
                        } finally {
                                setLoadingInvoices(false);
                        }
                };

                fetchExportInvoices();

                // Re-fetch when company context changes
                const handleContextChange = () => fetchExportInvoices();
                window.addEventListener('storage', handleContextChange);
                // Also listen for a custom event in case Sidebar emits one (Best practice)
                window.addEventListener('company-context-changed', handleContextChange);

                return () => {
                        window.removeEventListener('storage', handleContextChange);
                        window.removeEventListener('company-context-changed', handleContextChange);
                };
        }, []);

        useEffect(() => {
                if (!exportInvoiceId) return;
                // When opened from Export Invoice, fetch the packing list (if exists) + invoice data
                const loadFromExportInvoice = async () => {
                        try {
                                const resp = await api.get(`/packing-lists/export-invoice/${exportInvoiceId}`);
                                const data = resp?.data?.data || resp?.data;
                                if (data) {
                                        if (data.exists && data.id) {
                                                // An existing packing list was found — load it for editing
                                                const normalizedProductLines = Array.isArray(data.product_lines)
                                                        ? data.product_lines.map(pl => {
                                                                const totalBoxes = parseInt(pl.totalBoxes ?? pl.total_boxes ?? pl.boxes ?? 0, 10) || 0;
                                                                const boxWeight = parseFloat(pl.boxWeight ?? pl.box_weight ?? pl.weightPerSqm ?? pl.weight_per_sqm ?? pl.perBoxWeight ?? pl.per_box_weight ?? 0) || 0;
                                                                const sqmAuto = parseFloat(pl.sqmAuto ?? pl.sqm ?? pl.sqm_auto ?? 0) || 0;
                                                                const rate = parseFloat(pl.rate ?? pl.unit_price ?? 0) || 0;
                                                                let netWeight = parseFloat(pl.netWeight ?? pl.net_weight ?? 0) || 0;
                                                                if ((!netWeight || netWeight === 0) && boxWeight && totalBoxes) netWeight = parseFloat((boxWeight * totalBoxes).toFixed(2));
                                                                const grossWeight = parseFloat(parseFloat(pl.grossWeight ?? pl.gross_weight ?? 0).toFixed(2)) || parseFloat((netWeight + totalBoxes).toFixed(2));
                                                                return {
                                                                        product: pl.product || pl.product_name || pl.name || pl.material_description || '',
                                                                        size: pl.size || pl.dimensions || '',
                                                                        surface: pl.surface || pl.finish || '',
                                                                        totalPallet: parseInt(pl.totalPallet ?? pl.total_pallet ?? pl.pallets ?? 0, 10) || 0,
                                                                        totalBoxes,
                                                                        boxWeight,
                                                                        sqmAuto,
                                                                        rate,
                                                                        amount: parseFloat((sqmAuto * rate).toFixed(2)),
                                                                        netWeight,
                                                                        grossWeight
                                                                };
                                                        })
                                                        : [];
                                                setFormData(prev => ({
                                                        ...prev,
                                                        id: data.id,
                                                        packing_list_no: data.packing_list_no || prev.packing_list_no,
                                                        date: data.packing_list_date || data.date || prev.date,
                                                        pi_reference: exportInvoiceId,
                                                        proforma_invoice_no: data.proforma_invoice_no || prev.proforma_invoice_no,
                                                        client_name: data.client_name || prev.client_name,
                                                        country: data.country || prev.country,
                                                        total_pallets: data.total_pallets || 0,
                                                        total_boxes: data.total_boxes || 0,
                                                        total_sqm: parseFloat(data.total_sqm) || 0,
                                                        net_weight: parseFloat(data.net_weight) || 0,
                                                        total_weight: parseFloat(data.net_weight) || 0,
                                                        gross_weight: parseFloat(data.gross_weight) || 0,
                                                        total_amount: parseFloat(data.total_amount) || 0,
                                                        status: data.status || 'Pending',
                                                        product_lines: normalizedProductLines,
                                                        consignee_details: data.consignee_details || data.consignee || '',
                                                        buyer_details: data.buyer_details || data.buyer || '',
                                                        port_of_loading: data.port_of_loading || '',
                                                        port_of_discharge: data.port_of_discharge || '',
                                                        final_destination: data.final_destination || '',
                                                        payment_terms: data.payment_terms || '',
                                                        delivery_terms: data.delivery_terms || '',
                                                        pre_carriage_by: data.pre_carriage_by || '',
                                                        place_of_receipt: data.place_of_receipt || '',
                                                        vessel_flight_no: data.vessel_flight_no || '',
                                                        buyers_order_no: data.buyers_order_no || '',
                                                        buyers_order_date: data.buyers_order_date || '',
                                                        tariff_code: data.tariff_code || '',
                                                        pallet_type: data.pallet_type || '',
                                                        tiles_back: data.tiles_back || '',
                                                        box_type: data.box_type || '',
                                                        boxes_marking: data.boxes_marking || '',
                                                        fumigation: data.fumigation || 'YES',
                                                        legalisation: data.legalisation || 'NO',
                                                        other_instructions: data.other_instructions || '',
                                                        made_in_india: data.made_in_india || 'YES',
                                                        proforma_invoice_date: formatInputDate(data.proforma_invoice_date || data.proforma_date || ''),
                                                        export_invoice_date: formatInputDate(data.export_invoice_date || data.packing_list_date || data.invoice_date || ''),
                                                        container_details: data.container_details || [],
                                                        sb_no: data.sb_no || '',
                                                        sb_date: data.sb_date || '',
                                                        bl_no: data.bl_no || '',
                                                        bl_date: data.bl_date || ''
                                                }));
                                                showAlertMessage('Existing packing list loaded for editing', 'success');
                                        } else {
                                                // No packing list yet — apply export invoice data to pre-fill form
                                                applyExportToForm({
                                                        ...data,
                                                        id: exportInvoiceId,
                                                        clientName: data.client_name,
                                                        productLines: data.product_lines || data.inv_product_lines || []
                                                });
                                        }
                                }
                        } catch (e) {
                                console.warn('Could not load packing list for export invoice:', e);
                                // Fall back to selecting from availableInvoices
                                if (availableInvoices.length > 0) {
                                        const found = availableInvoices.find(i => String(i.id) === String(exportInvoiceId));
                                        if (found) applyExportToForm(found);
                                }
                        }
                };
                loadFromExportInvoice();
        }, [exportInvoiceId]);

        // Handle editing existing packing lists (from props or sessionStorage)
        useEffect(() => {
                // First check if data came from sessionStorage (navigation from edit button)
                let dataToLoad = packingList || packingListData;
                if (!dataToLoad) {
                        try {
                                const navigationData = sessionStorage.getItem('navigationData');
                                if (navigationData) {
                                        const parsed = JSON.parse(navigationData);
                                        dataToLoad = parsed.packingList;
                                }
                        } catch (err) {
                                console.warn('Failed to parse navigation data from sessionStorage:', err);
                        }
                }

                if (dataToLoad && dataToLoad.id) {
                        const normalizedProductLines = Array.isArray(dataToLoad.product_lines)
                                ? dataToLoad.product_lines.map(pl => {
                                        const totalBoxes = parseInt(pl.totalBoxes ?? pl.total_boxes ?? pl.boxes ?? 0, 10) || 0;
                                        const boxWeight = parseFloat(pl.boxWeight ?? pl.box_weight ?? pl.weightPerSqm ?? pl.weight_per_sqm ?? pl.perBoxWeight ?? pl.per_box_weight ?? 0) || 0;
                                        const sqmAuto = parseFloat(pl.sqmAuto ?? pl.sqm ?? pl.sqm_auto ?? 0) || 0;
                                        const rate = parseFloat(pl.rate ?? pl.unit_price ?? 0) || 0;
                                        let netWeight = parseFloat(pl.netWeight ?? pl.net_weight ?? 0) || 0;
                                        if ((!netWeight || netWeight === 0) && boxWeight && totalBoxes) netWeight = parseFloat((boxWeight * totalBoxes).toFixed(2));
                                        const grossWeight = parseFloat(parseFloat(pl.grossWeight ?? pl.gross_weight ?? 0).toFixed(2)) || parseFloat((netWeight + totalBoxes).toFixed(2));
                                        return {
                                                product: pl.product || pl.product_name || pl.name || pl.material_description || '',
                                                size: pl.size || pl.dimensions || '',
                                                surface: pl.surface || pl.finish || '',
                                                totalPallet: parseInt(pl.totalPallet ?? pl.total_pallet ?? pl.pallets ?? 0, 10) || 0,
                                                totalBoxes,
                                                boxWeight,
                                                sqmAuto,
                                                rate,
                                                amount: parseFloat((sqmAuto * rate).toFixed(2)),
                                                netWeight,
                                                grossWeight
                                        };
                                })
                                : [];

                        const exportInvoiceId = dataToLoad.pi_reference || dataToLoad.export_invoice_id || dataToLoad.exportInvoiceId;

                        setFormData(prev => ({
                                ...prev,
                                id: dataToLoad.id,
                                packing_list_no: dataToLoad.packing_list_no || dataToLoad.packingListNo || '',
                                date: dataToLoad.date || dataToLoad.packing_list_date || new Date().toLocaleDateString('en-CA'),
                                pi_reference: exportInvoiceId,
                                proforma_invoice_no: dataToLoad.proforma_invoice_no || dataToLoad.proformaInvoiceNo || '',
                                proforma_invoice_id: dataToLoad.proforma_invoice_id || '',
                                client_name: dataToLoad.client_name || dataToLoad.clientName || '',
                                country: dataToLoad.country || '',
                                total_pallets: parseInt(dataToLoad.total_pallets || dataToLoad.totalPallets || 0, 10),
                                total_boxes: parseInt(dataToLoad.total_boxes || dataToLoad.totalBoxes || 0, 10),
                                total_sqm: parseFloat(dataToLoad.total_sqm || dataToLoad.totalSqm || 0),
                                total_weight: parseFloat(dataToLoad.total_weight || dataToLoad.totalWeight || 0),
                                net_weight: parseFloat(dataToLoad.net_weight || dataToLoad.netWeight || 0),
                                total_amount: parseFloat(dataToLoad.total_amount || dataToLoad.totalAmount || 0),
                                gross_weight: parseFloat(dataToLoad.gross_weight || dataToLoad.grossWeight || 0),
                                status: dataToLoad.status || 'Pending',
                                product_lines: normalizedProductLines,
                                pallet_type: dataToLoad.pallet_type || dataToLoad.palletType || '',
                                tiles_back: dataToLoad.tiles_back || dataToLoad.tilesBack || '',
                                boxes_marking: dataToLoad.boxes_marking || dataToLoad.boxesMarking || '',
                                box_type: dataToLoad.box_type || dataToLoad.boxType || '',
                                fumigation: dataToLoad.fumigation || 'YES',
                                legalisation: dataToLoad.legalisation || 'NO',
                                other_instructions: dataToLoad.other_instructions || dataToLoad.otherInstructions || '',
                                consignee_details: dataToLoad.consignee_details || dataToLoad.consigneeDetails || '',
                                buyer_details: dataToLoad.buyer_details || dataToLoad.buyerDetails || '',
                                payment_terms: dataToLoad.payment_terms || dataToLoad.paymentTerms || '',
                                delivery_terms: dataToLoad.delivery_terms || dataToLoad.deliveryTerms || '',
                                port_of_loading: dataToLoad.port_of_loading || dataToLoad.portOfLoading || '',
                                port_of_discharge: dataToLoad.port_of_discharge || dataToLoad.portOfDischarge || '',
                                final_destination: dataToLoad.final_destination || dataToLoad.finalDestination || '',
                                vessel_name: dataToLoad.vessel_name || dataToLoad.vesselName || '',
                                vessel_flight_no: dataToLoad.vessel_flight_no || dataToLoad.vesselFlightNo || '',
                                place_of_receipt: dataToLoad.place_of_receipt || dataToLoad.placeOfReceipt || '',
                                pre_carriage_by: dataToLoad.pre_carriage_by || dataToLoad.preCarriageBy || '',
                                tariff_code: dataToLoad.tariff_code || dataToLoad.tariffCode || '',
                                product_description: dataToLoad.product_description || dataToLoad.productDescription || 'GLAZED PORCELAIN TILES',
                                hs_code: dataToLoad.hs_code || dataToLoad.hsCode || '',
                                made_in_india: dataToLoad.made_in_india || dataToLoad.madeInIndia || 'YES',
                                buyers_order_no: dataToLoad.buyers_order_no || dataToLoad.buyersOrderNo || '',
                                buyers_order_date: dataToLoad.buyers_order_date || dataToLoad.buyersOrderDate || '',
                                proforma_invoice_date: dataToLoad.proforma_invoice_date || dataToLoad.proforma_date || '',
                                export_invoice_date: dataToLoad.export_invoice_date || dataToLoad.invoice_date || dataToLoad.packing_list_date || '',
                                container_details: dataToLoad.container_details || dataToLoad.containerDetails || []
                        }));

                        // If we have an export invoice ID, fetch its full details to populate dependent fields
                        if (exportInvoiceId) {
                                fetchInvoiceDetails(exportInvoiceId);
                        }

                        showAlertMessage('Packing list loaded for editing', 'success');
                }
        }, [packingList, packingListData]);

        const applyExportToForm = (inv) => {
                if (!inv) return;

                // Extract metadata if stored in metadata JSONB field
                const metadata = inv.metadata || {};

                // Get product lines from export invoice (for new packing lists)
                const productLines = inv.productLines || inv.product_lines || inv.products || inv.items || [];

                const normalizedLines = productLines.map(pl => {
                        const totalPallet = parseInt(pl.totalPallet ?? pl.total_pallet ?? pl.pallets ?? 0, 10) || 0;
                        const totalBoxes = parseInt(pl.totalBoxes ?? pl.total_boxes ?? pl.boxes ?? 0, 10) || 0;
                        const sqmAuto = parseFloat(pl.sqmAuto ?? pl.sqm ?? pl.sqm_auto ?? 0) || 0;
                        const rate = parseFloat(pl.rate ?? pl.unit_price ?? 0) || 0;
                        const amount = parseFloat(pl.amount ?? (sqmAuto * rate)) || 0;
                        const boxWeight = parseFloat(pl.boxWeight ?? pl.box_weight ?? pl.weightPerSqm ?? pl.weight_per_sqm ?? pl.perBoxWeight ?? pl.per_box_weight ?? 0) || 0;
                        let netWeight = parseFloat(pl.netWeight ?? pl.net_weight ?? 0) || 0;
                        if ((!netWeight || netWeight === 0) && boxWeight && totalBoxes) netWeight = parseFloat((boxWeight * totalBoxes).toFixed(2));
                        const grossWeight = parseFloat(parseFloat(pl.grossWeight ?? pl.gross_weight ?? 0).toFixed(2)) || parseFloat((netWeight + totalBoxes).toFixed(2));
                        return {
                                product: pl.product || pl.product_name || pl.name || pl.material_description || '',
                                size: pl.size || pl.dimensions || '',
                                surface: pl.surface || pl.finish || '',
                                totalPallet,
                                totalBoxes,
                                boxWeight,
                                sqmAuto,
                                rate,
                                amount: parseFloat((sqmAuto * rate).toFixed(2)),
                                netWeight,
                                grossWeight
                        };
                });

                // Properly extract proforma invoice number from various possible locations
                const piRef = inv.proformaInvoiceNo
                        ?? inv.proforma_invoice_no
                        ?? inv.proformaNo
                        ?? inv.proforma_no
                        ?? inv.pi_number
                        ?? inv.piNo
                        ?? inv.pi_reference
                        ?? '';


                // Extract all detail fields
                const consigneeDetails = inv.consignee_details ?? inv.consigneeDetails ?? inv.consignee ?? '';
                const buyerDetails = inv.buyer_details ?? inv.buyerDetails ?? inv.buyer ?? '';
                const portOfLoading = inv.port_of_loading ?? inv.portOfLoading ?? '';
                const portOfDischarge = inv.port_of_discharge ?? inv.portOfDischarge ?? '';
                const finalDestination = inv.final_destination ?? inv.finalDestination ?? '';
                const paymentTerms = inv.payment_terms ?? inv.paymentTerms ?? '';
                const deliveryTerms = inv.delivery_terms ?? inv.deliveryTerms ?? '';

                const totalPallets = normalizedLines.reduce((s, l) => s + (l.totalPallet || 0), 0);
                const totalNetWeight = normalizedLines.reduce((s, l) => s + (parseFloat(l.netWeight) || 0), 0);
                const totalGrossWeight = normalizedLines.reduce((s, l) => s + (parseFloat(l.grossWeight) || 0), 0);

                setFormData(prev => {
                        // In edit mode (when product_lines already have data), preserve them and only update supplementary fields
                        const hasExistingProducts = prev.product_lines && prev.product_lines.length > 0;

                        return {
                                ...prev,
                                packing_list_no: inv.pl_no || inv.packing_list_no || inv.packingListNo || prev.packing_list_no,
                                pi_reference: inv.id || prev.pi_reference,
                                proforma_invoice_no: piRef || prev.proforma_invoice_no,
                                proforma_invoice_id: inv.proforma_invoice_id || inv.proformaInvoiceId || prev.proforma_invoice_id,
                                client_name: inv.clientName || inv.client_name || prev.client_name,
                                country: inv.country || prev.country,
                                port_of_discharge: portOfDischarge,
                                final_destination: finalDestination,
                                port_of_loading: portOfLoading,
                                place_of_receipt: inv.place_of_receipt || metadata.place_of_receipt || prev.place_of_receipt,
                                vessel_name: inv.vessel_flight_no || metadata.vessel_flight_no || prev.vessel_name,
                                vessel_flight_no: inv.vessel_flight_no || metadata.vessel_flight_no || prev.vessel_flight_no,
                                pre_carriage_by: inv.pre_carriage_by || metadata.pre_carriage_by || prev.pre_carriage_by,
                                consignee_details: consigneeDetails,
                                buyer_details: buyerDetails,
                                payment_terms: paymentTerms,
                                delivery_terms: deliveryTerms,
                                tariff_code: inv.tariff_code || prev.tariff_code || '',
                                pallet_type: inv.pallet_type || inv.palletType || prev.pallet_type || '',
                                tiles_back: inv.tiles_back || inv.tilesBack || prev.tiles_back || '',
                                boxes_marking: inv.boxes_marking || inv.boxesMarking || inv.marksAndNumbers || prev.boxes_marking || '',
                                box_type: inv.box_type || inv.boxType || prev.box_type || '',
                                fumigation: inv.fumigation || prev.fumigation || 'YES',
                                legalisation: inv.legalisation || prev.legalisation || 'NO',
                                other_instructions: inv.other_instructions || inv.otherInstructions || prev.other_instructions,
                                buyers_order_no: inv.buyers_order_no || prev.buyers_order_no,
                                buyers_order_date: inv.buyers_order_date || prev.buyers_order_date,
                                bl_no: inv.bl_no || prev.bl_no || '',
                                bl_date: inv.bl_date || prev.bl_date || '',
                                product_description: inv.product_description || prev.product_description || 'GLAZED PORCELAIN TILES',
                                hs_code: inv.hs_code || inv.tariff_code || prev.hs_code || '',
                                made_in_india: inv.made_in_india || inv.tilesBack || prev.made_in_india || 'YES',
                                proforma_invoice_date: formatInputDate(inv.proformaInvoiceDate || inv.proforma_invoice_date || inv.proforma_date || inv.proformaDate || inv.pi_date || ''),
                                export_invoice_date: formatInputDate(inv.invoice_date || inv.invoiceDate || inv.date || ''),
                                // Only update product_lines if not in edit mode (don't have existing products)
                                ...(!hasExistingProducts && { product_lines: normalizedLines }),
                                // Only update totals if not in edit mode
                                ...(!hasExistingProducts && {
                                        total_pallets: totalPallets,
                                        total_boxes: normalizedLines.reduce((s, l) => s + (l.totalBoxes || 0), 0),
                                        total_sqm: normalizedLines.reduce((s, l) => s + (parseFloat(l.sqmAuto) || 0), 0),
                                        total_weight: totalNetWeight,
                                        net_weight: totalNetWeight,
                                        total_amount: normalizedLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
                                        gross_weight: totalGrossWeight
                                })
                        };
                });

                // Log the form data that was set

                showAlertMessage('Data auto-fetched from Export Invoice!', 'success');
        };

        const handleChange = (e) => {
                const { name, value } = e.target;
                setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleProductChange = (index, field, value) => {
                const updated = [...formData.product_lines];
                updated[index] = { ...updated[index], [field]: value };

                if (['sqmAuto', 'rate'].includes(field)) {
                        const sqm = parseFloat(updated[index].sqmAuto) || 0;
                        const rate = parseFloat(updated[index].rate) || 0;
                        updated[index].amount = sqm * rate;
                }

                const line = updated[index] || {};
                const totalBoxes = parseInt(line.totalBoxes || 0, 10) || 0;
                const boxWeight = parseFloat(line.boxWeight || 0) || 0;
                const computedNet = parseFloat((boxWeight * totalBoxes).toFixed(2)) || parseFloat(parseFloat(line.netWeight || 0).toFixed(2)) || 0;
                updated[index].netWeight = computedNet;
                updated[index].grossWeight = parseFloat((computedNet + totalBoxes).toFixed(2));

                const totalWeight = parseFloat(updated.reduce((s, p) => s + (parseFloat(p.netWeight) || 0), 0).toFixed(2));

                setFormData(prev => ({
                        ...prev,
                        product_lines: updated,
                        total_sqm: parseFloat(updated.reduce((s, p) => s + (parseFloat(p.sqmAuto) || 0), 0).toFixed(2)),
                        total_boxes: updated.reduce((s, p) => s + (parseInt(p.totalBoxes) || 0), 0),
                        total_pallets: updated.reduce((s, p) => s + (parseInt(p.totalPallet) || 0), 0),
                        total_weight: totalWeight,
                        net_weight: totalWeight,
                        total_amount: parseFloat(updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0).toFixed(2)),
                        gross_weight: parseFloat(updated.reduce((s, p) => s + (parseFloat(p.grossWeight) || 0), 0).toFixed(2))
                }));
        };

        const addProductLine = () => {
                setFormData(prev => ({
                        ...prev,
                        product_lines: [
                                ...prev.product_lines,
                                { product: '', size: '', surface: '', totalPallet: 0, totalBoxes: 0, boxWeight: 0, sqmAuto: 0, rate: 0, amount: 0, netWeight: 0, grossWeight: 0 }
                        ]
                }));
        };

        const removeProductLine = (index) => {
                const updated = formData.product_lines.filter((_, i) => i !== index);
                const totalWeight = updated.reduce((s, p) => s + (parseFloat(p.netWeight) || 0), 0);
                setFormData(prev => ({
                        ...prev,
                        product_lines: updated,
                        total_sqm: updated.reduce((s, p) => s + (parseFloat(p.sqmAuto) || 0), 0),
                        total_boxes: updated.reduce((s, p) => s + (parseInt(p.totalBoxes) || 0), 0),
                        total_pallets: updated.reduce((s, p) => s + (parseInt(p.totalPallet) || 0), 0),
                        total_weight: totalWeight,
                        net_weight: totalWeight,
                        total_amount: updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
                        gross_weight: updated.reduce((s, p) => s + (parseFloat(p.grossWeight) || 0), 0)
                }));
        };

        const isFormValid = () => {
                return formData.pi_reference && String(formData.pi_reference).trim().length > 0;
        };

        const validateForm = () => {
                const newErrors = {};
                if (!formData.pi_reference) newErrors.pi_reference = 'EXP Reference is required';
                if (formData.product_lines.length === 0) newErrors.product_lines = 'Product lines are required';
                setErrors(newErrors);
                return Object.keys(newErrors).length === 0;
        };

        const handleSubmit = async (e) => {
                e.preventDefault();
                if (!validateForm()) {
                        scrollToFirstError();
                        setShowErrorModal(true);
                        return;
                }

                const dataToSave = {
                        ...formData,
                        export_invoice_id: formData.pi_reference,
                        packing_list_date: formData.export_invoice_date || formData.date || new Date().toLocaleDateString('en-CA'),
                        consignee: formData.consignee_details,
                        buyer: formData.buyer_details,
                        product_lines: formData.product_lines
                };

                try {
                        setSaving(true);

                        // Check if this is an edit (existing packing list) or create (new packing list)
                        if (formData.id) {
                                await api.put(`/packing-lists/${formData.id}`, dataToSave);
                                showSuccess('Packing list updated successfully');
                        } else if (formData.pi_reference) {
                                await api.post(`/packing-lists/export-invoice/${formData.pi_reference}`, dataToSave);
                                showSuccess('Packing list created successfully');
                        } else {
                                await api.post('/packing-lists', dataToSave);
                                showSuccess('Packing list created successfully');
                        }

                        // Call onSave if provided, otherwise just reset
                        if (onSave) {
                                onSave(dataToSave);
                        } else if (onCancel) {
                                onCancel();
                        }
                } catch (err) {
                        console.error('Save error:', err);
                        
                        // Parse backend errors using standard utility
                        if (err.response?.status === 400 && err.response?.data?.errors) {
                                const parsedErrors = extractValidationErrors(err.response.data.errors);
                                if (Object.keys(parsedErrors).length > 0) {
                                        setErrors(prev => ({ ...prev, ...parsedErrors }));
                                        scrollToFirstError();
                                        showError('Validation failed. Please check the highlighted fields.');
                                        return;
                                }
                        }
                        
                        showError(err?.response?.data?.message || err?.message || 'Failed to save packing list');
                } finally {
                        setSaving(false);
                }
        };

        const handleCancel = () => {
                if (onCancel) {
                        onCancel();
                }
        };

        const showAlertMessage = (message, type = 'info') => {
                setAlertMessage(message);
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 3000);
        };

        const numberToWords = (num) => {
                const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
                const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
                const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
                const scale = ['', 'THOUSAND', 'LAC', 'CRORE'];
                if (num === 0) return 'ZERO';
                const convertHundreds = (n) => {
                        let result = '';
                        if (n >= 100) { result += ones[Math.floor(n / 100)] + ' HUNDRED '; n %= 100; }
                        if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10; }
                        else if (n >= 10) { result += teens[n - 10] + ' '; return result; }
                        if (n > 0) result += ones[n] + ' ';
                        return result;
                };
                let result = ''; let level = 0; let first = true;
                while (num > 0) {
                        const divisor = first ? 1000 : 100; first = false;
                        const segment = num % divisor; num = Math.floor(num / divisor);
                        if (segment !== 0) { result = convertHundreds(segment) + (scale[level] ? scale[level] + ' ' : '') + result; }
                        level++;
                }
                return result.trim();
        };

        return (
                <Container fluid className="py-4">
                        <Form onSubmit={handleSubmit}>
                                <div className="d-flex justify-content-between align-items-center mb-4 px-3">
                                        <div className="d-flex align-items-center">
                                                <Button variant="outline" type="button" onClick={handleCancel} className="me-3 p-2 bg-white shadow-sm border-0 rounded-3 text-primary" style={{ width: '45px', height: '45px' }}>
                                                        <ArrowLeft size={20} />
                                                </Button>
                                                <div>
                                                        <h4 className="mb-0 fw-bold">{formData.id ? 'Edit Packing List' : 'New Packing List'}</h4>
                                                        <p className="text-muted small mb-0 fw-medium">Manage Packing List</p>
                                                </div>
                                        </div>
                                        <div className="d-flex gap-2">
                                                <Button variant="outline" type="button" onClick={handleCancel} className="shadow-sm px-4 fw-bold bg-white" style={{ height: '55px', borderRadius: '12px' }}>
                                                        <X size={20} className="me-2" /> Cancel
                                                </Button>
                                                <Button variant="primary" type="submit" disabled={saving || !isFormValid()} className="shadow-sm px-4 fw-bold" style={{ height: '55px', borderRadius: '12px', minWidth: '160px', opacity: !isFormValid() ? 0.65 : 1, cursor: !isFormValid() ? 'not-allowed' : 'pointer' }}>
                                                        {saving ? <div className="spinner-border spinner-border-sm me-2" /> : <Save size={20} className="me-2" />}
                                                        {saving ? 'Saving...' : 'Save Packing List'}
                                                </Button>
                                        </div>
                                </div>

                                {showAlert && (
                                        <Alert variant="primary" dismissible onClose={() => setShowAlert(false)} className="mb-4">
                                                {alertMessage}
                                        </Alert>
                                )}

                                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <Card.Header className="bg-primary text-white py-3 border-0">
                                                <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Basic Information</h6>
                                        </Card.Header>
                                        <Card.Body>
                                                <Row className="g-4">
                                                        <Col md={2}>
                                                                <Form.Group>
                                                                        <OverlayTrigger placement="top" overlay={<Tooltip>Export Invoice Reference is mandatory.</Tooltip>}>
                                                                                <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                                                                                        EXP no. * <Info size={12} className="ms-1" />
                                                                                </Form.Label>
                                                                        </OverlayTrigger>
                                                                        <Form.Select
                                                                                className="bg-light border-0 py-2 px-3 fw-bold text-primary"
                                                                                style={{ borderRadius: '10px', height: '48px' }}
                                                                                name="pi_reference"
                                                                                value={formData.pi_reference}
                                                                                onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        setFormData(prev => ({ ...prev, pi_reference: val }));
                                                                                        fetchInvoiceDetails(val);
                                                                                        if (errors.pi_reference) setErrors(prev => ({ ...prev, pi_reference: '' }));
                                                                                }}
                                                                                isInvalid={!!errors.pi_reference}
                                                                                required
                                                                        >
                                                                                <option value="">Select Export Invoice</option>
                                                                                {availableInvoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNo}</option>)}
                                                                        </Form.Select>
                                                                        {errors.pi_reference && <div className="invalid-feedback d-block">{errors.pi_reference}</div>}
                                                                </Form.Group>
                                                        </Col>
                                                        <Col md={2}>
                                                                <Form.Group>
                                                                        <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">PI no.:</Form.Label>
                                                                        <Form.Control
                                                                                type="text"
                                                                                value={formData.proforma_invoice_no}
                                                                                readOnly
                                                                                className="bg-light border-0 py-2 px-3 fw-bold"
                                                                                style={{ borderRadius: '10px', height: '48px' }}
                                                                        />
                                                                </Form.Group>
                                                        </Col>
                                                        <Col md={2}>
                                                                <Form.Group>
                                                                        <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Packing List No:</Form.Label>
                                                                        <Form.Control
                                                                                type="text"
                                                                                value={formData.packing_list_no}
                                                                                readOnly
                                                                                className="bg-light border-0 py-2 px-3 fw-bold text-primary"
                                                                                style={{ borderRadius: '10px', height: '48px' }}
                                                                                placeholder="Auto-generated"
                                                                        />
                                                                </Form.Group>
                                                        </Col>
                                                        <Col md={3}>
                                                                <Form.Group>
                                                                        <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Proforma Invoice Date:</Form.Label>
                                                                        <Form.Control
                                                                                type="date"
                                                                                value={formData.proforma_invoice_date || ''}
                                                                                readOnly
                                                                                className="bg-light border-0 py-2 px-3 fw-bold"
                                                                                style={{ borderRadius: '10px', height: '48px' }}
                                                                        />
                                                                </Form.Group>
                                                        </Col>
                                                        <Col md={3}>
                                                                <Form.Group>
                                                                        <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Export Invoice Date:</Form.Label>
                                                                        <Form.Control
                                                                                type="date"
                                                                                value={formData.export_invoice_date || ''}
                                                                                readOnly
                                                                                className="bg-light border-0 py-2 px-3 fw-bold"
                                                                                style={{ borderRadius: '10px', height: '48px' }}
                                                                        />
                                                                </Form.Group>
                                                        </Col>
                                                </Row>
                                        </Card.Body>
                                </Card>

                                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <Card.Header className="bg-primary text-white py-3 border-0 d-flex justify-content-between align-items-center">
                                                <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Product Details</h6>
                                        </Card.Header>
                                        <Card.Body className="p-0">
                                                <Table responsive hover className="mb-0 align-middle">
                                                        <thead className="bg-light small text-uppercase fw-bold">
                                                                <tr>
                                                                        <th>Material Description</th>
                                                                        <th>Pallets</th>
                                                                        <th>Qty (Boxes)</th>
                                                                        <th>Box WT (KG)</th>
                                                                        <th>Qty (SQM)</th>
                                                                        <th>Net WT (KG)</th>
                                                                        <th>Gross WT (KG)</th>
                                                                </tr>
                                                        </thead>
                                                        <tbody>
                                                                {formData.product_lines.length === 0 ? (
                                                                        <tr><td colSpan="7" className="text-center py-4 text-muted">No products added. Click "Add Product" to begin.</td></tr>
                                                                ) : (
                                                                        formData.product_lines.map((product, index) => (
                                                                                <tr key={index}>
                                                                                        <td><Form.Control size="sm" type="text" value={product.product} readOnly className="bg-light" /></td>
                                                                                        <td><Form.Control size="sm" type="number" value={product.totalPallet} readOnly className="bg-light" /></td>
                                                                                        <td><Form.Control size="sm" type="number" value={product.totalBoxes} readOnly className="bg-light" /></td>
                                                                                        <td><Form.Control size="sm" type="number" value={product.boxWeight} readOnly className="bg-light" /></td>
                                                                                        <td><Form.Control size="sm" type="number" value={product.sqmAuto} readOnly className="bg-light" /></td>
                                                                                        <td>{parseFloat(product.netWeight || 0).toFixed(2)}</td>
                                                                                        <td>{parseFloat(product.grossWeight || 0).toFixed(2)}</td>
                                                                                </tr>
                                                                        ))
                                                                )}
                                                        </tbody>
                                                        <tfoot className="bg-light fw-bold">
                                                                <tr>
                                                                        <td>TOTAL</td>
                                                                        <td>{formData.total_pallets}</td>
                                                                        <td>{formData.total_boxes}</td>
                                                                        <td>{formData.product_lines.reduce((s, p) => s + (parseFloat(p.boxWeight) || 0), 0).toFixed(2)}</td>
                                                                        <td>{formData.total_sqm.toFixed(2)}</td>
                                                                        <td>{formData.total_weight.toFixed(2)}</td>
                                                                        <td>{formData.gross_weight.toFixed(2)}</td>
                                                                </tr>
                                                        </tfoot>
                                                </Table>

                                        </Card.Body>
                                </Card>

                                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <Card.Header className="bg-primary text-white py-3 border-0"><h6 className="mb-0 fw-bold text-uppercase tracking-wider">Packing Instructions</h6></Card.Header>
                                        <Card.Body>
                                                <Row className="g-3">
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Pallet Type</Form.Label><Form.Control type="text" name="pallet_type" value={formData.pallet_type} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Tiles Back</Form.Label><Form.Control type="text" name="tiles_back" value={formData.tiles_back} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Boxes Marking</Form.Label><Form.Control type="text" name="boxes_marking" value={formData.boxes_marking} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Box Type</Form.Label><Form.Control type="text" name="box_type" value={formData.box_type} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Fumigation</Form.Label><Form.Control type="text" name="fumigation" value={formData.fumigation} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Legalisation</Form.Label><Form.Control type="text" name="legalisation" value={formData.legalisation} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={12}><Form.Group><Form.Label className="fw-bold small">Other Instructions</Form.Label><Form.Control as="textarea" rows={3} name="other_instructions" value={formData.other_instructions} readOnly className="bg-light" /></Form.Group></Col>
                                                </Row>
                                        </Card.Body>
                                </Card>

                                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <Card.Header className="bg-primary text-white py-3 border-0"><h6 className="mb-0 fw-bold text-uppercase tracking-wider">Consignee & Buyer Details</h6></Card.Header>
                                        <Card.Body>
                                                <Row className="g-3">
                                                        <Col md={6}><Form.Group><Form.Label className="fw-bold small">Consignee Details</Form.Label><Form.Control as="textarea" rows={3} name="consignee_details" value={formData.consignee_details} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={6}><Form.Group><Form.Label className="fw-bold small">Buyer Details</Form.Label><Form.Control as="textarea" rows={3} name="buyer_details" value={formData.buyer_details} readOnly className="bg-light" /></Form.Group></Col>
                                                </Row>
                                        </Card.Body>
                                </Card>

                                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <Card.Header className="bg-primary text-white py-3 border-0"><h6 className="mb-0 fw-bold text-uppercase tracking-wider">Shipping & Transport Details</h6></Card.Header>
                                        <Card.Body>
                                                <Row className="g-3">
                                                        <Col md={4}>
                                                                <Form.Group>
                                                                        <Form.Label className="fw-bold small">Port of Loading</Form.Label>
                                                                        <Form.Control type="text" value={formData.port_of_loading} readOnly className="bg-light" />
                                                                </Form.Group>
                                                        </Col>
                                                        <Col md={4}>
                                                                <Form.Group>
                                                                        <Form.Label className="fw-bold small">Port of Discharge</Form.Label>
                                                                        <Form.Control type="text" value={formData.port_of_discharge} readOnly className="bg-light" />
                                                                </Form.Group>
                                                        </Col>
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Final Destination</Form.Label><Form.Control type="text" name="final_destination" value={formData.final_destination} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={4}><Form.Group><Form.Label className="fw-bold small">Vessel/Flight No.</Form.Label><Form.Control type="text" name="vessel_flight_no" value={formData.vessel_flight_no} readOnly className="bg-light" placeholder="Vessel/Flight No." /></Form.Group></Col>
                                                </Row>
                                        </Card.Body>
                                </Card>

                                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <Card.Header className="bg-primary text-white py-3 border-0"><h6 className="mb-0 fw-bold text-uppercase tracking-wider">Payment & Delivery Terms</h6></Card.Header>
                                        <Card.Body>
                                                <Row className="g-3">
                                                        <Col md={6}><Form.Group><Form.Label className="fw-bold small">Payment Terms</Form.Label><Form.Control type="text" name="payment_terms" value={formData.payment_terms} readOnly className="bg-light" /></Form.Group></Col>
                                                        <Col md={6}><Form.Group><Form.Label className="fw-bold small">Delivery Terms</Form.Label><Form.Control type="text" name="delivery_terms" value={formData.delivery_terms} readOnly className="bg-light" /></Form.Group></Col>
                                                </Row>
                                        </Card.Body>
                                </Card>

                                <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <Card.Header className="bg-primary text-white py-3 border-0"><h6 className="mb-0 fw-bold text-uppercase tracking-wider">Status</h6></Card.Header>
                                        <Card.Body>
                                                <Row><Col md={3}><Form.Group><Form.Label className="fw-bold small">Packing List Status</Form.Label><Form.Select name="status" value={formData.status} onChange={handleChange}><option value="Pending">Pending</option><option value="Completed">Completed</option>                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Revised">Revised</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Finalized">Finalized</option>
                    <option value="Rejected">Rejected</option>
                  </Form.Select></Form.Group></Col></Row>
                                        </Card.Body>
                                </Card>

                                {/* Bottom Actions Container */}
                                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                                        <Button variant="outline" type="button" onClick={onCancel} className="shadow-sm px-4 fw-bold" style={{ height: '55px', borderRadius: '12px' }}>
                                                <X size={20} className="me-2" /> Cancel
                                        </Button>
                                        <Button variant="primary" type="submit" disabled={saving || !isFormValid()} className="shadow-sm px-4 fw-bold" style={{ height: '55px', borderRadius: '12px', minWidth: '160px', opacity: !isFormValid() ? 0.65 : 1, cursor: !isFormValid() ? 'not-allowed' : 'pointer' }}>
                                                {saving ? <div className="spinner-border spinner-border-sm me-2" /> : <Save size={20} className="me-2" />}
                                                {saving ? 'Saving...' : 'Save Packing List'}
                                        </Button>
                                </div>
                        </Form>
                        <ValidationErrorModal
                                show={showErrorModal}
                                errors={errors}
                                onClose={() => setShowErrorModal(false)}
                                title="Packing List Form Validation Error"
                        />
                </Container>
        );
}

export default PackingListForm;




