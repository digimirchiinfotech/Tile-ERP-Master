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
import { requireAdminRole } from '../middleware/rbac.js';
import { getUnreadCount } from '../controllers/notificationController.js';
import { notificationService } from '../services/notificationService.js';
import socketService from '../services/socketService.js';
import pool from '../config/database-wrapper.js';

const router = express.Router();

// Get unread notification count
router.get('/count/unread', authenticate, filterByCompany, getUnreadCount);

// Mark all notifications as read
router.put('/mark-all-read', authenticate, filterByCompany, async (req, res, next) => {
  try {
    const userId = req.user.id;

    await req.db.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    socketService.emitToUser(userId, 'all_notifications_read', { userId });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Create notification for specific user — ADMIN ONLY (prevents privilege escalation)
router.post('/send', authenticate, filterByCompany, requireAdminRole, async (req, res, next) => {
  try {
    const userId = req.body.userId || req.body.user_id;
    const actionUrl = req.body.actionUrl || req.body.action_url;
    const companyId = req.user.companyId || req.user.company_id;
    const { title, message, type = 'info', module, reference_id, reference_no, priority } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and title are required' 
      });
    }

    const newNotification = await notificationService.notifyUser(companyId, userId, {
      title,
      message,
      type,
      redirect_url: actionUrl,
      module,
      reference_id,
      reference_no,
      priority
    }, req.db);

    res.status(201).json({
      success: true,
      data: newNotification,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Broadcast notification to all users — ADMIN ONLY
router.post('/broadcast', authenticate, filterByCompany, requireAdminRole, async (req, res, next) => {
  try {
    const { title, message, type = 'info', actionUrl } = req.body;
    const companyId = req.user.companyId || req.user.company_id;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Get all active users in THIS company
    const usersResult = await req.db.query(
      `SELECT id FROM users WHERE company_id = $1 AND status = 'Active'`,
      [companyId]
    );

    const notifications = [];
    for (const user of usersResult.rows) {
      const newNotification = await notificationService.notifyUser(companyId, user.id, {
        title,
        message,
        type,
        redirect_url: actionUrl
      }, req.db);
      notifications.push(newNotification);
    }

    res.status(201).json({
      success: true,
      data: notifications,
      count: notifications.length,
      message: `Notification sent to ${notifications.length} users`
    });
  } catch (error) {
    next(error);
  }
});

// Get user notifications
router.get('/', authenticate, filterByCompany, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unread === 'true' || req.query.unread_only === 'true';

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ` AND is_read = false`;
    }

    const countResult = await req.db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1${unreadOnly ? ' AND is_read = false' : ''}`,
      [userId]
    );

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
});

// Create notification (simple endpoint)
router.post('/', authenticate, filterByCompany, async (req, res, next) => {
  try {
    const { userId, title, message, type = 'info', actionUrl } = req.body;
    const companyId = req.user.companyId || req.user.company_id;
    
    // Use provided userId or default to authenticated user
    const targetUserId = userId || req.user.id;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const newNotification = await notificationService.notifyUser(companyId, targetUserId, {
      title,
      message,
      type,
      redirect_url: actionUrl
    }, req.db);

    res.status(201).json({
      success: true,
      data: newNotification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, filterByCompany, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await req.db.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    socketService.emitToUser(userId, 'notification_read', { id });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticate, filterByCompany, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await req.db.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
