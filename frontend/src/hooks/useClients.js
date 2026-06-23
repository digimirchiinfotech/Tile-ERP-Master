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
import { clientService } from '../services/clientService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeClient } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useClients = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: clients = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchClients } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: async () => {
      const response = await clientService.getAll();
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      return normalizeArray(data, normalizeClient);
    },
    enabled: !!tokenManager.getAccessToken(),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      dataSyncManager.notifyChange('clients');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      dataSyncManager.notifyChange('clients');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      dataSyncManager.notifyChange('clients');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => clientService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      dataSyncManager.notifyChange('clients');
    },
  });

  return { 
    clients, 
    loading, 
    error, 
    fetchClients, 
    createClient: createMutation.mutateAsync, 
    updateClient: updateMutation.mutateAsync, 
    deleteClient: deleteMutation.mutateAsync,
    toggleClientStatus: toggleStatusMutation.mutateAsync
  };
};

