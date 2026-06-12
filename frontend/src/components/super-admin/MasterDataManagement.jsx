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

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Form,
  Modal,
  Badge,
  Spinner,
  Alert,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import api from '../../services/api';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import FilterPanel from '../shared/FilterPanel.jsx';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import { exportData, createColumnDef } from '../../utils/exportUtils.js';
import { getAllCountries, getAllCities } from '../../services/masterDataService.js';
import { restrictToNumbers, restrictToDecimal, getValidationError } from '../../utils/inputHelpers.js';
import { Search, RotateCcw, Download, Plus, Edit, Trash2, RefreshCw, AlertCircle, LayoutGrid, Info, Image as ImageIcon } from 'lucide-react';
import masterDataService from '../../services/masterDataService.js';
import { resolveImageUrl } from '../../utils/urlHelper.js';

import './MasterDataManagement.css';


const CATEGORY_TO_API_TYPE = {
  factories: 'factoryNames',
  catalogueNames: 'catalogueNames',
  categories: 'categories',
  sizes: 'sizes',
  surfaces: 'surfaces',
  thickness: 'thickness',
  applications: 'applications',
  ports: 'ports',
  portsOfLoading: 'portsOfLoading',
  portsOfDischarge: 'portsOfDischarge',
  finalDestinations: 'finalDestinations',
  shippingLines: 'shippingLines',
  currencies: 'currencies',
  cities: 'cities',
  countries: 'countries',
  palletTypes: 'palletTypes',
  tilesBack: 'tilesBack',
  boxesMarking: 'boxesMarking',
  boxTypes: 'boxTypes',
  deliveryTerms: 'deliveryTerms',
  paymentTerms: 'paymentTerms',
  tariffCodes: 'tariffCodes',
  authorizedSignatories: 'authorizedSignatories',
  contactDetails: 'contactDetails',
  maxPermissibleWeights: 'maxPermissibleWeights'
};

