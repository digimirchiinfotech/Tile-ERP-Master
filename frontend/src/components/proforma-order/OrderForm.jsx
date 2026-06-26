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
import { Row, Col, Card, Form, Alert, Spinner, Badge, Table, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ArrowLeft, Save, Printer, FileText, Eye, Plus, AlertCircle, History, Info, Edit, Download } from 'lucide-react';
import Button from '../shared/Button.jsx';
import OrderProductLineTable from './OrderProductLineTable.jsx';
import OrderPrintView from './OrderPrintView.jsx';
import SupplierForm from '../supplier-management/SupplierForm.jsx';
import DynamicDropdown from '../shared/DynamicDropdown.jsx';
import BackButton from '../common/BackButton.jsx';
import ModuleAuditLog from '../shared/ModuleAuditLog.jsx';
import { generateOrderNumber } from '../../utils/helpers.jsx';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { rateHistoryManager } from '../../utils/helpers.jsx';
import { workflowConnections } from '../../utils/helpers.jsx';
import { useProducts } from '../../hooks/useProducts';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useInvoices } from '../../hooks/useInvoices';
import { useOrders } from '../../hooks/useOrders';
import { orderService } from '../../services/orderService.js';
import sanitarywareProductService from '../../services/sanitarywareProductService.js';

import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from '../shared/NotificationManager.jsx';
import { getDocumentPermissions } from '../../utils/permissionChecks.js';
import { downloadPDF, previewPDF, validatePDFStructure } from '../../utils/pdfGenerator.js';
import { formatDateForInput, formatDisplayDate } from '../../utils/formatters.js';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
import { extractValidationErrors } from '../../utils/validationHelper.js';
import {
  getAllCurrencies,
  getAllPorts,
  getPortsOfLoading,
  getPortsOfDischarge,
  getAllCountries,
  getAllTariffCodes,
  getDeliveryTerms,
  getPaymentTerms,
  getAllFinalDestinations,
  getAllPalletTypes,
  getAllTilesBack,
  getAllBoxesMarking,
  getAllBoxTypes,
  createMasterData
} from '../../services/masterDataService.js';

// Initial form state constant
const getInitialFormState = () => ({
  orderNo: '',
  date: new Date().toLocaleDateString('en-CA'),
  piReference: '',
  supplier: '',
  supplierId: '',
  portOfLoading: '',
  supplierDetails: '',
  tariffCode: '',
  currency: 'Indian Rupee',
  productLines: [],
  palletType: '',
  tilesBack: '',
  boxesMarking: '',
  boxType: '',
  fumigation: 'YES',
  legalisation: 'YES',
  otherInstructions: '',
  deliverySchedule: '',
  paymentTerms: '',
  totalAmount: 0,
  gstRate: 0.1,
  gstAmount: 0,
  poValue: 0,
  status: 'Draft',
  qcStatus: 'Not Ready',
  productionStartDate: '',
  productionEndDate: '',
  expectedDelivery: '',
});

