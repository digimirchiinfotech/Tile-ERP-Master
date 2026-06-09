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

import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, filterByCompany, async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const companyId = req.companyFilter;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const isTenantContext = !!companyId;

    // Build the dynamic company filter
    const getQueryConfig = (table, conditions, limit = 10) => {
      let whereBase = '1=1';
      const values = [`%${query}%`];
      
      // Mandatory tenant isolation: if companyId is present, we MUST filter by it.
      // This protects against data leakage in shared database environments.
      if (companyId) {
        whereBase = `company_id = $2`;
        values.push(companyId);
      } else if (!isSuperAdmin) {
        // Fallback for security: if no companyId and not super_admin, restrict to something safe or reject
        whereBase = '1=0'; 
      }
      
      return {
        text: `SELECT * FROM ${table} WHERE ${whereBase} AND (${conditions.replace(/\$Q/g, '$1')}) LIMIT ${limit}`,
        values
      };
    };

    // Helper to build search queries more robustly
    const buildSearchQuery = (table, type, key, conditions, view, titleCol, descCol, dateCol = 'NULL', statusCol = 'NULL', extraCols = '') => {
      const { text, values } = getQueryConfig(table, conditions);
      // Construct the SELECT part specifically instead of replacing
      const selectPart = `SELECT '${type}' as type, '${key}' as key, id, COALESCE(${titleCol}, '') as title, COALESCE(${descCol}, '') as description, '${view}' as view, ${dateCol} as date, ${statusCol} as status ${extraCols}`;
      const finalQuery = text.replace(/SELECT \* FROM [^\s]+/i, `${selectPart} FROM ${table}`);
      
      return req.db.query(finalQuery, values).catch(err => {
        console.warn(`${type} search failed:`, err.message);
        return { rows: [] };
      });
    };

    const results = await Promise.all([
      buildSearchQuery('export_invoices', 'Export Invoice', 'exportInvoices', 
        "COALESCE(invoice_no, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(country, '') ILIKE $Q OR COALESCE(booking_no, '') ILIKE $Q OR COALESCE(shipping_bill_no, '') ILIKE $Q OR COALESCE(bl_no, '') ILIKE $Q",
        'export-invoice', 'invoice_no', 'client_name', 'invoice_date', 'status', ", country"),

      buildSearchQuery('clients', 'Client', 'clients', 
        "COALESCE(name, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(email_id, '') ILIKE $Q OR COALESCE(country, '') ILIKE $Q",
        'client-management', 'COALESCE(client_name, name)', 'email_id', 'NULL', 'status', ", country"),

      buildSearchQuery('proforma_invoices', 'Proforma Invoice', 'proformaInvoices', 
        "COALESCE(invoice_no, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(country, '') ILIKE $Q OR COALESCE(booking_no, '') ILIKE $Q",
        'invoice-management', 'invoice_no', 'client_name', 'date', 'status'),

      buildSearchQuery('proforma_orders', 'Proforma Order', 'orders', 
        "COALESCE(order_no, '') ILIKE $Q OR COALESCE(supplier_name, '') ILIKE $Q OR COALESCE(invoice_ref, '') ILIKE $Q",
        'client-order-management', 'order_no', 'supplier_name', 'date', 'status'),

      buildSearchQuery('products', 'Product', 'products', 
        "COALESCE(name, '') ILIKE $Q OR COALESCE(product_code, '') ILIKE $Q OR COALESCE(category, '') ILIKE $Q",
        'product-management', 'name', 'category'),

      buildSearchQuery('users', 'User', 'users', 
        "COALESCE(name, '') ILIKE $Q OR COALESCE(email_id, '') ILIKE $Q OR COALESCE(username, '') ILIKE $Q",
        'user-management', 'name', 'email_id'),

      buildSearchQuery('suppliers', 'Supplier', 'suppliers', 
        "COALESCE(name, '') ILIKE $Q OR COALESCE(email_id, '') ILIKE $Q",
        'supplier-management', 'name', 'email_id'),

      buildSearchQuery('leads', 'Lead', 'leads', 
        "COALESCE(company_name, '') ILIKE $Q OR COALESCE(contact_person_name, '') ILIKE $Q OR COALESCE(email_id, '') ILIKE $Q OR COALESCE(country, '') ILIKE $Q",
        'lead-management', 'company_name', 'contact_person_name'),

      buildSearchQuery('qc_records', 'QC Record', 'qcRecords', 
        "COALESCE(qc_id, '') ILIKE $Q OR COALESCE(order_number, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q",
        'qc-management', 'qc_id', 'qc_status', 'qc_date', 'qc_status'),

      buildSearchQuery('packing_lists', 'Packing List', 'packingLists', 
        "COALESCE(packing_list_no, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(pi_reference, '') ILIKE $Q OR COALESCE(proforma_invoice_no, '') ILIKE $Q",
        'export-invoice', 'packing_list_no', 'client_name', 'COALESCE(packing_list_date, date)', 'status', ", export_invoice_id as real_id").then(res => {
          // Fix id for packing lists to be export_invoice_id for navigation
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('export_invoice_annexures', 'Annexure', 'annexure', 
        "COALESCE(annexure_no, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(invoice_no, '') ILIKE $Q OR COALESCE(pi_reference, '') ILIKE $Q",
        'export-invoice', 'annexure_no', 'client_name', 'invoice_date', 'status', ", export_invoice_id as real_id").then(res => {
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('vgm_documents', 'VGM', 'vgm', 
        "COALESCE(vgm_no, '') ILIKE $Q OR COALESCE(export_invoice_no, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(booking_number, '') ILIKE $Q",
        'export-invoice', 'vgm_no', 'client_name', 'document_date', 'status', ", export_invoice_id as real_id").then(res => {
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('shipping_instructions', 'Shipping Instruction', 'shippingInstructions', 
        "COALESCE(si_no, '') ILIKE $Q OR COALESCE(export_invoice_no, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(booking_no, '') ILIKE $Q",
        'export-invoice', 'si_no', 'client_name', 'si_date', 'status', ", export_invoice_id as real_id").then(res => {
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('invoice_backside', 'Invoice Backside', 'invoiceBackside', 
        "COALESCE(backside_no, '') ILIKE $Q OR COALESCE(invoice_no, '') ILIKE $Q OR COALESCE(client_name, '') ILIKE $Q OR COALESCE(pi_no, '') ILIKE $Q OR COALESCE(pl_no, '') ILIKE $Q",
        'invoice-backside-dashboard', 'backside_no', 'client_name', 'invoice_date', 'status', ", export_invoice_id as real_id").then(res => {
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('bills_of_lading', 'Bill of Lading', 'billOfLading', 
        "COALESCE(bl_no, '') ILIKE $Q OR COALESCE(shipper_name, '') ILIKE $Q OR COALESCE(consignee_name, '') ILIKE $Q",
        'export-invoice', 'bl_no', 'shipper_name', 'issued_date', 'status', ", export_invoice_id as real_id").then(res => {
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('account_entries', 'Account Entry', 'accountEntries', 
        "COALESCE(reference_no, '') ILIKE $Q OR COALESCE(description, '') ILIKE $Q",
        'account-management', 'reference_no', 'description', 'entry_date', 'status'),

      buildSearchQuery('customs_clearance', 'Customs Clearance', 'customsClearance', 
        "COALESCE(clearance_no, '') ILIKE $Q OR COALESCE(hs_code, '') ILIKE $Q",
        'export-invoice', 'clearance_no', 'status', 'clearance_date', 'status', ", export_invoice_id as real_id").then(res => {
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('certificates', 'Certificate', 'certificate', 
        "COALESCE(cert_no, '') ILIKE $Q OR COALESCE(cert_type, '') ILIKE $Q",
        'export-invoice', 'cert_no', 'cert_type', 'issued_date', 'status', ", export_invoice_id as real_id").then(res => {
          res.rows = res.rows.map(r => ({ ...r, id: r.real_id || r.id }));
          return res;
        }),

      buildSearchQuery('catalogues', 'Catalogue', 'catalogues', 
        "COALESCE(name, '') ILIKE $Q OR COALESCE(description, '') ILIKE $Q",
        'catalogue-management', 'name', 'description', 'created_at', 'status'),

      buildSearchQuery('pallets', 'Pallet', 'pallets', 
        "COALESCE(pallet_id, '') ILIKE $Q OR COALESCE(assigned_client, '') ILIKE $Q OR COALESCE(location, '') ILIKE $Q",
        'pallet-management', 'pallet_id', 'assigned_client', 'created_at', 'status'),

      isSuperAdmin ? req.db.query(
        "SELECT 'Company' as type, 'company' as key, id, name as title, COALESCE(email_id, '') as description, 'company-management' as view FROM companies WHERE COALESCE(name, '') ILIKE $1 OR COALESCE(email_id, '') ILIKE $1 OR COALESCE(iec_no, '') ILIKE $1 OR COALESCE(gstin, '') ILIKE $1 LIMIT 10",
        [`%${query}%`]
      ).catch(err => { console.warn('Company search failed:', err.message); return { rows: [] }; }) : Promise.resolve({ rows: [] })
    ]);

    // Flatten and combine results
    const allResults = results
      .map(r => r.rows || [])
      .flat()
      .sort((a, b) => {
        const aTitle = String(a.title || '').toLowerCase();
        const bTitle = String(b.title || '').toLowerCase();
        const searchLower = query.toLowerCase();
        
        const aExact = aTitle === searchLower;
        const bExact = bTitle === searchLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aTitle.startsWith(searchLower);
        const bStarts = bTitle.startsWith(searchLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return (a.type || '').localeCompare(b.type || '');
      });

    res.json({
      query,
      total: allResults.length,
      results: allResults,
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
