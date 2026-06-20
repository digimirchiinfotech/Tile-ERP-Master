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

import { AppError } from './errorHandler.js';

// Permission definitions
const PERMISSIONS = {
  // Core
  ALL: 'all',
  USER_MANAGEMENT: 'user_management',
  COMPANY_MANAGEMENT: 'company_management',
  SUBSCRIPTION_MANAGEMENT: 'subscription_management',
  
  // CRM
  LEAD_MANAGEMENT: 'lead_management',
  CLIENT_MANAGEMENT: 'client_management',
  SUPPLIER_MANAGEMENT: 'supplier_management',
  
  // Products
  PRODUCT_MANAGEMENT: 'product_management',
  CATALOGUE_MANAGEMENT: 'catalogue_management',
  
  // Sales
  PROFORMA_INVOICE: 'proforma_invoice',
  PROFORMA_ORDER: 'proforma_order',
  CLIENT_ORDER: 'client_order',
  
  // Operations
  QC_MANAGEMENT: 'qc_management',
  PACKING_LIST_MANAGEMENT: 'packing_list_management',
  PALLET_MANAGEMENT: 'pallet_management',
  INVOICE_PACKING: 'invoice_packing',
  
  // Export
  EXPORT_MANAGEMENT: 'export_management',
  
  // Finance
  ACCOUNT_FINANCE: 'account_finance',
  
  // Admin
  SALESPERSON_MANAGEMENT: 'salesperson_management',
  CLIENT_PORTAL: 'client_portal',
  MASTER_DATA_MANAGEMENT: 'master_data_management',
  INVENTORY_MANAGEMENT: 'inventory_management',
  PRODUCTION_MANAGEMENT: 'production_management',
};

// Role to permissions mapping
export const rolePermissions = {
  super_admin: [PERMISSIONS.ALL],
  company_admin: [PERMISSIONS.ALL],
  // admin has broad but scoped permissions — NOT "ALL" to preserve audit separation
  admin: [
    PERMISSIONS.USER_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT,
    PERMISSIONS.CLIENT_MANAGEMENT,
    PERMISSIONS.SUPPLIER_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.PROFORMA_INVOICE,
    PERMISSIONS.PROFORMA_ORDER,
    PERMISSIONS.CLIENT_ORDER,
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.EXPORT_MANAGEMENT,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
    PERMISSIONS.PALLET_MANAGEMENT,
    PERMISSIONS.INVOICE_PACKING,
    PERMISSIONS.ACCOUNT_FINANCE,
    PERMISSIONS.SALESPERSON_MANAGEMENT,
    PERMISSIONS.MASTER_DATA_MANAGEMENT,
    PERMISSIONS.INVENTORY_MANAGEMENT,
    PERMISSIONS.PRODUCTION_MANAGEMENT,
    'reports_analytics'
  ],
  sales_manager: [
    PERMISSIONS.LEAD_MANAGEMENT,
    PERMISSIONS.CLIENT_MANAGEMENT,
    PERMISSIONS.CLIENT_ORDER,
    PERMISSIONS.SUPPLIER_MANAGEMENT,
    PERMISSIONS.PROFORMA_INVOICE,
    PERMISSIONS.PROFORMA_ORDER,
    PERMISSIONS.SALESPERSON_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.EXPORT_MANAGEMENT,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
    // ACCOUNT_FINANCE removed: segregation of duties requires finance & sales separation
    PERMISSIONS.MASTER_DATA_MANAGEMENT,
    'reports_analytics'
  ],
  sales_executive: [
    PERMISSIONS.LEAD_MANAGEMENT,
    PERMISSIONS.CLIENT_MANAGEMENT,
    PERMISSIONS.CLIENT_ORDER,
    PERMISSIONS.PROFORMA_INVOICE,
    PERMISSIONS.PROFORMA_ORDER,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.MASTER_DATA_MANAGEMENT,
    'reports_analytics'
  ],
  qc: [
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.PROFORMA_INVOICE
  ],
  qc_inspector: [
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.PROFORMA_INVOICE
  ],
  export_documents: [
    PERMISSIONS.EXPORT_MANAGEMENT,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.PROFORMA_INVOICE,
    PERMISSIONS.MASTER_DATA_MANAGEMENT
  ],
  account: [
    PERMISSIONS.ACCOUNT_FINANCE,
    PERMISSIONS.INVOICE_PACKING,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
    PERMISSIONS.EXPORT_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT
  ],
  purchase_manager: [
    PERMISSIONS.PROFORMA_ORDER,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.SUPPLIER_MANAGEMENT,
    PERMISSIONS.PALLET_MANAGEMENT,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
    PERMISSIONS.MASTER_DATA_MANAGEMENT,
    PERMISSIONS.INVENTORY_MANAGEMENT,
  ],
  inventory_manager: [
    PERMISSIONS.INVENTORY_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.MASTER_DATA_MANAGEMENT,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
  ],
  production_manager: [
    PERMISSIONS.PRODUCTION_MANAGEMENT,
    PERMISSIONS.PROFORMA_ORDER,
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.PALLET_MANAGEMENT,
    PERMISSIONS.MASTER_DATA_MANAGEMENT,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
  ],
  administration: [
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.QC_MANAGEMENT,
    PERMISSIONS.PALLET_MANAGEMENT,
    PERMISSIONS.EXPORT_MANAGEMENT,
    PERMISSIONS.PACKING_LIST_MANAGEMENT,
    PERMISSIONS.MASTER_DATA_MANAGEMENT
  ],
  client: [
    PERMISSIONS.CLIENT_PORTAL,
    PERMISSIONS.CLIENT_ORDER,
    PERMISSIONS.CATALOGUE_MANAGEMENT,
    PERMISSIONS.PRODUCT_MANAGEMENT,
    PERMISSIONS.PROFORMA_INVOICE
    // MASTER_DATA_MANAGEMENT removed: clients must not be able to modify system master data
  ]
};

