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

import { useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Bridge hook to handle application-wide navigation using React Router v6
 */
export const useAppNavigation = (getDashboardForRole) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationHistory = useRef([]);
  
  // This is kept for backwards compatibility but we no longer manually sync URL
  const syncURLWithState = useCallback((view, data = {}) => {}, []);

  const handleNavigate = useCallback((view, data = {}, pushState = true, hooks = {}) => {
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

    // Only store navigation data if there's meaningful data
    const meaningfulData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) acc[key] = value;
      return acc;
    }, {});

    if (Object.keys(meaningfulData).length > 0) {
      sessionStorage.setItem('navigationData', JSON.stringify(meaningfulData));
    } else {
      sessionStorage.removeItem('navigationData');
    }

    if (pushState) {
      let route = view.startsWith('/') ? view : `/${view}`;
      
      // Determine if there's an ID to append to the search string
      const id = data.id || 
                 data.invoice?.id || data.invoice?._id || 
                 data.order?.id || data.order?._id ||
                 data.client?.id || data.client?._id ||
                 data.qcRecord?.id || data.qcRecord?._id ||
                 data.packingList?.id || data.packingList?._id ||
                 data.exportInvoice?.id || data.exportInvoice?._id;
                 
      if (id) {
        route += `?id=${id}`;
      }

      navigate(route, { state: meaningfulData });
    }
  }, [navigate]);

  return { handleNavigate, syncURLWithState, navigationHistory };
};
