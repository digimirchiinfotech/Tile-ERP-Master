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
import { parseCSV, validateProductsCSV, validateClientsCSV, validateLeadsCSV } from '../utils/csvHandler.js';

const router = express.Router();
router.use(filterByCompany);

/**
 * Import products from CSV
 */
router.post('/products', authenticate, async (req, res, next) => {
  try {
    const { csvData } = req.body;
    const companyId = req.user?.companyId;

    const data = parseCSV(csvData);
    const errors = validateProductsCSV(data);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'CSV validation failed', details: errors });
    }

    const imported = [];
    for (const row of data) {
      const result = await req.db.query(
        `INSERT INTO products (name, category, description, price, company_id, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, name, category, price`,
        [row.name, row.category, row.description || '', row.price || 0, companyId, req.user?.id]
      );
      imported.push(result.rows[0]);
    }

    res.json({ 
      success: true, 
      message: `${imported.length} products imported`,
      data: imported 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Import clients from CSV
 */
router.post('/clients', authenticate, async (req, res, next) => {
  try {
    const { csvData } = req.body;
    const companyId = req.user?.companyId;

    const data = parseCSV(csvData);
    const errors = validateClientsCSV(data);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'CSV validation failed', details: errors });
    }

    const imported = [];
    for (const row of data) {
      const result = await req.db.query(
        `INSERT INTO clients (name, city, state, country, email, phone, company_id, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id, name, city, email`,
        [row.name, row.city, row.state || '', row.country || '', row.email || '', row.phone || '', companyId, req.user?.id]
      );
      imported.push(result.rows[0]);
    }

    res.json({ 
      success: true, 
      message: `${imported.length} clients imported`,
      data: imported 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Import leads from CSV
 */
router.post('/leads', authenticate, async (req, res, next) => {
  try {
    const { csvData } = req.body;
    const companyId = req.user?.companyId;

    const data = parseCSV(csvData);
    const errors = validateLeadsCSV(data);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'CSV validation failed', details: errors });
    }

    const imported = [];
    for (const row of data) {
      const result = await req.db.query(
        `INSERT INTO leads (title, client_name, city, description, status, company_id, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id, title, client_name, status`,
        [row.title, row.client_name, row.city || '', row.description || '', 'New', companyId, req.user?.id]
      );
      imported.push(result.rows[0]);
    }

    res.json({ 
      success: true, 
      message: `${imported.length} leads imported`,
      data: imported 
    });
  } catch (error) {
    next(error);
  }
});

export default router;
