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

import React, { Suspense } from 'react';
import SimpleLoginForm from '../auth/SimpleLoginForm.jsx';
import ForgotPasswordForm from '../auth/ForgotPasswordForm.jsx';
import ResetPasswordForm from '../auth/ResetPasswordForm.jsx';
import SearchResults from './SearchResults.jsx';
import AccessDenied from './AccessDenied.jsx';
import NotFound from './NotFound.jsx';

// Legal Components
const TermsAndConditions = React.lazy(() => import('../legal/TermsAndConditions.jsx'));
const PrivacyPolicy = React.lazy(() => import('../legal/PrivacyPolicy.jsx'));

// Dashboard Components
const SuperAdminDashboard = React.lazy(() => import('../super-admin/SuperAdminDashboard.jsx'));
const CompanyManagement = React.lazy(() => import('../super-admin/CompanyManagement.jsx'));
const SubscriptionManagement = React.lazy(() => import('../super-admin/SubscriptionManagement.jsx'));
const ReportsAnalytics = React.lazy(() => import('../super-admin/ReportsAnalytics.jsx'));
const MasterDataManagement = React.lazy(() => import('../super-admin/MasterDataManagement.jsx'));
const SizePackingMaster = React.lazy(() => import('../super-admin/SizePackingMaster.jsx'));
const SystemSettings = React.lazy(() => import('../super-admin/SystemSettings.jsx'));
const SessionManagement = React.lazy(() => import('../super-admin/SessionManagement.jsx'));
const SuperAdminTickets = React.lazy(() => import('../support/SuperAdminTickets.jsx'));

// Module Components
const InvoiceDashboard = React.lazy(() => import('../proforma-invoice/InvoiceDashboard.jsx'));
const InvoiceForm = React.lazy(() => import('../proforma-invoice/InvoiceForm.jsx'));
const OrderDashboard = React.lazy(() => import('../proforma-order/OrderDashboard.jsx'));
const OrderForm = React.lazy(() => import('../proforma-order/OrderForm.jsx'));
const UserDashboard = React.lazy(() => import('../user-management/UserDashboard.jsx'));
const ProductDashboard = React.lazy(() => import('../product-management/ProductDashboard.jsx'));
const CatalogueDashboard = React.lazy(() => import('../catalogue-management/CatalogueDashboard.jsx'));
const LeadDashboard = React.lazy(() => import('../lead-management/LeadDashboard.jsx'));
const QCDashboard = React.lazy(() => import('../qc-management/QCDashboard.jsx'));
const ClientDashboard = React.lazy(() => import('../client-management/ClientDashboard.jsx'));
const SupplierDashboard = React.lazy(() => import('../supplier-management/SupplierDashboard.jsx'));
const ClientOrderDashboard = React.lazy(() => import('../client-order-management/ClientOrderDashboard.jsx'));

const InvoiceManagementDashboard = React.lazy(() => import('../invoice-management/InvoiceDashboard.jsx'));
const AccountFinanceDashboard = React.lazy(() => import('../account-finance-management/AccountFinanceDashboard.jsx'));
const SalespersonDashboard = React.lazy(() => import('../salesperson-management/SalespersonDashboard.jsx'));
const PackingListDashboard = React.lazy(() => import('../export-management/PackingList/PackingListDashboard.jsx'));
const PackingListForm = React.lazy(() => import('../export-management/PackingList/PackingListForm.jsx'));
const SupportDashboard = React.lazy(() => import('../support/SupportDashboard.jsx'));
const ProfileSettings = React.lazy(() => import('../profile/ProfileSettings.jsx'));
const CompanyProfile = React.lazy(() => import('../profile/CompanyProfile.jsx'));
const NotificationsPage = React.lazy(() => import('../notifications/NotificationsPage.jsx'));
const HelpCenter = React.lazy(() => import('./HelpCenter.jsx'));

const ERPFlowchart = React.lazy(() => import('./ERPFlowchart.jsx'));

// Sanitaryware Components
const SanitarywareProductDashboard = React.lazy(() => import('../sanitaryware-product-management/SanitarywareProductDashboard.jsx'));
const SanitarywareMasterDataManagement = React.lazy(() => import('../super-admin/SanitarywareMasterDataManagement.jsx'));

