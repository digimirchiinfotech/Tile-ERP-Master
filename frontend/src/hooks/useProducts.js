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
import { productService } from '../services/productService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeProduct, prepareDataForAPI } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useProducts = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: products = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchProducts } = useQuery({
    queryKey: ['products', selectedCompanyId],
    queryFn: async () => {
      const response = await productService.getAll();
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      return normalizeArray(data, normalizeProduct);
    },
    enabled: !!tokenManager.getAccessToken(),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => productService.create(prepareDataForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedCompanyId] });
      dataSyncManager.notifyChange('products');
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (products) => productService.bulkCreate(products.map(prepareDataForAPI)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedCompanyId] });
      dataSyncManager.notifyChange('products');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productService.update(id, prepareDataForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedCompanyId] });
      dataSyncManager.notifyChange('products');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedCompanyId] });
      dataSyncManager.notifyChange('products');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => productService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedCompanyId] });
      dataSyncManager.notifyChange('products');
    },
  });

  return { 
    products, 
    loading, 
    error, 
    fetchProducts, 
    createProduct: createMutation.mutateAsync, 
    bulkCreateProducts: bulkCreateMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync, 
    deleteProduct: deleteMutation.mutateAsync,
    toggleProductStatus: toggleStatusMutation.mutateAsync
  };
};

