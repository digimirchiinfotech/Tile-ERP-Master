import React, { useState, useEffect, useCallback } from 'react';

// Contexts & Managers
import { UserProvider, useUserContext } from './contexts/UserContext.jsx';
import { authAPI } from './services/authAPI.js';
import { tokenManager } from './utils/tokenManager.js';
import { dataSyncManager } from './services/dataSyncManager.js';
import { invoiceService } from './services/invoiceService.js';
import { orderService } from './services/orderService.js';

// Hooks
import { useActivityTracker } from './hooks/useActivityTracker.js';
import { useSessionManager } from './hooks/useSessionManager.js';
import { useAppNavigation } from './hooks/useAppNavigation.js';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts.js';
import { useLocation, useNavigate } from 'react-router-dom';

// Shared Components
import Layout from './components/shared/Layout.jsx';
import AppRouter from './components/shared/AppRouter.jsx';
import PollingManager from './components/shared/PollingManager.jsx';
import GlobalSearchHandler from './components/shared/GlobalSearchHandler.jsx';
import GlobalErrorBoundary from './components/shared/GlobalErrorBoundary.jsx';
import SessionWarningModal from './components/common/SessionWarningModal.jsx';
import NotificationManager, { showSuccess, showError } from './components/shared/NotificationManager.jsx';
import OfflineBanner from './components/shared/OfflineBanner.jsx';

