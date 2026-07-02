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

import { AppError } from '../middleware/errorHandler.js';
import { getPagination, paginationResponse, successResponse, getFirstRow } from '../utils/helpers.js';
import debugLogger from '../utils/debugLogger.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { logAction } from '../services/auditService.js';
import { provisionCompanyDatabase } from '../utils/databaseProvisioning.js';
import { encrypt } from '../utils/encryption.js';

const CONTEXT = 'CompanyController';
const ALL_MODULES = [
  // Core System Modules (Auto-Enabled)
  'reports_analytics', 'business_intelligence', 'administration', 'master_data_management', 'sanitaryware_master_data',
  // Business Management
  'user_management', 'client_management', 'supplier_management', 'lead_management', 'salesperson_management', 'client_order',
  // Product & Catalogue
  'product_management', 'sanitaryware_management', 'catalogue_management',
  // Proforma Management
  'proforma_invoice', 'proforma_order',
  // Operations & QC
  'qc_management', 'order_sheet',
  // Export Management
  'export_overview', 'export_invoice', 'igst_invoice', 'packing_list', 'annexure', 'invoice_backside', 'vgm', 'shipping_instructions',
  // Finance & Management
  'account_finance', 'receivables', 'payables', 'expenses', 'financial_dashboard'
];

