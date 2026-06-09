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

import { createContext, useContext, useState, useCallback } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => localStorage.getItem('selected_company_id'));

  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const updateAvatar = useCallback((avatarUrl) => {
    setUser(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
  }, []);

  const setCurrentUser = useCallback((userData) => {
    setUser(userData);
    // Auto-set company for regular users
    if (userData && userData.role !== 'super_admin' && userData.companyId) {
      setSelectedCompanyId(userData.companyId);
      localStorage.setItem('selected_company_id', userData.companyId);
    }
  }, []);

  const setSelectedCompany = useCallback((companyId) => {
    setSelectedCompanyId(companyId);
    if (companyId) {
      localStorage.setItem('selected_company_id', companyId);
    } else {
      localStorage.removeItem('selected_company_id');
    }
  }, []);

  const value = {
    user,
    selectedCompanyId,
    setCurrentUser,
    updateUser,
    updateAvatar,
    setSelectedCompany,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    return {
      user: null,
      setCurrentUser: () => {},
      updateUser: () => {},
      updateAvatar: () => {},
    };
  }
  return context;
}




