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
import UserService from '../services/userService';
import { tokenManager } from '../utils/tokenManager';
import { normalizeArray, normalizeUser } from '../utils/dataTransformers';
import { useUserContext } from '../contexts/UserContext';
import { dataSyncManager } from '../services/dataSyncManager';

const EMPTY_ARRAY = [];

export const useUsers = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useUserContext();

  const { data: users = EMPTY_ARRAY, isLoading: loading, error, refetch: fetchUsers } = useQuery({
    queryKey: ['users', selectedCompanyId],
    queryFn: async () => {
      const response = await UserService.getAllUsers();
      const responseData = response?.data?.data || response?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.items || responseData.data || []);
      return normalizeArray(data, normalizeUser);
    },
    enabled: !!tokenManager.getAccessToken(),
    refetchInterval: 60000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => UserService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', selectedCompanyId] });
      dataSyncManager.notifyChange('users');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => UserService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', selectedCompanyId] });
      dataSyncManager.notifyChange('users');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => UserService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', selectedCompanyId] });
      dataSyncManager.notifyChange('users');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => UserService.toggleUserStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', selectedCompanyId] });
      dataSyncManager.notifyChange('users');
    },
  });

  return { 
    users, 
    loading, 
    error, 
    fetchUsers, 
    createUser: createMutation.mutateAsync, 
    updateUser: updateMutation.mutateAsync, 
    deleteUser: deleteMutation.mutateAsync,
    toggleUserStatus: toggleStatusMutation.mutateAsync
  };
};

