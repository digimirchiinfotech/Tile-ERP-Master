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
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken
} from '../utils/tokenManager.js';
import { generateResetToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { sanitizeUser, successResponse } from '../utils/helpers.js';
import env from '../config/env.js';
import { insertAuditLog } from '../middleware/auditLog.js';
import { syncCompanyDatabase } from '../utils/databaseProvisioning.js';
import { notifySpecificUser } from '../services/notificationService.js';
import { isWeakPassword } from '../utils/passwordPolicy.js';
import debugLogger from '../utils/debugLogger.js';
import { invalidateDashboardCache } from './dashboardController.js';


export const register = async (req, res, next) => {
  try {
    const { name, email, password, contact_number, company_id, companyId } = req.body;
    const finalCompanyId = company_id || companyId;
    const assignedRole = 'sales_executive';

    const existingUser = await req.db.globalQuery('SELECT id FROM users WHERE email_id = $1', [email]);
    if (existingUser.rows.length > 0) return next(new AppError('User with this email already exists', 400));

    const passwordHash = await bcrypt.hash(password, env.security.bcryptRounds || 12);
    const generatedUsername = email.split('@')[0];

    const result = await req.db.globalQuery(
      `INSERT INTO users (name, email_id, username, password_hash, role, status, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email_id, username, role, status, created_at`,
      [name, email, generatedUsername, passwordHash, assignedRole, 'Active', finalCompanyId]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user.id, user.email_id, user.role, user.company_id);
    const { token: refreshToken } = generateRefreshToken(user.id);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    await req.db.globalQuery('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, refreshExpiry]);

    const cookieOptions = {
      httpOnly: true,
      secure: env.node_env === 'production',
      sameSite: env.node_env === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return successResponse(res, {
      user: sanitizeUser(user),
      expiresIn: env.jwt.accessExpiry
    }, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, email_id, username, password, loginIdentifier } = req.body;
    const identifier = loginIdentifier || email || email_id || username;

    if (!identifier || !password) return next(new AppError('Identifier and password are required', 400));

    const result = await req.db.globalQuery(
      `SELECT u.id, u.company_id, u.name, u.email_id, u.password_hash, u.role, u.status, u.permissions,
              (to_jsonb(u)->>'must_change_password')::boolean as must_change_password,
              c.name as company_name, c.status as company_status,
              (SELECT COALESCE(json_agg(module_name), '[]'::json) FROM module_access WHERE company_id = u.company_id AND is_enabled = true) as enabled_modules
       FROM users u LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email_id = $1`,
      [identifier]
    );

    if (result.rows.length === 0) return next(new AppError('Invalid email or password', 401));

    const user = result.rows[0];
    if (user.status !== 'Active' && user.status !== 'active') return next(new AppError('Account inactive', 401));
    if (user.role !== 'super_admin' && user.company_status !== 'Active') return next(new AppError('Company inactive', 401));

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return next(new AppError('Invalid email or password', 401));

    const passwordIsWeak = isWeakPassword(password);
    const mustChangePassword = Boolean(user.must_change_password) || passwordIsWeak;

    if (env.node_env === 'production' && user.role === 'super_admin' && passwordIsWeak) {
      return next(new AppError(
        'Your password does not meet security requirements. Run: npm run security:reset-admin-password',
        403
      ));
    }

    if (mustChangePassword && passwordIsWeak) {
      try {
        await req.db.globalQuery(
          'UPDATE users SET must_change_password = TRUE WHERE id = $1',
          [user.id]
        );
      } catch (err) {
        debugLogger.warn('Auth', 'Could not set must_change_password flag', err.message);
      }
    }

    const accessToken = generateAccessToken(user.id, user.email_id, user.role, user.company_id);
    const { token: refreshToken } = generateRefreshToken(user.id);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    try {
      await req.db.globalQuery('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, refreshExpiry]);
    } catch (err) {
      debugLogger.error('Auth', 'Error saving refresh token', err);
    }

    try {
      await req.db.globalQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    } catch (err) {
      debugLogger.error('Auth', 'Error updating last login', err);
    }

    // Sync database schema on login to ensure all columns exist
    if (user.company_id) {
      try {
        req.companyFilter = user.company_id;
        await syncCompanyDatabase(user.company_id, req.db);
      } catch (err) {
        debugLogger.error('Auth', `Failed to sync database for company ${user.company_id}`, err);
      }
    }

    insertAuditLog({
      userId: user.id,
      companyId: user.company_id,
      action: 'LOGIN',
      resourceType: 'auth',
      resourceId: user.id,
      oldValues: null,
      newValues: null,
      ipAddress: req.ip
    }, req.db);

    const userAgent = req.headers['user-agent'] || 'Unknown';
    let browser = 'Unknown';
    let device = 'Desktop';
    
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      device = 'Tablet';
    }

    try {
      await req.db.globalQuery(
        `INSERT INTO active_user_sessions (user_id, refresh_token, ip_address, user_agent, device, browser, location, last_login, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 'Active')`,
        [user.id, refreshToken, req.ip || 'Unknown', userAgent, device, browser, 'Local'] // Using 'Local' or geoip logic
      );
    } catch (err) {
      debugLogger.error('Auth', 'Error saving active session', err);
    }


    const sanitizedUser = sanitizeUser(user);
    let userPermissions = [];
    try {
      userPermissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : (user.permissions || []);
    } catch (e) { userPermissions = []; }

    // Safeguard: Admins always get 'all' permission
    if (['super_admin', 'company_admin', 'admin'].includes(user.role) && !userPermissions.includes('all')) {
      userPermissions.push('all');
    }
    sanitizedUser.permissions = userPermissions;

    const cookieOptions = {
      httpOnly: true,
      secure: env.node_env === 'production',
      sameSite: env.node_env === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return successResponse(res, {
      user: sanitizedUser,
      expiresIn: env.jwt.accessExpiry,
      mustChangePassword,
    }, mustChangePassword ? 'Login successful — password change required' : 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
    if (!token) return next(new AppError('Refresh token required', 400));

    const tokenResult = await req.db.globalQuery('SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1', [token]);
    if (tokenResult.rows.length === 0) return next(new AppError('Invalid refresh token', 401));

    const tokenData = tokenResult.rows[0];
    if (new Date() > new Date(tokenData.expires_at)) {
      await req.db.globalQuery('DELETE FROM refresh_tokens WHERE token = $1', [token]);
      return next(new AppError('Refresh token expired', 401));
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      await req.db.globalQuery('DELETE FROM refresh_tokens WHERE token = $1', [token]);
      return next(new AppError('Invalid refresh token', 401));
    }

    const userResult = await req.db.globalQuery('SELECT id, email_id, role, company_id, status FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) return next(new AppError('User not found', 401));

    const user = userResult.rows[0];
    if (user.status !== 'Active') {
      await req.db.globalQuery('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
      return next(new AppError('Account inactive', 401));
    }

    await req.db.globalQuery('DELETE FROM refresh_tokens WHERE token = $1', [token]);

    const newAccessToken = generateAccessToken(user.id, user.email_id, user.role, user.company_id);
    const { token: newRefreshToken } = generateRefreshToken(user.id);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    await req.db.globalQuery('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, newRefreshToken, refreshExpiry]);

    const cookieOptions = {
      httpOnly: true,
      secure: env.node_env === 'production',
      sameSite: env.node_env === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    res.cookie('accessToken', newAccessToken, cookieOptions);
    if (newRefreshToken) {
      res.cookie('refreshToken', newRefreshToken, cookieOptions);
    }

    return successResponse(res, {
      expiresIn: env.jwt.accessExpiry
    }, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const userResult = await req.db.globalQuery('SELECT id, name, email_id FROM users WHERE email_id = $1', [email]);
    if (userResult.rows.length === 0) return successResponse(res, {}, 'Reset link sent if email exists');

    const user = userResult.rows[0];
    const resetToken = generateResetToken();
    const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 1);

    await req.db.globalQuery('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await req.db.globalQuery('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, resetToken, expiresAt]);
    await sendPasswordResetEmail(email, resetToken, user.name);

    return successResponse(res, {}, 'Reset link sent if email exists');
  } catch (error) {
    next(error);
  }
};

export const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await req.db.globalQuery('SELECT id, expires_at FROM password_reset_tokens WHERE token = $1', [token]);
    if (result.rows.length === 0) return next(new AppError('Invalid or expired token', 400));
    if (new Date() > new Date(result.rows[0].expires_at)) return next(new AppError('Token expired', 400));
    return successResponse(res, { valid: true }, 'Token is valid');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    const tokenResult = await req.db.globalQuery('SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = $1', [token]);
    if (tokenResult.rows.length === 0) return next(new AppError('Invalid or expired token', 400));
    if (new Date() > new Date(tokenResult.rows[0].expires_at)) return next(new AppError('Token expired', 400));

    const passwordHash = await bcrypt.hash(new_password, env.security.bcryptRounds || 12);
    await req.db.globalQuery('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, tokenResult.rows[0].user_id]);
    await req.db.globalQuery('DELETE FROM password_reset_tokens WHERE id = $1', [tokenResult.rows[0].id]);
    await req.db.globalQuery('DELETE FROM refresh_tokens WHERE user_id = $1', [tokenResult.rows[0].user_id]);

    notifySpecificUser(tokenResult.rows[0].user_id, {
      title: 'Password Reset Successful',
      message: 'Your account password has been changed successfully. If you did not make this change, please contact an administrator immediately.',
      type: 'warning',
      module: 'Security',
      priority: 'critical'
    }, req.db);

    return successResponse(res, {}, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await req.db.globalQuery(
      `SELECT u.id, u.company_id, u.name, u.email_id, u.role, u.avatar_url, u.status, u.last_login, u.created_at, u.permissions, u.contact_number, u.settings, c.name as company_name,
              (SELECT COALESCE(json_agg(module_name), '[]'::json) FROM module_access WHERE company_id = u.company_id AND is_enabled = true) as enabled_modules
       FROM users u LEFT JOIN companies c ON u.company_id = c.id WHERE u.id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    const sanitizedUser = sanitizeUser(user);
    let userPermissions = [];
    try {
      userPermissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : (user.permissions || []);
    } catch (e) { userPermissions = []; }

    // Safeguard: Admins always get 'all' permission
    if (['super_admin', 'company_admin', 'admin'].includes(user.role) && !userPermissions.includes('all')) {
      userPermissions.push('all');
    }
    sanitizedUser.permissions = userPermissions;

    return successResponse(res, sanitizedUser, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
    if (refreshToken) await req.db.globalQuery('DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2', [refreshToken, req.user.id]);
    await req.db.globalQuery('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < CURRENT_TIMESTAMP', [req.user.id]);

    insertAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'LOGOUT',
      resourceType: 'auth',
      resourceId: req.user.id,
      oldValues: null,
      newValues: null,
      ipAddress: req.ip
    }, req.db);

    try {
      if (refreshToken) {
        await req.db.globalQuery('UPDATE active_user_sessions SET status = $1 WHERE refresh_token = $2', ['Inactive', refreshToken]);
      }
    } catch (err) {
      debugLogger.error('Auth', 'Error updating active session on logout', err);
    }

    // Invalidate this user's dashboard cache on logout
    try { invalidateDashboardCache(req.user.id); } catch (_) {}

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return successResponse(res, {}, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  refreshToken,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getCurrentUser,
  logout
};
