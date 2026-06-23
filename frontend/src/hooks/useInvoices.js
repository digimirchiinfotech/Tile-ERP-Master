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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeData } from '../utils/dataTransformers';
import roleBasedDataService from '../services/roleBasedDataService';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useInvoices = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: invoices = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchInvoices } = useQuery({
    queryKey: ['invoices', selectedCompanyId],
    queryFn: async () => {
      const userRole = tokenManager.getUser()?.role;
      const response = userRole 
        ? await roleBasedDataService.getInvoicesByRole({ role: userRole })
        : await invoiceService.getAll();
      
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      return normalizeArray(data, normalizeData);
    },
    enabled: tokenManager.isAuthenticated() && (!!selectedCompanyId || tokenManager.getUser()?.role === 'super_admin'),
    refetchInterval: 10000, // Real-time polling every 10s
  });

  const createMutation = useMutation({
    mutationFn: (data) => invoiceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCompanyId] });
      dataSyncManager.notifyChange('invoices');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => invoiceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCompanyId] });
      dataSyncManager.notifyChange('invoices');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => invoiceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCompanyId] });
      dataSyncManager.notifyChange('invoices');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => invoiceService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCompanyId] });
      dataSyncManager.notifyChange('invoices');
    },
  });

  return { 
    invoices, 
    loading, 
    error, 
    fetchInvoices, 
    createInvoice: createMutation.mutateAsync, 
    updateInvoice: updateMutation.mutateAsync, 
    deleteInvoice: deleteMutation.mutateAsync,
    toggleInvoiceStatus: toggleStatusMutation.mutateAsync 
  };
};

