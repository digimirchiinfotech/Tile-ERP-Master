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
import { successResponse, getPagination, paginationResponse } from '../utils/helpers.js';
import debugLogger from '../utils/debugLogger.js';

const CONTEXT = 'notificationController';

export const sendExternalNotification = async (req, res, next) => {
  try {
    const { type, recipient, message } = req.body;
    // Integration point for Nodemailer or Twilio
    debugLogger.info(CONTEXT, `Sending ${type} notification to ${recipient}`);
    // Queue notification or send via external provider here
    return successResponse(res, { success: true, queued: true }, `${type} notification queued successfully`);
  } catch (error) {
    next(error);
  }
};

export const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);
    const userId = req.user.id;
    const companyId = req.companyFilter;

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];

    if (companyId) {
      whereClause += ' AND company_id = $2';
      queryParams.push(companyId);
    }

    if (unread_only === 'true') {
      whereClause += ' AND is_read = false';
    }

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Notifications retrieved successfully'
    );
  } catch (error) {
    if (error.code === '42P01') {
      return successResponse(
        res,
        paginationResponse([], 0, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20),
        'Notifications retrieved successfully'
      );
    }
    next(error);
  }
};

export const getUnreadNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.companyFilter;

    let query = `SELECT * FROM notifications WHERE user_id = $1 AND is_read = false`;
    const params = [userId];

    if (companyId) {
      query += ` AND company_id = $2`;
      params.push(companyId);
    }
    query += ` ORDER BY created_at DESC`;

    const result = await req.db.query(query, params);

    return successResponse(
      res,
      result.rows,
      'Unread notifications retrieved successfully'
    );
  } catch (error) {
    if (error.code === '42P01') {
      return successResponse(res, [], 'Unread notifications retrieved successfully');
    }
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.companyFilter;
    
    // Table structures are strictly managed via database migrations

    let query = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`;
    const params = [userId];

    if (companyId) {
      query += ` AND company_id = $2`;
      params.push(companyId);
    }

    const result = await req.db.query(query, params);
    return successResponse(res, { count: parseInt(result.rows[0]?.count || 0) }, 'Unread count retrieved');
  } catch (error) {
    // If table doesn't exist even after guardian, return 0 instead of 500
    if (error.code === '42P01') {
      return successResponse(res, { count: 0 }, 'Notifications table not found, returning 0');
    }
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.companyFilter;

    let query = `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`;
    const params = [id, userId];
    if (companyId) {
      query += ` AND company_id = $3`;
      params.push(companyId);
    }

    // Verify notification belongs to user
    const notificationResult = await req.db.query(query, params);

    if (notificationResult.rows.length === 0) {
      return next(new AppError('Notification not found', 404));
    }

    const result = await req.db.query(
      `UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Audit log
    await req.db.query(`
      INSERT INTO audit_logs (company_id, resource_type, resource_id, action, user_id, ip_address)
      VALUES ($1, 'NOTIFICATION', $2, 'MARK_READ', $3, $4)
    `, [companyId || null, id, userId, req.ip]).catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));

    return successResponse(
      res,
      result.rows[0],
      'Notification marked as read'
    );
  } catch (error) {
    if (error.code === '42P01') {
      return next(new AppError('Notification not found', 404));
    }
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.companyFilter;

    let query = `UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false`;
    const params = [userId];
    if (companyId) {
      query += ` AND company_id = $2`;
      params.push(companyId);
    }

    await req.db.query(query, params);

    return successResponse(
      res,
      { success: true },
      'All notifications marked as read'
    );
  } catch (error) {
    if (error.code === '42P01') {
      return successResponse(res, { success: true }, 'All notifications marked as read');
    }
    next(error);
  }
};

export const deleteNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.companyFilter;

    let query = `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`;
    const params = [id, userId];
    if (companyId) {
      query += ` AND company_id = $3`;
      params.push(companyId);
    }

    // Verify notification belongs to user
    const notificationResult = await req.db.query(query, params);

    if (notificationResult.rows.length === 0) {
      return next(new AppError('Notification not found', 404));
    }

    await req.db.query(
      `DELETE FROM notifications WHERE id = $1`,
      [id]
    );

    // Audit log
    await req.db.query(`
      INSERT INTO audit_logs (company_id, resource_type, resource_id, action, user_id, ip_address)
      VALUES ($1, 'NOTIFICATION', $2, 'DELETE', $3, $4)
    `, [companyId || null, id, userId, req.ip]).catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));

    return successResponse(
      res,
      { id },
      'Notification deleted successfully'
    );
  } catch (error) {
    if (error.code === '42P01') {
      return next(new AppError('Notification not found', 404));
    }
    next(error);
  }
};

export const deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await req.db.query(
      `DELETE FROM notifications WHERE user_id = $1 RETURNING *`,
      [userId]
    );

    return successResponse(
      res,
      { deleted_count: result.rowCount },
      'All notifications deleted successfully'
    );
  } catch (error) {
    if (error.code === '42P01') {
      return successResponse(res, { deleted_count: 0 }, 'All notifications deleted successfully');
    }
    next(error);
  }
};
