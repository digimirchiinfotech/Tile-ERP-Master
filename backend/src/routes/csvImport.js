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
    // Batch inserts for performance and memory protection
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const values = [];
      const queryParams = [];
      let paramCount = 1;
      
      batch.forEach((row) => {
        values.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, NOW())`);
        queryParams.push(
          row.name, 
          row.category, 
          row.description || '', 
          row.price || 0, 
          companyId, 
          req.user?.id
        );
      });
      
      const result = await req.db.query(
        `INSERT INTO products (name, category, description, price, company_id, created_by, created_at)
         VALUES ${values.join(', ')}
         RETURNING id, name, category, price`,
        queryParams
      );
      
      imported.push(...result.rows);
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
    const BATCH_SIZE = 500;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const values = [];
      const queryParams = [];
      let paramCount = 1;
      
      batch.forEach((row) => {
        values.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, NOW())`);
        queryParams.push(
          row.name, 
          row.city, 
          row.state || '', 
          row.country || '', 
          row.email || '', 
          row.phone || '', 
          companyId, 
          req.user?.id
        );
      });
      
      const result = await req.db.query(
        `INSERT INTO clients (name, city, state, country, email, phone, company_id, created_by, created_at)
         VALUES ${values.join(', ')}
         RETURNING id, name, city, email`,
        queryParams
      );
      imported.push(...result.rows);
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
    const BATCH_SIZE = 500;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const values = [];
      const queryParams = [];
      let paramCount = 1;
      
      batch.forEach((row) => {
        values.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, NOW())`);
        queryParams.push(
          row.title, 
          row.client_name, 
          row.city || '', 
          row.description || '', 
          'New', 
          companyId, 
          req.user?.id
        );
      });
      
      const result = await req.db.query(
        `INSERT INTO leads (title, client_name, city, description, status, company_id, created_by, created_at)
         VALUES ${values.join(', ')}
         RETURNING id, title, client_name, status`,
        queryParams
      );
      imported.push(...result.rows);
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
