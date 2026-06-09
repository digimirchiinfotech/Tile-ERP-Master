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
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * Global search across all modules
 * Searches: Products, Clients, Leads, Invoices, Orders, Users, Suppliers, 
 * Catalogues, QC Records, Packing Lists, Pallets, Shipping Instructions,
 * Customs Clearance, Bills of Lading, Certificates, Post-Shipment Docs, Account Entries
 */
router.post('/global', authenticate, async (req, res, next) => {
  try {
    const { searchTerm } = req.body;
    const companyId = req.user?.companyId;


    if (!searchTerm || searchTerm.trim().length < 1) {
      return res.json({ success: true, data: [], count: 0 });
    }

    const term = `%${searchTerm}%`;
    const results = [];

    // Search Products
    try {
      const products = await query(
        `SELECT id, name, category, 'Product' as type, created_at FROM products 
         WHERE company_id = $1 AND name ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (products.rows && products.rows.length > 0) {
        results.push(...products.rows);
      }
    } catch (e) {
      console.error('Product search error:', e.message);
    }

    // Search Clients
    try {
      const clients = await query(
        `SELECT id, client_name as name, city, 'Client' as type, created_at FROM clients 
         WHERE company_id = $1 AND client_name ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (clients.rows && clients.rows.length > 0) {
        results.push(...clients.rows);
      }
    } catch (e) {
      console.error('Client search error:', e.message);
    }

    // Search Leads
    try {
      const leads = await query(
        `SELECT id, name, status, 'Lead' as type, created_at FROM leads 
         WHERE company_id = $1 AND (name ILIKE $2 OR company_name ILIKE $2) 
         LIMIT 10`,
        [companyId, term]
      );
      if (leads.rows && leads.rows.length > 0) {
        results.push(...leads.rows);
      }
    } catch (e) {
      console.error('Lead search error:', e.message);
    }

    // Search Proforma Invoices
    try {
      const invoices = await query(
        `SELECT id, invoice_no as name, status, 'Proforma Invoice' as type, created_at FROM proforma_invoices 
         WHERE company_id = $1 AND invoice_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (invoices.rows && invoices.rows.length > 0) {
        results.push(...invoices.rows);
      }
    } catch (e) {
      console.error('Invoice search error:', e.message);
    }

    // Search Proforma Orders
    try {
      const orders = await query(
        `SELECT id, order_no as name, status, 'Proforma Order' as type, created_at FROM proforma_orders 
         WHERE company_id = $1 AND order_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (orders.rows && orders.rows.length > 0) {
        results.push(...orders.rows);
      }
    } catch (e) {
      console.error('Order search error:', e.message);
    }

    // Search Suppliers
    try {
      const suppliers = await query(
        `SELECT id, name, email_id, 'Supplier' as type, created_at FROM suppliers 
         WHERE company_id = $1 AND (name ILIKE $2 OR email_id ILIKE $2)
         LIMIT 10`,
        [companyId, term]
      );
      if (suppliers.rows && suppliers.rows.length > 0) {
        results.push(...suppliers.rows);
      }
    } catch (e) {
      console.error('Supplier search error:', e.message);
    }

    // Search Users
    try {
      const users = await query(
        `SELECT id, name, email_id, 'User' as type, created_at FROM users 
         WHERE company_id = $1 AND (name ILIKE $2 OR email_id ILIKE $2)
         LIMIT 10`,
        [companyId, term]
      );
      if (users.rows && users.rows.length > 0) {
        results.push(...users.rows);
      }
    } catch (e) {
      console.error('User search error:', e.message);
    }

    // Search Catalogues
    try {
      const catalogues = await query(
        `SELECT id, name, description, 'Catalogue' as type, created_at FROM catalogues 
         WHERE company_id = $1 AND name ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (catalogues.rows && catalogues.rows.length > 0) {
        results.push(...catalogues.rows);
      }
    } catch (e) {
      console.error('Catalogue search error:', e.message);
    }

    // Search QC Records
    try {
      const qcRecords = await query(
        `SELECT id, qc_id as name, status, 'QC Record' as type, created_at FROM qc_records 
         WHERE company_id = $1 AND qc_id ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (qcRecords.rows && qcRecords.rows.length > 0) {
        results.push(...qcRecords.rows);
      }
    } catch (e) {
      console.error('QC Records search error:', e.message);
    }

    // Search Packing Lists
    try {
      const packingLists = await query(
        `SELECT id, packing_list_no as name, status, 'Packing List' as type, created_at FROM packing_lists 
         WHERE company_id = $1 AND packing_list_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (packingLists.rows && packingLists.rows.length > 0) {
        results.push(...packingLists.rows);
      }
    } catch (e) {
      console.error('Packing List search error:', e.message);
    }

    // Search Pallets
    try {
      const pallets = await query(
        `SELECT id, pallet_id as name, status, 'Pallet' as type, created_at FROM pallets 
         WHERE company_id = $1 AND pallet_id ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (pallets.rows && pallets.rows.length > 0) {
        results.push(...pallets.rows);
      }
    } catch (e) {
      console.error('Pallet search error:', e.message);
    }

    // Search Shipping Instructions
    try {
      const shippingInstructions = await query(
        `SELECT id, si_no as name, status, 'Shipping Instruction' as type, created_at FROM shipping_instructions 
         WHERE company_id = $1 AND si_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (shippingInstructions.rows && shippingInstructions.rows.length > 0) {
        results.push(...shippingInstructions.rows);
      }
    } catch (e) {
      console.error('Shipping Instructions search error:', e.message);
    }

    // Search Customs Clearance
    try {
      const customsClearance = await query(
        `SELECT id, clearance_no as name, status, 'Customs Clearance' as type, created_at FROM customs_clearance 
         WHERE company_id = $1 AND clearance_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (customsClearance.rows && customsClearance.rows.length > 0) {
        results.push(...customsClearance.rows);
      }
    } catch (e) {
      console.error('Customs Clearance search error:', e.message);
    }

    // Search Bills of Lading
    try {
      const billsOfLading = await query(
        `SELECT id, bl_no as name, status, 'Bill of Lading' as type, created_at FROM bills_of_lading 
         WHERE company_id = $1 AND bl_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (billsOfLading.rows && billsOfLading.rows.length > 0) {
        results.push(...billsOfLading.rows);
      }
    } catch (e) {
      console.error('Bills of Lading search error:', e.message);
    }

    // Search Certificates
    try {
      const certificates = await query(
        `SELECT id, cert_no as name, cert_type, 'Certificate' as type, created_at FROM certificates 
         WHERE company_id = $1 AND cert_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (certificates.rows && certificates.rows.length > 0) {
        results.push(...certificates.rows);
      }
    } catch (e) {
      console.error('Certificate search error:', e.message);
    }

    // Search Post-Shipment Documents
    try {
      const postShipmentDocs = await query(
        `SELECT id, doc_no as name, document_type, 'Post-Shipment Doc' as type, created_at FROM post_shipment_docs 
         WHERE company_id = $1 AND doc_no ILIKE $2 
         LIMIT 10`,
        [companyId, term]
      );
      if (postShipmentDocs.rows && postShipmentDocs.rows.length > 0) {
        results.push(...postShipmentDocs.rows);
      }
    } catch (e) {
      console.error('Post-Shipment Docs search error:', e.message);
    }

    // Search Account Entries
    try {
      const accountEntries = await query(
        `SELECT id, entry_no as name, entry_type, 'Account Entry' as type, created_at FROM account_entries 
         WHERE company_id = $1 AND (entry_no ILIKE $2 OR party_name ILIKE $2) 
         LIMIT 10`,
        [companyId, term]
      );
      if (accountEntries.rows && accountEntries.rows.length > 0) {
        results.push(...accountEntries.rows);
      }
    } catch (e) {
      console.error('Account Entries search error:', e.message);
    }


    return res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Global search error:', error);
    next(error);
  }
});

export default router;
