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
import { Container, Row, Col, Card, Form, Button, Table, Spinner, OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import { Save, X, Plus, Trash2, ArrowLeft, FileText, ChevronRight, History, Hash, Package, Info, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { getAllPorts, getPortsOfLoading, getPortsOfDischarge, getAllCountries } from '../../../services/masterDataService.js';
import DynamicDropdown from '../../shared/DynamicDropdown.jsx';
import AddableDropdown from '../../shared/AddableDropdown.jsx';
import { showSuccess, showError } from '../../shared/NotificationManager.jsx';
import { clientService } from '../../../services/clientService';
import { supplierService } from '../../../services/supplierService';
import { exportMapper } from '../../../utils/exportMapper';
import { useExportDocumentReferences } from '../../../hooks/useExportDocumentReferences';
import DoubleScrollbarWrapper from '../../shared/DoubleScrollbarWrapper.jsx';
import { transformKeysToSnake } from '../../../utils/dataTransformers';
import ModuleAuditLog from '../../shared/ModuleAuditLog.jsx';
import { scrollToFirstError } from '../../../utils/validationUIHelper.js';
import { extractValidationErrors } from '../../../utils/validationHelper.js';

function ExportInvoiceAnnexureForm({ exportInvoiceId: initialExportInvoiceId, annexureId, onBack, currentUser }) {
  const [exportInvoiceId, setExportInvoiceId] = useState(initialExportInvoiceId || '');
  const [loading, setLoading] = useState(!!initialExportInvoiceId);
  const [fetchingData, setFetchingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const skipNextInit = useRef(false);

  const formatNumber = (num, decimals = 2) => {
    return Number(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatDisplayDates = (dateStr) => {
    if (!dateStr) return '';
    return String(dateStr).split(',').map(d => {
      const trimmed = d.trim();
      const parts = trimmed.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime()) && trimmed.length > 10) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
      }
      return trimmed;
    }).filter((val, i, arr) => arr.indexOf(val) === i).join(', ');
  };

  const [formData, setFormData] = useState({
    packing_list_id: '',
    annexure_no: '',
    export_invoice_id: exportInvoiceId || '',
    invoice_no: '',
    invoice_date: new Date().toLocaleDateString('en-CA'),
    pi_no: '',
    pi_date: '',
    export_invoice_date: '',
    pl_no: '',
    export_invoice_no: '',
    client_name: '',
    consignee_details: '',
    buyer_details: '',
    vessel_flight_no: '',
    port_of_loading: '',
    port_of_discharge: '',
    final_destination: '',
    booking_no: '',
    country_of_origin: '',
    country_of_final_destination: '',
    material_header_description: '',
    total_pallets: 0,
    total_boxes: 0,
    total_sqm: 0,
    net_weight: 0,
    gross_weight: 0,
    pallet_type: '',
    made_in_india: '',
    tiles_back: '',
    box_type: '',
    fumigation: '',
    legalisation: '',
    other_instructions: '',
    container_details: [{
      sr_no: 1, container_no: '', line_seal_no: '', e_seal_no: '',
      vehicle_no: '', tare_wt: '', lr_no: '',
      product: '', material_description: '', pallet_detail: '', detail: '',
      sqm_per_box: 0, total_sqm: 0, boxes: 0, box_weight: 0, net_weight: 0, gross_weight: 0,
      pallets: 0, hsn_code: ''
    }],
    marks_and_numbers: '',
    total_packages: 0,
    product_lines: [],
    pl_totals: { boxes: 0, sqm: 0, net: 0, gross: 0 },
    exists: false,
    ei_updated_at: '',
    updated_at: '',

    // Exporter & Shipping Details
    company_name: '',
    company_address: '',
    iec_no: '',
    shipping_bill_no: '',
    shipping_bill_date: '',
    c_no: '',
    c_date: '',

    // Manufacturer & Customs Fields
    manufacturer_name: '',
    manufacturer_address: '',
    factory_address: '',
    range_name: '',
    division: '',
    commissionerate: '',
    lut_arn_no: '',
    lut_date: '',
    examination_date: '',
    examining_officer: '',
    appraiser_name: '',
    permission_no: '',
    location_code: '',
    division_range: '',
    samples_drawn: '',
    sample_seal_no: ''
  });
  // List of all packing lists for selection
  const [packingLists, setPackingLists] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const normalizeDates = (data) => {
    if (!data) return data;
    const normalized = { ...data };
    const dateFields = [
      'invoice_date', 'pi_date', 'export_invoice_date', 'shipping_bill_date',
      'lut_date', 'examination_date', 'c_date'
    ];
    dateFields.forEach(field => {
      if (normalized[field]) {
        try {
          const d = new Date(normalized[field]);
          if (!isNaN(d.getTime())) {
            normalized[field] = d.toLocaleDateString('en-CA');
          }
        } catch (e) {
          // Keep original value if parsing fails
        }
      }
    });
    return normalized;
  };
  const [productsMaster, setProductsMaster] = useState([]);

  const {
    fetchPackingListReferences,
    getAnnexureInheritedData,
    loading: hookLoading
  } = useExportDocumentReferences();

  const [masterData, setMasterData] = useState({
    ports: [],
    portsOfLoading: [],
    portsOfDischarge: [],
    countries: []
  });

  // Fetch master data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [portsData, polData, podData, countriesData] = await Promise.all([
          getAllPorts().catch(() => []),
          getPortsOfLoading().catch(() => []),
          getPortsOfDischarge().catch(() => []),
          getAllCountries().catch(() => [])
        ]);
        setMasterData({
          ports: Array.isArray(portsData) ? portsData.map(p => p.portName || p) : [],
          portsOfLoading: Array.isArray(polData) ? polData.map(p => p.portName || p.value || p) : [],
          portsOfDischarge: Array.isArray(podData) ? podData.map(p => p.portName || p.value || p) : [],
          countries: Array.isArray(countriesData) ? countriesData.map(c => typeof c === 'string' ? c : (c.countryName || c.country_name || c.name || '')) : []
        });
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Fetch packing lists linked to the current export invoice (with current ID so it is not filtered out)
    const activePlId = formData.packing_list_id || '';
    if (exportInvoiceId) {
      fetchPackingListReferences(exportInvoiceId, '', activePlId).then(data => setPackingLists(data || []));
    } else {
      // If no invoice yet, fetch all available (or keep empty until invoice is selected)
      fetchPackingListReferences(null, '', activePlId).then(data => setPackingLists(data || []));
    }
  }, [fetchPackingListReferences, exportInvoiceId, formData.packing_list_id]);

  // Ensure the current packing list is always available in the dropdown
  useEffect(() => {
    if (formData.packing_list_id && formData.pl_no && !packingLists.some(pl => pl.id === formData.packing_list_id)) {
      setPackingLists(prev => [
        ...prev,
        {
          id: formData.packing_list_id,
          packing_list_no: formData.pl_no || 'Current Packing List',
        }
      ]);
    }
  }, [formData.packing_list_id, formData.pl_no, packingLists]);

  useEffect(() => {
    // Fetch clients

    // Fetch clients
    clientService.getAll()
      .then(r => setClients(r.data?.data || []))
      .catch(e => console.error('Failed to fetch clients:', e));

    // Fetch suppliers
    supplierService.getAll()
      .then(r => setSuppliers(r.data?.data || []))
      .catch(e => console.error('Failed to fetch suppliers:', e));

    // Fetch products
    api.get('/products?limit=1000')
      .then(r => {
        const prodData = r.data?.data;
        const prodArray = Array.isArray(prodData) ? prodData : (Array.isArray(prodData?.data) ? prodData.data : []);
        setProductsMaster(prodArray);
      })
      .catch(e => console.error('Failed to fetch products:', e));
  }, [fetchPackingListReferences, exportInvoiceId]);

  // Fetch company profile for defaults
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      const cid = currentUser?.company_id || currentUser?.companyId || localStorage.getItem('companyId');
      if (!cid) {
        console.warn('[AnnexureForm] No companyId found for profile fetch');
        return;
      }

      try {

        const res = await api.get(`/companies/${cid}`);
        if (res.data?.data) {
          const comp = res.data.data;
          const settings = comp.settings || {};

          setFormData(prev => ({
            ...prev,
            company_name: prev.company_name || comp.name || '',
            company_address: prev.company_address || comp.address || '',
            iec_no: comp.iec_no || comp.iecNo || prev.iec_no || '',
            lut_arn_no: comp.lut_arn_no || comp.lutArnNo || settings.lut_arn_no || prev.lut_arn_no || '',
            lut_date: (comp.lut_date || settings.lut_date) ? (function() {
              try {
                const d = new Date(comp.lut_date || settings.lut_date);
                return isNaN(d.getTime()) ? (prev.lut_date || '') : d.toLocaleDateString('en-CA');
              } catch(e) { return prev.lut_date || ''; }
            })() : (prev.lut_date || ''),
            permission_no: comp.permission_no || settings.permission_no || prev.permission_no || '',
            range_name: prev.range_name || settings.range_name || '',
            division: prev.division || settings.division || '',
            commissionerate: prev.commissionerate || settings.commissionerate || '',
            branch_code_no: prev.branch_code_no || settings.branch_code_no || '',
            bin_no: prev.bin_no || settings.bin_no || comp.pan || ''
          }));
        }
      } catch (err) {
        console.error('Error fetching company profile:', err);
      }
    };
    fetchCompanyProfile();
  }, [currentUser]);



  useEffect(() => {
    if (skipNextInit.current) {
      skipNextInit.current = false;
      return;
    }
    const init = async () => {
      try {
        setLoading(true);

        // CASE 1: Editing an existing Annexure (primary path if we have an ID)
        if (annexureId) {

          const res = await api.get(`/export-invoice-annexures/annexure/${annexureId}`);
          const data = res.data?.data;

          if (data) {

            const mappedData = exportMapper.mapPLToAnnexure(data);

            // Fetch inherited data to populate missing PI details that the Annexure table doesn't natively store
            let inheritedFields = {};
            if (data.packing_list_id && (!mappedData.pi_no || !mappedData.pi_date)) {
                try {
                    const inherited = await getAnnexureInheritedData(data.packing_list_id);
                    if (inherited) {
                        inheritedFields = {
                            pi_no: inherited.pi_no || inherited.proforma_invoice_no || '',
                            pi_date: inherited.pi_date || inherited.proforma_date || inherited.proforma_invoice_date || '',
                            export_invoice_date: inherited.export_invoice_date || inherited.invoice_date || '',
                            export_invoice_no: inherited.export_invoice_no || inherited.invoice_no || ''
                        };
                    }
                } catch (e) {
                    console.warn("Could not fetch inherited annexure data:", e);
                }
            }

            // Ensure synchronization between local state and fetched data
            if (data.export_invoice_id && data.export_invoice_id !== exportInvoiceId) {
              setExportInvoiceId(data.export_invoice_id);
            }

            setFormData(prev => ({
              ...prev,
              ...mappedData,
              pi_no: mappedData.pi_no || inheritedFields.pi_no || prev.pi_no || '',
              pi_date: mappedData.pi_date || inheritedFields.pi_date || prev.pi_date || '',
              export_invoice_no: mappedData.export_invoice_no || inheritedFields.export_invoice_no || prev.export_invoice_no || '',
              export_invoice_date: mappedData.export_invoice_date || inheritedFields.export_invoice_date || prev.export_invoice_date || '',
              exists: true,
              ei_updated_at: data.ei_updated_at || data.eiUpdatedAt || '',
              updated_at: data.updated_at || data.updatedAt || ''
            }));
            return;
          }
        }

        // CASE 2: New Annexure via Export Invoice reference (Inheritance mode)
        else if (exportInvoiceId) {
          const res = await api.get(`/export-invoice-annexures/export-invoice/${exportInvoiceId}`);
          const data = res.data?.data;

          if (data) {
            const snakeData = normalizeDates(transformKeysToSnake(data));

            // Merge with defaults from mapper
            const mappedData = exportMapper.mapPLToAnnexure(null, data);

            setFormData(prev => ({
              ...prev,
              ...mappedData,
              ...snakeData,
              // Ensure iec_no and LUT info are not lost if empty in snakeData
              iec_no: snakeData.iec_no || mappedData.iec_no || prev.iec_no || '',
              lut_arn_no: snakeData.lut_arn_no || mappedData.lut_arn_no || prev.lut_arn_no || '',
              lut_date: snakeData.lut_date || mappedData.lut_date || prev.lut_date || '',
              pi_date: snakeData.pi_date || mappedData.pi_date || prev.pi_date || '',
              export_invoice_date: snakeData.export_invoice_date || mappedData.export_invoice_date || prev.export_invoice_date || '',
              exists: !!data.id
            }));
          }
          return;
        }

        // CASE 3: Completely fresh form (Next number only)
        else {
          const res = await api.get('/export-invoice-annexures/next-number');
          if (res.data?.data?.annexureNo) {
            setFormData(prev => ({ ...prev, annexure_no: res.data.data.annexureNo }));
          }
        }
      } catch (e) {
        console.error('Annexure init error:', e);
        showError('Failed to load annexure data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [exportInvoiceId, annexureId]);


  // ── When user picks a packing list from the dropdown ──
  const handlePackingListSelect = async (e) => {
    const plId = e.target.value;
    if (!plId) {
      setFormData(prev => ({ ...prev, packing_list_id: '' }));
      return;
    }


    try {
      setFetchingData(true);
      // Use the hook function for consistency
      const rawData = await getAnnexureInheritedData(plId);

      if (!rawData) {
        showError('No data returned for this packing list');
        return;
      }


      // Use mapper to ensure all fields are aligned
      const mappedData = exportMapper.mapPLToAnnexure(rawData);

      // Important: Ensure exportInvoiceId is updated if returned
      const nextExportInvoiceId = rawData.export_invoice_id || rawData.exportInvoiceId || '';
      if (nextExportInvoiceId && nextExportInvoiceId !== exportInvoiceId) {
        skipNextInit.current = true;
        setExportInvoiceId(nextExportInvoiceId);
      }

      setFormData(prev => ({
        ...prev,
        ...mappedData,
        packing_list_id: plId,
        export_invoice_id: nextExportInvoiceId || prev.export_invoice_id,
        // Ensure some critical fields are set even if mapper missed them
        export_invoice_no: mappedData.export_invoice_no || rawData.export_invoice_no || rawData.invoice_no || rawData.exportInvoiceNo || '',
        export_invoice_date: mappedData.export_invoice_date || rawData.export_invoice_date || rawData.invoice_date || rawData.exportInvoiceDate || '',
        pi_no: mappedData.pi_no || rawData.pi_no || rawData.pi_reference || rawData.proforma_invoice_no || '',
        pi_date: mappedData.pi_date || rawData.pi_date || rawData.proforma_date || rawData.proforma_invoice_date || rawData.pi_invoice_date || rawData.proforma_invoice_date || rawData.piDate || rawData.proformaDate || '',
        consignee_details: mappedData.consignee_details || rawData.consignee_details || rawData.consignee || rawData.inv_consignee_details || '',
        buyer_details: mappedData.buyer_details || rawData.buyer_details || rawData.buyer || rawData.inv_buyer_details || '',
        iec_no: mappedData.iec_no || rawData.iec_no || rawData.company_iec || prev.iec_no || '',
        lut_arn_no: mappedData.lut_arn_no || rawData.lut_arn_no || rawData.lut_arn_bond_no || prev.lut_arn_no || '',
        lut_date: mappedData.lut_date || rawData.lut_date || prev.lut_date || '',
        vessel_flight_no: mappedData.vessel_flight_no || rawData.vessel_flight_no || rawData.vessel_name || rawData.vesselName || '',
        port_of_loading: mappedData.port_of_loading || rawData.port_of_loading || rawData.pol || '',
        port_of_discharge: mappedData.port_of_discharge || rawData.port_of_discharge || rawData.pod || '',
        final_destination: mappedData.final_destination || rawData.final_destination || '',
        booking_no: mappedData.booking_no || rawData.booking_no || rawData.inv_booking_no || '',
        client_name: mappedData.client_name || rawData.client_name || '',
        pallet_type: mappedData.pallet_type || rawData.pallet_type || '',
        box_type: mappedData.box_type || rawData.box_type || '',
        marks_and_numbers: mappedData.marks_and_numbers || rawData.marks_and_numbers || rawData.boxes_marking || '',
        pl_totals: {
          boxes: parseInt(rawData.total_boxes || rawData.totalBoxes || 0),
          sqm: parseFloat(rawData.total_sqm || rawData.totalSqm || 0),
          net: parseFloat(rawData.net_weight || rawData.netWeight || 0),
          gross: parseFloat(rawData.gross_weight || rawData.grossWeight || 0)
        },
        ei_updated_at: rawData.ei_updated_at || rawData.eiUpdatedAt || '',
        updated_at: rawData.updated_at || rawData.updatedAt || ''
      }));

      showSuccess('Packing list data loaded successfully');
    } catch (err) {
      console.error('[AnnexureForm] Error loading packing list:', err);
      showError('Failed to load packing list data: ' + (err.response?.data?.message || err.message));
    } finally {
      setFetchingData(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Container row helpers ──
  const extractPallets = (str) => {
    if (!str) return 0;
    const match = String(str).match(/^(\d+)\s*[-to_]+\s*(\d+)$/i);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      return Math.abs(end - start) + 1;
    }
    const single = parseInt(str, 10);
    return isNaN(single) ? 0 : single;
  };

  const addContainer = () => {
    const newSr = formData.container_details.length + 1;
    setFormData(prev => ({
      ...prev,
      container_details: [...prev.container_details, {
        sr_no: newSr, container_no: '', line_seal_no: '', e_seal_no: '',
        vehicle_no: '', tare_wt: '', lr_no: '',
        product: '', material_description: '', pallet_detail: '', detail: '',
        sqm_per_box: 0, total_sqm: 0, boxes: 0, box_weight: 0, net_weight: 0, gross_weight: 0, pallets: 0, hsn_code: ''
      }],
    }));
  };

  const removeContainer = (index) => {
    setFormData(prev => ({
      ...prev,
      container_details: prev.container_details.filter((_, i) => i !== index),
    }));
  };

  const handleContainerChange = (index, field, value) => {
    const newList = [...formData.container_details];

    if (field === 'product') {
      // Robust description extractor that ignores literal key names
      const getCleanDesc = (p) => {
        if (!p) return '';
        const possibleKeys = ['material_description', 'materialDescription', 'description', 'product_description', 'productDescription'];
        for (const k of possibleKeys) {
          const val = p[k];
          if (val && typeof val === 'string' && val.trim() !== '' && val !== k && val !== 'material_description' && val !== 'product_description') {
            return val;
          }
        }
        return '';
      };

      // Find product data: prioritize Master list for "Proper" management data
      const selectedProd = productsMaster?.find(p => (p.company_product_name || p.name || p.product_name) === value) ||
        formData.product_lines?.find(p => p.product === value);

      if (selectedProd) {
        newList[index] = {
          ...newList[index],
          product: value,
          material_description: getCleanDesc(selectedProd) || `${selectedProd.name || ''} ${selectedProd.size || ''}`.trim(),
          sqm_per_box: parseFloat(selectedProd.sqm_per_box || selectedProd.sqmPerBox || 0),
          box_weight: parseFloat(selectedProd.box_weight || selectedProd.boxWeight || selectedProd.per_box_weight || 0),
          per_pallet_weight: parseFloat(selectedProd.default_per_pallet_weight || selectedProd.defaultPerPalletWeight || 20),
          hsn_code: selectedProd.hsn_code || selectedProd.hsnCode || selectedProd.hs_code || selectedProd.hsCode || selectedProd.tariff_code || selectedProd.tariffCode || ''
        };
      } else {
        newList[index] = { ...newList[index], [field]: value };
      }
    } else {
      newList[index] = { ...newList[index], [field]: value };
    }

    // Calculate derived values based on new formula inputs
    const row = newList[index];
    const nBox = parseFloat(row.boxes) || 0;
    const nBoxWt = parseFloat(row.box_weight) || 0;
    const nPalletCnt = parseFloat(row.pallets) || 0;
    const nSqmBox = parseFloat(row.sqm_per_box) || 0;

    // 0. SQM * Boxes = Total SQM
    if (field === 'boxes' || field === 'sqm_per_box' || field === 'product') {
      newList[index].total_sqm = parseFloat((nSqmBox * nBox).toFixed(2));
    }

    // 1. Boxes * Box Wt = NET WT
    if (field === 'boxes' || field === 'box_weight' || field === 'pallets' || field === 'product') {
      const netWt = parseFloat((nBox * nBoxWt).toFixed(2));
      newList[index].net_weight = netWt;

      // 2. NET WT + Total Pallet * PalletWt = GROSS WT
      const palletWt = parseFloat(row.per_pallet_weight || 20);
      newList[index].gross_weight = parseFloat((netWt + (nPalletCnt * palletWt)).toFixed(2));
    }

    // Auto-extract pallet count from range if pallet_detail changed
    if (field === 'pallet_detail') {
      const count = extractPallets(value);
      newList[index].pallets = count;
      // Re-trigger weight calculation
      const netWt = parseFloat(newList[index].net_weight || 0);
      const palletWt = parseFloat(newList[index].per_pallet_weight || 20);
      newList[index].gross_weight = parseFloat((netWt + (count * palletWt)).toFixed(2));
    }

    let totalBoxes = 0, totalSqm = 0, totalNet = 0, totalGross = 0, totalPlts = 0;
    newList.forEach(c => {
      totalBoxes += parseFloat(c.boxes || 0);
      totalSqm += parseFloat(c.total_sqm || 0);
      totalNet += parseFloat(c.net_weight || 0);
      totalGross += parseFloat(c.gross_weight || 0);
      totalPlts += parseFloat(c.pallets || 0);
    });

    setFormData(prev => ({
      ...prev,
      container_details: newList,
      total_boxes: totalBoxes,
      total_packages: totalBoxes,
      total_pallets: totalPlts,
      total_sqm: parseFloat(totalSqm.toFixed(2)),
      net_weight: parseFloat(totalNet.toFixed(2)),
      gross_weight: parseFloat(totalGross.toFixed(2)),
    }));
  };

  // Auto-heal missing HSN codes for containers loaded from legacy packing lists
  useEffect(() => {
    if (!productsMaster || productsMaster.length === 0 || !formData.container_details || formData.container_details.length === 0) return;

    let needsHeal = false;
    const healedContainers = formData.container_details.map(c => {
      if (!c.hsn_code && c.product) {
        const prod = productsMaster.find(p => (p.company_product_name || p.name || p.product_name) === c.product) || formData.product_lines?.find(p => p.product === c.product);
        if (prod && (prod.hsn_code || prod.hsnCode || prod.hs_code || prod.hsCode || prod.tariff_code)) {
          needsHeal = true;
          return {
            ...c,
            hsn_code: prod.hsn_code || prod.hsnCode || prod.hs_code || prod.hsCode || prod.tariff_code || ''
          };
        }
      }
      return c;
    });

    if (needsHeal) {
      setFormData(prev => ({ ...prev, container_details: healedContainers }));
    }
  }, [productsMaster, formData.container_details, formData.product_lines]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.packing_list_id) newErrors.packing_list_id = 'Packing List is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSyncPIData = async () => {
    if (!formData.packing_list_id) return;
    try {
      setSaving(true);
      const rawData = await getAnnexureInheritedData(formData.packing_list_id);
      if (rawData) {
        const mappedData = exportMapper.mapPLToAnnexure(rawData);
        setFormData(prev => ({
          ...prev,
          ...mappedData,
          ei_updated_at: rawData.ei_updated_at || rawData.eiUpdatedAt || prev.ei_updated_at,
        }));
        showSuccess('Data auto-fetched from Export Invoice & Packing List!');
      }
    } catch (e) {
      console.error('Sync failed:', e);
      showError('Failed to sync with latest master data');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!validateForm()) {
      scrollToFirstError();
      showError('Please fix the highlighted mandatory fields.');
      return;
    }

    const finalExportInvoiceId = exportInvoiceId || formData.export_invoice_id;
    if (!finalExportInvoiceId) {
      showError('Please load a Packing List first to link this annexure to an Export Invoice.');
      return;
    }
    try {
      setSaving(true);
      const res = await api.post(`/export-invoice-annexures/export-invoice/${finalExportInvoiceId}`, {
        ...formData,
        export_invoice_id: finalExportInvoiceId,
      });

      // Update form data with final generated sequence number and status from DB
      if (res.data?.data) {
        setFormData(prev => ({
          ...prev,
          annexure_no: res.data.data.annexure_no || prev.annexure_no,
          exists: true
        }));
      }

      showSuccess('Annexure saved successfully');

      // Dispatch event for live update in dashboards
      window.dispatchEvent(new CustomEvent('exportAnnexure:changed'));

      setTimeout(() => {
        if (onBack) onBack();
      }, 1000);
    } catch (err) {
      console.error('Annexure save error:', err);
      
      // Parse backend errors
      if (err.response?.status === 400 && err.response?.data?.errors) {
        const parsedErrors = extractValidationErrors(err.response.data.errors);
        if (Object.keys(parsedErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...parsedErrors }));
          scrollToFirstError();
          showError('Validation failed. Please check the highlighted fields.');
          return;
        }
      }
      
      showError(err?.response?.data?.message || 'Failed to save annexure');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="text-center py-5">
      <Spinner animation="border" variant="primary" />
      <p className="mt-3 text-muted">Loading annexure data…</p>
    </div>
  );

  const safeNum = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
  const piDataOutdated = formData.exists && formData.ei_updated_at && formData.updated_at && new Date(formData.ei_updated_at) > new Date(formData.updated_at);

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      {/* ── Header ── */}
      <div className="d-flex flex-row justify-content-between align-items-center gap-2 mb-2 px-3"
        style={{ padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-secondary" onClick={onBack} className="p-1 bg-white shadow-sm border-0 rounded-3 text-primary" style={{ width: 32, height: 32, flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </Button>
          <FileText className="text-primary" size={18} style={{ flexShrink: 0 }} />
          <div>
            <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem', color: '#1a1a2e' }}>Invoice Annexure</h5>
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>Container & packing details — generated from packing list</span>
          </div>
        </div>
        <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
          {formData.export_invoice_id && (
             <Button variant="info" onClick={handleSyncPIData} className="fw-bold shadow-sm text-white" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px' }}>
                <RefreshCw size={14} className="me-1" /> Sync Latest PI Data
             </Button>
          )}
          <Button variant="primary" type="submit" form="annexure-form" disabled={saving} className="fw-bold shadow-sm" style={{ borderRadius: '8px', fontSize: '0.84rem', height: '34px', padding: '0 14px', minWidth: '120px' }}>
            {saving ? <Spinner animation="border" size="sm" /> : <><Save size={14} className="me-1" />{formData.exists ? 'Update' : 'Save'} Annexure</>}
          </Button>
        </div>
      </div>

      <Form id="annexure-form" onSubmit={handleSubmit} className="px-3">
        {piDataOutdated && (
          <Alert variant="warning" className="mb-4 d-flex align-items-center fw-bold shadow-sm rounded-3">
            <Info size={20} className="me-2" />
            PI data has been updated. Please click "Sync Latest PI Data" to refresh connected documents.
          </Alert>
        )}
        {/* ── Basic Information ── */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">BASIC INFORMATION</h6>
          </Card.Header>
          <Card.Body className="p-4 bg-white">
            <Row className="g-4">
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Packing List must be selected.</Tooltip>}>
                    <Form.Label className="fw-bold small mb-2 tracking-wide text-uppercase text-danger" style={{cursor: 'help'}}>
                      Packing List No. * <Info size={12} className="ms-1" />
                      {fetchingData && <Spinner animation="border" size="sm" className="ms-2 text-primary" />}
                    </Form.Label>
                  </OverlayTrigger>
                  <Form.Select
                    className={`bg-light py-2 px-3 fw-bold ${errors.packing_list_id ? 'border-danger' : 'border-0'}`}
                    style={{ borderRadius: '10px', height: '48px' }}
                    value={formData.packing_list_id || ''}
                    onChange={(e) => {
                      handlePackingListSelect(e);
                      if (errors.packing_list_id) setErrors(prev => ({ ...prev, packing_list_id: null }));
                    }}
                    disabled={fetchingData || loading}
                    isInvalid={!!errors.packing_list_id}
                  >
                    <option value="">Select Packing List...</option>
                    {packingLists.map(pl => (
                      <option key={pl.id} value={pl.id}>
                        {pl.packing_list_no || pl.packingListNo}
                      </option>
                    ))}
                  </Form.Select>
                  {errors.packing_list_id && <div className="invalid-feedback d-block">{errors.packing_list_id}</div>}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">Annexure No.</Form.Label>
                  <Form.Control value={formData.annexure_no} readOnly className="bg-light border-0 py-2 px-3 fw-bold text-primary" style={{ borderRadius: '10px', height: '48px' }} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">Export Invoice No.</Form.Label>
                  <Form.Control value={formData.export_invoice_no} readOnly className="bg-light border-0 py-2 px-3 fw-bold text-dark" style={{ borderRadius: '10px', height: '48px' }} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">Export Invoice Date</Form.Label>
                  <Form.Control type="date" value={formData.export_invoice_date} readOnly className="bg-light border-0 py-2 px-3 text-dark" style={{ borderRadius: '10px', height: '48px' }} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">PI No.</Form.Label>
                  <div
                    title={formData.pi_no}
                    className="form-control bg-light border-0 py-2 px-3 fw-bold text-dark d-flex align-items-center"
                    style={{ borderRadius: '10px', minHeight: '48px', height: 'auto', wordBreak: 'break-word', whiteSpace: 'normal' }}
                  >
                    {formData.pi_no || '-'}
                  </div>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">Proforma Invoice Date</Form.Label>
                  <div
                    title={formatDisplayDates(formData.pi_date)}
                    className="form-control bg-light border-0 py-2 px-3 fw-bold text-dark d-flex align-items-center"
                    style={{ borderRadius: '10px', minHeight: '48px', height: 'auto', wordBreak: 'break-word', whiteSpace: 'normal' }}
                  >
                    {formatDisplayDates(formData.pi_date) || '-'}
                  </div>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-2 tracking-wide text-uppercase">Vessel/Flight No.</Form.Label>
                  <Form.Control
                    value={formData.vessel_flight_no || ''}
                    onChange={e => handleInputChange('vessel_flight_no', e.target.value.toUpperCase())}
                    className="bg-white border-1 py-2 px-3 fw-bold text-primary"
                    style={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>

            </Row>

          </Card.Body>
        </Card>


        {/* ── Customs & Logistical Information ── */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
            <h6 className="mb-0 fw-bold text-uppercase text-white">Customs & Logistical Information</h6>
          </Card.Header>
          <Card.Body className="p-4 bg-white">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Exporter Name</Form.Label>
                  <Form.Control
                    value={formData.company_name}
                    onChange={e => handleInputChange('company_name', e.target.value.toUpperCase())}
                    className="bg-white border-1 fw-bold"
                    style={{ borderRadius: 10, height: 48 }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Exporter Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.company_address}
                    onChange={e => handleInputChange('company_address', e.target.value.toUpperCase())}
                    className="bg-white border-1"
                    style={{ borderRadius: 10, resize: 'vertical' }}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── SHIPPING & TRANSPORT DETAILS ── */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden border-top border-4 border-primary">
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex align-items-center justify-content-start">
            <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-white">SHIPPING & TRANSPORT DETAILS</h6>
          </Card.Header>
          <Card.Body className="p-4 bg-white">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Consignee Details</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={formData.consignee_details}
                    onChange={e => handleInputChange('consignee_details', e.target.value.toUpperCase())}
                    className="bg-white border-1 py-2 px-3 text-dark"
                    style={{ borderRadius: 10 }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Buyer Details</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={formData.buyer_details}
                    onChange={e => handleInputChange('buyer_details', e.target.value.toUpperCase())}
                    className="bg-white border-1 py-2 px-3 text-dark"
                    style={{ borderRadius: 10 }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-1">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Port of Loading</Form.Label>
                  <AddableDropdown
                    value={formData.port_of_loading}
                    onChange={val => handleInputChange('port_of_loading', val)}
                    masterDataType="portsOfLoading"
                    options={masterData.portsOfLoading}
                    label="Port of Loading"
                    placeholder="Select Port of Loading"
                    selectClassName="py-2 px-3 bg-white border-1 fw-bold"
                    selectStyle={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Port of Discharge</Form.Label>
                  <AddableDropdown
                    value={formData.port_of_discharge}
                    onChange={val => handleInputChange('port_of_discharge', val)}
                    masterDataType="portsOfDischarge"
                    options={masterData.portsOfDischarge}
                    label="Port of Discharge"
                    placeholder="Select Port of Discharge"
                    selectClassName="py-2 px-3 bg-white border-1 fw-bold"
                    selectStyle={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Final Destination</Form.Label>
                  <AddableDropdown
                    value={formData.final_destination}
                    onChange={val => handleInputChange('final_destination', val)}
                    masterDataType="finalDestinations"
                    label="Final Destination"
                    placeholder="Select Final Destination"
                    selectClassName="py-2 px-3 bg-white border-1 fw-bold"
                    selectStyle={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-1">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Country of Origin</Form.Label>
                  <AddableDropdown
                    value={formData.country_of_origin}
                    onChange={val => handleInputChange('country_of_origin', val)}
                    masterDataType="countries"
                    options={masterData.countries}
                    label="Country of Origin"
                    placeholder="Select Country"
                    selectClassName="py-2 px-3 bg-white border-1 fw-bold text-dark"
                    selectStyle={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Country of Final Destination</Form.Label>
                  <AddableDropdown
                    value={formData.country_of_final_destination}
                    onChange={val => handleInputChange('country_of_final_destination', val)}
                    masterDataType="countries"
                    options={masterData.countries}
                    label="Country of Final Destination"
                    placeholder="Select Country"
                    selectClassName="py-2 px-3 bg-white border-1 fw-bold text-dark"
                    selectStyle={{ borderRadius: '10px', height: '48px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Total Packages</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.total_packages}
                    onChange={e => setFormData(p => ({ ...p, total_packages: parseInt(e.target.value) || 0 }))}
                    className="bg-light border-0 py-2 px-3 fw-bold"
                    style={{ borderRadius: 10, height: 48 }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-1">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Marks &amp; Numbers</Form.Label>
                  <Form.Control
                    value={formData.marks_and_numbers}
                    onChange={e => setFormData(p => ({ ...p, marks_and_numbers: e.target.value }))}
                    className="bg-light border-0 py-2 px-3"
                    style={{ borderRadius: 10, height: 48 }}
                    placeholder="Auto-populated from Packing List"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>




        {/* ── Material Description ── */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Body className="p-4 bg-white">
            <Form.Group>
              <Form.Label className="fw-bold small text-secondary mb-1">Overall Material Description</Form.Label>
              <Form.Control
                value={formData.material_header_description}
                onChange={e => setFormData(p => ({ ...p, material_header_description: e.target.value }))}
                className="bg-light border-0 fw-bold text-primary"
                style={{ borderRadius: 12, fontSize: '1rem' }}
                placeholder="e.g. 05×20' GLAZED PORCELAIN TILES MATT 60×120×1.5CM PRM"
              />
            </Form.Group>
          </Card.Body>
        </Card>

        {/* ── Container Details ── */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Header className="bg-primary text-white py-3 border-0 d-flex justify-content-start align-items-center gap-2">
            <h6 className="mb-0 fw-bold text-uppercase text-white">Container &amp; Pallet Details</h6>
            <div className="ms-auto">
              <Button variant="light" size="sm" onClick={addContainer} className="fw-bold rounded-3">
                <Plus size={14} className="me-1" /> Add Container
              </Button>
            </div>
          </Card.Header>
          <DoubleScrollbarWrapper deps={[formData.container_details]} wrapperClassName="table-responsive ">
            <Table bordered hover className="mb-0 align-middle text-center small fw-medium">
              <thead className="bg-light text-secondary border-bottom border-2">
                <tr className="align-middle">
                  <th style={{ width: 50 }}>SR.</th>
                  <th>Container No.</th>
                  <th>Line Seal</th>
                  <th>E-Seal No.</th>
                  <th>Vehicle No.</th>
                  <th>Tare WT</th>
                  <th>LR No.</th>
                  <th>Product</th>
                  <th>Material Description</th>
                  <th>PALLET NO.</th>
                  <th>Plt Cnt</th>
                  <th>PALLET Detail</th>
                  <th>SQM/Box</th>
                  <th>Total SQM</th>
                  <th>Boxes</th>
                  <th>Box Wt</th>
                  <th>Net Wt</th>
                  <th>Gross Wt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.container_details.map((c, i) => (
                  <tr key={i} style={c.is_foc ? { backgroundColor: '#fff5f5' } : {}}>
                    <td data-label="SR.">{c.sr_no || i + 1}</td>
                    <td data-label="Container No."><Form.Control size="sm" style={{ minWidth: '130px', maxWidth: '200px' }} value={c.container_no || ''} onChange={e => handleContainerChange(i, 'container_no', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Line Seal"><Form.Control size="sm" style={{ minWidth: '100px', maxWidth: '150px' }} value={c.line_seal_no || ''} onChange={e => handleContainerChange(i, 'line_seal_no', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="E-Seal No."><Form.Control size="sm" style={{ minWidth: '100px', maxWidth: '150px' }} value={c.e_seal_no || ''} onChange={e => handleContainerChange(i, 'e_seal_no', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Vehicle No."><Form.Control size="sm" style={{ minWidth: '120px', maxWidth: '180px' }} value={c.vehicle_no || ''} onChange={e => handleContainerChange(i, 'vehicle_no', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Tare WT"><Form.Control type="number" step="0.01" size="sm" style={{ minWidth: '90px', maxWidth: '140px' }} value={c.tare_wt || ''} onChange={e => handleContainerChange(i, 'tare_wt', e.target.value)} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="LR No."><Form.Control size="sm" style={{ minWidth: '100px', maxWidth: '150px' }} value={c.lr_no || ''} onChange={e => handleContainerChange(i, 'lr_no', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Product">
                      <Form.Select
                        size="sm"
                        value={c.product || ''}
                        onChange={e => handleContainerChange(i, 'product', e.target.value)}
                        className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto"
                        style={{ minWidth: '150px', maxWidth: '250px' }}
                      >
                        <option value="">Select Product</option>
                        {/* Combine products from current invoice and total master list */}
                        {Array.from(new Set([
                          ...(formData.product_lines?.map(p => p.product) || []),
                          ...(productsMaster?.map(p => p.company_product_name || p.name || p.product_name) || [])
                        ].filter(Boolean))).sort().map((prod, idx) => (
                          <option key={idx} value={prod}>{prod}</option>
                        ))}
                      </Form.Select>
                    </td>
                    <td data-label="Material Description"><Form.Control size="sm" as="textarea" rows={3} value={c.material_description || ''} onChange={e => handleContainerChange(i, 'material_description', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-start ms-auto ms-lg-0" style={{ minWidth: '280px', maxWidth: '400px', resize: 'vertical', fontSize: '12px' }} /></td>
                    <td data-label="Pallets"><Form.Control size="sm" style={{ minWidth: '80px', maxWidth: '120px' }} value={c.pallet_detail || ''} onChange={e => handleContainerChange(i, 'pallet_detail', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" placeholder="1-19" /></td>
                    <td data-label="Plt Cnt"><Form.Control size="sm" type="number" style={{ minWidth: '60px', maxWidth: '100px' }} value={c.pallets || 0} readOnly className="border-0 bg-white text-end text-lg-center fw-bold ms-auto mx-lg-auto" /></td>
                    <td data-label="Pallet Detail"><Form.Control size="sm" style={{ minWidth: '100px', maxWidth: '150px' }} value={c.detail || ''} onChange={e => handleContainerChange(i, 'detail', e.target.value.toUpperCase())} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="SQM/Box"><Form.Control size="sm" type="number" style={{ minWidth: '80px', maxWidth: '120px' }} value={c.sqm_per_box || 0} onChange={e => handleContainerChange(i, 'sqm_per_box', e.target.value)} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Total SQM"><Form.Control size="sm" type="number" style={{ minWidth: '90px', maxWidth: '130px' }} value={c.total_sqm || 0} readOnly className="border-0 bg-white text-end text-lg-center fw-bold ms-auto mx-lg-auto" /></td>
                    <td data-label="Boxes"><Form.Control size="sm" type="number" style={{ minWidth: '80px', maxWidth: '120px' }} value={c.boxes || 0} onChange={e => handleContainerChange(i, 'boxes', e.target.value)} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Box Wt"><Form.Control size="sm" type="number" style={{ minWidth: '70px', maxWidth: '110px' }} value={c.box_weight || 0} onChange={e => handleContainerChange(i, 'box_weight', e.target.value)} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Net Wt"><Form.Control size="sm" type="number" style={{ minWidth: '90px', maxWidth: '130px' }} value={c.net_weight || 0} onChange={e => handleContainerChange(i, 'net_weight', e.target.value)} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="Gross Wt"><Form.Control size="sm" type="number" style={{ minWidth: '90px', maxWidth: '130px' }} value={c.gross_weight || 0} onChange={e => handleContainerChange(i, 'gross_weight', e.target.value)} className="border-0 bg-light text-end text-lg-center ms-auto mx-lg-auto" /></td>
                    <td data-label="ACTIONS">
                      <Button variant="link" className="text-danger p-0" onClick={() => removeContainer(i)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-light animate__animated animate__fadeIn" style={{ fontSize: '1.1em', borderTop: '2px solid #dee2e6' }}>
                  <td data-label="" colSpan={9} className="text-end text-uppercase py-3 fw-bolder fs-6">Totals:</td>
                  <td></td>
                  <td data-label="TOTAL PALLETS" className="text-end text-lg-center py-3 fw-bolder fs-6">{formData.total_pallets}</td>
                  <td></td>
                  <td></td>
                  <td data-label="TOTAL SQM" className="text-end text-lg-center py-3 text-primary fw-bolder fs-6">{safeNum(formData.total_sqm).toFixed(2)}</td>
                  <td data-label="TOTAL BOXES" className="text-end text-lg-center py-3 fw-bolder fs-6">{formData.total_boxes}</td>
                  <td></td>
                  <td data-label="TOTAL NET WT" className="text-end text-lg-center py-3 text-danger fw-bolder fs-6">{safeNum(formData.net_weight).toFixed(2)}</td>
                  <td data-label="TOTAL GROSS WT" className="text-end text-lg-center py-3 text-danger fw-bolder fs-6">{safeNum(formData.gross_weight).toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </Table>
          </DoubleScrollbarWrapper>

          {/* Mobile View: Container Cards */}
          <div className="d-block d-lg-none p-3 bg-light bg-opacity-50">
            {formData.container_details && formData.container_details.length > 0 ? (
              <>
                {formData.container_details.map((c, i) => (
                  <Card key={i} className="mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Header className="bg-white py-3 px-3 border-bottom d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
                          <Hash size={16} className="text-primary" />
                        </div>
                        <span className="fw-bold small text-uppercase">Container #{i + 1}</span>
                      </div>
                      <Button variant="link" className="text-danger p-0" onClick={() => removeContainer(i)}>
                        <Trash2 size={18} />
                      </Button>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <div className="mb-4">
                        <label className="fw-bold small text-muted text-uppercase mb-2 d-block">Tracking & Vehicle Details</label>
                        <Row className="g-2">
                          <Col xs={12}>
                            <Form.Control
                              size="sm"
                              placeholder="Container No."
                              value={c.container_no || ''}
                              onChange={e => handleContainerChange(i, 'container_no', e.target.value.toUpperCase())}
                              className="fw-bold mb-2 h-auto py-2"
                              style={{ borderRadius: '8px' }}
                            />
                          </Col>
                          <Col xs={6}>
                            <Form.Control
                              size="sm"
                              placeholder="Line Seal"
                              value={c.line_seal_no || ''}
                              onChange={e => handleContainerChange(i, 'line_seal_no', e.target.value.toUpperCase())}
                              className="fw-bold h-auto py-2"
                              style={{ borderRadius: '8px' }}
                            />
                          </Col>
                          <Col xs={6}>
                            <Form.Control
                              size="sm"
                              placeholder="E-Seal"
                              value={c.e_seal_no || ''}
                              onChange={e => handleContainerChange(i, 'e_seal_no', e.target.value.toUpperCase())}
                              className="fw-bold h-auto py-2"
                              style={{ borderRadius: '8px' }}
                            />
                          </Col>
                          <Col xs={12}>
                            <Form.Control
                              size="sm"
                              placeholder="Vehicle No."
                              value={c.vehicle_no || ''}
                              onChange={e => handleContainerChange(i, 'vehicle_no', e.target.value.toUpperCase())}
                              className="fw-bold mb-2 h-auto py-2"
                              style={{ borderRadius: '8px' }}
                            />
                          </Col>
                          <Col xs={6}>
                            <Form.Control
                              type="number"
                              step="0.01"
                              size="sm"
                              placeholder="Tare WT"
                              value={c.tare_wt || ''}
                              onChange={e => handleContainerChange(i, 'tare_wt', e.target.value)}
                              className="fw-bold h-auto py-2"
                              style={{ borderRadius: '8px' }}
                            />
                          </Col>
                          <Col xs={6}>
                            <Form.Control
                              size="sm"
                              placeholder="LR No."
                              value={c.lr_no || ''}
                              onChange={e => handleContainerChange(i, 'lr_no', e.target.value.toUpperCase())}
                              className="fw-bold h-auto py-2"
                              style={{ borderRadius: '8px' }}
                            />
                          </Col>
                        </Row>
                      </div>

                      <div className="mb-4">
                        <label className="fw-bold small text-muted text-uppercase mb-2 d-block">Product & Material</label>
                        <Form.Select
                          size="sm"
                          value={c.product || ''}
                          onChange={e => handleContainerChange(i, 'product', e.target.value)}
                          className="fw-bold mb-2 h-auto py-2"
                          style={{ borderRadius: '8px' }}
                        >
                          <option value="">Select Product</option>
                          {Array.from(new Set([
                            ...(formData.product_lines?.map(p => p.product) || []),
                            ...(productsMaster?.map(p => p.company_product_name || p.name || p.product_name) || [])
                          ].filter(Boolean))).sort().map((prod, idx) => (
                            <option key={idx} value={prod}>{prod}</option>
                          ))}
                        </Form.Select>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          size="sm"
                          placeholder="Material Description"
                          value={c.material_description || ''}
                          onChange={e => handleContainerChange(i, 'material_description', e.target.value.toUpperCase())}
                          className="bg-light border-0 small mb-2"
                          style={{ borderRadius: '8px' }}
                        />
                        <Form.Control
                          size="sm"
                          placeholder="HSN Code"
                          value={c.hsn_code || ''}
                          onChange={e => handleContainerChange(i, 'hsn_code', e.target.value)}
                          className="bg-light border-0 fw-bold text-primary mb-2 text-center"
                          style={{ borderRadius: '8px' }}
                        />
                        <Form.Control
                          size="sm"
                          placeholder="Pallet Detail"
                          value={c.detail || ''}
                          onChange={e => handleContainerChange(i, 'detail', e.target.value.toUpperCase())}
                          className="bg-light border-0 small"
                          style={{ borderRadius: '8px' }}
                        />
                      </div>

                      <div className="p-3 bg-white rounded-4 border shadow-sm mb-4">
                        <Row className="g-3">
                          <Col xs={4} className="text-center">
                            <small className="text-muted d-block mb-1" style={{ fontSize: '9px' }}>PALLET DETAIL</small>
                            <Form.Control
                              size="sm"
                              value={c.pallet_detail || ''}
                              onChange={e => handleContainerChange(i, 'pallet_detail', e.target.value.toUpperCase())}
                              placeholder="e.g. 1-29"
                              className="text-center fw-bold small py-1"
                            />
                          </Col>
                          <Col xs={4} className="text-center border-start">
                            <small className="text-muted d-block mb-1" style={{ fontSize: '9px' }}>PLT COUNT</small>
                            <Form.Control
                              type="number"
                              size="sm"
                              value={c.pallets || 0}
                              onChange={e => handleContainerChange(i, 'pallets', e.target.value)}
                              className="text-center fw-bold small py-1"
                            />
                          </Col>
                          <Col xs={4} className="text-center border-start">
                            <small className="text-primary d-block fw-bold mb-1" style={{ fontSize: '9px' }}>TOTAL SQM</small>
                            <span className="fw-bold text-primary">{c.total_sqm || 0}</span>
                          </Col>
                        </Row>
                      </div>

                      <div className="p-3 bg-light rounded-4 border mb-3">
                        <Row className="g-3">
                          <Col xs={4}>
                            <small className="text-muted d-block mb-1" style={{ fontSize: '9px' }}>BOXES</small>
                            <Form.Control
                              type="number"
                              size="sm"
                              value={c.boxes || 0}
                              onChange={e => handleContainerChange(i, 'boxes', e.target.value)}
                              className="fw-bold small py-1"
                            />
                          </Col>
                          <Col xs={4}>
                            <small className="text-muted d-block mb-1" style={{ fontSize: '9px' }}>BOX WT</small>
                            <Form.Control
                              type="number"
                              size="sm"
                              value={c.box_weight || 0}
                              onChange={e => handleContainerChange(i, 'box_weight', e.target.value)}
                              className="fw-bold small py-1"
                            />
                          </Col>
                          <Col xs={4}>
                            <small className="text-muted d-block mb-1" style={{ fontSize: '9px' }}>SQM/BOX</small>
                            <Form.Control
                              type="number"
                              size="sm"
                              value={c.sqm_per_box || 0}
                              onChange={e => handleContainerChange(i, 'sqm_per_box', e.target.value)}
                              className="fw-bold small py-1"
                            />
                          </Col>
                        </Row>
                      </div>

                      <Row className="g-2 small px-1">
                        <Col xs={6} className="text-muted fw-bold text-uppercase">Net Wt:</Col>
                        <Col xs={6} className="text-end fw-bold text-danger">{c.net_weight || 0} kg</Col>
                        <Col xs={6} className="text-muted fw-bold text-uppercase">Gross Wt:</Col>
                        <Col xs={6} className="text-end fw-bold text-danger">{c.gross_weight || 0} kg</Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}

                {/* Mobile Summary Card */}
                <Card className="border-0 shadow-sm rounded-4 mb-4 bg-primary text-white">
                  <Card.Body className="p-3">
                    <h6 className="fw-bold mb-3 border-bottom border-white border-opacity-25 pb-2 text-uppercase small">Annexure Totals</h6>
                    <Row className="g-2 small">
                      <Col xs={6}>Total Pallets:</Col>
                      <Col xs={6} className="text-end fw-bold">{formData.total_pallets}</Col>
                      <Col xs={6}>Total SQM:</Col>
                      <Col xs={6} className="text-end fw-bold">{safeNum(formData.total_sqm).toFixed(2)}</Col>
                      <Col xs={6}>Total Boxes:</Col>
                      <Col xs={6} className="text-end fw-bold">{formData.total_boxes}</Col>
                      <Col xs={12} className="my-2 border-top border-white border-opacity-25"></Col>
                      <Col xs={6}>NET WT (KG):</Col>
                      <Col xs={6} className="text-end fw-bold">{safeNum(formData.net_weight).toFixed(2)}</Col>
                      <Col xs={6} className="fs-6">GROSS WT (KG):</Col>
                      <Col xs={6} className="text-end fw-bold fs-6">{safeNum(formData.gross_weight).toFixed(2)}</Col>
                    </Row>
                  </Card.Body>
                </Card>
              </>
            ) : (
              <div className="text-center py-5 bg-white rounded-4 border">
                <Package size={32} className="text-muted opacity-50 mb-2" />
                <p className="text-muted mb-0 small">No container details added.</p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Packing Instructions ── */}
        <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
          <Card.Header className="bg-secondary text-white py-3 border-0">
            <h6 className="mb-0 fw-bold text-uppercase">Packing Instructions</h6>
          </Card.Header>
          <Card.Body className="p-4 bg-white">
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Pallet Type</Form.Label>
                  <Form.Control
                    value={formData.pallet_type}
                    readOnly
                    className="bg-light border-0 py-2 px-3 text-dark"
                    style={{ borderRadius: 10, height: 48 }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Box Type</Form.Label>
                  <Form.Control
                    value={formData.box_type}
                    readOnly
                    className="bg-light border-0 py-2 px-3 text-dark"
                    style={{ borderRadius: 10, height: 48 }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Tiles Back Marking</Form.Label>
                  <Form.Control
                    value={formData.tiles_back}
                    readOnly
                    className="bg-light border-0 py-2 px-3 text-dark"
                    style={{ borderRadius: 10, height: 48 }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Fumigation</Form.Label>
                  <Form.Select
                    value={formData.fumigation}
                    disabled
                    className="bg-light border-0 py-2 px-3 text-dark fw-bold"
                    style={{ borderRadius: 10, height: 48 }}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Legalisation</Form.Label>
                  <Form.Select
                    value={formData.legalisation}
                    disabled
                    className="bg-light border-0 py-2 px-3 text-dark fw-bold"
                    style={{ borderRadius: 10, height: 48 }}
                  >
                    <option value="NO">NO</option>
                    <option value="YES">YES</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-secondary mb-1">Made in India</Form.Label>
                  <Form.Select
                    value={formData.made_in_india}
                    disabled
                    className="bg-light border-0 py-2 px-3 text-dark fw-bold"
                    style={{ borderRadius: 10, height: 48 }}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </Form.Select>
                </Form.Group>
              </Col>

            </Row>
          </Card.Body>
        </Card>

        {/* Bottom Actions Container */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <Button
            variant="outline-secondary"
            onClick={onBack}
            className="shadow-sm px-4 fw-bold"
            style={{ height: 55, borderRadius: 12 }}
          >
            <X size={20} className="me-2" /> Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving}
            className="shadow-sm px-4 fw-bold"
            style={{ height: 55, borderRadius: 12, minWidth: 160 }}
          >
            {saving
              ? <Spinner animation="border" size="sm" />
              : <><Save size={18} className="me-2" />{formData.exists ? 'Update' : 'Save'} Annexure</>}
          </Button>
        </div>

        {/* Activity History */}
        {formData.exists && (annexureId || formData.id) && (
          <Card className="mt-4 shadow-sm border-0 rounded-4 overflow-hidden mb-5">
            <Card.Header className="bg-light py-3 border-0 d-flex align-items-center">
              <History className="me-2 text-primary" size={20} />
              <h6 className="mb-0 fw-bold text-uppercase tracking-wider">Activity History</h6>
            </Card.Header>
            <Card.Body className="p-0 bg-white">
              <ModuleAuditLog resourceType="export_annexure" resourceId={annexureId || formData.id} />
            </Card.Body>
          </Card>
        )}
      </Form>
    </Container>
  );
}

export default ExportInvoiceAnnexureForm;

