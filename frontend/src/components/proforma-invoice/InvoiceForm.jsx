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

import { generateEnterpriseFilename } from '../../utils/fileNamingUtils';
import { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Form, Alert, Badge, Spinner, Modal, Table, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  ArrowLeft,
  Save,
  Printer,
  FileText,
  Eye,
  Plus,
  Calculator,
  Users,
  Copy,
  AlertCircle,
  History,
  Info,
} from 'lucide-react';
import Button from '../shared/Button.jsx';
import ProductLineTable from '../shared/ProductLineTable.jsx';
import SanitarywareProductLineTable from '../shared/SanitarywareProductLineTable.jsx';
import InvoicePrintView from './InvoicePrintView.jsx';
import ClientForm from '../client-management/ClientForm.jsx';
import DynamicDropdown from '../shared/DynamicDropdown.jsx';
import sanitarywareProductService from '../../services/sanitarywareProductService.js';
import AddableDropdown from '../shared/AddableDropdown.jsx';
import BackButton from '../common/BackButton.jsx';
import ModuleAuditLog from '../shared/ModuleAuditLog.jsx';
import DraftRestoreBanner from '../shared/DraftRestoreBanner.jsx';
import useFormAutosave from '../../hooks/useFormAutosave.js';
import useSmartDefaults from '../../hooks/useSmartDefaults.js';
import { generateInvoiceNumber } from '../../utils/helpers.jsx';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { rateHistoryManager } from '../../utils/helpers.jsx';
import { workflowConnections } from '../../utils/helpers.jsx';
import { deduplicateMasterData } from '../../utils/inputHelpers.js';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from '../shared/NotificationManager.jsx';
import { useClients } from '../../hooks/useClients';
import { useProducts } from '../../hooks/useProducts';
import { useInvoices } from '../../hooks/useInvoices';
import { invoiceService } from '../../services/invoiceService.js';
import { companyService } from '../../services/companyService.js';
import { useUsers } from '../../hooks/useUsers';
import { getDocumentPermissions } from '../../utils/permissionChecks.js';
import { downloadPDF, previewPDF, validatePDFStructure } from '../../utils/pdfGenerator.js';
import { formatDateForInput } from '../../utils/formatters.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { extractValidationErrors } from '../../utils/validationHelper.js';
import {
  getAllCurrencies,
  getAllPorts,
  getPortsOfLoading,
  getPortsOfDischarge,
  getAllPalletTypes,
  getAllTilesBack,
  getAllBoxesMarking,
  getAllBoxTypes,
  getAllCatalogues,
  getAllSizes,
  getAllSurfaces,
  getAllThickness,
  getAllApplications,
  getAllFactories,
  getAllCountries,
  getAllShippingLines,
  getAllFinalDestinations,
  getDeliveryTerms,
  getPaymentTerms,
  getAllTariffCodes,
  createMasterData
} from '../../services/masterDataService.js';

/**
 * Enhanced Proforma Invoice Form Component
 * Features:
 * - Professional UI with improved layout
 * - Real-time calculations and validations
 * - Auto-fill from client data
 * - Rate history management
 * - Visual product selection
 * - Responsive design
 */
const getInitialFormState = () => ({
  invoiceNo: '',
  date: new Date().toLocaleDateString('en-CA'),
  client: '',
  country: '',
  consignee: '',
  buyer: '',
  portOfLoading: '',
  portOfDischarge: '',
  finalDestination: '',
  currency: 'USD ($)',
  blNo: '',
  blDate: '',
  sbNo: '',
  sbDate: '',
  buyerOrderNo: '',
  buyerOrderDate: '',
  vesselFlightNo: '',
  preCarriageBy: '',
  placeOfReceipt: '',
  lcNumber: '',
  lcDate: '',
  epcgNo: '',
  paymentTerms: '',
  deliveryTerms: '',
  tariffCode: '',
  productLines: [],
  palletType: '',
  tilesBack: '',
  boxesMarking: '',
  boxType: '',
  fumigation: 'YES',
  legalisation: 'YES',
  otherInstructions: '',
  totalAmount: 0,
  status: 'Draft',
});

import { currencies as DEFAULT_CURRENCIES } from '../../utils/clientConfig.js';

