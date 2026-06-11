import React, { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';

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

// Shared Components
import Layout from './components/shared/Layout.jsx';
import AppRouter from './components/shared/AppRouter.jsx';
import PollingManager from './components/shared/PollingManager.jsx';
import GlobalSearchHandler from './components/shared/GlobalSearchHandler.jsx';
import GlobalErrorBoundary from './components/shared/GlobalErrorBoundary.jsx';
import SessionWarningModal from './components/common/SessionWarningModal.jsx';
import NotificationManager, { showSuccess, showError } from './components/shared/NotificationManager.jsx';

/**
 * Main Application Component
 * Highly modularized structure for improved maintainability
 */
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);

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

  const { handleNavigate, syncURLWithState } = useAppNavigation(setCurrentView, getDashboardForRole);

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
      const accessToken = tokenManager.getAccessToken();

      let authenticatedUser = null;
      if (savedUser && accessToken && !tokenManager.isTokenExpired(accessToken)) {
        try {
          authenticatedUser = JSON.parse(savedUser);
          setCurrentUser(authenticatedUser);
          setContextUser(authenticatedUser);

          // Fetch latest profile to ensure permissions are up to date
          authAPI.getCurrentUser().then(response => {
            const latestUser = response.data || response;
            if (latestUser) {
              localStorage.setItem('current_user', JSON.stringify(latestUser));
              setCurrentUser(latestUser);
              setContextUser(latestUser);
            }
          }).catch(() => { }); // Silent sync failure
        } catch (error) {
          // Fail gracefully if session is corrupted
        }
      }

      // Handle Deep Links
      if (authenticatedUser && view) {
        if (id) {
          try {
            let recordData = null;
            if (view.includes('invoice')) {
              const resp = await invoiceService.getById(id);
              recordData = { invoice: resp.data?.data || resp.data };
            } else if (view.includes('order')) {
              const resp = await orderService.getById(id);
              recordData = { order: resp.data?.data || resp.data };
            }
            if (recordData) sessionStorage.setItem('navigationData', JSON.stringify(recordData));
          } catch (e) { }
        }
        setTimeout(() => handleNavigate(view, id ? { id } : {}, false), 100);
      } else if (authenticatedUser) {
        setCurrentView(getDashboardForRole(authenticatedUser.role));
      }
    };
    initializeApp();
  }, [handleNavigate, setContextUser]);

  // Sync state to Context
  useEffect(() => { setContextUser(currentUser); }, [currentUser, setContextUser]);

  // Listen for PopState & Global Navigate
  useEffect(() => {
    const handlePopState = (event) => {
      // Prefer the state object pushed by pushState for reliable back navigation
      const state = event?.state;
      let view, id;

      if (state && state.view) {
        view = state.view;
        id = state.id;
      } else {
        // Fallback to URL params
        const urlParams = new URLSearchParams(window.location.search);
        view = urlParams.get('view') || (currentUser ? getDashboardForRole(currentUser.role) : 'dashboard');
        id = urlParams.get('id');
      }

      // Clear stale navigation data on back button press
      sessionStorage.removeItem('navigationData');

      // Only pass id if it actually exists - prevents {id: null} from corrupting data
      const navData = id ? { id } : {};
      handleNavigate(view, navData, false);
    };

    const handleGlobalNavigate = (e) => {
      const { page, ...data } = e.detail || {};
      if (page) handleNavigate(page, data);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('navigate', handleGlobalNavigate);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('navigate', handleGlobalNavigate);
    };
  }, [currentUser, handleNavigate, getDashboardForRole]);

  // Auth Logout Listener
  useEffect(() => {
    const handleAuthLogout = () => {
      dataSyncManager.stopAllPolling();
      setCurrentUser(null);
      setCurrentView('dashboard');
      tokenManager.clearTokens();
      localStorage.removeItem('current_user');
      showError('Your session has expired. Please log in again.');
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
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
    setCurrentView('login');
    tokenManager.clearTokens();
    localStorage.removeItem('current_user');
    window.history.replaceState({}, '', '/');
  };

  return (
    <GlobalErrorBoundary>
      <PollingManager currentUser={currentUser}>
        {({ loading, ...hooks }) => (
          <GlobalSearchHandler
            onSearchComplete={() => setCurrentView('search-results')}
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
                    setCurrentView={setCurrentView}
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
    </GlobalErrorBoundary>
  );
}

export default App;