function MasterDataManagement({ currentUser }) {
  const [activeCategory, setActiveCategory] = useState('products');
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [showCreateModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isoAlpha2, setIsoAlpha2] = useState('');
  const [isoAlpha3, setIsoAlpha3] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [masterData, setMasterData] = useState({
    products: {
      categories: [],
      sizes: [],
      surfaces: [],
      applications: [],
      thickness: [],
      catalogueNames: [],
    },
    packingSpecs: {
      palletTypes: [],
      palletCategories: [],
      warehouseLocations: [],
      tilesBack: [],
      boxesMarking: [],
      boxTypes: [],
    },
    businessTerms: {
      deliveryTerms: [],
      paymentTerms: [],
      tariffCodes: [],
      authorizedSignatories: [],
      contactDetails: [],
      maxPermissibleWeights: [],
    },
    portsAndDestinations: {
      ports: [],
      portsOfLoading: [],
      portsOfDischarge: [],
      finalDestinations: [],
    },
    shippingAndCurrencies: {
      shippingLines: [],
      currencies: [],
    },
    factories: [],
    countries: [],
    cities: [],
  });

  const [masterDataWithIds, setMasterDataWithIds] = useState({
    categories: [],
    sizes: [],
    surfaces: [],
    applications: [],
    thickness: [],
    factories: [],
    shippingLines: [],
    currencies: [],
    countries: [],
    cities: [],
    portsOfLoading: [],
    portsOfDischarge: [],
    finalDestinations: [],
    palletTypes: [],
    palletCategories: [],
    warehouseLocations: [],
    tilesBack: [],
    boxesMarking: [],
    boxTypes: [],
    deliveryTerms: [],
    paymentTerms: [],
    tariffCodes: [],
    authorizedSignatories: [],
    contactDetails: [],
    maxPermissibleWeights: [],
  });

  const categories = [
    { key: 'products', label: 'Product Data', icon: '🛠️' },
    { key: 'packingSpecs', label: 'Packing Specs', icon: '📦' },
    { key: 'portsAndDestinations', label: 'Ports & Destinations', icon: '⚓' },
    { key: 'shippingAndCurrencies', label: 'Shipping & Currencies', icon: '🚢' },
    { key: 'factories', label: 'Factory Names', icon: '🏭' },
    { key: 'countries', label: 'Countries', icon: '🌍' },
    { key: 'cities', label: 'Cities', icon: '🏙️' },
    { key: 'businessTerms', label: 'Business Terms', icon: '📄' },
  ];

  const productSubCategories = [
    { key: 'categories', label: 'Categories', apiType: 'categories' },
    { key: 'sizes', label: 'Sizes', apiType: 'sizes' },
    { key: 'surfaces', label: 'Surfaces', apiType: 'surfaces' },
    { key: 'applications', label: 'Applications', apiType: 'applications' },
    { key: 'thickness', label: 'Thickness', apiType: 'thickness' },
    { key: 'catalogueNames', label: 'Catalogue Names', apiType: 'catalogueNames' },
  ];

  const packingSubCategories = [
    { key: 'palletTypes', label: 'Pallet Types', apiType: 'palletTypes' },
    { key: 'palletCategories', label: 'Pallet Categories', apiType: 'palletCategories' },
    { key: 'warehouseLocations', label: 'Warehouse Locations', apiType: 'warehouseLocations' },
    { key: 'tilesBack', label: 'Tiles Back', apiType: 'tilesBack' },
    { key: 'boxesMarking', label: 'Boxes Marking', apiType: 'boxesMarking' },
    { key: 'boxTypes', label: 'Box Types', apiType: 'boxTypes' },
  ];

  const businessSubCategories = [
    { key: 'deliveryTerms', label: 'Delivery Terms', apiType: 'deliveryTerms' },
    { key: 'paymentTerms', label: 'Payment Terms', apiType: 'paymentTerms' },
    { key: 'tariffCodes', label: 'Tariff Codes', apiType: 'tariffCodes' },
    { key: 'authorizedSignatories', label: 'Authorized Signatories', apiType: 'authorizedSignatories' },
    { key: 'contactDetails', label: 'Contact Details', apiType: 'contactDetails' },
    { key: 'maxPermissibleWeights', label: 'Max Permissible Weights', apiType: 'maxPermissibleWeights' },
  ];

  const portSubCategories = [
    { key: 'portsOfLoading', label: 'Ports of Loading', apiType: 'portsOfLoading' },
    { key: 'portsOfDischarge', label: 'Ports of Discharge', apiType: 'portsOfDischarge' },
    { key: 'finalDestinations', label: 'Final Destinations', apiType: 'finalDestinations' },
  ];

  const shippingAndCurrencySubCategories = [
    { key: 'shippingLines', label: 'Shipping Lines', apiType: 'shippingLines' },
    { key: 'currencies', label: 'Currencies', apiType: 'currencies' },
  ];

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        countriesData,
        citiesData,
        factoriesData,
        shippingData,
        currenciesData,
        categoriesData,
        sizesData,
        surfacesData,
        applicationsData,
        thicknessData,
        portsData,
        portsLoadingData,
        portsDischargeData,
        finalDestinationsData,
        palletTypesData,
        palletCategoriesData,
        warehouseLocationsData,
        tilesBackData,
        boxesMarkingData,
        boxTypesData,
        catalogueNamesData,
        deliveryTermsData,
        paymentTermsData,
        tariffCodesData,
        authorizedSignatoriesData,
        contactDetailsData,
        maxPermissibleWeightsData
      ] = await Promise.all([
        getAllCountries().catch(() => []),
        getAllCities().catch(() => []),
        api.get('/master-data/factoryNames').then(r => r.data.data || []).catch(() => []),
        api.get('/master-data/shippingLines').then(r => r.data.data || []).catch(() => []),
        api.get('/master-data/currencies').then(r => r.data.data || []).catch(() => []),
        api.get('/master-data/categories').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/sizes').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/surfaces').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/applications').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/thickness').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/ports').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/portsOfLoading').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/portsOfDischarge').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/finalDestinations').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/palletTypes').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/palletCategories').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/warehouseLocations').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/tilesBack').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/boxesMarking').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/boxTypes').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/catalogueNames').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/deliveryTerms').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/paymentTerms').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/tariffCodes').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/authorizedSignatories').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/contactDetails').then(r => r?.data?.data || []).catch(() => []),
        api.get('/master-data/maxPermissibleWeights').then(r => r?.data?.data || []).catch(() => [])
      ]);

      setMasterDataWithIds({
        factories: factoriesData,
        shippingLines: shippingData,
        currencies: currenciesData,
        categories: categoriesData,
        sizes: sizesData,
        surfaces: surfacesData,
        applications: applicationsData,
        thickness: thicknessData,
        countries: countriesData,
        cities: citiesData,
        ports: portsData,
        portsOfLoading: portsLoadingData,
        portsOfDischarge: portsDischargeData,
        finalDestinations: finalDestinationsData,
        palletTypes: palletTypesData,
        palletCategories: palletCategoriesData,
        warehouseLocations: warehouseLocationsData,
        tilesBack: tilesBackData,
        boxesMarking: boxesMarkingData,
        boxTypes: boxTypesData,
        catalogueNames: catalogueNamesData,
        deliveryTerms: deliveryTermsData,
        paymentTerms: paymentTermsData,
        tariffCodes: tariffCodesData,
        authorizedSignatories: authorizedSignatoriesData,
        contactDetails: contactDetailsData,
        maxPermissibleWeights: maxPermissibleWeightsData,
      });

      setMasterData({
        products: {
          categories: categoriesData,
          sizes: sizesData,
          surfaces: surfacesData,
          applications: applicationsData,
          thickness: thicknessData,
          catalogueNames: catalogueNamesData,
        },
        packingSpecs: {
          palletTypes: palletTypesData,
          palletCategories: palletCategoriesData,
          warehouseLocations: warehouseLocationsData,
          tilesBack: tilesBackData,
          boxesMarking: boxesMarkingData,
          boxTypes: boxTypesData,
        },
        businessTerms: {
          deliveryTerms: deliveryTermsData,
          paymentTerms: paymentTermsData,
          tariffCodes: tariffCodesData,
          authorizedSignatories: authorizedSignatoriesData,
          contactDetails: contactDetailsData,
          maxPermissibleWeights: maxPermissibleWeightsData,
        },
        portsAndDestinations: {
          ports: portsData,
          portsOfLoading: portsLoadingData,
          portsOfDischarge: portsDischargeData,
          finalDestinations: finalDestinationsData,
        },
        shippingAndCurrencies: {
          shippingLines: shippingData,
          currencies: currenciesData,
        },
        factories: factoriesData,
        countries: countriesData,
        cities: citiesData,
      });
    } catch (error) {
      console.error('Error loading master data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  const handleCloseModal = () => {
    setEditingItem(null);
    setNewValue('');
    setValidationError('');
    setActiveSubCategory(null);
    setSelectedCountry(null);
    setIsoAlpha2('');
    setIsoAlpha3('');
    setCurrencySymbol('');
    setImageUrl(null);
    setShowAddModal(false);
  };

  const handleCreateItem = (subcategory = null) => {
    setEditingItem(null);
    setNewValue('');
    setValidationError('');
    setImageUrl(null);
    setActiveSubCategory(subcategory);
    setShowAddModal(true);
  };

  const handleEditItem = (item, index, subcategory = null) => {
    let itemData;
    let apiType;
    if (subcategory) {
      itemData = masterDataWithIds[subcategory]?.[index];
      setActiveSubCategory(subcategory);
    } else {
      apiType = CATEGORY_TO_API_TYPE[activeCategory];
      itemData = masterDataWithIds[apiType === 'factoryNames' ? 'factories' : activeCategory]?.[index];
    }

    setEditingItem({ item, index, subcategory, id: itemData?.id || itemData?._id });
    setNewValue(itemData?.countryName || itemData?.cityName || itemData?.name || itemData?.value || itemData?.portName || item);

    if (activeCategory === 'cities') {
      setSelectedCountry(itemData?.countryCode || itemData?.countryId || null);
    }

    if (activeCategory === 'countries') {
      setSelectedCountry(itemData?.countryCode || itemData?.isoAlpha2 || null);
      setIsoAlpha2(itemData?.isoAlpha2 || itemData?.countryCode || '');
      setIsoAlpha3(itemData?.isoAlpha3 || '');
    }

    if (subcategory === 'currencies') {
      setCurrencySymbol(itemData?.symbol || '');
    }

    if (subcategory === 'boxTypes' || apiType === 'boxTypes') {
      setImageUrl(itemData?.imageUrl || null);
    }

    setValidationError('');
    setShowAddModal(true);
  };

  const handleDeleteClick = (item, index, subcategory = null) => {
    setDeleteConfig({ item, index, subcategory });
  };

  const confirmDelete = async () => {
    const { index, subcategory } = deleteConfig;

    let itemData;
    let endpoint = '';

    if (subcategory) {
      itemData = masterDataWithIds[subcategory]?.[index];
      endpoint = `/master-data/${subcategory}`;
    } else {
      const apiType = CATEGORY_TO_API_TYPE[activeCategory];
      itemData = masterDataWithIds[apiType === 'factoryNames' ? 'factories' : activeCategory]?.[index];
      endpoint = activeCategory === 'countries' ? '/master-data/countries'
        : activeCategory === 'cities' ? '/master-data/cities'
          : `/master-data/${apiType}`;
    }

    try {
      if (itemData?.id || itemData?._id) {
        await api.delete(`${endpoint}/${itemData.id || itemData._id}`);
      }
      showSuccess('Item deleted successfully');
      fetchMasterData();
    } catch (error) {
      showError('Failed to delete item');
      console.error(error);
    } finally {
      setDeleteConfig(null);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setValidationError('Image size must be less than 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setValidationError('Only JPG, JPEG, PNG, and WEBP formats are supported');
      return;
    }

    setUploadingImage(true);
    setValidationError('');
    try {
      const uploadedUrl = await masterDataService.uploadMasterDataImage(file);
      setImageUrl(uploadedUrl);
      showSuccess('Image uploaded successfully');
    } catch (error) {
      setValidationError(error?.response?.data?.message || 'Failed to upload image');
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async () => {
    if (!newValue.trim()) {
      setValidationError('Value cannot be empty');
      return;
    }

    const subCategory = activeSubCategory || (editingItem && editingItem.subcategory);

    if (subCategory === 'contactDetails') {
      const phoneError = getValidationError(newValue, 'phone');
      if (phoneError) {
        setValidationError(phoneError);
        return;
      }
    }

    let listToCheck = [];

    if (subCategory) {
      const group = activeCategory === 'products' ? masterData.products :
        activeCategory === 'packingSpecs' ? masterData.packingSpecs :
          activeCategory === 'businessTerms' ? masterData.businessTerms :
            activeCategory === 'portsAndDestinations' ? masterData.portsAndDestinations :
              activeCategory === 'shippingAndCurrencies' ? masterData.shippingAndCurrencies : {};
      listToCheck = group[subCategory] || [];
    } else {
      listToCheck = masterData[activeCategory] || [];
    }

    const isDuplicate = listToCheck.some(item => {
      if (editingItem && (item.id === editingItem.id || item._id === editingItem.id)) return false;
      const val = item.value || item.name || item.portName || item.cityName || item.countryName || (typeof item === 'string' ? item : '');
      return String(val).toString().trim().toLowerCase() === newValue.trim().toLowerCase();
    });

    if (isDuplicate) {
      setValidationError(`"${newValue.trim()}" already exists in this category`);
      return;
    }

    try {
      setSaving(true);
      let endpoint = '';
      let payload = {};

      const currentCategory = activeSubCategory || (editingItem && editingItem.subcategory) || CATEGORY_TO_API_TYPE[activeCategory];

      if (!currentCategory) {
        showError('Invalid category selection');
        return;
      } else if (activeCategory === 'countries') {
        endpoint = '/master-data/countries';
        const code = selectedCountry?.trim() || null;
        payload = {
          countryName: newValue.trim(),
          countryCode: code,
          isoAlpha2: code,
          isoAlpha3: isoAlpha3 || '',
          value: newValue.trim()
        };
      } else if (activeCategory === 'cities') {
        if (!selectedCountry) {
          setValidationError('Please select a country');
          setSaving(false);
          return;
        }
        endpoint = '/master-data/cities';
        payload = {
          cityName: newValue.trim(),
          countryCode: selectedCountry,
          value: newValue.trim()
        };
      } else if (currentCategory === 'currencies') {
        endpoint = '/master-data/currencies';
        const currencyCode = newValue.trim().toUpperCase();
        payload = {
          code: currencyCode,
          name: newValue.trim(),
          symbol: currencySymbol.trim(),
          value: currencyCode
        };
      } else if (['portsOfLoading', 'portsOfDischarge', 'finalDestinations'].includes(currentCategory)) {
        endpoint = `/master-data/${currentCategory}`;
        payload = {
          portName: newValue.trim(),
          name: newValue.trim(),
          value: newValue.trim(),
          destination: newValue.trim()
        };
      } else {
        endpoint = `/master-data/${currentCategory}`;
        const processedValue = newValue.trim();
        payload = { value: processedValue, name: processedValue };
        if (currentCategory === 'boxTypes') {
          payload.imageUrl = imageUrl;
        }
      }

      if (editingItem && editingItem.id) {
        await api.put(`${endpoint}/${editingItem.id}`, payload);
        showSuccess('Item updated successfully');
      } else {
        await api.post(endpoint, payload);
        showSuccess('Item added successfully');
      }

      handleCloseModal();
      fetchMasterData();
    } catch (error) {
      if (error.response?.status === 409) {
        setValidationError(error.response.data.message || 'This item already exists');
      } else if (error.response?.data?.message) {
        setValidationError(error.response.data.message);
      } else {
        showError('Failed to save item');
      }
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    let dataToExport = [];
    let columns = [];
    let fileName = '';

    if (['products', 'packingSpecs', 'businessTerms', 'portsAndDestinations', 'shippingAndCurrencies'].includes(activeCategory)) {
      const dataRoot = masterData[activeCategory];
      const subCats = activeCategory === 'products' ? productSubCategories :
        activeCategory === 'packingSpecs' ? packingSubCategories :
          activeCategory === 'portsAndDestinations' ? portSubCategories :
            activeCategory === 'shippingAndCurrencies' ? shippingAndCurrencySubCategories :
              businessSubCategories;

      subCats.forEach(sub => {
        const items = dataRoot[sub.key] || [];
        items.forEach(item => {
          dataToExport.push({
            Category: sub.label,
            Value: item.value || item.name || (typeof item === 'string' ? item : 'Unnamed')
          });
        });
      });

      fileName = `master_${activeCategory}`;
      columns = [
        createColumnDef('Category', 'Category'),
        createColumnDef('Value', 'Value'),
      ];
    } else {
      const currentList = masterData[activeCategory] || [];
      if (currentList.length === 0) {
        showError('No data available to export');
        return;
      }

      fileName = `master_${activeCategory}`;
      columns = [
        createColumnDef('SR. NO.', (row, index) => index + 1),
        createColumnDef('Name / Value', (item) => {
          if (activeCategory === 'cities') return item?.cityName || item?.value || item;
          if (activeCategory === 'countries') return `${item.countryName || item.value || item} (${item.countryCode || item.isoAlpha2 || '??'})`;
          if (activeCategory === 'currencies') return `${item.name || item.value || item} (${item.symbol || ''})`;
          return item?.portName || item?.name || (typeof item === 'string' ? item : item?.value || 'Unnamed');
        }),
      ];
      dataToExport = currentList;
    }

    exportData(dataToExport, columns, 'xlsx', fileName);
    showSuccess(`${activeCategory} data exported successfully`);
  };

  const renderDataTab = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading data...</p>
        </div>
      );
    }

    if (activeCategory === 'products' || activeCategory === 'packingSpecs' || activeCategory === 'businessTerms' || activeCategory === 'portsAndDestinations' || activeCategory === 'shippingAndCurrencies') {
      let subCats, dataRoot;
      if (activeCategory === 'products') {
        subCats = productSubCategories;
        dataRoot = masterData.products;
      } else if (activeCategory === 'packingSpecs') {
        subCats = packingSubCategories;
        dataRoot = masterData.packingSpecs;
      } else if (activeCategory === 'portsAndDestinations') {
        subCats = portSubCategories;
        dataRoot = masterData.portsAndDestinations;
      } else if (activeCategory === 'shippingAndCurrencies') {
        subCats = shippingAndCurrencySubCategories;
        dataRoot = masterData.shippingAndCurrencies;
      } else {
        subCats = businessSubCategories;
        dataRoot = masterData.businessTerms || { deliveryTerms: [], paymentTerms: [], tariffCodes: [] };
      }

      const safeDataRoot = dataRoot || {};

      return (
        <>
          <div className="d-flex justify-content-end mb-3">
            <Button
              variant="outline"
              onClick={handleExport}
              className="d-flex align-items-center px-3 py-2 border-primary-subtle text-primary fw-bold text-nowrap shadow-sm hover-elevate"
              style={{ borderRadius: '10px', fontSize: '0.8rem' }}
            >
              <Download size={16} className="me-2" />
              EXPORT {activeCategory.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
            </Button>
          </div>
          <Row className="g-4">
            {subCats.map((sub) => {
              const list = safeDataRoot[sub.key] || [];
              return (
                <Col md={6} lg={6} key={sub.key}>
                  <Card className="h-100 border-0 shadow-sm overflow-hidden master-category-card" style={{ borderRadius: '16px' }}>
                    <Card.Header className="bg-primary text-white p-2 p-md-3 border-0 d-flex align-items-center justify-content-between">
                      <h6 className="mb-0 fw-bold text-nowrap">{sub.label} ({list.length})</h6>
                      <Button 
                        variant="light" 
                        size="sm" 
                        className="text-primary fw-bold shadow-sm px-3 d-flex align-items-center flex-shrink-0" 
                        style={{ borderRadius: '8px', fontSize: '0.75rem', height: '32px', width: 'auto' }}
                        onClick={() => handleCreateItem(sub.key)}
                      >
                        <Plus size={14} className="me-1" />
                        <span className="d-none d-sm-inline small">Add</span>
                        <span className="d-sm-none small">Add</span>
                      </Button>
                    </Card.Header>
                    <Card.Body className="p-0">
                      {list.length > 0 ? (
                        <>
                          {/* Desktop View */}
                          <div className="table-responsive d-none d-md-block" style={{ maxHeight: '400px' }}>
                            <Table hover className="mb-0 align-middle">
                              <thead className="table-light">
                                <tr className="small text-muted text-uppercase">
                                  <th className="ps-4 text-center" style={{ width: '60px' }}>SR.</th>
                                  {sub.key === 'boxTypes' && <th style={{ width: '50px' }}>Img</th>}
                                  <th>Name / Value</th>
                                  <th className="pe-4 text-end">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {list.map((item, index) => (
                                  <tr key={index}>
                                    <td className="ps-4 text-center text-muted small">{index + 1}</td>
                                    {sub.key === 'boxTypes' && (
                                      <td>
                                        {item?.imageUrl ? (
                                          <img 
                                            src={resolveImageUrl(item.imageUrl)} 
                                            alt="Thumbnail" 
                                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #dee2e6' }}
                                            onClick={(e) => { e.stopPropagation(); setPreviewImage(item.imageUrl); }}
                                          />
                                        ) : (
                                          <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px dashed #ccc' }}>
                                            <ImageIcon size={14} className="text-muted opacity-50" />
                                          </div>
                                        )}
                                      </td>
                                    )}
                                    <td className="fw-medium">
                                      {(() => {
                                        let displayValue = item?.value || item?.name || item?.portName || item?.cityName || item?.countryName || (typeof item === 'string' ? item : 'Unnamed');
                                        if (typeof displayValue === 'string' && (sub.key === 'cities' || sub.key === 'countries')) {
                                          displayValue = displayValue.toUpperCase();
                                        }
                                        return displayValue;
                                      })()}
                                    </td>
                                    <td className="pe-4 text-end">
                                      <div className="d-flex justify-content-end gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-primary border-primary-subtle hover-bg-primary-light"
                                          onClick={() => handleEditItem(item, index, sub.key)}
                                          title="Edit"
                                        >
                                          <Edit size={14} />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-danger border-danger-subtle hover-bg-danger-light"
                                          onClick={() => handleDeleteClick(item, index, sub.key)}
                                          title="Delete"
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>

                          {/* Mobile View */}
                          <div className="d-md-none p-3 bg-light-subtle">
                            <div className="d-flex flex-column gap-3">
                              {list.map((item, index) => {
                                const displayValue = item?.value || item?.name || item?.portName || item?.cityName || item?.countryName || (typeof item === 'string' ? item : null);
                                return (
                                  <div key={index} className="master-mobile-card-premium bg-white p-3 rounded-3 shadow-sm border-start border-4 border-primary">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-2">
                                          <span className="badge bg-primary-light text-primary me-2 px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                            SR. #{index + 1}
                                          </span>
                                        </div>
                                        <div className="ps-1">
                                          <div className="text-muted extra-small text-uppercase fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>
                                            {sub.label.slice(0, -1)} Value
                                          </div>
                                          <h6 className="fw-800 text-dark mb-0">
                                            {displayValue || <span className="text-danger italic">No Label Defined</span>}
                                          </h6>
                                        </div>
                                      </div>
                                      <div className="d-flex flex-column gap-2 ms-2">
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          className="btn-action-mobile shadow-sm"
                                          onClick={() => handleEditItem(item, index, sub.key)}
                                        >
                                          <Edit size={14} />
                                        </Button>
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          className="btn-action-mobile shadow-sm"
                                          onClick={() => handleDeleteClick(item, index, sub.key)}
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-5">
                          <AlertCircle size={32} className="text-muted mb-2 opacity-50" />
                          <p className="text-muted small mb-0">No {sub.label.toLowerCase()} found.</p>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      );
    }

    let currentList = masterData[activeCategory] || [];

    if (activeCategory === 'cities' && filterCountry) {
      currentList = currentList.filter(item => 
        item?.countryCode === filterCountry || item?.countryId === filterCountry
      );
    }

    if (searchQuery.trim()) {
      currentList = currentList.filter(item => {
        const val = (item?.cityName || item?.countryName || item?.portName || item?.name || item?.value || (typeof item === 'string' ? item : '')).toLowerCase();
        return val.includes(searchQuery.toLowerCase());
      });
    }

    return (
      <>
        {/* Collapsible Filter Panel */}
        <FilterPanel
          onClear={() => {
            setSearchQuery('');
            setFilterCountry('');
          }}
          title={`Search in ${categories.find((c) => c.key === activeCategory)?.label}`}
          className="mb-4"
        >
          <Form onSubmit={(e) => e.preventDefault()}>
            <Row className="g-3 align-items-center">
              <Col md={activeCategory === 'cities' ? 8 : 12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted text-uppercase">Search Term</Form.Label>
                  <div className="position-relative">
                    <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                    <Form.Control
                      type="text"
                      className="ps-5 py-2 border-primary-subtle"
                      style={{ borderRadius: '10px' }}
                      placeholder={`Search in ${activeCategory}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </Form.Group>
              </Col>
              {activeCategory === 'cities' && (
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-muted text-uppercase">Filter By Country</Form.Label>
                    <Form.Select
                      className="py-2 border-primary-subtle"
                      style={{ borderRadius: '10px' }}
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                    >
                      <option value="">All Countries</option>
                      {masterDataWithIds.countries?.map((c) => (
                        <option key={c.id || c._id} value={c.countryCode || c.isoAlpha2 || c.id || c._id}>
                          {c.countryName || c.value}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Form>
        </FilterPanel>

        <Card className="border-0 shadow-sm overflow-hidden mb-4 master-category-card" style={{ borderRadius: '16px' }}>
          <Card.Header className="bg-primary text-white p-2 p-md-3 border-0 d-flex align-items-center justify-content-between flex-nowrap">
            <h5 className="mb-0 fw-bold text-nowrap me-2">{categories.find((c) => c.key === activeCategory)?.label} ({currentList.length})</h5>
            <div className="d-flex gap-2 align-items-center flex-nowrap">
              <Button
                variant="outline-light"
                size="sm"
                className="border-white text-white fw-bold shadow-sm px-3 d-flex align-items-center flex-shrink-0"
                style={{ borderRadius: '8px', fontSize: '0.75rem', height: '32px', width: 'auto' }}
                onClick={handleExport}
              >
                <Download size={14} className="me-1" />
                <span className="d-none d-sm-inline small">Export</span>
              </Button>
              <Button
                variant="light"
                size="sm"
                className="text-primary fw-bold shadow-sm px-3 d-flex align-items-center flex-shrink-0"
                style={{ borderRadius: '8px', fontSize: '0.75rem', height: '32px', width: 'auto' }}
                onClick={() => handleCreateItem()}
              >
                <Plus size={14} className="me-1" />
                <span className="d-none d-sm-inline small">Create</span>
                <span className="d-sm-none small">Create</span>
              </Button>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {currentList.length > 0 ? (
              <>
                <div className="table-responsive d-none d-lg-block">
                  <Table hover className="mb-0 align-middle">
                    <thead>
                      <tr className="table-light text-muted small text-uppercase">
                        <th className="ps-4" style={{ width: '80px' }}>SR. NO.</th>
                        <th>Name / Value</th>
                        <th className="pe-4 text-end" style={{ width: '120px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentList.map((item, index) => (
                        <tr key={index}>
                          <td className="ps-4 text-center text-muted">{index + 1}</td>
                          <td className="fw-medium">
                            {item?.cityName ||
                              (activeCategory === 'countries' && (item?.countryName || item?.value || (typeof item === 'string' && item)) ?
                                `${item.countryName || item.value || item} (${item.countryCode || item.isoAlpha2 || item.code || '??'}${item.isoAlpha3 ? ' / ' + item.isoAlpha3 : ''})` :
                                (item?.countryName || item?.value || (typeof item === 'string' && item))) ||
                              item?.portName ||
                              item?.name ||
                              item?.factoryName ||
                              (typeof item === 'string' ? item : item?.value || 'Unnamed')}
                          </td>
                          <td className="pe-4 text-end">
                            <div className="d-flex justify-content-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary-subtle hover-bg-primary-light"
                                onClick={() => handleEditItem(item, index)}
                                title="Edit"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-danger border-danger-subtle hover-bg-danger-light"
                                onClick={() => handleDeleteClick(item, index)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <div className="d-lg-none bg-light-subtle p-3">
                  <div className="d-flex flex-column gap-3">
                    {currentList.map((item, index) => {
                      const mainText = item?.cityName || item?.countryName || item?.portName || item?.name || item?.value || item?.factoryName || item;
                      const subText = activeCategory === 'countries' ? `Code: ${item.countryCode || item.isoAlpha2} | ${item.isoAlpha3 || 'N/A'}` : null;

                      return (
                        <div key={index} className="master-mobile-card-premium bg-white p-3 rounded-3 shadow-sm border-start border-4 border-primary">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center mb-2">
                                <span className="badge bg-primary-light text-primary me-2 px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                  SR. #{index + 1}
                                </span>
                              </div>
                              <div className="ps-1">
                                <h6 className="fw-800 text-dark mb-1">{mainText}</h6>
                                {subText && <div className="text-muted extra-small fw-bold text-uppercase">{subText}</div>}
                              </div>
                            </div>
                            <div className="d-flex flex-column gap-2 ms-2">
                              <Button variant="outline-primary" size="sm" className="btn-action-mobile shadow-sm" onClick={() => handleEditItem(item, index)}>
                                <Edit size={14} />
                              </Button>
                              <Button variant="outline-danger" size="sm" className="btn-action-mobile shadow-sm" onClick={() => handleDeleteClick(item, index)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-5">
                <AlertCircle size={32} className="text-muted mb-2 opacity-50" />
                <p className="text-muted small mb-0 text-center py-4">No data found in this category.</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </>
    );
  };

  return (
    <div className="master-data-container">
      <Card className="border-0 shadow-sm overflow-hidden mb-4 bg-primary text-white">
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center gap-3">
                <div className="bg-white-20 p-3 rounded-3">
                  <LayoutGrid size={32} />
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-white">Master Data Management</h2>
                  <p className="text-white text-opacity-75 mb-0">Manage global system parameters and static reference data</p>
                </div>
              </div>
            </Col>
            <Col xs="auto">
              <Button
                variant="light"
                className="text-primary fw-bold shadow-sm d-flex align-items-center gap-2 px-4 py-2 rounded-pill"
                onClick={fetchMasterData}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'spin' : ''} /> Sync Data
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mb-4 bg-white overflow-hidden" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-2">
          <div className="d-flex gap-2 overflow-auto premium-scroll pb-2 px-2" style={{ whiteSpace: 'nowrap' }}>
            {categories.map((cat) => (
              <button
                key={cat.key}
                className={`category-premium-btn ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setSearchQuery('');
                }}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-label">{cat.label}</span>
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col xs={12}>
          {renderDataTab()}
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton className="bg-primary text-white border-0">
          <Modal.Title className="fw-bold">
            {editingItem ? 'Edit' : 'Add'} {
              activeSubCategory
                ? ([...productSubCategories, ...packingSubCategories, ...businessSubCategories, ...portSubCategories, ...shippingAndCurrencySubCategories].find(s => s.key === activeSubCategory)?.label)
                : categories.find(c => c.key === activeCategory)?.label
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {validationError && (
            <Alert variant="danger" className="py-2 px-3 small d-flex align-items-center border-0 shadow-sm">
              <AlertCircle size={16} className="me-2" />
              {validationError}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <OverlayTrigger placement="top" overlay={<Tooltip>{activeCategory === 'countries' ? 'Country Name' : activeCategory === 'cities' ? 'City Name' : 'Value'} is mandatory.</Tooltip>}>
              <Form.Label className="fw-bold small text-uppercase text-danger" style={{cursor: 'help'}}>
                {activeCategory === 'countries' ? 'Country Name *' : activeCategory === 'cities' ? 'City Name *' : 'Value *'} <Info size={12} className="ms-1" />
              </Form.Label>
            </OverlayTrigger>
            <Form.Control
              type="text"
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={newValue}
              onChange={(e) => {
                let val = e.target.value;
                if (activeSubCategory === 'tariffCodes') {
                  val = restrictToNumbers(val, false);
                } else if (activeSubCategory === 'maxPermissibleWeights') {
                  val = restrictToDecimal(val, 2);
                } else if (activeSubCategory === 'contactDetails') {
                  val = restrictToNumbers(val, true);
                } else {
                  val = val.toUpperCase();
                }
                setNewValue(val);
                setValidationError('');
              }}
              autoFocus
            />
          </Form.Group>

          {activeSubCategory === 'currencies' && (
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-uppercase text-muted">Currency Symbol</Form.Label>
              <Form.Control
                type="text"
                className="border-primary-subtle"
                style={{ borderRadius: '10px' }}
                placeholder="e.g. $, ₹, €"
                value={currencySymbol || ''}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />
            </Form.Group>
          )}

          {activeCategory === 'countries' && (
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small text-uppercase text-muted">
                    Country Code (ISO Alpha-2)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    className="border-primary-subtle"
                    style={{ borderRadius: '10px' }}
                    placeholder="e.g. IN, US"
                    value={selectedCountry || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().substring(0, 2);
                      setSelectedCountry(val);
                      setIsoAlpha2(val);
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {activeCategory === 'cities' && (
            <Form.Group className="mb-3">
              <OverlayTrigger placement="top" overlay={<Tooltip>Country is mandatory.</Tooltip>}>
                <Form.Label className="fw-bold small text-uppercase text-danger" style={{cursor: 'help'}}>
                  Country * <Info size={12} className="ms-1" />
                </Form.Label>
              </OverlayTrigger>
              <Form.Select
                className="border-primary-subtle"
                style={{ borderRadius: '10px' }}
                value={selectedCountry || ''}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="">Select Country</option>
                {masterDataWithIds.countries?.map((c) => (
                  <option key={c.id || c._id} value={c.countryCode || c.isoAlpha2 || c.id || c._id}>{c.countryName || c.value}</option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
          {activeSubCategory === 'boxTypes' && (
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-uppercase text-muted">
                Box Type Image (Optional)
              </Form.Label>
              <div className="d-flex align-items-center gap-3">
                <div 
                  className="bg-light d-flex align-items-center justify-content-center border rounded" 
                  style={{ width: '60px', height: '60px', overflow: 'hidden' }}
                >
                  {imageUrl ? (
                    <img src={resolveImageUrl(imageUrl)} alt="Box Type" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={24} className="text-muted opacity-50" />
                  )}
                </div>
                <div className="flex-grow-1">
                  <Form.Control 
                    type="file" 
                    accept="image/jpeg, image/png, image/webp, image/jpg" 
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="border-primary-subtle"
                  />
                  <div className="text-muted small mt-1">Supported formats: JPG, PNG, WEBP (Max: 5MB)</div>
                </div>
                {imageUrl && (
                  <Button variant="outline-danger" size="sm" onClick={() => setImageUrl(null)}>
                    Remove
                  </Button>
                )}
              </div>
            </Form.Group>
          )}

        </Modal.Body>
        <Modal.Footer className="border-0 p-4 pt-0">
          <Button variant="light" className="fw-bold px-4 rounded-pill" onClick={handleCloseModal}>Cancel</Button>
          <Button variant="primary" className="fw-bold px-4 rounded-pill shadow-sm" onClick={handleSaveItem} disabled={saving || uploadingImage}>
            {(saving || uploadingImage) ? <Spinner size="sm" className="me-2" /> : null}
            {editingItem ? 'Update Item' : 'Save Item'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!previewImage} onHide={() => setPreviewImage(null)} centered size="md">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          {previewImage && (
            <img src={resolveImageUrl(previewImage)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }} className="shadow-sm" />
          )}
        </Modal.Body>
      </Modal>

      <ConfirmationModal
        show={!!deleteConfig}
        title="Confirm Delete"
        message={`Are you sure you want to delete "${deleteConfig?.item?.cityName || deleteConfig?.item?.countryName || deleteConfig?.item?.portName || deleteConfig?.item?.value || deleteConfig?.item}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfig(null)}
        variant="danger"
      />

      <style>{`
        .master-data-container { padding-bottom: 2rem; }
        .bg-white-20 { background-color: rgba(255, 255, 255, 0.2); }
        
        .category-premium-btn {
          border: none;
          background: transparent;
          padding: 12px 24px;
          border-radius: 12px;
          color: #64748b;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: fit-content;
        }
        
        .category-premium-btn:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }
        
        .category-premium-btn.active {
          background-color: #0d6efd;
          color: white;
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.25);
        }
        
        .cat-icon { font-size: 1.25rem; }
        .cat-label { font-size: 0.9rem; }
        
        .premium-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .premium-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .premium-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        .master-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .hover-elevate {
          transition: all 0.2s ease;
        }
        .hover-elevate:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
}

export default MasterDataManagement;
