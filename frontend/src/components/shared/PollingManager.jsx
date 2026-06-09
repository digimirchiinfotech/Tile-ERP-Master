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

import React, { useEffect } from 'react';
import { tokenManager } from '../../utils/tokenManager.js';
import { dataSyncManager } from '../../services/dataSyncManager.js';

// Hooks for data fetching
import { useInvoices } from '../../hooks/useInvoices.js';
import { useOrders } from '../../hooks/useOrders.js';
import { useClients } from '../../hooks/useClients.js';
import { useProducts } from '../../hooks/useProducts.js';
import { useLeads } from '../../hooks/useLeads.js';
import { useUsers } from '../../hooks/useUsers.js';
import { useQCRecords } from '../../hooks/useQCRecords.js';
import { usePackingLists } from '../../hooks/usePackingLists.js';
import { useSuppliers } from '../../hooks/useSuppliers.js';

/**
 * PollingManager component handles background data polling
 * and provides data hooks to the rest of the application.
 */
const PollingManager = ({ currentUser, children }) => {
  const invoicesHook = useInvoices();
  const ordersHook = useOrders();
  const clientsHook = useClients();
  const productsHook = useProducts();
  const leadsHook = useLeads();
  const usersHook = useUsers();
  const qcRecordsHook = useQCRecords();
  const packingListsHook = usePackingLists();
  const suppliersHook = useSuppliers();

  /**
   * Initialize global background data polling when user logs in
   */
  useEffect(() => {
    if (currentUser && tokenManager.isAuthenticated()) {
      // Start background polling
      dataSyncManager.startPolling('clients', clientsHook.fetchClients);
      dataSyncManager.startPolling('suppliers', suppliersHook.fetchSuppliers);
      dataSyncManager.startPolling('products', productsHook.fetchProducts);
      dataSyncManager.startPolling('leads', leadsHook.fetchLeads);
      dataSyncManager.startPolling('invoices', invoicesHook.fetchInvoices);
      dataSyncManager.startPolling('orders', ordersHook.fetchOrders);
      
      return () => {
        dataSyncManager.stopAllPolling();
      };
    } else {
      dataSyncManager.stopAllPolling();
    }
  }, [currentUser]);

  // Provide the hooks to children via a render prop or just by passing them down
  // In this case, we'll use it as a wrapper that might provide a context later
  // but for now we just want to keep the logic here.
  
  return children({
    invoicesHook,
    ordersHook,
    clientsHook,
    productsHook,
    leadsHook,
    usersHook,
    qcRecordsHook,
    packingListsHook,
    suppliersHook,
    loading: invoicesHook.loading || ordersHook.loading || clientsHook.loading || 
             productsHook.loading || leadsHook.loading || usersHook.loading || qcRecordsHook.loading
  });
};

export default PollingManager;