// Middleware to restrict access to Super Admin and Company Admin only
export const requireAdminRole = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401));
  }
  
  if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
    return next(new AppError('Only Super Admin, Company Admin or Admin can perform this action', 403));
  }
  
  next();
};

// Middleware to check if user has required permission
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const role = req.user.role;

    // Super admin, company_admin, and admin always have all permissions
    if (['super_admin', 'company_admin', 'admin'].includes(role)) {
      return next();
    }

    // Get role-based permissions from mapping
    const rolePerms = rolePermissions[role] || [];

    // Check if role has 'all' permission
    if (rolePerms.includes(PERMISSIONS.ALL)) {
      return next();
    }

    // Check if user's role has any of the required permissions
    const hasPermission = requiredPermissions.some(permission =>
      rolePerms.includes(permission)
    );

    if (!hasPermission) {
      return next(new AppError(`You do not have permission to perform this action. Required: ${requiredPermissions.join(', ')}`, 403));
    }

    next();
  };
};

// Middleware to check if user has specific role
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have the required role to access this resource', 403));
    }

    next();
  };
};

// Check if user can access specific company data (multi-tenancy check)
export const requireCompanyAccess = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  // Get company ID from request (params, query, or body)
  const targetCompanyId = req.params.companyId || req.query.companyId || req.body.companyId;

  // Use the validated companyFilter from auth middleware
  // If companyFilter is set (regular user or super_admin with context),
  // it MUST match the target company if one is specified.
  if (req.companyFilter) {
    if (targetCompanyId && targetCompanyId !== req.companyFilter) {
      // Use 404 for security stealth as requested
      return next(new AppError('Resource not found or unauthorized', 404));
    }
  } else if (req.user.role !== 'super_admin') {
    // Regular user MUST have a companyFilter
    return next(new AppError('Tenant context missing', 403));
  }

  // For Super Admin with req.companyFilter === null, we allow access to global routes
  // Transactional routes should generally be protected by filterByCompany which sets req.companyFilter

  next();
};

// Check if user owns the resource (for salesperson management)
export const requireOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Super admin, company admin, and admin can access all
    if (['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Check if resource belongs to user
    const resourceUserId = req.params[userIdField] || req.query[userIdField];

    if (resourceUserId && resourceUserId !== req.user.id) {
      return next(new AppError('You can only access your own resources', 403));
    }

    next();
  };
};

export { PERMISSIONS };
