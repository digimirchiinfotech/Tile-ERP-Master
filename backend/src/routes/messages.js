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
import pool from '../config/database-wrapper.js';

const router = express.Router();

// Initialize messages table
const initializeTable = async () => {
  try {
    // Ensure users table exists before creating messages
    const usersExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!usersExist.rows[0].exists) {
      console.warn('⚠️ users table does not exist. Skipping messages table initialization.');
      return;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL,
        recipient_id UUID NOT NULL,
        subject VARCHAR(255),
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_recipient_id 
      ON messages(recipient_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
      ON messages(sender_id)
    `);
  } catch (error) {
    console.error('Error initializing messages table:', error);
  }
};

initializeTable();

// Get inbox messages
router.get('/inbox', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unread === 'true';

    let query = `
            SELECT m.*, 
              u.name as sender_name, 
              u.email_id as sender_email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.recipient_id = $1
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ` AND m.is_read = false`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1${unreadOnly ? ' AND is_read = false' : ''}`,
      [userId]
    );

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

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

// Get sent messages
router.get('/sent', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM messages WHERE sender_id = $1`,
      [userId]
    );

    const result = await pool.query(
      `SELECT m.*, 
              u.name as recipient_name, 
              u.email_id as recipient_email
       FROM messages m
       JOIN users u ON m.recipient_id = u.id
       WHERE m.sender_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

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

// Get conversation between two users
router.get('/conversation/:userId', authenticate, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND recipient_id = $2) 
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId]
    );

    // Mark all received messages in conversation as read
    await pool.query(
      `UPDATE messages 
       SET is_read = true 
       WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false`,
      [currentUserId, otherUserId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/send', authenticate, async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { recipientId, subject, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID and content are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, subject, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [senderId, recipientId, subject || 'No Subject', content]
    );

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Mark message as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE messages 
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND recipient_id = $2
       RETURNING *`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM messages 
       WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)
       RETURNING id`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
});

// Get unread message count
router.get('/count/unread', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT COUNT(*) as unread_count FROM messages 
       WHERE recipient_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({
      success: true,
      unreadCount: parseInt(result.rows[0].unread_count)
    });
  } catch (error) {
    next(error);
  }
});

// Get available recipients (users who can receive messages)
// Returns users in the same company or all users for super_admin
router.get('/recipients', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.companyId;
    
    let query;
    let params;
    
    if (userRole === 'super_admin') {
      query = `
        SELECT id, name, email, role, company_id 
        FROM users 
        WHERE id != $1 AND status = 'Active'
        ORDER BY name ASC
      `;
      params = [userId];
    } else {
      query = `
        SELECT id, name, email, role, company_id 
        FROM users 
        WHERE id != $1 AND company_id = $2 AND status = 'Active'
        ORDER BY name ASC
      `;
      params = [userId, companyId];
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
