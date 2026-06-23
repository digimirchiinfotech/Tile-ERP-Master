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

import bcrypt from 'bcrypt';
import { AppError } from '../middleware/errorHandler.js';
import { 
  successResponse, 
  sanitizeUser, 
  getPagination, 
  paginationResponse 
} from '../utils/helpers.js';
import { auditLog } from '../middleware/auditLog.js';
import { notificationService } from '../services/notificationService.js';

export const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, role, status, department } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`u.company_id IS NULL`);
      } else {
        conditions.push(`u.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramCount} OR u.email_id ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (role) {
      conditions.push(`u.role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (status) {
      conditions.push(`u.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (department) {
      conditions.push(`u.department = $${paramCount}`);
      values.push(department);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.globalQuery(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.globalQuery(
      `SELECT 
        u.id, u.company_id, u.name, u.email_id, u.contact_number, u.role, u.department, u.designation, 
        u.avatar_url, u.status, u.permissions, u.settings, u.last_login, u.created_at, u.updated_at,
        u.employee_id, u.territory, u.sales_target, u.commission, u.country, u.city
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    const sanitizedUsers = result.rows.map(user => sanitizeUser(user));

    return successResponse(
      res,
      paginationResponse(sanitizedUsers, total, page, limit),
      'Users retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (id !== 'me' && Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.globalQuery(
      `SELECT 
        id, company_id, name, email_id, contact_number, role, department, designation, 
        avatar_url, status, permissions, settings, last_login, created_at, updated_at,
        employee_id, territory, sales_target, commission, country, city
       FROM users 
       ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    return successResponse(
      res,
      sanitizeUser(result.rows[0]),
      'User retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      name, email_id, password, contact_number, role, department, designation, 
      status = 'Active', permissions = [], username: suppliedUsername
    } = req.body;
    const employee_id = req.body.employee_id || req.body.employeeId;
    const territory = req.body.territory;
    const sales_target = req.body.sales_target || req.body.salesTarget;
    const commission = req.body.commission;
    const country = req.body.country;
    const city = req.body.city;

    const existingUser = await req.db.globalQuery(
      'SELECT id FROM users WHERE email_id = $1',
      [email_id]
    );

    if (existingUser.rows.length > 0) {
      return next(new AppError('User with this email_id already exists', 400));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const companyId = req.companyFilter;

    if (!companyId && req.user.role !== 'super_admin') {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    // Determine username: use supplied or derive from email
    let username = suppliedUsername && String(suppliedUsername).trim() ? String(suppliedUsername).trim() : (email_id ? String(email_id).split('@')[0] : null);
    if (username) {
      let suffix = 0;
      let unique = false;
      while (!unique && suffix < 10) {
        const candidate = suffix === 0 ? username : `${username}${suffix}`;
        const userCheck = await req.db.globalQuery('SELECT id FROM users WHERE username = $1', [candidate]);
        if (userCheck.rows.length === 0) {
          username = candidate;
          unique = true;
          break;
        }
        suffix++;
      }
      if (!unique) {
        username = `${username}${Math.floor(Math.random() * 9000) + 1000}`;
      }
    }

    const result = await req.db.globalQuery(
      `INSERT INTO users 
       (company_id, name, email_id, username, password_hash, contact_number, role, department, designation, 
        status, permissions, employee_id, territory, sales_target, commission, country, city, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, company_id, name, email_id, username, contact_number, role, department, designation, 
                 status, permissions, employee_id, territory, sales_target, commission, country, city, created_at`,
      [
        companyId, name, email_id, username || null, passwordHash, contact_number || null, role, 
        department || null, designation || null, status, JSON.stringify(permissions),
        employee_id || null, territory || null, sales_target || null, commission || null,
        country || null, city || null
      ]
    );

    const newUser = result.rows[0];

    // Write Audit Log
    try {
      await auditLog(
        req.user?.id,
        'CREATE',
        'user',
        newUser.id,
        { new: newUser },
        companyId || null,
        req.db,
        req
      );
    } catch (err) {
      debugLogger.error('Audit log error for user create:', err);
    }

    // Notify admins about the new user
    notificationService.notifyUserCreated(companyId, newUser, req.user?.name || 'System', req.user?.id || null, req.db).catch(() => {});

    return successResponse(
      res,
      sanitizeUser(newUser),
      'User created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, email_id, password, contact_number, role, department, designation, 
      status, permissions
    } = req.body;
    const employee_id = req.body.employee_id || req.body.employeeId;
    const territory = req.body.territory;
    const sales_target = req.body.sales_target || req.body.salesTarget;
    const commission = req.body.commission;
    const country = req.body.country;
    const city = req.body.city;

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      checkParams.push(req.companyFilter);
    }

    const existingUser = await req.db.globalQuery(
      `SELECT id, role FROM users ${whereConditions}`,
      checkParams
    );

    if (existingUser.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    if (req.user.role === 'company_admin' && existingUser.rows[0].role === 'company_admin') {
      return next(new AppError('Only Super Admin can edit Company Admin users', 403));
    }

    if (email_id) {
      const emailCheck = await req.db.globalQuery(
        'SELECT id FROM users WHERE email_id = $1 AND id != $2',
        [email_id, id]
      );

      if (emailCheck.rows.length > 0) {
        return next(new AppError('Email_id already in use by another user', 400));
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (email_id) {
      updates.push(`email_id = $${paramCount}`);
      values.push(email_id);
      paramCount++;
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount}`);
      values.push(passwordHash);
      paramCount++;
    }

    if (contact_number !== undefined) {
      updates.push(`contact_number = $${paramCount}`);
      values.push(contact_number);
      paramCount++;
    }

    if (role) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (department !== undefined) {
      updates.push(`department = $${paramCount}`);
      values.push(department);
      paramCount++;
    }

    if (designation !== undefined) {
      updates.push(`designation = $${paramCount}`);
      values.push(designation);
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (permissions) {
      updates.push(`permissions = $${paramCount}`);
      values.push(JSON.stringify(permissions));
      paramCount++;
    }

    if (employee_id !== undefined) {
      updates.push(`employee_id = $${paramCount}`);
      values.push(employee_id);
      paramCount++;
    }

    if (territory !== undefined) {
      updates.push(`territory = $${paramCount}`);
      values.push(territory);
      paramCount++;
    }

    if (sales_target !== undefined) {
      updates.push(`sales_target = $${paramCount}`);
      values.push(sales_target);
      paramCount++;
    }

    if (commission !== undefined) {
      updates.push(`commission = $${paramCount}`);
      values.push(commission);
      paramCount++;
    }

    if (country !== undefined) {
      updates.push(`country = $${paramCount}`);
      values.push(country);
      paramCount++;
    }

    if (city !== undefined) {
      updates.push(`city = $${paramCount}`);
      values.push(city);
      paramCount++;
    }

    if (updates.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    const companyId = req.companyFilter;

    const idParamPosition = paramCount;
    values.push(id);
    paramCount++;
    
    values.push(companyId);
    whereConditions = `WHERE id = $${idParamPosition} AND company_id = $${paramCount}`;

    const result = await req.db.globalQuery(
      `UPDATE users 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING id, company_id, name, email_id, contact_number, role, department, designation, 
                 status, permissions, employee_id, territory, sales_target, commission, country, city, updated_at`,
      values
    );

    const updatedUser = result.rows[0];

    // Write Audit Log
    try {
      await auditLog(
        req.user?.id,
        'UPDATE',
        'user',
        updatedUser.id,
        { old: existingUser.rows[0], new: updatedUser },
        companyId || null,
        req.db,
        req
      );
    } catch (err) {
      debugLogger.error('Audit log error for user update:', err);
    }

    return successResponse(
      res,
      sanitizeUser(updatedUser),
      'User updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingUser = await req.db.globalQuery(
      `SELECT id, role FROM users ${whereConditions}`,
      queryParams
    );

    if (existingUser.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    if (id === req.user.id) {
      return next(new AppError('You cannot delete your own account', 400));
    }

    if (existingUser.rows[0].role === 'super_admin') {
      return next(new AppError('Super Admin accounts cannot be deleted', 403));
    }

    if (req.user.role !== 'super_admin' && existingUser.rows[0].role === 'company_admin') {
      return next(new AppError('Only Super Admin can delete Company Admin users', 403));
    }

    queryParams.push('Deleted');
    const result = await req.db.globalQuery(
      `UPDATE users 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING id`,
      queryParams
    );

    const deletedUserId = result.rows[0].id;

    // Write Audit Log
    try {
      await auditLog(
        req.user?.id,
        'DELETE',
        'user',
        deletedUserId,
        { status: 'Deleted' },
        req.companyFilter || null,
        req.db,
        req
      );
    } catch (err) {
      debugLogger.error('Audit log error for user remove:', err);
    }

    return successResponse(
      res,
      { id: deletedUserId },
      'User deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingUser = await req.db.globalQuery(
      `SELECT id, role FROM users ${whereConditions}`,
      queryParams
    );

    if (existingUser.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    if (id === req.user.id) {
      return next(new AppError('You cannot delete your own account', 400));
    }

    if (existingUser.rows[0].role === 'super_admin') {
      return next(new AppError('Super Admin accounts cannot be permanently deleted', 403));
    }

    const client = await req.db.getGlobalClient();
    try {
      await client.query('BEGIN');

      await client.query(`UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1`, [id]);
      await client.query(`UPDATE leads SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE clients SET assigned_salesperson = NULL WHERE assigned_salesperson = $1`, [id]);
      await client.query(`UPDATE clients SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE suppliers SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE products SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE catalogues SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE proforma_orders SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE proforma_invoices SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE packing_lists SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE shipping_instructions SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE qc_records SET inspector = NULL WHERE inspector = $1`, [id]);
      await client.query(`UPDATE qc_records SET created_by = NULL WHERE created_by = $1`, [id]);
      await client.query(`UPDATE support_tickets SET assigned_to = NULL WHERE assigned_to = $1`, [id]);
      await client.query(`UPDATE support_tickets SET created_by = NULL WHERE created_by = $1`, [id]);

      await client.query(`DELETE FROM users ${whereConditions}`, queryParams);

      await client.query('COMMIT');
      
      // Write Audit Log
      try {
        await auditLog(
          req.user?.id,
          'DELETE',
          'user',
          id,
          { status: 'Hard Deleted' },
          req.companyFilter || null,
          req.db,
          req
        );
      } catch (err) {
        debugLogger.error('Audit log error for user hardDelete:', err);
      }

      return successResponse(res, { id: existingUser.rows[0].id }, 'User permanently deleted');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingUser = await req.db.globalQuery(
      `SELECT id, status, role FROM users ${whereConditions}`,
      queryParams
    );

    if (existingUser.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    if (id === req.user.id) {
      return next(new AppError('You cannot toggle your own status', 400));
    }

    if (existingUser.rows[0].role === 'super_admin') {
      return next(new AppError('Super Admin accounts cannot be deactivated', 403));
    }

    if (req.user.role !== 'super_admin' && existingUser.rows[0].role === 'company_admin') {
      return next(new AppError('Only Super Admin can deactivate Company Admin users', 403));
    }

    const currentStatus = existingUser.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.globalQuery(
      `UPDATE users 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    const updatedUser = result.rows[0];

    // Write Audit Log
    try {
      await auditLog(
        req.user?.id,
        'STATUS_CHANGE',
        'user',
        updatedUser.id,
        { old: { status: currentStatus }, new: { status: newStatus } },
        req.companyFilter || null,
        req.db,
        req
      );
    } catch (err) {
      debugLogger.error('Audit log error for user toggleStatus:', err);
    }

    return successResponse(
      res,
      sanitizeUser(updatedUser),
      `User status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await req.db.globalQuery(
      'SELECT id, company_id, name, email_id, contact_number, role, department, designation, status, avatar_url, settings FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, contact_number, designation, department, bio, address } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (contact_number !== undefined) {
      updates.push(`contact_number = $${paramIndex}`);
      values.push(contact_number);
      paramIndex++;
    }
    if (designation !== undefined) {
      updates.push(`designation = $${paramIndex}`);
      values.push(designation);
      paramIndex++;
    }
    if (department !== undefined) {
      updates.push(`department = $${paramIndex}`);
      values.push(department);
      paramIndex++;
    }

    if (bio !== undefined || address !== undefined) {
      const settingsPatch = {};
      if (bio !== undefined) settingsPatch.bio = bio;
      if (address !== undefined) settingsPatch.address = address;

      updates.push(`settings = COALESCE(settings, '{}'::jsonb) || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(settingsPatch));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(userId);
    const result = await req.db.globalQuery(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, name, email_id, role, contact_number, department, designation, settings`,
      values
    );
    res.json({ success: true, data: result.rows[0], message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};
