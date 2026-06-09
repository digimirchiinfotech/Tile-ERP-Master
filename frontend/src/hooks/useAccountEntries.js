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

import { useState, useEffect } from 'react';
import { accountEntryService } from '../services/accountEntryService';

export const useAccountEntries = () => {
  const [accountEntries, setAccountEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    upcomingDues: 0
  });

  const fetchAccountEntries = async () => {
    try {
      setLoading(true);
      const response = await accountEntryService.getAll();
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      setAccountEntries(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch account entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await accountEntryService.getSummary();
      if (response.data?.success) {
        setSummary(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching account summary:', err);
    }
  };

  useEffect(() => {
    fetchAccountEntries();
    fetchSummary();
  }, []);

  const createAccountEntry = async (entryData) => {
    try {
      const response = await accountEntryService.create(entryData);
      await fetchAccountEntries();
      await fetchSummary();
      return response.data;
    } catch (err) {
      console.error('Error creating account entry:', err);
      throw err;
    }
  };

  const updateAccountEntry = async (id, entryData) => {
    try {
      const response = await accountEntryService.update(id, entryData);
      await fetchAccountEntries();
      await fetchSummary();
      return response.data;
    } catch (err) {
      console.error('Error updating account entry:', err);
      throw err;
    }
  };

  const deleteAccountEntry = async (id) => {
    try {
      await accountEntryService.delete(id);
      await fetchAccountEntries();
      await fetchSummary();
    } catch (err) {
      console.error('Error deleting account entry:', err);
      throw err;
    }
  };

  const hardDeleteAccountEntry = async (id) => {
    try {
      await accountEntryService.hardDelete(id);
      await fetchAccountEntries();
      await fetchSummary();
    } catch (err) {
      console.error('Error hard deleting account entry:', err);
      throw err;
    }
  };

  const toggleAccountEntryStatus = async (id) => {
    try {
      await accountEntryService.toggleStatus(id);
      await fetchAccountEntries();
      await fetchSummary();
    } catch (err) {
      console.error('Error toggling account entry status:', err);
      throw err;
    }
  };

  return { 
    accountEntries, 
    loading, 
    error, 
    summary,
    fetchAccountEntries, 
    fetchSummary,
    createAccountEntry, 
    updateAccountEntry, 
    deleteAccountEntry, 
    hardDeleteAccountEntry, 
    toggleAccountEntryStatus 
  };
};
