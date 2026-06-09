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
import { clientOrderService } from '../services/clientOrderService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeOrder } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useClientOrders = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: orders = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchOrders } = useQuery({
    queryKey: ['client-orders', selectedCompanyId],
    queryFn: async () => {
      const response = await clientOrderService.getAll();
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      return normalizeArray(data, normalizeOrder);
    },
    enabled: tokenManager.isAuthenticated() && (!!selectedCompanyId || tokenManager.getUser()?.role === 'super_admin'),
    refetchInterval: 180000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => clientOrderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-orders', selectedCompanyId] });
      dataSyncManager.notifyChange('client-orders');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientOrderService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-orders', selectedCompanyId] });
      dataSyncManager.notifyChange('client-orders');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => clientOrderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-orders', selectedCompanyId] });
      dataSyncManager.notifyChange('client-orders');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => clientOrderService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-orders', selectedCompanyId] });
      dataSyncManager.notifyChange('client-orders');
    },
  });

  return { 
    orders, 
    loading, 
    error, 
    fetchOrders, 
    createOrder: createMutation.mutateAsync, 
    updateOrder: updateMutation.mutateAsync, 
    deleteOrder: deleteMutation.mutateAsync,
    updateOrderStatus: updateStatusMutation.mutateAsync
  };
};
