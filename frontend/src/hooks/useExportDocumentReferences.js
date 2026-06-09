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

/**
 * Hook: useExportDocumentReferences
 * Manages strict sequential references for export documents with auto-fetch
 * Ensures: Export Invoice → Packing List → Annexure → Backside → VGM → Shipping
 */

import { useState, useCallback } from 'react';
import api from '../services/api';
import { exportMapper } from '../utils/exportMapper';

export const useExportDocumentReferences = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [references, setReferences] = useState({
    exportInvoices: [],
    packingLists: [],
    annexures: [],
    backsides: [],
    vgmDocuments: []
  });
  const [inheritedData, setInheritedData] = useState({});

  /**
   * Fetch valid Export Invoice references for Packing List creation
   */
  const fetchExportInvoiceReferences = useCallback(async (searchTerm = '', currentId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/export-documents/references/export-invoices', {
        params: { search: searchTerm, currentId }
      });
      setReferences(prev => ({
        ...prev,
        exportInvoices: response.data?.data || []
      }));
      return response.data?.data || [];
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch export invoice references';
      setError(message);
      console.error('Error fetching export invoice references:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch valid Packing List references for Annexure creation
   */
  const fetchPackingListReferences = useCallback(async (exportInvoiceId = null, searchTerm = '', currentId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/export-documents/references/packing-lists', {
        params: { exportInvoiceId, search: searchTerm, currentId }
      });
      setReferences(prev => ({
        ...prev,
        packingLists: response.data?.data || []
      }));
      return response.data?.data || [];
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch packing list references';
      setError(message);
      console.error('Error fetching packing list references:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch valid Annexure references for Invoice Backside creation
   */
  const fetchAnnexureReferences = useCallback(async (packingListId = null, searchTerm = '', currentId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/export-documents/references/annexures', {
        params: { packingListId, search: searchTerm, currentId }
      });
      setReferences(prev => ({
        ...prev,
        annexures: response.data?.data || []
      }));
      return response.data?.data || [];
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch annexure references';
      setError(message);
      console.error('Error fetching annexure references:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch valid Invoice Backside references for VGM creation
   */
  const fetchBacksideReferences = useCallback(async (annexureId = null, searchTerm = '', exportInvoiceId = null, currentId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/export-documents/references/backsides', {
        params: { annexureId, search: searchTerm, exportInvoiceId, currentId }
      });
      setReferences(prev => ({
        ...prev,
        backsides: response.data?.data || []
      }));
      return response.data?.data || [];
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch backside references';
      setError(message);
      console.error('Error fetching backside references:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch valid VGM references for Shipping Instructions creation
   */
  const fetchVGMReferences = useCallback(async (backsideId = null, searchTerm = '', currentId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/export-documents/references/vgm', {
        params: { backsideId, search: searchTerm, currentId }
      });
      setReferences(prev => ({
        ...prev,
        vgmDocuments: response.data?.data || []
      }));
      return response.data?.data || [];
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch VGM references';
      setError(message);
      console.error('Error fetching VGM references:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get inherited data for Packing List from Export Invoice
   */
  const getPackingListInheritedData = useCallback(async (exportInvoiceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-documents/inherit/packing-list/${exportInvoiceId}`);
      const rawData = response.data?.data || {};
      return rawData;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch inherited data';
      setError(message);
      console.error('Error fetching inherited data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get inherited data for Annexure from Packing List
   */
  const getAnnexureInheritedData = useCallback(async (packingListId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-documents/inherit/annexure/${encodeURIComponent(packingListId)}`);
      return response.data?.data || null;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch inherited data';
      setError(message);
      console.error('Error fetching inherited data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get inherited data for Invoice Backside from Annexure
   */
  const getBacksideInheritedData = useCallback(async (annexureId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-documents/inherit/backside/${annexureId}`);
      const rawData = response.data?.data || {};
      return rawData;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch inherited data';
      setError(message);
      console.error('Error fetching inherited data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get inherited data for VGM from Invoice Backside
   */
  const getVGMInheritedData = useCallback(async (backsideId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-documents/inherit/vgm/${backsideId}`);
      const rawData = response.data?.data || {};
      return rawData;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch inherited data';
      setError(message);
      console.error('Error fetching inherited data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get inherited data for Shipping Instructions from VGM
   */
  const getShippingInheritedData = useCallback(async (vgmId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-documents/inherit/shipping/${vgmId}`);
      const rawData = response.data?.data || {};
      return rawData;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch inherited data';
      setError(message);
      console.error('Error fetching inherited data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate a reference before using it
   */
  const validateReference = useCallback(async (referenceType, referenceId) => {
    try {
      const response = await api.post('/export-documents/validate-reference', {
        referenceType,
        referenceId
      });
      return response.data?.valid || false;
    } catch (err) {
      console.error('Error validating reference:', err);
      return false;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    references,
    inheritedData,

    // Reference fetching
    fetchExportInvoiceReferences,
    fetchPackingListReferences,
    fetchAnnexureReferences,
    fetchBacksideReferences,
    fetchVGMReferences,

    // Data inheritance
    getPackingListInheritedData,
    getAnnexureInheritedData,
    getBacksideInheritedData,
    getVGMInheritedData,
    getShippingInheritedData,

    // Utilities
    validateReference,
    clearError
  };
};

export default useExportDocumentReferences;
