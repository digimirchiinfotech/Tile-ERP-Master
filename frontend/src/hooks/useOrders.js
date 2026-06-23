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
import { orderService } from '../services/orderService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeOrder } from '../utils/dataTransformers';
import roleBasedDataService from '../services/roleBasedDataService';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useOrders = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: orders = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchOrders } = useQuery({
    queryKey: ['orders', selectedCompanyId],
    queryFn: async () => {
      const userRole = tokenManager.getUser()?.role;
      const response = userRole 
        ? await roleBasedDataService.getOrdersByRole({ role: userRole })
        : await orderService.getAll();
      
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      return normalizeArray(data, normalizeOrder);
    },
    enabled: tokenManager.isAuthenticated() && (!!selectedCompanyId || tokenManager.getUser()?.role === 'super_admin'),
    refetchInterval: 180000, // Reduced from 10s to 3m to save resources
  });

  const createMutation = useMutation({
    mutationFn: (data) => orderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedCompanyId] });
      dataSyncManager.notifyChange('orders');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => orderService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedCompanyId] });
      dataSyncManager.notifyChange('orders');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => orderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedCompanyId] });
      dataSyncManager.notifyChange('orders');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => orderService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', selectedCompanyId] });
      dataSyncManager.notifyChange('orders');
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
    toggleOrderStatus: toggleStatusMutation.mutateAsync
  };
};

