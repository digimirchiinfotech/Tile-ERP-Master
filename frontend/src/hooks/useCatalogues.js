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
import { catalogueService } from '../services/catalogueService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';
import { normalizeArray, normalizeData, normalizeCatalogue } from '../utils/dataTransformers';

export const useCatalogues = () => {
  const [catalogues, setCatalogues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthState();

  const fetchCatalogues = async () => {
    if (!tokenManager.isAuthenticated()) {
      setCatalogues([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await RequestManager.execute(() => catalogueService.getAll(), '/catalogues', 3);
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      const normalizedCatalogues = normalizeArray(data, normalizeCatalogue);
      setCatalogues(Array.isArray(normalizedCatalogues) ? normalizedCatalogues : []);
      setError(null);
    } catch (err) {
      // Silently ignore if not authenticated
      //console.error('Error fetching catalogues:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch catalogues');
      setCatalogues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token && isAuthenticated) {
      fetchCatalogues();
    }
  }, [isAuthenticated]);

  const createCatalogue = async (catalogueData) => {
    try {
      const response = await catalogueService.create(catalogueData);
      await fetchCatalogues();
      return response.data;
    } catch (err) {
      console.error('Error creating catalogue:', err);
      throw err;
    }
  };

  const updateCatalogue = async (id, catalogueData) => {
    try {
      const response = await catalogueService.update(id, catalogueData);
      await fetchCatalogues();
      return response.data;
    } catch (err) {
      console.error('Error updating catalogue:', err);
      throw err;
    }
  };

  const deleteCatalogue = async (id) => {
    try {
      await catalogueService.delete(id);
      await fetchCatalogues();
    } catch (err) {
      console.error('Error deleting catalogue:', err);
      throw err;
    }
  };

  const hardDeleteCatalogue = async (id) => {
    try {
      await catalogueService.hardDelete(id);
      await fetchCatalogues();
    } catch (err) {
      console.error('Error hard deleting catalogue:', err);
      throw err;
    }
  };

  const toggleCatalogueStatus = async (id) => {
    try {
      await catalogueService.toggleStatus(id);
      await fetchCatalogues();
    } catch (err) {
      console.error('Error toggling catalogue status:', err);
      throw err;
    }
  };

  return { catalogues, loading, error, fetchCatalogues, createCatalogue, updateCatalogue, deleteCatalogue, hardDeleteCatalogue, toggleCatalogueStatus };
};
