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

import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Table, Spinner, InputGroup, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Save, X, Plus, Trash2, ArrowLeft, FileText, ChevronRight, ChevronDown, ChevronUp, Truck, FileCheck, Scale, Ship, CreditCard, Info, History, Package, Hash, Search, Gift } from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../shared/NotificationManager.jsx';
import ConfirmationModal from '../../shared/ConfirmationModal.jsx';
import Button from '../../shared/Button.jsx';
import HelpTooltip from '../../shared/HelpTooltip.jsx';
import DynamicDropdown from '../../shared/DynamicDropdown.jsx';
import AddableDropdown from '../../shared/AddableDropdown.jsx';
import api from '../../../services/api';
import { transformKeysToSnake } from '../../../utils/dataTransformer';
import { useProducts } from '../../../hooks/useProducts';
import sanitarywareProductService from '../../../services/sanitarywareProductService';
import { transformSnakeToCamelKeys } from '../../../utils/helpers';
import { formatDisplayDate } from '../../../utils/formatters';
import { useDocumentNumber } from '../../../hooks/useDocumentNumber';
import ModuleAuditLog from '../../shared/ModuleAuditLog.jsx';
import { scrollToFirstError } from '../../../utils/validationUIHelper.js';


function ExportInvoiceForm({ invoice, invoiceId, onSave, onCancel, onBack, proformaInvoices, proformaId, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsLocked] = useState(false);
  const [tcInput, setTcInput] = useState('');
  const [tcOpen, setTcOpen] = useState(false);
  const { getNextExportInvoiceNumber } = useDocumentNumber();
  const [formData, setFormData] = useState({
    invoice_no: '',
    invoice_date: new Date().toLocaleDateString('en-CA'),
    proforma_invoice_id: '',
    proforma_invoice_no: '',
    proforma_date: '',
    client_name: '',
    country: '',
    consignee_details: '',
    buyer_details: '',
    payment_terms: '',
    delivery_terms: '',
    port_of_loading: '',
    port_of_discharge: '',
    final_destination: '',
    tariff_code: '',
    product_lines: [],
    pallets: 0,
    total_sqm: 0,
    total_amount: 0,
    pallet_type: '',
    tiles_back: '',
    boxes_marking: '',
    box_type: '',
    fumigation: '',
    legalisation: '',
    other_instructions: '',
    bl_no: '',
    bl_date: '',
    shipping_bill_no: '',
    shipping_bill_date: '',
    lut_bond_ref: '',
    pre_carriage_by: '',
    vessel_flight_no: '',
    place_of_receipt: '',
    net_weight: 0,
    gross_weight: 0,
    buyers_order_no: '',
    buyers_order_date: '',
    booking_no: '',
    status: 'Draft',
    currency: 'USD',
    exchange_rate: 1,
    lut_date: '',
    is_locked: false,
    country_of_origin: 'INDIA',
    iec_no: '',
    supply_declaration: 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND',
    ftp_incentive_declaration: '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"',
  });

  const isFormLocked = formData.status === 'Finalized' || formData.status === 'Dispatched' || formData.is_locked;

  // compute derived totals whenever the lines change
  useEffect(() => {
    if (!Array.isArray(formData.product_lines)) return;
    const totals = formData.product_lines.reduce(
      (acc, line) => {
        const boxes = parseFloat(line.totalBoxes || line.pieces || 0) || 0;
        const weightPerSqm = parseFloat(line.weightPerSqm || line.perBoxWeight || line.boxWeight || line.box_weight || 0) || 0;
        const sqmPerUnit = parseFloat(line.sqm || 0) || 0;
        const isSanitaryware = line.product_type === 'sanitaryware' || line.productType === 'sanitaryware';
        const totalLineSqm = isSanitaryware ? 0 : (boxes * sqmPerUnit);
        const rate = parseFloat(line.rate || 0) || 0;
        const isFoc = !!line.isFoc;

        // FORMULA: AMOUNT = TOTAL SQM × RATE (USD) or BOXES * RATE for sanitaryware
        const amount = isFoc ? 0 : (isSanitaryware ? (boxes * rate) : (totalLineSqm * rate));
        // FORMULA: NET WT (KG) = QTY (BOXES) × BOX WT (KG)
        const netWeight = boxes * weightPerSqm;
        const pallets = parseFloat(line.totalPallet || line.pallets || 0) || 0;
        // FORMULA: GROSS WT (KG) = NET WT (KG) + PALLETS * 20
        const grossWeight = netWeight + (pallets * 20);

        acc.pallets += pallets;
        acc.sqm += totalLineSqm;
        acc.amount += amount;
        acc.netWeight += netWeight;
        acc.grossWeight += grossWeight;
        return acc;
      },
      { pallets: 0, sqm: 0, amount: 0, netWeight: 0, grossWeight: 0 }
    );

    setFormData((prev) => ({
      ...prev,
      pallets: totals.pallets,
      total_sqm: parseFloat(totals.sqm.toFixed(2)),
      total_amount: parseFloat(totals.amount.toFixed(2)),
      net_weight: parseFloat(totals.netWeight.toFixed(2)),
      gross_weight: parseFloat(totals.grossWeight.toFixed(2)),
    }));
  }, [formData.product_lines]);


  const [proformaList, setProformaList] = useState(proformaInvoices || []);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, index: null, name: '' });

  const [selectedProformaIds, setSelectedProformaIds] = useState([]);
  const [proformaSearch, setProformaSearch] = useState('');
  const [showProformaDropdown, setShowProformaDropdown] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProformaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // load available products so that dropdowns in product line table show values
  const productsHook = useProducts();
  const { products = [], loading: productsLoading, error: productsError } = productsHook;

  const [masterData, setMasterData] = useState({
    palletTypes: [],
    tilesBack: [],
    boxesMarking: [],
    boxTypes: [],
    tariffCodes: [],
    portsOfDischarge: [],
    paymentTerms: [],
    deliveryTerms: []
  });

  // Fetch master data on component mount
  useEffect(() => {
    const fetchProformaInvoices = async () => {
      try {
        const res = await api.get('/proforma-invoices?status=Approved&unused=true&exclude_revised=true&limit=1000');
        setProformaList(res.data?.data?.items || res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch proforma invoices:', err);
      }
    };
    fetchProformaInvoices();

    const fetchMasterData = async () => {
      try {
        const [palletTypes, tilesBack, boxesMarking, boxTypes, tariffCodes, portsOfDischarge, paymentTerms, deliveryTerms] = await Promise.all([
          api.get('/master-data/palletTypes').then(r => r.data.data),
          api.get('/master-data/tilesBack').then(r => r.data.data),
          api.get('/master-data/boxesMarking').then(r => r.data.data),
          api.get('/master-data/boxTypes').then(r => r.data.data),
          api.get('/master-data/tariffCodes').then(r => r.data.data),
          api.get('/master-data/portsOfDischarge').then(r => r.data.data),
          api.get('/master-data/paymentTerms').then(r => r.data.data),
          api.get('/master-data/deliveryTerms').then(r => r.data.data)
        ]);

        setMasterData({
          palletTypes: Array.isArray(palletTypes) ? palletTypes.map(v => (v && (v.value || v)) || '') : [],
          tilesBack: Array.isArray(tilesBack) ? tilesBack.map(v => (v && (v.value || v)) || '') : [],
          boxesMarking: Array.isArray(boxesMarking) ? boxesMarking.map(v => (v && (v.value || v)) || '') : [],
          boxTypes: Array.isArray(boxTypes) ? boxTypes.map(v => (v && (v.value || v)) || '') : [],
          boxTypeObjects: Array.isArray(boxTypes) ? boxTypes : [],
          tariffCodes: Array.isArray(tariffCodes) ? tariffCodes.map(v => (v && (v.value || v)) || '') : [],
          portsOfDischarge: Array.isArray(portsOfDischarge) ? portsOfDischarge.map(v => (v && (v.portName || v.value || v)) || '') : [],
          paymentTerms: Array.isArray(paymentTerms) ? paymentTerms.map(v => (v && (v.value || v)) || '') : [],
          deliveryTerms: Array.isArray(deliveryTerms) ? deliveryTerms.map(v => (v && (v.value || v)) || '') : []
        });
      } catch (err) {
        console.error('Failed to fetch master data in ExportInvoiceForm:', err);
      }
    };
    fetchMasterData();
  }, []);

  const [swProducts, setSwProducts] = useState([]);
  const [swLoading, setSwLoading] = useState(false);
  useEffect(() => {
    const fetchSwProducts = async () => {
      setSwLoading(true);
      try {
        const swResponse = await sanitarywareProductService.getProducts();
        setSwProducts(Array.isArray(swResponse) ? swResponse : []);
      } catch (swErr) {
        console.error('Error fetching sanitaryware products in ExportInvoiceForm:', swErr);
      } finally {
        setSwLoading(false);
      }
    };
    fetchSwProducts();
  }, []);

  const normalizeDates = (data) => {
    const dateFieldPairs = [
      ['proforma_date', 'proformaDate'],
      ['invoice_date', 'invoiceDate'],
      ['bl_date', 'blDate'],
      ['buyers_order_date', 'buyersOrderDate'],
      ['shipping_bill_date', 'shippingBillDate'],
      ['lut_date', 'lutDate'],
    ];

    const normalized = { ...data };
    dateFieldPairs.forEach(([snake, camel]) => {
      [snake, camel].forEach((field) => {
        const val = normalized[field];
        if (val) {
          try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              normalized[field] = d.toLocaleDateString('en-CA');
            }
          } catch (e) {
            // Keep original value if parsing fails
          }
        }
      });
    });
    return normalized;
  };

  const normalizeNumericFields = (data) => {
    const numericFields = [
      'pallets', 'total_sqm', 'total_amount', 'net_weight', 'gross_weight',
      'exchange_rate'
    ];
    const normalized = { ...data };
    numericFields.forEach(field => {
      if (normalized[field] !== undefined && normalized[field] !== null) {
        normalized[field] = parseFloat(normalized[field]) || 0;
      }
    });
    if (Array.isArray(normalized.product_lines)) {
      normalized.product_lines = normalized.product_lines.map(line => ({
        ...line,
        pallets: parseFloat(line.pallets) || 0,
        totalPallet: parseFloat(line.totalPallet) || 0,
        bigPallet: parseFloat(line.bigPallet) || 0,
        kathaliPallet: parseFloat(line.kathaliPallet) || 0,
        boxesPerBigPallet: parseFloat(line.boxesPerBigPallet) || 0,
        boxesPerKathali: parseFloat(line.boxesPerKathali) || 0,
        totalBoxes: parseFloat(line.totalBoxes || line.pieces || 0) || 0,
        pieces: parseFloat(line.pieces || line.totalBoxes || 0) || 0,
        sqm: parseFloat(line.sqm) || 0,
        sqmAuto: parseFloat(line.sqmAuto) || 0,
        rate: parseFloat(line.rate) || 0,
        amount: parseFloat(line.amount) || 0,
        perBoxWeight: parseFloat(line.perBoxWeight || line.weightPerSqm || line.boxWeight || line.box_weight || 0) || 0,
        netWeight: parseFloat(line.netWeight) || 0,
        perPalletWeight: parseFloat(line.perPalletWeight) || 0,
        grossWeight: parseFloat(line.grossWeight) || 0,
        weightPerSqm: parseFloat(line.weightPerSqm || line.perBoxWeight || line.boxWeight || line.box_weight || 0) || 0,
        boxWeight: parseFloat(line.boxWeight || line.box_weight || line.weightPerSqm || line.perBoxWeight || 0) || 0,
        packingWtPerBox: parseFloat(line.packingWtPerBox) || 1,
      }));
    }
    return normalized;
  };

  const normalizeStringFields = (data) => {
    const normalized = { ...data };
    Object.keys(normalized).forEach(key => {
      if (typeof normalized[key] === 'object' && normalized[key] === null) {
        normalized[key] = '';
      }
    });
    return normalized;
  };

  const mapAndNormalizeProductLine = (line, localProducts, localSwProducts) => {
    const camelLine = transformSnakeToCamelKeys(line);
    const allProducts = [...localProducts, ...localSwProducts];
    const productMaster = allProducts.find(p => p && p.name === (camelLine.product || camelLine.productName));

    // Determine if it is a sanitaryware product
    const isSw = localSwProducts.some(p => p && p.name === (camelLine.product || camelLine.productName)) ||
      (productMaster && (productMaster.productType === 'sanitaryware' || productMaster.product_type === 'sanitaryware'));

    camelLine.productType = isSw ? 'sanitaryware' : 'tile';
    camelLine.product_type = camelLine.productType;

    if (productMaster) {
      if (!camelLine.description && productMaster.description) camelLine.description = productMaster.description;
      if (!camelLine.description && (camelLine.materialDescription || camelLine.material_description)) {
        camelLine.description = camelLine.materialDescription || camelLine.material_description;
      }
      if (!camelLine.size && (productMaster.size || productMaster.dimensions)) camelLine.size = productMaster.size || productMaster.dimensions;
      if (!camelLine.surface && (productMaster.surface || productMaster.finish)) camelLine.surface = productMaster.surface || productMaster.finish;

      if ((!camelLine.sqm || parseFloat(camelLine.sqm || 0) === 0) && (productMaster.sqmPerBox || productMaster.sqm || productMaster.sqm_per_box)) {
        camelLine.sqm = parseFloat(productMaster.sqmPerBox || productMaster.sqm || productMaster.sqm_per_box || 0);
      }
      if ((!camelLine.weightPerSqm || parseFloat(camelLine.weightPerSqm || 0) === 0) && (productMaster.weightPerSqm || productMaster.perBoxWeight || productMaster.weight_per_sqm || productMaster.boxWeight || productMaster.box_weight)) {
        camelLine.weightPerSqm = parseFloat(productMaster.weightPerSqm || productMaster.perBoxWeight || productMaster.weight_per_sqm || productMaster.boxWeight || productMaster.box_weight || 0);
      }

      // Sanitaryware specifications mapping
      if (isSw) {
        camelLine.sanitarywareProductId = productMaster.id || productMaster.sanitaryware_product_id || null;
        camelLine.sanitaryware_product_id = camelLine.sanitarywareProductId;
        camelLine.modelNo = productMaster.itemRef || productMaster.item_ref || productMaster.model_no || '';
        camelLine.model_no = camelLine.modelNo;
        camelLine.category = productMaster.category || '';
        camelLine.color = productMaster.color || '';
      }

      // Auto-fetch HSN code from master if missing
      const currentHsn = camelLine.hsnCode || camelLine.hsn_code || camelLine.hsCode || camelLine.hs_code;
      if (!currentHsn) {
        const masterHsn = productMaster.hsnCode || productMaster.hsn_code || productMaster.hsCode || productMaster.hs_code || productMaster.tariffCode || productMaster.tariff_code || '';
        camelLine.hsnCode = masterHsn;
        camelLine.hsn_code = masterHsn;
        camelLine.hsCode = masterHsn;
        camelLine.hs_code = masterHsn;
      }
    }

    // Standardize weight fallbacks
    const boxWeight = parseFloat(camelLine.weightPerSqm || camelLine.perBoxWeight || camelLine.boxWeight || camelLine.box_weight || 0);
    camelLine.weightPerSqm = boxWeight;
    camelLine.perBoxWeight = boxWeight;
    camelLine.boxWeight = boxWeight;
    camelLine.box_weight = boxWeight;

    return camelLine;
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Fetch fresh products master list to ensure lookups succeed
        let localSwProducts = [];
        let localTileProducts = [];
        try {
          const swResponse = await sanitarywareProductService.getProducts();
          localSwProducts = Array.isArray(swResponse) ? swResponse : [];
          setSwProducts(localSwProducts);
        } catch (swErr) {
          console.error('Error loading swProducts in init:', swErr);
        }
        try {
          const prodResponse = await api.get('/products?limit=1000');
          localTileProducts = prodResponse.data?.data?.data || prodResponse.data?.data || prodResponse.data || [];
        } catch (pErr) {
          console.error('Error loading products in init:', pErr);
        }

        const plRes = await api.get('/proforma-invoices?status=Approved&unused=true&exclude_revised=true&limit=1000');
        const rawList = plRes.data?.data?.items || plRes.data?.data?.data || plRes.data?.data || [];
        // Safety filter: exclude any Revised (historical) records from the dropdown
        const activeList = (Array.isArray(rawList) ? rawList : []).filter(
          pi => (pi.status || pi.Status || '').toLowerCase() !== 'revised'
        );
        setProformaList(activeList);

        const targetId = invoiceId || (invoice && invoice.id);
        if (targetId) {
          const invRes = await api.get(`/export-invoices/${targetId}`);
          if (invRes.data?.data) {
            let snakeData = normalizeDates(transformKeysToSnake(invRes.data.data));
            // convert any product_lines items to camelCase for display
            if (Array.isArray(snakeData.product_lines)) {
              snakeData.product_lines = snakeData.product_lines.map((line) =>
                mapAndNormalizeProductLine(line, localTileProducts, localSwProducts)
              );
            }
            snakeData = normalizeNumericFields(snakeData);
            snakeData = normalizeStringFields(snakeData);
            if (snakeData.proforma_invoice_ids && snakeData.proforma_invoice_ids.length > 0) {
              setSelectedProformaIds(snakeData.proforma_invoice_ids);
            } else if (snakeData.proforma_invoice_id) {
              setSelectedProformaIds([snakeData.proforma_invoice_id]);
            }
            setFormData((prev) => ({
              ...prev,
              ...snakeData,
              lut_bond_ref: snakeData.lut_bond_ref || (snakeData.company_info && snakeData.company_info.lut_arn_no) || prev.lut_bond_ref,
              lut_date: snakeData.lut_date || (snakeData.company_info && snakeData.company_info.lut_date) || prev.lut_date,
              country_of_origin: snakeData.country_of_origin || prev.country_of_origin || 'INDIA',
              supply_declaration: snakeData.supply_declaration || prev.supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND',
              ftp_incentive_declaration: snakeData.ftp_incentive_declaration || prev.ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'
            }));
            setSavedInvoiceId(targetId);
          }
        } else if (proformaId) {
          const ids = proformaId.split(',').map(id => id.trim()).filter(id => id);
          setSelectedProformaIds(ids);
          const piRes = await api.get(`/export-invoices/from-proforma/${proformaId}`);
          if (piRes.data?.data) {
            let snakeData = normalizeDates(transformKeysToSnake(piRes.data.data));
            // convert product lines to camelCase for display in the summary table
            if (Array.isArray(snakeData.product_lines)) {
              snakeData.product_lines = snakeData.product_lines.map((line) =>
                mapAndNormalizeProductLine(line, localTileProducts, localSwProducts)
              );
            }
            snakeData = normalizeNumericFields(snakeData);
            snakeData = normalizeStringFields(snakeData);
            if (snakeData.already_exists && snakeData.id) {
              setSavedInvoiceId(snakeData.id);
            }
            setFormData((prev) => ({
              ...prev,
              ...snakeData,
              proforma_invoice_id: ids.length === 1 ? ids[0] : '',
              proforma_invoice_ids: ids,
              proforma_date: snakeData.proforma_date || (snakeData.proforma_data && snakeData.proforma_data.date) || prev.proforma_date,
              proforma_invoice_no: snakeData.proforma_invoice_no || (snakeData.proforma_data && snakeData.proforma_data.invoice_no) || prev.proforma_invoice_no,
              lut_bond_ref: snakeData.lut_bond_ref || (snakeData.company_info && snakeData.company_info.lut_arn_no) || (snakeData.proforma_data && snakeData.proforma_data.company_info && snakeData.proforma_data.company_info.lut_arn_no) || prev.lut_bond_ref,
              lut_date: snakeData.lut_date || (snakeData.company_info && snakeData.company_info.lut_date) || (snakeData.proforma_data && snakeData.proforma_data.company_info && snakeData.proforma_data.company_info.lut_date) || prev.lut_date,
              country_of_origin: snakeData.country_of_origin || prev.country_of_origin || 'INDIA',
              supply_declaration: snakeData.supply_declaration || prev.supply_declaration || 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND',
              ftp_incentive_declaration: snakeData.ftp_incentive_declaration || prev.ftp_incentive_declaration || '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'
            }));
          }
        }
      } catch (e) {
        console.error('Init export invoice error', e);
        showError('Failed to load invoice data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [invoiceId, proformaId]);

  // Separate useEffect for company details to handle currentUser loading asynchronously
  useEffect(() => {
    const fetchCompanyLutInfo = async () => {
      const cid = currentUser?.company_id || currentUser?.companyId;
      if (!cid) return;

      try {
        const compRes = await api.get(`/companies/${cid}`);
        if (compRes.data?.success && compRes.data.data) {
          const comp = compRes.data.data;
          setFormData(prev => {
            const companyLutRef = comp.lut_arn_no || comp.lutArnNo || comp.lut_bond_ref || comp.lutBondRef || comp.lut_arn_bond_no || '';
            const companyIecNo = comp.iec_no || comp.iecNo || '';
            let companyLutDate = comp.lut_date || comp.lutDate || '';

            if (companyLutDate && typeof companyLutDate === 'string' && companyLutDate.includes('T')) {
              companyLutDate = ((companyLutDate) ? new Date(companyLutDate).toLocaleDateString('en-CA') : '');
            }

            return {
              ...prev,
              lut_bond_ref: prev.lut_bond_ref || companyLutRef,
              lut_date: prev.lut_date || companyLutDate,
              iec_no: prev.iec_no || companyIecNo
            };
          });
        }
      } catch (compErr) {
        console.error('Failed to fetch company LUT info:', compErr);
      }
    };

    fetchCompanyLutInfo();
  }, [currentUser]);

  useEffect(() => {
    // If not editing, generate next invoice number
    if (!invoiceId && !proformaId && !invoice) {
      getNextExportInvoiceNumber().then(num => {
        setFormData(prev => ({ ...prev, invoice_no: num }));
      });
    }
  }, [invoiceId, proformaId, invoice, getNextExportInvoiceNumber]);

  // Sync custom values for T&C dropdowns
  useEffect(() => {
    const fieldsToSync = [
      { value: formData.pallet_type, key: 'palletTypes', list: masterData.palletTypes },
      { value: formData.tiles_back, key: 'tilesBack', list: masterData.tiles_back },
      { value: formData.boxes_marking, key: 'boxesMarking', list: masterData.boxesMarking },
      { value: formData.box_type, key: 'boxTypes', list: masterData.boxTypes },
      { value: formData.payment_terms, key: 'paymentTerms', list: masterData.paymentTerms },
      { value: formData.delivery_terms, key: 'deliveryTerms', list: masterData.deliveryTerms }
    ];

    setMasterData(prev => {
      const newState = { ...prev };
      let changed = false;

      fieldsToSync.forEach(({ value, key, list }) => {
        if (value && list && !list.includes(value)) {
          newState[key] = [...prev[key], value];
          changed = true;
        }
      });

      return changed ? newState : prev;
    });
  }, [formData.pallet_type, formData.tiles_back, formData.boxes_marking, formData.box_type]);

  const handleMasterDataAdd = (field, newValue) => {
    setMasterData((prev) => ({
      ...prev,
      [field]: Array.isArray(prev[field]) ? [...prev[field], newValue] : [newValue],
    }));
    showInfo(`${newValue} added to ${field}`);
  };

  const addProductLine = (isFoc = false) => {
    setFormData(prev => ({
      ...prev,
      product_lines: [
        ...prev.product_lines,
        {
          product: '',
          description: '',
          size: '',
          surface: '',
          totalPallet: 0,
          totalBoxes: 0,
          weightPerSqm: 0,
          sqm: 0,
          rate: 0,
          amount: 0,
          netWeight: 0,
          grossWeight: 0,
          isFoc: !!isFoc
        }
      ]
    }));
  };

  const handleProductChange = (index, field, value) => {
    const lines = [...formData.product_lines];
    const item = { ...lines[index], [field]: value };

    // Sync dual keys for HSN
    if (field === 'hsnCode' || field === 'hsn_code' || field === 'hsCode' || field === 'hs_code') {
      item.hsnCode = value;
      item.hsn_code = value;
      item.hsCode = value;
      item.hs_code = value;
    }

    // Sync dual keys for weight
    if (field === 'weightPerSqm' || field === 'perBoxWeight' || field === 'boxWeight' || field === 'box_weight') {
      item.weightPerSqm = value;
      item.perBoxWeight = value;
      item.boxWeight = value;
      item.box_weight = value;
    }

    // Sync dual keys for description
    if (field === 'description' || field === 'materialDescription' || field === 'material_description') {
      item.description = value;
      item.materialDescription = value;
      item.material_description = value;
      if (item.isFoc) {
        item.product = (value || '').split('-')[0];
      }
    }

    // Auto-populate from master if product is selected
    if (field === 'product' || field === 'productName') {
      const allProducts = [...products, ...swProducts];
      const p = allProducts.find(prod => prod.name === value);
      if (p) {
        item.description = p.description || '';
        item.materialDescription = p.description || '';
        item.material_description = p.description || '';
        item.size = p.dimensions || p.size || p.productSize || '';
        item.surface = p.finish || p.surface || p.productSurface || '';
        // Use normalized camelCase field names from products master
        item.weightPerSqm = parseFloat(p.weightPerSqm || p.perBoxWeight || p.boxWeight || p.box_weight || 0);
        item.perBoxWeight = item.weightPerSqm;
        item.boxWeight = item.weightPerSqm;
        item.box_weight = item.weightPerSqm;
        item.sqm = parseFloat(p.sqmPerBox || p.sqm || p.sqm_per_box || 0);
        item.product_type = p.product_type || p.productType || (p.category ? 'sanitaryware' : 'tile');
        item.productType = item.product_type;
        item.sanitarywareProductId = p.id || p.sanitaryware_product_id || null;
        item.sanitaryware_product_id = p.id || p.sanitaryware_product_id || null;
        item.modelNo = p.itemRef || p.item_ref || p.model_no || '';
        item.model_no = p.itemRef || p.item_ref || p.model_no || '';
        item.category = p.category || '';
        item.color = p.color || '';

        const masterHsn = p.hsnCode || p.hsn_code || p.hsCode || p.hs_code || '';
        item.hsnCode = masterHsn;
        item.hsn_code = masterHsn;
        item.hsCode = masterHsn;
        item.hs_code = masterHsn;
      }
    }

    const isSanitaryware = item.product_type === 'sanitaryware' || item.productType === 'sanitaryware';

    // Formulas:
    const boxes = parseFloat(item.totalBoxes || item.pieces || 0) || 0;
    const sqmPerBox = parseFloat(item.sqm || 0) || 0;
    const weightPerBox = parseFloat(item.weightPerSqm || item.perBoxWeight || item.boxWeight || item.box_weight || 0) || 0;
    const rate = parseFloat(item.rate || 0) || 0;
    const pallets = parseFloat(item.totalPallet || item.pallets || 0) || 0;

    item.sqmAuto = isSanitaryware ? 0 : parseFloat((boxes * sqmPerBox).toFixed(2));
    item.amount = item.isFoc ? 0 : parseFloat((isSanitaryware ? (boxes * rate) : (item.sqmAuto * rate)).toFixed(2));
    item.netWeight = parseFloat((boxes * weightPerBox).toFixed(2));
    item.grossWeight = parseFloat((item.netWeight + (pallets * 20)).toFixed(2));

    if (isSanitaryware) {
      item.pieces = boxes;
    }

    lines[index] = item;
    setFormData(prev => ({ ...prev, product_lines: lines }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.port_of_loading) newErrors.port_of_loading = 'Port of Loading is required';
    if (!formData.port_of_discharge) newErrors.port_of_discharge = 'Port of Discharge is required';
    if (!formData.final_destination) newErrors.final_destination = 'Final Destination is required';
    if (!formData.country) newErrors.country = 'Country of Final Destination is required';
    if (!selectedProformaIds || selectedProformaIds.length === 0) newErrors.proforma_invoice_ids = 'Proforma Invoice is required';
    if (!formData.payment_terms) newErrors.payment_terms = 'Payment Terms are required';
    if (!formData.delivery_terms) newErrors.delivery_terms = 'Delivery Terms are required';
    if (!formData.vessel_flight_no) newErrors.vessel_flight_no = 'Vessel/Flight No. is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) {
      scrollToFirstError();
      showError('Please fill all mandatory fields correctly.');
      return;
    }
    setIsLocked(true);

    // Validate product lines
    if (!formData.product_lines || formData.product_lines.length === 0) {
      showError('Please add at least one product');
      setIsLocked(false);
      return;
    }

    // Transform product_lines: recalculate all formulas before saving
    const preparedData = {
      ...formData,
      proforma_invoice_ids: selectedProformaIds,
      proforma_invoice_id: selectedProformaIds.length === 1 ? selectedProformaIds[0] : null,
      // Map frontend lut_arn_no to backend lut_bond_ref
      lut_bond_ref: formData.lut_arn_no || formData.lut_bond_ref || '',
      product_lines: formData.product_lines.map(line => {
        const totalBoxes = parseFloat(line.totalBoxes || line.pieces || 0) || 0;
        const weightPerSqm = parseFloat(line.weightPerSqm || line.perBoxWeight || line.boxWeight || line.box_weight || 0) || 0;
        const sqmPerUnit = parseFloat(line.sqm || 0) || 0;
        const isSanitaryware = line.product_type === 'sanitaryware' || line.productType === 'sanitaryware';
        const totalLineSqm = isSanitaryware ? 0 : totalBoxes * sqmPerUnit;
        const rate = parseFloat(line.rate || 0) || 0;

        const isFoc = !!line.isFoc;

        // Recalculate with correct formulas
        const amount = isFoc ? 0 : parseFloat((isSanitaryware ? (totalBoxes * rate) : (totalLineSqm * rate)).toFixed(2));
        const pallets = parseFloat(line.totalPallet || line.pallets || 0) || 0;
        const netWeight = parseFloat((totalBoxes * weightPerSqm).toFixed(2));
        const grossWeight = parseFloat((netWeight + (pallets * 20)).toFixed(2));

        return {
          id: line.id,
          product: line.product,
          product_id: line.product_id,
          description: line.description || '',
          size: line.size || '',
          surface: line.surface || '',
          thickness: line.thickness || '',
          hsnCode: line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || '',
          hsn_code: line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || '',
          // Pallet / box counts
          total_pallet: pallets,
          pallets: pallets,
          total_boxes: totalBoxes,
          // Weight per box
          weight_per_sqm: weightPerSqm,
          per_box_weight: weightPerSqm,
          box_weight: weightPerSqm,
          // Quantities
          sqm: sqmPerUnit,
          rate,
          // Computed fields (saved so downstream docs get correct values)
          sqm_auto: parseFloat(totalLineSqm.toFixed(2)),
          amount,
          net_weight: netWeight,
          gross_weight: grossWeight,
          is_foc: isFoc,
          // Sanitaryware fields
          product_type: line.product_type || 'tile',
          sanitaryware_product_id: line.sanitaryware_product_id || line.sanitarywareProductId || null,
          model_no: line.model_no || line.modelNo || null,
          category: line.category || null,
          color: line.color || null,
          pieces: totalBoxes,
          cartons: parseFloat(line.cartons || 0) || 0,
          cbm: parseFloat(line.cbm || 0) || 0,
          // Keep camelCase aliases for round-trip display
          totalPallet: pallets,
          totalBoxes,
          sqmAuto: parseFloat(totalLineSqm.toFixed(2)),
          weightPerSqm,
          perBoxWeight: weightPerSqm,
          boxWeight: weightPerSqm,
          netWeight,
          grossWeight,
          isFoc,
          country_of_origin: formData.country_of_origin,
        };
      })
    };

    const apiCall = formData.id
      ? api.put(`/export-invoices/${formData.id}`, preparedData)
      : api.post('/export-invoices', preparedData);

    apiCall
      .then((res) => {
        const saved = res.data?.data || res.data;
        const savedId = saved?.id || saved?.data?.id;
        if (savedId) {
          setSavedInvoiceId(savedId);
          let snakeSaved = normalizeDates(transformKeysToSnake(saved));
          // Convert product lines from snake_case to camelCase for display
          if (Array.isArray(snakeSaved.product_lines)) {
            snakeSaved.product_lines = snakeSaved.product_lines.map((line) =>
              transformSnakeToCamelKeys(line)
            );
          }
          snakeSaved = normalizeNumericFields(snakeSaved);
          snakeSaved = normalizeStringFields(snakeSaved);
          setFormData((prev) => ({ ...prev, ...snakeSaved, id: savedId }));
        }
        showSuccess('Export Invoice saved successfully');

        // Dispatch event for live update in dashboards
        window.dispatchEvent(new CustomEvent('exportInvoice:changed'));

        setTimeout(() => {
          if (onSave) onSave(saved);
          else if (onBack) onBack();
          else if (onCancel) onCancel();
        }, 1200);
      })
      .catch((err) => {
        let msg = err.response?.data?.message || 
                 (typeof err.response?.data === 'string' ? err.response.data : null) || 
                 (err.response?.data ? `Server Payload: ${JSON.stringify(err.response.data)}` : err.message) || 
                 'Failed to save export invoice';
                 
        if (err.response?.data?.errors) {
            let beErrors = {};
            if (Array.isArray(err.response.data.errors)) {
                err.response.data.errors.forEach(e => {
                const field = e.path || e.param;
                if (field) beErrors[field] = e.msg || e.message;
                });
            } else if (typeof err.response.data.errors === 'object') {
                beErrors = err.response.data.errors;
            }
            if (Object.keys(beErrors).length > 0) {
                setErrors(beErrors);
                scrollToFirstError();
                msg = 'Validation failed. Please check the highlighted fields.';
            }
        }
        showError(msg);
        console.error('Export invoice save error:', err);
      })
      .finally(() => setIsLocked(false));
  };

  const handleProformaIdsChange = async (ids) => {
    setSelectedProformaIds(ids);
    setValidationError('');

    if (ids.length === 0) {
      setFormData(prev => ({
        ...prev,
        proforma_invoice_id: '',
        proforma_invoice_ids: [],
        proforma_invoice_no: '',
        product_lines: [],
        pallets: 0,
        total_sqm: 0,
        total_amount: 0,
        net_weight: 0,
        gross_weight: 0
      }));
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/export-invoices/from-proforma/${ids.join(',')}`);
      if (res.data?.data) {
        let snakeData = normalizeDates(transformKeysToSnake(res.data.data));
        // convert product lines to camelCase for display
        if (Array.isArray(snakeData.product_lines)) {
          snakeData.product_lines = snakeData.product_lines.map((line) =>
            mapAndNormalizeProductLine(line, products, swProducts)
          );
        }
        snakeData = normalizeNumericFields(snakeData);
        snakeData = normalizeStringFields(snakeData);
        if (snakeData.already_exists && snakeData.id) {
          setSavedInvoiceId(snakeData.id);
        }
        setFormData((prev) => ({
          ...prev,
          ...snakeData,
          proforma_invoice_id: ids.length === 1 ? ids[0] : '',
          proforma_invoice_ids: ids,
          proforma_date: snakeData.proforma_date || (snakeData.proforma_data && snakeData.proforma_data.date) || prev.proforma_date,
          proforma_invoice_no: snakeData.proforma_invoice_no || (snakeData.proforma_data && snakeData.proforma_data.invoice_no) || prev.proforma_invoice_no,
          lut_bond_ref: prev.lut_bond_ref || snakeData.lut_bond_ref || snakeData.lut_arn_no,
          lut_date: prev.lut_date || snakeData.lut_date
        }));
      }
    } catch (err) {
      console.error('Proforma fetch error:', err);
      const errMsg = err.response?.data?.message || 'Failed to load Proforma invoice';
      setValidationError(errMsg);
      showError('Selected Proforma Invoices cannot be merged. Look at basic details for reasons.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || productsLoading || swLoading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 px-3">
        <div className="d-flex align-items-center">
          <Button
            variant="outline"
            onClick={onBack || onCancel}
            className="me-3 p-2 bg-white shadow-sm border-0 rounded-3 text-primary"
            style={{ width: '45px', height: '45px' }}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="d-flex align-items-center mb-0">
              <FileText className="me-2 text-primary" size={24} />
              <h4 className="mb-0 fw-bold">Export Invoice Form</h4>
            </div>
            <p className="text-muted small mb-0 fw-medium">
              Step 1: Create Export Invoice from Proforma
            </p>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSaving}
            className="shadow-sm px-4 fw-bold"
            style={{ height: '55px', borderRadius: '12px', minWidth: '160px' }}
          >
            {isSaving ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <Save size={20} className="me-2" /> {formData.id || savedInvoiceId ? 'Update' : 'Save'} Invoice
              </>
            )}
          </Button>
          {(formData.id || savedInvoiceId) && (
            <Button
              variant="success"
              className="shadow-sm px-4 fw-bold d-flex align-items-center"
              style={{ height: '55px', borderRadius: '12px' }}
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', {
                detail: {
                  page: 'packing-list-form',
                  exportInvoiceId: formData.id || savedInvoiceId
                }
              }))}
            >
              Next: Packing List <ChevronRight size={20} className="ms-1" />
            </Button>
          )}
        </div>

      </div>

      <Form onSubmit={handleSubmit} className="px-3">
        <Card className="mb-4 shadow-sm border-0 rounded-4" style={{ overflow: 'visible', zIndex: 10 }}>
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">BASIC INFORMATION</h6>
          </Card.Header>

          <Card.Body className="p-4 bg-white">
            <Row className="g-4">
              <Col md={3}>
                <Form.Group ref={dropdownRef} className="position-relative">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Proforma Invoice is mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Proforma Invoice * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <div
                    className="form-control d-flex align-items-center justify-content-between cursor-pointer border shadow-sm transition-all"
                    style={{
                      minHeight: '44px',
                      height: 'auto',
                      background: '#fff',
                      borderColor: (errors.proforma_invoice_ids && !showProformaDropdown) ? '#dc3545' : (showProformaDropdown ? '#86b7fe' : '#ced4da'),
                      boxShadow: showProformaDropdown ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
                      borderRadius: '0.375rem',
                      padding: '0.375rem 2.25rem 0.375rem 0.75rem',
                      position: 'relative'
                    }}
                    onClick={() => !isFormLocked && setShowProformaDropdown(!showProformaDropdown)}
                  >
                    <div className="d-flex flex-wrap gap-1 align-items-center">
                      {selectedProformaIds.length === 0 && <span className="text-muted">-- choose multiple --</span>}
                      {selectedProformaIds.map(id => {
                        const pi = proformaList.find(p => p.id === id);
                        return (
                          <Badge
                            key={id}
                            className="d-flex align-items-center gap-1 py-1.5 px-2.5 rounded text-white fw-semibold shadow-sm"
                            style={{
                              fontSize: '0.8rem',
                              backgroundColor: '#0d6efd',
                              border: 'none'
                            }}
                          >
                            {pi ? (pi.invoiceNo || pi.invoice_no) : id.substring(0, 8)}
                            {!isFormLocked && (
                              <X
                                size={14}
                                className="cursor-pointer text-white hover-text-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = selectedProformaIds.filter(x => x !== id);
                                  handleProformaIdsChange(updated);
                                }}
                              />
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                    <div className="position-absolute end-0 top-50 translate-middle-y pe-3 text-muted pointer-events-none">
                      {showProformaDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {errors.proforma_invoice_ids && <div className="text-danger small mt-1">{errors.proforma_invoice_ids}</div>}

                  {showProformaDropdown && !isFormLocked && (
                    <div
                      className="position-absolute bg-white border rounded shadow-lg p-2.5 mt-1 z-3"
                      style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 20px -6px rgba(0, 0, 0, 0.08)',
                        borderRadius: '0.5rem',
                        width: '100%',
                        minWidth: '320px'
                      }}
                    >
                      <div className="d-flex align-items-center border rounded px-2.5 py-1.5 mb-2.5 bg-light">
                        <Search size={16} className="text-muted me-2" />
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Search Proforma Invoices..."
                          value={proformaSearch}
                          onChange={(e) => setProformaSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="border-0 bg-transparent shadow-none p-0"
                          style={{ fontSize: '0.875rem' }}
                        />
                      </div>
                      <div className="dropdown-items-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {proformaList
                          .filter(pi =>
                            (pi.invoiceNo || pi.invoice_no || '').toLowerCase().includes(proformaSearch.toLowerCase()) ||
                            (pi.clientName || pi.client_name || '').toLowerCase().includes(proformaSearch.toLowerCase())
                          )
                          .map(pi => {
                            const isChecked = selectedProformaIds.includes(pi.id);
                            return (
                              <div
                                key={pi.id}
                                className="d-flex align-items-start p-2 rounded cursor-pointer transition-all mb-1 hover-bg-light"
                                style={{
                                  backgroundColor: isChecked ? '#f0f5ff' : 'transparent',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = isChecked
                                    ? selectedProformaIds.filter(x => x !== pi.id)
                                    : [...selectedProformaIds, pi.id];
                                  handleProformaIdsChange(updated);
                                }}
                              >
                                <Form.Check
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => { }} // handled by click on parent div
                                  className="me-2 mt-1 cursor-pointer"
                                  style={{ flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="small fw-semibold text-dark text-truncate">
                                    {pi.invoiceNo || pi.invoice_no}
                                  </div>
                                  {pi.clientName || pi.client_name ? (
                                    <div className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>
                                      {pi.clientName || pi.client_name}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        }
                        {proformaList.filter(pi =>
                          (pi.invoiceNo || pi.invoice_no || '').toLowerCase().includes(proformaSearch.toLowerCase()) ||
                          (pi.clientName || pi.client_name || '').toLowerCase().includes(proformaSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="text-muted text-center py-3 small">
                            No active Proforma Invoices found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Proforma Invoice Date
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formatDisplayDate(formData.proforma_date)}
                    readOnly
                    className="form-control"
                    style={{ height: '44px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Export Invoice no.
                  </Form.Label>
                  <Form.Control
                    value={formData.invoice_no}
                    readOnly
                    className="form-control"
                    style={{ height: '44px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    DATE
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="bg-light border-0 py-2 px-3"
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Country of Origin
                  </Form.Label>
                  <Form.Control
                    value={formData.country_of_origin}
                    onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
                    placeholder="INDIA"
                    className="form-control"
                    style={{ height: '44px' }}
                  />
                </Form.Group>
              </Col>
            </Row>
            {validationError && (
              <div className="alert alert-danger border-0 shadow-sm d-flex align-items-start gap-3 mt-4 py-3 px-4 rounded-3" role="alert" style={{ background: '#fff3f3', borderLeft: '4px solid #dc3545' }}>
                <Info className="text-danger flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h6 className="alert-heading fw-bold mb-1 text-danger">Selected Proforma Invoices cannot be merged.</h6>
                  <p className="mb-0 text-dark small fw-medium" style={{ whiteSpace: 'pre-line' }}>
                    {validationError.includes('identical')
                      ? `The following fields must be identical across all selected PIs:
                         • Consignee Details
                         • Buyer Details
                         • Port of Loading
                         • Port of Discharge
                         • Final Destination`
                      : validationError
                    }
                  </p>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
        {/* --- SHIPPING & TRANSPORT DETAILS (READ-ONLY) --- */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-4 border-primary">
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
            <Ship className="me-2 text-white" size={20} />
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">SHIPPING & TRANSPORT DETAILS</h6>
          </Card.Header>

          <Card.Body className="p-4 bg-white">
            <Row className="g-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Consignee Details
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={formData.consignee_details}
                    onChange={(e) => setFormData({ ...formData, consignee_details: e.target.value })}
                    className="form-control py-2 px-3 text-dark"
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Buyer Details
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={formData.buyer_details}
                    onChange={(e) => setFormData({ ...formData, buyer_details: e.target.value })}
                    className="form-control py-2 px-3 text-dark"
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* 2. Routing Group */}
            <Row className="g-4 mt-1">
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Port of Loading is mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Port of Loading * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <AddableDropdown
                    value={formData.port_of_loading}
                    onChange={(value) => {
                      setFormData({ ...formData, port_of_loading: value });
                      if (errors.port_of_loading) setErrors({...errors, port_of_loading: null});
                    }}
                    masterDataType="portsOfLoading"
                    label="Port of Loading"
                    placeholder="Select Port"
                    className="form-control h-auto py-2"
                    isInvalid={!!errors.port_of_loading}
                  />
                  {errors.port_of_loading && <div className="invalid-feedback d-block">{errors.port_of_loading}</div>}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Port of Discharge is mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Port of Discharge * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <AddableDropdown
                    value={formData.port_of_discharge}
                    onChange={(value) => {
                      setFormData({ ...formData, port_of_discharge: value });
                      if (errors.port_of_discharge) setErrors({...errors, port_of_discharge: null});
                    }}
                    masterDataType="portsOfDischarge"
                    label="Port of Discharge"
                    placeholder="Select Port"
                    className="form-control h-auto py-2"
                    isInvalid={!!errors.port_of_discharge}
                  />
                  {errors.port_of_discharge && <div className="invalid-feedback d-block">{errors.port_of_discharge}</div>}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Final Destination is mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Final Destination * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <AddableDropdown
                    value={formData.final_destination}
                    onChange={(value) => {
                      setFormData({ ...formData, final_destination: value });
                      if (errors.final_destination) setErrors({...errors, final_destination: null});
                    }}
                    masterDataType="finalDestinations"
                    label="Final Destination"
                    placeholder="Select Destination"
                    className="form-control h-auto py-2"
                    isInvalid={!!errors.final_destination}
                  />
                  {errors.final_destination && <div className="invalid-feedback d-block">{errors.final_destination}</div>}
                </Form.Group>
              </Col>
            </Row>

            {/* 3. Transport Specifics & Destination Country */}
            <Row className="g-4 mt-1">
              <Col md={3}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Country of Final Dest is mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Country of Final Dest. * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <AddableDropdown
                    value={formData.country}
                    onChange={(value) => {
                      setFormData({ ...formData, country: value });
                      if (errors.country) setErrors({...errors, country: null});
                    }}
                    masterDataType="countries"
                    label="Country of Final Dest."
                    placeholder="Select Country"
                    className="form-control h-auto py-2 fw-bold text-primary"
                    isInvalid={!!errors.country}
                  />
                  {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Vessel/Flight No. is mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Vessel/Flight No. * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Control
                    value={formData.vessel_flight_no}
                    onChange={(e) => {
                      setFormData({ ...formData, vessel_flight_no: e.target.value.toUpperCase() });
                      if (errors.vessel_flight_no) setErrors({...errors, vessel_flight_no: null});
                    }}
                    disabled={isFormLocked}
                    isInvalid={!!errors.vessel_flight_no}
                    className={isFormLocked ? "form-control py-2 px-3 bg-light text-dark fw-bold text-primary" : "form-control py-2 px-3 fw-bold text-primary"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                  <Form.Control.Feedback type="invalid">{errors.vessel_flight_no}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Payment Terms are mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Payment Terms * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <AddableDropdown
                    value={formData.payment_terms}
                    onChange={(value) => {
                      setFormData({ ...formData, payment_terms: value });
                      if (errors.payment_terms) setErrors({...errors, payment_terms: null});
                    }}
                    masterDataType="paymentTerms"
                    label="Payment Terms"
                    placeholder="Select Payment Terms"
                    className="form-control h-auto py-2"
                    isInvalid={!!errors.payment_terms}
                  />
                  {errors.payment_terms && <div className="invalid-feedback d-block">{errors.payment_terms}</div>}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Delivery Terms are mandatory.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 text-uppercase tracking-wider text-danger" style={{cursor: 'help'}}>
                      Delivery Terms * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  <AddableDropdown
                    value={formData.delivery_terms}
                    onChange={(value) => {
                      setFormData({ ...formData, delivery_terms: value });
                      if (errors.delivery_terms) setErrors({...errors, delivery_terms: null});
                    }}
                    masterDataType="deliveryTerms"
                    label="Delivery Terms"
                    placeholder="Select Delivery Terms"
                    className="form-control h-auto py-2"
                    isInvalid={!!errors.delivery_terms}
                  />
                  {errors.delivery_terms && <div className="invalid-feedback d-block">{errors.delivery_terms}</div>}
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4 mt-1">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Place of Receipt
                  </Form.Label>
                  <Form.Control
                    value={formData.place_of_receipt}
                    onChange={(e) => setFormData({ ...formData, place_of_receipt: e.target.value.toUpperCase() })}
                    disabled={isFormLocked}
                    className={isFormLocked ? "form-control py-2 px-3 bg-light text-dark" : "form-control py-2 px-3"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Pre-Carriage By
                  </Form.Label>
                  <Form.Control
                    value={formData.pre_carriage_by}
                    onChange={(e) => setFormData({ ...formData, pre_carriage_by: e.target.value.toUpperCase() })}
                    className="form-control py-2 px-3 text-dark"
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* --- REFERENCE & DOCUMENTATION --- */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
            <FileCheck className="me-2 text-white" size={20} />
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">REFERENCE & DOCUMENTATION</h6>
          </Card.Header>

          <Card.Body className="p-4 bg-white">
            <Row className="g-4">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    B.L. No.
                  </Form.Label>
                  <Form.Control
                    value={formData.bl_no}
                    onChange={(e) => setFormData({ ...formData, bl_no: e.target.value.toUpperCase() })}
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    B.L. Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.bl_date}
                    onChange={(e) => setFormData({ ...formData, bl_date: e.target.value })}
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Shipping Bill No.
                  </Form.Label>
                  <Form.Control
                    value={formData.shipping_bill_no}
                    onChange={(e) => setFormData({ ...formData, shipping_bill_no: e.target.value.toUpperCase() })}
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Shipping Bill Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.shipping_bill_date}
                    onChange={(e) => setFormData({ ...formData, shipping_bill_date: e.target.value })}
                    className="form-control"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4 mt-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Buyer&#39;s Order No.
                  </Form.Label>
                  <Form.Control
                    value={formData.buyers_order_no}
                    onChange={(e) => setFormData({ ...formData, buyers_order_no: e.target.value.toUpperCase() })}
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Buyer&#39;s Order Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.buyers_order_date}
                    onChange={(e) => setFormData({ ...formData, buyers_order_date: e.target.value })}
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Tariff Code *
                  </Form.Label>
                  {(() => {
                    const COMMON_TARIFF_CODES = Array.from(new Set([
                      ...(masterData.tariffCodes || [])
                    ]));
                    const currentCodes = (formData.tariff_code || '').split(',').map(c => c.trim()).filter(Boolean);
                    const addCode = (code) => {
                      const trimmed = code.trim();
                      if (!trimmed || currentCodes.includes(trimmed)) return;
                      setFormData({ ...formData, tariff_code: [...currentCodes, trimmed].join(', ') });
                      setTcInput('');
                      setTcOpen(false);
                    };
                    const removeCode = (code) => {
                      setFormData({ ...formData, tariff_code: currentCodes.filter(c => c !== code).join(', ') });
                    };
                    const filtered = COMMON_TARIFF_CODES.filter(c => c.includes(tcInput) && !currentCodes.includes(c));
                    return (
                      <div style={{ position: 'relative' }}>
                        <div
                          className="form-control d-flex flex-wrap gap-1 align-items-center"
                          style={{ minHeight: '44px', height: 'auto', borderRadius: '10px', cursor: 'text', padding: '6px 10px' }}
                          onClick={() => setTcOpen(true)}
                        >
                          {currentCodes.map(code => (
                            <span key={code} className="badge d-inline-flex align-items-center gap-1 px-2 py-1" style={{ background: '#e8f0fe', color: '#0d6efd', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1.5px solid #0d6efd' }}>
                              {code}
                              <span role="button" style={{ cursor: 'pointer', fontSize: '14px', lineHeight: 1, color: '#dc3545', fontWeight: 'bold', marginLeft: '2px' }} onClick={(e) => { e.stopPropagation(); removeCode(code); }}>&times;</span>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={tcInput}
                            onChange={e => { setTcInput(e.target.value); setTcOpen(true); }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCode(tcInput); } if (e.key === 'Escape') setTcOpen(false); }}
                            onFocus={() => setTcOpen(true)}
                            onBlur={() => setTimeout(() => setTcOpen(false), 200)}
                            placeholder={currentCodes.length === 0 ? 'Select or add tariff code...' : '+ Add more'}
                            className="border-0 outline-0 flex-grow-1 bg-transparent fw-bold text-dark"
                            style={{ minWidth: '120px', outline: 'none', fontSize: '13px' }}
                          />
                        </div>
                        {tcOpen && (filtered.length > 0 || tcInput) && (
                          <div className="bg-white border rounded-3 shadow-sm position-absolute w-100" style={{ zIndex: 1055, top: '100%', maxHeight: '160px', overflowY: 'auto' }}>
                            {filtered.map(code => (
                              <div key={code} className="px-3 py-2 fw-bold small text-dark" style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                                onMouseDown={() => addCode(code)}>
                                {code}
                              </div>
                            ))}
                            {tcInput && !currentCodes.includes(tcInput.trim()) && !COMMON_TARIFF_CODES.includes(tcInput.trim()) && (
                              <div className="px-3 py-2 text-primary fw-bold small" style={{ cursor: 'pointer' }} onMouseDown={() => addCode(tcInput)}>
                                + Add "{tcInput}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Form.Group>
              </Col>

            </Row>

            <Row className="g-4 mt-1">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    I.E.C. NO.
                  </Form.Label>
                  <Form.Control
                    value={formData.iec_no || ''}
                    readOnly
                    className="form-control bg-light"
                    placeholder="Fetched from Company Profile"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    LUT / Bond Ref.
                  </Form.Label>
                  <Form.Control
                    value={formData.lut_bond_ref || ''}
                    readOnly
                    className="form-control bg-light"
                    placeholder="Fetched from Company Profile"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    LUT Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.lut_date || ''}
                    readOnly
                    className="form-control bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* --- PRODUCT DETAILS (EDITABLE) --- */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-4 border-primary">
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex justify-content-start align-items-center gap-2 d-none d-lg-flex">
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">PRODUCT DETAILS</h6>
            <div className="ms-auto d-flex gap-2">
              {!isFormLocked && (
                <>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => addProductLine(true)}
                    className="fw-bold d-flex align-items-center text-danger px-3 border border-danger"
                  >
                    <Gift size={18} className="me-1" /> Add Free Sample
                  </Button>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => addProductLine(false)}
                    className="fw-bold d-flex align-items-center text-primary px-3 border border-primary"
                  >
                    <Plus size={18} className="me-1" /> Add Product
                  </Button>
                </>
              )}
            </div>
          </Card.Header>

          {/* Mobile-only Header with Add Button */}
          <div className="d-flex d-lg-none p-3 bg-white align-items-center justify-content-between border-bottom">
            <h6 className="mb-0 fw-bold text-uppercase text-primary tracking-wider" style={{ fontSize: '14px' }}>Product Items</h6>
            {!isFormLocked && (
              <Button
                variant="primary"
                size="sm"
                onClick={addProductLine}
                className="rounded-pill px-3 shadow-sm"
                style={{ fontSize: '12px' }}
              >
                <Plus size={16} className="me-1" /> Add Item
              </Button>
            )}
          </div>

          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead>
                  <tr>
                    <th className="text-center ps-4" style={{ width: '50px' }}>SR.</th>
                    <th>MATERIAL DESCRIPTION</th>
                    <th className="text-center">HSN CODE</th>
                    <th className="text-center">PALLETS</th>
                    <th className="text-center">QTY (BOXES)</th>
                    <th className="text-center">BOX WT (KG)</th>
                    <th className="text-center">SQM / BOX</th>
                    <th className="text-center">TOTAL (SQM)</th>
                    <th className="text-center">RATE ({formData.currency || 'USD'})</th>
                    <th className="text-center">AMOUNT ({formData.currency || 'USD'})</th>
                    <th className="text-center">NET WT (KG)</th>
                    <th className="text-center">GROSS WT (KG)</th>
                    <th className="text-center">FOC</th>
                    <th className="pe-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.product_lines && formData.product_lines.length > 0 ? (
                    <>
                      {formData.product_lines.map((line, index) => (
                        <tr key={index} className="border-bottom" style={{ backgroundColor: line.isFoc ? '#fff5f5' : '#fff' }}>
                          <td data-label="SR." className="py-2 px-3 text-center align-middle fw-bold" style={{ width: '50px' }}>{index + 1}</td>
                          <td data-label="MATERIAL DESCRIPTION" className="py-2 px-3 align-middle" style={{ minWidth: '350px' }}>
                            {isFormLocked ? (
                              <div className="fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '13px' }}>
                                {line.product || line.productName}
                              </div>
                            ) : line.isFoc ? null : (
                              <DynamicDropdown
                                value={line.product || line.productName}
                                onChange={(val) => handleProductChange(index, 'product', val)}
                                options={[...products, ...swProducts].map((p) => p.name)}
                                placeholder="Select Product"
                                onAddNew={(val) => handleProductChange(index, 'product', val)}
                              />
                            )}
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <Form.Control
                                as="textarea"
                                rows={line.isFoc ? 3 : 2}
                                value={line.description || line.materialDescription || line.material_description || (line.isFoc ? line.product : '') || ''}
                                onChange={(e) => handleProductChange(index, 'description', e.target.value.toUpperCase())}
                                placeholder={line.isFoc ? "Enter Sample Name & Details here..." : "Additional description..."}
                                readOnly={isFormLocked}
                                className={isFormLocked ? "form-control-sm bg-light border-0 shadow-none fw-bold" : "form-control-sm border-primary-subtle shadow-none flex-grow-1"}
                                style={{ fontSize: '12px', resize: 'none' }}
                              />
                              {line.isFoc && (
                                <Badge bg="danger" className="p-1 px-2 text-uppercase" style={{ fontSize: '9px', height: 'fit-content' }}>Sample</Badge>
                              )}
                            </div>
                          </td>
                          <td data-label="HSN CODE" className="py-2 px-3 text-center border-start align-middle">
                            {isFormLocked ? (
                              <Form.Control
                                type="text"
                                value={line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || ''}
                                readOnly
                                className="form-control-sm text-center bg-light border-0 fw-bold"
                                style={{ width: '100px', margin: '0 auto' }}
                              />
                            ) : (
                              <AddableDropdown
                                value={line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || ''}
                                onChange={(value) => handleProductChange(index, 'hsnCode', value)}
                                masterDataType="tariffCodes"
                                label="HSN Code"
                                placeholder="Select HSN"
                                className="text-center fw-bold"
                                selectClassName="form-control-sm"
                                selectStyle={{ width: '100px', margin: '0 auto' }}
                              />
                            )}
                          </td>
                          <td data-label="PALLETS" className="py-2 px-3 text-end text-lg-center border-start align-middle">
                            <Form.Control
                              type="number"
                              value={line.totalPallet || line.pallets || 0}
                              onChange={(e) => handleProductChange(index, 'totalPallet', e.target.value)}
                              readOnly={isFormLocked}
                              className={isFormLocked ? "form-control-sm text-center bg-light border-0 fw-bold" : "form-control-sm text-center fw-bold"}
                              style={{ width: '80px', margin: '0 auto' }}
                            />
                          </td>
                          <td data-label="QTY (BOXES)" className="py-2 px-3 text-end text-lg-center border-start align-middle">
                            <Form.Control
                              type="number"
                              value={line.totalBoxes || 0}
                              onChange={(e) => handleProductChange(index, 'totalBoxes', e.target.value)}
                              readOnly={isFormLocked}
                              className={isFormLocked ? "form-control-sm text-center bg-light border-0 fw-bold text-primary" : "form-control-sm text-center fw-bold text-primary"}
                              style={{ width: '90px', margin: '0 auto' }}
                            />
                          </td>
                          <td data-label="BOX WT (KG)" className="py-2 px-3 text-end text-lg-center border-start align-middle">
                            <Form.Control
                              type="number"
                              step="0.01"
                              value={line.weightPerSqm || line.perBoxWeight || line.boxWeight || line.box_weight || 0}
                              onChange={(e) => handleProductChange(index, 'weightPerSqm', e.target.value)}
                              readOnly={isFormLocked}
                              className={isFormLocked ? "form-control-sm text-center bg-light border-0 fw-bold text-primary" : "form-control-sm text-center fw-bold text-primary"}
                              style={{ width: '80px', margin: '0 auto' }}
                            />
                          </td>
                          <td data-label="SQM/BOX" className="py-2 px-3 text-end text-lg-center border-start align-middle">
                            <Form.Control
                              type="number"
                              step="0.0001"
                              value={line.sqm || 0}
                              onChange={(e) => handleProductChange(index, 'sqm', e.target.value)}
                              readOnly={isFormLocked}
                              className={isFormLocked ? "form-control-sm text-center bg-light border-0" : "form-control-sm text-center"}
                              style={{ width: '80px', margin: '0 auto' }}
                            />
                          </td>
                          <td data-label="TOTAL (SQM)" className="py-2 px-3 text-end text-lg-center border-start align-middle text-primary fw-bold" style={{ fontSize: '14px' }}>
                            {(line.product_type === 'sanitaryware' || line.productType === 'sanitaryware') ? '0.00' : (parseFloat(line.totalBoxes || 0) * parseFloat(line.sqm || 0)).toFixed(2)}
                          </td>
                          <td data-label={`RATE (${formData.currency || 'USD'})`} className="py-2 px-3 text-center border-start align-middle">
                            <Form.Control
                              type="number"
                              step="0.01"
                              value={line.isFoc ? 0 : (line.rate || 0)}
                              onChange={(e) => handleProductChange(index, 'rate', e.target.value)}
                              readOnly={isFormLocked || line.isFoc}
                              className={(isFormLocked || line.isFoc) ? "form-control-sm text-center bg-light border-0 fw-bold" : "form-control-sm text-center fw-bold text-primary"}
                              style={{ width: '100px', margin: '0 auto' }}
                            />
                          </td>
                          <td data-label={`AMOUNT (${formData.currency || 'USD'})`} className="py-2 px-3 text-end text-lg-center border-start align-middle text-primary fw-bold" style={{ fontSize: '14px' }}>
                            {(line.isFoc ? 0 : ((line.product_type === 'sanitaryware' || line.productType === 'sanitaryware') ? (parseFloat(line.totalBoxes || 0) * parseFloat(line.rate || 0)) : (parseFloat(line.totalBoxes || 0) * parseFloat(line.sqm || 0) * parseFloat(line.rate || 0)))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td data-label="NET WT (KG)" className="py-2 px-3 text-end text-lg-center border-start align-middle text-danger fw-bold" style={{ fontSize: '14px' }}>
                            {(parseFloat(line.totalBoxes || 0) * parseFloat(line.weightPerSqm || line.perBoxWeight || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td data-label="GROSS WT (KG)" className="py-2 px-3 text-end text-lg-center border-start align-middle text-danger fw-bold" style={{ fontSize: '14px' }}>
                            {((parseFloat(line.totalBoxes || 0) * parseFloat(line.weightPerSqm || line.perBoxWeight || 0)) + (parseFloat(line.totalPallet || line.pallets || 0) * 20)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td data-label="FOC" className="py-2 px-3 text-center border-start align-middle">
                            <Form.Check
                              type="switch"
                              id={`foc-switch-${index}`}
                              checked={!!line.isFoc}
                              onChange={(e) => handleProductChange(index, 'isFoc', e.target.checked)}
                              disabled={isFormLocked}
                            />
                          </td>
                          <td data-label="ACTIONS" className="py-2 px-3 text-end text-lg-center border-start align-middle">
                            {!isFormLocked && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => setDeleteConfirm({ show: true, index, name: line.product || 'this item' })}
                                className="p-1 border-0 rounded-circle"
                              >
                                <Trash2 size={18} />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL ROW */}
                      <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderTop: '2px solid #dee2e6', borderBottom: '2px solid #dee2e6' }}>
                        <td colSpan="3" className="py-2 px-4 fw-bold text-uppercase" style={{ fontSize: '14px' }}>TOTAL</td>
                        <td data-label="TOTAL PALLETS" className="py-2 px-3 text-end text-lg-center border-start align-middle fw-bold" style={{ fontSize: '14px' }}>
                          {formData.product_lines.reduce((sum, line) => sum + (parseFloat(line.totalPallet || line.pallets || 0) || 0), 0).toFixed(0)}
                        </td>
                        <td data-label="TOTAL QTY (BOXES)" className="py-2 px-3 text-end text-lg-center border-start align-middle fw-bold" style={{ fontSize: '14px' }}>
                          {formData.product_lines.reduce((sum, line) => sum + (parseFloat(line.totalBoxes || line.total_boxes || line.pieces || line.boxes || 0) || 0), 0).toFixed(0)}
                        </td>
                        <td colSpan="2" className="border-start"></td>
                        <td data-label="TOTAL SQM" className="py-2 px-3 text-end text-lg-center border-start align-middle text-primary fw-bold" style={{ fontSize: '14px' }}>
                          {formData.product_lines.reduce((sum, line) => {
                            const isSanitaryware = line.product_type === 'sanitaryware' || line.productType === 'sanitaryware';
                            return sum + (isSanitaryware ? 0 : (parseFloat(line.sqmAuto || line.sqm_auto || 0) || 0));
                          }, 0).toFixed(2)}
                        </td>
                        <td className="border-start"></td>
                        <td data-label="TOTAL AMOUNT" className="py-2 px-3 text-end text-lg-center border-start align-middle text-primary fw-bold" style={{ fontSize: '14px' }}>
                          {formData.product_lines.reduce((sum, line) => sum + (parseFloat(line.amount || 0) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td data-label="TOTAL NET WT (KG)" className="py-2 px-3 text-end text-lg-center border-start align-middle text-danger fw-bold" style={{ fontSize: '14px' }}>
                          {formData.product_lines.reduce((sum, line) => sum + (parseFloat(line.netWeight || line.net_weight || 0) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td data-label="TOTAL GROSS WT (KG)" className="py-2 px-3 text-end text-lg-center border-start align-middle text-danger fw-bold" style={{ fontSize: '14px' }}>
                          {formData.product_lines.reduce((sum, line) => sum + (parseFloat(line.grossWeight || line.gross_weight || 0) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td colSpan="2" className="border-start"></td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan="14" className="py-5 px-3 text-center text-muted fs-6">
                        No product lines inherited from Proforma Invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Mobile View: Product Cards - Simplified & Proper */}
            <div className="d-block d-lg-none p-3 bg-light bg-opacity-50">
              {formData.product_lines && formData.product_lines.length > 0 ? (
                <>
                  {formData.product_lines.map((line, index) => (
                    <Card key={index} className="mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
                      <Card.Header className="bg-primary py-2 px-3 border-0 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <Package size={16} className="text-white me-2" />
                          <span className="fw-bold text-white text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>ITEM #{index + 1}</span>
                        </div>
                        <Button
                          variant="link"
                          className="text-white p-0"
                          onClick={() => setDeleteConfirm({ show: true, index, name: line.product || 'this item' })}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </Card.Header>
                      <Card.Body className="p-3">
                        {/* Product Selection */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="fw-bold small text-muted text-uppercase mb-0" style={{ fontSize: '10px' }}>Material Description</label>
                            <div className="d-flex align-items-center gap-1">
                              <label className="fw-bold small text-muted text-uppercase mb-0" style={{ fontSize: '10px' }}>HSN:</label>
                              {isFormLocked ? (
                                <Form.Control
                                  type="text"
                                  value={line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || ''}
                                  readOnly
                                  className="form-control-sm p-0 px-1 bg-transparent border-0 text-primary fw-bold text-end"
                                  style={{ width: '70px', height: '20px', fontSize: '11px' }}
                                />
                              ) : (
                                <AddableDropdown
                                  value={line.hsnCode || line.hsn_code || line.hsCode || line.hs_code || ''}
                                  onChange={(value) => handleProductChange(index, 'hsnCode', value)}
                                  masterDataType="tariffCodes"
                                  label="HSN Code"
                                  placeholder="Select"
                                  selectClassName="form-control-sm px-1 text-primary fw-bold text-end"
                                  selectStyle={{ width: '80px', height: '22px', fontSize: '10px', padding: '0 2px' }}
                                />
                              )}
                            </div>
                          </div>
                          <div className="fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '14px' }}>{line.product || line.productName}</div>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={line.description || ''}
                            readOnly
                            className="form-control bg-light border-0 small text-muted shadow-none"
                            style={{ borderRadius: '8px', fontSize: '12px', resize: 'none' }}
                          />
                        </div>

                        {/* Specs Grid */}
                        <Row className="g-2 mb-3">
                          {[
                            { label: 'Pallets', value: line.totalPallet || line.pallets || 0, field: 'totalPallet' },
                            { label: 'Boxes', value: line.totalBoxes || 0, field: 'totalBoxes' },
                            { label: 'Wt/Box', value: line.weightPerSqm || line.perBoxWeight || 0, field: 'weightPerSqm', step: '0.01' },
                            { label: 'SQM/Box', value: line.sqm || 0, field: 'sqm', step: '0.0001' }
                          ].map((spec, si) => (
                            <Col xs={6} key={si}>
                              <div className="p-2 bg-light border border-opacity-50 rounded-3 text-center">
                                <label className="text-muted mb-1 d-block" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }}>{spec.label}</label>
                                <Form.Control
                                  type="number"
                                  step={spec.step || '1'}
                                  value={spec.value}
                                  readOnly
                                  className="form-control-sm border-0 bg-transparent fw-bold p-0 text-center shadow-none"
                                  style={{ fontSize: '15px', color: '#334155' }}
                                />
                              </div>
                            </Col>
                          ))}
                        </Row>

                        {/* Calculation Section */}
                        <div className="p-3 bg-primary bg-opacity-10 rounded-3 mb-3 border border-primary border-opacity-10">
                          <Row className="align-items-center">
                            <Col xs={7}>
                              <label className="small text-primary text-uppercase fw-bold mb-1 d-block" style={{ fontSize: '10px' }}>Rate ({formData.currency})</label>
                              <Form.Control
                                type="number"
                                step="0.01"
                                value={line.rate || 0}
                                readOnly
                                className="form-control-sm border-primary border-opacity-25 fw-bold bg-light"
                                style={{ borderRadius: '6px', height: '38px', fontSize: '16px' }}
                              />
                            </Col>
                            <Col xs={5} className="text-end">
                              <label className="small text-primary text-uppercase fw-bold mb-1 d-block" style={{ fontSize: '10px' }}>Total SQM</label>
                              <div className="fw-bold text-dark fs-5">
                                {(line.product_type === 'sanitaryware' || line.productType === 'sanitaryware') ? '0.00' : (parseFloat(line.totalBoxes || 0) * parseFloat(line.sqm || 0)).toFixed(2)}
                              </div>
                            </Col>
                          </Row>
                        </div>

                        {/* Line Amount Footer */}
                        <div className="d-flex justify-content-between align-items-center p-2 bg-primary rounded-3 text-white shadow-sm">
                          <span className="fw-bold text-uppercase" style={{ fontSize: '10px', letterSpacing: '1px' }}>Line Total</span>
                          <span className="fw-bold fs-5">
                            {formData.currency || 'USD'} {(line.isFoc ? 0 : ((line.product_type === 'sanitaryware' || line.productType === 'sanitaryware') ? (parseFloat(line.totalBoxes || 0) * parseFloat(line.rate || 0)) : (parseFloat(line.totalBoxes || 0) * parseFloat(line.sqm || 0) * parseFloat(line.rate || 0)))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}

                  {/* Mobile Summary Card - Simple & Clean */}
                  <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                    <Card.Header className="bg-dark text-white py-2 px-3 border-0">
                      <div className="d-flex align-items-center">
                        <Hash size={16} className="me-2" />
                        <span className="fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Invoice Summary</span>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <Row className="g-2 mb-3">
                        <Col xs={6}>
                          <div className="bg-light p-2 rounded-3 text-center border">
                            <small className="d-block text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '9px' }}>Total Pallets</small>
                            <span className="fw-bold fs-5 text-dark">{formData.pallets}</span>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className="bg-light p-2 rounded-3 text-center border">
                            <small className="d-block text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '9px' }}>Total Boxes</small>
                            <span className="fw-bold fs-5 text-dark">{formData.product_lines.reduce((sum, line) => sum + (parseFloat(line.totalBoxes || 0) || 0), 0)}</span>
                          </div>
                        </Col>
                      </Row>

                      <div className="d-flex justify-content-between align-items-center mb-1 px-1">
                        <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Total SQM:</span>
                        <span className="fw-bold fs-6">{Number(formData.total_sqm || 0).toFixed(2)} m²</span>
                      </div>

                      <Row className="g-2 mb-3">
                        <Col xs={6}>
                          <div className="bg-light p-2 rounded-3 text-center border">
                            <small className="d-block text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '9px' }}>Net Weight</small>
                            <span className="fw-bold fs-6 text-dark">{Number(formData.net_weight || 0).toLocaleString()} <small style={{ fontSize: '9px' }}>kg</small></span>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className="bg-light p-2 rounded-3 text-center border border-danger border-opacity-25">
                            <small className="d-block text-danger text-uppercase fw-bold mb-1" style={{ fontSize: '9px' }}>Gross Weight</small>
                            <span className="fw-bold fs-6 text-danger">{Number(formData.gross_weight || 0).toLocaleString()} <small style={{ fontSize: '9px' }}>kg</small></span>
                          </div>
                        </Col>
                      </Row>

                      <div className="p-3 bg-primary rounded-3 text-white text-center shadow-sm">
                        <small className="d-block opacity-75 text-uppercase fw-bold mb-1" style={{ fontSize: '11px', letterSpacing: '1px' }}>Total Invoice Amount</small>
                        <div className="h2 mb-0 fw-bold">
                          <small className="fs-6 opacity-75 me-1">{formData.currency || 'USD'}</small>
                          {Number(formData.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </>
              ) : (
                <div className="text-center py-5 bg-white rounded-4 border shadow-sm mx-2">
                  <Package size={48} className="text-muted opacity-25 mb-2" />
                  <p className="text-muted mb-0 fw-bold">No items found</p>
                  <small className="text-muted">Add products to see details here</small>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* --- WEIGHT & ACCOUNTING SUMMARY --- */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden ">
          <Card.Header className="bg-primary text-white py-3 d-flex align-items-center justify-content-start">
            <Scale className="me-2 text-white" size={20} />
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">WEIGHT & ACCOUNTING SUMMARY</h6>
          </Card.Header>

          <Card.Body className="p-4 bg-white">
            <Row className="g-4">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Net Weight (KGS)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.net_weight}
                    readOnly
                    className="bg-light border-0 py-2 px-3 border-start border-4 border-info"
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Gross Weight (KGS)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.gross_weight}
                    readOnly
                    className="bg-light border-0 py-2 px-3"
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Total Pallets
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.pallets}
                    readOnly
                    className="bg-light border-0 py-2 px-3"
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Total SQM
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.total_sqm}
                    readOnly
                    className="bg-light border-0 py-2 px-3"
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4 mt-3">
              <Col md={12}>
                <div className="p-3 bg-light rounded-4 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-secondary small fw-bold text-uppercase">Final Invoice Value ({formData.currency || 'USD'})</span>
                    <h3 className="mb-0 fw-bold text-primary mt-1">
                      {formData.total_amount ? Number(formData.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </h3>
                  </div>
                  <CreditCard size={32} className="text-primary opacity-25" />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ===== PACKING DETAILS (READ-ONLY) ===== */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-4 border-primary">
          <Card.Header className="bg-primary text-white py-3 border-0">
            <div className="d-flex align-items-center">
              <FileText size={18} className="me-2" />
              <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Packing Instructions</h6>
            </div>
          </Card.Header>
          <Card.Body className="p-4 bg-white">
            <Row className="g-4">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Pallet Type
                  </Form.Label>
                  <AddableDropdown
                    value={formData.pallet_type}
                    disabled={isFormLocked}
                    onChange={(value) => setFormData({ ...formData, pallet_type: value })}
                    masterDataType="palletTypes"
                    label="Pallet Type"
                    placeholder="Select Pallet Type"
                    className={isFormLocked ? "bg-light border-0" : "form-control"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Tiles Back
                  </Form.Label>
                  <AddableDropdown
                    value={formData.tiles_back}
                    disabled={isFormLocked}
                    onChange={(value) => setFormData({ ...formData, tiles_back: value })}
                    masterDataType="tilesBack"
                    label="Tiles Back"
                    placeholder="Select Tiles Back"
                    className={isFormLocked ? "bg-light border-0" : "form-control"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Boxes Marking
                  </Form.Label>
                  <AddableDropdown
                    value={formData.boxes_marking}
                    disabled={isFormLocked}
                    onChange={(value) => setFormData({ ...formData, boxes_marking: value })}
                    masterDataType="boxesMarking"
                    label="Boxes Marking"
                    placeholder="Select Boxes Marking"
                    className={isFormLocked ? "bg-light border-0" : "form-control"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Box Type
                  </Form.Label>
                  <AddableDropdown
                    value={formData.box_type}
                    disabled={isFormLocked}
                    onChange={(value) => setFormData({ ...formData, box_type: value })}
                    masterDataType="boxTypes"
                    label="Box Type"
                    placeholder="Select Box Type"
                    className={isFormLocked ? "bg-light border-0" : "form-control"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                  {formData.box_type && (
                    <div className="mt-2 d-flex align-items-center">
                      {(() => {
                        const selectedBoxTypeObj = masterData?.boxTypeObjects?.find(b => (b.value || b) === formData.box_type);
                        if (selectedBoxTypeObj?.imageUrl) {
                          return <img src={selectedBoxTypeObj.imageUrl} alt="Box Type" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #dee2e6' }} />;
                        }
                        return <span className="text-muted small" style={{ fontStyle: 'italic' }}>No image available</span>;
                      })()}
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>
            <Row className="g-4 mt-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Fumigation
                  </Form.Label>
                  <Form.Select
                    value={formData.fumigation || 'YES'}
                    disabled={isFormLocked}
                    onChange={(e) => setFormData({ ...formData, fumigation: e.target.value })}
                    className={isFormLocked ? "bg-light border-0 py-2 px-3" : "form-select py-2 px-3"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                    {formData.fumigation && formData.fumigation !== 'YES' && formData.fumigation !== 'NO' && (
                      <option value={formData.fumigation}>{formData.fumigation}</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Legalisation
                  </Form.Label>
                  <Form.Select
                    value={formData.legalisation || 'NO'}
                    disabled={isFormLocked}
                    onChange={(e) => setFormData({ ...formData, legalisation: e.target.value })}
                    className={isFormLocked ? "bg-light border-0 py-2 px-3" : "form-select py-2 px-3"}
                    style={{ borderRadius: '10px', height: '48px' }}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                    {formData.legalisation && formData.legalisation !== 'YES' && formData.legalisation !== 'NO' && (
                      <option value={formData.legalisation}>{formData.legalisation}</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Other Instructions / Specifications
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.other_instructions || ''}
                    disabled={isFormLocked}
                    onChange={(e) => setFormData({ ...formData, other_instructions: e.target.value.toUpperCase() })}
                    className={isFormLocked ? "bg-light border-0 py-2 px-3" : "form-control py-2 px-3"}
                    placeholder="Enter any other specific instructions"
                    style={{ borderRadius: '10px', minHeight: '48px', height: 'auto', resize: 'vertical' }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="g-4 mt-1">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Supply Declaration
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.supply_declaration !== undefined ? formData.supply_declaration : 'SUPPLY MEANT FOR EXPORT WITHOUT PAYMENT OF INTEGRATED TAX UNDER LUT BOND'}
                    disabled={isFormLocked}
                    onChange={(e) => setFormData({ ...formData, supply_declaration: e.target.value.toUpperCase() })}
                    className={isFormLocked ? "bg-light border-0 py-2 px-3 fw-semibold" : "form-control py-2 px-3 fw-semibold"}
                    placeholder="Enter supply declaration text"
                    style={{ borderRadius: '10px', minHeight: '60px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    FTP Incentive Declaration
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.ftp_incentive_declaration !== undefined ? formData.ftp_incentive_declaration : '"I/WE SHALL CLAIM UNDER CHAPTER 3 INCENTIVE OF FTP AS ADMISSIBLE AT TIME POLICY IN FORCE I.E. RODTEP"'}
                    disabled={isFormLocked}
                    onChange={(e) => setFormData({ ...formData, ftp_incentive_declaration: e.target.value.toUpperCase() })}
                    className={isFormLocked ? "bg-light border-0 py-2 px-3 fw-semibold" : "form-control py-2 px-3 fw-semibold"}
                    placeholder="Enter FTP incentive declaration text"
                    style={{ borderRadius: '10px', minHeight: '60px' }}
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
            <Info className="me-2 text-white" size={20} />
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">INVOICE STATUS & PROCESSING</h6>
          </Card.Header>
          <Card.Body className="p-4 bg-white">
            <Row className="g-4 align-items-center">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Current Document Status
                  </Form.Label>
                  <Form.Select
                    value={formData.status || 'Draft'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="bg-light border-0 py-2 px-3 fw-bold text-primary"
                    style={{ borderRadius: '10px', height: '48px' }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Finalized">Finalized</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Converted">Converted</option>
                    <option value="Cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={8}>
                <div className="p-3 bg-light rounded-4 d-flex align-items-center justify-content-center h-100 mt-2">
                  <div className="text-secondary small fst-italic">
                    Note: Finalizing a document locks specific fields for compliance and prevents accidental modifications.
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Bottom Actions Container */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSaving || isFormLocked}
            className="shadow-sm px-4 fw-bold"
            style={{ height: '55px', borderRadius: '12px', minWidth: '160px' }}
          >
            {isSaving ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <Save size={20} className="me-2" /> {isFormLocked ? 'Document Locked' : (formData.id || savedInvoiceId ? 'Update Invoice' : 'Create Invoice')}
              </>
            )}
          </Button>
        </div>

        {/* Activity History */}
        {(formData.id || savedInvoiceId) && (
          <Card className="mt-4 shadow-sm border-0 rounded-4 overflow-hidden mb-5">
            <Card.Header className="bg-light py-3 border-0 d-flex align-items-center">
              <History className="me-2 text-primary" size={20} />
              <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Activity History</h6>
            </Card.Header>
            <Card.Body className="p-0 bg-white">
              <ModuleAuditLog resourceType="export_invoice" resourceId={formData.id || savedInvoiceId} />
            </Card.Body>
          </Card>
        )}
      </Form>
      <ConfirmationModal
        show={deleteConfirm.show}
        title="Delete Product"
        message={`Are you sure you want to delete ${deleteConfirm.name}?`}
        isDangerous={true}
        confirmText="Yes, Delete"
        onConfirm={() => {
          const updated = formData.product_lines.filter((_, i) => i !== deleteConfirm.index);
          setFormData({ ...formData, product_lines: updated });
          showSuccess('Product deleted successfully');
          setDeleteConfirm({ show: false, index: null, name: '' });
        }}
        onCancel={() => setDeleteConfirm({ show: false, index: null, name: '' })}
      />
    </Container>
  );
}

export default ExportInvoiceForm;