// Operations & Production Planning
const OrderSheetDashboard = React.lazy(() => import('../operations/OrderSheetDashboard.jsx'));
const ProductionPlanningDashboard = React.lazy(() => import('../operations/ProductionPlanningDashboard.jsx'));
const InventoryDashboard = React.lazy(() => import('../inventory/InventoryDashboard.jsx'));

// Export Management Components

const ExportOverviewPage = React.lazy(() => import('../export-management/ExportOverviewPage.jsx'));
const ShippingInstructionsDashboard = React.lazy(() => import('../export-management/ShippingInstructions/ShippingInstructionsDashboard.jsx'));
const ExportInvoiceDashboard = React.lazy(() => import('../export-management/Invoice/ExportInvoiceDashboard.jsx'));
const ExportInvoiceForm = React.lazy(() => import('../export-management/Invoice/ExportInvoiceForm.jsx'));
const ExportInvoiceAnnexureDashboard = React.lazy(() => import('../export-management/Annexure/ExportInvoiceAnnexureDashboard.jsx'));
const ExportInvoiceAnnexureForm = React.lazy(() => import('../export-management/Annexure/ExportInvoiceAnnexureForm.jsx'));
const InvoiceBacksideDashboard = React.lazy(() => import('../export-management/Backside/InvoiceBacksideDashboard.jsx'));
const InvoiceBacksideForm = React.lazy(() => import('../export-management/Backside/InvoiceBacksideForm.jsx'));
const VGMDashboard = React.lazy(() => import('../export-management/VGM/VGMDashboard.jsx'));
const VGMForm = React.lazy(() => import('../export-management/VGM/VGMForm.jsx'));
const ShippingInstructionsForm = React.lazy(() => import('../export-management/ShippingInstructions/ShippingInstructionsForm.jsx'));
const AuditLogViewer = React.lazy(() => import('../system-settings/AuditLogViewer.jsx'));
const IGSTInvoiceDashboard = React.lazy(() => import('../export-management/IGSTInvoice/IGSTInvoiceDashboard.jsx'));
const IGSTInvoiceForm = React.lazy(() => import('../export-management/IGSTInvoice/IGSTInvoiceForm.jsx'));

import RoleBasedDashboard from './RoleBasedDashboard.jsx';
import { rolePermissions } from '../../config/rolePermissions.js';
import ErrorBoundary from './ErrorBoundary.jsx';

/**
 * AppRouter component handles the conditional rendering of views
 * based on the currentView state and user permissions.
 */

