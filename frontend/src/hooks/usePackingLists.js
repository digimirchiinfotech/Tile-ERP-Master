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
import { packingListService } from '../services/packingListService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';
import { normalizeArray, normalizeData, normalizePackingList, prepareDataForAPI } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const usePackingLists = () => {
  const [packingLists, setPackingLists] = useState(EMPTY_ARRAY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthState();
  const { selectedCompanyId } = useUserContext();

  const fetchPackingLists = async () => {
    if (!tokenManager.isAuthenticated()) {
      setPackingLists(EMPTY_ARRAY);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await RequestManager.execute(() => packingListService.getAll(), '/packing-lists', 3);
      // Backend returns { success: true, data: { items: [], total: 0 } }
      // Or if paginationResponse is used: { items: [], total: 0, page: 1, limit: 50 }
      const responseData = response?.data?.data || response?.data || {};
      const items = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      const normalizedPackingLists = normalizeArray(items, normalizePackingList);
      setPackingLists(normalizedPackingLists);
      setError(null);
    } catch (err) {
      console.error('Error fetching packing lists:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch packing lists');
      setPackingLists(EMPTY_ARRAY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (isAuthenticated) {
      if (!token) {
        console.warn('[usePackingLists] Authenticated but token missing');
        return;
      }
      fetchPackingLists();
    }
  }, [isAuthenticated, selectedCompanyId]);

  const createPackingList = async (packingListData) => {
    try {
      const apiData = prepareDataForAPI(packingListData);
      const response = await packingListService.create(apiData);
      await fetchPackingLists();
      dataSyncManager.notifyChange('packingList');
      return response.data;
    } catch (err) {
      console.error('Error creating packing list:', err);
      throw err;
    }
  };

  const updatePackingList = async (id, packingListData) => {
    try {
      const apiData = prepareDataForAPI(packingListData);
      const response = await packingListService.update(id, apiData);
      await fetchPackingLists();
      dataSyncManager.notifyChange('packingList');
      return response.data;
    } catch (err) {
      console.error('Error updating packing list:', err);
      throw err;
    }
  };

  const deletePackingList = async (id) => {
    try {
      await packingListService.delete(id);
      await fetchPackingLists();
      dataSyncManager.notifyChange('packingList');
    } catch (err) {
      console.error('Error deleting packing list:', err);
      throw err;
    }
  };

  const hardDeletePackingList = async (id) => {
    try {
      await packingListService.hardDelete(id);
      await fetchPackingLists();
      dataSyncManager.notifyChange('packingList');
    } catch (err) {
      console.error('Error hard deleting packing list:', err);
      throw err;
    }
  };

  const togglePackingListStatus = async (id) => {
    try {
      await packingListService.toggleStatus(id);
      await fetchPackingLists();
      dataSyncManager.notifyChange('packingList');
    } catch (err) {
      console.error('Error toggling packing list status:', err);
      throw err;
    }
  };

  return { packingLists, loading, error, fetchPackingLists, createPackingList, updatePackingList, deletePackingList, hardDeletePackingList, togglePackingListStatus };
};
