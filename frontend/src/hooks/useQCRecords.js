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
import { qcService } from '../services/qcService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeData, normalizeQCRecord, prepareDataForAPI } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useQCRecords = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: records = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchQCRecords } = useQuery({
    queryKey: ['qc-records', selectedCompanyId],
    queryFn: async () => {
      const response = await qcService.getAll();
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      return normalizeArray(data, normalizeQCRecord);
    },
    enabled: !!tokenManager.getAccessToken(),
    refetchInterval: 180000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => qcService.create(prepareDataForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-records', selectedCompanyId] });
      dataSyncManager.notifyChange('qc');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => qcService.update(id, prepareDataForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-records', selectedCompanyId] });
      dataSyncManager.notifyChange('qc');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => qcService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-records', selectedCompanyId] });
      dataSyncManager.notifyChange('qc');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => qcService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-records', selectedCompanyId] });
      dataSyncManager.notifyChange('qc');
    },
  });

  return { 
    qcRecords: records, 
    loading, 
    error, 
    fetchQCRecords, 
    createQCRecord: createMutation.mutateAsync, 
    updateQCRecord: updateMutation.mutateAsync, 
    deleteQCRecord: deleteMutation.mutateAsync,
    toggleQCRecordStatus: toggleStatusMutation.mutateAsync
  };
};
