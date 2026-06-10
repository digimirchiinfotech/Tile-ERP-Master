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

import api from './api.js';

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
    const response = await api.post(
      `/${entityType}/${productId}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
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
