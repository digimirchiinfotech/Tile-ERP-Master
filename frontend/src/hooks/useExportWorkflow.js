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
import { tokenManager } from '../config/tokenManager.js';
import api from '../services/api.js';

/**
 * Hook to manage export workflow interconnections
 * Fetches data across all export stages and handles inheritance
 */
export const useExportWorkflow = () => {
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated] = useState(!!tokenManager.getAccessToken());

  /**
   * Fetch complete workflow from proforma invoice through all stages
   */
  const fetchCompleteWorkflow = async (proformaInvoiceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-workflow/complete/${proformaInvoiceId}`);
      setWorkflowData(response.data?.data || response.data);
      return response.data?.data || response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch workflow';
      setError(message);
      console.error('Error fetching complete workflow:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch export invoice workflow with all downstream stages
   */
  const fetchExportInvoiceWorkflow = async (exportInvoiceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-workflow/export-invoice/${exportInvoiceId}`);
      setWorkflowData(response.data?.data || response.data);
      return response.data?.data || response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch export invoice workflow';
      setError(message);
      console.error('Error fetching export invoice workflow:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get data for creating next stage document (with auto-inherited fields)
   */
  const getDataForNextStage = async (stage, documentId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-workflow/next-stage/${stage}/${documentId}`);
      return response.data?.data || response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to get next stage data';
      setError(message);
      console.error('Error getting next stage data:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get workflow completion summary
   */
  const getWorkflowCompletionStatus = async (exportInvoiceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/export-workflow/completion/${exportInvoiceId}`);
      return response.data?.data || response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to get completion status';
      setError(message);
      console.error('Error getting workflow completion status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sync updates across related documents
   */
  const syncUpdatesAcrossStages = async (documentId, stage, changedFields) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/export-workflow/sync', {
        documentId,
        stage,
        changedFields
      });
      return response.data?.data || response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to sync updates';
      setError(message);
      console.error('Error syncing updates:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all export invoices with workflow status
   */
  const fetchAllWorkflowStatus = async (searchTerm, status) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (status) params.append('status', status);
      
      const response = await api.get(`/export-workflow/status?${params.toString()}`);
      return response.data?.data || response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch workflow status';
      setError(message);
      console.error('Error fetching workflow status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    workflowData,
    loading,
    error,
    fetchCompleteWorkflow,
    fetchExportInvoiceWorkflow,
    getDataForNextStage,
    getWorkflowCompletionStatus,
    syncUpdatesAcrossStages,
    fetchAllWorkflowStatus
  };
};

export default useExportWorkflow;
