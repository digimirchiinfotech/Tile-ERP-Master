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
import { query } from '../config/database.js';

const router = express.Router();

router.post('/save', async (req, res) => {
  res.json({ success: true, message: 'Session saved' });
});

router.post('/save-state', authenticate, async (req, res) => {
  try {
    const { stateData } = req.body;
    
    if (!stateData) {
      return res.json({ success: true, message: 'State saved' });
    }
    
    res.json({ success: true, message: 'Session state saved' });
  } catch (error) {
    res.json({ success: true, message: 'Session state saved' });
  }
});

// Get session state
router.get('/get-state', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: {} });
  } catch (error) {
    res.json({ success: true, data: {} });
  }
});
// Get active user sessions
router.get('/active', authenticate, async (req, res) => {
  try {
    const result = await req.db.globalQuery(
      `SELECT id, device, browser, ip_address as ip, location, TO_CHAR(last_login, 'YYYY-MM-DD HH12:MI AM') as "lastLogin", status
       FROM active_user_sessions
       WHERE user_id = $1
       ORDER BY last_login DESC
       LIMIT 10`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active sessions' });
  }
});

// Force logout session
router.delete('/active/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    let queryArgs = [id];
    let queryCond = `WHERE id = $1`;
    
    if (req.user.role !== 'super_admin') {
      queryCond += ` AND user_id = $2`;
      queryArgs.push(req.user.id);
    }
    
    // First get the session to find the refresh token
    const sessionResult = await req.db.globalQuery(
      `SELECT refresh_token FROM active_user_sessions ${queryCond}`,
      queryArgs
    );

    if (sessionResult.rows.length > 0) {
      const token = sessionResult.rows[0].refresh_token;
      
      // Revoke the refresh token by marking it revoked (raw token no longer stored in refresh_tokens)
      // active_user_sessions.refresh_token holds the raw token for session UI display only
      if (token) {
        const { hashToken } = await import('../utils/tokenManager.js');
        const tokenHash = hashToken(token);
        await req.db.globalQuery(
          `UPDATE refresh_tokens SET revoked = TRUE, revoked_reason = 'admin_force_logout'
            WHERE token_hash = $1`,
          [tokenHash]
        );
      }
      
      // Update the session tracking table
      await req.db.globalQuery(
        `UPDATE active_user_sessions SET status = 'Inactive' WHERE id = $1`,
        [id]
      );
    }
    
    res.json({ success: true, message: 'Session forcefully logged out' });
  } catch (error) {
    console.error('Error forcing logout:', error);
    res.status(500).json({ success: false, message: 'Failed to logout session' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN: Global Session Management
// ────────────────────────────────────────────────────────────────────────────

// GET /api/session/admin/all - List all active sessions across the platform
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
    const result = await query(`
      SELECT 
        aus.id,
        aus.user_id,
        u.name as user_name,
        u.email_id as email,
        u.role,
        c.id as company_id,
        c.name as company_name,
        aus.device,
        aus.browser,
        aus.ip_address as ip,
        aus.location,
        TO_CHAR(aus.last_login, 'YYYY-MM-DD HH12:MI AM') as "lastLogin",
        aus.status as session_status
      FROM active_user_sessions aus
      LEFT JOIN users u ON aus.user_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY aus.last_login DESC
      LIMIT 200
    `);
    
    // Map data for frontend compatibility
    const mappedData = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      userName: row.user_name,
      email: row.email,
      role: row.role,
      companyName: row.company_name,
      device: row.device,
      browser: row.browser,
      ip: row.ip,
      location: row.location,
      lastLogin: row.lastLogin,
      status: row.session_status
    }));

    res.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('Error fetching all sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions: ' + error.message });
  }
});

// DELETE /api/session/admin/company/:companyId - Kill all sessions for a company
router.delete('/admin/company/:companyId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
    const { companyId } = req.params;
    const result = await query(`
      UPDATE refresh_tokens
         SET revoked = TRUE, revoked_reason = 'admin_company_revoke'
       WHERE user_id IN (SELECT id FROM users WHERE company_id = $1)
         AND revoked = FALSE
      RETURNING id
    `, [companyId]);
    res.json({ 
      success: true, 
      message: `${result.rows.length} session(s) revoked for company`,
      revoked: result.rows.length
    });
  } catch (error) {
    console.error('Error revoking company sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
  }
});

// DELETE /api/session/admin/user/:userId - Kill all sessions for a specific user
router.delete('/admin/user/:userId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
    const { userId } = req.params;
    const result = await query(
      `UPDATE refresh_tokens
          SET revoked = TRUE, revoked_reason = 'admin_user_revoke'
        WHERE user_id = $1 AND revoked = FALSE
        RETURNING id`,
      [userId]
    );
    res.json({ 
      success: true, 
      message: `${result.rows.length} session(s) revoked for user`,
      revoked: result.rows.length
    });
  } catch (error) {
    console.error('Error revoking user sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke user sessions' });
  }
});

export default router;
