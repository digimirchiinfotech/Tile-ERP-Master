import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext.jsx';
import { tokenManager } from '../../utils/tokenManager.js';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useUserContext();
  const location = useLocation();
  const isAuthenticated = tokenManager.isAuthenticated();

  if (!isAuthenticated || !currentUser) {
    // Redirect to login but save the attempted location
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has permission
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(currentUser.role) || currentUser.role === 'super_admin';
    if (!hasRole) {
      // User is authenticated but doesn't have the right role
      // Redirect to their default dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
