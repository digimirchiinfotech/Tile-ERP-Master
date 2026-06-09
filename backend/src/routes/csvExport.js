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
import { generateCSV } from '../utils/csvHandler.js';

const router = express.Router();
router.use(filterByCompany);

/**
 * Export products to CSV
 */
router.get('/products', authenticate, async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;
    const result = await req.db.query(
      'SELECT id, name, category, description, price FROM products WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );

    const headers = ['ID', 'Name', 'Category', 'Description', 'Price'];
    const data = result.rows.map(row => ({
      'ID': row.id,
      'Name': row.name,
      'Category': row.category,
      'Description': row.description || '',
      'Price': row.price || 0
    }));

    const csv = generateCSV(headers, data);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * Export clients to CSV
 */
router.get('/clients', authenticate, async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;
    const result = await req.db.query(
      'SELECT id, name, city, state, country, email, phone FROM clients WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );

    const headers = ['ID', 'Name', 'City', 'State', 'Country', 'Email', 'Phone'];
    const data = result.rows.map(row => ({
      'ID': row.id,
      'Name': row.name,
      'City': row.city,
      'State': row.state || '',
      'Country': row.country || '',
      'Email': row.email || '',
      'Phone': row.phone || ''
    }));

    const csv = generateCSV(headers, data);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="clients.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * Export leads to CSV
 */
router.get('/leads', authenticate, async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;
    const result = await req.db.query(
      'SELECT id, title, client_name, city, status, created_at FROM leads WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );

    const headers = ['ID', 'Title', 'Client Firm Name', 'City', 'Status', 'Date Created'];
    const data = result.rows.map(row => ({
      'ID': row.id,
      'Title': row.title,
      'Client Firm Name': row.client_name,
      'City': row.city,
      'Status': row.status,
      'Date Created': row.created_at
    }));

    const csv = generateCSV(headers, data);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * Export invoices to CSV
 */
router.get('/invoices', authenticate, async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;
    const result = await req.db.query(
      'SELECT id, invoice_number, status, total_amount, created_at FROM proforma_invoices WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );

    const headers = ['ID', 'Invoice Number', 'Status', 'Total Amount', 'Date Created'];
    const data = result.rows.map(row => ({
      'ID': row.id,
      'Invoice Number': row.invoice_number,
      'Status': row.status,
      'Total Amount': row.total_amount,
      'Date Created': row.created_at
    }));

    const csv = generateCSV(headers, data);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="invoices.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * Export support tickets to CSV
 */
router.get('/support-tickets', authenticate, async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;
    const result = await req.db.query(
      `SELECT t.*, u.name as user_name 
       FROM support_tickets t 
       LEFT JOIN users u ON t.created_by = u.id 
       WHERE t.company_id = $1 
       ORDER BY t.created_at DESC`,
      [companyId]
    );

    const headers = ['Ticket ID', 'Subject', 'Created By', 'Category', 'Priority', 'Status', 'Date Created', 'Description'];
    const data = result.rows.map(row => ({
      'Ticket ID': row.ticket_id,
      'Subject': row.subject,
      'Created By': row.user_name || 'System',
      'Category': row.category || 'Other',
      'Priority': row.priority || 'Medium',
      'Status': row.status || 'Open',
      'Date Created': row.created_at,
      'Description': row.description || ''
    }));

    const csv = generateCSV(headers, data);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="support_tickets.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