class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  
  componentDidMount() {
    // Clear the reload flag on successful mount
    sessionStorage.removeItem('chunk_error_reloaded');
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown error',
    };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Module loading error:', error, errorInfo);
    const isChunkError = /fetch|dynamically imported|Loading chunk|Failed to fetch/i.test(error?.message || '');
    
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_error_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_error_reloaded', 'true');
        // Give it a tiny delay to ensure logs are written
        setTimeout(() => {
          window.location.reload(true);
        }, 500);
      }
    }
  }
  
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }
  
  render() {
    if (this.state.hasError) {
      const isChunkError = /fetch|dynamically imported|Loading chunk|Failed to fetch/i.test(this.state.errorMessage);
      return (
        <div className="p-5 text-center mt-5">
          <h4 className="text-danger">Failed to load module</h4>
          <p className="text-muted mb-2">
            {isChunkError
              ? 'The page module could not be loaded due to a recent update. Refreshing automatically...'
              : 'Something went wrong while rendering this page.'}
          </p>
          <p className="text-danger small mb-3">{this.state.errorMessage}</p>
          <div className="d-flex gap-2 justify-content-center">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            >
              Try Again
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
const AppRouter = ({ 
  currentView, 
  currentUser, 
  handleNavigate, 
  handleLogin,
  searchResults,
  searchQuery,
  setSearchResults,
  setCurrentView,
  showForgotPassword,
  setShowForgotPassword,
  resetPasswordData,
  setResetPasswordData,
  getDashboardForRole,
  showSuccess,
  showError
}) => {

  /**
   * Check if user has permission to access a view
   */
  const hasPermissionForView = (view) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    if (['company_admin', 'admin'].includes(currentUser.role)) return true;
    
    const viewPermissions = {
      'super-admin-dashboard': ['all'],
      'company-management': ['all'],
      'subscription-management': ['all'],
      'session-management': ['all'],
      'reports-analytics': ['all', 'company_all', 'reports_analytics', 'company_admin', 'sales_manager', 'sales_executive', 'purchase_manager', 'administration'],
      'master-data-management': ['all', 'company_all', 'master_data_management'],
      'size-packing-master': ['all', 'company_all', 'master_data_management'],
      'system-settings': ['all'],
      'super-admin-tickets': ['all'],
      'dashboard': [],
      'invoice-dashboard': ['all', 'company_all', 'proforma_invoice'],
      'invoice-form': ['all', 'company_all', 'proforma_invoice'],
      'order-dashboard': ['all', 'company_all', 'proforma_order'],
      'order-form': ['all', 'company_all', 'proforma_order'],
      'user-management': ['all', 'company_all', 'user_management'],
      'product-management': ['all', 'company_all', 'product_management'],
      'sanitaryware-product-management': ['all', 'company_all', 'sanitaryware_management', 'product_management'],
      'sanitaryware-master-data': ['all', 'company_all', 'sanitaryware_management', 'master_data_management'],
      'catalogue-management': ['all', 'company_all', 'catalogue_management'],
      'lead-management': ['all', 'company_all', 'lead_management'],
      'qc-management': ['all', 'company_all', 'qc_management'],
      'order-sheet-dashboard': ['all', 'company_all', 'qc_management', 'production_management', 'proforma_order'],
      'production-planning-dashboard': ['all', 'company_all', 'qc_management', 'production_management', 'proforma_order'],
      'inventory-dashboard': ['all', 'company_all', 'inventory_management', 'product_management'],
      'client-management': ['all', 'company_all', 'client_management', 'client'],
      'supplier-management': ['all', 'company_all', 'supplier_management', 'purchase_manager'],
      'client-order-management': ['all', 'company_all', 'client_order', 'client'],

      'invoice-management': ['all', 'company_all', 'export_management', 'export_documents'],
      'account-finance-management': ['all', 'company_all', 'account_finance'],
      'salesperson-management': ['all', 'company_all', 'salesperson_management'],
      'packing-list-management': ['all', 'company_all', 'export_management', 'export_documents'],
      'export-management': ['all', 'company_all', 'export_management', 'export_documents'],
      'export-shipping-instructions': ['all', 'company_all', 'export_management', 'export_documents'],
      'shipping-instructions-form': ['all', 'company_all', 'export_management', 'export_documents'],
      'export-invoice': ['all', 'company_all', 'export_management', 'export_documents'],
      'export-invoice-form': ['all', 'company_all', 'export_management', 'export_documents'],
      'export-invoice-annexure': ['all', 'company_all', 'export_management', 'export_documents'],
      'export-invoice-annexure-form': ['all', 'company_all', 'export_management', 'export_documents'],
      'invoice-backside': ['all', 'company_all', 'export_management', 'export_documents'],
      'invoice-backside-dashboard': ['all', 'company_all', 'export_management', 'export_documents'],
      'invoice-backside-form': ['all', 'company_all', 'export_management', 'export_documents'],
      'vgm': ['all', 'company_all', 'export_management', 'export_documents'],
      'vgm-form': ['all', 'company_all', 'export_management', 'export_documents'],
      'igst-invoice': ['all', 'company_all', 'export_management', 'export_documents'],
      'igst-invoice-form': ['all', 'company_all', 'export_management', 'export_documents'],
      'packing-list-form': ['all', 'company_all', 'export_management', 'export_documents'],
      'erp-flowchart': [],
      'support': [],
      'profile': [],
      'profile-settings': [],
      'company-profile': ['all', 'company_all', 'company_admin'],
      'settings': [],
      'audit-logs': ['all'],
      'notifications': [],
      'help-center': [],
      'search-results': [],
      'terms': [],
      'privacy': [],

      'access-denied': [],
    };

    const requiredPermissions = viewPermissions[view];
    if (requiredPermissions === undefined) return 'not_found';
    if (requiredPermissions.length === 0) return true;
    
    const userPerms = rolePermissions[currentUser.role] || [];
    if (userPerms.includes('all')) return true;
    
    // If view requires company_all (most modules), and user has company_all, allow access
    if (requiredPermissions.includes('company_all') && userPerms.includes('company_all')) return true;

    if (requiredPermissions.includes(currentUser.role)) return true;
    
    return requiredPermissions.some((perm) => userPerms.includes(perm));
  };

  /**
   * Helper to restrict access based on company-enabled modules
   */
  const renderWithAccess = (moduleKey, component) => {
    if (!currentUser) return null;
    if (currentUser.role === 'super_admin' || currentUser.role === 'company_admin' || currentUser.role === 'admin') return component;
    
    const permissionToModuleMap = {
      'invoice_packing': 'export_management',
      'packing_list_management': 'export_management',
      'export_management': 'export_management',
      'proforma_invoice': 'proforma_invoice',
      'proforma_order': 'proforma_order',
      'lead_management': 'lead_management',
      'client_management': 'client_management',
      'product_management': 'product_management',
      'sanitaryware_management': 'sanitaryware_management',
      'catalogue_management': 'catalogue_management',
      'qc_management': 'qc_management',
      'inventory_management': 'inventory_management',
      'production_management': 'production_management',

      'account_finance': 'account_finance',
      'user_management': 'user_management',
      'salesperson_management': 'user_management',
      'supplier_management': 'supplier_management',
      'client_order': 'client_management', 
    };

    const mappedKey = permissionToModuleMap[moduleKey] || moduleKey;
    let isEnabled = false;
    
    if (currentUser.enabledModules && Array.isArray(currentUser.enabledModules)) {
      isEnabled = currentUser.enabledModules.includes(mappedKey);
      if (!isEnabled && moduleKey === 'supplier_management') {
         isEnabled = currentUser.enabledModules.includes('proforma_order');
      }
    }
    
    const autoEnabledModules = [
      'reports_analytics',
      'inventory_management',
      'production_management',
      'master_data_management',
    ];
    if (autoEnabledModules.includes(mappedKey)) {
      isEnabled = true;
    }

    if (currentUser.role === 'super_admin' || isEnabled) {
      return component;
    } else {
      return (
        <AccessDenied 
          currentUser={currentUser} 
          currentRole={currentUser.role}
          message={`The "${moduleKey.replace(/_/g, ' ')}" module is not enabled for your company. Please contact your administrator.`}
          onBack={() => handleNavigate(getDashboardForRole(currentUser.role))}
        />
      );
    }
  };

  // 1. Auth Flow Rendering
  if (resetPasswordData && !currentUser) {
    return (
      <ResetPasswordForm
        emailId={resetPasswordData.emailId}
        token={resetPasswordData.token}
        onSuccess={() => {
          setResetPasswordData(null);
          setShowForgotPassword(false);
          window.history.replaceState({}, '', window.location.pathname);
          showSuccess('Password reset successful! Please sign in with your new password.');
        }}
        onBack={() => {
          setResetPasswordData(null);
          setShowForgotPassword(false);
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }
  
  if (showForgotPassword && !currentUser) {
    return (
      <ForgotPasswordForm
        onBack={() => setShowForgotPassword(false)}
      />
    );
  }
  
  if (!currentUser) {
    if (currentView === 'terms') {
      return <TermsAndConditions onBack={() => handleNavigate('login')} />;
    }
    if (currentView === 'privacy') {
      return <PrivacyPolicy onBack={() => handleNavigate('login')} />;
    }
    return (
      <SimpleLoginForm
        onLogin={handleLogin}
        onShowForgotPassword={() => setShowForgotPassword(true)}
        onNavigate={handleNavigate}
      />
    );
  }

  // 2. Permission Check
  const permissionStatus = currentView === 'access-denied' ? false : hasPermissionForView(currentView);

  if (permissionStatus === 'not_found') {
    return (
      <NotFound
        onBack={() => handleNavigate(getDashboardForRole(currentUser.role))}
      />
    );
  }

  if (currentView !== 'access-denied' && !permissionStatus) {
    return (
      <AccessDenied
        currentUser={currentUser}
        currentRole={currentUser.role}
        onBack={() => handleNavigate(getDashboardForRole(currentUser.role))}
      />
    );
  }

  if (currentView === 'access-denied') {
    return (
      <AccessDenied
        currentUser={currentUser}
        onBack={() => handleNavigate(getDashboardForRole(currentUser.role))}
      />
    );
  }

  // 3. View Routing
  const navigationData = JSON.parse(sessionStorage.getItem('navigationData') || '{}');

  const renderView = () => {
    switch (currentView) {
    case 'super-admin-dashboard':
      return <SuperAdminDashboard currentUser={currentUser} onNavigate={handleNavigate} />;
    
    case 'search-results':
      return (
        <SearchResults
          searchQuery={searchQuery}
          searchResults={searchResults || {}}
          onNavigate={handleNavigate}
          onBack={() => {
            setSearchResults(null);
            handleNavigate(getDashboardForRole(currentUser.role));
          }}
        />
      );

    case 'company-management': return <CompanyManagement currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'subscription-management': return <SubscriptionManagement currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'session-management': return <SessionManagement currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'terms': return <TermsAndConditions onBack={() => handleNavigate('help-center')} />;
    case 'privacy': return <PrivacyPolicy onBack={() => handleNavigate('help-center')} />;
    case 'reports-analytics': return <ReportsAnalytics currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'master-data-management': return <MasterDataManagement currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'size-packing-master': return <SizePackingMaster currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'sanitaryware-master-data': return <SanitarywareMasterDataManagement currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'settings':
    case 'system-settings': return <SystemSettings currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'super-admin-tickets': return <SuperAdminTickets currentUser={currentUser} onNavigate={handleNavigate} />;
    case 'audit-logs': return <AuditLogViewer currentUser={currentUser} onNavigate={handleNavigate} />;

    case 'dashboard':
      return <RoleBasedDashboard currentUser={currentUser} onNavigate={handleNavigate} />;

    case 'invoice-dashboard':
      return renderWithAccess('proforma_invoice',
        <InvoiceDashboard
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onAddNew={() => handleNavigate('invoice-form')}
          onEdit={(invoice) => handleNavigate('invoice-form', { invoice })}
        />
      );

    case 'invoice-form':
      return renderWithAccess('proforma_invoice',
        <InvoiceForm
          invoice={navigationData.invoice}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('invoice-dashboard')}
        />
      );

    case 'order-dashboard':
      return renderWithAccess('proforma_order',
        <OrderDashboard
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onAddNew={() => handleNavigate('order-form')}
          onEdit={(order) => handleNavigate('order-form', { order })}
        />
      );

    case 'order-form':
      return renderWithAccess('proforma_order',
        <OrderForm
          order={navigationData.order}
          currentUser={currentUser}
          onSave={() => handleNavigate('order-dashboard')}
          onCancel={() => handleNavigate('order-dashboard')}
          onBack={() => handleNavigate('order-dashboard')}
        />
      );

    case 'user-management':
      return renderWithAccess('user_management',
        <UserDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'product-management':
      return renderWithAccess('product_management',
        <ProductDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'sanitaryware-product-management':
      return renderWithAccess('product_management',
        <SanitarywareProductDashboard currentUser={currentUser} onNavigate={handleNavigate} />
      );

    case 'catalogue-management':
      return renderWithAccess('catalogue_management',
        <CatalogueDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'lead-management':
    case 'lead-form':
      return renderWithAccess('lead_management',
        <LeadDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'qc-management':
    case 'qc-form':
      return renderWithAccess('qc_management',
        <QCDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'order-sheet-dashboard':
      return renderWithAccess('qc_management',
        <OrderSheetDashboard currentUser={currentUser} onNavigate={handleNavigate} />
      );

    case 'production-planning-dashboard':
      return renderWithAccess('qc_management',
        <ProductionPlanningDashboard currentUser={currentUser} onNavigate={handleNavigate} />
      );

    case 'inventory-dashboard':
      return renderWithAccess('inventory_management',
        <InventoryDashboard currentUser={currentUser} onNavigate={handleNavigate} showSuccess={showSuccess} showError={showError} />
      );

    case 'client-management':
    case 'client-form':
      return renderWithAccess('client_management',
        <ClientDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'supplier-management':
    case 'supplier-form':
      return renderWithAccess('supplier_management',
        <SupplierDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'client-order-management':
      return renderWithAccess('client_order',
        <ClientOrderDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );



    case 'account-finance-management':
    case 'account-form':
      return renderWithAccess('account_finance',
        <AccountFinanceDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'invoice-management':
      return renderWithAccess('invoice_packing',
        <InvoiceManagementDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'salesperson-management':
      return renderWithAccess('user_management',
        <SalespersonDashboard currentUser={currentUser} onNavigate={handleNavigate} navigationData={navigationData} />
      );

    case 'packing-list-management':
      return renderWithAccess('packing_list_management',
        <PackingListDashboard currentUser={currentUser} onNavigate={handleNavigate} />
      );

    case 'packing-list-form':
      return renderWithAccess('packing_list_management',
        <PackingListForm
          packingList={navigationData.packingList}
          packingListId={navigationData.packingListId}
          exportInvoiceId={navigationData.exportInvoiceId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('packing-list-management')}
        />
      );

    case 'export-management':
      return renderWithAccess('export_management', <ExportOverviewPage currentUser={currentUser} onNavigate={handleNavigate} />);
    
    case 'export-shipping-instructions':
      return renderWithAccess('export_management', <ShippingInstructionsDashboard currentUser={currentUser} onNavigate={handleNavigate} />);
    
    case 'shipping-instructions-form':
      return renderWithAccess('export_management',
        <ShippingInstructionsForm
          exportInvoiceId={navigationData.exportInvoiceId}
          shippingInstruction={navigationData.shippingInstruction}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('export-shipping-instructions')}
        />
      );

    case 'export-invoice':
      return renderWithAccess('export_management', <ExportInvoiceDashboard currentUser={currentUser} onNavigate={handleNavigate} />);
    
    case 'export-invoice-form':
      return renderWithAccess('export_management',
        <ExportInvoiceForm
          invoice={navigationData.exportInvoice}
          invoiceId={navigationData.invoiceId}
          proformaId={navigationData.pi_id}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('export-invoice')}
        />
      );

    case 'export-invoice-annexure':
      return renderWithAccess('export_management', <ExportInvoiceAnnexureDashboard currentUser={currentUser} onNavigate={handleNavigate} />);
    
    case 'export-invoice-annexure-form':
      return renderWithAccess('export_management',
        <ExportInvoiceAnnexureForm
          exportInvoiceId={navigationData.exportInvoiceId}
          annexureId={navigationData.annexureId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('export-invoice-annexure')}
        />
      );

    case 'invoice-backside':
    case 'invoice-backside-dashboard':
      return renderWithAccess('export_management', <InvoiceBacksideDashboard currentUser={currentUser} onNavigate={handleNavigate} />);
    
    case 'invoice-backside-form':
      return renderWithAccess('export_management',
        <InvoiceBacksideForm
          exportInvoiceId={navigationData.exportInvoiceId}
          initialBacksideId={navigationData.backsideId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('invoice-backside')}
        />
      );

    case 'vgm':
      return renderWithAccess('export_management', <VGMDashboard currentUser={currentUser} onNavigate={handleNavigate} />);
    
    case 'vgm-form':
      return renderWithAccess('export_management',
        <VGMForm
          exportInvoiceId={navigationData.exportInvoiceId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('vgm')}
        />
      );

    case 'igst-invoice':
      return renderWithAccess('export_management', <IGSTInvoiceDashboard currentUser={currentUser} onNavigate={handleNavigate} />);
    
    case 'igst-invoice-form':
      return renderWithAccess('export_management',
        <IGSTInvoiceForm
          exportInvoiceId={navigationData.exportInvoiceId}
          isNew={navigationData.isNew}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('igst-invoice')}
        />
      );


    
    case 'erp-flowchart':
      return <ERPFlowchart onNavigate={handleNavigate} />;
    
    case 'support':
      return <SupportDashboard currentUser={currentUser} onNavigate={handleNavigate} />;
    
    case 'profile':
    case 'profile-settings':
      return <ProfileSettings currentUser={currentUser} onNavigate={handleNavigate} initialTab={navigationData?.tab} />;
    
    case 'company-profile':
      return <CompanyProfile currentUser={currentUser} onNavigate={handleNavigate} />;
    
    case 'notifications':
      return <NotificationsPage currentUser={currentUser} onNavigate={handleNavigate} />;

    case 'help-center':
      return <HelpCenter currentUser={currentUser} onNavigate={handleNavigate} />;

    default:
      return <NotFound onBack={() => handleNavigate(getDashboardForRole(currentUser.role))} />;
  }
  };

  const FallbackLoader = () => (
    <div className="d-flex flex-column justify-content-center align-items-center w-100" style={{ minHeight: '60vh' }}>
      <div className="spinner-border text-primary mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
        <span className="visually-hidden">Loading module...</span>
      </div>
      <h6 className="text-muted fw-normal">Loading module...</h6>
    </div>
  );

  return (
    <ModuleErrorBoundary resetKey={currentView}>
      <ErrorBoundary key={currentView}>
        <Suspense fallback={<FallbackLoader />}>
          {renderView()}
        </Suspense>
      </ErrorBoundary>
    </ModuleErrorBoundary>
  );
};

export default AppRouter;
