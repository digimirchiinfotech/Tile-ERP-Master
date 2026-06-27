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

export const rolePermissions = {
  super_admin: ['all'],
  company_admin: [
    'company_all',
    'user_management',
    'master_data_management',
    'lead_management',
    'client_management',
    'supplier_management',
    'product_management',
    'catalogue_management',
    'qc_management',
    'proforma_invoice',
    'proforma_order',
    'packing_list_management',
    'export_management',
    'pallet_management',
    'account_finance',
    'client_order',
    'salesperson_management',
    'inventory_management',
    'production_management',
    'reports_analytics',
  ],
  admin: [
    'company_all',
    'user_management',
    'master_data_management',
    'lead_management',
    'client_management',
    'supplier_management',
    'product_management',
    'catalogue_management',
    'qc_management',
    'proforma_invoice',
    'proforma_order',
    'packing_list_management',
    'export_management',
    'pallet_management',
    'account_finance',
    'client_order',
    'salesperson_management',
    'inventory_management',
    'production_management',
    'reports_analytics',
  ],
  sales_manager: [
    'lead_management',
    'client_management',
    'client_order',
    'supplier_management',
    'proforma_invoice',
    'proforma_order',
    'salesperson_management',
    'product_management',
    'catalogue_management',
    'qc_management',
    'export_management',
    'packing_list_management',
    'account_finance',
    'master_data_management',
    'reports_analytics'
  ],
  sales_executive: [
    'supplier_management',
    'proforma_order',
    'product_management',
    'catalogue_management',
    'qc_management',
    'master_data_management',
    'reports_analytics'
  ],
  qc: [
    'qc_management',
    'product_management',
    'catalogue_management',
    'proforma_invoice'
  ],
  qc_inspector: [
    'qc_management',
    'product_management',
    'catalogue_management',
    'proforma_invoice'
  ],
  account: [
    'account_finance',
    'invoice_packing',
    'packing_list_management',
    'export_management',
    'product_management',
    'catalogue_management'
  ],
  purchase_manager: [
    'proforma_order',
    'pallet_management',
    'product_management',
    'packing_list_management',
    'supplier_management',
    'export_management',
    'master_data_management',
    'inventory_management',
  ],
  inventory_manager: [
    'inventory_management',
    'product_management',
    'catalogue_management',
    'qc_management',
    'packing_list_management',
    'master_data_management',
  ],
  production_manager: [
    'production_management',
    'proforma_order',
    'qc_management',
    'product_management',
    'pallet_management',
    'packing_list_management',
    'master_data_management',
  ],
  administration: [
    'product_management',
    'catalogue_management',
    'qc_management',
    'pallet_management',
    'export_management',
    'packing_list_management',
    'master_data_management'
  ],
  export_documents: [
    'export_management',
    'packing_list_management',
    'product_management',
    'catalogue_management',
    'proforma_invoice',
    'master_data_management'
  ],
  client: [
    'client_order',
    'catalogue_management',
    'product_management',
    'proforma_invoice',
    'master_data_management'
  ]
};
