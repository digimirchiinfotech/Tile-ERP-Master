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

/**
 * Centralized Validation Configuration
 * Common validation rules and patterns
 */

export const VALIDATION_RULES = {
  // Email validation
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Phone numbers (international format)
  phone: /^\+?[\d\s-()]+$/,
  
  // URLs
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  
  // HS Code (6-8 digits)
  hsCode: /^\d{6,8}$/,
  
  // Currency (2 decimal places)
  currency: /^\d+(\.\d{1,2})?$/,
  
  // Percentage (0-100)
  percentage: /^(100|[0-9]?[0-9](\.\d{1,2})?)$/,
  
  // Country code (ISO 3166-1 alpha-2)
  countryCode: /^[A-Z]{2}$/,
};

export const VALIDATION_MESSAGES = {
  email: 'Please enter a valid email address',
  password: 'Password must contain 8+ characters with uppercase, lowercase, number and special character',
  phone: 'Please enter a valid phone number',
  url: 'Please enter a valid URL',
  hsCode: 'HS Code must be 6-8 digits',
  currency: 'Please enter a valid currency amount',
  percentage: 'Percentage must be between 0 and 100',
  countryCode: 'Please enter a valid 2-letter country code',
  required: 'This field is required',
  minLength: 'Minimum length is {min} characters',
  maxLength: 'Maximum length is {max} characters',
};

export const VALIDATION_LENGTHS = {
  // Text fields
  name: { min: 2, max: 255 },
  email: { min: 5, max: 255 },
  password: { min: 8, max: 128 },
  phone: { min: 10, max: 20 },
  description: { min: 10, max: 5000 },
  
  // Business fields
  companyName: { min: 2, max: 255 },
  clientName: { min: 2, max: 255 },
  productName: { min: 2, max: 255 },
  invoiceNo: { min: 3, max: 50 },
  orderNo: { min: 3, max: 50 },
};

export const ROLES = [
  'super_admin',
  'company_admin',
  'sales_manager',
  'sales_executive',
  'qc',
  'qc_inspector',
  'account',
  'purchase_manager',
  'administration',
  'export_documents',
  'client'
];

export const STATUS = ['Active', 'Inactive', 'Suspended', 'Pending'];

export const PERMISSIONS = [
  'user_management',
  'company_management',
  'subscription_management',
  'lead_management',
  'client_management',
  'supplier_management',
  'product_management',
  'catalogue_management',
  'proforma_invoice',
  'proforma_order',
  'client_order',
  'qc_management',
  'packing_list_management',
  'pallet_management',
  'invoice_packing',
  'export_management',
  'account_finance',
  'salesperson_management',
  'client_portal',
  'all'
];

export default {
  VALIDATION_RULES,
  VALIDATION_MESSAGES,
  VALIDATION_LENGTHS,
  ROLES,
  STATUS,
  PERMISSIONS
};
