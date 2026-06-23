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

import { useState } from 'react';
import { Nav, Collapse, Badge } from 'react-bootstrap';
import NotificationSystem from './NotificationSystem.jsx';
import QuickActions from './QuickActions.jsx';
import { Home, ChevronDown, ChevronRight, ChevronLeft, Plus, Users, Package, BookOpen, UserCheck, Layers, Building, ClipboardList, Calculator, Truck, FileText, Receipt, ShoppingCart, HelpCircle, Settings, User, LogOut, Bell, Search, DollarSign, BarChart3, Ship, Shield, Award, Archive, Workflow, FileCheck, Scale, RefreshCcw, Check } from 'lucide-react';

function Sidebar({
  currentView,
  currentUser,
  onNavigate,
  onLogout,
  collapsed = false,
  visible = false,
  onToggleCollapse,
  onClose,
  isMobile = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuKey) => {
    if (isMobile) {
      // On mobile, close other menus when opening a new one
      setExpandedMenus({ [menuKey]: !expandedMenus[menuKey] });
    } else {
      setExpandedMenus((prev) => ({
        ...prev,
        [menuKey]: !prev[menuKey],
      }));
    }
  };

  const handleNavigation = (action, menuKey) => {
    action();
    if (isMobile && onClose) {
      onClose();
    }
    if (menuKey) {
      setExpandedMenus((prev) => ({
        ...prev,
        [menuKey]: !prev[menuKey],
      }));
    }
  };

  const hasPermission = (module) => {
    if (!currentUser?.role) return false;
    if (currentUser.role === 'super_admin') return true;

    const modulePermissions = {
      user_management: ['all', 'user_management', 'company_admin'],
      product_management: ['all', 'product_management', 'administration', 'company_admin', 'admin', 'purchase_manager', 'sales_manager', 'sales_executive', 'qc', 'qc_inspector', 'export_documents', 'account', 'inventory_manager', 'production_manager'],
      sanitaryware_management: ['all', 'sanitaryware_management', 'administration', 'company_admin', 'purchase_manager', 'sales_manager', 'sales_executive', 'qc', 'qc_inspector', 'export_documents', 'account'],
      catalogue_management: ['all', 'catalogue_management', 'administration', 'company_admin', 'sales_manager', 'sales_executive', 'qc', 'qc_inspector', 'export_documents', 'account'],
      lead_management: ['all', 'lead_management', 'sales_manager', 'company_admin'],
      proforma_invoice: ['all', 'proforma_invoice', 'sales_manager', 'company_admin', 'client', 'export_documents', 'qc', 'qc_inspector'],
      proforma_order: ['all', 'proforma_order', 'purchase', 'purchase_manager', 'sales_manager', 'sales_executive', 'company_admin'],
      qc_management: ['all', 'qc_management', 'qc', 'qc_inspector', 'company_admin', 'sales_manager', 'sales_executive', 'production_manager'],
      inventory_management: ['all', 'inventory_management', 'inventory_manager', 'company_admin', 'admin', 'purchase_manager', 'production_manager', 'administration'],
      production_management: ['all', 'production_management', 'production_manager', 'company_admin', 'purchase_manager', 'qc_management'],
      order_sheet: ['all', 'order_sheet', 'qc_management', 'qc', 'qc_inspector', 'company_admin', 'admin', 'purchase_manager', 'sales_manager', 'sales_executive', 'production_manager'],
      pallet_management: ['all', 'pallet_management', 'purchase', 'purchase_manager', 'company_admin'],
      client_management: ['all', 'client_management', 'sales_manager', 'company_admin'],
      supplier_management: ['all', 'supplier_management', 'purchase', 'purchase_manager', 'company_admin', 'sales_manager', 'sales_executive'],
      client_order: ['all', 'client_order', 'client', 'sales_manager', 'company_admin'],
      account_finance: ['all', 'account_finance', 'account', 'company_admin', 'sales_manager'],
      salesperson_management: ['all', 'salesperson_management', 'user_management', 'company_admin'],
      export_overview: ['all', 'export_management', 'sales_manager', 'account', 'purchase_manager', 'administration', 'export_documents', 'company_admin'],
      export_invoice: ['all', 'export_management', 'sales_manager', 'account', 'purchase_manager', 'administration', 'export_documents', 'company_admin'],
      igst_invoice: ['all', 'export_management', 'sales_manager', 'account', 'purchase_manager', 'administration', 'export_documents', 'company_admin'],
      packing_list: ['all', 'packing_list_management', 'account', 'purchase', 'purchase_manager', 'sales_manager', 'export_documents', 'company_admin'],
      annexure: ['all', 'export_management', 'sales_manager', 'account', 'purchase_manager', 'administration', 'export_documents', 'company_admin'],
      invoice_backside: ['all', 'export_management', 'sales_manager', 'account', 'purchase_manager', 'administration', 'export_documents', 'company_admin'],
      vgm: ['all', 'export_management', 'sales_manager', 'account', 'purchase_manager', 'administration', 'export_documents', 'company_admin'],
      shipping_instructions: ['all', 'export_management', 'sales_manager', 'account', 'purchase_manager', 'administration', 'export_documents', 'company_admin'],
      reports_analytics: ['all', 'company_admin', 'sales_manager', 'purchase_manager', 'administration'],
      master_data_management: ['all', 'company_admin', 'administration', 'super_admin', 'sales_manager', 'export_documents'],
      sanitaryware_master_data: ['all', 'company_admin', 'administration', 'super_admin', 'sales_manager', 'export_documents'],
      administration: ['all', 'company_admin'],
    };

    const permissions = modulePermissions[module] || [];
    const roleHasPermission =
      permissions.includes(currentUser.role)
      || (['company_admin', 'admin'].includes(currentUser.role) && permissions.includes('company_admin'))
      || (currentUser.permissions && permissions.some(p => currentUser.permissions.includes(p)));

    // Check if module is enabled for the company (only for non-super admins)
    if (currentUser.role !== 'super_admin' && currentUser.enabledModules && Array.isArray(currentUser.enabledModules)) {
      let isEnabled = currentUser.enabledModules.includes(module);

      // Special fallback rules for older legacy module structures, ensuring no breaking changes
      if (!isEnabled && module === 'supplier_management') {
        isEnabled = currentUser.enabledModules.includes('proforma_order');
      }
      
      // Auto-enabled modules that might not be in older tenant's array yet
      const autoEnabled = ['reports_analytics', 'administration', 'master_data_management', 'sanitaryware_master_data', 'business_intelligence', 'inventory_management', 'production_management'];
      if (autoEnabled.includes(module)) {
        isEnabled = true;
      }

      // Backward compat: companies provisioned before 'order_sheet' module existed
      // should still see Order Sheet if they have qc_management enabled
      if (!isEnabled && module === 'order_sheet') {
        isEnabled = currentUser.enabledModules.includes('qc_management');
      }

      if (!isEnabled) {
        return false;
      }
    }

    return roleHasPermission;
  };

  const canAdd = (module) => {
    const addPermissions = {
      product: ['super_admin', 'company_admin', 'administration'],
      catalogue: ['super_admin', 'company_admin', 'administration', 'client'],
      lead: [
        'super_admin',
        'company_admin',
        'sales_manager',
      ],
      qc: ['super_admin', 'company_admin', 'qc', 'qc_inspector', 'sales_manager'],
      client: [
        'super_admin',
        'company_admin',
        'sales_manager',
      ],
      supplier: ['super_admin', 'company_admin', 'purchase', 'sales_manager', 'sales_executive'],
      pallet: ['super_admin', 'company_admin', 'purchase'],
      invoice: [
        'super_admin',
        'company_admin',
        'account',
        'sales_manager',
      ],
      order: [
        'super_admin',
        'company_admin',
        'purchase',
        'purchase_manager',
        'sales_manager',
        'sales_executive',
      ],
      packing: [
        'super_admin',
        'company_admin',
        'account',
        'sales_manager',
        'purchase',
      ],
      account: ['super_admin', 'company_admin', 'account', 'sales_manager'],
      salesperson: ['super_admin', 'company_admin'],
    };
    return addPermissions[module]?.includes(currentUser?.role);
  };

  // Role-specific menu configurations
  const getSystematicMenuItems = () => {
    const userRole = currentUser?.role;

    // Dashboard configuration based on role
    let dashboardLabel = 'Company Dashboard';
    let dashboardView = 'dashboard';

    if (userRole === 'qc' || userRole === 'qc_inspector') { dashboardLabel = 'QC Dashboard'; dashboardView = 'qc-management'; }
    else if (userRole === 'export_documents') { dashboardLabel = 'Export Dashboard'; dashboardView = 'export-management'; }
    else if (userRole === 'account') { dashboardLabel = 'Finance Dashboard'; dashboardView = 'account-finance-management'; }
    else if (userRole === 'purchase' || userRole === 'purchase_manager') { dashboardLabel = 'Purchase Dashboard'; dashboardView = 'order-dashboard'; }
    else if (userRole === 'administration') { dashboardLabel = 'Admin Dashboard'; dashboardView = 'product-management'; }
    else if (userRole === 'client') { dashboardLabel = 'Client Dashboard'; dashboardView = 'client-order-management'; }
    else if (userRole === 'sales_manager' || userRole === 'sales_executive') { dashboardLabel = 'Sales Dashboard'; dashboardView = 'dashboard'; }

    return [
      {
        key: 'dashboard',
        label: dashboardLabel,
        icon: Home,
        action: () => handleNavigation(() => onNavigate(dashboardView)),
        active: currentView === dashboardView,
      },
      {
        key: 'management',
        label: 'Business Management',
        icon: Building,
        hasSubmenu: true,
        submenu: [
          {
            key: 'users',
            label: 'User Management',
            icon: Users,
            action: () => handleNavigation(() => onNavigate('user-management')),
            active: currentView === 'user-management',
            permission: 'user_management',
          },
          {
            key: 'clients',
            label: 'Client Management',
            icon: Building,
            action: () => handleNavigation(() => onNavigate('client-management')),
            active: currentView === 'client-management',
            permission: 'client_management',
            addAction: canAdd('client') ? () => handleNavigation(() => onNavigate('client-form')) : null,
          },
          {
            key: 'suppliers',
            label: 'Supplier Management',
            icon: Truck,
            action: () => handleNavigation(() => onNavigate('supplier-management')),
            active: currentView === 'supplier-management',
            permission: 'supplier_management',
            addAction: canAdd('supplier') ? () => handleNavigation(() => onNavigate('supplier-form')) : null,
          },
          {
            key: 'leads',
            label: 'Lead Management',
            icon: UserCheck,
            action: () => handleNavigation(() => onNavigate('lead-management')),
            active: currentView === 'lead-management',
            permission: 'lead_management',
            addAction: canAdd('lead') ? () => handleNavigation(() => onNavigate('lead-form')) : null,
          },
          {
            key: 'salespersons',
            label: 'Salesperson Management',
            icon: Users,
            action: () => handleNavigation(() => onNavigate('salesperson-management')),
            active: currentView === 'salesperson-management',
            permission: 'salesperson_management',
            addAction: canAdd('salesperson') ? () => handleNavigation(() => onNavigate('salesperson-management', { action: 'new' })) : null,
          },
          {
            key: 'client-orders',
            label: 'Client Orders',
            icon: ClipboardList,
            action: () => handleNavigation(() => onNavigate('client-order-management')),
            active: currentView === 'client-order-management',
            permission: 'client_order',
          },
        ],
      },
      {
        key: 'products',
        label: 'Product & Catalogue',
        icon: Package,
        hasSubmenu: true,
        submenu: [
          {
            key: 'products',
            label: 'Tile Product',
            icon: Package,
            action: () => handleNavigation(() => onNavigate('product-management')),
            active: currentView === 'product-management',
            permission: 'product_management',
            addAction: canAdd('product') ? () => handleNavigation(() => onNavigate('product-management', { action: 'new', category: 'Tiles' })) : null,
          },
          {
            key: 'sanitaryware-products',
            label: 'Sanitaryware Products',
            icon: Package,
            action: () => handleNavigation(() => onNavigate('sanitaryware-product-management')),
            active: currentView === 'sanitaryware-product-management',
            permission: 'sanitaryware_management',
            addAction: canAdd('product') ? () => handleNavigation(() => onNavigate('sanitaryware-product-management', { action: 'new' })) : null,
          },
          {
            key: 'catalogues',
            label: 'Catalogue Management',
            icon: BookOpen,
            action: () => handleNavigation(() => onNavigate('catalogue-management')),
            active: currentView === 'catalogue-management',
            permission: 'catalogue_management',
            addAction: canAdd('catalogue') ? () => handleNavigation(() => onNavigate('catalogue-management', { action: 'new' })) : null,
          },
        ],
      },
      {
        key: 'galleries',
        label: 'User Galleries',
        icon: ShoppingCart,
        hasSubmenu: true,
        submenu: [
          {
            key: 'tile-gallery',
            label: 'Tile Collection',
            icon: Package,
            action: () => handleNavigation(() => onNavigate('tile-gallery')),
            active: currentView === 'tile-gallery',
          },
          {
            key: 'sanitaryware-gallery',
            label: 'Bathware Collection',
            icon: Package,
            action: () => handleNavigation(() => onNavigate('sanitaryware-gallery')),
            active: currentView === 'sanitaryware-gallery',
          },
          {
            key: 'catalogue-gallery',
            label: 'Digital Catalogues',
            icon: BookOpen,
            action: () => handleNavigation(() => onNavigate('catalogue-gallery')),
            active: currentView === 'catalogue-gallery',
          },
        ],
      },
      {
        key: 'proforma',
        label: 'Proforma Management',
        icon: FileText,
        hasSubmenu: true,
        submenu: [
          {
            key: 'invoices',
            label: 'Proforma Invoices',
            icon: Receipt,
            action: () => handleNavigation(() => onNavigate('invoice-dashboard')),
            active: currentView === 'invoice-dashboard' || currentView === 'invoice-form',
            permission: 'proforma_invoice',
            addAction: canAdd('invoice') ? () => handleNavigation(() => onNavigate('invoice-form')) : null,
          },
          {
            key: 'orders',
            label: 'Proforma Orders',
            icon: ShoppingCart,
            action: () => handleNavigation(() => onNavigate('order-dashboard')),
            active: currentView === 'order-dashboard' || currentView === 'order-form',
            permission: 'proforma_order',
            addAction: canAdd('order') ? () => handleNavigation(() => onNavigate('order-form')) : null,
          },
        ],
      },
      {
        key: 'operations',
        label: 'Operations & QC',
        icon: Layers,
        hasSubmenu: true,
        submenu: [
          {
            key: 'inventory',
            label: 'Inventory & Stock',
            icon: Layers,
            action: () => handleNavigation(() => onNavigate('inventory-dashboard')),
            active: currentView === 'inventory-dashboard',
            permission: 'inventory_management',
          },
          {
            key: 'order-sheet',
            label: 'Order Sheet',
            icon: FileText,
            action: () => handleNavigation(() => onNavigate('order-sheet-dashboard')),
            active: currentView === 'order-sheet-dashboard',
            permission: 'order_sheet',
          },
          {
            key: 'qc',
            label: 'QC Management',
            icon: Layers,
            action: () => handleNavigation(() => onNavigate('qc-management')),
            active: currentView === 'qc-management',
            permission: 'qc_management',
            addAction: canAdd('qc') ? () => handleNavigation(() => onNavigate('qc-form')) : null,
          },
        ],
      },
      {
        key: 'export',
        label: 'Export Management',
        icon: Ship,
        hasSubmenu: true,
        submenu: [
          {
            key: 'export-overview',
            label: 'Export Overview',
            icon: Ship,
            action: () => handleNavigation(() => onNavigate('export-management')),
            active: currentView === 'export-management',
            permission: 'export_overview',
          },
          {
            key: 'export-invoice',
            label: 'Export Invoices',
            icon: Receipt,
            action: () => handleNavigation(() => onNavigate('export-invoice')),
            active: currentView === 'export-invoice' || currentView === 'export-invoice-form',
            permission: 'export_invoice',
          },
          {
            key: 'igst-invoice',
            label: 'IGST Invoice Management',
            icon: Receipt,
            action: () => handleNavigation(() => onNavigate('igst-invoice')),
            active: currentView === 'igst-invoice' || currentView === 'igst-invoice-form',
            permission: 'igst_invoice',
          },
          {
            key: 'packing-list-management',
            label: 'Packing List Management',
            icon: FileText,
            action: () => handleNavigation(() => onNavigate('packing-list-management')),
            active: currentView === 'packing-list-management' || currentView === 'packing-list-form',
            permission: 'packing_list',
          },
          {
            key: 'export-invoice-annexure',
            label: 'Annexure',
            icon: Package,
            action: () => handleNavigation(() => onNavigate('export-invoice-annexure')),
            active: currentView === 'export-invoice-annexure' || currentView === 'export-invoice-annexure-form',
            permission: 'annexure',
          },
          {
            key: 'invoice-backside',
            label: 'Invoice Backside',
            icon: FileCheck,
            action: () => handleNavigation(() => onNavigate('invoice-backside')),
            active: currentView === 'invoice-backside' || currentView === 'invoice-backside-form' || currentView === 'invoice-backside-dashboard',
            permission: 'invoice_backside',
          },
          {
            key: 'vgm',
            label: 'VGM - Verified Gross Mass',
            icon: Scale,
            action: () => handleNavigation(() => onNavigate('vgm')),
            active: currentView === 'vgm' || currentView === 'vgm-form',
            permission: 'vgm',
          },
          {
            key: 'shipping-instructions',
            label: 'Shipping Instructions',
            icon: FileText,
            action: () => handleNavigation(() => onNavigate('export-shipping-instructions')),
            active: currentView === 'export-shipping-instructions',
            permission: 'shipping_instructions',
          },
        ],
      },
      {
        key: 'finance',
        label: 'Finance & Management',
        icon: Calculator,
        hasSubmenu: true,
        submenu: [
          {
            key: 'account-finance',
            label: 'Account & Finance Management',
            icon: Calculator,
            action: () => handleNavigation(() => onNavigate('account-finance-management')),
            active: currentView === 'account-finance-management',
            permission: 'account_finance',
            addAction: canAdd('account') ? () => handleNavigation(() => onNavigate('account-form')) : null,
          },
        ],
      },
      {
        key: 'reports',
        label: 'Report & Analytics',
        icon: BarChart3,
        hasSubmenu: true,
        submenu: [
          {
            key: 'reports-analytics',
            label: 'Business Intelligence',
            icon: BarChart3,
            action: () => handleNavigation(() => onNavigate('reports-analytics')),
            active: currentView === 'reports-analytics',
            permission: 'reports_analytics',
          },
        ],
      },
      {
        key: 'administration',
        label: 'Administration',
        icon: Settings,
        hasSubmenu: true,
        submenu: [
          {
            key: 'master-data-management',
            label: 'Master Data Management',
            icon: Settings,
            action: () => handleNavigation(() => onNavigate('master-data-management')),
            active: currentView === 'master-data-management',
            permission: 'master_data_management',
          },
          {
            key: 'size-packing-master',
            label: 'Size Packing Master',
            icon: Settings,
            action: () => handleNavigation(() => onNavigate('size-packing-master')),
            active: currentView === 'size-packing-master',
            permission: 'master_data_management',
          },
          {
            key: 'sanitaryware-master-data',
            label: 'Sanitaryware Master Data',
            icon: Settings,
            action: () => handleNavigation(() => onNavigate('sanitaryware-master-data')),
            active: currentView === 'sanitaryware-master-data',
            permission: 'sanitaryware_master_data',
          },
        ],
      },
    ];
  };

  const getSuperAdminMenuItems = () => [
    {
      key: 'super-admin-dashboard',
      label: 'Super Admin Dashboard',
      icon: Home,
      action: () => handleNavigation(() => onNavigate('super-admin-dashboard')),
      active: currentView === 'super-admin-dashboard',
    },
    {
      key: 'super-admin',
      label: 'Platform Management',
      icon: Building,
      hasSubmenu: true,
      submenu: [
        {
          key: 'company-management',
          label: 'Company Management',
          icon: Building,
          action: () =>
            handleNavigation(() => onNavigate('company-management')),
          active: currentView === 'company-management',
        },
        {
          key: 'subscription-management',
          label: 'Subscription Management',
          icon: DollarSign,
          action: () =>
            handleNavigation(() => onNavigate('subscription-management')),
          active: currentView === 'subscription-management',
        },
        {
          key: 'session-management',
          label: 'Session Management',
          icon: Shield,
          action: () => handleNavigation(() => onNavigate('session-management')),
          active: currentView === 'session-management',
        },
        {
          key: 'reports-analytics',
          label: 'Reports & Analytics',
          icon: BarChart3,
          action: () => handleNavigation(() => onNavigate('reports-analytics')),
          active: currentView === 'reports-analytics',
        },
        {
          key: 'master-data-management',
          label: 'Master Data Management',
          icon: Settings,
          action: () =>
            handleNavigation(() => onNavigate('master-data-management')),
          active: currentView === 'master-data-management',
        },
        {
          key: 'system-settings',
          label: 'System Settings',
          icon: Settings,
          action: () => handleNavigation(() => onNavigate('system-settings')),
          active: currentView === 'system-settings',
        },
        {
          key: 'super-admin-tickets',
          label: 'Support Tickets',
          icon: HelpCircle,
          action: () => handleNavigation(() => onNavigate('super-admin-tickets')),
          active: currentView === 'super-admin-tickets',
        },
        {
          key: 'audit-logs',
          label: 'Audit Logs',
          icon: ClipboardList,
          action: () => handleNavigation(() => onNavigate('audit-logs')),
          active: currentView === 'audit-logs',
        },
        {
          key: 'consistency-check',
          label: 'Consistency Check',
          icon: RefreshCcw,
          action: () => handleNavigation(() => onNavigate('system-settings', { activeTab: 'consistency' })),
          active: currentView === 'system-settings' && sessionStorage.getItem('navigationData')?.includes('consistency'),
        },
      ],
    },
    ...getSystematicMenuItems(),
  ];

  const getRoleSpecificMenuItems = () => {
    const userRole = currentUser?.role;
    let items = [];

    if (userRole === 'super_admin') {
      items = getSuperAdminMenuItems();
    } else {
      items = getSystematicMenuItems();
    }

    items.push({
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      action: () => handleNavigation(() => onNavigate('notifications')),
      active: currentView === 'notifications',
    });

    return items;
  };

  // Get role-specific menu items
  const currentMenuItems = getRoleSpecificMenuItems();

  const renderMenuItem = (item, isSubmenu = false) => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    let renderedSubmenuItems = [];
    if (item.hasSubmenu && item.submenu) {
      renderedSubmenuItems = item.submenu
        .map((subItem) => renderMenuItem(subItem, true))
        .filter(Boolean);

      if (renderedSubmenuItems.length === 0) {
        return null;
      }
    }

    const IconComponent = item.icon;
    const isActive = item.active;
    const hasSubmenu = item.hasSubmenu && !isSubmenu;
    const isExpanded = expandedMenus[item.key];

    return (
      <div key={item.key}>
        <Nav.Link
          className={`sidebar-nav-link ${isActive ? 'active' : ''} ${isSubmenu ? 'submenu-item' : ''
            } ${collapsed ? 'collapsed' : ''}`}
          onClick={hasSubmenu ? () => toggleMenu(item.key) : item.action}
        >
          <div className="nav-item-content">
            <div className="nav-item-left">
              <IconComponent size={18} className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </div>
            <div className="nav-item-right">
              {item.addAction && !collapsed && (
                <Plus
                  size={14}
                  className="add-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.addAction();
                  }}
                  title={`Add ${item.label}`}
                />
              )}
              {hasSubmenu &&
                !collapsed &&
                (isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </div>
          </div>
        </Nav.Link>

        {hasSubmenu && !collapsed && (
          <Collapse in={isExpanded}>
            <div className="submenu">
              {renderedSubmenuItems}
            </div>
          </Collapse>
        )}
      </div>
    );
  };

  // Role-specific quick actions
  const getRoleSpecificQuickActions = () => {
    const userRole = currentUser?.role;

    switch (userRole) {
      case 'super_admin':
        return [
          {
            label: 'Company',
            action: () =>
              handleNavigation(() => onNavigate('company-management')),
          },
          {
            label: 'Invoice',
            action: () => handleNavigation(() => onNavigate('invoice-form')),
          },
          {
            label: 'Lead',
            action: () => handleNavigation(() => onNavigate('lead-form')),
          },
          {
            label: 'Client',
            action: () => handleNavigation(() => onNavigate('client-form')),
          },
        ];
      case 'sales_manager':
        return [
          {
            label: 'Lead',
            action: () => handleNavigation(() => onNavigate('lead-form')),
          },
          {
            label: 'Invoice',
            action: () => handleNavigation(() => onNavigate('invoice-form')),
          },
          {
            label: 'Client',
            action: () => handleNavigation(() => onNavigate('client-form')),
          },
        ];
      case 'sales_executive':
        return [
          {
            label: 'Supplier',
            action: () => handleNavigation(() => onNavigate('supplier-form')),
          },
          {
            label: 'Order',
            action: () => handleNavigation(() => onNavigate('order-form')),
          },
        ];
      case 'qc':
        return [
          {
            label: 'QC Management',
            action: () => handleNavigation(() => onNavigate('qc-management')),
          },
        ];
      case 'account':
        return [
          {
            label: 'Account Entry',
            action: () => handleNavigation(() => onNavigate('account-form')),
          },
        ];
      case 'purchase':
        return [
          {
            label: 'Order',
            action: () => handleNavigation(() => onNavigate('order-form')),
          },

        ];
      default:
        return [];
    }
  };
  return (
    <div
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${visible ? 'show' : ''}`}
    >
      {/* User Profile Section - Premium Redesign */}
      <div className="sidebar-profile-section">
        <div className="profile-container">
          <div className="profile-avatar-wrapper">
            <div className="avatar-circle">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Profile" className="avatar-img" />
              ) : (
                <User size={18} className="avatar-placeholder-icon" />
              )}
            </div>
          </div>
          {!collapsed && (
            <div className="profile-info">
              <div className="profile-name-text">{(currentUser?.name || 'Guest User').toUpperCase()}</div>
              <div className="profile-role-badge">
                {currentUser?.role?.replace('_', ' ').toUpperCase() || 'USER'}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Navigation Menu */}
      <Nav className="sidebar-nav">
        {currentMenuItems.map((item) => renderMenuItem(item))}
      </Nav>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="quick-actions">
          <div className="section-title">Quick Actions</div>
          <div className="quick-action-buttons">
            {getRoleSpecificQuickActions().map((action, index) => (
              <button key={index} className="quick-btn" onClick={action.action}>
                <Plus size={14} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Support & Settings */}
      <div className="sidebar-footer">
        <Nav.Link
          className="sidebar-nav-link"
          onClick={() => handleNavigation(() => onNavigate('erp-flowchart'))}
        >
          <Workflow size={18} className="nav-icon" />
          {!collapsed && <span className="nav-label">ERP Flowchart</span>}
        </Nav.Link>

        <Nav.Link
          className={`sidebar-nav-link ${currentView === 'help-center' ? 'active' : ''}`}
          onClick={() => handleNavigation(() => onNavigate('help-center'))}
        >
          <BookOpen size={18} className="nav-icon" />
          {!collapsed && <span className="nav-label">Help Center</span>}
        </Nav.Link>

        <Nav.Link
          className="sidebar-nav-link"
          onClick={() => handleNavigation(() => onNavigate('support'))}
        >
          <HelpCircle size={18} className="nav-icon" />
          {!collapsed && <span className="nav-label">Support</span>}
        </Nav.Link>

        <Nav.Link
          className="sidebar-nav-link"
          onClick={() => handleNavigation(() => onNavigate('profile-settings'))}
        >
          <Settings size={18} className="nav-icon" />
          {!collapsed && <span className="nav-label">Profile Settings</span>}
        </Nav.Link>

        <Nav.Link className="sidebar-nav-link logout-link" onClick={onLogout}>
          <LogOut size={18} className="nav-icon" />
          {!collapsed && <span className="nav-label">Logout</span>}
        </Nav.Link>
      </div>

      <style>{`
        .sidebar {
          width: 280px;
          height: calc(100vh - 64px);
          background: #ffffff;
          color: #1e293b;
          position: fixed;
          left: 0;
          top: 64px;
          z-index: 1050;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          overflow-x: hidden;
          border-right: 1px solid #e2e8f0;
          box-shadow: 4px 0 10px rgba(0, 0, 0, 0.05);
        }

        .sidebar.collapsed {
          width: 70px;
        }

        @media (max-width: 992px) {
          .sidebar {
            width: 280px;
            left: -280px;
            top: 64px;
            height: calc(100vh - 64px);
            height: calc(100dvh - 64px);
            z-index: 1060;
            padding-bottom: 80px;
            -webkit-overflow-scrolling: touch;
          }
          .sidebar.show {
            left: 0;
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.15);
          }
        }

        /* Profile Section Premium Styles */
        .sidebar-profile-section {
          padding: 1.5rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(to bottom, #ffffff, #f8fafc);
        }

        .profile-container {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .profile-avatar-wrapper {
          flex-shrink: 0;
        }

        .avatar-circle {
          width: 40px;
          height: 40px;
          background: #eff6ff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dbeafe;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
          overflow: hidden;
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder-icon {
          color: #2563eb;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .profile-name-text {
          font-weight: 700;
          font-size: 0.875rem;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          margin-bottom: 2px;
        }

        .profile-role-badge {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .collapse-toggle-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .collapse-toggle-btn:hover {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .sidebar.collapsed .sidebar-profile-section {
          padding: 1.5rem 0.75rem;
          justify-content: center;
        }

        .sidebar.collapsed .avatar-circle {
          width: 36px;
          height: 36px;
        }

        /* Navigation Menu Premium Styles */
        .sidebar-nav {
          flex: 1;
          padding: 1rem 0.75rem;
        }

        .sidebar-nav-link {
          color: #475569 !important;
          text-decoration: none !important;
          padding: 0.75rem 1rem;
          margin-bottom: 0.25rem;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          font-weight: 500;
          font-size: 0.875rem;
          border: none !important;
        }

        .sidebar-nav-link:hover {
          background: #f8fafc;
          color: #2563eb !important;
          transform: translateX(4px);
        }

        .sidebar-nav-link.active {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          font-weight: 600;
        }

        .nav-icon {
          color: #94a3b8;
          transition: all 0.2s;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .sidebar-nav-link:hover .nav-icon {
          color: #2563eb;
          transform: scale(1.1);
        }

        .sidebar-nav-link.active .nav-icon {
          color: white;
        }

        .sidebar.collapsed .nav-icon {
          margin-right: 0;
        }

        .nav-item-content {
          display: flex;
          align-items: center;
          width: 100%;
          justify-content: space-between;
        }

        .nav-item-left {
          display: flex;
          align-items: center;
          min-width: 0;
          flex: 1;
        }

        .nav-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-item-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .sidebar-nav-link:hover .nav-item-right {
          color: #2563eb;
        }

        .sidebar-nav-link.active .nav-item-right {
          color: white;
        }

        .submenu {
          margin-left: 2rem;
          margin-bottom: 0.5rem;
          border-left: 1px solid #f1f5f9;
          padding-left: 0.5rem;
        }

        .submenu-item {
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem !important;
          margin-bottom: 0.125rem;
        }

        /* Quick Actions Premium Styles */
        .quick-actions {
          padding: 1.25rem 0.75rem;
          border-top: 1px solid #f1f5f9;
          background: #fcfdfe;
        }

        .section-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-left: 1rem;
        }

        .quick-action-buttons {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
        }

        .quick-btn {
          background: white;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .quick-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .sidebar-footer {
          padding: 1rem 0.75rem;
          border-top: 1px solid #f1f5f9;
        }

        .logout-link {
          color: #ef4444 !important;
          margin-top: 0.5rem;
        }

        .logout-link:hover {
          background: #fef2f2 !important;
          color: #dc2626 !important;
        }

        .logout-link .nav-icon {
          color: #f87171;
        }

        .logout-link:hover .nav-icon {
          color: #dc2626;
        }

        /* Scrollbar Styling */
        .sidebar::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>



    </div>
  );
}

export default Sidebar;




