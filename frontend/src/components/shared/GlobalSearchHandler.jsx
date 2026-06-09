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

import React, { useState } from 'react';
import searchService from '../../services/searchService.js';
import { showError } from './NotificationManager.jsx';

/**
 * GlobalSearchHandler Component
 * Encapsulates the global search logic and state management.
 * This can be used as a wrapper or a headless component.
 */
const GlobalSearchHandler = ({ children, onSearchComplete, syncURLWithState }) => {
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      setSearchQuery('');
      if (onSearchComplete) onSearchComplete(null, '');
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchService.globalSearch(query);
      const results = response.data || [];
      
      const filterByType = (type) => results.filter(item => item.type === type);
      
      const formattedResults = {
        exportInvoices: filterByType('Export Invoice'),
        proformaInvoices: filterByType('Proforma Invoice'),
        orders: filterByType('Proforma Order'),
        clients: filterByType('Client'),
        products: filterByType('Product'),
        leads: filterByType('Lead'),
        qcRecords: filterByType('QC Record'),
        packingLists: filterByType('Packing List'),
        suppliers: filterByType('Supplier'),
        users: filterByType('User'),
        catalogues: filterByType('Catalogue'),

        shippingInstructions: filterByType('Shipping Instruction'),
        accountEntries: filterByType('Account Entry'),
        companies: filterByType('Company'),
        annexure: filterByType('Annexure'),
        vgm: filterByType('VGM'),
        invoiceBackside: filterByType('Invoice Backside'),

        customsClearance: filterByType('Customs Clearance'),
        certificate: filterByType('Certificate'),
      };

      setSearchResults(formattedResults);
      setSearchQuery(query);
      
      if (syncURLWithState) {
        syncURLWithState('search-results', { q: query });
      }

      if (onSearchComplete) {
        onSearchComplete(formattedResults, query);
      }
    } catch (error) {
      console.error('Global search error:', error);
      showError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return children({
    handleSearch,
    searchResults,
    searchQuery,
    isSearching,
    setSearchResults
  });
};

export default GlobalSearchHandler;
