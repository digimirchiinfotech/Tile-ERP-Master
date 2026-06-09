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
import masterDataService from '../services/masterDataService.js';

export const useMasterData = () => {
  const [data, setData] = useState({
    countries: [],
    cities: [],
    currencies: [],
    ports: [],
    portsOfLoading: [],
    portsOfDischarge: [],
    sizes: [],
    surfaces: [],
    thickness: [],
    applications: [],
    factoryNames: [],
    shippingLines: [],
    palletTypes: [],
    tilesBack: [],
    boxesMarking: [],
    boxTypes: [],
    boxTypeObjects: [],
    catalogueNames: [],
    deliveryTerms: [],
    paymentTerms: [],
    tariffCodes: [],
    finalDestinations: [],
    authorizedSignatories: [],
    contactDetails: [],
    maxPermissibleWeights: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllMasterData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        countries,
        currencies,
        ports,
        pol,
        pod,
        sizes,
        surfaces,
        thickness,
        applications,
        factories,
        shippingLines,
        palletTypes,
        tilesBack,
        boxesMarking,
        boxTypes,
        catalogues,
        deliveryTerms,
        paymentTerms,
        tariffCodes,
        finalDestinations,
        authorizedSignatories,
        contactDetails,
        maxPermissibleWeights
      ] = await Promise.all([
        masterDataService.getAllCountries().catch(() => []),
        masterDataService.getAllCurrencies().catch(() => []),
        masterDataService.getAllPorts().catch(() => []),
        masterDataService.getPortsOfLoading().catch(() => []),
        masterDataService.getPortsOfDischarge().catch(() => []),
        masterDataService.getAllSizes().catch(() => []),
        masterDataService.getAllSurfaces().catch(() => []),
        masterDataService.getAllThickness().catch(() => []),
        masterDataService.getAllApplications().catch(() => []),
        masterDataService.getAllFactories().catch(() => []),
        masterDataService.getAllShippingLines().catch(() => []),
        masterDataService.getAllPalletTypes().catch(() => []),
        masterDataService.getAllTilesBack().catch(() => []),
        masterDataService.getAllBoxesMarking().catch(() => []),
        masterDataService.getAllBoxTypes().catch(() => []),
        masterDataService.getAllCatalogues().catch(() => []),
        masterDataService.getDeliveryTerms().catch(() => []),
        masterDataService.getPaymentTerms().catch(() => []),
        masterDataService.getAllTariffCodes().catch(() => []),
        masterDataService.getAllFinalDestinations().catch(() => []),
        masterDataService.getAuthorizedSignatories().catch(() => []),
        masterDataService.getContactDetails().catch(() => []),
        masterDataService.getMaxPermissibleWeights().catch(() => [])
      ]);

      setData({
        countries: countries.map(c => ({
          countryName: c.countryName || c.value || (typeof c === 'string' ? c : ''),
          countryCode: c.countryCode || c.code || (typeof c === 'string' ? c : '')
        })),
        currencies: currencies.map(c => c.value || c),
        ports: ports.map(p => p.portName || p.value || p),
        portsOfLoading: pol.map(p => p.portName || p.value || p),
        portsOfDischarge: pod.map(p => p.portName || p.value || p),
        sizes: sizes.map(s => s.value || s),
        surfaces: surfaces.map(s => s.value || s),
        thickness: thickness.map(t => t.value || t),
        applications: applications.map(a => a.value || a),
        factoryNames: factories.map(f => f.value || f),
        shippingLines: shippingLines.map(s => s.value || s),
        palletTypes: palletTypes.map(p => p.value || p),
        tilesBack: tilesBack.map(t => t.value || t),
        boxesMarking: boxesMarking.map(b => b.value || b),
        boxTypes: boxTypes.map(b => b.value || b),
        boxTypeObjects: boxTypes,
        catalogueNames: catalogues.map(c => c.value || c),
        deliveryTerms: deliveryTerms.map(d => d.value || d),
        paymentTerms: paymentTerms.map(p => p.value || p),
        tariffCodes: tariffCodes.map(t => t.value || t),
        finalDestinations: finalDestinations.map(d => d.value || d.destination || d),
        authorizedSignatories: authorizedSignatories.map(s => s.value || s.name || s),
        contactDetails: contactDetails.map(c => c.value || c.detail || c),
        maxPermissibleWeights: maxPermissibleWeights.map(w => w.value || w.weight || w),
        cities: [] // Fetched per country
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCitiesByCountry = useCallback(async (countryCode) => {
    try {
      setLoading(true);
      const cities = await masterDataService.getCitiesByCountry(countryCode);
      setData(prev => ({ ...prev, cities: cities.map(c => ({
        cityName: c.cityName || c.value || (typeof c === 'string' ? c : ''),
        stateProvince: c.stateProvince || '',
        id: c.id
      })) }));
    } catch (err) {
      console.error(`Failed to fetch cities for ${countryCode}:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMasterData = useCallback(async (type, value) => {
    try {
      await masterDataService.createMasterData(type, value);
      // Refetch to ensure state is synced with DB
      await fetchAllMasterData();
      return true;
    } catch (err) {
      console.error(`Failed to add master data for ${type}:`, err);
      throw err;
    }
  }, [fetchAllMasterData]);

  useEffect(() => {
    fetchAllMasterData();
  }, [fetchAllMasterData]);

  return {
    ...data,
    loading,
    error,
    refresh: fetchAllMasterData,
    fetchCitiesByCountry,
    addMasterData
  };
};

