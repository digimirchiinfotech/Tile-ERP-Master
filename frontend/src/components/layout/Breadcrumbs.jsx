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

import { Breadcrumb } from 'react-bootstrap';
import { Home } from 'lucide-react';

const VIEW_CONFIG = {
  'dashboard': { label: 'Dashboard' },
  'super-admin-dashboard': { label: 'Super Admin Dashboard' },
  'company-management': { label: 'Company Management', parent: 'super-admin-dashboard' },
  'subscription-management': { label: 'Subscription Management', parent: 'super-admin-dashboard' },
  'reports-analytics': { label: 'Reports & Analytics', parent: 'super-admin-dashboard' },
  'master-data-management': { label: 'Master Data', parent: 'super-admin-dashboard' },
  'system-settings': { label: 'System Settings', parent: 'super-admin-dashboard' },
  'super-admin-tickets': { label: 'Support Tickets', parent: 'super-admin-dashboard' },
  'invoice-dashboard': { label: 'Proforma Invoices' },
  'invoice-form': { label: 'Invoice Form', parent: 'invoice-dashboard' },
  'order-dashboard': { label: 'Proforma Orders' },
  'order-form': { label: 'Order Form', parent: 'order-dashboard' },
  'user-management': { label: 'User Management' },
  'product-management': { label: 'Products' },
  'catalogue-management': { label: 'Catalogues' },
  'lead-management': { label: 'Leads' },
  'qc-management': { label: 'Quality Control' },
  'client-management': { label: 'Clients' },
  'supplier-management': { label: 'Suppliers' },
  'client-order-management': { label: 'Client Orders' },

  'invoice-management': { label: 'Invoice Management' },
  'account-finance-management': { label: 'Accounts & Finance' },
  'salesperson-management': { label: 'Salespersons' },
  'packing-list-management': { label: 'Packing Lists' },
  'packing-list-form': { label: 'Packing List Form', parent: 'packing-list-management' },
  'export-management': { label: 'Export Overview' },
  'export-shipping-instructions': { label: 'Shipping Instructions', parent: 'export-management' },

  'export-invoice': { label: 'Export Invoices' },
  'export-invoice-form': { label: 'Export Invoice Form', parent: 'export-invoice' },
  'export-invoice-annexure': { label: 'Invoice Annexures', parent: 'export-invoice' },
  'export-invoice-annexure-form': { label: 'Annexure Form', parent: 'export-invoice-annexure' },
  'invoice-backside': { label: 'Invoice Backside', parent: 'export-invoice' },
  'invoice-backside-dashboard': { label: 'Invoice Backside', parent: 'export-invoice' },
  'invoice-backside-form': { label: 'Backside Form', parent: 'invoice-backside' },
  'vgm': { label: 'VGM' },
  'vgm-form': { label: 'VGM Form', parent: 'vgm' },
  'erp-flowchart': { label: 'ERP Flowchart' },
  'analytics': { label: 'Analytics' },
  'messages': { label: 'Messages' },
  'notifications': { label: 'Notifications' },
  'profile': { label: 'Profile Settings' },
  'support': { label: 'Support' },
  'support-ticket-form': { label: 'New Ticket', parent: 'support' },
  'pdf-template-customizer': { label: 'PDF Templates', parent: 'system-settings' },
};

const Breadcrumbs = ({ currentView, currentUser, onNavigate }) => {
  const buildCrumbs = (view) => {
    const isCompanyAdmin = currentUser?.role === 'company_admin';
    const homeLabel = isCompanyAdmin ? 'Company Home' : 'Home';
    const adminDashboardLabel = isCompanyAdmin ? 'Company Dashboard' : 'Super Admin Dashboard';

    const getHomeView = () => {
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

    const crumbs = [{ label: homeLabel, view: getHomeView(), icon: Home }];
    if (view === 'dashboard' || view === 'super-admin-dashboard') {
       if (view === 'super-admin-dashboard' && isCompanyAdmin) {
          // If somehow on super-admin-dashboard view as company_admin, show company dashboard label
          return [{ label: homeLabel, view: 'dashboard', icon: Home }, { label: adminDashboardLabel, view: 'dashboard' }];
       }
       return crumbs;
    }

    const chain = [];
    let current = view;
    while (current && VIEW_CONFIG[current]) {
      let label = VIEW_CONFIG[current].label;
      if (current === 'super-admin-dashboard') {
        label = adminDashboardLabel;
      }
      
      chain.unshift({ label, view: current });
      current = VIEW_CONFIG[current].parent;
    }

    if (chain.length === 0) {
      chain.push({
        label: view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        view
      });
    }

    return [...crumbs, ...chain];
  };

  const crumbs = buildCrumbs(currentView);

  return (
    <Breadcrumb className="mb-3">
      {crumbs.map((crumb, index) => (
        <Breadcrumb.Item
          key={index}
          active={index === crumbs.length - 1}
          onClick={() => index < crumbs.length - 1 && onNavigate(crumb.view)}
          style={index < crumbs.length - 1 ? { cursor: 'pointer' } : {}}
        >
          {crumb.icon && (
            (() => {
              const IconComponent = crumb.icon;
              return <IconComponent size={14} className="me-1" />;
            })()
          )}
          {crumb.label}
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  );
};

export default Breadcrumbs;
