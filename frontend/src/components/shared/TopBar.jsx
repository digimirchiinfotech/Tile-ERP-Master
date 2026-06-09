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
import {
  Navbar,
  Container,
  Nav,
  Form,
  Button,
  Dropdown,
  Badge,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { Menu, Search, Bell, MessageSquare, User, LogOut, Settings, HelpCircle, X, Keyboard, Play, Check } from 'lucide-react';
import QuickActions from './QuickActions.jsx';
import KeyboardShortcuts, { useKeyboardShortcuts } from './KeyboardShortcuts.jsx';
import GuidedTour, { useGuidedTour } from './GuidedTour.jsx';
import { useUserContext } from '../../contexts/UserContext.jsx';

/**
 * Professional Top Bar Component
 * Features:
 * - Enhanced search with real-time suggestions
 * - Professional notification system
 * - Message center with priority indicators
 * - User profile dropdown with role display
 * - Responsive design with mobile optimization
 * - Quick actions integration
 * - Comprehensive accessibility features
 * - Tooltips on all interactive elements
 */
function TopBar({
  currentUser,
  onToggleSidebar,
  onLogout,
  notifications = [],
  messages = [],
  onNavigate,
  onSearch,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // UX features
  const { shortcutsVisible, setShortcutsVisible } = useKeyboardShortcuts();
  const { showTour, startTour, hideTour } = useGuidedTour(currentUser);
  
  // User context for real-time avatar updates
  const { user: contextUser } = useUserContext();
  const displayAvatarUrl = contextUser?.avatar_url || currentUser?.avatar_url;

  /**
   * Detect mobile screen size for responsive placeholder text
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 576);
    };
    
    // Check on mount
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * Handle search form submission
   */
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  /**
   * Clear search input
   */
  const clearSearch = () => {
    setSearchQuery('');
    setSearchFocused(false);
  };

  /**
   * Get unread counts
   */
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const unreadMessages = messages.filter((m) => !m.read).length;

  /**
   * Get role display name with proper formatting
   */
  const getRoleDisplayName = (role) => {
    const roleNames = {
      super_admin: 'Super Admin',
      company_admin: 'Company Admin',
      sales_manager: 'Sales Manager',
      sales_executive: 'Sales Executive',
      administration: 'Administration',
      qc: 'QC Manager',
      account: 'Account Manager',
      client: 'Client',
      purchase: 'Purchase Manager',
    };
    return (
      roleNames[role] ||
      role?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  /**
   * Get appropriate dashboard based on user role
   */
  const getDashboardForRole = (role) => {
    const dashboards = {
      super_admin: 'super-admin-dashboard',
      company_admin: 'dashboard',
      sales_manager: 'dashboard',
      sales_executive: 'dashboard',
      qc: 'qc-management',
      account: 'account-finance-management',
      purchase: 'order-dashboard',
      administration: 'product-management',
      client: 'client-order-management',
    };
    return dashboards[role] || 'dashboard';
  };

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = (type) => {
    const icons = {
      order: '📦',
      qc: '🔍',
      payment: '💰',
      approval: '✅',
      system: '⚙️',
    };
    return icons[type] || '📢';
  };

  /**
   * Get message priority color
   */
  const getMessagePriorityColor = (priority) => {
    const colors = {
      high: 'danger',
      medium: 'warning',
      normal: 'info',
      low: 'secondary',
    };
    return colors[priority] || 'info';
  };

  return (
    <Navbar bg="white" className="topbar border-bottom shadow-sm">
      <Container fluid>
        {/* Mobile Menu Toggle with Tooltip */}
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="mobile-menu-tooltip">Toggle Navigation Menu</Tooltip>}
        >
          <Button
            variant="outline"
            className="d-lg-none mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </Button>
        </OverlayTrigger>

        {/* Company Logo and Name - Clickable to go to Dashboard - Hidden on mobile, shown on tablet and desktop */}
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="dashboard-tooltip">Go to Dashboard</Tooltip>}
        >
          <div 
            className="company-branding d-none d-sm-flex align-items-center"
            onClick={() => onNavigate(getDashboardForRole(currentUser?.role))}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate(getDashboardForRole(currentUser?.role));
              }
            }}
            aria-label="Go to Dashboard"
          >
            <div className="company-logo">
              <svg
                width="42"
                height="42"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="100" height="100" rx="20" fill="#2563eb" />
                <path
                  d="M30 70V30h15c8 0 12 4 12 10 0 4-2 7-5 8 4 1 7 4 7 9 0 7-4 13-13 13H30zm10-24h3c3 0 5-2 5-4s-2-4-5-4h-3v8zm0 16h4c3 0 6-2 6-5s-3-5-6-5h-4v10z"
                  fill="white"
                />
              </svg>
            </div>
            <div className="company-info ms-3">
              <h5 className="company-name mb-0">Business ERP</h5>
              <small className="company-tagline text-muted">Enterprise Solution</small>
            </div>
          </div>
        </OverlayTrigger>

        {/* Enhanced Search Form - Responsive */}
        <Form
          className={`search-form me-auto ${
            searchFocused ? 'search-focused' : ''
          }`}
          onSubmit={handleSearch}
          role="search"
        >
          <InputGroup className="search-input-group">
            <Form.Control
              type="text"
              placeholder={isMobile ? "Search..." : "Search orders, clients, products, and more..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="search-input"
              aria-label="Search across all modules"
            />
            {searchQuery && (
              <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip id="clear-search-tooltip">Clear Search</Tooltip>}
              >
                <Button
                  variant="link"
                  className="search-clear-btn"
                  onClick={clearSearch}
                  type="button"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </Button>
              </OverlayTrigger>
            )}
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="search-tooltip">Search</Tooltip>}
            >
              <Button
                variant="primary"
                type="submit"
                className="search-submit-btn d-none d-sm-inline-flex"
                disabled={!searchQuery.trim()}
                aria-label="Submit search"
              >
                <Search size={16} />
              </Button>
            </OverlayTrigger>
          </InputGroup>
        </Form>

        {/* Right Side Actions - Responsive */}
        <Nav className="align-items-center action-buttons-group gap-2 gap-md-3">
          {/* Quick Actions with Divider - Hidden on mobile */}
          <div className="action-item quick-actions d-none d-lg-block">
            <QuickActions currentUser={currentUser} onNavigate={onNavigate} />
          </div>

          {/* Divider - Hidden on mobile */}
          <div className="action-divider d-none d-lg-block"></div>

          {/* Enhanced Messages with Tooltip */}
          <div className="action-item">
            <OverlayTrigger
              placement="bottom"
              overlay={
                <Tooltip id="messages-tooltip">
                  {unreadMessages > 0 
                    ? `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}`
                    : 'Messages'}
                </Tooltip>
              }
            >
              <Dropdown
                show={showMessages}
                onToggle={setShowMessages}
              >
                <Dropdown.Toggle
                  variant="link"
                  className="message-toggle action-btn"
                  id="messages-dropdown"
                  aria-label={`Messages (${unreadMessages} unread)`}
                >
                  <div className="message-icon-wrapper">
                    <MessageSquare size={20} className="icon-primary" />
                    {unreadMessages > 0 && (
                      <Badge bg="primary" className="message-badge">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </Badge>
                    )}
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu align="end" className="message-menu">
                  <Dropdown.Header className="message-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="header-title">Messages</span>
                      <Badge bg="primary" className="message-count">
                        {unreadMessages} unread
                      </Badge>
                    </div>
                  </Dropdown.Header>

                  <div className="message-list">
                    {messages.length > 0 ? (
                      messages.slice(0, 5).map((message) => (
                        <Dropdown.Item
                          key={message.id}
                          className={`message-item ${
                            !message.read ? 'unread' : ''
                          }`}
                        >
                          <div className="message-content">
                            <div className="message-header-info">
                              <h6 className="message-subject">{message.subject}</h6>
                              <Badge
                                bg={getMessagePriorityColor(message.priority)}
                                size="sm"
                                className="priority-badge"
                              >
                                {message.priority}
                              </Badge>
                            </div>
                            <p className="message-from">From: {message.from}</p>
                            <small className="message-time">{message.time}</small>
                          </div>
                        </Dropdown.Item>
                      ))
                    ) : (
                      <Dropdown.Item disabled className="text-center py-3">
                        <div className="empty-state">
                          <MessageSquare size={24} className="text-muted mb-2" />
                          <p className="mb-0">No messages</p>
                        </div>
                      </Dropdown.Item>
                    )}
                  </div>

                  <Dropdown.Divider />
                  <Dropdown.Item
                    onClick={() => onNavigate('messages')}
                    className="text-center message-footer"
                  >
                    <Button variant="link" size="sm" className="p-0">
                      View All Messages
                    </Button>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </OverlayTrigger>
          </div>

          {/* Divider */}
          <div className="action-divider"></div>

          {/* Enhanced User Menu with Tooltip */}
          <div className="action-item">
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="user-menu-tooltip">Account & Settings</Tooltip>}
            >
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  className="user-toggle action-btn"
                  id="user-dropdown"
                  aria-label="User menu"
                >
                  <div className="user-info-wrapper">
                    <div className="user-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {displayAvatarUrl ? (
                        <img
                          src={displayAvatarUrl}
                          alt="User Avatar"
                          onError={(e) => { e.target.style.display = 'none'; }}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #e5e7eb'
                          }}
                        />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} style={{ color: '#6b7280' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu className="user-menu">
                  <Dropdown.Header>
                    <div className="d-md-none">
                      <div className="fw-medium">{currentUser?.name}</div>
                      <small className="text-muted">
                        {getRoleDisplayName(currentUser?.role)}
                      </small>
                    </div>
                  </Dropdown.Header>

                  <Dropdown.Item 
                    onClick={() => onNavigate('profile-settings')}
                    aria-label="Profile Settings"
                  >
                    <User size={16} className="me-2" />
                    Profile Settings
                  </Dropdown.Item>

                  <Dropdown.Item 
                    onClick={() => onNavigate('support')}
                    aria-label="Help and Support"
                  >
                    <HelpCircle size={16} className="me-2" />
                    Help & Support
                  </Dropdown.Item>

                  <Dropdown.Item 
                    onClick={() => startTour()}
                    aria-label="Take a Tour"
                  >
                    <Play size={16} className="me-2" />
                    Take a Tour
                  </Dropdown.Item>

                  <Dropdown.Item 
                    onClick={() => setShortcutsVisible(true)}
                    aria-label="Keyboard Shortcuts"
                  >
                    <Keyboard size={16} className="me-2" />
                    Keyboard Shortcuts
                  </Dropdown.Item>

                  <Dropdown.Divider />

                  <Dropdown.Item
                    onClick={onLogout}
                    className="text-danger logout-item"
                    aria-label="Logout"
                  >
                    <LogOut size={16} className="me-2" />
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </OverlayTrigger>
          </div>
        </Nav>
      </Container>

      <style>{`
        .topbar {
          height: 72px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1020;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          backdrop-filter: blur(15px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          height: 44px;
          min-width: 44px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          margin-right: 12px;
          transition: all 200ms ease;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-menu-btn:hover {
          border-color: #3b82f6;
          background: #eff6ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .mobile-menu-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          border-color: #3b82f6;
        }

        .mobile-menu-btn:active {
          transform: translateY(0);
        }

        /* Company Branding - More Prominent */
        .company-branding {
          padding: 8px 16px;
          border-radius: 8px;
          margin-right: 16px;
          transition: all 200ms ease;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border: 1px solid transparent;
        }

        .company-branding:hover {
          transform: scale(1.02);
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
        }

        .company-branding:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .company-branding:active {
          transform: scale(0.98);
        }

        .company-logo {
          filter: drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3));
        }

        .company-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: -0.02em;
        }

        .company-tagline {
          font-size: 0.7rem;
          color: #6b7280;
          font-weight: 500;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        /* Enhanced Search Form */
        .search-form {
          flex: 1 1 auto;
          min-width: 120px;
          max-width: 480px;
          width: 100%;
          transition: all 0.3s ease;
          margin: 0 auto;
        }

        .search-form.search-focused {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
        }

        .search-input-group {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 2px solid transparent;
          background: #ffffff;
        }

        .search-form.search-focused .search-input-group {
          border-color: #3b82f6;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
        }

        .search-input {
          border: none;
          padding: 10px 16px;
          font-size: 0.95rem;
          background: transparent;
          font-weight: 500;
          color: #1f2937;
          height: 40px;
        }

        .search-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .search-input:focus {
          box-shadow: none;
          border-color: transparent;
          outline: none;
        }

        .search-clear-btn {
          border: none;
          background: none;
          color: #6b7280;
          padding: 8px;
          border-radius: 4px;
          transition: all 200ms ease;
          height: 40px;
        }

        .search-clear-btn:hover {
          color: #1f2937;
          background: #f3f4f6;
        }

        .search-clear-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        .search-submit-btn {
          border: none;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 10px 16px;
          transition: all 200ms ease;
          border-radius: 0;
          height: 40px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .search-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: scale(1.02);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
        }

        .search-submit-btn:focus:not(:disabled) {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        .search-submit-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        /* Action Buttons Group */
        .action-buttons-group {
          gap: 0;
          flex-wrap: nowrap;
          flex-shrink: 1;
          margin-left: auto;
          display: flex;
          align-items: center;
        }

        .action-item {
          display: flex;
          align-items: center;
          margin: 0 6px;
        }

        .action-divider {
          width: 1px;
          height: 32px;
          background: linear-gradient(180deg, transparent 0%, #e5e7eb 50%, transparent 100%);
          margin: 0 6px;
        }

        /* Action Buttons - Consistent Styling */
        .action-btn {
          border: none;
          background: #ffffff;
          padding: 10px;
          border-radius: 8px;
          transition: all 200ms ease;
          height: 40px;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }

        .action-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .action-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          border-color: #3b82f6;
        }

        .action-btn:active {
          transform: translateY(0);
        }

        .action-btn::after {
          display: none !important;
        }

        /* Icon Colors */
        .icon-primary {
          color: #475569;
          transition: color 200ms ease;
        }

        .action-btn:hover .icon-primary {
          color: #1e293b;
        }

        /* Badge Positioning */
        .notification-icon-wrapper,
        .message-icon-wrapper {
          position: relative;
          display: inline-block;
        }

        .notification-badge,
        .message-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          font-size: 0.65rem;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        /* Dropdown Menus */
        .notification-menu,
        .message-menu,
        .user-menu {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          padding: 0;
          min-width: 340px;
          max-height: 420px;
          overflow: hidden;
          margin-top: 8px;
        }

        .notification-header,
        .message-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 16px;
          margin: 0;
        }

        .header-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.95rem;
        }

        .notification-count,
        .message-count {
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 12px;
        }

        .notification-list,
        .message-list {
          max-height: 320px;
          overflow-y: auto;
          padding: 4px 0;
        }

        .notification-item,
        .message-item {
          padding: 12px 16px;
          border: none;
          transition: background 200ms ease;
          margin: 2px 4px;
          border-radius: 6px;
        }

        .notification-item:hover,
        .message-item:hover {
          background: #f8fafc;
        }

        .notification-item:focus,
        .message-item:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        .notification-item.unread,
        .message-item.unread {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left: 3px solid #3b82f6;
        }

        .notification-content,
        .message-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .notification-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .notification-text,
        .message-text {
          flex: 1;
          min-width: 0;
        }

        .notification-title,
        .message-subject {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: #1f2937;
        }

        .notification-message {
          font-size: 0.85rem;
          color: #6b7280;
          margin-bottom: 4px;
          line-height: 1.5;
        }

        .notification-time,
        .message-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .message-header-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 4px;
        }

        .message-from {
          font-size: 0.85rem;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .priority-badge {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .notification-footer,
        .message-footer {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 10px 16px;
          margin: 0;
        }

        .notification-footer .btn,
        .message-footer .btn {
          font-weight: 600;
          color: #3b82f6;
          transition: color 200ms ease;
        }

        .notification-footer .btn:hover,
        .message-footer .btn:hover {
          color: #2563eb;
        }

        /* User Menu */
        .user-info-wrapper {
          display: flex;
          align-items: center;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          transition: all 200ms ease;
        }

        .action-btn:hover .user-avatar {
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          transform: scale(1.05);
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.2;
          margin-bottom: 2px;
        }

        .user-role {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1;
          font-weight: 500;
        }

        .user-menu {
          min-width: 220px;
        }

        .user-menu .dropdown-item {
          padding: 10px 16px;
          transition: all 200ms ease;
          border-radius: 6px;
          margin: 2px 4px;
        }

        .user-menu .dropdown-item:hover {
          background: #f8fafc;
        }

        .user-menu .dropdown-item:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        .logout-item {
          color: #dc2626 !important;
        }

        .logout-item:hover {
          background: rgba(220, 38, 38, 0.1) !important;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #9ca3af;
          padding: 20px 0;
        }

        /* Custom scrollbar for notification/message lists */
        .notification-list::-webkit-scrollbar,
        .message-list::-webkit-scrollbar {
          width: 6px;
        }

        .notification-list::-webkit-scrollbar-track,
        .message-list::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .notification-list::-webkit-scrollbar-thumb,
        .message-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .notification-list::-webkit-scrollbar-thumb:hover,
        .message-list::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Animation for badges */
        .notification-badge,
        .message-badge {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1;
          }
          50% { 
            transform: scale(1.05); 
            opacity: 0.9;
          }
        }

        /* Tooltip Styling */
        .tooltip {
          font-size: 0.85rem;
        }

        .tooltip-inner {
          background: #1f2937;
          border-radius: 6px;
          padding: 6px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Responsive Design */
        /* Tablet Styles (768px and below) */
        @media (max-width: 768px) {
          .topbar {
            height: 64px;
            padding: 0.5rem 0;
          }

          .search-form {
            max-width: 300px;
            min-width: 200px;
          }

          .search-input {
            font-size: 16px; /* Prevents iOS zoom */
            padding: 10px 12px;
            height: 44px; /* Touch-friendly height */
          }

          .search-submit-btn {
            height: 44px;
            min-width: 44px;
            padding: 0 14px;
          }

          .search-clear-btn {
            height: 44px;
            min-width: 44px;
          }

          .company-name {
            font-size: 1rem;
          }

          .company-tagline {
            font-size: 0.65rem;
          }

          .action-item {
            margin: 0 3px;
          }

          .action-divider {
            display: none !important;
          }

          .action-btn {
            min-width: 44px;
            min-height: 44px;
            height: 44px;
            width: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
          }

          .notification-menu,
          .message-menu,
          .user-menu {
            min-width: 300px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
          }

          .notification-list,
          .message-list {
            max-height: 400px;
            overflow-y: auto;
          }

          .mobile-menu-btn {
            margin-right: 8px;
          }

          /* Ensure user info is visible in dropdown on mobile */
          .user-menu .dropdown-header {
            padding: 12px 16px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 8px;
          }

          .user-menu .dropdown-header .fw-medium {
            font-size: 1rem;
            color: #1f2937;
            font-weight: 600;
          }

          .user-menu .dropdown-header .text-muted {
            font-size: 0.875rem;
            color: #6b7280;
          }
        }

        /* Mobile Styles (576px and below) */
        @media (max-width: 576px) {
          .topbar {
            height: auto;
            min-height: 60px;
            padding: 0.5rem 0;
          }

          .topbar .container-fluid {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            width: 100%;
          }

          /* Mobile Menu Button */
          .mobile-menu-btn {
            margin: 0;
            height: 44px;
            min-width: 44px;
            flex-shrink: 0;
            order: 1;
          }

          /* Search Form on Mobile */
          .search-form {
            max-width: 100%;
            min-width: 0;
            flex: 1 1 auto;
            margin: 0;
            order: 2;
          }

          .search-input-group {
            border-radius: 6px;
          }

          .search-input {
            font-size: 16px;
            padding: 10px 8px;
            height: 44px;
            min-height: 44px;
          }

          .search-submit-btn {
            padding: 0 10px;
            height: 44px;
            min-width: 44px;
            display: none !important;
          }

          .search-clear-btn {
            padding: 0 8px;
            height: 44px;
            min-width: 44px;
          }

          /* Action Buttons Group on Mobile */
          .action-buttons-group {
            gap: 2px;
            order: 3;
            flex-wrap: nowrap;
            margin-left: 0;
            margin-right: 0;
            width: auto;
          }

          .action-item {
            margin: 0;
            flex-shrink: 0;
          }

          .action-btn {
            min-width: 44px;
            min-height: 44px;
            height: 44px;
            width: 44px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Dropdowns on Mobile */
          .notification-menu,
          .message-menu,
          .user-menu {
            min-width: 280px;
            max-width: 95vw;
            max-height: 75vh;
            position: fixed !important;
            left: auto !important;
            right: 0 !important;
            top: auto !important;
            transform: none !important;
            border-radius: 8px 0 0 8px;
          }

          .notification-list,
          .message-list {
            max-height: 300px;
          }

          /* Dropdown items touch-friendly */
          .notification-item,
          .message-item {
            min-height: 60px;
            padding: 12px;
          }

          .notification-title,
          .message-subject {
            font-size: 0.9rem;
          }

          .notification-message,
          .message-from {
            font-size: 0.85rem;
          }

          .user-menu .dropdown-item {
            min-height: 44px;
            padding: 12px 16px;
            font-size: 0.95rem;
          }
        }

        /* Extra small mobile (below 400px) */
        @media (max-width: 400px) {
          .search-form {
            max-width: 160px;
            min-width: 160px;
          }

          .action-item {
            margin: 0 1px;
          }

          .action-btn {
            min-width: 40px;
            width: 40px;
            height: 40px;
            min-height: 40px;
          }

          .mobile-menu-btn {
            min-width: 40px;
            height: 40px;
          }
        }

        /* Tablet-specific adjustments (576px to 992px) */
        @media (min-width: 576px) and (max-width: 992px) {
          .company-branding {
            padding: 6px 12px;
            margin-right: 12px;
          }

          .company-logo svg {
            width: 36px;
            height: 36px;
          }

          .company-name {
            font-size: 0.95rem;
          }

          .company-tagline {
            font-size: 0.65rem;
          }

          .search-form {
            max-width: 320px;
          }
        }

        /* Additional Responsive Fixes for Horizontal Scrolling */
        @media (max-width: 991px) {
          .search-form {
            max-width: 280px;
            margin-right: 12px;
          }
        }

        @media (max-width: 767px) {
          .topbar {
            height: auto;
            min-height: 64px;
          }

          .topbar .container-fluid {
            flex-wrap: wrap;
            padding: 8px 12px;
          }

          .search-form {
            max-width: 200px;
            margin-right: 8px;
            flex-shrink: 1;
            min-width: 120px;
          }

          .search-input {
            font-size: 0.85rem;
            padding: 8px 12px;
          }

          .search-submit-btn,
          .search-clear-btn {
            padding: 8px;
          }

          .action-item {
            margin: 0 4px;
          }

          .action-btn {
            min-width: 36px;
            height: 36px;
            padding: 8px;
          }
        }

        @media (max-width: 575px) {
          .search-form {
            flex: 1 1 auto;
            max-width: none;
            min-width: 100px;
            margin-right: 8px;
          }

          .company-branding {
            padding: 4px 8px;
            margin-right: 8px;
          }

          .company-info .company-name {
            font-size: 0.9rem;
          }

          .company-tagline {
            display: none;
          }

          .action-divider {
            display: none !important;
          }

          .action-buttons-group {
            flex-wrap: nowrap;
          }
        }

        /* Focus visible for better keyboard navigation */
        .topbar *:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .action-btn {
            border-width: 2px;
          }

          .notification-item.unread,
          .message-item.unread {
            border-left-width: 4px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .topbar,
          .action-btn,
          .mobile-menu-btn,
          .company-branding,
          .search-input-group,
          .notification-item,
          .message-item {
            transition: none;
          }

          .notification-badge,
          .message-badge {
            animation: none;
          }
        }
      `}</style>

      {/* Render Modals at the top level of the TopBar */}
      <GuidedTour 
        show={showTour} 
        onHide={hideTour} 
        currentUser={currentUser} 
      />
      <KeyboardShortcuts 
        show={shortcutsVisible} 
        onHide={() => setShortcutsVisible(false)} 
      />
    </Navbar>
  );
}

export default TopBar;