function OrderForm({ order, onBack = () => { }, currentUser, ordersData, productsData, invoicesData, suppliersData }) {
  const printRef = useRef();
  const { getNextOrderNumber } = useDocumentNumber();

  // Use props if provided, otherwise call hooks
  const productsHook = useProducts();
  const suppliersHook = useSuppliers();
  const invoicesHook = useInvoices();
  const ordersHook = useOrders();

  const { products, loading: productsLoading, error: productsError } = productsData || productsHook;
  const { suppliers, loading: suppliersLoading, error: suppliersError, createSupplier } = suppliersData || suppliersHook;
  const { invoices, loading: invoicesLoading, error: invoicesError } = invoicesData || invoicesHook;
  const { orders, createOrder, updateOrder } = ordersData || ordersHook;
  const [showPrintView, setShowPrintView] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [formData, setFormData] = useState(getInitialFormState());
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [errors, setErrors] = useState({});

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionHistory, setRevisionHistory] = useState([]);

  useEffect(() => {
    const fetchRevisions = async () => {
      if (order && order.id) {
        try {
          const response = await orderService.getRevisions(order.id);
          if (response.data.success) {
            setRevisionHistory(response.data.data);
          }
        } catch (err) {
          console.error('Error fetching revisions:', err);
        }
      }
    };
    fetchRevisions();
  }, [order]);

  // Helper to format supplier details for the textarea
  const formatSupplierDetails = (s) => {
    if (!s) return '';
    const lines = [
      s.address || s.supplierAddress || '',
      [s.city || s.supplierCity, s.country || s.supplierCountry].filter(Boolean).join(', '),
      (s.gstn || s.gstNo || s.gst_no) ? `GSTIN: ${s.gstn || s.gstNo || s.gst_no}` : '',
    ].filter(line => line && line.trim() !== '');

    return lines.join('\n');
  };

  const [masterData, setMasterData] = useState({
    currencies: [],
    countries: [],
    ports: [],
    portsOfLoading: [],
    portsOfDischarge: [],
    destinations: [],
    palletTypes: [],
    tilesBack: [],
    boxesMarking: [],
    boxTypes: [],
    tariffCodes: [],
    deliveryTerms: [],
    paymentTerms: [],
  });

  const [sanitarywareProducts, setSanitarywareProducts] = useState([]);
  const [sanitarywareLoading, setSanitarywareLoading] = useState(true);

  const permissions = getDocumentPermissions(currentUser);
  const isDocumentLocked = (formData.status === 'Approved' || formData.status === 'Locked') && !['super_admin', 'company_admin'].includes(currentUser?.role);

  const loading = productsLoading || suppliersLoading || invoicesLoading || sanitarywareLoading;
  const error = productsError || suppliersError || invoicesError;

  useEffect(() => {
    const fetchSWProducts = async () => {
      try {
        setSanitarywareLoading(true);
        const sw = await sanitarywareProductService.getProducts();
        setSanitarywareProducts(sw || []);
      } catch (err) {
        console.error('Failed to fetch sanitaryware products:', err);
      } finally {
        setSanitarywareLoading(false);
      }
    };
    fetchSWProducts();
  }, []);

  useEffect(() => {
    const initializeForm = async () => {
      if (order) {
        // Find full order if navigated from search results where only ID is passed
        let currentOrder = order;
        if (order.id && !order.order_no && !order.orderNo && orders && orders.length > 0) {
          const found = orders.find(o => o.id === order.id || o._id === order.id);
          if (found) {
            currentOrder = found;
          }
        }

        // Enhanced edit functionality - populate all fields
        // Parse product lines if they're JSON strings and ensure proper field mapping
        let productLines = [];
        if (currentOrder.productLines || currentOrder.product_lines) {
          const lines = currentOrder.productLines || currentOrder.product_lines;
          if (typeof lines === 'string') {
            try {
              productLines = JSON.parse(lines);
            } catch (e) {
              productLines = [];
            }
          } else if (Array.isArray(lines)) {
            productLines = lines;
          }
        }

        // Calculate totals from product lines to ensure proper initialization
        const totalAmount = productLines.reduce((sum, line) => {
          return sum + (parseFloat(line.amount || line.Amount) || 0);
        }, 0) || currentOrder.totalAmount || currentOrder.total_amount || 0;

        const gstRate = currentOrder.gstRate || currentOrder.gst_rate || 0.1;
        const gstAmount = currentOrder.gstAmount || currentOrder.gst_amount || (totalAmount * gstRate / 100);
        const poValue = currentOrder.poValue || currentOrder.total_amount || (totalAmount + gstAmount);

        // Enrich product lines with latest factory names from master list
        const enrichedProductLines = productLines.map(line => {
          const productName = line.product || line.productName || line.product_name || '';
          const productType = line.productType || line.product_type || '';
          const itemRef = line.itemRef || line.item_ref || '';
          
          const isSanitaryware = productType === 'sanitaryware' || 
                                 (productName && (
                                   productName.toLowerCase().startsWith('wal') || 
                                   productName.toLowerCase().includes('wc') ||
                                   sanitarywareProducts.some(p => p.name.toLowerCase() === productName.toLowerCase())
                                 ));
                                 
          const masterProduct = isSanitaryware
            ? sanitarywareProducts.find(p => 
                (p.name && productName && p.name.toLowerCase() === productName.toLowerCase()) ||
                (p.productCode && itemRef && p.productCode.toLowerCase() === itemRef.toLowerCase()) ||
                (p.itemRef && itemRef && p.itemRef.toLowerCase() === itemRef.toLowerCase()) ||
                (p.modelNo && itemRef && p.modelNo.toLowerCase() === itemRef.toLowerCase()) ||
                (p.model_no && itemRef && p.model_no.toLowerCase() === itemRef.toLowerCase())
              )
            : (products || []).find(p => 
                (p.name && productName && p.name.toLowerCase() === productName.toLowerCase()) ||
                (p.productCode && itemRef && p.productCode.toLowerCase() === itemRef.toLowerCase()) ||
                (p.itemRef && itemRef && p.itemRef.toLowerCase() === itemRef.toLowerCase())
              );
              
          // Prioritize descriptive factory name, fallbacks
          const factoryProductName = masterProduct?.factoryProductName || 
                                   masterProduct?.factory_product_name || 
                                   line.factoryProductName || 
                                   line.factory_product_name || 
                                   line.itemRef || 
                                   line.item_ref || '';
                                   
          // Clean/enrich sanitaryware specific or tile specific fields
          const size = line.size || (masterProduct ? (Array.isArray(masterProduct.size) ? masterProduct.size[0] : (masterProduct.size || '')) : '');
          
          const surface = line.surface || (isSanitaryware 
            ? (line.color || masterProduct?.color || '') 
            : (masterProduct ? (Array.isArray(masterProduct.surface) ? masterProduct.surface[0] : (masterProduct.surface || '')) : ''));
            
          const thickness = line.thickness || (isSanitaryware 
            ? (line.category || masterProduct?.category || '') 
            : (masterProduct?.thickness || ''));

          const category = isSanitaryware
            ? (line.category || masterProduct?.category || '')
            : (line.category || masterProduct?.category || '');
          
          const perBoxWeight = line.perBoxWeight !== undefined ? line.perBoxWeight : (line.per_box_weight !== undefined ? line.per_box_weight : (
            isSanitaryware 
              ? parseFloat(masterProduct?.boxWeight || masterProduct?.box_weight || masterProduct?.weightPerPiece || masterProduct?.weight_per_piece || 0)
              : parseFloat(masterProduct?.defaultPerBoxWeight || masterProduct?.boxWeight || masterProduct?.box_weight || 22.5)
          ));
          
          const perPalletWeight = line.perPalletWeight !== undefined ? line.perPalletWeight : (line.per_pallet_weight !== undefined ? line.per_pallet_weight : (
            isSanitaryware ? 0 : parseFloat(masterProduct?.defaultPerPalletWeight || masterProduct?.default_per_pallet_weight || 25)
          ));
          
          return {
            ...line,
            productType: isSanitaryware ? 'sanitaryware' : 'tile',
            factoryProductName,
            category,
            size,
            surface,
            thickness,
            perBoxWeight,
            perPalletWeight,
            bigPallet: line.bigPallet !== undefined ? line.bigPallet : (line.big_pallet !== undefined ? line.big_pallet : 0),
            kathaliPallet: line.kathaliPallet !== undefined ? line.kathaliPallet : (line.kathali_pallet !== undefined ? line.kathali_pallet : 0),
            totalPallet: line.totalPallet !== undefined ? line.totalPallet : (line.total_pallet !== undefined ? line.total_pallet : (line.cartons || 0)),
            boxesPerBigPallet: line.boxesPerBigPallet !== undefined ? line.boxesPerBigPallet : (line.boxes_per_big_pallet !== undefined ? line.boxes_per_big_pallet : 0),
            boxesPerKathali: line.boxesPerKathali !== undefined ? line.boxesPerKathali : (line.boxes_per_kathali !== undefined ? line.boxes_per_kathali : 0),
            totalBoxes: line.totalBoxes !== undefined ? line.totalBoxes : (line.total_boxes !== undefined ? line.total_boxes : (line.pieces || 0)),
            sqmAuto: line.sqmAuto !== undefined ? line.sqmAuto : (line.sqm_auto !== undefined ? line.sqm_auto : (line.cbm || 0)),
            netWeight: line.netWeight !== undefined ? line.netWeight : (line.net_weight !== undefined ? line.net_weight : 0),
            grossWeight: line.grossWeight !== undefined ? line.grossWeight : (line.gross_weight !== undefined ? line.gross_weight : 0),
          };
        });

        setFormData({
          ...getInitialFormState(),
          orderNo: currentOrder.order_no || currentOrder.orderNo || '',
          date: formatDateForInput(currentOrder.date || currentOrder.date),
          piReference: currentOrder.invoice_ref || currentOrder.piReference || '',
          supplier: currentOrder.supplier_name || currentOrder.supplierName || currentOrder.supplier || '',
          supplierId: currentOrder.supplier_id || currentOrder.supplierId || '',
          portOfLoading: currentOrder.port_of_loading || currentOrder.portOfLoading || '',
          supplierDetails: currentOrder.supplierDetails || currentOrder.supplier_details || '',
          deliverySchedule: currentOrder.delivery_schedule || currentOrder.deliverySchedule || '',
          paymentTerms: currentOrder.payment_terms || currentOrder.paymentTerms || '',
          tariffCode: currentOrder.tariff_code || currentOrder.tariffCode || '',
          currency: currentOrder.currency || '',
          productLines: enrichedProductLines,
          palletType: currentOrder.pallet_type || currentOrder.palletType || '',
          tilesBack: currentOrder.tiles_back || currentOrder.tilesBack || '',
          boxesMarking: currentOrder.boxes_marking || currentOrder.boxesMarking || 'WITH',
          boxType: currentOrder.box_type || currentOrder.boxType || '',
          fumigation: currentOrder.fumigation || 'YES',
          legalisation: currentOrder.legalisation || 'YES',
          otherInstructions: currentOrder.other_instructions || currentOrder.otherInstructions || '',
          totalAmount: totalAmount,
          gstRate: gstRate,
          gstAmount: gstAmount,
          poValue: poValue,
          status: currentOrder.status || 'Draft',
          qcStatus: currentOrder.qc_status || currentOrder.qcStatus || 'Not Ready',
          productionStartDate: formatDateForInput(currentOrder.production_start_date || currentOrder.productionStartDate),
          productionEndDate: formatDateForInput(currentOrder.production_end_date || currentOrder.productionEndDate),
          expectedDelivery: formatDateForInput(currentOrder.expected_delivery || currentOrder.expectedDelivery),
        });

        // Sync custom options to masterData
        const fetchedBoxesMarking = currentOrder.boxesMarking || currentOrder.boxes_marking;
        const fetchedBoxType = currentOrder.boxType || currentOrder.box_type;

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
        // Fetch next order number from backend for new order
        const nextNumber = await getNextOrderNumber();
        const initialState = getInitialFormState();
        setFormData({
          ...initialState,
          orderNo: nextNumber,
        });
      }
    };

    initializeForm();
  }, [order, getNextOrderNumber]);

  // Auto-populate supplier details from master list if missing during edit
  useEffect(() => {
    if (formData.supplierId && !formData.supplierDetails && suppliers && suppliers.length > 0) {
      const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
      if (selectedSupplier) {
        setFormData(prev => ({
          ...prev,
          supplierDetails: formatSupplierDetails(selectedSupplier)
        }));
      }
    }
  }, [formData.supplierId, formData.supplierDetails, suppliers]);

  // Robust synchronization for Terms and Conditions
  // Ensures custom values (e.g. from PI or Edit mode) are added to dropdown options
  useEffect(() => {
    const fieldsToSync = [
      { value: formData.palletType, key: 'palletTypes', list: masterData.palletTypes },
      { value: formData.tilesBack, key: 'tilesBack', list: masterData.tilesBack },
      { value: formData.boxesMarking, key: 'boxesMarking', list: masterData.boxesMarking },
      { value: formData.boxType, key: 'boxTypes', list: masterData.boxTypes },
      { value: formData.deliverySchedule, key: 'deliveryTerms', list: masterData.deliveryTerms },
      { value: formData.paymentTerms, key: 'paymentTerms', list: masterData.paymentTerms }
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

  // Fetch all master data dynamically
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [
          currenciesData,
          portsData,
          polData,
          podData,
          countriesData,
          tariffData,
          deliveryData,
          paymentData,
          finalDestData,
          palletData,
          tilesBackData,
          boxesMarkingData,
          boxTypesData
        ] = await Promise.all([
          getAllCurrencies().catch(() => []),
          getAllPorts().catch(() => []),
          getPortsOfLoading().catch(() => []),
          getPortsOfDischarge().catch(() => []),
          getAllCountries ? getAllCountries().catch(() => []) : Promise.resolve([]),
          getAllTariffCodes ? getAllTariffCodes().catch(() => []) : Promise.resolve([]),
          getDeliveryTerms ? getDeliveryTerms().catch(() => []) : Promise.resolve([]),
          getPaymentTerms ? getPaymentTerms().catch(() => []) : Promise.resolve([]),
          getAllFinalDestinations ? getAllFinalDestinations().catch(() => []) : Promise.resolve([]),
          getAllPalletTypes ? getAllPalletTypes().catch(() => []) : Promise.resolve([]),
          getAllTilesBack ? getAllTilesBack().catch(() => []) : Promise.resolve([]),
          getAllBoxesMarking ? getAllBoxesMarking().catch(() => []) : Promise.resolve([]),
          getAllBoxTypes ? getAllBoxTypes().catch(() => []) : Promise.resolve([])
        ]);

        const apiDestinations = Array.isArray(finalDestData) && finalDestData.length > 0
          ? finalDestData.map(d => d.value || d.destination || d)
          : [];

        setMasterData(prev => ({
          ...prev,
          currencies: Array.isArray(currenciesData) ? currenciesData.map(c => c.value || c) : [],
          ports: Array.isArray(portsData) ? portsData.map(p => p.portName || p) : [],
          portsOfLoading: Array.isArray(polData) ? polData.map(p => p.portName || p.value || p) : [],
          portsOfDischarge: Array.isArray(podData) ? podData.map(p => p.portName || p.value || p) : [],
          destinations: apiDestinations.length > 0 ? apiDestinations : prev.destinations,
          countries: Array.isArray(countriesData) && countriesData.length > 0 ? countriesData.map(c => c.countryName || c.value || c) : prev.countries,
          tariffCodes: Array.isArray(tariffData) && tariffData.length > 0 ? tariffData.map(t => t.value || t) : prev.tariffCodes,
          deliveryTerms: Array.isArray(deliveryData) && deliveryData.length > 0 ? deliveryData.map(d => d.value || d) : prev.deliveryTerms,
          paymentTerms: Array.isArray(paymentData) && paymentData.length > 0 ? paymentData.map(p => p.value || p) : prev.paymentTerms,
          palletTypes: Array.isArray(palletData) && palletData.length > 0 ? palletData.map(p => p.value || p) : prev.palletTypes,
          tilesBack: Array.isArray(tilesBackData) && tilesBackData.length > 0 ? tilesBackData.map(t => t.value || t) : prev.tilesBack,
          boxesMarking: Array.isArray(boxesMarkingData) && boxesMarkingData.length > 0 ? boxesMarkingData.map(b => b.value || b) : prev.boxesMarking,
          boxTypes: Array.isArray(boxTypesData) && boxTypesData.length > 0 ? boxTypesData.map(b => b.value || b) : prev.boxTypes,
          boxTypeObjects: Array.isArray(boxTypesData) ? boxTypesData : prev.boxTypeObjects || [],
        }));
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    fetchMasterData();
  }, []);

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

  const handleMasterDataAdd = async (category, newValue) => {
    // Optimistic UI update
    setMasterData((prev) => ({
      ...prev,
      [category]: [...prev[category], newValue],
    }));

    // Persist to backend database
    try {
      await createMasterData(category, newValue);
    } catch (error) {
      console.error(`Failed to save new ${category} option:`, error);
      showWarning(`Failed to save "${newValue}" to database. It will only be available for this session.`);
    }
  };

  const handleGstRateChange = (newGstRate) => {
    setFormData((prev) => {
      const gstAmount = prev.totalAmount * (newGstRate / 100);
      const poValue = prev.totalAmount + gstAmount;

      return {
        ...prev,
        gstRate: newGstRate,
        gstAmount,
        poValue,
      };
    });
  };

  const handleProductLinesChange = (productLines) => {
    if (isDocumentLocked) return;
    const totalAmount = productLines.reduce(
      (sum, line) => sum + (line.amount || 0),
      0
    );

    setFormData((prev) => {
      const gstAmount = totalAmount * (prev.gstRate / 100);
      const poValue = totalAmount + gstAmount;

      return {
        ...prev,
        productLines,
        totalAmount,
        gstAmount,
        poValue,
      };
    });
  };

  const handleProductsChange = (updatedProducts) => {
    setProducts(updatedProducts);
  };

  const handleCreateSupplier = async (supplierData) => {
    try {
      // Add the supplier via the API - SupplierForm sends snake_case from dataToSubmit
      // Extract supplier_name as the key field
      const newSupplier = await createSupplier({
        supplier_name: supplierData.supplier_name,
        contact_person_name: supplierData.contact_person_name || '',
        email_id: supplierData.email_id,
        contact_number: supplierData.contact_number,
        address: supplierData.address || '',
        city: supplierData.city || '',
        country: supplierData.country || '',
        product_categories: supplierData.product_categories || [],
        gstn: supplierData.gstn || '',
        pan: supplierData.pan || '',
        status: supplierData.status || 'Active',
        notes: supplierData.notes || null,
      });

      setFormData((prev) => ({
        ...prev,
        supplier: newSupplier?.supplierName || supplierData.supplier_name,
        supplierId: newSupplier?.id,
      }));

      setShowSupplierModal(false);
      showSuccess(`New supplier ${newSupplier?.supplierName || supplierData.supplier_name} added and selected`);
    } catch (error) {
      console.error('Error adding supplier:', error);
      showError('Failed to add supplier. Please try again.');
    }
  };

  const handlePIReferenceChange = async (piReference) => {
    try {
      const selectedInvoice = invoices.find(
        (invoice) => (invoice.invoiceNo || invoice.invoice_no || invoice.id) === piReference
      );

      if (selectedInvoice) {
        // Safely extract product lines, handling potential JSON strings from backend
        let rawProductLines = selectedInvoice.productLines || selectedInvoice.product_lines || [];
        if (typeof rawProductLines === 'string') {
          try {
            rawProductLines = JSON.parse(rawProductLines);
          } catch (e) {
            console.error('Failed to parse productLines from PI:', e);
            rawProductLines = [];
          }
        }

        // Enhanced PI reference auto-fill with rate history
        // Fetch rates for all products in parallel
        const convertedProductLines = Array.isArray(rawProductLines)
          ? await Promise.all(
            rawProductLines.map(async (line) => {
              const productName = line.product || line.productName || line.product_name || '';
              const productType = line.productType || line.product_type || '';
              const itemRef = line.itemRef || line.item_ref || '';
              
              const rate = formData.supplier && productName
                ? await rateHistoryManager.getSupplierRate(formData.supplier, productName)
                : 0;
              
              const isSanitaryware = productType === 'sanitaryware' || 
                                     (productName && (
                                       productName.toLowerCase().startsWith('wal') || 
                                       productName.toLowerCase().includes('wc') ||
                                       sanitarywareProducts.some(p => p.name.toLowerCase() === productName.toLowerCase())
                                     ));
                                     
              const masterProduct = isSanitaryware
                ? sanitarywareProducts.find(p => 
                    (p.name && productName && p.name.toLowerCase() === productName.toLowerCase()) ||
                    (p.productCode && itemRef && p.productCode.toLowerCase() === itemRef.toLowerCase()) ||
                    (p.itemRef && itemRef && p.itemRef.toLowerCase() === itemRef.toLowerCase()) ||
                    (p.modelNo && itemRef && p.modelNo.toLowerCase() === itemRef.toLowerCase()) ||
                    (p.model_no && itemRef && p.model_no.toLowerCase() === itemRef.toLowerCase())
                  )
                : (products || []).find(p => 
                    (p.name && productName && p.name.toLowerCase() === productName.toLowerCase()) ||
                    (p.productCode && itemRef && p.productCode.toLowerCase() === itemRef.toLowerCase()) ||
                    (p.itemRef && itemRef && p.itemRef.toLowerCase() === itemRef.toLowerCase())
                  );
              
              // Prioritize descriptive factory name from master list, then PI, then itemRef as last resort
              const factoryProductName = masterProduct?.factoryProductName || 
                                       masterProduct?.factory_product_name || 
                                       line.factoryProductName || 
                                       line.factory_product_name || 
                                       line.itemRef || 
                                       line.item_ref || '';
              
              // Clean/enrich sanitaryware specific or tile specific fields
              const size = line.size || (masterProduct ? (Array.isArray(masterProduct.size) ? masterProduct.size[0] : (masterProduct.size || '')) : '');
              
              const surface = line.surface || (isSanitaryware 
                ? (line.color || masterProduct?.color || '') 
                : (masterProduct ? (Array.isArray(masterProduct.surface) ? masterProduct.surface[0] : (masterProduct.surface || '')) : ''));
                
              const thickness = line.thickness || (isSanitaryware 
                ? (line.category || masterProduct?.category || '') 
                : (masterProduct?.thickness || ''));

              const category = isSanitaryware
                ? (line.category || masterProduct?.category || '')
                : (line.category || masterProduct?.category || '');
                
              // Packaging configs
              let boxesPerBigPallet = line.boxesPerBigPallet !== undefined ? line.boxesPerBigPallet : (line.boxes_per_big_pallet !== undefined ? line.boxes_per_big_pallet : 0);
              if (!boxesPerBigPallet && masterProduct && !isSanitaryware) {
                boxesPerBigPallet = masterProduct.defaultBoxesPerPallet || masterProduct.boxes_per_pallet || 0;
              }
              
              let boxesPerKathali = line.boxesPerKathali !== undefined ? line.boxesPerKathali : (line.boxes_per_kathali !== undefined ? line.boxes_per_kathali : 0);
              if (!boxesPerKathali && masterProduct && !isSanitaryware) {
                boxesPerKathali = masterProduct.defaultBoxesPerKathali || masterProduct.default_boxes_per_kathali || 0;
              }
              
              const bigPallet = line.bigPallet !== undefined ? line.bigPallet : (line.big_pallet !== undefined ? line.big_pallet : 0);
              const kathaliPallet = line.kathaliPallet !== undefined ? line.kathaliPallet : (line.kathali_pallet !== undefined ? line.kathali_pallet : 0);
              const totalPallet = line.totalPallet !== undefined ? line.totalPallet : (line.total_pallet !== undefined ? line.total_pallet : (line.cartons || 0));
              const totalBoxes = line.totalBoxes !== undefined ? line.totalBoxes : (line.total_boxes !== undefined ? line.total_boxes : (line.pieces || 0));
              const sqmAuto = line.sqmAuto !== undefined ? line.sqmAuto : (line.sqm_auto !== undefined ? line.sqm_auto : (line.cbm || 0));
              
              // Weights
              const perBoxWeight = line.perBoxWeight !== undefined ? line.perBoxWeight : (line.per_box_weight !== undefined ? line.per_box_weight : (
                isSanitaryware 
                  ? parseFloat(masterProduct?.boxWeight || masterProduct?.box_weight || masterProduct?.weightPerPiece || masterProduct?.weight_per_piece || 0)
                  : parseFloat(masterProduct?.defaultPerBoxWeight || masterProduct?.boxWeight || masterProduct?.box_weight || 22.5)
              ));
              
              const netWeight = line.netWeight !== undefined ? line.netWeight : (line.net_weight !== undefined ? line.net_weight : 0);
              
              const perPalletWeight = line.perPalletWeight !== undefined ? line.perPalletWeight : (line.per_pallet_weight !== undefined ? line.per_pallet_weight : (
                isSanitaryware ? 0 : parseFloat(masterProduct?.defaultPerPalletWeight || masterProduct?.default_per_pallet_weight || 25)
              ));
              
              const grossWeight = line.grossWeight !== undefined ? line.grossWeight : (line.gross_weight !== undefined ? line.gross_weight : 0);
              
              return {
                ...line,
                productType: isSanitaryware ? 'sanitaryware' : 'tile',
                factoryProductName,
                category,
                size,
                surface,
                thickness,
                bigPallet,
                kathaliPallet,
                totalPallet,
                boxesPerBigPallet,
                boxesPerKathali,
                totalBoxes,
                sqmAuto,
                rate: rate || '',
                amount: (totalBoxes || 0) * (rate || 0),
                perBoxWeight,
                netWeight,
                perPalletWeight,
                grossWeight,
              };
            })
          )
          : [];

        const totalAmount = convertedProductLines.reduce(
          (sum, line) => sum + (line.amount || 0),
          0
        );

        // Extract tariff code from invoice or use HS code
        const tariffCodeValue = selectedInvoice.tariffCode || selectedInvoice.hsCode || selectedInvoice.tariff_code || selectedInvoice.hs_code || '';

        // Find matching supplier if possible for auto-selection
        const supplierFromInvoice = suppliers.find(s =>
          (s.name && s.name === selectedInvoice.supplierName) ||
          (s.id === (selectedInvoice.supplierId || selectedInvoice.supplier_id))
        );

        // Standardize Terms and Conditions fields
        const fetchedPalletType = selectedInvoice.palletType || selectedInvoice.pallet_type || '';
        const fetchedTilesBack = selectedInvoice.tilesBack || selectedInvoice.tiles_back || '';
        const fetchedBoxesMarking = selectedInvoice.boxesMarking || selectedInvoice.boxes_marking || '';
        const fetchedBoxType = selectedInvoice.boxType || selectedInvoice.box_type || '';
        const fetchedFumigation = selectedInvoice.fumigation || selectedInvoice.fumigation_status || 'YES';
        const fetchedLegalisation = selectedInvoice.legalisation || selectedInvoice.legalisation_status || 'YES';
        const fetchedDeliverySchedule = selectedInvoice.deliverySchedule || selectedInvoice.delivery_schedule || selectedInvoice.deliveryTerms || selectedInvoice.delivery_terms || '';
        const fetchedPaymentTerms = selectedInvoice.paymentTerms || selectedInvoice.payment_terms || '';
        const fetchedOtherInstructions = selectedInvoice.otherInstructions || selectedInvoice.other_instructions || '';
        const fetchedLcLumber = selectedInvoice.lcNumber || selectedInvoice.lc_lumber || '';
        const fetchedLcDate = selectedInvoice.lcDate || selectedInvoice.lc_date ? new Date(selectedInvoice.lcDate || selectedInvoice.lc_date).toISOString().split('T')[0] : '';
        const fetchedEpcgNo = selectedInvoice.epcgNo || selectedInvoice.epcg_no || '';

        // Dynamically add fetched values to masterData if they don't exist
        // This ensures custom values from PI (like unique markings) are visible in the dropdowns
        setMasterData(prev => {
          const newState = { ...prev };
          let changed = false;

          if (fetchedPalletType && !prev.palletTypes.includes(fetchedPalletType)) {
            newState.palletTypes = [...prev.palletTypes, fetchedPalletType];
            changed = true;
          }
          if (fetchedTilesBack && !prev.tilesBack.includes(fetchedTilesBack)) {
            newState.tilesBack = [...prev.tilesBack, fetchedTilesBack];
            changed = true;
          }
          if (fetchedBoxesMarking && !prev.boxesMarking.includes(fetchedBoxesMarking)) {
            newState.boxesMarking = [...prev.boxesMarking, fetchedBoxesMarking];
            changed = true;
          }
          if (fetchedBoxType && !prev.boxTypes.includes(fetchedBoxType)) {
            newState.boxTypes = [...prev.boxTypes, fetchedBoxType];
            changed = true;
          }
          if (fetchedDeliverySchedule && !prev.deliveryTerms.includes(fetchedDeliverySchedule)) {
            newState.deliveryTerms = [...prev.deliveryTerms, fetchedDeliverySchedule];
            changed = true;
          }
          if (fetchedPaymentTerms && !prev.paymentTerms.includes(fetchedPaymentTerms)) {
            newState.paymentTerms = [...prev.paymentTerms, fetchedPaymentTerms];
            changed = true;
          }

          return changed ? newState : prev;
        });

        setFormData((prev) => {
          const gstRate = prev.gstRate || 0.1;
          const gstAmount = totalAmount * (gstRate / 100);
          const poValue = totalAmount + gstAmount;

          return {
            ...prev,
            piReference,
            portOfLoading: selectedInvoice.portOfLoading || selectedInvoice.port_of_loading || '',
            tariffCode: tariffCodeValue,
            currency: 'Indian Rupee',
            palletType: fetchedPalletType,
            tilesBack: fetchedTilesBack,
            boxesMarking: fetchedBoxesMarking,
            boxType: fetchedBoxType,
            fumigation: fetchedFumigation,
            legalisation: fetchedLegalisation,
            deliverySchedule: fetchedDeliverySchedule,
            paymentTerms: fetchedPaymentTerms,
            otherInstructions: fetchedOtherInstructions,
            lcNumber: fetchedLcLumber,
            lcDate: fetchedLcDate,
            epcgNo: fetchedEpcgNo,
            productLines: convertedProductLines,
            totalAmount,
            gstAmount,
            poValue,
            supplier: supplierFromInvoice?.name || prev.supplier || selectedInvoice.supplierName || '',
            supplierId: supplierFromInvoice?.id || prev.supplierId || selectedInvoice.supplierId || '',
            supplierDetails: supplierFromInvoice ? formatSupplierDetails(supplierFromInvoice) : (prev.supplierDetails || ''),
          };
        });
        showInfo(`Data fetched from PI: ${piReference}`);
      } else {
        handleInputChange('piReference', piReference);
      }
    } catch (err) {
      console.error('Error fetching PI data:', err);
      showError('Failed to fetch data from selected Proforma Invoice');
    }
  };

  const handleSupplierChange = (supplierValue) => {
    const selectedSupplier = suppliers.find(
      (supplier) =>
        (supplier.name === supplierValue) ||
        (supplier.supplierName === supplierValue) ||
        (supplier.id === supplierValue)
    );

    if (selectedSupplier) {
      const displayName = selectedSupplier.name || selectedSupplier.supplierName || selectedSupplier.id;
      setFormData((prev) => ({
        ...prev,
        supplier: displayName,
        supplierId: selectedSupplier.id,
        supplierDetails: formatSupplierDetails(selectedSupplier),
        paymentTerms: selectedSupplier.payment_terms || selectedSupplier.paymentTerms || prev.paymentTerms,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        supplier: supplierValue,
        supplierId: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const errorMsgs = [];
    if (!formData.supplier) {
      newErrors.supplier = 'Supplier is required';
      errorMsgs.push(newErrors.supplier);
    }
    if (!formData.portOfLoading?.trim()) {
      newErrors.portOfLoading = 'Port of Loading is required';
      errorMsgs.push(newErrors.portOfLoading);
    }
    if (!formData.piReference) {
      newErrors.piReference = 'PI Reference is required';
      errorMsgs.push(newErrors.piReference);
    }
    if (formData.productLines.length === 0) {
      errorMsgs.push('At least one product line is required');
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
    if (!formData.deliverySchedule) {
      newErrors.deliverySchedule = 'Delivery Schedule is required';
      errorMsgs.push(newErrors.deliverySchedule);
    }
    if (!formData.paymentTerms) {
      newErrors.paymentTerms = 'Payment Terms are required';
      errorMsgs.push(newErrors.paymentTerms);
    }
    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
      errorMsgs.push(newErrors.currency);
    }
    if (!formData.tariffCode) {
      newErrors.tariffCode = 'Tariff Code is required';
      errorMsgs.push(newErrors.tariffCode);
    }
    setErrors(newErrors);
    return errorMsgs;
  };

  const isFormValid = () => {
    // Basic validation for mandatory fields
    const hasSupplier = Boolean(formData.supplier && String(formData.supplier).trim() !== '');
    const hasProducts = Array.isArray(formData.productLines) && formData.productLines.length > 0;

    return hasSupplier && hasProducts && formData.palletType && formData.tilesBack && formData.boxesMarking && formData.boxType && formData.fumigation && formData.legalisation && formData.deliverySchedule && formData.paymentTerms && formData.currency && formData.tariffCode;
  };

  const handleSave = async (reason = null) => {
    if (isDocumentLocked) {
      showError(`This document is ${formData.status} and cannot be edited.`);
      return;
    }

    if (!permissions.canEdit) {
      showError('You do not have permission to save orders. Only super_admin and company_admin users can edit documents.');
      return;
    }

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      scrollToFirstError();
      showError('Please fix the highlighted mandatory fields.');
      return;
    }

    if (order && order.id && (typeof reason !== 'string' || !reason.trim())) {
      setShowRevisionModal(true);
      return;
    }

    try {
      setIsLoading(true);

      const sanitizeDate = (d) => {
        if (!d) return null;
        if (typeof d === 'string' && d.includes('T')) {
          return new Date(d).toLocaleDateString('en-CA');
        }
        return d;
      };

      const totalAmountNum = parseFloat(formData.totalAmount) || 0;
      const gstAmountNum = parseFloat(formData.gstAmount) || 0;
      const poValueNum = totalAmountNum + gstAmountNum;

      const orderData = {
        order_no: formData.orderNo,
        date: sanitizeDate(formData.date),
        supplier_id: formData.supplierId || null,
        supplier_name: formData.supplier || null,
        invoice_ref: formData.piReference || null,
        port_of_loading: formData.portOfLoading,
        tariff_code: formData.tariffCode || null,
        subtotal: totalAmountNum,
        total_amount: poValueNum,
        status: (typeof reason === 'string' && reason.trim()) ? 'Draft' : (formData.status || 'Draft'),
        qc_status: formData.qcStatus || 'Not Ready',
        production_start_date: sanitizeDate(formData.productionStartDate),
        production_end_date: sanitizeDate(formData.productionEndDate),
        expected_delivery: sanitizeDate(formData.expectedDelivery),
        pallets: formData.productLines.reduce((sum, line) => sum + (parseInt(line.pallets) || 0), 0),
        notes: formData.otherInstructions || null,
        product_lines: formData.productLines,
        pallet_type: formData.palletType || null,
        tiles_back: formData.tilesBack || null,
        boxes_marking: formData.boxesMarking || null,
        box_type: formData.boxType || null,
        fumigation: formData.fumigation || 'YES',
        legalisation: formData.legalisation || 'YES',
        delivery_schedule: formData.deliverySchedule || null,
        payment_terms: formData.paymentTerms || null,
        other_instructions: formData.otherInstructions || null,
        gst_rate: formData.gstRate || 0,
        gst_amount: formData.gstAmount || 0,
        currency: formData.currency || 'Indian Rupee',
        revision_reason: (typeof reason === 'string' && reason.trim()) ? reason : 'Updated document details',
      };

      // Save supplier rate history for all product lines
      formData.productLines.forEach((line) => {
        if (line.product && line.rate && formData.supplier) {
          rateHistoryManager.saveSupplierRate(
            formData.supplier,
            line.product,
            line.rate,
            formData.currency
          );
        }
      });

      // Save via API
      if (order && order.id) {
        await updateOrder({ id: order.id, data: orderData });
      } else {
        await createOrder(orderData);
      }

      // Update workflow status for linked documents
      if (formData.status === 'Approved') {
        workflowConnections.updateLinkedStatus(
          'proforma_order',
          formData.piReference,
          'Approved',
          { orderData: orderData }
        );
      }

      showSuccess('Order saved successfully! Supplier rate history updated and workflow synchronized.');

      setTimeout(() => {
        onBack(); // Return to dashboard after saving
      }, 1500);
    } catch (err) {
      setFormError(err);
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
      showError('Failed to save order: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (
      !formData.supplier ||
      formData.productLines.length === 0
    ) {
      showWarning('Please complete the order details before downloading.');
      return;
    }

    const pdfValidation = validatePDFStructure(formData, 'purchase_order');

    if (!pdfValidation.isValid) {
      showError(`Cannot generate PDF: ${pdfValidation.errors.join(', ')}`);
      return;
    }

    setShowPrintView(true);

    setTimeout(async () => {
      try {
        const element = printRef.current;
        if (!element) {
          showError('Print view not found. Please try again.');
          setShowPrintView(false);
          return;
        }

        const filename = generateEnterpriseFilename({
          moduleName: 'PROFORMA-ORDER',
          documentNo: formData?.orderNo || formData?.order_no,
          clientName: formData?.clientName || formData?.client_name || '',
          date: formData?.orderDate || formData?.order_date || '',
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

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        showError('Pop-up blocked. Please allow pop-ups for this site.');
        return;
      }

      // Prepare styles for the print window
      const styles = `
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: 'Outfit', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
          .order-print-view { width: 100%; border: none !important; box-shadow: none !important; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 10px; }
          th { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact; font-weight: bold; }
          .logo-container { text-align: right; margin-bottom: 20px; }
          .logo-container img { max-height: 60px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      `;

      printWindow.document.write('<!DOCTYPE html><html><head><title>Proforma Order - ' + (formData?.orderNo || '') + '</title>' + styles + '</head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  const handleViewPDF = async () => {
    if (
      !formData.supplier ||
      formData.productLines.length === 0
    ) {
      showWarning('Please add some order details to preview.');
      return;
    }

    const pdfValidation = validatePDFStructure(formData, 'purchase_order');

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
   * Calculate totals for display with proper numeric conversion
   */
  const calculateTotals = () => {
    const totals = formData.productLines.reduce(
      (acc, line) => {
        const palletValue = Number(line.totalPallet);
        const boxesValue = line.productType === 'sanitaryware' || line.product_type === 'sanitaryware' 
          ? Number(line.pieces || line.totalBoxes) 
          : Number(line.totalBoxes);
        const sqmValue = Number(line.sqmAuto);
        const netWeightValue = Number(line.netWeight);
        const grossWeightValue = Number(line.grossWeight);
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

    return totals;
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
    <div className="order-form-container">
      {/* Compact Header */}
      <div className="invoice-header" style={{ padding: '10px 16px', marginBottom: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <Row className="align-items-center g-0">
          <Col>
            <div className="d-flex align-items-center">
              <BackButton onBack={onBack} label="Back to Orders" />
              <div className="ms-2">
                <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem', color: '#1a1a2e' }}>
                  {order ? 'Edit Proforma Order' : 'Create Proforma Order'}
                </h5>
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                  {order ? `Editing PO No: ${formData.orderNo}` : 'Build your professional purchase order'}
                </span>
              </div>
            </div>
          </Col>
          <Col xs="auto">
            <div className="invoice-status d-flex align-items-center gap-2">
              {order && (
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
        
        {order && (
          <Row className="mt-2 pt-2 border-top border-light-subtle text-muted" style={{ fontSize: '0.76rem' }}>
            <Col sm={3}>
              <strong>Document No:</strong> {formData.originalInvoiceNo || formData.original_invoice_no || formData.orderNo}
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

      {error && (
        <Alert variant="secondary" dismissible>
          <div className="d-flex align-items-center">
            <AlertCircle size={20} className="me-2" />
            <div>
              <strong>Loading Error:</strong> {typeof error === 'string' ? error : (error.message || 'Failed to load required data')}
            </div>
          </div>
        </Alert>
      )}

      {formError && (
        <Alert variant="secondary" dismissible className="mt-3" onClose={() => setFormError(null)}>
          <div className="d-flex align-items-center">
            <AlertCircle size={20} className="me-2" />
            <div>
              <strong>Error:</strong> {typeof formError === 'string' ? formError : (formError.message || 'An unexpected error occurred')}
            </div>
          </div>
        </Alert>
      )}

      {showAlert && (
        <Alert variant="info" dismissible onClose={() => setShowAlert(false)}>
          {alertMessage}
        </Alert>
      )}

      {/* Permission Warning */}
      {!permissions.canEdit && (
        <Alert variant="warning" className="mb-3">
          <strong>View Only Mode:</strong> You do not have permission to edit or save orders.
          Only super_admin and company_admin users can modify documents. You can still view and generate PDFs.
        </Alert>
      )}

      {/* Document Locked/Approved Warning */}
      {(formData.status === 'Approved' || formData.status === 'Locked') && (
        <Alert variant={formData.status === 'Locked' ? 'danger' : 'warning'} className="mb-3">
          <strong>This document is {formData.status} and cannot be edited.</strong>
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0">Order Details</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Proforma Order No. *</Form.Label>
                <Form.Control className="premium-input bg-light"
                  type="text"
                  value={formData.orderNo}
                  readOnly
                  
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date *</Form.Label>
                <Form.Control className="premium-input"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Proforma Invoice Reference is mandatory.</Tooltip>}>
                  <Form.Label className="fw-bold small mb-2 text-danger" style={{cursor: 'help'}}>
                    PI Reference * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <Form.Select className="premium-input"
                  value={formData.piReference}
                  onChange={(e) => {
                    handlePIReferenceChange(e.target.value);
                    if (errors.piReference) setErrors({...errors, piReference: null});
                  }}
                  isInvalid={!!errors.piReference}
                >
                  <option value="">Select PI Reference</option>
                  {invoices
                    .filter(inv => (inv.status || '').toLowerCase() !== 'revised' && !inv.is_locked && !inv.isLocked && inv.is_locked !== 'true')
                    .map((invoice) => (
                    <option key={invoice.id} value={invoice.invoiceNo || invoice.invoice_no || invoice.id}>
                      {invoice.invoiceNo || invoice.invoice_no || invoice.id}
                      {invoice.clientName || invoice.client_name ? ` (${invoice.clientName || invoice.client_name})` : ''}
                      {invoice.date || invoice.created_at ? ` - ${formatDisplayDate(invoice.date || invoice.created_at)}` : ''}
                    </option>
                  ))}
                </Form.Select>
                {errors.piReference && <div className="invalid-feedback d-block">{errors.piReference}</div>}
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Supplier selection is mandatory.</Tooltip>}>
                  <Form.Label className="fw-bold small mb-2 text-danger" style={{cursor: 'help'}}>
                    Supplier * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                  <Form.Select className="premium-input"
                    value={formData.supplier}
                    onChange={(e) => {
                      handleSupplierChange(e.target.value);
                      if (errors.supplier) setErrors({...errors, supplier: null});
                    }}
                    isInvalid={!!errors.supplier}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers && suppliers.length > 0 ? (
                      suppliers.filter(s => s.status !== 'Inactive' || s.name === formData.supplier || s.supplierName === formData.supplier).map((supplier) => (
                        <option
                          key={supplier.id}
                          value={supplier.name || supplier.supplierName || supplier.id}
                        >
                          {supplier.name || supplier.supplierName || 'Unnamed Supplier'}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No suppliers available</option>
                    )}
                  </Form.Select>
                  {errors.supplier && <div className="invalid-feedback d-block">{errors.supplier}</div>}
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-2">
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Currency is mandatory.</Tooltip>}>
                  <Form.Label className="fw-bold small mb-2 text-danger" style={{cursor: 'help'}}>
                    Currency * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.currency || 'Indian Rupee'}
                  onChange={(value) => handleInputChange('currency', value)}
                  options={masterData.currencies}
                  onAddNew={(value) => handleMasterDataAdd('currencies', value)}
                  placeholder="Select Currency"
                  className="form-control-enhanced"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Tariff Code is mandatory.</Tooltip>}>
                  <Form.Label className="fw-bold small mb-2 text-danger" style={{cursor: 'help'}}>
                    Tariff Code * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.tariffCode}
                  onChange={(value) => handleInputChange('tariffCode', value)}
                  options={masterData.tariffCodes}
                  onAddNew={(value) => handleMasterDataAdd('tariffCodes', value)}
                  placeholder="Select Tariff Code"
                  className="form-control-enhanced"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Port of Loading is mandatory.</Tooltip>}>
                  <Form.Label className="fw-bold small mb-2 text-danger" style={{cursor: 'help'}}>
                    Port of Loading * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.portOfLoading}
                  onChange={(value) => {
                    handleInputChange('portOfLoading', value);
                    if (errors.portOfLoading) setErrors({...errors, portOfLoading: null});
                  }}
                  isInvalid={!!errors.portOfLoading}
                  options={masterData.portsOfLoading}
                  onAddNew={(value) => handleMasterDataAdd('portsOfLoading', value)}
                  placeholder="Select Port"
                  className="form-control-enhanced"
                />
                {errors.portOfLoading && <div className="invalid-feedback d-block">{errors.portOfLoading}</div>}
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-2">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Supplier Details</Form.Label>
                <Form.Control className="premium-input"
                  as="textarea"
                  rows={4}
                  placeholder={FIELD_PLACEHOLDERS.notes.placeholder}
                  value={formData.supplierDetails}
                  onChange={(e) =>
                    handleInputChange('supplierDetails', e.target.value)
                  }
                />
              </Form.Group>
            </Col>
          </Row>

        </Card.Body>
      </Card>

      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Product Lines</h5>
        </Card.Header>
        <Card.Body>
          <OrderProductLineTable
            productLines={formData.productLines}
            onChange={handleProductLinesChange}
            products={products}
            onProductsChange={handleProductsChange}
            showRateHistory={true}
            currentSupplier={formData.supplier}
            rateHistoryManager={rateHistoryManager}
            currency={formData.currency || 'Indian Rupee'}
          />
        </Card.Body>
      </Card>

      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">GST & PO Value</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>GST Rate (%)</Form.Label>
                <Form.Control className="premium-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.gstRate}
                  onChange={(e) =>
                    handleGstRateChange(e.target.value)
                  }
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>GST Amount</Form.Label>
                <Form.Control className="premium-input bg-light"
                  type="text"
                  value={(formData.gstAmount || 0).toFixed ? (formData.gstAmount || 0).toFixed(2) : '0.00'}
                  readOnly
                  
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>PO Value</Form.Label>
                <Form.Control className="premium-input bg-light"
                  type="text"
                  value={(formData.poValue || 0).toFixed ? (formData.poValue || 0).toFixed(2) : '0.00'}
                  readOnly
                  
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Packing Instructions</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Pallet Type is mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Pallet Type * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.palletType}
                  onChange={(value) =>
                    handleInputChange('palletType', value)
                  }
                  options={masterData.palletTypes}
                  onAddNew={(value) =>
                    handleMasterDataAdd('palletTypes', value)
                  }
                  placeholder="Select Pallet Type"
                  className="form-control-enhanced"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Tiles Back is mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Tiles Back * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.tilesBack}
                  onChange={(value) =>
                    handleInputChange('tilesBack', value)
                  }
                  options={masterData.tilesBack}
                  onAddNew={(value) =>
                    handleMasterDataAdd('tilesBack', value)
                  }
                  placeholder="Select Tiles Back"
                  className="form-control-enhanced"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Boxes Marking is mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Boxes Marking * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.boxesMarking}
                  onChange={(value) =>
                    handleInputChange('boxesMarking', value)
                  }
                  options={masterData.boxesMarking}
                  onAddNew={(value) =>
                    handleMasterDataAdd('boxesMarking', value)
                  }
                  placeholder="Select Boxes Marking"
                  className="form-control-enhanced"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Box Type is mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Box Type * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.boxType}
                  onChange={(value) =>
                    handleInputChange('boxType', value)
                  }
                  options={masterData.boxTypes}
                  onAddNew={(value) =>
                    handleMasterDataAdd('boxTypes', value)
                  }
                  placeholder="Select Box Type"
                  className="form-control-enhanced"
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

          <Row className="g-3 mt-2">
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Fumigation is mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Fumigation * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <Form.Select
                  value={formData.fumigation}
                  onChange={(e) =>
                    handleInputChange('fumigation', e.target.value)
                  }
                  className="form-control-enhanced premium-input"
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Legalisation is mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Legalisation * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <Form.Select
                  value={formData.legalisation}
                  onChange={(e) =>
                    handleInputChange('legalisation', e.target.value)
                  }
                  className="form-control-enhanced premium-input"
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Delivery Schedule is mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Delivery Schedule (Terms) * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.deliverySchedule}
                  onChange={(value) => handleInputChange('deliverySchedule', value)}
                  options={masterData.deliveryTerms}
                  onAddNew={(value) => handleMasterDataAdd('deliveryTerms', value)}
                  placeholder="Select Delivery Terms"
                  className="form-control-enhanced"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <OverlayTrigger placement="top" overlay={<Tooltip>Payment Terms are mandatory.</Tooltip>}>
                  <Form.Label className="text-danger" style={{cursor: 'help'}}>
                    Payment Terms * <Info size={12} className="ms-1" />
                  </Form.Label>
                </OverlayTrigger>
                <DynamicDropdown
                  value={formData.paymentTerms}
                  onChange={(value) => handleInputChange('paymentTerms', value)}
                  options={masterData.paymentTerms}
                  onAddNew={(value) => handleMasterDataAdd('paymentTerms', value)}
                  placeholder="Select Payment Terms"
                  className="form-control-enhanced"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-2">
            <Col md={12}>
              <Form.Group>
                <Form.Label>LC & EPCG Details</Form.Label>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Label className="form-label-enhanced text-muted small mb-1">LC Number</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter LC Number"
                      value={formData.lcNumber}
                      onChange={(e) => handleInputChange('lcNumber', e.target.value)}
                      className="form-control-enhanced premium-input"
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label className="form-label-enhanced text-muted small mb-1">LC Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.lcDate}
                      onChange={(e) => handleInputChange('lcDate', e.target.value)}
                      className="form-control-enhanced premium-input"
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label className="form-label-enhanced text-muted small mb-1">EPCG No.</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter EPCG No."
                      value={formData.epcgNo}
                      onChange={(e) => handleInputChange('epcgNo', e.target.value)}
                      className="form-control-enhanced premium-input"
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-2">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Other Instructions</Form.Label>
                <Form.Control className="premium-input"
                  as="textarea"
                  rows={3}
                  value={formData.otherInstructions}
                  onChange={(e) => handleInputChange('otherInstructions', e.target.value)}
                  placeholder="Additional instructions or special requirements..."
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Order Summary & Actions</h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={12}>
              <div className="order-summary">
                <Row className="g-3">
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {Number.isFinite(totals.pallets) ? totals.pallets : 0}
                      </div>
                      <div className="summary-label">Total Pallets</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {Number.isFinite(totals.boxes) ? totals.boxes.toLocaleString() : '0'}
                      </div>
                      <div className="summary-label">Total Boxes</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {Number.isFinite(totals.sqm) ? totals.sqm.toFixed(2) : '0.00'}
                      </div>
                      <div className="summary-label">Total SQM</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {Number.isFinite(totals.netWeight) ? totals.netWeight.toFixed(2) : '0.00'}
                      </div>
                      <div className="summary-label">Net Weight (kgs)</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        {Number.isFinite(totals.grossWeight) ? totals.grossWeight.toFixed(2) : '0.00'}
                      </div>
                      <div className="summary-label">Gross Weight (kgs)</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        ₹{Number.isFinite(totals.amount) ? totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </div>
                      <div className="summary-label">Total Amount</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item">
                      <div className="summary-value">
                        ₹{Number.isFinite(formData.gstAmount) ? formData.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </div>
                      <div className="summary-label">GST Amount (₹)</div>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="summary-item highlight-total">
                      <div className="summary-value">
                        ₹{Number.isFinite(formData.poValue) ? formData.poValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </div>
                      <div className="summary-label">PO Value</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>

          <Row className="mt-4">
            <Col md={12}>
              <div className="order-actions d-flex flex-wrap justify-content-center align-items-center gap-2 py-2">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={isLoading}
                  loadingText="Saving..."
                  icon={<Save size={16} />}
                  className="action-btn"
                  style={{ minWidth: '160px', flex: '0 0 auto' }}
                  disabled={!permissions.canEdit || isDocumentLocked}
                  title={
                    isDocumentLocked ? `This document is ${formData.status} and cannot be edited` :
                      !permissions.canEdit ? 'You do not have permission to save orders' :
                        ''
                  }
                >
                  {order?.id ? 'Update Order' : 'Save Order'}
                </Button>
                <Button
                  variant="success"
                  onClick={handleDownloadPDF}
                  icon={<Printer size={16} />}
                  className="action-btn"
                  style={{ minWidth: '160px', flex: '0 0 auto' }}
                >
                  Download PDF
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={handleViewPDF}
                  icon={<Eye size={16} />}
                  className="action-btn"
                  style={{ minWidth: '160px', flex: '0 0 auto' }}
                >
                  Preview PDF
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Activity History Section */}
      {order && order.id && (
        <Card className="audit-history-card mt-4 mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Header className="order-card-header bg-light border-bottom">
            <div className="d-flex align-items-center text-white">
                <History size={20} className="me-2 text-white" />
                <h5 className="mb-0 text-white">Activity History</h5>
              </div>
          </Card.Header>
          <Card.Body className="p-0">
            <ModuleAuditLog resourceType="proforma_order" resourceId={order.id} />
          </Card.Body>
        </Card>
      )}

      {/* Revision History Card */}
      {order && revisionHistory.length > 0 && (
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
      <Modal contentClassName="glass-modal" show={showRevisionModal} onHide={() => setShowRevisionModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold text-white">Reason for Revision</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Please provide a reason for editing/revising this document:</Form.Label>
            <Form.Control className="premium-input form-control-enhanced"
              as="textarea"
              rows={3}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="e.g., Updated quantities and terms, adjusted prices per supplier's request"
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

      {/* Supplier Form */}
      {showSupplierModal && (
        <SupplierForm
          supplier={null}
          onSave={handleCreateSupplier}
          onCancel={() => setShowSupplierModal(false)}
        />
      )}

      {/* Print View Modal */}
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
              <h5>Order Preview</h5>
              <div>
                <Button
                  variant="primary"
                  onClick={handlePrint}
                  className="me-2"
                >
                  <Printer size={16} className="me-1" />
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
            <div className="print-modal-body">
              <OrderPrintView ref={printRef} orderData={formData} boxTypeImageUrl={masterData?.boxTypeObjects?.find(b => (b.value || b) === formData.boxType)?.imageUrl} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .order-summary {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #bbf7d0;
        }

        .summary-item {
          text-align: center;
          padding: 0.75rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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

        .summary-item.highlight-total {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 2px solid #93c5fd;
        }

        .summary-item.highlight-total .summary-value {
          font-size: 1.25rem;
          color: #1d4ed8;
        }

        .summary-item.highlight-total .summary-label {
          color: #1e40af;
        }

        .order-actions .action-btn {
          min-width: 160px;
          width: auto !important; /* Force natural width on desktop */
        }

        @media (max-width: 768px) {
          .summary-value {
            font-size: 1rem;
          }

          .summary-item.highlight-total .summary-value {
            font-size: 1.1rem;
          }

          .order-actions .action-btn {
            width: 100% !important; /* Force 100% on mobile */
          }
        }

        .print-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .print-modal-content {
          background: white;
          width: 100%;
          max-width: 1000px;
          height: 90vh;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--app-shadow-xl);
        }

        .print-modal-header {
          padding: 1rem 1.5rem;
          background: #ffffff;
          border-bottom: 1px solid var(--app-border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }

        .print-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          background: #f1f5f9;
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default OrderForm;
