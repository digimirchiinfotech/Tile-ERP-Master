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
import { workflowService } from '../services/workflowService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthState();

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await RequestManager.execute(() => workflowService.getAll(), '/workflows', 3);
      const data = response?.data?.data?.data || response?.data?.data || response?.data || response;
      setWorkflows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token && isAuthenticated) {
      fetchWorkflows();
    }
  }, [isAuthenticated]);

  const createWorkflow = async (data) => {
    try {
      const response = await workflowService.create(data);
      await fetchWorkflows();
      return response.data || response;
    } catch (err) {
      console.error('Error creating workflow:', err);
      throw err;
    }
  };

  const updateWorkflow = async (id, data) => {
    try {
      const response = await workflowService.update(id, data);
      await fetchWorkflows();
      return response.data || response;
    } catch (err) {
      console.error('Error updating workflow:', err);
      throw err;
    }
  };

  const deleteWorkflow = async (id) => {
    try {
      await workflowService.delete(id);
      await fetchWorkflows();
    } catch (err) {
      console.error('Error deleting workflow:', err);
      throw err;
    }
  };

  const hardDeleteWorkflow = async (id) => {
    try {
      await workflowService.hardDelete(id);
      await fetchWorkflows();
    } catch (err) {
      console.error('Error hard deleting workflow:', err);
      throw err;
    }
  };

  return { 
    workflows, 
    loading, 
    error, 
    fetchWorkflows, 
    createWorkflow, 
    updateWorkflow, 
    deleteWorkflow,
    hardDeleteWorkflow
  };
};
