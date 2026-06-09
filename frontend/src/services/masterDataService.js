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

import api from './api';
import axios from 'axios';
import { tokenManager } from '../utils/tokenManager.js';

// Get all countries
export const getAllCountries = async () => {
  try {
    const response = await api.get('/master-data/countries');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw error;
  }
};

// Get cities by country code
export const getCitiesByCountry = async (countryCode) => {
  try {
    const response = await api.get(`/master-data/cities/country/${countryCode}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching cities:', error);
    throw error;
  }
};

// Get all cities
export const getAllCities = async () => {
  try {
    const response = await api.get('/master-data/cities');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching all cities:', error);
    throw error;
  }
};

// Search cities
export const searchCities = async (query) => {
  try {
    const response = await api.get('/master-data/cities/search', {
      params: { query }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error searching cities:', error);
    throw error;
  }
};

// Get all currencies
export const getAllCurrencies = async () => {
  try {
    const response = await api.get('/master-data/currencies');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching currencies:', error);
    throw error;
  }
};

// Get all ports
export const getAllPorts = async () => {
  try {
    const response = await api.get('/master-data/ports');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching ports:', error);
    throw error;
  }
};

// Get ports by country code
export const getPortsByCountry = async (countryCode) => {
  try {
    const response = await api.get(`/master-data/ports/country/${countryCode}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching ports:', error);
    throw error;
  }
};

// Get all ports of discharge
export const getPortsOfDischarge = async () => {
  try {
    const response = await api.get('/master-data/portsOfDischarge');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching ports of discharge:', error);
    throw error;
  }
};

// Get all ports of loading
export const getPortsOfLoading = async () => {
  try {
    const response = await api.get('/master-data/portsOfLoading');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching ports of loading:', error);
    throw error;
  }
};

// Get all product categories
export const getAllCategories = async () => {
  try {
    const response = await api.get('/master-data/categories');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Get all sizes
export const getAllSizes = async () => {
  try {
    const response = await api.get('/master-data/sizes');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching sizes:', error);
    throw error;
  }
};

// Get all surfaces
export const getAllSurfaces = async () => {
  try {
    const response = await api.get('/master-data/surfaces');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching surfaces:', error);
    throw error;
  }
};

// Get all applications
export const getAllApplications = async () => {
  try {
    const response = await api.get('/master-data/applications');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};

// Get all thickness
export const getAllThickness = async () => {
  try {
    const response = await api.get('/master-data/thickness');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching thickness:', error);
    throw error;
  }
};

// Get all factories
export const getAllFactories = async () => {
  try {
    const response = await api.get('/master-data/factoryNames');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching factories:', error);
    throw error;
  }
};

// Get all shipping lines
export const getAllShippingLines = async () => {
  try {
    const response = await api.get('/master-data/shippingLines');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching shipping lines:', error);
    throw error;
  }
};

// Get all pallet types
export const getAllPalletTypes = async () => {
  try {
    const response = await api.get('/master-data/palletTypes');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching pallet types:', error);
    throw error;
  }
};

// Get all tiles back marking
export const getAllTilesBack = async () => {
  try {
    const response = await api.get('/master-data/tilesBack');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching tiles back marking:', error);
    throw error;
  }
};

// Get all boxes marking
export const getAllBoxesMarking = async () => {
  try {
    const response = await api.get('/master-data/boxesMarking');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching boxes marking:', error);
    throw error;
  }
};

// Get all box types
export const getAllBoxTypes = async () => {
  try {
    const response = await api.get('/master-data/boxTypes');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching box types:', error);
    throw error;
  }
};

// Get all catalogue names
export const getAllCatalogues = async () => {
  try {
    const response = await api.get('/master-data/catalogueNames');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching catalogue names:', error);
    throw error;
  }
};

// Get all delivery terms
export const getDeliveryTerms = async () => {
  try {
    const response = await api.get('/master-data/deliveryTerms');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching delivery terms:', error);
    throw error;
  }
};

// Get all payment terms
export const getPaymentTerms = async () => {
  try {
    const response = await api.get('/master-data/paymentTerms');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    throw error;
  }
};

// Get all tariff codes
export const getAllTariffCodes = async () => {
  try {
    const response = await api.get('/master-data/tariffCodes');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching tariff codes:', error);
    throw error;
  }
};

// Get all authorized signatories
export const getAuthorizedSignatories = async () => {
  try {
    const response = await api.get('/master-data/authorizedSignatories');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching authorized signatories:', error);
    return [];
  }
};

// Get all contact details
export const getContactDetails = async () => {
  try {
    const response = await api.get('/master-data/contactDetails');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching contact details:', error);
    return [];
  }
};

// Get all max permissible weights
export const getMaxPermissibleWeights = async () => {
  try {
    const response = await api.get('/master-data/maxPermissibleWeights');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching max permissible weights:', error);
    return [];
  }
};

// Get all final destinations
export const getAllFinalDestinations = async () => {
  try {
    const response = await api.get('/master-data/finalDestinations');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching final destinations:', error);
    throw error;
  }
};

// Create master data (generic)
export const createMasterData = async (type, payload) => {
  try {
    const data = typeof payload === 'string' ? { value: payload } : payload;
    const response = await api.post(`/master-data/${type}`, data);
    return response.data.data;
  } catch (error) {
    console.error(`Error creating master data for ${type}:`, error);
    throw error;
  }
};

export const uploadMasterDataImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const token = tokenManager.getAccessToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const selectedCompanyId = localStorage.getItem('selected_company_id');
    if (selectedCompanyId) {
      headers['x-company-id'] = selectedCompanyId;
      headers['x-selected-company-id'] = selectedCompanyId;
    }

    const API_BASE = import.meta?.env?.VITE_API_BASE || '/api';
    const response = await axios.post(`${API_BASE}/master-data/upload-image`, formData, {
      headers,
      withCredentials: true,
    });
    
    return response.data.imageUrl;
  } catch (error) {
    console.error('Error uploading master data image:', error);
    throw error;
  }
};

export default {
  getAllCountries,
  getCitiesByCountry,
  getAllCities,
  searchCities,
  getAllCurrencies,
  getAllPorts,
  getPortsByCountry,
  getPortsOfDischarge,
  getPortsOfLoading,
  getAllCategories,
  getAllSizes,
  getAllSurfaces,
  getAllApplications,
  getAllThickness,
  getAllFactories,
  getAllShippingLines,
  getAllPalletTypes,
  getAllTilesBack,
  getAllBoxesMarking,
  getAllBoxTypes,
  getAllCatalogues,
  getDeliveryTerms,
  getPaymentTerms,
  getAllTariffCodes,
  getAllFinalDestinations,
  getAuthorizedSignatories,
  getContactDetails,
  getMaxPermissibleWeights,
  createMasterData,
  uploadMasterDataImage
};
