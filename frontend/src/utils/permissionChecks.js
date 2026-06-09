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

// Role-based module access - every role can access their assigned modules
const ROLE_MODULE_ACCESS = {
  super_admin: ['all'],
  company_admin: ['all'],
  admin: ['all'],
  sales_manager: ['sales', 'leads', 'clients', 'proforma_invoices', 'proforma_orders', 'products', 'catalogues', 'qc_records'],
  sales_executive: ['sales', 'leads', 'clients', 'proforma_invoices', 'proforma_orders', 'products', 'qc_records'],
  administration: ['users', 'clients', 'companies', 'account_entries', 'products'],
  qc: ['qc_records', 'products'],
  qc_inspector: ['qc_records', 'products'],
  account: ['account_entries', 'invoices', 'proforma_invoices', 'export_management'],
  purchase_manager: ['suppliers', 'proforma_orders', 'products', 'inventory'],
  inventory_manager: ['products', 'inventory', 'qc_records'],
  production_manager: ['proforma_orders', 'qc_records', 'products', 'production'],
  export_documents: ['export_management', 'packing_lists', 'products'],
  client: ['clients', 'proforma_invoices', 'proforma_orders'],
};

export const canEditDocument = (currentUser) => {
  if (!currentUser || !currentUser.role) {
    return false;
  }
  
  const allowedRoles = [
    'super_admin', 'company_admin', 'admin', 'sales_manager', 'sales_executive',
    'administration', 'account', 'purchase_manager', 'inventory_manager',
    'production_manager', 'export_documents', 'qc', 'qc_inspector',
  ];
  return allowedRoles.includes(currentUser.role);
};

export const canDeleteDocument = (currentUser) => {
  if (!currentUser || !currentUser.role) {
    return false;
  }
  
  const allowedRoles = ['super_admin', 'company_admin', 'admin'];
  return allowedRoles.includes(currentUser.role);
};

export const canApproveDocument = (currentUser) => {
  if (!currentUser || !currentUser.role) {
    return false;
  }
  
  const allowedRoles = ['super_admin', 'company_admin', 'sales_manager'];
  return allowedRoles.includes(currentUser.role);
};

export const canViewDocument = (currentUser) => {
  return !!currentUser && currentUser.role;
};

export const hasModuleAccess = (currentUser, module) => {
  if (!currentUser || !currentUser.role) {
    return false;
  }
  
  const allowedModules = ROLE_MODULE_ACCESS[currentUser.role] || [];
  
  // If role has 'all', grant access to everything
  if (allowedModules.includes('all')) {
    return true;
  }
  
  // Check if the module is in the allowed list (normalize module name)
  const normalizedModule = module?.toLowerCase().replace(/\s+/g, '_');
  return allowedModules.some(m => normalizedModule.includes(m) || m.includes(normalizedModule));
};

export const getDocumentPermissions = (currentUser) => {
  return {
    canView: canViewDocument(currentUser),
    canEdit: canEditDocument(currentUser),
    canDelete: canDeleteDocument(currentUser),
    canApprove: canApproveDocument(currentUser),
  };
};
