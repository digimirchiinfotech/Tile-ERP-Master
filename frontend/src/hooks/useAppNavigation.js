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

import { useCallback, useRef } from 'react';

/**
 * Hook to handle application-wide navigation and URL synchronization
 */
export const useAppNavigation = (setCurrentView, getDashboardForRole) => {
  // Track navigation history for proper back button support
  const navigationHistory = useRef([]);
  
  /**
   * Synchronize the browser URL with the current application state
   */
  const syncURLWithState = useCallback((view, data = {}) => {
    try {
      const url = new URL(window.location.href);
      
      if (view === 'dashboard' || view === 'login') {
        url.search = '';
      } else {
        url.searchParams.set('view', view);
        
        const id = data.id || 
                  data.invoice?.id || data.invoice?._id || 
                  data.order?.id || data.order?._id ||
                  data.client?.id || data.client?._id ||
                  data.qcRecord?.id || data.qcRecord?._id ||
                  data.packingList?.id || data.packingList?._id;
        
        if (id) {
          url.searchParams.set('id', id);
        } else {
          url.searchParams.delete('id');
        }
      }
      
      // Always push state so browser back button works correctly
      const stateObj = { view, id: url.searchParams.get('id') || null };
      
      if (window.location.search !== url.search) {
        window.history.pushState(stateObj, '', url.search || url.pathname);
      }
    } catch (error) {
      console.warn('Failed to sync URL with state:', error);
    }
  }, []);

  /**
   * Handle navigation between views with optional URL update
   */
  const handleNavigate = useCallback((view, data = {}, pushState = true, hooks = {}) => {
    setCurrentView(view);
    
    // Track navigation history for back button
    if (pushState) {
      navigationHistory.current.push(view);
      // Keep history manageable
      if (navigationHistory.current.length > 50) {
        navigationHistory.current = navigationHistory.current.slice(-30);
      }
    }
    
    // Optional: trigger refreshes if hooks are provided
    const refreshMap = {
      'order-dashboard': hooks.ordersHook?.fetchOrders,
      'invoice-dashboard': hooks.invoicesHook?.fetchInvoices,
      'lead-management': hooks.leadsHook?.fetchLeads,
      'client-management': hooks.clientsHook?.fetchClients,
      'supplier-management': hooks.suppliersHook?.fetchSuppliers,
      'product-management': hooks.productsHook?.fetchProducts,
      'qc-management': hooks.qcRecordsHook?.fetchQCRecords,
      'packing-list-management': hooks.packingListsHook?.fetchPackingLists,
      'user-management': hooks.usersHook?.fetchUsers,
    };

    if (refreshMap[view]) {
      refreshMap[view]();
    }

    if (pushState) {
      syncURLWithState(view, data);
    }

    // Only store navigation data if there's meaningful data (not just {id: null})
    const meaningfulData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    if (Object.keys(meaningfulData).length > 0) {
      sessionStorage.setItem('navigationData', JSON.stringify(meaningfulData));
    } else {
      sessionStorage.removeItem('navigationData');
    }
  }, [setCurrentView, syncURLWithState]);

  return { handleNavigate, syncURLWithState, navigationHistory };
};
