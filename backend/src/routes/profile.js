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
import { authenticate } from '../middleware/auth.js';
import upload from '../middleware/multerConfig.js';
import pool from '../config/database-wrapper.js';
import { validateStrongPassword } from '../utils/passwordPolicy.js';

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, name, email_id, contact_number, role, permissions, company_id, status, avatar_url,
              COALESCE(settings->>'address', '') AS address,
              COALESCE(settings->>'bio', '') AS bio
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, contact_number, bio, address } = req.body;

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

    // If bio or address provided, merge into settings JSONB
    if (bio !== undefined || address !== undefined) {
      const settingsPatch = {};
      if (bio !== undefined) settingsPatch.bio = bio;
      if (address !== undefined) settingsPatch.address = address;

      updates.push(`settings = COALESCE(settings, '{}'::jsonb) || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(settingsPatch));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }

    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, name, email_id, contact_number, role, permissions, company_id, status, avatar_url, settings, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: result.rows[0] 
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const passwordCheck = validateStrongPassword(newPassword);
    if (!passwordCheck.isValid) {
      return res.status(400).json({ success: false, message: passwordCheck.error });
    }

    const userResult = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateResult = await pool.query(
      `UPDATE users 
       SET password_hash = $1, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email_id, role`,
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get notification preferences
router.get('/notification-settings', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        COALESCE(settings->'emailNotifications', 'true'::jsonb) as emailNotifications,
        COALESCE(settings->'pushNotifications', 'true'::jsonb) as pushNotifications,
        COALESCE(settings->'smsNotifications', 'false'::jsonb) as smsNotifications,
        COALESCE(settings->'orderUpdates', 'true'::jsonb) as orderUpdates,
        COALESCE(settings->'systemAlerts', 'true'::jsonb) as systemAlerts,
        COALESCE(settings->'marketingEmails', 'false'::jsonb) as marketingEmails
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    const defaultSettings = {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      orderUpdates: true,
      systemAlerts: true,
      marketingEmails: false
    };

    res.json({
      success: true,
      data: result.rows.length > 0 ? result.rows[0] : defaultSettings
    });
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
router.put('/notification-settings', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, settings`,
      [JSON.stringify(settings), userId]
    );

    res.json({
      success: true,
      message: 'Notification settings updated',
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// Upload user avatar
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user.id;
    const avatarUrl = req.file.location || `/uploads/${req.file.filename}`;

    // Check if avatar_url column exists, if not it will still work
    const result = await pool.query(
      `UPDATE users 
       SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email_id, avatar_url`,
      [avatarUrl, userId]
    ).catch(async (err) => {
      // If column doesn't exist, just return success with the file info
      if (err.message.includes('avatar_url')) {
        return { rows: [{ id: userId, avatar_url: avatarUrl }] };
      }
      throw err;
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar_url: avatarUrl,
        user: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
