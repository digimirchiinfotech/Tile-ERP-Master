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
import { Container, Row, Col, Card, Form, Button, Table, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Save, X, Plus, Trash2, ArrowLeft, Ship, CreditCard, FileText, History, Package, Hash, Info, RefreshCw } from 'lucide-react';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import api from '../../../services/api';
import { exportMapper } from '../../../utils/exportMapper';
import { useExportDocumentReferences } from '../../../hooks/useExportDocumentReferences';
import AddableDropdown from '../../shared/AddableDropdown.jsx';
import ModuleAuditLog from '../../shared/ModuleAuditLog.jsx';
import { scrollToFirstError } from '../../../utils/validationUIHelper.js';
import { useMasterData } from '../../../hooks/useMasterData.js';


const formatInputDate = (date) => {
	if (!date) return '';
	if (String(date).includes(',')) {
		return String(date).split(',').map(d => {
			try {
				const dt = new Date(d.trim());
				if (isNaN(dt.getTime())) return d.trim();
				const year = dt.getFullYear();
				const month = String(dt.getMonth() + 1).padStart(2, '0');
				const day = String(dt.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			} catch (e) {
				return d.trim();
			}
		}).join(', ');
	}
	try {
		const d = new Date(date);
		if (isNaN(d.getTime())) return '';
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	} catch (e) {
		return '';
	}
};

const formatDisplayDates = (dateStr) => {
	if (!dateStr) return '';
	return String(dateStr).split(',').map(d => {
		const parts = d.trim().split('-');
		if (parts.length === 3 && parts[0].length === 4) {
			return `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
		return d.trim();
	}).filter((val, i, arr) => arr.indexOf(val) === i).join(', ');
};

function PackingListForm({ exportInvoiceId, packingList, packingListData, packingListId, onSave, onCancel, onBack }) {
	const [availableInvoices, setAvailableInvoices] = useState([]);
	const [loadingInvoices, setLoadingInvoices] = useState(false);
	const [saving, setSaving] = useState(false);
	
	const masterData = useMasterData();

	const [formData, setFormData] = useState({
		packing_list_no: '',
		date: new Date().toLocaleDateString('en-CA'),
		export_invoice_id: exportInvoiceId || '', // Standardized from pi_reference
		proforma_invoice_no: '',
		proforma_invoice_id: '',
		client_name: '',
		country: '',
		total_pallets: 0,
		total_boxes: 0,
		total_sqm: 0,
		total_weight: 0,
		net_weight: 0,
		total_amount: 0,
		gross_weight: 0,
		proforma_invoice_date: '',
		export_invoice_date: '',
		status: 'Pending',
		product_lines: [],
		pallet_type: '',
		tiles_back: '',
		boxes_marking: '',
		box_type: '',
		fumigation: '',
		legalisation: '',

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
		product_description: '',
		hs_code: '',
		sqm_per_box: 0,
		net_weight_per_box: 0,
		gross_weight_per_box: 0,
		made_in_india: '',
		buyers_order_no: '',
		buyers_order_date: '',
		container_details: [],
		country_of_origin: 'INDIA',
		ei_updated_at: '',
		updated_at: ''
	});

	const isLocked = formData.status === 'Finalized' || formData.status === 'Dispatched';

	const [errors, setErrors] = useState({});
	const [showAlert, setShowAlert] = useState(false);
	const [alertMessage, setAlertMessage] = useState('');
	const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);

	// Fetch full invoice details when user selects from dropdown
	const fetchInvoiceDetails = async (invoiceId) => {
		if (!invoiceId) return;
		try {
			const resp = await api.get(`/export-invoices/${invoiceId}`);
			const inv = resp?.data?.data || resp?.data;

			if (inv) {
				// If proforma_invoice_no or proformaInvoiceDate is empty but proforma_invoice_id exists, fetch it separately
				if ((!inv.proformaInvoiceDate || !inv.proforma_date || !inv.proformaInvoiceNo || !inv.proforma_invoice_no) && (inv.proforma_invoice_id || inv.proformaInvoiceId)) {
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

				// Ensure proforma date and number are available even if already joined
				if (!inv.proformaInvoiceDate) {
					inv.proformaInvoiceDate = inv.proforma_date || inv.proformaDate || inv.pi_date || '';
				}
				if (!inv.proformaInvoiceNo) {
					inv.proformaInvoiceNo = inv.proforma_invoice_no || inv.pi_no || '';
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
		const fetchExportInvoices = async () => {
			try {
				setLoadingInvoices(true);
				const invId = exportInvoiceId || formData.export_invoice_id || packingList?.export_invoice_id || packingListData?.export_invoice_id || '';
				const resp = await api.get(`/export-documents/references/export-invoices?currentId=${invId}`);
				setAvailableInvoices(resp?.data?.data || []);
			} catch (e) {
				console.error('Failed to fetch export invoices for packing list', e);
			} finally { setLoadingInvoices(false); }
		};
		fetchExportInvoices();

		// Fetch next number if it's a new record
		if (!packingList && !packingListData && !formData.packing_list_no) {
			const invId = exportInvoiceId || formData.export_invoice_id;
			const url = invId ? `/packing-lists/next-number?exportInvoiceId=${invId}` : '/packing-lists/next-number';
			api.get(url).then(res => {
				if (res.data?.data?.packing_list_no) {
					setFormData(p => ({ ...p, packing_list_no: res.data.data.packing_list_no }));
				}
			}).catch(() => { });
		}
	}, [packingList, packingListData, exportInvoiceId, formData.export_invoice_id]);

	// Ensure the current invoice is in availableInvoices even if not in the reference list
	useEffect(() => {
		if (formData.export_invoice_id && selectedInvoiceDetails && !availableInvoices.some(inv => inv.id === formData.export_invoice_id)) {
			setAvailableInvoices(prev => [
				...prev,
				{
					id: formData.export_invoice_id,
					invoice_no: selectedInvoiceDetails.invoice_no || selectedInvoiceDetails.invoiceNo || 'Current Invoice',
					client_name: selectedInvoiceDetails.client_name || selectedInvoiceDetails.clientName || ''
				}
			]);
		}
	}, [formData.export_invoice_id, selectedInvoiceDetails, availableInvoices]);

	// Self-healing effect: Auto-fetch full details whenever export_invoice_id is active but selectedInvoiceDetails is not loaded
	useEffect(() => {
		if (formData.export_invoice_id && (!selectedInvoiceDetails || selectedInvoiceDetails.id !== formData.export_invoice_id)) {
			fetchInvoiceDetails(formData.export_invoice_id);
		}
	}, [formData.export_invoice_id, selectedInvoiceDetails]);


	useEffect(() => {
		if (!exportInvoiceId) return;
		const loadFromExportInvoiceStatus = async () => {
			try {
				const resp = await api.get(`/export-documents/inherit/packing-list/${exportInvoiceId}`);
				const data = resp?.data?.data || {};
				if (data) {
					// mapInvoiceToPL handles normalization
					applyExportToForm(data);
					showAlertMessage('Data auto-fetched from Export Invoice!', 'success');
				}
			} catch (e) {
				console.warn('Could not load inherited packing list data:', e);
			}
		};
		loadFromExportInvoiceStatus();
	}, [exportInvoiceId]);

	// Fetch by packingListId if object not provided
	useEffect(() => {
		if (!packingListId || packingList || packingListData) return;
		const fetchPLById = async () => {
			try {
				const resp = await api.get(`/packing-lists/${packingListId}`);
				const data = resp?.data?.data || resp?.data;
				if (data) {
					applyExportToForm(data);
				}
			} catch (e) {
				console.error('Failed to fetch packing list by id:', e);
				showError('Failed to load packing list');
			}
		};
		fetchPLById();
	}, [packingListId]);


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
			// Standardized data parsing (handling both string and object formats)
			let productLinesRaw = dataToLoad.product_lines || dataToLoad.productLines || [];
			if (typeof productLinesRaw === 'string') {
				try { productLinesRaw = JSON.parse(productLinesRaw); } catch (e) { productLinesRaw = []; }
			}

			const normalizedProductLines = (Array.isArray(productLinesRaw) ? productLinesRaw : []).map(pl => {
					const totalBoxes = parseInt(pl.totalBoxes ?? pl.total_boxes ?? pl.boxes ?? pl.pieces ?? 0, 10) || 0;
					let boxWeight = parseFloat(pl.boxWeight ?? pl.box_weight ?? pl.weightPerSqm ?? pl.weight_per_sqm ?? pl.perBoxWeight ?? pl.per_box_weight ?? 0) || 0;
					const sqmAuto = parseFloat(pl.sqmAuto ?? pl.sqm_auto ?? pl.total_sqm ?? pl.totalSqm ?? 0) || 0;
					let sqm = parseFloat(pl.sqm_per_box ?? pl.sqmPerBox ?? pl.sqm ?? 0) || 0;
					const rate = parseFloat(pl.rate ?? pl.unit_price ?? 0) || 0;
					let netWeight = parseFloat(pl.netWeight ?? pl.net_weight ?? 0) || 0;

					// Auto compute net weight if missing
					if ((!netWeight || netWeight === 0) && boxWeight && totalBoxes) {
						netWeight = parseFloat((boxWeight * totalBoxes).toFixed(2));
					}
					// Auto compute box weight if missing
					if ((!boxWeight || boxWeight === 0) && netWeight > 0 && totalBoxes > 0) {
						boxWeight = parseFloat((netWeight / totalBoxes).toFixed(4));
					}
					// Auto compute sqm per box if missing
					if ((!sqm || sqm === 0) && sqmAuto > 0 && totalBoxes > 0) {
						sqm = parseFloat((sqmAuto / totalBoxes).toFixed(4));
					}

					const totalPallet = parseInt(pl.totalPallet ?? pl.total_pallet ?? pl.pallets ?? 0, 10) || 0;
					const grossWeight = parseFloat(parseFloat(pl.grossWeight ?? pl.gross_weight ?? 0).toFixed(2)) || parseFloat((netWeight + (totalPallet * 20)).toFixed(2));

					return {
						product: pl.product || pl.product_name || pl.name || pl.material_description || pl.materialDescription || '',
						size: pl.size || pl.dimensions || '',
						surface: pl.surface || pl.finish || '',
						hsnCode: pl.hsnCode || pl.hsn_code || pl.hsCode || pl.hs_code || '',
						totalPallet: parseInt(pl.totalPallet ?? pl.total_pallet ?? pl.pallets ?? 0, 10) || 0,
						totalBoxes,
						boxWeight,
						sqm,
						sqmAuto,
						rate,
						amount: parseFloat((sqmAuto * rate).toFixed(2)),
						netWeight,
						grossWeight,
						material_description: pl.material_description || pl.materialDescription || pl.description || ''
					};
				});
			const currentExpInvoiceId = dataToLoad.export_invoice_id || dataToLoad.exportInvoiceId || dataToLoad.pi_reference;

			setFormData(prev => ({
				...prev,
				id: dataToLoad.id,
				packing_list_no: dataToLoad.packing_list_no || dataToLoad.packingListNo || '',
				date: dataToLoad.date || dataToLoad.packing_list_date || new Date().toLocaleDateString('en-CA'),
				export_invoice_id: currentExpInvoiceId,
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
				buyers_order_date: formatInputDate(dataToLoad.buyers_order_date || dataToLoad.buyersOrderDate || ''),
				proforma_invoice_date: formatInputDate(dataToLoad.proforma_invoice_date || dataToLoad.proforma_date || dataToLoad.proformaInvoiceDate || ''),
				export_invoice_date: formatInputDate(dataToLoad.export_invoice_date || dataToLoad.invoice_date || dataToLoad.exportInvoiceDate || ''),
				lcNumber: dataToLoad.lc_number || dataToLoad.lcNumber || '',
				lcDate: dataToLoad.lc_date || dataToLoad.lcDate || '',
				epcgNo: dataToLoad.epcg_no || dataToLoad.epcgNo || '',
				container_details: dataToLoad.container_details || dataToLoad.containerDetails || [],
				ei_updated_at: dataToLoad.ei_updated_at || '',
				updated_at: dataToLoad.updated_at || ''
			}));

			// If we have an export invoice ID, fetch its full details to populate dependent fields
			if (currentExpInvoiceId) {
				fetchInvoiceDetails(currentExpInvoiceId);
			}

			showAlertMessage('Packing list loaded for editing', 'success');
		}
	}, [packingList, packingListData]);


	const applyExportToForm = (inv) => {
		if (!inv) return;

		const mapped = exportMapper.mapInvoiceToPL(inv);

		setFormData(prev => {
			const hasExistingProducts = prev.product_lines && prev.product_lines.length > 0;

			const isNewFromInvoice = !inv.packing_list_no && !inv.packingListNo;

			return {
				...prev,
				...mapped,
				packing_list_no: mapped.packing_list_no || prev.packing_list_no,
				id: prev.id || (isNewFromInvoice ? null : mapped.id),
				export_invoice_id: mapped.export_invoice_id || inv.export_invoice_id || inv.exportInvoiceId || (inv.invoice_no ? inv.id : prev.export_invoice_id),
				proforma_invoice_no: mapped.proforma_invoice_no || inv.proformaInvoiceNo || inv.proforma_invoice_no || '',
				proforma_invoice_id: mapped.proforma_invoice_id || inv.proforma_invoice_id || inv.proformaInvoiceId || '',
				// Ensure dates are correctly set even if mapper has slight mismatches
				proforma_invoice_date: formatInputDate(mapped.proforma_invoice_date || inv.proformaInvoiceDate || inv.proforma_date || inv.proformaDate || inv.pi_date || ''),
				export_invoice_date: formatInputDate(mapped.export_invoice_date || inv.invoice_date || inv.invoiceDate || inv.date || ''),
				lcNumber: mapped.lc_number || mapped.lcNumber || prev.lcNumber || '',
				lcDate: mapped.lc_date || mapped.lcDate || prev.lcDate || '',
				epcgNo: mapped.epcg_no || mapped.epcgNo || prev.epcgNo || '',
				// Only update product lines if we don't have them yet or if specifically forced
				...(!hasExistingProducts && {
					product_lines: mapped.product_lines,
					total_pallets: mapped.product_lines.reduce((s, l) => s + (l.totalPallet || 0), 0),
					total_boxes: mapped.product_lines.reduce((s, l) => s + (l.totalBoxes || 0), 0),
					total_sqm: mapped.product_lines.reduce((s, l) => s + (l.sqmAuto || 0), 0),
					total_weight: mapped.product_lines.reduce((s, l) => s + (l.netWeight || 0), 0),
					net_weight: mapped.product_lines.reduce((s, l) => s + (l.netWeight || 0), 0),
					gross_weight: mapped.product_lines.reduce((s, l) => s + (l.grossWeight || 0), 0),
					total_amount: mapped.product_lines.reduce((s, l) => s + (l.amount || 0), 0)
				})
			};
		});
	};


	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleProductChange = (index, field, value) => {
		const updated = [...formData.product_lines];
		updated[index] = { ...updated[index], [field]: value };

		const line = updated[index] || {};
		const totalBoxes = parseInt(line.totalBoxes || 0, 10) || 0;
		const boxWeight = parseFloat(line.boxWeight || 0) || 0;
		const sqmPerBox = parseFloat(line.sqm || 0) || 0;
		const totalPallet = parseInt(line.totalPallet || 0, 10) || 0;

		// Auto-compute SQM and Weights
		updated[index].sqmAuto = parseFloat((sqmPerBox * totalBoxes).toFixed(2));
		const computedNet = parseFloat((boxWeight * totalBoxes).toFixed(2));
		updated[index].netWeight = computedNet;
		updated[index].grossWeight = parseFloat((computedNet + (totalPallet * 20)).toFixed(2));

		// Recalculate Amount if rate exists
		if (updated[index].rate) {
			updated[index].amount = parseFloat((updated[index].sqmAuto * updated[index].rate).toFixed(2));
		}

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


	const isFormValid = () => {
		return formData.export_invoice_id && String(formData.export_invoice_id).trim().length > 0;
	};

	const validateForm = () => {
		const newErrors = {};
		if (!formData.export_invoice_id) newErrors.export_invoice_id = 'EXP Reference is required';
		if ((formData.product_lines?.length || 0) === 0) newErrors.product_lines = 'Product lines are required';
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			scrollToFirstError();
			showError('Please fill all required fields');
			return;
		}

		const dataToSave = {
			...formData,
			export_invoice_id: formData.export_invoice_id,
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
			} else if (formData.export_invoice_id) {
				await api.post(`/packing-lists/export-invoice/${formData.export_invoice_id}`, dataToSave);
				showSuccess('Packing list created successfully');
			} else {
				await api.post('/packing-lists', dataToSave);
				showSuccess('Packing list created successfully');
			}

			// Dispatch event for live update in dashboards
			window.dispatchEvent(new CustomEvent('packingList:changed'));

			// Call onSave if provided, otherwise just reset
			if (onSave) {
				onSave(dataToSave);
			} else if (onBack) {
				onBack();
			} else if (onCancel) {
				onCancel();
			}
		} catch (err) {
			console.error('Save error:', err);
			showError(err?.response?.data?.message || err?.message || 'Failed to save packing list');
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (onBack) {
			onBack();
		} else if (onCancel) {
			onCancel();
		}
	};

	const handleSyncPIData = async () => {
		if (!formData.export_invoice_id) return;
		try {
			setSaving(true);
			const resp = await api.get(`/export-invoices/${formData.export_invoice_id}`);
			const inv = resp?.data?.data || resp?.data;
			if (inv) {
				applyExportToForm(inv);
				setFormData(prev => ({ ...prev, ei_updated_at: inv.updated_at || prev.ei_updated_at }));
				showAlertMessage('Data auto-fetched from Export Invoice!', 'success');
			}
		} catch (e) {
			console.error('Sync failed:', e);
			showError('Failed to sync with latest PI data');
		} finally {
			setSaving(false);
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

	const piDataOutdated = formData.id && formData.ei_updated_at && formData.updated_at && new Date(formData.ei_updated_at) > new Date(formData.updated_at);

	return (
		<Container fluid className="py-4">
			<Form onSubmit={handleSubmit}>
				<div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 px-3">
					<div className="d-flex align-items-center">
						<Button variant="outline" onClick={handleCancel} className="me-3 p-2 bg-white shadow-sm border-0 rounded-3 text-primary" style={{ width: '45px', height: '45px' }}>
							<ArrowLeft size={20} />
						</Button>
						<div>
							<h4 className="mb-0 fw-bold">{formData.id ? 'Edit Packing List' : 'New Packing List'}</h4>
							<p className="text-muted small mb-0 fw-medium">Manage Packing List</p>
						</div>
					</div>
					<div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
						<Button variant="outline" onClick={handleCancel} className="shadow-sm px-4 fw-bold bg-white" style={{ height: '55px', borderRadius: '12px' }}>
							<X size={20} className="me-2" /> Cancel
						</Button>
						{formData.export_invoice_id && !isLocked && (
							<Button variant="info" onClick={handleSyncPIData} className="shadow-sm px-4 fw-bold text-white" style={{ height: '55px', borderRadius: '12px' }}>
								<RefreshCw size={20} className="me-2" /> Sync Latest PI Data
							</Button>
						)}
						<Button variant="primary" type="submit" disabled={saving || !isFormValid()} className="shadow-sm px-4 fw-bold" style={{ height: '55px', borderRadius: '12px', minWidth: '160px' }}>
							{saving ? <div className="spinner-border spinner-border-sm me-2" /> : <Save size={20} className="me-2" />}
							{saving ? 'Saving...' : `${formData.id ? 'Update' : 'Save'} Packing List`}
						</Button>
					</div>
				</div>

				{showAlert && (
					<Alert variant="primary" dismissible onClose={() => setShowAlert(false)} className="mb-4">
						{alertMessage}
					</Alert>
				)}

				{piDataOutdated && !isLocked && (
					<Alert variant="warning" className="mb-4 d-flex align-items-center fw-bold shadow-sm rounded-3">
						<Info size={20} className="me-2" />
						PI data has been updated. Please click "Sync Latest PI Data" to refresh connected documents.
					</Alert>
				)}

				<Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
					<Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
						<h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">Basic Information</h6>
					</Card.Header>
					<Card.Body>
						<Row className="g-4">
							<Col md={2}>
								<Form.Group>
									<OverlayTrigger placement="top" overlay={<Tooltip>EXP no. is mandatory.</Tooltip>}>
										<Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
											EXP no. * <Info size={12} className="ms-1" />
										</Form.Label>
									</OverlayTrigger>
									<Form.Select
										className="bg-light border-0 py-2 px-3 fw-bold text-primary"
										style={{ borderRadius: '10px', height: '48px' }}
										name="export_invoice_id"
										value={formData.export_invoice_id}
										onChange={(e) => {
											const val = e.target.value;
											setFormData(prev => ({ ...prev, export_invoice_id: val }));
											fetchInvoiceDetails(val);
										}}
										required
									>
										<option value="">Select Export Invoice</option>
										{availableInvoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNo || inv.invoice_no}</option>)}
									</Form.Select>
								</Form.Group>
							</Col>
							<Col md={2}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">PI no.:</Form.Label>
									<div
										title={formData.proforma_invoice_no}
										className="form-control bg-light border-0 py-2 px-3 fw-bold text-dark d-flex align-items-center"
										style={{ borderRadius: '10px', minHeight: '48px', height: 'auto', wordBreak: 'break-word', whiteSpace: 'normal' }}
									>
										{formData.proforma_invoice_no || '-'}
									</div>
								</Form.Group>
							</Col>
							<Col md={2}>
								<Form.Group>
									<Form.Label className="fw-bold small text-dark mb-2 text-uppercase tracking-wider">Packing List No:</Form.Label>
									<Form.Control
										type="text"
										value={formData.packing_list_no}
										readOnly
										className="bg-light border-0 py-2 px-3 fw-bold text-dark read-only-inherited"
										style={{ borderRadius: '10px', height: '48px' }}
										placeholder="Auto-generated"
									/>
								</Form.Group>
							</Col>
							<Col md={3}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Proforma Invoice Date:</Form.Label>
									<div
										title={formatDisplayDates(formData.proforma_invoice_date)}
										className="form-control bg-light border-0 py-2 px-3 fw-bold text-dark d-flex align-items-center"
										style={{ borderRadius: '10px', minHeight: '48px', height: 'auto', wordBreak: 'break-word', whiteSpace: 'normal' }}
									>
										{formatDisplayDates(formData.proforma_invoice_date) || '-'}
									</div>
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
							<Col md={3}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Origin:</Form.Label>
									<Form.Control
										type="text"
										value={formData.country_of_origin || 'INDIA'}
										readOnly
										className="bg-light border-0 py-2 px-3 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
						</Row>
					</Card.Body>
				</Card>


				{/* --- SHIPPING & TRANSPORT DETAILS (READ-ONLY) --- */}
				<Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-4 border-primary">
					<Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
						<Ship className="me-2 text-white" size={18} />
						<h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">Shipping & Transport Details</h6>
					</Card.Header>
					<Card.Body className="p-4">
						<Row className="g-4">
							<Col md={6}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Payment Terms</Form.Label>
									<Form.Control
										type="text"
										value={formData.payment_terms}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
							<Col md={6}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Delivery Terms</Form.Label>
									<Form.Control
										type="text"
										value={formData.delivery_terms}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
						</Row>

						<Row className="g-4 mt-1">
							<Col md={4}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Port of Loading</Form.Label>
									<Form.Control
										type="text"
										value={formData.port_of_loading}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
							<Col md={4}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Port of Discharge</Form.Label>
									<Form.Control
										type="text"
										value={formData.port_of_discharge}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
							<Col md={4}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Final Destination</Form.Label>
									<Form.Control
										type="text"
										value={formData.final_destination}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
						</Row>

						<Row className="g-4 mt-1">
							<Col md={3}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Pre-Carriage By</Form.Label>
									<Form.Control
										type="text"
										value={formData.pre_carriage_by}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
							<Col md={3}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Vessel / Flight No.</Form.Label>
									<Form.Control
										type="text"
										value={formData.vessel_flight_no}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
						</Row>

						<Row className="g-4 mt-1">
							<Col md={6}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase">Consignee Details</Form.Label>
									<Form.Control as="textarea" rows={4} value={formData.consignee_details} readOnly className="bg-light border-0 py-2 px-3 text-dark" style={{ borderRadius: '10px' }} />
								</Form.Group>
							</Col>
							<Col md={6}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase">Buyer Details</Form.Label>
									<Form.Control as="textarea" rows={4} value={formData.buyer_details} readOnly className="bg-light border-0 py-2 px-3 text-dark" style={{ borderRadius: '10px' }} />
								</Form.Group>
							</Col>
						</Row>
					</Card.Body>
				</Card>

				{/* --- PRODUCT INFORMATION (READ-ONLY) --- */}
				<Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-4 border-primary">
					<Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
						<h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">PRODUCT DETAILS</h6>
					</Card.Header>
					<Card.Body className="p-0">
						<div className="table-responsive ">
							<Table hover className="mb-0 align-middle">
								<thead className="bg-light small text-uppercase fw-bold">
									<tr>
										<th style={{ width: '50px' }}>SR.</th>
										<th style={{ minWidth: '200px' }}>MATERIAL DESCRIPTION</th>
										<th className="text-center">PALLETS</th>
										<th className="text-center">QTY (BOXES)</th>
										<th className="text-center text-primary">BOX WT (KG)</th>
										<th className="text-center">SQM/BOX</th>
										<th className="text-center text-primary">TOTAL (SQM)</th>
										<th className="text-center text-danger">NET WT (KG)</th>
										<th className="text-center text-danger">GROSS WT (KG)</th>
									</tr>
								</thead>
								<tbody>
									{(formData.product_lines?.length || 0) === 0 ? (
										<tr><td colSpan="8" className="text-center py-4 text-muted small">No product lines inherited from Export Invoice.</td></tr>
									) : (
										formData.product_lines.map((product, index) => (
											<tr key={index}>
												<td data-label="SR." className="text-center text-muted small">{index + 1}</td>
												<td data-label="MATERIAL DESCRIPTION" className="py-2 px-3 align-middle" style={{ minWidth: '250px' }}>
													<div className="fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '13px' }}>{product.product}</div>
													<Form.Control
														as="textarea"
														rows={2}
														value={product.material_description || ''}
														readOnly
														className="form-control-sm bg-light border-0 shadow-none"
														style={{ fontSize: '11px', resize: 'none' }}
													/>
												</td>
												<td data-label="PALLETS" className="text-center align-middle">
													<Form.Control
														type="number"
														value={product.totalPallet}
														readOnly
														className="form-control-sm text-center bg-light border-0 fw-bold mx-auto"
														style={{ maxWidth: '80px' }}
													/>
												</td>
												<td data-label="QTY (BOXES)" className="text-center align-middle">
													<Form.Control
														type="number"
														value={product.totalBoxes}
														readOnly
														className="form-control-sm text-center bg-light border-0 fw-bold text-primary mx-auto"
														style={{ maxWidth: '90px' }}
													/>
												</td>
												<td data-label="BOX WT (KG)" className="text-center align-middle">
													<Form.Control
														type="number"
														step="0.01"
														value={product.boxWeight}
														readOnly
														className="form-control-sm text-center bg-light border-0 text-primary mx-auto"
														style={{ maxWidth: '80px' }}
													/>
												</td>
												<td data-label="SQM/BOX" className="text-center align-middle">
													<Form.Control
														type="text"
														value={product.product_type === 'sanitaryware' || product.productType === 'sanitaryware' ? '-' : product.sqm}
														readOnly
														className="form-control-sm text-center bg-light border-0 mx-auto"
														style={{ maxWidth: '80px' }}
													/>
												</td>
												<td data-label="TOTAL (SQM)" className="text-center text-primary fw-bold align-middle" style={{ fontSize: '14px' }}>
													{product.product_type === 'sanitaryware' || product.productType === 'sanitaryware' ? '-' : (product.sqmAuto || 0).toFixed(2)}
												</td>
												<td data-label="NET WT (KG)" className="text-center text-danger align-middle fw-medium" style={{ fontSize: '14px' }}>{(product.netWeight || 0).toLocaleString()}</td>
												<td data-label="GROSS WT (KG)" className="text-center text-danger fw-bold align-middle" style={{ fontSize: '14px' }}>{(product.grossWeight || 0).toLocaleString()}</td>
											</tr>
										))
									)}
								</tbody>
								<tfoot className="bg-light fw-bold">
									<tr>
										<td data-label="" colSpan={2} className="text-end pe-3" style={{ fontSize: '14px' }}>TOTAL</td>
										<td data-label="TOTAL PALLETS" className="text-center" style={{ fontSize: '14px' }}>{formData.total_pallets}</td>
										<td data-label="TOTAL QTY (BOXES)" className="text-center" style={{ fontSize: '14px' }}>{formData.total_boxes}</td>
										<td data-label="TOTAL BOX WT (KG)" className="text-center text-primary" style={{ fontSize: '14px' }}></td>
										<td data-label="TOTAL QTY (SQM)" className="text-center" style={{ fontSize: '14px' }}></td>
										<td data-label="TOTAL (SQM)" className="text-center text-primary" style={{ fontSize: '14px' }}>{(formData.total_sqm || 0).toFixed(2)}</td>
										<td data-label="TOTAL NET WT (KG)" className="text-center text-danger" style={{ fontSize: '14px' }}>{(formData.total_weight || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
										<td data-label="TOTAL GROSS WT (KG)" className="text-center text-danger" style={{ fontSize: '14px' }}>{(formData.gross_weight || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
									</tr>
								</tfoot>
							</Table>
						</div>

						{/* Mobile View: Product Cards */}
						<div className="d-block d-lg-none p-3 bg-light bg-opacity-50">
							{formData.product_lines && formData.product_lines.length > 0 ? (
								<>
									{formData.product_lines.map((product, index) => (
										<Card key={index} className="mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
											<Card.Header className="bg-white py-3 px-3 border-bottom d-flex align-items-center">
												<div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
													<Package size={18} className="text-primary" />
												</div>
												<span className="fw-bold text-dark text-uppercase tracking-wider">Item #{index + 1}</span>
											</Card.Header>
											<Card.Body className="p-3">
												<div className="mb-4">
													<label className="fw-bold small text-secondary text-uppercase mb-2 d-block tracking-wider">Material Description & HSN</label>
													<span className="fw-bold text-dark fs-6 d-block mb-1">{product.product}</span>
													{product.hsnCode && <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-2 py-1">{product.hsnCode || product.hsn_code}</span>}
												</div>

												<Row className="g-3 mb-4">
													<Col xs={4}>
														<div className="p-2 bg-light rounded-3 border text-center">
															<small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '9px', fontWeight: '800' }}>Pallets</small>
															<span className="fw-bold">{product.totalPallet}</span>
														</div>
													</Col>
													<Col xs={4}>
														<div className="p-2 bg-light rounded-3 border text-center">
															<small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '9px', fontWeight: '800' }}>Boxes</small>
															<span className="fw-bold">{product.totalBoxes}</span>
														</div>
													</Col>
													<Col xs={4}>
														<div className="p-2 bg-light rounded-3 border text-center">
															<small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '9px', fontWeight: '800' }}>Box Wt</small>
															<span className="fw-bold">{(product.boxWeight || 0).toFixed(1)}</span>
														</div>
													</Col>
												</Row>

												<div className="p-3 bg-primary bg-opacity-10 rounded-4 border border-primary border-opacity-10 mb-4 shadow-sm">
													<Row className="g-2 align-items-center">
														<Col xs={6}>
															<small className="text-primary fw-bold text-uppercase d-block" style={{ fontSize: '10px' }}>SQM/Box</small>
															<span className="fw-bold text-dark">
																{product.product_type === 'sanitaryware' || product.productType === 'sanitaryware' ? '-' : (product.sqm || 0).toFixed(4)}
															</span>
														</Col>
														<Col xs={6} className="text-end">
															<small className="text-primary fw-bold text-uppercase d-block" style={{ fontSize: '10px' }}>Total SQM</small>
															<span className="fw-bold text-primary fs-5">
																{product.product_type === 'sanitaryware' || product.productType === 'sanitaryware' ? '-' : (product.sqmAuto || 0).toFixed(2)}
															</span>
														</Col>
													</Row>
												</div>

												<div className="d-flex gap-2">
													<div className="flex-grow-1 bg-white border rounded-3 p-2 text-center shadow-sm">
														<small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Net Wt</small>
														<span className="fw-bold text-danger">{(product.netWeight || 0).toLocaleString()} <small>kg</small></span>
													</div>
													<div className="flex-grow-1 bg-white border rounded-3 p-2 text-center shadow-sm">
														<small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Gross Wt</small>
														<span className="fw-bold text-danger">{(product.grossWeight || 0).toLocaleString()} <small>kg</small></span>
													</div>
												</div>
											</Card.Body>
										</Card>
									))}

									{/* Mobile Summary Card */}
									<Card className="border-0 shadow-sm rounded-4 mb-4 bg-primary text-white overflow-hidden">
										<div className="p-3 bg-white bg-opacity-10 border-bottom border-white border-opacity-20">
											<h6 className="fw-bold mb-0 text-uppercase small tracking-widest">PACKING TOTALS SUMMARY</h6>
										</div>
										<Card.Body className="p-4">
											<Row className="g-3 mb-4">
												<Col xs={6}>
													<div className="bg-white bg-opacity-10 p-2 rounded-3">
														<small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Total Pallets</small>
														<span className="fw-bold fs-5">{formData.total_pallets}</span>
													</div>
												</Col>
												<Col xs={6}>
													<div className="bg-white bg-opacity-10 p-2 rounded-3">
														<small className="d-block opacity-75 text-uppercase" style={{ fontSize: '9px' }}>Total Boxes</small>
														<span className="fw-bold fs-5">{formData.total_boxes}</span>
													</div>
												</Col>
											</Row>

											<div className="d-flex justify-content-between align-items-center mb-3">
												<span className="opacity-75 text-uppercase" style={{ fontSize: '11px' }}>Total SQM:</span>
												<span className="fw-bold fs-6">{(formData.total_sqm || 0).toFixed(2)} m²</span>
											</div>

											<div className="mt-4 pt-4 border-top border-white border-opacity-20">
												<Row className="g-3">
													<Col xs={6}>
														<small className="d-block opacity-75 text-uppercase mb-1" style={{ fontSize: '9px' }}>Total Net Weight</small>
														<h5 className="mb-0 fw-bold">{(formData.net_weight || 0).toLocaleString()} kg</h5>
													</Col>
													<Col xs={6} className="text-end">
														<small className="d-block opacity-75 text-uppercase mb-1" style={{ fontSize: '9px' }}>Total Gross Weight</small>
														<h5 className="mb-0 fw-bold">{(formData.gross_weight || 0).toLocaleString()} kg</h5>
													</Col>
												</Row>
											</div>
										</Card.Body>
									</Card>
								</>
							) : (
								<div className="text-center py-5 bg-white rounded-4 border shadow-sm mx-2">
									<Package size={48} className="text-muted opacity-25 mb-3" />
									<p className="text-muted mb-0 fw-medium">No product lines found.</p>
								</div>
							)}
						</div>
					</Card.Body>
				</Card>

				{/* --- PACKING DETAILS (READ-ONLY) --- */}
				<Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-4 border-primary">
					<Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
						<FileText className="me-2 text-white" size={18} />
						<h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">Packing Instructions</h6>
					</Card.Header>
					<Card.Body className="p-4">
						<Row className="g-4">
							<Col md={3}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase">Pallet Type</Form.Label>
									<Form.Control type="text" value={formData.pallet_type} readOnly className="bg-light border-0 py-2 px-3 text-dark" style={{ borderRadius: '10px' }} />
								</Form.Group>
							</Col>
							<Col md={3}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Tariff Code</Form.Label>
									<Form.Control
										type="text"
										value={formData.tariff_code}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>

							<Col md={6}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Tiles Back Marking</Form.Label>
									<Form.Control
										type="text"
										value={formData.tiles_back}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
							<Col md={6}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Boxes Marking</Form.Label>
									<Form.Control
										type="text"
										value={formData.boxes_marking}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
						</Row>
						<Row className="g-4 mt-3">
							<Col md={4}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Box Type</Form.Label>
									<div className="d-flex align-items-center">
										{formData.box_type && masterData?.boxTypeObjects?.find(b => (b.value || b) === formData.box_type)?.imageUrl && (
											<div className="me-2 rounded border p-1 bg-white" style={{ width: '40px', height: '40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
												<img 
													src={masterData.boxTypeObjects.find(b => (b.value || b) === formData.box_type).imageUrl} 
													alt="Box Type" 
													style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
												/>
											</div>
										)}
										<Form.Control
											type="text"
											value={formData.box_type}
											readOnly
											className="form-control py-2 px-3 bg-light border-0 fw-bold"
											style={{ borderRadius: '10px', height: '48px' }}
										/>
									</div>
								</Form.Group>
							</Col>
							<Col md={4}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Fumigation</Form.Label>
									<Form.Control
										type="text"
										value={formData.fumigation}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
							<Col md={4}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">Legalisation</Form.Label>
									<Form.Control
										type="text"
										value={formData.legalisation}
										readOnly
										className="form-control py-2 px-3 bg-light border-0 fw-bold"
										style={{ borderRadius: '10px', height: '48px' }}
									/>
								</Form.Group>
							</Col>
						</Row>

					</Card.Body>
				</Card>


				
          {/* LC & EPCG DETAILS */}
          <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Body className="p-4 p-md-5">
              <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3">
                  <i className="bi bi-card-text fs-5"></i>
                </div>
                <h5 className="mb-0 fw-bold text-dark">LC & EPCG Details</h5>
              </div>
              <Row className="g-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                      LC Number
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter LC Number"
                      value={formData.lcNumber || ''}
                      disabled={true}
                      className="bg-light border-0 py-2 px-3 fw-bold"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                      LC Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.lcDate || ''}
                      disabled={true}
                      className="bg-light border-0 py-2 px-3 fw-bold"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                      EPCG No.
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter EPCG No."
                      value={formData.epcgNo || ''}
                      disabled={true}
                      className="bg-light border-0 py-2 px-3 fw-bold"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

        {/* --- STATUS --- */}
				<Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-5 border-info">
					<Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
						<h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">Status</h6>
					</Card.Header>
					<Card.Body className="p-4">
						<Row>
							<Col md={4}>
								<Form.Group>
									<Form.Label className="fw-bold small text-secondary mb-2 text-uppercase">Packing List Status</Form.Label>
									<Form.Select name="status" value={formData.status} onChange={handleChange} className="bg-light border-0 py-2 px-3 fw-bold text-primary" style={{ borderRadius: '10px' }}>
										<option value="Pending">Pending</option>
										<option value="Completed">Completed</option>
										<option value="Draft">Draft</option>
									</Form.Select>
								</Form.Group>
							</Col>
						</Row>
					</Card.Body>
				</Card>

				{/* Activity History Section */}
				{formData.id && (
					<Card className="audit-history-card mt-4 mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
						<Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
							<History className="me-2 text-white" size={18} />
							<h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">Activity History</h6>
						</Card.Header>
						<Card.Body className="p-0">
							<ModuleAuditLog resourceType="packing_list" resourceId={formData.id} />
						</Card.Body>
					</Card>
				)}

				{/* Bottom Actions Container */}
				<div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
					<Button variant="outline" onClick={handleCancel} className="shadow-sm px-4 fw-bold" style={{ height: '55px', borderRadius: '12px' }}>
						<X size={20} className="me-2" /> Cancel
					</Button>
					<Button variant="primary" type="submit" disabled={saving || !isFormValid()} className="shadow-sm px-4 fw-bold" style={{ height: '55px', borderRadius: '12px', minWidth: '160px', opacity: !isFormValid() ? 0.65 : 1, cursor: !isFormValid() ? 'not-allowed' : 'pointer' }}>
						{saving ? <div className="spinner-border spinner-border-sm me-2" /> : <Save size={20} className="me-2" />}
						{saving ? 'Saving...' : `${formData.id ? 'Update' : 'Save'} Packing List`}
					</Button>
				</div>
			</Form>
		</Container>
	);
}

export default PackingListForm;

