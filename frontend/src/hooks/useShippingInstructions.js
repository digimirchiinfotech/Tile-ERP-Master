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
import { shippingInstructionService } from '../services/shippingInstructionService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useShippingInstructions = () => {
  const [shippingInstructions, setShippingInstructions] = useState(EMPTY_ARRAY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const isAuthenticated = useAuthState();

  const fetchShippingInstructions = async (params = {}) => {
    try {
      setLoading(true);
      const response = await RequestManager.execute(() => shippingInstructionService.getAll({
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
        search: params.search || '',
        ...params
      }), '/export-shipping-instructions', 3);
      
      const responseData = response?.data || {};
      
      // The backend returns { success: true, data: { data: [...], total: X } }
      // Or sometimes just { success: true, data: [...] }
      let docs = [];
      let totalCount = 0;
      
      if (responseData.data) {
        if (Array.isArray(responseData.data.data)) {
          // Paginated format: { data: { data: [...], total: X } }
          docs = responseData.data.data;
          totalCount = responseData.data.total || docs.length;
        } else if (Array.isArray(responseData.data)) {
          // Direct array format: { data: [...] }
          docs = responseData.data;
          totalCount = docs.length;
        }
      } else if (Array.isArray(responseData)) {
        // Raw array format
        docs = responseData;
        totalCount = docs.length;
      }

      setShippingInstructions(docs);
      setPagination(prev => ({
        ...prev,
        total: totalCount || responseData.data?.total || docs.length,
        page: responseData.data?.page || params.page || prev.page,
        limit: responseData.data?.limit || params.limit || prev.limit,
        totalPages: responseData.data?.totalPages || Math.ceil((totalCount || 0) / (params.limit || prev.limit || 10))
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching shipping instructions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch shipping instructions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token && isAuthenticated) {
      fetchShippingInstructions({ page: pagination.page, limit: pagination.limit });
    }
  }, [isAuthenticated]);

  const createShippingInstruction = async (data) => {
    try {
      let response;
      if (data && data.exportInvoiceId) {
        response = await shippingInstructionService.createByExportInvoice(data.exportInvoiceId, data);
      } else {
        response = await shippingInstructionService.create(data);
      }
      await fetchShippingInstructions();
      dataSyncManager.notifyChange('shippingInstruction');
      return response.data || response;
    } catch (err) {
      console.error('Error creating shipping instruction:', err);
      throw err;
    }
  };

  const updateShippingInstruction = async (id, data) => {
    try {
      let response;
      if (data && data.exportInvoiceId) {
        // use the invoice route because it handles create-or-update
        response = await shippingInstructionService.updateByExportInvoice(data.exportInvoiceId, data);
      } else {
        response = await shippingInstructionService.update(id, data);
      }
      await fetchShippingInstructions();
      dataSyncManager.notifyChange('shippingInstruction');
      return response.data || response;
    } catch (err) {
      console.error('Error updating shipping instruction:', err);
      throw err;
    }
  };

  const deleteShippingInstruction = async (id) => {
    try {
      await shippingInstructionService.delete(id);
      await fetchShippingInstructions();
      dataSyncManager.notifyChange('shippingInstruction');
    } catch (err) {
      console.error('Error deleting shipping instruction:', err);
      throw err;
    }
  };

  const hardDeleteShippingInstruction = async (id) => {
    try {
      await shippingInstructionService.hardDelete(id);
      await fetchShippingInstructions();
      dataSyncManager.notifyChange('shippingInstruction');
    } catch (err) {
      console.error('Error hard deleting shipping instruction:', err);
      throw err;
    }
  };

  const toggleShippingInstructionStatus = async (id) => {
    try {
      await shippingInstructionService.toggleStatus(id);
      await fetchShippingInstructions();
      dataSyncManager.notifyChange('shippingInstruction');
    } catch (err) {
      console.error('Error toggling shipping instruction status:', err);
      throw err;
    }
  };

  return { 
    shippingInstructions, 
    loading, 
    error, 
    pagination,
    setPagination,
    fetchShippingInstructions, 
    createShippingInstruction, 
    updateShippingInstruction, 
    deleteShippingInstruction,
    hardDeleteShippingInstruction,
    toggleShippingInstructionStatus
  };
};
