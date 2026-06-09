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

export const getMasterData = async (type) => {
  try {
    const response = await api.get(`/master-data/${type}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching sanitaryware master data for ${type}:`, error);
    return [];
  }
};

export const createMasterData = async (type, value) => {
  try {
    const response = await api.post(`/master-data/${type}`, { value });
    return response.data.data;
  } catch (error) {
    console.error(`Error creating sanitaryware master data for ${type}:`, error);
    throw error;
  }
};

export const updateMasterData = async (type, id, data) => {
  try {
    const response = await api.put(`/master-data/${type}/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating sanitaryware master data for ${type}:`, error);
    throw error;
  }
};

export const deleteMasterData = async (type, id) => {
  try {
    const response = await api.delete(`/master-data/${type}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting sanitaryware master data for ${type}:`, error);
    throw error;
  }
};

export const toggleStatus = async (type, id) => {
  try {
    const response = await api.patch(`/master-data/${type}/${id}/toggle-status`);
    return response.data.data;
  } catch (error) {
    console.error(`Error toggling sanitaryware status for ${type}:`, error);
    throw error;
  }
};

export default {
  getMasterData,
  createMasterData,
  updateMasterData,
  deleteMasterData,
  toggleStatus
};
