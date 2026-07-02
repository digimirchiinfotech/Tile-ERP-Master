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
import { InputGroup, Form } from 'react-bootstrap';
import { Search, LogOut, Settings, HelpCircle, User, Menu, LayoutGrid, Eye, Building } from 'lucide-react';
import api from '../../services/api';
import NotificationDropdown from './NotificationDropdown.jsx';
import CompanySwitcher from './CompanySwitcher.jsx';
import { useUserContext } from '../../contexts/UserContext.jsx';
import { resolveImageUrl } from '../../utils/urlHelper';
import './ProperTopBar.css';

function ProperTopBar({ currentUser, currentView, onToggleSidebar, onLogout, onNavigate, onSearch, sidebarCollapsed = false, isMobile = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, selectedCompanyId } = useUserContext();
  const [displayCompanyName, setDisplayCompanyName] = useState('Tile Exporter');

  useEffect(() => {
    // Super admins do not belong to a company
    let role = user?.role || currentUser?.role;
    if (!role) {
      try {
        const uStr = localStorage.getItem('current_user');
        if (uStr) role = JSON.parse(uStr).role;
      } catch(e) {}
    }
    if (role === 'super_admin') {
      setDisplayCompanyName('Super Admin');
      return;
    }
    let name = user?.company_name || user?.companyName || currentUser?.company_name || currentUser?.companyName;
    if (!name) {
      try {
        const uStr = localStorage.getItem('current_user');
        if (uStr) {
          const uObj = JSON.parse(uStr);
          name = uObj.company_name || uObj.companyName;
        }
      } catch (e) {}
    }
    if (name) setDisplayCompanyName(name);

    const fetchCompany = async () => {
      const cid = user?.company_id || user?.companyId || selectedCompanyId || currentUser?.company_id || currentUser?.companyId || localStorage.getItem('selected_company_id');
      if (cid) {
        try {
          // We can use standard axios since we need it dynamic
          const token = localStorage.getItem('access_token');
          if (token) {
            const res = await api.get(`/companies/${cid}`);
            if (res.data?.data?.name) {
              setDisplayCompanyName(res.data.data.name);
            }
          }
        } catch (e) {
          console.error("Failed to fetch company profile for top bar");
        }
      }
    };
    fetchCompany();
    
    const handleUpdate = () => fetchCompany();
    window.addEventListener('companyProfileUpdated', handleUpdate);
    return () => window.removeEventListener('companyProfileUpdated', handleUpdate);
  }, [user, currentUser, selectedCompanyId]);

  // Helper to determine if a menu item is active
  const isNavItemActive = (item) => {
    if (!currentView) return false;
    
    // Exact match
    if (currentView === item.view) return true;
    
    // Sub-view matches
    const viewMappings = {
      'dashboard': ['dashboard'],
      'user-management': ['user-management', 'user-form'],
      'product-management': ['product-management', 'product-form'],
      'order-dashboard': ['order-dashboard', 'order-form'],
      'super-admin-dashboard': ['super-admin-dashboard', 'company-management', 'subscription-management'],
      'invoice-management': ['invoice-management', 'invoice-form'],
      'export-management': ['export-management', 'export-overview', 'shipping-instructions']
    };

    return viewMappings[item.view]?.includes(currentView) || false;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && typeof onSearch === 'function') {
      onSearch(searchQuery);
      setSearchQuery('');
    }
  };

  const getMenuItems = (role) => {
    const menus = {
      super_admin: [
        { label: 'Platform', view: 'super-admin-dashboard' },
        { label: 'Company Dashboard', view: 'dashboard' },
        { label: 'Companies', view: 'company-management' },
        { label: 'Subscriptions', view: 'subscription-management' },
        { label: 'Reports', view: 'reports-analytics' },
        { label: 'Settings', view: 'master-data-management' },
      ],
      company_admin: [
        { label: 'Dashboard', view: 'dashboard' },
        { label: 'Users', view: 'user-management' },
        { label: 'Products', view: 'product-management' },
        { label: 'Orders', view: 'order-dashboard' },
        { label: 'Support', view: 'support' },
      ],
      sales_manager: [
        { label: 'Dashboard', view: 'dashboard' },
        { label: 'Clients', view: 'client-management' },
        { label: 'Orders', view: 'order-dashboard' },
        { label: 'Invoices', view: 'invoice-management' },
        { label: 'Support', view: 'support' },
      ],
      sales_executive: [
        { label: 'Dashboard', view: 'dashboard' },
        { label: 'Clients', view: 'client-management' },
        { label: 'Orders', view: 'order-dashboard' },
        { label: 'Support', view: 'support' },
      ],
      qc: [
        { label: 'Dashboard', view: 'dashboard' },
        { label: 'QC Records', view: 'qc-management' },
        { label: 'Reports', view: 'reports-analytics' },
      ],
      account: [
        { label: 'Dashboard', view: 'account-finance-management' },
        { label: 'Invoices', view: 'invoice-management' },
        { label: 'Reports', view: 'reports-analytics' },
      ],
    };
    return menus[role] || menus.company_admin;
  };

  const menuItems = getMenuItems(currentUser?.role);

  // Determine the primary dashboard for the current user
  const getDashboardView = () => {
    if (!currentUser?.role) return 'dashboard';
    const dashboards = {
      super_admin: 'super-admin-dashboard',
      company_admin: 'dashboard',
      sales_manager: 'dashboard',
      sales_executive: 'dashboard',
      account: 'account-finance-management',
      qc: 'qc-management',
      qc_inspector: 'qc-management',
      purchase_manager: 'order-dashboard',
      administration: 'product-management',
      client: 'client-order-management',
      export_documents: 'export-management'
    };
    return dashboards[currentUser.role] || 'dashboard';
  };

  const handleLogoClick = () => {
    const dashboardView = getDashboardView();
    if (typeof onNavigate === 'function') {
      onNavigate(dashboardView);
    }
  };

  const userInitial = currentUser?.name?.charAt(0)?.toUpperCase() || 'U';
  const avatarUrl = currentUser?.avatar_url;
  const displayEmail = (() => {
    if (currentUser?.email) return currentUser.email;
    if (currentUser?.email_id) return currentUser.email_id;
    if (currentUser?.username) {
      return currentUser.username.includes('@') ? currentUser.username : `${currentUser.username}@domain.com`;
    }
    return 'email@domain.com';
  })();

  return (
    <div className={`proper-topbar ${sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : ''}`}>
      <div className="topbar-container">
        {/* Left: Hamburger & Logo */}
        <div className="topbar-logo-section">
          <button 
            className="topbar-hamburger-btn"
            onClick={onToggleSidebar}
            title="Open Menu"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <div 
            className="topbar-logo" 
            onClick={handleLogoClick}
            onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
            role="button"
            tabIndex="0"
            title="Go to Dashboard"
          >
            <h5>{displayCompanyName}</h5>
          </div>
        </div>

        {/* Center: Navigation Menu (Desktop) */}
        <nav className="topbar-nav-desktop">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              className={`topbar-nav-item ${isNavItemActive(item) ? 'active' : ''}`}
              onClick={() => onNavigate(item.view)}
              title={item.label}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: Search, Notifications, User */}
        <div className="topbar-right-section">

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="topbar-search-wrapper">
            <div className="topbar-search">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="topbar-search-input"
              />
              <button type="submit" className="topbar-search-btn">
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Multi-Tenant Switcher */}
          {/* <CompanySwitcher onNavigate={onNavigate} /> */}
          
          {/* Notifications Beside Search */}
          <div className="notification-dropdown-wrapper">
            <NotificationDropdown onNavigate={onNavigate} />
          </div>

          {/* User Menu Trigger */}
          <div className="topbar-user-menu">
            <button
              className="topbar-user-icon-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="User Menu"
            >
              <div className="user-avatar-icon">
                {avatarUrl ? (
                  <img 
                    src={resolveImageUrl(avatarUrl)} 
                    alt="User Avatar" 
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  userInitial
                )}
              </div>
            </button>

            {showUserMenu && (
              <div className="topbar-user-dropdown">
                <div className="user-dropdown-header">
                  <div className="udh-avatar">
                    {avatarUrl ? (
                      <img src={resolveImageUrl(avatarUrl)} alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <div className="udh-name">{(currentUser?.name || currentUser?.username || 'User').toUpperCase()}</div>
                  <div className="udh-email">{displayEmail}</div>
                  {currentUser?.role && (
                    <span className="udh-role">{currentUser.role.replace(/_/g, ' ')}</span>
                  )}
                </div>

                <div className="user-dropdown-menu">
                  <button className="user-dropdown-item" onClick={() => { handleLogoClick(); setShowUserMenu(false); }}>
                    <div className="udi-icon udi-icon-blue">
                      <LayoutGrid size={18} />
                    </div>
                    Dashboard
                  </button>
                  <button className="user-dropdown-item" onClick={() => { onNavigate('profile'); setShowUserMenu(false); }}>
                    <span className="udi-icon udi-icon-blue"><User size={15} /></span>
                    <span>My Profile</span>
                  </button>
                  <button className="user-dropdown-item" onClick={() => { onNavigate('profile-settings', { tab: 'company' }); setShowUserMenu(false); }}>
                    <span className="udi-icon udi-icon-purple"><Building size={15} /></span>
                    <span>Company</span>
                  </button>
                  <button className="user-dropdown-item" onClick={() => { onNavigate('support'); setShowUserMenu(false); }}>
                    <span className="udi-icon udi-icon-teal"><HelpCircle size={15} /></span>
                    <span>Help & Support</span>
                  </button>
                  <button className="user-dropdown-item" onClick={() => { window.open('/docs.html', '_blank'); setShowUserMenu(false); }}>
                    <span className="udi-icon udi-icon-indigo" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                      <Eye size={15} />
                    </span>
                    <span>Documentation</span>
                  </button>
                </div>

                <div className="user-dropdown-footer">
                  <button className="user-dropdown-item logout-item" onClick={() => { setShowUserMenu(false); onLogout(); }}>
                    <span className="udi-icon udi-icon-red"><LogOut size={15} /></span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProperTopBar;




