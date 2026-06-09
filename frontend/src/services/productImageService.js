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

import axios from 'axios';
import { tokenManager } from '../utils/tokenManager.js';

// Use current origin to get the actual domain in Replit environment
const API_BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : '';

const API_URL = `${API_BASE_URL}/api/products`;

export const uploadProductImage = async (productId, file, entityType = 'products') => {
  // Validate inputs
  if (!productId) {
    throw new Error('Product ID is required');
  }
  
  if (!file) {
    throw new Error('File is required');
  }

  // Create FormData properly
  const formData = new FormData();
  formData.append('image', file);

  try {
    // Get auth token
    const token = tokenManager.getAccessToken();
    const headers = {};
    
    // Add authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/${entityType}/${productId}/upload-image`,
      formData,
      {
        headers, // axios will set Content-Type: multipart/form-data automatically
        withCredentials: true,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('[uploadProductImage] Upload failed:', error.response?.data || error.message);
    throw error;
  }
};

export const removeProductImage = (images, imageId) => {
  return images.filter(img => img.id !== imageId);
};
