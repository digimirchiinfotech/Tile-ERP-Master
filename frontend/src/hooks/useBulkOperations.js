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

import { useState, useCallback } from 'react';
import { showSuccess, showError } from '../components/shared/NotificationManager.jsx';

/**
 * Custom hook for handling bulk operations on lists
 * Manages selection state and bulk action execution
 */
export const useBulkOperations = () => {
  const [selectedIds, setSelectedIds] = useState([]);

  // Toggle individual item selection
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  }, []);

  // Select all items
  const selectAll = useCallback((items) => {
    if (selectedIds.length === items.length) {
      // If all are selected, deselect all
      setSelectedIds([]);
    } else {
      // Select all
      setSelectedIds(items.map(item => item.id));
    }
  }, [selectedIds.length]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Bulk delete with confirmation
  const bulkDelete = useCallback(async (items, deleteFunction) => {
    if (selectedIds.length === 0) {
      showError('Please select at least one item to delete');
      return false;
    }

    const message = `Are you sure you want to delete ${selectedIds.length} item(s)? This action cannot be undone.`;
    if (!window.confirm(message)) {
      return false;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await deleteFunction(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete item ${id}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showSuccess(`Successfully deleted ${successCount} item(s)`, 4000);
    }
    if (errorCount > 0) {
      showError(`Failed to delete ${errorCount} item(s)`, 5000);
    }

    clearSelection();
    return true;
  }, [selectedIds, clearSelection]);

  // Bulk update status
  const bulkUpdateStatus = useCallback(async (items, updateFunction, newStatus) => {
    if (selectedIds.length === 0) {
      showError('Please select at least one item to update');
      return false;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        const item = items.find(i => i.id === id);
        await updateFunction(id, { ...item, status: newStatus });
        successCount++;
      } catch (error) {
        console.error(`Failed to update item ${id}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showSuccess(`Successfully updated ${successCount} item(s) to ${newStatus}`, 4000);
    }
    if (errorCount > 0) {
      showError(`Failed to update ${errorCount} item(s)`, 5000);
    }

    clearSelection();
    return true;
  }, [selectedIds, clearSelection]);

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkDelete,
    bulkUpdateStatus,
    hasSelection: selectedIds.length > 0,
    selectionCount: selectedIds.length,
  };
};
