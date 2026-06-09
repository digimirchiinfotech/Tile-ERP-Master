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

/**
 * useMultiSelect Hook
 * Manages multi-select state and operations for tables
 */

import { useState, useCallback } from 'react';

export const useMultiSelect = (initialData = []) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const toggleSelectAll = useCallback((items) => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(items.map(item => item.id));
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  }, [selectAll]);

  const toggleSelect = useCallback((id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size > 0 && newSelected.size === (initialData?.length || 0));
  }, [selectedIds, initialData?.length]);

  const isSelected = useCallback((id) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const getSelectedCount = useCallback(() => {
    return selectedIds.size;
  }, [selectedIds]);

  const getSelectedIds = useCallback(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, []);

  return {
    selectedIds,
    selected: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    selectAll,
    toggleSelectAll,
    toggleSelect,
    isSelected,
    getSelectedCount,
    getSelectedIds,
    clearSelection
  };
};

export default useMultiSelect;
