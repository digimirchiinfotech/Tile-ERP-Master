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
import { supplierService } from '../services/supplierService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';
import { normalizeArray, normalizeSupplier } from '../utils/dataTransformers';
import { dataSyncManager } from '../services/dataSyncManager';
import { useUserContext } from '../contexts/UserContext';

const EMPTY_ARRAY = [];

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState(EMPTY_ARRAY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthState();
  const { selectedCompanyId } = useUserContext();

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await RequestManager.execute(() => supplierService.getAll(), '/suppliers', 3);
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      // Transform snake_case fields to camelCase for frontend rendering
      const normalizedSuppliers = normalizeArray(data, normalizeSupplier);
      setSuppliers(Array.isArray(normalizedSuppliers) ? normalizedSuppliers : []);
      setError(null);
      
      // Broadcast update to all subscribers
      dataSyncManager.emit('suppliers', Array.isArray(normalizedSuppliers) ? normalizedSuppliers : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to supplier data changes from other components
  useEffect(() => {
    const unsubscribe = dataSyncManager.subscribe('suppliers', (updatedSuppliers) => {
      if (Array.isArray(updatedSuppliers)) {
        setSuppliers(updatedSuppliers);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (isAuthenticated) {
      if (!token) {
        console.warn('[useSuppliers] Authenticated but token missing');
        return;
      }
      fetchSuppliers();
      // Start auto-polling for this hook instance
      dataSyncManager.startPolling('suppliers', fetchSuppliers);
    }
  }, [isAuthenticated, selectedCompanyId]);

  // Fetch data on component mount to ensure fresh data on page refresh
  useEffect(() => {
    if (isAuthenticated && tokenManager.isAuthenticated()) {
      fetchSuppliers();
    }
  }, []);

  const createSupplier = async (supplierData) => {
    try {
      const response = await supplierService.create(supplierData);
      await fetchSuppliers();
      dataSyncManager.notifyChange('suppliers');
      return response.data;
    } catch (err) {
      console.error('Error creating supplier:', err);
      throw err;
    }
  };

  const updateSupplier = async (id, supplierData) => {
    try {
      const response = await supplierService.update(id, supplierData);
      await fetchSuppliers();
      dataSyncManager.notifyChange('suppliers');
      return response.data;
    } catch (err) {
      console.error('Error updating supplier:', err);
      throw err;
    }
  };

  const deleteSupplier = async (id, force = false) => {
    try {
      await supplierService.delete(id, force);
      await fetchSuppliers();
      dataSyncManager.notifyChange('suppliers');
    } catch (err) {
      console.error('Error deleting supplier:', err);
      throw err;
    }
  };

  const hardDeleteSupplier = async (id) => {
    try {
      await supplierService.hardDelete(id);
      await fetchSuppliers();
      dataSyncManager.notifyChange('suppliers');
    } catch (err) {
      console.error('Error hard deleting supplier:', err);
      throw err;
    }
  };

  const toggleSupplierStatus = async (id) => {
    try {
      await supplierService.toggleStatus(id);
      await fetchSuppliers();
      dataSyncManager.notifyChange('suppliers');
    } catch (err) {
      console.error('Error toggling supplier status:', err);
      throw err;
    }
  };

  return { suppliers, loading, error, fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, hardDeleteSupplier, toggleSupplierStatus };
};

