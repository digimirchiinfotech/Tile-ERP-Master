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

export const getProducts = async () => {
  const response = await api.get('/sanitaryware-products');
  const responseData = response?.data?.data || response?.data || {};
  return Array.isArray(responseData) ? responseData : (responseData.data || []);
};

export const getProductById = async (id) => {
  const response = await api.get(`/sanitaryware-products/${id}`);
  return response.data.data;
};

export const createProduct = async (data) => {
  const response = await api.post('/sanitaryware-products', data);
  return response.data.data;
};

export const updateProduct = async (id, data) => {
  const response = await api.put(`/sanitaryware-products/${id}`, data);
  return response.data.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/sanitaryware-products/${id}`);
  return response.data;
};

export const toggleProductStatus = async (id) => {
  const response = await api.patch(`/sanitaryware-products/${id}/toggle-status`);
  return response.data.data;
};

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus
};
