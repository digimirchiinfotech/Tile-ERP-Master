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
import { rateHistoryService } from '../services/rateHistoryService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';

export const useRateHistory = () => {
  const [rateHistory, setRateHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthState();

  const fetchRateHistory = async () => {
    try {
      setLoading(true);
      const response = await RequestManager.execute(() => rateHistoryService.getAll(), '/rate-history', 3);
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      setRateHistory(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching rate history:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch rate history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token && isAuthenticated) {
      fetchRateHistory();
    }
  }, [isAuthenticated]);

  const createRateHistory = async (data) => {
    try {
      const response = await rateHistoryService.create(data);
      await fetchRateHistory();
      return response.data || response;
    } catch (err) {
      console.error('Error creating rate history:', err);
      throw err;
    }
  };

  const updateRateHistory = async (id, data) => {
    try {
      const response = await rateHistoryService.update(id, data);
      await fetchRateHistory();
      return response.data || response;
    } catch (err) {
      console.error('Error updating rate history:', err);
      throw err;
    }
  };

  const deleteRateHistory = async (id) => {
    try {
      await rateHistoryService.delete(id);
      await fetchRateHistory();
    } catch (err) {
      console.error('Error deleting rate history:', err);
      throw err;
    }
  };

  const hardDeleteRateHistory = async (id) => {
    try {
      await rateHistoryService.hardDelete(id);
      await fetchRateHistory();
    } catch (err) {
      console.error('Error hard deleting rate history:', err);
      throw err;
    }
  };

  return { 
    rateHistory, 
    loading, 
    error, 
    fetchRateHistory, 
    createRateHistory, 
    updateRateHistory, 
    deleteRateHistory,
    hardDeleteRateHistory
  };
};
