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
import { requirePermission } from '../middleware/rbac.js';
import { runConsistencyCheck } from '../services/consistencyCheckService.js';

const router = express.Router();

router.get('/consistency-check', authenticate, filterByCompany, requirePermission('all'), async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { issues, stats } = await runConsistencyCheck(companyId, req.db);
    res.json({
      success: true,
      issues,
      stats,
      checkedAt: new Date(),
      totalIssues: issues.length
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/audit-logs',
  authenticate,
  filterByCompany,
  requirePermission('all'),
  async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource_type,
      user_id,
      date_from,
      date_to,
      resource_id
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;
    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (req.user.role !== 'super_admin' && req.user.companyId) {
      conditions.push(`al.company_id = $${paramCount}`);
      values.push(req.user.companyId);
      paramCount++;
    }

    if (action) {
      conditions.push(`al.action = $${paramCount}`);
      values.push(action);
      paramCount++;
    }

    if (resource_type) {
      conditions.push(`al.resource_type = $${paramCount}`);
      values.push(resource_type);
      paramCount++;
    }

    if (user_id) {
      conditions.push(`al.user_id = $${paramCount}`);
      values.push(user_id);
      paramCount++;
    }

    if (resource_id) {
      conditions.push(`CAST(al.resource_id AS TEXT) = $${paramCount}`);
      values.push(resource_id);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`al.created_at >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`al.created_at <= $${paramCount}`);
      values.push(date_to + 'T23:59:59.999Z');
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT al.* 
       FROM audit_logs al
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, limitNum, offset]
    );

    if (result.rows.length > 0) {
      const companyIds = [...new Set(result.rows.map(r => r.company_id).filter(Boolean))];
      const userIds = [...new Set(result.rows.map(r => r.user_id).filter(Boolean))];
      
      if (companyIds.length > 0 || userIds.length > 0) {
        const globalClient = await req.db.getGlobalClient();
        try {
          const companyMap = {};
          if (companyIds.length > 0) {
            const companiesRes = await globalClient.query(
              `SELECT id, name as company_name FROM companies WHERE id = ANY($1)`,
              [companyIds]
            );
            companiesRes.rows.forEach(c => {
              companyMap[c.id] = c.company_name;
            });
          }

          const userMap = {};
          if (userIds.length > 0) {
            const usersRes = await globalClient.query(
              `SELECT id, name as user_name, email_id as user_email FROM users WHERE id = ANY($1)`,
              [userIds]
            );
            usersRes.rows.forEach(u => {
              userMap[u.id] = { user_name: u.user_name, user_email: u.user_email };
            });
          }

          result.rows.forEach(r => {
            if (r.company_id && companyMap[r.company_id]) {
              r.company_name = companyMap[r.company_id];
            }
            if (r.user_id && userMap[r.user_id]) {
              r.user_name = userMap[r.user_id].user_name;
              r.user_email = userMap[r.user_id].user_email;
            }
          });
        } catch (err) {
          // Ignore if global DB query fails
          console.error("Failed to map global fields:", err);
        } finally {
          globalClient.release();
        }
      }
    }

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/audit-logs/filters', authenticate, filterByCompany, requirePermission('all'), async (req, res, next) => {
  try {
    let companyFilter = '';
    let values = [];

    if (req.companyFilter) {
      companyFilter = 'WHERE company_id = $1';
      values = [req.companyFilter];
    }

    const [actions, resourceTypes] = await Promise.all([
      req.db.query(`SELECT DISTINCT action FROM audit_logs ${companyFilter} ORDER BY action`, values),
      req.db.query(`SELECT DISTINCT resource_type FROM audit_logs ${companyFilter} ORDER BY resource_type`, values)
    ]);

    res.json({
      success: true,
      actions: actions.rows.map(r => r.action),
      resourceTypes: resourceTypes.rows.map(r => r.resource_type)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
