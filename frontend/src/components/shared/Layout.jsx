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

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import ProperTopBar from './ProperTopBar.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import Breadcrumbs from '../layout/Breadcrumbs.jsx';
import api from '../../services/api.js';
import GlobalWorkflowTracker from './GlobalWorkflowTracker.jsx';
import CommandPalette from './CommandPalette.jsx';
import KeyboardShortcutsModal from './KeyboardShortcutsModal.jsx';

/**
 * Enhanced Layout Component
 * Features:
 * - Responsive sidebar with mobile support
 * - Professional top bar with search and notifications
 * - Error boundary protection
 * - Smooth animations and transitions
 * - Accessibility improvements
 * */
function Layout({
  children,
  currentView,
  currentUser,
  onNavigate,
  onLogout,
  onSearch,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

  // Handle window resize to update isMobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 992;
      setIsMobile(mobile);
      // Auto-close mobile sidebar when resizing to desktop
      if (!mobile) setSidebarVisible(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Toggle sidebar for desktop (collapse) and mobile (show/hide)
   */
  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  /**
   * Close sidebar (mobile only)
   */
  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  /**
   * Handle navigation with sidebar auto-close on mobile
   */
  const handleNavigateWithSidebarClose = (view, data = {}) => {
    setIsLoading(true);
    onNavigate(view, data);

    // Auto-close sidebar on mobile after navigation
    if (isMobile) {
      closeSidebar();
    }

    // Reset loading state
    setTimeout(() => setIsLoading(false), 300);
  };


  return (
    <ErrorBoundary>
      {/* Fixed Top Bar */}
      {currentUser && (
        <ProperTopBar
          currentUser={currentUser}
          currentView={currentView}
          onToggleSidebar={toggleSidebar}
          onLogout={onLogout}
          onNavigate={handleNavigateWithSidebarClose}
          onSearch={onSearch}
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
        />
      )}

      {/* Sidebar Overlay for Mobile */}
      {sidebarVisible && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              closeSidebar();
            }
          }}
        />
      )}

      {/* Enhanced Sidebar - Fixed Position */}
      {currentUser && (
        <Sidebar
          currentView={currentView}
          currentUser={currentUser}
          onNavigate={handleNavigateWithSidebarClose}
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
          visible={sidebarVisible}
          onToggleCollapse={toggleSidebar}
          onClose={closeSidebar}
          isMobile={isMobile}
        />
      )}

      <div className={`layout-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${!currentUser ? 'no-sidebar' : ''}`}>
        {/* Main Content Area */}
        <div
          className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''
            } ${!currentUser ? 'no-sidebar' : ''}`}
        >

          {/* Content Area with Error Boundary */}
          <div className="content-area">
            {currentUser && <Breadcrumbs currentView={currentView} currentUser={currentUser} onNavigate={onNavigate} />}
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>

          <footer className="app-footer">
            <div className="footer-content d-flex justify-content-between align-items-center w-100" style={{ whiteSpace: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <p className="footer-text mb-0 me-3">
                © {new Date().getFullYear()} Tile Exporter. <span className="d-none d-md-inline">All rights reserved. ||</span> Developed by <span className="brand-name">DigiMirchi</span>
              </p>
              <div className="footer-links d-flex gap-3" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span className="footer-link-item small text-muted" style={{ cursor: 'pointer' }} onClick={() => onNavigate('help-center')}>Privacy</span>
                <span className="footer-link-item small text-muted" style={{ cursor: 'pointer' }} onClick={() => onNavigate('help-center')}>Terms</span>
              </div>
            </div>
          </footer>
        </div>

        <style>{`
          .layout-container.no-sidebar {
            margin-left: 0;
            width: 100%;
          }

          .layout-container {
            display: flex;
            flex-direction: row;
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            bottom: 0;
            margin-left: 280px;
            width: calc(100% - 280px);
            overflow: hidden;
            background: #f1f5f9;
            transition: all 0.3s ease;
          }

          .layout-container.sidebar-collapsed {
            margin-left: 70px;
            width: calc(100% - 70px);
          }

          .sidebar-overlay {
            position: fixed;
            top: 0; /* Cover the whole screen */
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            z-index: 1040; /* Just below Sidebar which is 1050/1060 */
            backdrop-filter: blur(4px);
          }

          .main-content {
            display: flex;
            flex-direction: column;
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #f1f5f9;
            padding-bottom: 40px; /* Space for the fixed footer */
          }

          @media (max-width: 992px) {
            .layout-container {
              margin-left: 0 !important;
              width: 100% !important;
              top: 56px;
              bottom: 0;
              height: auto;
            }

            .content-area {
              padding: 0.75rem 0.75rem;
              width: 100%;
            }
          }

          .content-area {
            min-height: 0;
            flex: 1;
            padding: 1.5rem 2rem;
            padding-bottom: 60px; /* Prevent fixed footer from covering last content */
            background: #f1f5f9;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .app-footer {
            position: fixed;
            bottom: 0;
            left: 280px;
            right: 0;
            background: var(--app-bg-secondary, #f8f9fa);
            border-top: 1px solid var(--app-border-color, #dee2e6);
            padding: 0.5rem 2rem;
            z-index: 1000;
            transition: all 0.3s ease;
          }

          .sidebar-collapsed .app-footer {
            left: 70px;
          }

          @media (max-width: 992px) {
            .app-footer {
              left: 0;
              padding: 0.5rem 1rem;
            }
          }

          .footer-content {
            text-align: left;
            color: var(--app-text-secondary, #6c757d);
          }
          .footer-content::-webkit-scrollbar {
            display: none;
          }

          .footer-text {
            margin: 0;
            font-size: 0.8rem;
          }

          .brand-name {
            font-weight: 600;
            color: var(--app-primary, #0d6efd);
          }

          @media (max-width: 576px) {
            .content-area {
              padding: 0.75rem 0.5rem;
            }
          }

          /* Smooth scrolling */
          .content-area {
            scroll-behavior: smooth;
          }

          /* Custom scrollbar */
          .content-area::-webkit-scrollbar {
            width: 6px;
          }

          .content-area::-webkit-scrollbar-track {
            background: #f1f5f9;
          }

          .content-area::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }

          .content-area::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          /* Focus management for accessibility */
          .layout-container:focus-within .sidebar-overlay {
            outline: 2px solid #3b82f6;
            outline-offset: -2px;
          }
        `}</style>
      </div>
      {currentUser && <GlobalWorkflowTracker />}
      {currentUser && (
        <CommandPalette 
          onNavigate={handleNavigateWithSidebarClose} 
          onSearch={onSearch} 
          currentUser={currentUser} 
        />
      )}
      {currentUser && <KeyboardShortcutsModal />}
    </ErrorBoundary>
  );
}

export default Layout;




