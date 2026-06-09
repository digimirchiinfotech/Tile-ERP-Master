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

import { useState, useEffect } from 'react';
import { tokenManager } from '../utils/tokenManager';

export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return tokenManager.isAuthenticated();
  });

  useEffect(() => {
    // Check initial authentication state
    setIsAuthenticated(tokenManager.isAuthenticated());

    // Listen for authentication changes
    const handleAuthChange = (event) => {
      if (event.detail?.reason === 'No refresh token' || event.detail?.reason === 'Token refresh failed') {
        setIsAuthenticated(false);
      }
    };

    const handleAuthSuccess = () => {
      setIsAuthenticated(true);
    };

    window.addEventListener('auth:logout', handleAuthChange);
    window.addEventListener('auth:login', handleAuthSuccess);

    return () => {
      window.removeEventListener('auth:logout', handleAuthChange);
      window.removeEventListener('auth:login', handleAuthSuccess);
    };
  }, []);

  return isAuthenticated;
};
