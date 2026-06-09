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
import { showSuccess, showError } from '../components/shared/NotificationManager.jsx';
import React from 'react';

/**
 * Parses the structured bulk API response and shows appropriate UI feedback.
 * Handles full success and partial failures cleanly.
 */
const handleBulkResponse = (response, actionName) => {
  const { success, processed, failed, errors, message } = response.data || response;

  if (success && failed === 0) {
    showSuccess(`${processed} records ${actionName} successfully.`);
    return response.data || response;
  }

  if (success && failed > 0) {
    // Partial failure scenario
    // We format a clean multiline error message for the Toast
    const errorReasons = [...new Set(errors.map(e => e.reason))]; // Unique reasons
    const errorDetails = errorReasons.slice(0, 2).map(reason => `• ${reason}`).join('\n');
    const more = errorReasons.length > 2 ? `\n...and more` : '';
    
    // Using showError but passing a multi-line formatted string
    showError(`${processed} ${actionName} successfully.\n\n${failed} failed due to:\n${errorDetails}${more}`);
    
    return response.data || response;
  }

  // API returns success: false explicitly
  if (!success) {
    showError(`Failed to ${actionName} records: ${message || 'Unknown error'}`);
    throw new Error(message || 'Bulk operation failed');
  }

  return response.data || response;
};

const bulkActionService = {
  /**
   * Update multiple records dynamically
   * @param {string} resource - The target resource (e.g., 'invoices', 'leads')
   * @param {string[]} ids - Array of UUIDs to update
   * @param {object} data - Key-value pairs to update (e.g., { status: 'Paid' })
   */
  bulkUpdate: async (resource, ids, data) => {
    try {
      const response = await api.patch('/bulk/update', { resource, ids, data });
      return handleBulkResponse(response, 'updated');
    } catch (error) {
      const msg = error.response?.data?.message || `Failed to update ${resource}`;
      showError(msg);
      throw error;
    }
  },

  /**
   * Soft-delete multiple records safely with dependency pre-checks
   * @param {string} resource - The target resource
   * @param {string[]} ids - Array of UUIDs to delete
   */
  bulkDelete: async (resource, ids) => {
    try {
      const response = await api.delete('/bulk/delete', { data: { resource, ids } });
      return handleBulkResponse(response, 'deleted');
    } catch (error) {
      const msg = error.response?.data?.message || `Failed to delete ${resource}`;
      showError(msg);
      throw error;
    }
  },

  /**
   * Export multiple records to a specific format
   * @param {string} resource - The target resource
   * @param {string[]} ids - Array of UUIDs to export
   * @param {string} format - Format type ('csv', 'excel', 'pdf')
   */
  bulkExport: async (resource, ids, format = 'csv') => {
    try {
      // Endpoint to be created in phase 3
      const response = await api.post('/bulk/export', { resource, ids, format }, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      // Blob errors are tricky to parse, we handle gracefully
      showError(`Failed to export ${resource}`);
      throw error;
    }
  }
};

export default bulkActionService;
