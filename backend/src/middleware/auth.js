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

import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { query } from '../config/database.js';
import { AppError } from './errorHandler.js';
import { verifyAccessToken } from '../utils/tokenManager.js';
import { dbRouter } from './dbRouter.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    // SECURITY FIX: Accept tokens via Authorization header OR HttpOnly cookie.
    // The frontend tokenManager returns 'cookie-auth-active' when using cookies.
    // If we receive this placeholder, or 'null', ignore it and read from the cookie.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const headerToken = req.headers.authorization.split(' ')[1];
      if (headerToken && headerToken !== 'cookie-auth-active' && headerToken !== 'null' && headerToken !== 'undefined') {
        token = headerToken;
      }
    }
    
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    try {
      const decoded = verifyAccessToken(token);
      
      if (!decoded) {
        return next(new AppError('Invalid or expired token', 401));
      }

      // Production-ready authentication
      const result = await query(
        `SELECT 
          u.id, u.company_id, u.name, u.email_id, u.role, u.status, u.permissions,
          c.name as company_name, c.status as company_status
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         WHERE u.id = $1`,
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return next(new AppError('User not found', 401));
      }

      const user = result.rows[0];

      if (user.status !== 'Active' && user.status !== 'active') {
        return next(new AppError('User account is not active. Please contact support.', 401));
      }

      if (user.role !== 'super_admin' && user.company_status !== 'Active' && user.company_status !== 'active') {
        return next(new AppError('Company account is not active. Please contact support.', 401));
      }

      let userPermissions = [];
      try {
        userPermissions = typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : (user.permissions || []);
      } catch (e) {
        userPermissions = [];
      }

      // Safeguard: Admins always get 'all' permission
      if (['super_admin', 'company_admin', 'admin'].includes(user.role) && !userPermissions.includes('all')) {
        userPermissions.push('all');
      }

      req.user = {
        id: user.id,
        companyId: user.company_id,
        name: user.name,
        emailId: user.email_id,
        email_id: user.email_id,
        role: user.role,
        permissions: userPermissions,
        companyName: user.company_name
      };

      next();
    } catch (err) {
      return next(new AppError('Invalid or expired token', 401));
    }
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const headerToken = req.headers.authorization.split(' ')[1];
      if (headerToken && headerToken !== 'cookie-auth-active' && headerToken !== 'null' && headerToken !== 'undefined') {
        token = headerToken;
      }
    }
    
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      
      if (!decoded || decoded.type !== 'access') {
        return next();
      }
      
      const result = await query(
        'SELECT id, company_id, name, email_id, role, permissions FROM users WHERE id = $1 AND status = $2',
        [decoded.id, 'Active']
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
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

        req.user = {
          id: user.id,
          companyId: user.company_id,
          name: user.name,
          emailId: user.email_id,
          email_id: user.email_id,
          role: user.role,
          permissions: userPermissions
        };
      }
    } catch (err) {
      // Invalid token but optional - continue without user
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const filterByCompany = async (req, res, next) => {
  // MED-SEC-004 FIX: Validate company header as UUID before trusting it
  let rawHeader = req.headers['x-company-id'] || req.headers['x-selected-company-id'] || req.query.company_id;
  if (rawHeader === 'null' || rawHeader === 'undefined') rawHeader = null;
  
  const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const selectedCompanyHeader = rawHeader && UUID_REGEX.test(rawHeader) ? rawHeader : null;

  // Reject requests with a malformed (non-UUID) company header
  if (rawHeader && !selectedCompanyHeader) {
    return next(new AppError('Invalid company ID format in request header', 400));
  }

  // If not authenticated, we can only provide global context
  if (!req.user) {
    req.companyFilter = null;
    return dbRouter(req, res, next);
  }

  try {
    if (req.user.role === 'super_admin') {
      if (selectedCompanyHeader) {
        // Super Admin with a selected company context — scoped to that company
        req.companyFilter = selectedCompanyHeader;
      } else {
        // Super Admin without selected company context — global scope
        req.companyFilter = null;
      }
    } else {
      // Regular user: ALWAYS restricted to their own company, regardless of headers
      req.companyFilter = req.user.companyId;

      // If a regular user tries to scope to a DIFFERENT company, reject it
      if (selectedCompanyHeader && selectedCompanyHeader !== req.user.companyId) {
        return next(new AppError('Unauthorized access', 404));
      }
    }

    // Safety check: Non-super_admin users MUST always have a company context
    if (req.companyFilter === null && req.user && req.user.role !== 'super_admin') {
      return next(new AppError('Tenant context missing', 403));
    }

    // Attach Context-Aware Database Router (routes queries to correct tenant DB)
    dbRouter(req, res, next);
  } catch (error) {
    next(error);
  }
};
