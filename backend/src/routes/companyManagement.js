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
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { masterQuery } from '../config/masterDatabase.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { provisionCompanyDatabase } from '../utils/databaseProvisioning.js';
import { companyQuery } from '../config/companyDatabaseRouter.js';

const router = express.Router();

/**
 * Register a new company (Super Admin only)
 * Creates isolated database for the company
 * Creates admin user for that company
 */
router.post('/register-company', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      companyName,
      companyEmail,
      country,
      industry,
      subscriptionPlan = 'basic',
      adminEmail,
      adminPassword,
      dbHost
    } = req.body;

    // Validate required fields
    if (!companyName || !companyEmail || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Company name, email, admin email, and password are required'
      });
    }

    const companyId = uuidv4();
    const companySlug = companyName.toLowerCase().replace(/\s+/g, '_');
    const dbName = `tile_erp_company_${companySlug}`;
    const dbUser = `${companySlug}_user`;
    const dbPassword = bcrypt.hashSync(uuidv4(), 10); // Generate secure password

    // 1. Register company in master database

    const companyResult = await masterQuery(
      `INSERT INTO companies 
       (id, name, email, slug, db_host, db_name, db_user, db_password, 
        country, industry, subscription_plan, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW())
       RETURNING *`,
      [
        companyId,
        companyName,
        companyEmail,
        companySlug,
        dbHost || process.env.DB_HOST || 'localhost',
        dbName,
        dbUser,
        dbPassword, // Store encrypted
        country || 'Unknown',
        industry || 'General',
        subscriptionPlan,
      ]
    );

    if (companyResult.rows.length === 0) {
      throw new Error('Failed to register company in master database');
    }

    // 2. Provision isolated database for company

    await provisionCompanyDatabase(companyResult.rows[0]);

    // 3. Create admin user for this company in their isolated database
    const adminUserId = uuidv4();
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await companyQuery(
      companyId,
      `INSERT INTO users (id, company_id, name, email_id, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminUserId,
        companyId,
        adminEmail.split('@')[0], // Name from email
        adminEmail,
        hashedPassword,
        'admin',
        'Active'
      ]
    );


    res.json({
      success: true,
      message: 'Company registered successfully with isolated database',
      data: {
        companyId,
        companyName,
        database: dbName,
        admin: {
          email: adminEmail,
          userId: adminUserId
        },
        subscription: subscriptionPlan,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error registering company:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to register company',
      error: error.message
    });
  }
});

/**
 * Get all companies (Super Admin only)
 * Shows companies from master database
 */
router.get('/companies', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const result = await masterQuery(
      `SELECT id, name, email, slug, status, subscription_plan, 
              db_name, country, industry, created_at
       FROM companies
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching companies:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
});

/**
 * Get company details (Super Admin only)
 */
router.get('/companies/:companyId', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await masterQuery(
      `SELECT * FROM companies WHERE id = $1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching company:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: error.message
    });
  }
});

/**
 * Update company details (Super Admin only)
 */
router.put('/companies/:companyId', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { companyName, status, subscriptionPlan } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (companyName) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(companyName);
    }

    if (status) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }

    if (subscriptionPlan) {
      updateFields.push(`subscription_plan = $${paramCount++}`);
      updateValues.push(subscriptionPlan);
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(companyId);

    const result = await masterQuery(
      `UPDATE companies 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating company:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
});

/**
 * Get users for a company
 * Company admin can view their own users
 * Super admin can view any company's users
 */
router.get('/companies/:companyId/users', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Check authorization
    if (req.user.role !== 'super_admin' && req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this company\'s users'
      });
    }

    const result = await companyQuery(
      companyId,
      `SELECT id, name, email_id, role, status, created_at
       FROM users
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [companyId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

export default router;
