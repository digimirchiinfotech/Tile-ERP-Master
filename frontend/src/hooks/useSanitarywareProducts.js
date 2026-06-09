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
import { getProducts, createProduct, updateProduct, deleteProduct, toggleProductStatus } from '../services/sanitarywareProductService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeProduct, prepareDataForAPI } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useSanitarywareProducts = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: sanitarywareProducts = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchSanitarywareProducts } = useQuery({
    queryKey: ['sanitarywareProducts', selectedCompanyId],
    queryFn: async () => {
      const response = await getProducts();
      // Service already extracts data
      return normalizeArray(response, (p) => {
        const normalized = normalizeProduct(p);
        
        // Map Sanitaryware specific fields to generic fields for uniform UI rendering
        if (!normalized.size) {
           if (normalized.dimensionsL && normalized.dimensionsW) {
             normalized.size = `${normalized.dimensionsL}x${normalized.dimensionsW}${normalized.dimensionsH ? 'x' + normalized.dimensionsH : ''}`;
           } else if (normalized.category) {
             normalized.size = normalized.category;
           }
        }
        
        if (!normalized.surface && normalized.finishType) {
          normalized.surface = normalized.finishType;
        }
        
        return normalized;
      });
    },
    enabled: !!tokenManager.getAccessToken(),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createProduct(prepareDataForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitarywareProducts', selectedCompanyId] });
      dataSyncManager.notifyChange('sanitarywareProducts');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, prepareDataForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitarywareProducts', selectedCompanyId] });
      dataSyncManager.notifyChange('sanitarywareProducts');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitarywareProducts', selectedCompanyId] });
      dataSyncManager.notifyChange('sanitarywareProducts');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => toggleProductStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitarywareProducts', selectedCompanyId] });
      dataSyncManager.notifyChange('sanitarywareProducts');
    },
  });

  return { 
    sanitarywareProducts, 
    loading, 
    error, 
    fetchSanitarywareProducts, 
    createProduct: createMutation.mutateAsync, 
    updateProduct: updateMutation.mutateAsync, 
    deleteProduct: deleteMutation.mutateAsync,
    toggleProductStatus: toggleStatusMutation.mutateAsync
  };
};