/**
 * Main Application Component
 * Highly modularized structure for improved maintainability
 */
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  // 1. Session & Activity Management
  const sessionManager = useSessionManager(currentUser?.id, !!currentUser);
  const handleUserActivity = useCallback(() => sessionManager.updateActivity(), [sessionManager]);
  useActivityTracker(handleUserActivity, 1000);

  // 2. Navigation & Routing Logic
  const getDashboardForRole = useCallback((role) => {
    const dashboards = {
      super_admin: 'super-admin-dashboard',
      company_admin: 'dashboard',
      sales_manager: 'dashboard',
      sales_executive: 'dashboard',
      qc: 'qc-management',
      qc_inspector: 'qc-management',
      account: 'account-finance-management',
      purchase_manager: 'order-dashboard',
      inventory_manager: 'inventory-dashboard',
      production_manager: 'production-planning-dashboard',
      administration: 'product-management',
      client: 'client-order-management',
    };
    return dashboards[role] || 'dashboard';
  }, []);

  const { handleNavigate, syncURLWithState } = useAppNavigation(getDashboardForRole);

  let currentView = location.pathname.replace('/', '') || 'login';
  if (currentUser) {
     currentView = location.pathname === '/' || location.pathname === '' ? getDashboardForRole(currentUser.role) : location.pathname.substring(1);
  }
  // Global keyboard shortcuts (Alt+N, Alt+D, Alt+C, etc.)
  useKeyboardShortcuts(handleNavigate, currentUser);

  // 3. Application Initialization & Auth Sync
  const { setCurrentUser: setContextUser } = useUserContext();

  useEffect(() => {
    const initializeApp = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const id = urlParams.get('id');
      const email = urlParams.get('email');
      const token = urlParams.get('token');

      // Handle Reset Password
      if (view === 'reset-password' && email && token) {
        setResetPasswordData({ emailId: email, token });
        return;
      }

      // Handle Session Restore
      const savedUser = localStorage.getItem('current_user');

      let authenticatedUser = null;
      if (savedUser) {
        try {
          authenticatedUser = JSON.parse(savedUser);
          setCurrentUser(authenticatedUser);
          setContextUser(authenticatedUser);

          // Fetch latest profile to ensure permissions are up to date and HTTP-only cookie is valid
          authAPI.getCurrentUser().then(response => {
            const latestUser = response.data || response;
            if (latestUser) {
              localStorage.setItem('current_user', JSON.stringify(latestUser));
              setCurrentUser(latestUser);
              setContextUser(latestUser);
            }
          }).catch(() => {
            // If the HTTP-only cookie is invalid or expired, the request will fail
            // We should clear the user session
            handleLogout();
          });
        } catch (error) {
          // Fail gracefully if session is corrupted
          handleLogout();
        }
      }

      // Handle Deep Links
      if (authenticatedUser && currentView && currentView !== 'login') {
        if (id) {
          try {
            let recordData = null;
            if (currentView.includes('invoice')) {
              const resp = await invoiceService.getById(id);
              recordData = { invoice: resp.data?.data || resp.data };
            } else if (currentView.includes('order')) {
              const resp = await orderService.getById(id);
              recordData = { order: resp.data?.data || resp.data };
            }
            if (recordData) sessionStorage.setItem('navigationData', JSON.stringify(recordData));
          } catch (e) { }
        }
      } else if (authenticatedUser && (location.pathname === '/' || location.pathname === '')) {
         navigate(`/${getDashboardForRole(authenticatedUser.role)}`, { replace: true });
      }
    };
    initializeApp();
  }, [setContextUser]);

  // Sync state to Context
  useEffect(() => { setContextUser(currentUser); }, [currentUser, setContextUser]);

  // Listen for Global Navigate (CustomEvents dispatched by non-React code if any)
  useEffect(() => {
    const handleGlobalNavigate = (e) => {
      const { page, ...data } = e.detail || {};
      if (page) handleNavigate(page, data);
    };

    window.addEventListener('navigate', handleGlobalNavigate);
    return () => {
      window.removeEventListener('navigate', handleGlobalNavigate);
    };
  }, [handleNavigate]);

  // Auth Logout Listener
  useEffect(() => {
    const handleAuthLogout = () => {
      dataSyncManager.stopAllPolling();
      setCurrentUser(null);
      tokenManager.clearTokens();
      localStorage.removeItem('current_user');
      navigate('/', { replace: true });
      showError('Your session has expired. Please log in again.');
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  // Global API Loading Listener
  useEffect(() => {
    let timeout;
    const handleLoading = (e) => {
      if (e.detail.isLoading) {
        setIsGlobalLoading(true);
      } else {
        timeout = setTimeout(() => setIsGlobalLoading(false), 300);
      }
    };
    window.addEventListener('api:loading', handleLoading);
    return () => {
      window.removeEventListener('api:loading', handleLoading);
      clearTimeout(timeout);
    };
  }, []);

  const handleLogin = (userData) => {
    const userRole = userData.role || 'client';
    const enhancedUser = { ...userData, role: userRole, loginTime: new Date().toISOString() };
    setCurrentUser(enhancedUser);
    tokenManager.setAccessToken(userData.token);
    tokenManager.setRefreshToken(userData.refreshToken);
    tokenManager.setUser(enhancedUser);
    handleNavigate(getDashboardForRole(userRole));
    showSuccess('Login successful!');
  };

  const handleLogout = () => {
    dataSyncManager.stopAllPolling();
    setCurrentUser(null);
    tokenManager.clearTokens();
    localStorage.removeItem('current_user');
    navigate('/', { replace: true });
  };

  return (
    <GlobalErrorBoundary>
      {isGlobalLoading && (
        <div className="global-progress-bar">
          <div className="progress-bar-value"></div>
        </div>
      )}
      <OfflineBanner />
      <PollingManager currentUser={currentUser}>
        {({ loading, ...hooks }) => (
          <GlobalSearchHandler
            onSearchComplete={() => handleNavigate('search-results')}
            syncURLWithState={syncURLWithState}
          >
            {({ handleSearch, searchResults, searchQuery, setSearchResults }) => (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                onNavigate={(view, data) => handleNavigate(view, data, true, hooks)}
                currentView={currentView}
                onSearch={handleSearch}
              >
                {loading && currentView === 'dashboard' ? (
                  <div className="d-flex justify-content-center p-5"><div className="spinner-border text-primary" /></div>
                ) : (
                  <AppRouter
                    currentView={currentView}
                    currentUser={currentUser}
                    handleNavigate={(view, data) => handleNavigate(view, data, true, hooks)}
                    handleLogin={handleLogin}
                    searchResults={searchResults}
                    searchQuery={searchQuery}
                    setSearchResults={setSearchResults}
                    showForgotPassword={showForgotPassword}
                    setShowForgotPassword={setShowForgotPassword}
                    resetPasswordData={resetPasswordData}
                    setResetPasswordData={setResetPasswordData}
                    getDashboardForRole={getDashboardForRole}
                    showSuccess={showSuccess}
                    showError={showError}
                  />
                )}

                <SessionWarningModal
                  show={showSessionWarning}
                  timeRemaining={sessionTimeRemaining}
                  onStayLoggedIn={() => setShowSessionWarning(false)}
                  onLogout={() => { setShowSessionWarning(false); handleLogout(); }}
                />
              </Layout>
            )}
          </GlobalSearchHandler>
        )}
      </PollingManager>
      <NotificationManager />
      <style>{`
        .global-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: transparent;
          z-index: 9999;
        }
        .progress-bar-value {
          width: 30%;
          height: 100%;
          background: #0d6efd;
          animation: global-progress 1.5s infinite linear;
          box-shadow: 0 0 10px rgba(13, 110, 253, 0.5);
        }
        @keyframes global-progress {
          0% { margin-left: -30%; width: 30%; }
          50% { margin-left: 30%; width: 50%; }
          100% { margin-left: 100%; width: 30%; }
        }
      `}</style>
    </GlobalErrorBoundary>
  );
}

export default App;

