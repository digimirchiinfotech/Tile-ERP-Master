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
import { leadService } from '../services/leadService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeLead } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useLeads = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: leads = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchLeads } = useQuery({
    queryKey: ['leads', selectedCompanyId],
    queryFn: async () => {
      const response = await leadService.getAll();
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      return normalizeArray(data, normalizeLead);
    },
    enabled: !!tokenManager.getAccessToken(),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => leadService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', selectedCompanyId] });
      dataSyncManager.notifyChange('leads');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => leadService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', selectedCompanyId] });
      dataSyncManager.notifyChange('leads');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leadService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', selectedCompanyId] });
      dataSyncManager.notifyChange('leads');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => leadService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', selectedCompanyId] });
      dataSyncManager.notifyChange('leads');
    },
  });

  const convertToClientMutation = useMutation({
    mutationFn: ({ id, data }) => leadService.convertToClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      dataSyncManager.notifyChange('leads');
      dataSyncManager.notifyChange('clients');
    },
  });

  return { 
    leads, 
    loading, 
    error, 
    fetchLeads, 
    createLead: createMutation.mutateAsync, 
    updateLead: updateMutation.mutateAsync, 
    deleteLead: deleteMutation.mutateAsync,
    toggleLeadStatus: toggleStatusMutation.mutateAsync,
    convertToClient: convertToClientMutation.mutateAsync
  };
};