function InvoiceForm({ invoice, onBack = () => { }, onNavigate, currentUser, invoicesData, productsData, clientsData }) {
  const printRef = useRef();

  // Get invoice from either props or navigation data (for edit functionality)
  const [invoiceToEdit, setInvoiceToEdit] = useState(invoice || null);

  useEffect(() => {
    // Check sessionStorage for navigation data (when Edit button is clicked)
    const navigationDataStr = sessionStorage.getItem('navigationData');
    if (navigationDataStr) {
      try {
        const navigationData = JSON.parse(navigationDataStr);
        if (navigationData.invoice) {
          setInvoiceToEdit(navigationData.invoice);
          // Clear the navigation data after reading it
          sessionStorage.removeItem('navigationData');
        }
      } catch (error) {
        console.error('Error reading navigation data:', error);
      }
    }
  }, []);

  // Use props if provided, otherwise call hooks (for backward compatibility)
  const productsHook = useProducts();
  const clientsHook = useClients();
  const invoicesHook = useInvoices();
  const usersHook = useUsers();
  const { getNextInvoiceNumber } = useDocumentNumber();

  const { products, createProduct, loading: productsLoading, error: productsError } = productsData || productsHook;
  const { clients, loading: clientsLoading, error: clientsError, createClient } = clientsData || clientsHook;
  const { invoices, createInvoice, updateInvoice } = invoicesData || invoicesHook;
  const { users } = usersHook;
  const [showPrintView, setShowPrintView] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState(getInitialFormState());
  const [tcInput, setTcInput] = useState('');
  const [tcOpen, setTcOpen] = useState(false);
  const [swProducts, setSwProducts] = useState([]);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionHistory, setRevisionHistory] = useState([]);
  const [errors, setErrors] = useState({});

  // Auto-save draft (only for NEW invoices — editing existing ones is auto-persisted to DB)
  const draftKey = invoiceToEdit ? null : 'proforma_invoice_new';
  const { hasDraft, clearDraft, restoreDraft, lastSaved } = useFormAutosave(
    draftKey || 'proforma_invoice_new',
    draftKey ? formData : null, // Don't save when editing
    15000 // Save every 15 seconds
  );

  // Smart defaults — remember last-used preferences
  const { getDefault: getInvoiceDefaults, saveDefaults: saveInvoiceDefaults } = useSmartDefaults('proforma_invoice');

  // On first mount for a new invoice, pre-fill smart defaults
  const smartDefaultsApplied = useRef(false);
  useEffect(() => {
    if (!invoiceToEdit && !smartDefaultsApplied.current) {
      smartDefaultsApplied.current = true;
      const defaults = getInvoiceDefaults();
      if (defaults) {
        setFormData(prev => ({
          ...prev,
          currency: defaults.currency || prev.currency,
          portOfLoading: defaults.portOfLoading || prev.portOfLoading,
          deliveryTerms: defaults.deliveryTerms || prev.deliveryTerms,
          paymentTerms: defaults.paymentTerms || prev.paymentTerms,
        }));
      }
    }
  }, [invoiceToEdit, getInvoiceDefaults]);

  useEffect(() => {
    const fetchRevisions = async () => {
      if (invoiceToEdit && invoiceToEdit.id) {
        try {
          const response = await invoiceService.getRevisions(invoiceToEdit.id);
          if (response.data.success) {
            setRevisionHistory(response.data.data);
          }
        } catch (err) {
          console.error('Error fetching revisions:', err);
        }
      }
    };
    fetchRevisions();
  }, [invoiceToEdit]);

  const permissions = getDocumentPermissions(currentUser);
  const isDocumentLocked = formData.status === 'Locked' || (formData.status === 'Approved' && !['super_admin', 'company_admin'].includes(currentUser?.role));

  const loading = productsLoading || clientsLoading;
  const error = productsError || clientsError;

  const getCurrencySymbol = (currency) => {
    try {
      if (!currency) return '$';
      const code = String(currency).includes('(') ? String(currency).split(' ')[0].trim() : String(currency).trim();

      // Try to find in DEFAULT_CURRENCIES
      const found = DEFAULT_CURRENCIES.find(c =>
        c.code === code ||
        String(currency).includes(c.code) ||
        String(currency).includes(c.symbol)
      );
      if (found) return found.symbol;

      // Fallbacks
      if (code.toUpperCase() === 'INR') return '₹';
      if (code.toUpperCase() === 'USD') return '$';
      if (code.toUpperCase() === 'EUR') return '€';
      if (code.toUpperCase() === 'GBP') return '£';

      return '$';
    } catch (e) {
      return '$';
    }
  };

  /**
   * Helper to match currency codes to full labels (e.g., 'USD' -> 'USD ($)')
   */
  const normalizeCurrency = (currencyValue) => {
    if (!currencyValue) return 'USD ($)';

    const val = String(currencyValue).trim();

    // If it's already in the long format, return as is
    if (val.includes('(')) return val;

    // Try to find matching option in masterData.currencies
    if (masterData.currencies.length > 0) {
      const match = masterData.currencies.find(c => String(c).startsWith(val));
      if (match) return match;
    }

    // Check default labels
    const labels = {
      'USD': 'USD ($)',
      'EUR': 'EUR (€)',
      'INR': 'INR (₹)',
      'GBP': 'GBP (£)'
    };

    return labels[val.toUpperCase()] || val;
  };

  const currencySymbol = getCurrencySymbol(formData.currency);

  // Master data for dynamic dropdowns — all fetched from API
  const [masterData, setMasterData] = useState({
    currencies: [],
    countries: [],
    ports: [],
    portsOfLoading: [],
    portsOfDischarge: [],
    destinations: [],
    shippingLines: [],
    palletTypes: [],
    tilesBack: [],
    boxesMarking: [],
    boxTypes: [],
    catalogueNames: [],
    sizes: [],
    surfaces: [],
    thickness: [],
    applications: [],
    factoryNames: [],
    deliveryTerms: [],
    paymentTerms: [],
    tariffCodes: [],
  });

  useEffect(() => {
    const fetchTariffCodes = async () => {
      try {
        const codes = await getAllTariffCodes();
        if (codes && codes.length > 0) {
          const mappedCodes = codes.map(item =>
            typeof item === 'string' ? item : (item.value || item.name)
          );
          setMasterData(prev => ({ ...prev, tariffCodes: mappedCodes }));
        }
      } catch (err) {
        console.error('Failed to fetch tariff codes:', err);
      }
    };
    fetchTariffCodes();
  }, []);

  /**
   * Transform snake_case data to camelCase
   */
  const transformSnakeToCamel = (obj) => {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => transformSnakeToCamel(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const transformed = {};
      for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        transformed[camelKey] = transformSnakeToCamel(value);
      }
      return transformed;
    }

    return obj;
  };

  /**
   * Initialize form data
   */
  useEffect(() => {
    const initializeForm = async () => {
      const initialState = getInitialFormState();

      // Fetch sanitaryware products first so they are available for mapping
      let localSwProducts = [];
      try {
        const swResponse = await sanitarywareProductService.getProducts();
        localSwProducts = Array.isArray(swResponse) ? swResponse : [];
        setSwProducts(localSwProducts);
      } catch (swErr) {
        console.error('Error fetching sanitaryware data in initializeForm:', swErr);
      }

      if (invoiceToEdit) {
        // Handle skeletal invoice object passed from search results
        let currentInvoice = invoiceToEdit;
        if (invoiceToEdit.id && !invoiceToEdit.client && !invoiceToEdit.client_name && invoices && invoices.length > 0) {
          const found = invoices.find(i => i.id === invoiceToEdit.id || i._id === invoiceToEdit.id);
          if (found) {
            currentInvoice = found;
          }
        }

        // Transform snake_case fields to camelCase (from database/API)
        const transformed = transformSnakeToCamel(currentInvoice);

        const rawLines = Array.isArray(transformed?.productLines)
          ? transformed.productLines
          : Array.isArray(currentInvoice?.product_lines)
            ? transformSnakeToCamel(currentInvoice.product_lines)
            : typeof currentInvoice?.product_lines === 'string'
              ? transformSnakeToCamel(JSON.parse(currentInvoice.product_lines || '[]'))
              : [];

        // Normalize product lines
        const normalizedLines = rawLines.map(line => {
          const normalized = { ...line };
          // Ensure we have a product type set
          const allProducts = [...(products || []), ...localSwProducts];
          const productMaster = allProducts.find(p => p && p.name === (normalized.product || normalized.productName));
          const isSanitarywareMaster = localSwProducts.some(p => p && p.name === (normalized.product || normalized.productName));

          normalized.productType = normalized.productType || normalized.product_type || (isSanitarywareMaster ? 'sanitaryware' : 'tile');
          normalized.product_type = normalized.productType;

          if (productMaster) {
            if (!normalized.description && productMaster.description) normalized.description = productMaster.description;
            if (!normalized.category && productMaster.category) normalized.category = productMaster.category;
            if (!normalized.size && (productMaster.size || productMaster.dimensions)) normalized.size = productMaster.size || productMaster.dimensions;
            if (!normalized.surface && (productMaster.surface || productMaster.finish)) normalized.surface = productMaster.surface || productMaster.finish;

            if (normalized.productType === 'sanitaryware') {
              normalized.boxWeight = normalized.boxWeight || normalized.box_weight || normalized.weightPerSqm || normalized.perBoxWeight || parseFloat(productMaster.boxWeight || productMaster.box_weight || productMaster.weightPerSqm || productMaster.perBoxWeight || 0);
              normalized.box_weight = normalized.boxWeight;
              normalized.perBoxWeight = normalized.boxWeight;
              normalized.weightPerSqm = normalized.boxWeight;
              normalized.pieces = normalized.pieces || normalized.totalBoxes || 0;
            } else {
              if ((!normalized.sqm || parseFloat(normalized.sqm || 0) === 0) && (productMaster.sqmPerBox || productMaster.sqm || productMaster.sqm_per_box)) {
                normalized.sqm = parseFloat(productMaster.sqmPerBox || productMaster.sqm || productMaster.sqm_per_box || 0);
              }
              if ((!normalized.weightPerSqm || parseFloat(normalized.weightPerSqm || 0) === 0) && (productMaster.weightPerSqm || productMaster.perBoxWeight || productMaster.weight_per_sqm)) {
                normalized.weightPerSqm = parseFloat(productMaster.weightPerSqm || productMaster.perBoxWeight || productMaster.weight_per_sqm || 0);
              }
            }
          }

          return normalized;
        });

        // Merge invoice data with initial state to prevent undefined values
        setFormData({
          ...initialState,
          ...transformed,
          date: formatDateForInput(transformed?.date || currentInvoice?.date),
          // Ensure critical fields are never undefined
          buyerOrderNo: transformed?.buyerOrderNo || currentInvoice?.buyer_order_no || '',
          buyerOrderDate: formatDateForInput(transformed?.buyerOrderDate || currentInvoice?.buyer_order_date),
          blNo: transformed?.blNo || currentInvoice?.bl_no || '',
          blDate: formatDateForInput(transformed?.blDate || currentInvoice?.bl_date),
          sbNo: transformed?.sbNo || currentInvoice?.sb_no || '',
          sbDate: formatDateForInput(transformed?.sbDate || currentInvoice?.sb_date),
          vesselFlightNo: transformed?.vesselFlightNo || currentInvoice?.vessel_flight_no || '',
          preCarriageBy: transformed?.preCarriageBy || currentInvoice?.pre_carriage_by || '',
          placeOfReceipt: transformed?.placeOfReceipt || currentInvoice?.place_of_receipt || '',
          lcNumber: transformed?.lcNumber || currentInvoice?.lc_number || '',
          lcDate: formatDateForInput(transformed?.lcDate || currentInvoice?.lc_date),
          epcgNo: transformed?.epcgNo || currentInvoice?.epcg_no || '',
          paymentTerms: transformed?.paymentTerms || currentInvoice?.payment_terms || '',
          deliveryTerms: transformed?.deliveryTerms || currentInvoice?.delivery_terms || '',
          tariffCode: transformed?.tariffCode || currentInvoice?.tariff_code || '',
          consignee: transformed?.consigneeDetails || currentInvoice?.consignee_details || '',
          buyer: transformed?.buyerDetails || currentInvoice?.buyer_details || '',
          palletType: transformed?.palletType || currentInvoice?.pallet_type || '',
          tilesBack: transformed?.tilesBack || currentInvoice?.tiles_back || '',
          boxesMarking: transformed?.boxesMarking || currentInvoice?.boxes_marking || '',
          boxType: transformed?.boxType || currentInvoice?.box_type || '',
          finalDestination: transformed?.finalDestination || currentInvoice?.final_destination || '',
          otherInstructions: transformed?.otherInstructions || currentInvoice?.other_instructions || '',
          totalAmount: transformed?.totalAmount ?? currentInvoice?.total_amount ?? 0,
          productLines: normalizedLines,
          // Handle client data
          client: transformed?.clientName || currentInvoice?.client_name || '',
          clientId: transformed?.clientId || currentInvoice?.client_id || '',
          fumigation: transformed?.fumigation || currentInvoice?.fumigation || 'YES',
          legalisation: transformed?.legalisation || currentInvoice?.legalisation || 'YES',
          currency: transformed?.currency || currentInvoice?.currency || '',
        });

        // Sync master data options
        const fetchedBoxesMarking = transformed?.boxesMarking || currentInvoice?.boxes_marking;
        const fetchedBoxType = transformed?.boxType || currentInvoice?.box_type;

        if (fetchedBoxesMarking || fetchedBoxType) {
          setMasterData(prev => {
            const newState = { ...prev };
            let changed = false;

            if (fetchedBoxesMarking && !prev.boxesMarking.includes(fetchedBoxesMarking)) {
              newState.boxesMarking = [...prev.boxesMarking, fetchedBoxesMarking];
              changed = true;
            }
            if (fetchedBoxType && !prev.boxTypes.includes(fetchedBoxType)) {
              newState.boxTypes = [...prev.boxTypes, fetchedBoxType];
              changed = true;
            }

            return changed ? newState : prev;
          });
        }
      } else {
        // Fetch next invoice number from backend for new invoice
        const nextNumber = await getNextInvoiceNumber();
        setFormData({
          ...initialState,
          invoiceNo: nextNumber,
        });
      }
    };

    // Only initialize if we haven't already or if invoiceToEdit has changed
    // This prevents form resets when the background invoices list updates
    initializeForm();
  }, [invoiceToEdit, getNextInvoiceNumber]);

  // Fetch company info for new invoices or if missing
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        if (!formData.company_info && currentUser?.company_id) {
          const response = await companyService.getById(currentUser.company_id);
          if (response.data.success && response.data.data) {
            setFormData(prev => ({
              ...prev,
              company_info: response.data.data
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching company info for preview:', error);
      }
    };

    fetchCompanyInfo();
  }, [currentUser?.company_id, formData.id]);

  // Robust synchronization for Terms and Conditions
  // Ensures custom values (e.g. from Edit mode or external data) are added to dropdown options
  useEffect(() => {
    const fieldsToSync = [
      { value: formData.palletType, key: 'palletTypes', list: masterData.palletTypes },
      { value: formData.tilesBack, key: 'tilesBack', list: masterData.tilesBack },
      { value: formData.boxesMarking, key: 'boxesMarking', list: masterData.boxesMarking },
      { value: formData.boxType, key: 'boxTypes', list: masterData.boxTypes }
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
  }, [formData.palletType, formData.tilesBack, formData.boxesMarking, formData.boxType]);

  // Fetch currencies, ports, and destinations from master data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [
          currenciesData,
          portsData,
          polData,
          podData,
          palletData,
          tilesBackData,
          boxesMarkingData,
          boxTypesData,
          cataloguesData,
          sizesData,
          surfacesData,
          thicknessData,
          applicationsData,
          factoriesData,
          deliveryTermsData,
          paymentTermsData,
          tariffCodesData,
          finalDestinationsData,
          shippingLinesData,
          countriesData
        ] = await Promise.all([
          getAllCurrencies().catch(() => []),
          getAllPorts().catch(() => []),
          getPortsOfLoading().catch(() => []),
          getPortsOfDischarge().catch(() => []),
          getAllPalletTypes().catch(() => []),
          getAllTilesBack().catch(() => []),
          getAllBoxesMarking().catch(() => []),
          getAllBoxTypes().catch(() => []),
          getAllCatalogues().catch(() => []),
          getAllSizes().catch(() => []),
          getAllSurfaces().catch(() => []),
          getAllThickness().catch(() => []),
          getAllApplications().catch(() => []),
          getAllFactories().catch(() => []),
          getDeliveryTerms().catch(() => []),
          getPaymentTerms().catch(() => []),
          getAllTariffCodes().catch(() => []),
          getAllFinalDestinations().catch(() => []),
          getAllShippingLines().catch(() => []),
          getAllCountries().catch(() => [])
        ]);

        // Build destinations from finalDestinations API + client countries as fallback
        const clientDestinations = clients?.length > 0
          ? [...new Set(clients.map(c => c.country).filter(Boolean))]
          : [];
        const apiDestinations = Array.isArray(finalDestinationsData) && finalDestinationsData.length > 0
          ? finalDestinationsData.map(d => d.value || d.destination || d)
          : [];

        setMasterData(prev => ({
          ...prev,
          currencies: deduplicateMasterData(Array.isArray(currenciesData) && currenciesData.length > 0 ? currenciesData.map(c => c.value || c) : prev.currencies),
          ports: deduplicateMasterData(Array.isArray(portsData) && portsData.length > 0 ? portsData.map(p => p.portName || p.value || p) : prev.ports),
          portsOfLoading: deduplicateMasterData(Array.isArray(polData) && polData.length > 0 ? polData.map(p => p.portName || p.value || p) : []),
          portsOfDischarge: deduplicateMasterData(Array.isArray(podData) && podData.length > 0 ? podData.map(p => p.portName || p.value || p) : []),
          destinations: deduplicateMasterData([...apiDestinations, ...clientDestinations, ...prev.destinations]),
          shippingLines: deduplicateMasterData(Array.isArray(shippingLinesData) && shippingLinesData.length > 0 ? shippingLinesData.map(s => s.value || s) : []),
          countries: deduplicateMasterData(Array.isArray(countriesData) && countriesData.length > 0 ? countriesData.map(c => c.countryName || c.value || c) : prev.countries),
          palletTypes: deduplicateMasterData(Array.isArray(palletData) && palletData.length > 0 ? palletData.map(p => p.value || p) : prev.palletTypes),
          tilesBack: deduplicateMasterData(Array.isArray(tilesBackData) && tilesBackData.length > 0 ? tilesBackData.map(p => p.value || p) : prev.tilesBack),
          boxesMarking: deduplicateMasterData(Array.isArray(boxesMarkingData) && boxesMarkingData.length > 0 ? boxesMarkingData.map(p => p.value || p) : prev.boxesMarking),
          boxTypes: deduplicateMasterData(Array.isArray(boxTypesData) && boxTypesData.length > 0 ? boxTypesData.map(p => p.value || p) : prev.boxTypes),
          boxTypeObjects: Array.isArray(boxTypesData) ? boxTypesData : prev.boxTypeObjects || [],
          catalogueNames: deduplicateMasterData(Array.isArray(cataloguesData) && cataloguesData.length > 0 ? cataloguesData.map(c => c.value || c) : []),
          sizes: deduplicateMasterData(Array.isArray(sizesData) && sizesData.length > 0 ? sizesData.map(s => s.value || s) : []),
          surfaces: deduplicateMasterData(Array.isArray(surfacesData) && surfacesData.length > 0 ? surfacesData.map(s => s.value || s) : []),
          thickness: deduplicateMasterData(Array.isArray(thicknessData) && thicknessData.length > 0 ? thicknessData.map(t => t.value || t) : []),
          applications: deduplicateMasterData(Array.isArray(applicationsData) && applicationsData.length > 0 ? applicationsData.map(a => a.value || a) : []),
          factoryNames: deduplicateMasterData(Array.isArray(factoriesData) && factoriesData.length > 0 ? factoriesData.map(f => f.value || f) : []),
          deliveryTerms: deduplicateMasterData(Array.isArray(deliveryTermsData) && deliveryTermsData.length > 0 ? deliveryTermsData.map(d => d.value || d) : prev.deliveryTerms),
          paymentTerms: deduplicateMasterData(Array.isArray(paymentTermsData) && paymentTermsData.length > 0 ? paymentTermsData.map(p => p.value || p) : prev.paymentTerms),
          tariffCodes: deduplicateMasterData(Array.isArray(tariffCodesData) && tariffCodesData.length > 0 ? tariffCodesData.map(t => t.value || t) : prev.tariffCodes)
        }));
      } catch (error) {
        console.error('Error fetching master data:', error);
      }

      try {
        const swResponse = await sanitarywareProductService.getProducts();
        setSwProducts(Array.isArray(swResponse) ? swResponse : []);
      } catch (swErr) {
        console.error('Error fetching sanitaryware data:', swErr);
      }
    };
    fetchMasterData();
  }, [clients]);

  /**
   * Handle input changes with validation
   */
  const handleInputChange = (field, value) => {
    if (isDocumentLocked) return;
    const updatedValue = value;

    if (field === 'palletType' && value === 'Without Pallet') {
      setFormData((prev) => ({
        ...prev,
        [field]: updatedValue,
        fumigation: 'NO',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: updatedValue,
      }));
    }
  };

  /**
   * Handle product lines changes with auto-calculation
   */
  const handleProductLinesChange = (productLines) => {
    if (isDocumentLocked) return;
    const totalAmount = productLines.reduce(
      (sum, line) => {
        const val = Number(line.amount);
        return sum + (Number.isFinite(val) ? val : 0);
      },
      0
    );

    setFormData((prev) => ({
      ...prev,
      productLines,
      totalAmount,
    }));
  };

  /**
   * Handle client selection with auto-fill
   */
  const handleClientChange = (clientName) => {
    const selectedClient = clients.find((client) => client.clientName === clientName);
    if (selectedClient) {
      // Auto-fill all client-related fields
      setFormData((prev) => ({
        ...prev,
        client: clientName,
        clientId: selectedClient.id,
        country: selectedClient.country,
        consignee: selectedClient.consigneeDetails || '',
        buyer: selectedClient.buyerDetails || '',
        portOfLoading: selectedClient.portOfLoading || '',
        portOfDischarge: selectedClient.portOfDischarge || '',
        finalDestination:
          selectedClient.finalDestination || selectedClient.country,
        currency: normalizeCurrency(selectedClient.currency || 'USD'),
      }));

      showSuccess(`Client data auto-filled for ${clientName}`);
    } else {
      handleInputChange('client', clientName);
    }
  };

  /**
   * Handle new client addition
   */
  const handleCreateClient = async (clientData) => {
    try {
      // Add the client via the API - ClientForm sends snake_case from dataToSubmit
      const newClient = await createClient({
        client_name: clientData.client_name,
        country: clientData.country,
        city: clientData.city || '',
        email_id: clientData.email_id,
        contact_number: clientData.contact_number,
        address: clientData.address || '',
        status: clientData.status || 'Active',
        contact_person_name: clientData.contact_person_name || '',
        business_type: clientData.business_type || '',
        consignee_details: clientData.consignee_details || '',
        buyer_details: clientData.buyer_details || '',
        port_of_loading: clientData.port_of_loading || '',
        port_of_discharge: clientData.port_of_discharge || '',
        final_destination: clientData.final_destination || '',
        currency: clientData.currency || 'USD ($)',
        assigned_salesperson: clientData.assigned_salesperson || null,
        credit_days: clientData.credit_days || 0,
        notes: clientData.notes || null,
      });

      // Auto-select the new client in the form
      setFormData((prev) => ({
        ...prev,
        client: newClient?.clientName || clientData.client_name,
        clientId: newClient?.id,
        country: newClient?.country || clientData.country,
        consignee: newClient?.consigneeDetails || clientData.consignee_details || '',
        buyer: newClient?.buyerDetails || clientData.buyer_details || '',
        portOfLoading: newClient?.portOfLoading || clientData.port_of_loading || '',
        portOfDischarge: newClient?.portOfDischarge || clientData.port_of_discharge || '',
        finalDestination: newClient?.finalDestination || clientData.final_destination || '',
        currency: newClient?.currency || clientData.currency || 'USD ($)',
      }));

      setShowClientModal(false);
      showSuccess(`New client ${newClient?.clientName || clientData.client_name} added and selected`);
    } catch (error) {
      console.error('Error adding client:', error);
      showError('Failed to add client. Please try again.');
    }
  };

  /**
   * Handle master data additions
   */
  /**
   * Handle master data additions with validation and persistence
   */
  const handleMasterDataAdd = async (field, newValue) => {
    if (!newValue || typeof newValue !== 'string' || !newValue.trim()) return;
    const trimmedValue = newValue.trim();
    const currentList = masterData[field] || [];

    // Check if it already exists in the current list to avoid UI duplicates
    if (currentList.some(item => {
      const val = typeof item === 'object' ? (item.value || item.name || item.portName || item.term || item.code) : item;
      return String(val).toLowerCase() === trimmedValue.toLowerCase();
    })) {
      showError(`"${trimmedValue}" already exists in ${field}`);
      return;
    }

    // Special validation for thickness if applicable
    if (field === 'thickness' || field === 'thicknesses') {
      const thicknessError = (val) => {
        if (!val) return 'Value is required';
        if (!/^\d+(\.\d+)?\s*(mm|cm|in)?$/i.test(val)) {
          return 'Please enter a valid thickness (e.g., 9 mm or 12)';
        }
        return null;
      };
      const error = thicknessError(trimmedValue);
      if (error) {
        showError(`Invalid thickness: ${error}`);
        return;
      }
    }

    try {
      // PERSIST: Call the API to save new master data permanently
      await createMasterData(field, trimmedValue);

      // Also save to general ports if it's a specific port type
      if (field === 'portsOfLoading' || field === 'portsOfDischarge') {
        try {
          await createMasterData('ports', trimmedValue);
        } catch (e) {
          // Ignore duplicate errors for general ports
          console.warn('Could not add to general ports:', e);
        }
      }

      setMasterData((prev) => {
        const newState = { ...prev };
        newState[field] = [...(prev[field] || []), trimmedValue];

        if (field === 'portsOfLoading' || field === 'portsOfDischarge') {
          if (!prev.ports?.includes(trimmedValue)) {
            newState.ports = [...(prev.ports || []), trimmedValue];
          }
        }

        return newState;
      });

      showSuccess(`${trimmedValue} added to ${field} permanently`);
    } catch (error) {
      console.error(`Error adding ${field}:`, error);

      // If it's a 409 (Conflict), it means it exists in DB but maybe not in local list
      if (error.response?.status === 409) {
        showInfo(`"${trimmedValue}" already exists in ${field}`);

        // Add to local list anyway if not already there
        setMasterData((prev) => {
          const currentList = prev[field] || [];
          if (!currentList.includes(trimmedValue)) {
            return {
              ...prev,
              [field]: [...currentList, trimmedValue],
            };
          }
          return prev;
        });
        return;
      }

      showError(`Failed to save ${trimmedValue} to database. It will only be available for this session.`);

      // Fallback: Add to local state even if API fails
      setMasterData((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), trimmedValue],
      }));
    }
  };

  /**
   * Validate form before saving
   */
  const validateForm = () => {
    const newErrors = {};
    const errorMsgs = [];

    if (!formData.client) {
      newErrors.client = 'Client selection is required';
      errorMsgs.push(newErrors.client);
    }
    if (!formData.country) {
      newErrors.country = 'Country is required';
      errorMsgs.push(newErrors.country);
    }
    if (formData.productLines.length === 0) {
      errorMsgs.push('At least one product line is required');
    }
    if (!formData.portOfDischarge) {
      newErrors.portOfDischarge = 'Port of discharge is required';
      errorMsgs.push(newErrors.portOfDischarge);
    }
    if (!formData.portOfLoading?.trim()) {
      newErrors.portOfLoading = 'Port of Loading is required';
      errorMsgs.push(newErrors.portOfLoading);
    }
    if (!formData.finalDestination?.trim()) {
      newErrors.finalDestination = 'Final Destination is required';
      errorMsgs.push(newErrors.finalDestination);
    }
    if (!formData.paymentTerms?.trim()) {
      newErrors.paymentTerms = 'Payment Terms are required';
      errorMsgs.push(newErrors.paymentTerms);
    }
    if (!formData.deliveryTerms?.trim()) {
      newErrors.deliveryTerms = 'Delivery Terms are required';
      errorMsgs.push(newErrors.deliveryTerms);
    }
    if (!formData.tariffCode?.trim()) {
      newErrors.tariffCode = 'Tariff Code is required';
      errorMsgs.push(newErrors.tariffCode);
    }
    if (!formData.consignee?.trim()) {
      newErrors.consignee = 'Consignee Details are required';
      errorMsgs.push(newErrors.consignee);
    }
    if (!formData.buyer?.trim()) {
      newErrors.buyer = 'Buyer Details are required';
      errorMsgs.push(newErrors.buyer);
    }
    if (!formData.palletType) {
      newErrors.palletType = 'Pallet Type is required';
      errorMsgs.push(newErrors.palletType);
    }
    if (!formData.tilesBack) {
      newErrors.tilesBack = 'Tiles Back is required';
      errorMsgs.push(newErrors.tilesBack);
    }
    if (!formData.boxesMarking) {
      newErrors.boxesMarking = 'Boxes Marking is required';
      errorMsgs.push(newErrors.boxesMarking);
    }
    if (!formData.boxType) {
      newErrors.boxType = 'Box Type is required';
      errorMsgs.push(newErrors.boxType);
    }
    if (!formData.fumigation) {
      newErrors.fumigation = 'Fumigation is required';
      errorMsgs.push(newErrors.fumigation);
    }
    if (!formData.legalisation) {
      newErrors.legalisation = 'Legalisation is required';
      errorMsgs.push(newErrors.legalisation);
    }

    setErrors(newErrors);
    return errorMsgs;
  };

  /**
   * Display validation errors to user
   */
  const showValidationError = (errors) => {
    const errorMessage = errors.join('\n• ');
    showError(`Please fix the following errors:\n• ${errorMessage}`);
  };

  const isFormValid = () => {
    return formData.client &&
      formData.country &&
      formData.portOfLoading &&
      formData.portOfDischarge &&
      formData.finalDestination &&
      formData.palletType &&
      formData.tilesBack &&
      formData.boxesMarking &&
      formData.boxType &&
      formData.fumigation &&
      formData.legalisation &&
      formData.productLines.length > 0;
  };

  /**
   * Handle form save with validation
   */
  const handleSave = async (reason = null) => {
    if (isDocumentLocked) {
      showError(`This document is ${formData.status} and cannot be edited.`);
      return;
    }

    if (!permissions.canEdit) {
      showError('You do not have permission to save invoices. Only super_admin and company_admin users can edit documents.');
      return;
    }

    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      scrollToFirstError();
      showError('Please fix the highlighted mandatory fields.');
      return;
    }

    // Additional validation for product images
    const productsWithoutImages = formData.productLines.filter((line) => {
      const product = products.find(
        (p) => p.name === line.product
      );
      return !product?.images || product.images.length === 0;
    });

    if (productsWithoutImages.length > 0) {
      showWarning(
        `Warning: ${productsWithoutImages.length} products missing images. Consider adding images for better visual identification.`
      );
    }

    // Validate that all product lines have required fields
    const lineErrors = [];
    formData.productLines.forEach((line, index) => {
      if (!line.product) {
        lineErrors.push(`Product line ${index + 1}: Product is required`);
      }
      // Allow rate=0 for sanitaryware lines (priced per piece) and FOC tile lines
      const isSanitaryware = line.product_type === 'sanitaryware';
      const isFoc = line.isFoc || line.is_foc;
      const rate = parseFloat(line.rate);
      if (!isSanitaryware && !isFoc && (line.rate === undefined || line.rate === null || line.rate === '' || isNaN(rate) || rate < 0)) {
        lineErrors.push(`Product line ${index + 1}: Rate is required and must be >= 0`);
      }
    });

    if (lineErrors.length > 0) {
      showError(`Please fix the following errors:\n${lineErrors.join('\n')}`);
      return;
    }

    if (invoiceToEdit && invoiceToEdit.id && (typeof reason !== 'string' || !reason.trim())) {
      setShowRevisionModal(true);
      return;
    }

    setIsLoading(true);

    try {
      // Calculate pallets and total SQM from product lines
      const totalPallets = formData.productLines.reduce(
        (sum, line) => sum + (parseInt(line.totalPallet || line.pallets) || 0),
        0
      );
      const totalSQM = formData.productLines.reduce(
        (sum, line) => sum + (parseFloat(line.sqmAuto) || parseFloat(line.sqm) || 0),
        0
      );

      // Transform product lines to include product_name field required by backend
      const transformedProductLines = formData.productLines.map((line) => ({
        ...line,
        productName: line.product, // Include product_name for backend validation
        rate: parseFloat(line.rate),
        amount: parseFloat(line.amount),
      }));

      // Prepare invoice data - API interceptor will transform camelCase to snake_case
      const invoiceData = {
        date: formData.date,
        clientId: formData.clientId,
        clientName: formData.client,
        country: formData.country,
        // Ensure invoiceNo (primary key) never changes on edit
        invoiceNo: invoiceToEdit ? (invoiceToEdit.invoiceNo || invoiceToEdit.invoice_no || formData.invoiceNo) : formData.invoiceNo,
        blNo: formData.blNo,
        blDate: formData.blDate,
        sbNo: formData.sbNo,
        sbDate: formData.sbDate,
        buyerOrderNo: formData.buyerOrderNo,
        buyerOrderDate: formData.buyerOrderDate,
        vesselFlightNo: formData.vesselFlightNo,
        preCarriageBy: formData.preCarriageBy,
        placeOfReceipt: formData.placeOfReceipt,
        lcNumber: formData.lcNumber,
        lcDate: formData.lcDate || null,
        epcgNo: formData.epcgNo,
        subtotal: transformedProductLines.reduce(
          (sum, line) => {
            const val = Number(line.amount);
            return sum + (Number.isFinite(val) ? val : 0);
          },
          0
        ),
        discount: formData.discount || 0,
        tax: formData.tax || 0,
        totalAmount: transformedProductLines.reduce(
          (sum, line) => {
            const val = Number(line.amount);
            return sum + (Number.isFinite(val) ? val : 0);
          },
          0
        ),
        pallets: totalPallets,
        totalSqm: totalSQM,
        status: (typeof reason === 'string' && reason.trim()) ? 'Draft' : (formData.status || 'Draft'),
        paymentTerms: formData.paymentTerms,
        deliveryTerms: formData.deliveryTerms,
        finalDestination: formData.finalDestination,
        consigneeDetails: formData.consignee,
        buyerDetails: formData.buyer,
        tariffCode: formData.tariffCode,
        portOfLoading: formData.portOfLoading,
        portOfDischarge: formData.portOfDischarge,
        validityDays: formData.validityDays || 30,
        notes: formData.notes,
        palletType: formData.palletType,
        tilesBack: formData.tilesBack,
        boxesMarking: formData.boxesMarking,
        boxType: formData.boxType,
        fumigation: formData.fumigation,
        legalisation: formData.legalisation,
        otherInstructions: formData.otherInstructions,
        currency: formData.currency,
        productLines: transformedProductLines,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser?.name || 'Current User',
        revisionReason: (typeof reason === 'string' && reason.trim()) ? reason : 'Updated document details',
      };

      // Save rate history for all product lines
      formData.productLines.forEach((line) => {
        if (line.product && line.rate && formData.client) {
          rateHistoryManager.saveClientRate(
            formData.client,
            line.product,
            line.rate,
            formData.currency
          );
        }
      });

      // NOTE: workflow updates are performed after successful save to avoid blocking the save operation

      // Save via API
      if (invoiceToEdit && invoiceToEdit.id) {
        await updateInvoice({ id: invoiceToEdit.id, data: invoiceData });
      } else {
        await createInvoice(invoiceData);
      }

      showSuccess(
        `✅ Invoice ${invoiceToEdit ? 'updated' : 'created'} successfully! 
        📊 Rate history updated for ${formData.productLines.length} products
        🔄 Workflow status synchronized across linked documents`
      );

      // Clear draft and save smart defaults after successful save
      clearDraft();
      saveInvoiceDefaults({
        currency: formData.currency,
        portOfLoading: formData.portOfLoading,
        deliveryTerms: formData.deliveryTerms,
        paymentTerms: formData.paymentTerms,
      });

      // Dispatch event for live update in dashboards
      window.dispatchEvent(new CustomEvent('invoice:changed'));

      // Fire-and-forget: update workflow connections (do not block UI)
      if (formData.status === 'Approved') {
        try {
          workflowConnections.updateLinkedStatus(
            'proforma_invoice',
            formData.invoiceNo,
            'Approved',
            { invoiceData: invoiceData }
          );
        } catch (e) {
          console.warn('Workflow update failed (non-blocking):', e);
        }
      }

      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      console.error('Error saving invoice:', err);
      setFormError(err);
      let errorMsg = 'Failed to save invoice.';
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
          errorMsg = 'Validation failed. Please check the highlighted fields.';
        }
      } else if (err.response) {
        if (err.response.data?.message) {
          errorMsg += '\n' + err.response.data.message;
        }
        if (err.response.status) {
          errorMsg += `\n(Status: ${err.response.status})`;
        }
      } else if (err.request) {
        errorMsg += '\nNo response from server. Please check your network or backend server.';
      } else {
        errorMsg += '\n' + err.message;
      }
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle print functionality
   */
  const handlePrint = async () => {
    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      showWarning('Please complete the invoice details before printing.');
      return;
    }

    const pdfValidation = validatePDFStructure(formData, 'proforma_invoice');

    if (!pdfValidation.isValid) {
      showError(`Cannot generate PDF: ${pdfValidation.errors.join(', ')}`);
      return;
    }

    if (pdfValidation.warnings.length > 0) {
      showWarning(`PDF Warnings: ${pdfValidation.warnings.join(', ')}`);
    }

    setShowPrintView(true);

    setTimeout(async () => {
      try {
        const swResponse = await sanitarywareProductService.getProducts();
        setSwProducts(Array.isArray(swResponse) ? swResponse : []);
      } catch (swErr) {
        console.error('Failed to load sanitaryware products:', swErr);
      }
      try {
        const element = printRef.current;
        if (!element) {
          showError('Print view not found. Please try again.');
          setShowPrintView(false);
          return;
        }

        const filename = generateEnterpriseFilename({
          moduleName: 'PROFORMA-INVOICE',
          documentNo: formData?.invoiceNo || formData?.invoice_no,
          clientName: formData?.clientName || formData?.client_name || '',
          date: formData?.invoiceDate || formData?.invoice_date || '',
          extension: 'pdf'
        });
        const result = await downloadPDF(element, filename);

        if (result.success) {
          showSuccess('PDF downloaded successfully!');
        } else {
          showError(`Failed to download PDF: ${result.message}`);
        }
      } catch (error) {
        showError(`PDF generation error: ${error.message}`);
      } finally {
        setShowPrintView(false);
      }
    }, 1000);
  };

  /**
   * Handle PDF preview
   */
  const handleViewPDF = async () => {
    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      showWarning('Please add invoice details to preview.');
      return;
    }

    const pdfValidation = validatePDFStructure(formData, 'proforma_invoice');

    if (!pdfValidation.isValid) {
      showError(`Cannot generate PDF preview: ${pdfValidation.errors.join(', ')}`);
      return;
    }

    if (pdfValidation.warnings.length > 0) {
      showWarning(`PDF Warnings: ${pdfValidation.warnings.join(', ')}`);
    }

    setShowPrintView(true);

    setTimeout(async () => {
      try {
        const element = printRef.current;
        if (!element) {
          showError('Preview not available. Please try again.');
          setShowPrintView(false);
          return;
        }

        const result = await previewPDF(element);

        if (result.success) {
          showInfo('PDF preview opened');
          setShowPrintView(false);
        } else {
          showError(`Failed to preview PDF: ${result.message}`);
          setShowPrintView(false);
        }
      } catch (error) {
        showError(`PDF preview error: ${error.message}`);
        setShowPrintView(false);
      }
    }, 1000);
  };

  /**
   * Calculate totals for display
   */
  const calculateTotals = () => {
    const tileLines = formData.productLines.filter(l => (!l.product_type && !l.productType) || l.product_type === 'tile' || l.productType === 'tile');
    const sanitarywareLines = formData.productLines.filter(l => l.product_type === 'sanitaryware' || l.productType === 'sanitaryware');

    const totals = formData.productLines.reduce(
      (acc, line) => {
        const palletValue = Number(line.totalPallet || line.pallets);
        const isSanitaryware = line.product_type === 'sanitaryware' || line.productType === 'sanitaryware';
        const boxesValue = isSanitaryware ? Number(line.pieces || line.totalBoxes) : Number(line.totalBoxes || line.pieces);
        const sqmValue = Number(line.sqmAuto || line.sqm);
        const netWeightValue = Number(line.netWeight || line.net_weight);
        const grossWeightValue = Number(line.grossWeight || line.gross_weight);
        const amountValue = Number(line.amount);

        return {
          pallets: acc.pallets + (Number.isFinite(palletValue) ? palletValue : 0),
          boxes: acc.boxes + (Number.isFinite(boxesValue) ? boxesValue : 0),
          sqm: acc.sqm + (Number.isFinite(sqmValue) ? sqmValue : 0),
          netWeight: acc.netWeight + (Number.isFinite(netWeightValue) ? netWeightValue : 0),
          grossWeight: acc.grossWeight + (Number.isFinite(grossWeightValue) ? grossWeightValue : 0),
          amount: acc.amount + (Number.isFinite(amountValue) ? amountValue : 0),
        };
      },
      { pallets: 0, boxes: 0, sqm: 0, netWeight: 0, grossWeight: 0, amount: 0 }
    );

    return { ...totals, tileLines, sanitarywareLines };
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading form data...</p>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="invoice-form-container">
      <BackButton onBack={onBack} label="Back to Invoices" />
      {/* Enhanced Header */}
      <div className="invoice-header">
        <Row className="align-items-center">
          <Col>
            <div className="d-flex align-items-center">
              <div>
                <h2 className="mb-0 invoice-title">
                  {invoiceToEdit
                    ? 'Edit Proforma Invoice'
                    : 'Create Proforma Invoice'}
                </h2>
                <p className="text-muted mb-0">
                  {invoiceToEdit
                    ? `Editing ${formData.invoiceNo}`
                    : 'Build your professional invoice'}
                </p>
              </div>
            </div>
          </Col>
          <Col xs="auto">
            <div className="invoice-status d-flex align-items-center gap-2">
              {invoiceToEdit && (
                <Badge bg="info" className="status-badge">
                  {formData.revisionCount || formData.revision_count ? `Rev R${formData.revisionCount || formData.revision_count}` : 'Original'}
                </Badge>
              )}
              <Badge
                bg={formData.status === 'Approved' ? 'success' : 'warning'}
                className="status-badge"
              >
                {formData.status}
              </Badge>
            </div>
          </Col>
        </Row>

        {invoiceToEdit && (
          <Row className="mt-3 pt-3 border-top border-light-subtle text-muted small">
            <Col sm={3}>
              <strong>Document No:</strong> {formData.originalInvoiceNo || formData.original_invoice_no || formData.invoiceNo}
            </Col>
            <Col sm={3}>
              <strong>Revision No:</strong> {formData.revisionNo || formData.revision_no || 'R0'}
            </Col>
            <Col sm={3}>
              <strong>Last Updated:</strong> {formData.updatedAt || formData.updated_at ? new Date(formData.updatedAt || formData.updated_at).toLocaleString() : 'Just now'}
            </Col>
            <Col sm={3}>
              <strong>Updated By:</strong> {formData.updatedByName || formData.updated_by_name || currentUser?.name || 'System'}
            </Col>
          </Row>
        )}
      </div>

      {/* Draft Restore Banner — shows only for new invoices */}
      {!invoiceToEdit && (
        <DraftRestoreBanner
          hasDraft={hasDraft}
          lastSaved={lastSaved}
          onRestore={() => {
            const draft = restoreDraft();
            if (draft) {
              setFormData(prev => ({ ...prev, ...draft }));
              showInfo('Draft restored. Please review and save.');
            }
          }}
          onDiscard={() => {
            clearDraft();
          }}
        />
      )}

      {/* Error & Warning Notifications */}
      {formError && (
        <Alert variant="secondary" dismissible className="mt-3" onClose={() => setFormError(null)}>
          <div className="d-flex align-items-center">
            <AlertCircle size={20} className="me-2" />
            <div>
              <strong>Error:</strong> {typeof formError === 'string' ? formError : (formError instanceof Error ? formError.message : (formError?.message || 'An unexpected error occurred'))}
            </div>
          </div>
        </Alert>
      )}

      {error && (
        <Alert variant="secondary" dismissible className="mt-3">
          <div className="d-flex align-items-center">
            <AlertCircle size={20} className="me-2" />
            <div>
              <strong>Loading Error:</strong> {typeof error === 'string' ? error : (error.message || 'Failed to load required data')}
            </div>
          </div>
        </Alert>
      )}

      {/* Permission Warning */}
      {!permissions.canEdit && (
        <Alert variant="warning" className="mb-3">
          <strong>View Only Mode:</strong> You do not have permission to edit or save invoices.
          Only super_admin and company_admin users can modify documents. You can still view and generate PDFs.
        </Alert>
      )}

      {/* Document Locked/Approved Warning */}
      {(formData.status === 'Approved' || formData.status === 'Locked') && (
        <Alert variant={formData.status === 'Locked' ? 'danger' : 'warning'} className="mb-3">
          <strong>This document is {formData.status} and cannot be edited.</strong>
        </Alert>
      )}

      {/* Enhanced Invoice Details Card */}
      <Card className="invoice-details-card">
        <Card.Header className="invoice-card-header">
          <div className="d-flex align-items-center">
            <FileText size={20} className="me-2 text-primary" />
            <h5 className="mb-0">Invoice Information</h5>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-4">
            {/* Basic Information */}
            <Col xs={12}>
              <div className="form-section">
                <h6 className="section-title">Basic Information</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        Proforma Invoice No. *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.invoiceNo}
                        readOnly
                        className="form-control-enhanced readonly-field"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        Date *
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          handleInputChange('date', e.target.value)
                        }
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Client is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Client * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <div className="client-selection">
                        <Form.Select
                          value={formData.client}
                          onChange={(e) => {
                            handleClientChange(e.target.value);
                            if (errors.client) setErrors({ ...errors, client: null });
                          }}
                          className="form-control-enhanced"
                          isInvalid={!!errors.client}
                        >
                          <option value="">Select Client</option>
                          {clients.filter(client => client.status !== 'Inactive' || client.clientName === formData.client).map((client) => (
                            <option key={client.id} value={client.clientName}>
                              {client.clientName} ({client.country})
                            </option>
                          ))}
                        </Form.Select>
                        {errors.client && <div className="invalid-feedback d-block">{errors.client}</div>}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        Currency
                      </Form.Label>
                      <AddableDropdown
                        value={formData.currency}
                        onChange={(val) =>
                          handleInputChange('currency', val)
                        }
                        masterDataType="currencies"
                        label="Currency"
                        placeholder="Select Currency"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Col>

            {/* Shipping Information */}
            <Col xs={12}>
              <div className="form-section">
                <h6 className="section-title">Shipping Information</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Country is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Country * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.country}
                        onChange={(value) => {
                          handleInputChange('country', value);
                          if (errors.country) setErrors({ ...errors, country: null });
                        }}
                        masterDataType="countries"
                        label="Country"
                        placeholder="Select Country"
                        className="form-control-enhanced"
                        isInvalid={!!errors.country}
                      />
                      {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Port of Loading is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Port of Loading * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.portOfLoading}
                        onChange={(value) => {
                          handleInputChange('portOfLoading', value);
                          if (errors.portOfLoading) setErrors({ ...errors, portOfLoading: null });
                        }}
                        masterDataType="portsOfLoading"
                        label="Port of Loading"
                        placeholder="Select Port"
                        className="form-control-enhanced"
                        isInvalid={!!errors.portOfLoading}
                      />
                      {errors.portOfLoading && <div className="invalid-feedback d-block">{errors.portOfLoading}</div>}
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Port of Discharge is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Port of Discharge * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.portOfDischarge}
                        onChange={(value) => {
                          handleInputChange('portOfDischarge', value);
                          if (errors.portOfDischarge) setErrors({ ...errors, portOfDischarge: null });
                        }}
                        masterDataType="portsOfDischarge"
                        label="Port of Discharge"
                        placeholder="Select Port"
                        className="form-control-enhanced"
                        isInvalid={!!errors.portOfDischarge}
                      />
                      {errors.portOfDischarge && <div className="invalid-feedback d-block">{errors.portOfDischarge}</div>}
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Final Destination is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Final Destination * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.finalDestination}
                        onChange={(value) => {
                          handleInputChange('finalDestination', value);
                          if (errors.finalDestination) setErrors({ ...errors, finalDestination: null });
                        }}
                        masterDataType="finalDestinations"
                        label="Final Destination"
                        placeholder="Select Destination"
                        className="form-control-enhanced"
                        isInvalid={!!errors.finalDestination}
                      />
                      {errors.finalDestination && <div className="invalid-feedback d-block">{errors.finalDestination}</div>}
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Col>



            {/* Buyer Order Reference & Terms */}
            <Col xs={12}>
              <div className="form-section">
                <h6 className="section-title">Buyer Order Reference & Terms</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        Buyer's Order No.
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Buyer Order Number"
                        value={formData.buyerOrderNo}
                        onChange={(e) =>
                          handleInputChange('buyerOrderNo', e.target.value)
                        }
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        Buyer's Order Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.buyerOrderDate}
                        onChange={(e) =>
                          handleInputChange('buyerOrderDate', e.target.value)
                        }
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Payment Terms are mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Payment Terms * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.paymentTerms}
                        onChange={(value) => {
                          handleInputChange('paymentTerms', value);
                          if (errors.paymentTerms) setErrors({ ...errors, paymentTerms: null });
                        }}
                        masterDataType="paymentTerms"
                        label="Payment Terms"
                        placeholder="Select Payment Terms"
                        className="form-control-enhanced"
                        isInvalid={!!errors.paymentTerms}
                      />
                      {errors.paymentTerms && <div className="invalid-feedback d-block">{errors.paymentTerms}</div>}
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Delivery Terms are mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Delivery Terms * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.deliveryTerms}
                        onChange={(value) => {
                          handleInputChange('deliveryTerms', value);
                          if (errors.deliveryTerms) setErrors({ ...errors, deliveryTerms: null });
                        }}
                        masterDataType="deliveryTerms"
                        label="Delivery Terms"
                        placeholder="Select Terms"
                        className="form-control-enhanced"
                        isInvalid={!!errors.deliveryTerms}
                      />
                      {errors.deliveryTerms && <div className="invalid-feedback d-block">{errors.deliveryTerms}</div>}
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Tariff Code is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Tariff Code * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={(formData.tariffCode || '').split(',').map(c => c.trim()).filter(Boolean)}
                        onChange={(valueArr) => {
                          const val = Array.isArray(valueArr) ? valueArr.join(', ') : valueArr;
                          handleInputChange('tariffCode', val);
                          if (errors.tariffCode) setErrors({ ...errors, tariffCode: null });
                        }}
                        masterDataType="tariffCodes"
                        placeholder="Select or add tariff code..."
                        className="form-control-enhanced"
                        isInvalid={!!errors.tariffCode}
                        isMultiple={true}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Col>

            {/* Client Details */}
            <Col xs={12}>
              <div className="form-section">
                <h6 className="section-title">Client Details</h6>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Consignee Details are mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Consignee Details * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder="Auto-filled from client data or enter manually..."
                        value={formData.consignee}
                        onChange={(e) => {
                          handleInputChange('consignee', e.target.value);
                          if (errors.consignee) setErrors({ ...errors, consignee: null });
                        }}
                        className="form-control-enhanced"
                        isInvalid={!!errors.consignee}
                      />
                      {errors.consignee && <div className="invalid-feedback d-block">{errors.consignee}</div>}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Buyer Details are mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Buyer Details * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder="Auto-filled from client data or enter manually..."
                        value={formData.buyer}
                        onChange={(e) => {
                          handleInputChange('buyer', e.target.value);
                          if (errors.buyer) setErrors({ ...errors, buyer: null });
                        }}
                        className="form-control-enhanced"
                        isInvalid={!!errors.buyer}
                      />
                      {errors.buyer && <div className="invalid-feedback d-block">{errors.buyer}</div>}
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Enhanced Product Lines Card */}
      <Card className="product-lines-card">
        <Card.Header className="invoice-card-header">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <Calculator size={20} className="me-2 text-primary" />
              <h5 className="mb-0">Product Lines & Calculations</h5>
            </div>
            <div className="product-summary">
              <Badge bg="primary" className="me-2">
                {formData.productLines.length} Products
              </Badge>
              <Badge bg="success">
                Total: {currencySymbol}{totals.amount.toLocaleString()}
              </Badge>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <ProductLineTable
            productLines={totals.tileLines}
            onChange={(newTileLines) => {
              setFormData(prev => ({
                ...prev,
                productLines: [...newTileLines, ...totals.sanitarywareLines]
              }));
            }}
            products={products}
            onProductCreate={createProduct}
            showRateHistory={true}
            currentClient={formData.client}
            rateHistoryManager={rateHistoryManager}
            masterData={masterData}
            onMasterDataUpdate={handleMasterDataAdd}
            currency={formData.currency}
          />
          <SanitarywareProductLineTable
            productLines={totals.sanitarywareLines}
            onChange={(newSwLines) => {
              setFormData(prev => ({
                ...prev,
                productLines: [...totals.tileLines, ...newSwLines]
              }));
            }}
            products={swProducts}
            currency={formData.currency}
          />
        </Card.Body>
      </Card>

      {/* Enhanced Terms & Conditions Card */}
      <Card className="terms-card">
        <Card.Header className="invoice-card-header">
          <div className="d-flex align-items-center">
            <FileText size={20} className="me-2 text-primary" />
            <h5 className="mb-0">Terms & Conditions</h5>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-4">
            <Col xs={12}>
              <div className="form-section">
                <h6 className="section-title">Packing Specifications</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Pallet Type is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Pallet Type * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.palletType}
                        onChange={(value) =>
                          handleInputChange('palletType', value)
                        }
                        masterDataType="palletTypes"
                        label="Pallet Type"
                        placeholder="Select Pallet Type"
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Tiles Back is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Tiles Back * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.tilesBack}
                        onChange={(value) =>
                          handleInputChange('tilesBack', value)
                        }
                        masterDataType="tilesBack"
                        label="Tiles Back"
                        placeholder="Select Tiles Back"
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Boxes Marking is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Boxes Marking * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.boxesMarking}
                        onChange={(value) =>
                          handleInputChange('boxesMarking', value)
                        }
                        masterDataType="boxesMarking"
                        label="Boxes Marking"
                        placeholder="Select Boxes Marking"
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Box Type is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Box Type * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <AddableDropdown
                        value={formData.boxType}
                        onChange={(value) =>
                          handleInputChange('boxType', value)
                        }
                        masterDataType="boxTypes"
                        label="Box Type"
                        placeholder="Select Box Type"
                        className="form-control-enhanced"
                        allowImageUpload={true}
                      />
                      {formData.boxType && (
                        <div className="mt-2 d-flex align-items-center">
                          {(() => {
                            const selectedBoxTypeObj = masterData.boxTypeObjects?.find(b => (b.value || b) === formData.boxType);
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
              </div>
            </Col>

            <Col xs={12}>
              <div className="form-section">
                <h6 className="section-title">Compliance & Documentation</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Fumigation is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Fumigation * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <Form.Select
                        value={formData.fumigation}
                        onChange={(e) =>
                          handleInputChange('fumigation', e.target.value)
                        }
                        className="form-control-enhanced"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Legalisation is mandatory.</Tooltip>}>
                        <Form.Label className="form-label-enhanced text-danger" style={{ cursor: 'help' }}>
                          Legalisation * <Info size={12} className="ms-1" />
                        </Form.Label>
                      </OverlayTrigger>
                      <Form.Select
                        value={formData.legalisation}
                        onChange={(e) =>
                          handleInputChange('legalisation', e.target.value)
                        }
                        className="form-control-enhanced"
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        Other Instructions
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Enter any additional instructions..."
                        value={formData.otherInstructions}
                        onChange={(e) =>
                          handleInputChange('otherInstructions', e.target.value)
                        }
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Col>

            <Col xs={12}>
              <div className="form-section">
                <h6 className="section-title">LC & EPCG Details</h6>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        LC Number
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter LC Number"
                        value={formData.lcNumber}
                        onChange={(e) => handleInputChange('lcNumber', e.target.value)}
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        LC Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.lcDate}
                        onChange={(e) => handleInputChange('lcDate', e.target.value)}
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="form-label-enhanced">
                        EPCG No.
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter EPCG No."
                        value={formData.epcgNo}
                        onChange={(e) => handleInputChange('epcgNo', e.target.value)}
                        className="form-control-enhanced"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Enhanced Summary & Actions Card */}
      <Card className="summary-actions-card">
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <div className="invoice-summary">
                <Row className="g-3">
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">{totals.pallets}</div>
                      <div className="summary-label">Total Pallets</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {totals.boxes.toLocaleString()}
                      </div>
                      <div className="summary-label">Total Boxes</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {totals.sqm.toFixed(2)}
                      </div>
                      <div className="summary-label">Total SQM</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {totals.netWeight.toFixed(2)}
                      </div>
                      <div className="summary-label">Net Weight (kgs)</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {totals.grossWeight.toFixed(2)}
                      </div>
                      <div className="summary-label">Gross Weight (kgs)</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
            <Col md={4}>
              <div className="total-amount-section">
                <div className="total-amount">
                  <div className="amount-label">Total Amount</div>
                  <div className="amount-value">
                    {currencySymbol}{totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <hr className="my-4" />

          <Row className="align-items-center">
            <Col md={8} lg={9}>
              <div className="order-actions d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3 w-100">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={isLoading}
                  loadingText="Saving..."
                  icon={<Save size={16} />}
                  className="action-btn w-100"
                  disabled={!permissions.canEdit || isDocumentLocked}
                  title={isDocumentLocked ? `This document is ${formData.status} and cannot be edited` : !permissions.canEdit ? 'You do not have permission to save invoices' : ''}
                >
                  {invoiceToEdit ? 'Update Invoice' : 'Save Invoice'}
                </Button>

                <Button
                  variant="primary"
                  onClick={handlePrint}
                  icon={<Printer size={16} />}
                  className="action-btn w-100"
                >
                  Download PDF
                </Button>

                <Button
                  variant="outline"
                  onClick={handleViewPDF}
                  icon={<Eye size={16} />}
                  className="action-btn w-100"
                >
                  Preview PDF
                </Button>
              </div>
            </Col>
            <Col md={4} lg={3}>
              <div className="form-status mt-3 mt-md-0">
                <Form.Group>
                  <Form.Label className="form-label-enhanced">
                    Invoice Status
                  </Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) =>
                      handleInputChange('status', e.target.value)
                    }
                    className="form-control-enhanced"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Expired">Expired</option>
                    <option value="Converted">Converted</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Activity History Section */}
      {formData.id && (
        <Card className="audit-history-card mt-4 mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Header className="invoice-card-header bg-light border-bottom">
            <div className="d-flex align-items-center justify-content-between py-1">
              <div className="d-flex align-items-center">
                <History size={20} className="me-2 text-primary" />
                <h5 className="mb-0">Activity History</h5>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <ModuleAuditLog resourceType="proforma_invoice" resourceId={formData.id} />
          </Card.Body>
        </Card>
      )}

      {/* Client Form */}
      {showClientModal && (
        <ClientForm
          client={null}
          onSave={handleCreateClient}
          onCancel={() => setShowClientModal(false)}
          salespersons={users || []}
        />
      )}

      {/* Revision History Card */}
      {invoiceToEdit && revisionHistory.length > 0 && (
        <Card className="invoice-details-card mt-4 mb-4">
          <Card.Header className="invoice-card-header d-flex align-items-center justify-content-between">
            <h5 className="mb-0 fw-bold d-flex align-items-center text-white">
              <History size={20} className="me-2" /> Revision History
            </h5>
            <Badge bg="light" className="text-primary fw-bold">
              {revisionHistory.length} Version{revisionHistory.length > 1 ? 's' : ''}
            </Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead>
                  <tr className="table-light text-muted small text-uppercase">
                    <th className="ps-4">Version / Rev No</th>
                    <th>Date</th>
                    <th>Updated By</th>
                    <th className="pe-4">Change Summary / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {revisionHistory.map((rev) => (
                    <tr key={rev.id}>
                      <td className="ps-4 fw-semibold">
                        {rev.revision_no || rev.revisionNo || 'Original'}
                        {rev.status === 'Revised' && <Badge bg="secondary" className="ms-2">Archived</Badge>}
                        {rev.status !== 'Revised' && <Badge bg="success" className="ms-2">Active</Badge>}
                      </td>
                      <td>{new Date(rev.updated_at || rev.updatedAt).toLocaleString()}</td>
                      <td>{rev.updated_by_name || rev.updatedByName || 'N/A'}</td>
                      <td className="pe-4 text-muted small">{rev.revision_reason || rev.revisionReason || 'Initial registration'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Revision Reason Prompt Modal */}
      <Modal show={showRevisionModal} onHide={() => setShowRevisionModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold text-white">Reason for Revision</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Please provide a reason for editing/revising this document:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="e.g., Updated quantities and terms, adjusted prices per client's request"
              className="form-control-enhanced"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRevisionModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (!revisionReason.trim()) {
                showError('Please enter a valid reason for this revision.');
                return;
              }
              setShowRevisionModal(false);
              await handleSave(revisionReason);
            }}
          >
            Confirm & Save Revision
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Print/PDF View Modal */}
      {showPrintView && (
        <div
          className="print-modal-overlay no-print"
          onClick={() => setShowPrintView(false)}
        >
          <div
            className="print-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="print-modal-header no-print">
              <h5>Proforma Invoice: {formData.invoiceNo}</h5>
              <div>
                <Button
                  variant="primary"
                  onClick={() => window.print()}
                  className="me-2"
                  icon={<Printer size={16} />}
                >
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
              ref={printRef}
              invoiceData={formData}
              boxTypeImageUrl={masterData?.boxTypeObjects?.find(b => (b.value || b) === formData.boxType)?.imageUrl}
            />
          </div>
        </div>
      )}

      <style>{`
        .invoice-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid #e2e8f0;
        }

        .invoice-title {
          color: #1f2937;
          font-weight: 700;
        }

        .status-badge {
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
        }

        .invoice-details-card,
        .product-lines-card,
        .terms-card,
        .summary-actions-card {
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 2rem;
          border-left: 4px solid #3b82f6;
        }

        .invoice-card-header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border-radius: 16px 16px 0 0;
          padding: 1.5rem 2rem;
          border: none;
        }

        .form-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
        }

        .section-title {
          color: #374151;
          font-weight: 600;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .form-label-enhanced {
          color: #374151;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .form-control-enhanced {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .form-control-enhanced:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
          transform: translateY(-1px);
        }

        .readonly-field {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: #6b7280;
          font-weight: 600;
        }

        .client-selection {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .client-selection .form-select {
          flex: 1;
        }

        .add-client-btn {
          flex-shrink: 0;
          height: auto;
          min-width: 100px;
        }

        .invoice-summary {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #bbf7d0;
        }

        .summary-item {
          text-align: center;
        }

        .summary-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #166534;
          margin-bottom: 0.25rem;
          letter-spacing: 0.02em;
        }

        .summary-label {
          font-size: 0.7rem;
          color: #16a34a;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .total-amount-section {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border: 2px solid #93c5fd;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .amount-label {
          font-size: 1rem;
          color: #1e40af;
          font-weight: 700;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .amount-value {
          font-size: 2.5rem;
          font-weight: 900;
          color: #1d4ed8;
          letter-spacing: 0.02em;
        }

        .order-actions .action-btn {
          min-width: 140px;
          width: auto !important;
        }

        .product-summary {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .form-status {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .invoice-header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .invoice-title {
            font-size: 1.5rem;
          }

          .client-selection {
            flex-direction: column;
            gap: 0.5rem;
          }

          .add-client-btn {
            width: 100%;
            height: auto;
          }

          .order-actions .action-btn {
            width: 100% !important;
          }

          .summary-value {
            font-size: 1.25rem;
          }

          .amount-value {
            font-size: 1.5rem;
          }

          .product-summary {
            flex-direction: column;
            gap: 0.25rem;
          }
        }

        @media (max-width: 576px) {
          .form-section {
            padding: 1rem;
          }

          .invoice-card-header {
            padding: 1rem 1.5rem;
          }

          .summary-item {
            margin-bottom: 1rem;
          }

          .total-amount-section {
            margin-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default InvoiceForm;