export const getAllCompanies = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { page = 1, limit = 50, search, status } = req.query;
    debugLogger.request('GET', '/api/companies', { page, limit, search, status });

    const { limit: queryLimit, offset } = getPagination(page, limit);

    let whereConditions = [];
    let values = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(name ILIKE $${paramCount} OR email_id ILIKE $${paramCount} OR contact_person_name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await req.db.globalQuery(
      `SELECT COUNT(*) FROM companies ${whereClause}`,
      values
    );
    const countRow = getFirstRow(countResult);
    const total = parseInt(countRow?.count || 0);

    const result = await req.db.globalQuery(
      `SELECT c.id, c.name, c.industry, c.contact_person_name, c.email_id, c.contact_number, c.address, c.city, c.country, 
              c.website, c.iec_no, c.gstn, c.pan, c.logo_url, c.subscription_plan, c.status, 
              c.created_at, c.updated_at,
              u_agg.last_login,
              COALESCE(u_agg.total_users, 0) as total_users,
              cs_agg.monthly_revenue,
              cs_agg.subscription_end_date,
              cs_agg.days_until_expiry,
              CASE
                WHEN c.status = 'Expired' THEN 'At Risk'
                WHEN u_agg.last_login < CURRENT_DATE - INTERVAL '30 days' THEN 'Inactive'
                WHEN cs_agg.subscription_end_date < CURRENT_DATE + INTERVAL '14 days' THEN 'Expiring Soon'
                ELSE 'Healthy'
              END as health_status
       FROM companies c
       LEFT JOIN (
         SELECT company_id, MAX(last_login) as last_login, COUNT(*)::int as total_users
         FROM users
         GROUP BY company_id
       ) u_agg ON u_agg.company_id = c.id
       LEFT JOIN LATERAL (
         SELECT cs.amount as monthly_revenue,
                cs.start_date as subscription_start_date,
                cs.end_date as subscription_end_date,
                (DATE(cs.end_date) - CURRENT_DATE) as days_until_expiry
         FROM company_subscriptions cs
         WHERE cs.company_id = c.id AND cs.status = 'Active'
         ORDER BY cs.created_at DESC
         LIMIT 1
       ) cs_agg ON true
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, queryLimit, offset]
    );

    const duration = Date.now() - startTime;
    debugLogger.timing(CONTEXT, 'getAllCompanies', duration);
    debugLogger.success(CONTEXT, `Retrieved ${result.rows.length} companies`, {
      total,
      page,
      limit
    });

    res.json({
      success: true,
      message: 'Companies retrieved successfully',
      ...paginationResponse(result.rows, total, page, limit)
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'getAllCompanies failed', error);
    next(error);
  }
};

export const getCompanyById = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;
    debugLogger.request('GET', `/api/companies/${id}`);

    if (req.user.role !== 'super_admin' && String(req.user.companyId) !== String(id)) {
      debugLogger.trace(CONTEXT, `Unauthorized access to company: ${id} by user: ${req.user.id}`);
      return next(new AppError('Not authorized to access this route', 401));
    }

    const result = await req.db.globalQuery(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count
       FROM companies c
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      debugLogger.trace(CONTEXT, `Company not found: ${id}`);
      return next(new AppError('Company not found', 404));
    }

    const company = result.rows[0];

    // Initialize metrics
    company.total_leads = 0;
    company.total_orders = 0;
    company.total_qc_records = 0;

    // Fetch live metrics from tenant database if configured
    if (company.db_name) {
      try {
        const { companyQuery } = await import('../config/companyDatabaseRouter.js');

        // Fetch Leads count
        const leadsRes = await companyQuery(id, 'SELECT COUNT(*) FROM leads');
        company.total_leads = parseInt(leadsRes.rows[0]?.count || 0);

        // Fetch Orders count
        const ordersRes = await companyQuery(id, 'SELECT COUNT(*) FROM proforma_orders');
        company.total_orders = parseInt(ordersRes.rows[0]?.count || 0);

        // Fetch QC Records count
        const qcRes = await companyQuery(id, 'SELECT COUNT(*) FROM qc_records');
        company.total_qc_records = parseInt(qcRes.rows[0]?.count || 0);

        debugLogger.trace(CONTEXT, `Fetched tenant metrics for company: ${id}`, {
          leads: company.total_leads,
          orders: company.total_orders,
          qc: company.total_qc_records
        });
      } catch (tenantErr) {
        debugLogger.warn(CONTEXT, `Failed to fetch tenant metrics for company ${id}`, { error: tenantErr.message });
        // Fallback to 0 if tenant DB is unavailable or schema not yet migrated
      }
    }

    try {
      const subRes = await req.db.globalQuery(
        `SELECT json_build_object(
            'plan_id', cs.plan_id,
            'plan_name', sp.name,
            'start_date', cs.start_date,
            'end_date', cs.end_date,
            'status', cs.status,
            'amount', cs.amount
          ) as current_subscription
         FROM company_subscriptions cs
         LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
         WHERE cs.company_id = $1
         ORDER BY cs.created_at DESC
         LIMIT 1`,
        [id]
      );
      company.current_subscription = subRes.rows[0]?.current_subscription || null;
    } catch (subErr) {
      debugLogger.warn(CONTEXT, 'Subscription lookup skipped', { error: subErr.message });
      company.current_subscription = null;
    }

    try {
      const modRes = await req.db.globalQuery(
        `SELECT json_agg(module_name) as enabled_modules FROM module_access WHERE company_id = $1 AND is_enabled = true`,
        [id]
      );
      company.enabled_modules = modRes.rows[0]?.enabled_modules || [];
    } catch (modErr) {
      debugLogger.warn(CONTEXT, 'Module access lookup skipped', { error: modErr.message });
      company.enabled_modules = [];
    }

    try {
      const adminRes = await req.db.globalQuery(
        `SELECT name as admin_username, email_id as admin_email_id FROM users WHERE company_id = $1 AND role = 'company_admin' LIMIT 1`,
        [id]
      );
      if (adminRes.rows.length > 0) {
        company.admin_username = adminRes.rows[0].admin_username;
        company.admin_email_id = adminRes.rows[0].admin_email_id;
      }
    } catch (adminErr) {
      debugLogger.warn(CONTEXT, 'Admin user lookup skipped', { error: adminErr.message });
    }

    const duration = Date.now() - startTime;
    debugLogger.timing(CONTEXT, 'getCompanyById', duration);
    debugLogger.success(CONTEXT, `Retrieved company: ${company.name}`, {
      id: company.id,
      email: company.email_id,
      modules: company.enabled_modules.length
    });

    res.json({
      success: true,
      message: 'Company retrieved successfully',
      data: company
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'getCompanyById failed', error);
    next(error);
  }
};

export const createCompany = async (req, res, next) => {
  try {
    const startTime = Date.now();
    debugLogger.request('POST', '/api/companies', {
      name: req.body.name,
      email: req.body.email_id
    });

    const {
      name,
      industry,
      contact_person_name,
      email_id,
      contact_number,
      address,
      city,
      country,
      website,
      iec_no,
      gstn,
      pan,
      logo_url,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      swift_code,
      branch_name,
      bank_address,
      lut_arn_no,
      lut_date,
      permission_no,
      subscription_plan = 'Free Trial',
      status = 'Trial',
      settings = {}
    } = req.body;

    const companyId = uuidv4();
    const companySlug = name.toLowerCase().replace(/\s+/g, '_');

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO companies (
          id, name, domain, industry, contact_person_name, email_id, contact_number, address, city, country,
          website, iec_no, gstn, pan, logo_url, 
          bank_name, account_holder_name, account_number, ifsc_code, swift_code, branch_name, bank_address,
          lut_arn_no, lut_date, permission_no,
          subscription_plan, status, settings,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW())
        RETURNING *`,
        [
          companyId, name, companySlug, industry, contact_person_name, email_id, contact_number, address, city, country,
          website, iec_no, gstn, pan, logo_url,
          bank_name, account_holder_name, account_number, ifsc_code, swift_code, branch_name, bank_address,
          lut_arn_no, lut_date, permission_no,
          subscription_plan, status, JSON.stringify(settings)
        ]
      );

      // Force Hybrid Mode (Single Database) to support Railway deployment
      // await provisionCompanyDatabase(...) is skipped.

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      debugLogger.timing(CONTEXT, 'createCompany', duration);
      debugLogger.success(CONTEXT, `Company created: ${result.rows[0].name}`, {
        id: result.rows[0].id,
        email: result.rows[0].email_id
      });

      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: result.rows[0]
      });

      logAction({
        userId: req.user?.id,
        companyId: result.rows[0].id,
        action: 'CREATE_COMPANY',
        entityType: 'company',
        entityId: result.rows[0].id,
        details: { name: result.rows[0].name },
        ipAddress: req.ip
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === '23505') {
      debugLogger.error(CONTEXT, 'Duplicate constraint violation', error);
      const constraintMap = {
        'companies_name_key': 'Company with this name already exists',
        'companies_email_id_key': 'Company with this email already exists',
        'companies_contact_number_key': 'Company with this contact number already exists',
        'companies_gstn_key': 'Company with this GSTN already exists',
        'companies_pan_key': 'Company with this PAN already exists',
        'companies_iec_no_key': 'Company with this IEC No already exists',
        'users_email_id_key': 'User with this admin email already exists'
      };
      const message = constraintMap[error.constraint] || 'A record with this information already exists';
      return next(new AppError(message, 400));
    }
    debugLogger.error(CONTEXT, 'createCompany failed', error);
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;

    if (req.file) {
      req.body.logo_url = req.file.location || `/uploads/${req.file.filename}`;
    }

    const {
      name, industry, contact_person_name, email_id, contact_number, address, city, country,
      website, iec_no, gstn, pan, logo_url, subscription_plan, status, settings,
      bank_name, account_holder_name, account_number, ifsc_code, swift_code, branch_name, bank_address,
      lut_arn_no, lut_date, permission_no,
      admin_username, admin_password, admin_email_id, enabled_modules
    } = req.body;

    const checkResult = await req.db.globalQuery('SELECT id FROM companies WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return next(new AppError('Company not found', 404));
    }

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) { updateFields.push(`name = $${paramCount++}`); values.push(name); }
      if (industry !== undefined) { updateFields.push(`industry = $${paramCount++}`); values.push(industry); }
      if (contact_person_name !== undefined) { updateFields.push(`contact_person_name = $${paramCount++}`); values.push(contact_person_name); }
      if (email_id !== undefined) { updateFields.push(`email_id = $${paramCount++}`); values.push(email_id); }
      if (contact_number !== undefined) { updateFields.push(`contact_number = $${paramCount++}`); values.push(contact_number); }
      if (address !== undefined) { updateFields.push(`address = $${paramCount++}`); values.push(address); }
      if (city !== undefined) { updateFields.push(`city = $${paramCount++}`); values.push(city); }
      if (country !== undefined) { updateFields.push(`country = $${paramCount++}`); values.push(country); }
      if (website !== undefined) { updateFields.push(`website = $${paramCount++}`); values.push(website); }
      if (iec_no !== undefined) { updateFields.push(`iec_no = $${paramCount++}`); values.push(iec_no); }
      if (gstn !== undefined) { updateFields.push(`gstn = $${paramCount++}`); values.push(gstn); }
      if (pan !== undefined) { updateFields.push(`pan = $${paramCount++}`); values.push(pan); }
      if (logo_url !== undefined) { updateFields.push(`logo_url = $${paramCount++}`); values.push(logo_url); }
      if (subscription_plan !== undefined) { updateFields.push(`subscription_plan = $${paramCount++}`); values.push(subscription_plan); }
      if (status !== undefined) { updateFields.push(`status = $${paramCount++}`); values.push(status); }
      if (settings !== undefined) { updateFields.push(`settings = $${paramCount++}`); values.push(JSON.stringify(settings)); }
      if (bank_name !== undefined) { updateFields.push(`bank_name = $${paramCount++}`); values.push(bank_name); }
      if (account_holder_name !== undefined) { updateFields.push(`account_holder_name = $${paramCount++}`); values.push(account_holder_name); }
      if (account_number !== undefined) { updateFields.push(`account_number = $${paramCount++}`); values.push(account_number); }
      if (ifsc_code !== undefined) { updateFields.push(`ifsc_code = $${paramCount++}`); values.push(ifsc_code); }
      if (swift_code !== undefined) { updateFields.push(`swift_code = $${paramCount++}`); values.push(swift_code); }
      if (branch_name !== undefined) { updateFields.push(`branch_name = $${paramCount++}`); values.push(branch_name); }
      if (bank_address !== undefined) { updateFields.push(`bank_address = $${paramCount++}`); values.push(bank_address); }
      if (lut_arn_no !== undefined) { updateFields.push(`lut_arn_no = $${paramCount++}`); values.push(lut_arn_no); }
      if (lut_date !== undefined) { updateFields.push(`lut_date = $${paramCount++}`); values.push(lut_date); }
      if (permission_no !== undefined) { updateFields.push(`permission_no = $${paramCount++}`); values.push(permission_no); }

      if (admin_email_id || admin_password || admin_username) {
        // ── Pre-flight uniqueness checks ────────────────────────────────────────
        // Get the current company admin's id so we can exclude them from the check
        const currentAdminRes = await client.query(
          `SELECT id FROM users WHERE company_id = $1 AND role = 'company_admin' LIMIT 1`,
          [id]
        );
        const currentAdminId = currentAdminRes.rows[0]?.id;

        if (admin_email_id && currentAdminId) {
          // Check if this email is already taken by a DIFFERENT user
          const emailConflict = await client.query(
            `SELECT id FROM users WHERE email_id = $1 AND id != $2 LIMIT 1`,
            [admin_email_id, currentAdminId]
          );
          if (emailConflict.rows.length > 0) {
            await client.query('ROLLBACK');
            client.release();
            return next(new AppError('User with this admin email already exists', 400));
          }
        }

        if (admin_username && currentAdminId) {
          // Check if this username is already taken by a DIFFERENT user
          const usernameConflict = await client.query(
            `SELECT id FROM users WHERE username = $1 AND id != $2 LIMIT 1`,
            [admin_username, currentAdminId]
          );
          if (usernameConflict.rows.length > 0) {
            await client.query('ROLLBACK');
            client.release();
            return next(new AppError('User with this admin username already exists', 400));
          }
        }
        // ────────────────────────────────────────────────────────────────────────

        const adminUpdateFields = [];
        const adminValues = [];
        let adminParamCount = 1;

        if (admin_username) { adminUpdateFields.push(`name = $${adminParamCount++}`); adminValues.push(admin_username); }
        if (admin_email_id) { adminUpdateFields.push(`email_id = $${adminParamCount++}`); adminValues.push(admin_email_id); }
        if (admin_password && admin_password.trim()) {
          const hashedPassword = await bcrypt.hash(admin_password, 10);
          adminUpdateFields.push(`password_hash = $${adminParamCount++}`); adminValues.push(hashedPassword);
        }

        if (adminUpdateFields.length > 0) {
          adminValues.push(id);
          await client.query(
            `UPDATE users SET ${adminUpdateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE company_id = $${adminParamCount} AND role = 'company_admin'`,
            adminValues
          );
        }
      }

      let resultRow = null;
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const result = await client.query(`UPDATE companies SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
        resultRow = result.rows[0];
      }

      if (enabled_modules && Array.isArray(enabled_modules)) {
        // First disable all existing modules
        await client.query(`UPDATE module_access SET is_enabled = false WHERE company_id = $1`, [id]);
        
        // Then enable the provided ones (and ensure they exist)
        for (const moduleName of enabled_modules) {
          if (ALL_MODULES.includes(moduleName)) {
            await client.query(
              `INSERT INTO module_access (company_id, module_name, is_enabled) VALUES ($1, $2, true) 
               ON CONFLICT (company_id, module_name) DO UPDATE SET is_enabled = true, updated_at = CURRENT_TIMESTAMP`,
              [id, moduleName]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Company updated successfully', data: resultRow });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === '23505') {
      const constraintMap = {
        'companies_name_key': 'Company with this name already exists',
        'companies_email_id_key': 'Company with this email already exists',
        'companies_contact_number_key': 'Company with this contact number already exists',
        'companies_gstn_key': 'Company with this GSTN already exists',
        'companies_pan_key': 'Company with this PAN already exists',
        'companies_iec_no_key': 'Company with this IEC No already exists',
        'users_email_id_key': 'User with this admin email already exists'
      };
      const message = constraintMap[error.constraint] || 'A record with this information already exists';
      return next(new AppError(message, 400));
    }
    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'super_admin' && String(req.user.companyId) !== String(id)) {
      return next(new AppError('Forbidden', 403));
    }
    const { rows } = await req.db.globalQuery('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return next(new AppError('Company not found', 404));
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'super_admin' && String(req.user.companyId) !== String(id)) {
      return next(new AppError('Forbidden', 403));
    }
    const { rows } = await req.db.globalQuery('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return next(new AppError('Company not found', 404));
    res.json({ success: true, message: 'Company permanently deleted', data: { id } });
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingResult = await req.db.globalQuery('SELECT id, status FROM companies WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) return next(new AppError('Company not found', 404));

    const newStatus = existingResult.rows[0].status === 'Active' ? 'Inactive' : 'Active';
    const result = await req.db.globalQuery(`UPDATE companies SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [newStatus, id]);
    res.json({ success: true, message: `Company status changed to ${newStatus}`, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getCompanyAnalytics = async (req, res, next) => {
  try {
    const [total, active, trial, suspended, expired, recent, subscription] = await Promise.all([
      req.db.globalQuery('SELECT COUNT(*) FROM companies'),
      req.db.globalQuery(`SELECT COUNT(*) FROM companies WHERE status = 'Active'`),
      req.db.globalQuery(`SELECT COUNT(*) FROM companies WHERE status = 'Trial'`),
      req.db.globalQuery(`SELECT COUNT(*) FROM companies WHERE status = 'Suspended'`),
      req.db.globalQuery(`SELECT COUNT(*) FROM companies WHERE status = 'Expired'`),
      req.db.globalQuery(`SELECT id, name, email_id, status, subscription_plan, created_at as registered_date FROM companies ORDER BY created_at DESC LIMIT 10`),
      req.db.globalQuery(`SELECT subscription_plan, COUNT(*) as count FROM companies GROUP BY subscription_plan ORDER BY count DESC`)
    ]);

    res.json({
      success: true,
      data: {
        total: parseInt(total.rows[0].count),
        byStatus: { active: parseInt(active.rows[0].count), trial: parseInt(trial.rows[0].count), suspended: parseInt(suspended.rows[0].count), expired: parseInt(expired.rows[0].count) },
        bySubscriptionPlan: subscription.rows,
        recentCompanies: recent.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

export const registerCompany = async (req, res, next) => {
  try {
    const { name, industry, contact_person_name, email_id, contact_number, address, city, country, website, iec_no, gstn, pan, logo_url, admin_email, admin_password, subscription_plan_id, enabled_modules = [] } = req.body;

    if (!name || !admin_email || !admin_password) return next(new AppError('Required fields missing', 400));

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');
      const companyId = uuidv4();
      const companySlug = name.toLowerCase().replace(/\s+/g, '_');

      const companyRes = await client.query(
        `INSERT INTO companies (
          id, name, domain, industry, contact_person_name, email_id, contact_number, address, city, country, 
          website, iec_no, gstn, pan, logo_url, subscription_plan, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
        [
          companyId, name, companySlug, industry, contact_person_name, email_id, contact_number, address, city, country,
          website, iec_no, gstn, pan, logo_url, 'Free Trial', 'Active'
        ]
      );
      const company = companyRes.rows[0];

      // Force Hybrid Mode (Single Database) to support Railway deployment
      // await provisionCompanyDatabase(...) is skipped.

      const passwordHash = await bcrypt.hash(admin_password, 10);
      const adminRes = await client.query(
        `INSERT INTO users (company_id, name, email_id, password_hash, contact_number, role, status, permissions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [company.id, contact_person_name || 'Administrator', admin_email, passwordHash, contact_number, 'company_admin', 'Active', '["all"]']
      );

      if (subscription_plan_id) {
        const start = new Date();
        const end = new Date(start); end.setDate(end.getDate() + 30);
        await client.query(`INSERT INTO company_subscriptions (company_id, plan_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5)`, [company.id, subscription_plan_id, start, end, 'Active']);
      }

      // First, set defaults or disable all
      for (const mod of ALL_MODULES) {
        await client.query(`INSERT INTO module_access (company_id, module_name, is_enabled) VALUES ($1, $2, false)`, [company.id, mod]);
      }
      
      // Then enable selected ones
      for (const mod of enabled_modules) {
        if (ALL_MODULES.includes(mod)) {
          await client.query(
            `UPDATE module_access SET is_enabled = true WHERE company_id = $1 AND module_name = $2`, 
            [company.id, mod]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: { company: { id: company.id, name: company.name } } });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    debugLogger.error(CONTEXT, 'registerCompany failed', error);
    if (error.code === '23505') {
      const constraintMap = {
        'companies_name_key': 'Company with this name already exists',
        'companies_email_id_key': 'Company with this email already exists',
        'companies_contact_number_key': 'Company with this contact number already exists',
        'companies_gstn_key': 'Company with this GSTN already exists',
        'companies_pan_key': 'Company with this PAN already exists',
        'companies_iec_no_key': 'Company with this IEC No already exists',
        'users_email_id_key': 'User with this admin email already exists'
      };
      const message = constraintMap[error.constraint] || 'A record with this information already exists';
      return next(new AppError(message, 400));
    }
    next(error);
  }
};

export const getAvailableModules = async (req, res) => res.json({ success: true, data: ALL_MODULES });

export const getCompanyModules = async (req, res, next) => {
  try {
    const result = await req.db.globalQuery(`SELECT module_name, is_enabled FROM module_access WHERE company_id = $1`, [req.params.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const updateCompanyModules = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modules } = req.body;
    if (!Array.isArray(modules)) return next(new AppError('Invalid modules format', 400));

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');
      // First disable all
      await client.query(`UPDATE module_access SET is_enabled = false WHERE company_id = $1`, [id]);
      
      // Then enable selected
      for (const moduleName of modules) {
        if (ALL_MODULES.includes(moduleName)) {
          await client.query(
            `INSERT INTO module_access (company_id, module_name, is_enabled) VALUES ($1, $2, true) 
             ON CONFLICT (company_id, module_name) DO UPDATE SET is_enabled = true, updated_at = CURRENT_TIMESTAMP`,
            [id, moduleName]
          );
        }
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Modules updated successfully' });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const completeOnboarding = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return next(new AppError('No company associated with user', 400));
    await req.db.globalQuery('UPDATE companies SET onboarding_completed = TRUE, onboarding_step = 5 WHERE id = $1', [companyId]);
    res.json({ success: true, message: 'Onboarding completed successfully' });
  } catch (error) {
    next(error);
  }
};

export const restartOnboarding = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return next(new AppError('No company associated with user', 400));
    await req.db.globalQuery('UPDATE companies SET onboarding_completed = FALSE, onboarding_step = 0 WHERE id = $1', [companyId]);
    res.json({ success: true, message: 'Onboarding restarted successfully' });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  toggleStatus,
  getCompanyAnalytics,
  registerCompany,
  getAvailableModules,
  getCompanyModules,
  updateCompanyModules,
  hardDelete,
  completeOnboarding,
  restartOnboarding
};
