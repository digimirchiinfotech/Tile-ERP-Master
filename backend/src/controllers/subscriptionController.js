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

import { debugLogger } from '../utils/debugLogger.js';
import { AppError } from '../middleware/errorHandler.js';
import { 
  successResponse, 
  getPagination, 
  paginationResponse 
} from '../utils/helpers.js';
import { checkSubscriptionExpiry } from '../services/subscriptionService.js';
import { createNotification } from '../services/notificationService.js';

// =====================================================
// SUBSCRIPTION PLANS CONTROLLERS
// =====================================================

export const getAllPlans = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`name ILIKE $${paramCount}`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.globalQuery(
      `SELECT COUNT(*) FROM subscription_plans ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.globalQuery(
      `SELECT * FROM subscription_plans 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Subscription plans retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await req.db.globalQuery(`SELECT * FROM subscription_plans WHERE id = $1`, [id]);
    if (result.rows.length === 0) return next(new AppError('Subscription plan not found', 404));
    return successResponse(res, result.rows[0], 'Subscription plan retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const { name, price = 0, duration = 30, duration_type = 'days', features = [], max_users, max_companies = 1, status = 'Active', code } = req.body;
    
    debugLogger.info('[SubscriptionController] Creating plan:', { name, code });

    // Generate a unique code if not provided
    const planCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const result = await req.db.globalQuery(
      `INSERT INTO subscription_plans 
       (name, code, price, duration, duration_type, features, max_users, max_companies, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name, planCode, price, duration, duration_type, JSON.stringify(Array.isArray(features) ? features : []), max_users || null, max_companies, status]
    );
    
    debugLogger.info('[SubscriptionController] Plan created successfully:', result.rows[0].id);
    return successResponse(res, result.rows[0], 'Subscription plan created successfully', 201);
  } catch (error) {
    debugLogger.error('[SubscriptionController] Error in createPlan:', error.message);
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, code, price, duration, duration_type, features, max_users, max_companies, status } = req.body;

    debugLogger.info('[SubscriptionController] Updating plan:', id);

    const existingPlan = await req.db.globalQuery(`SELECT id FROM subscription_plans WHERE id = $1`, [id]);
    if (existingPlan.rows.length === 0) return next(new AppError('Subscription plan not found', 404));

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
    if (code !== undefined) { updates.push(`code = $${paramCount++}`); values.push(code); }
    if (price !== undefined) { updates.push(`price = $${paramCount++}`); values.push(price); }
    if (duration !== undefined) { updates.push(`duration = $${paramCount++}`); values.push(duration); }
    if (duration_type !== undefined) { updates.push(`duration_type = $${paramCount++}`); values.push(duration_type); }
    if (features !== undefined) { updates.push(`features = $${paramCount++}`); values.push(JSON.stringify(Array.isArray(features) ? features : [])); }
    if (max_users !== undefined) { updates.push(`max_users = $${paramCount++}`); values.push(max_users); }
    if (max_companies !== undefined) { updates.push(`max_companies = $${paramCount++}`); values.push(max_companies); }
    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }

    if (updates.length === 0) return next(new AppError('No fields to update', 400));

    values.push(id);

    const result = await req.db.globalQuery(`UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
    debugLogger.info('[SubscriptionController] Plan updated successfully:', id);
    return successResponse(res, result.rows[0], 'Subscription plan updated successfully');
  } catch (error) {
    debugLogger.error('[SubscriptionController] Error in updatePlan:', error.message);
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingPlan = await req.db.globalQuery(`SELECT id FROM subscription_plans WHERE id = $1`, [id]);
    if (existingPlan.rows.length === 0) return next(new AppError('Subscription plan not found', 404));

    const activeSubscriptions = await req.db.globalQuery(`SELECT COUNT(*) FROM company_subscriptions WHERE plan_id = $1 AND status = 'Active'`, [id]);
    if (parseInt(activeSubscriptions.rows[0].count) > 0) return next(new AppError('Cannot delete plan with active subscriptions', 400));

    const result = await req.db.globalQuery(`DELETE FROM subscription_plans WHERE id = $1 RETURNING id, name`, [id]);
    return successResponse(res, result.rows[0], 'Subscription plan deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const togglePlanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const selectResult = await req.db.globalQuery(`SELECT id, status FROM subscription_plans WHERE id = $1`, [id]);
    if (selectResult.rows.length === 0) return next(new AppError('Subscription plan not found', 404));

    const newStatus = selectResult.rows[0].status === 'Active' ? 'Inactive' : 'Active';
    const { rows } = await req.db.globalQuery(`UPDATE subscription_plans SET status = $1 WHERE id = $2 RETURNING *`, [newStatus, id]);
    return successResponse(res, rows[0], `Subscription plan status changed to ${newStatus}`);
  } catch (error) {
    next(error);
  }
};

// =====================================================
// COMPANY SUBSCRIPTIONS CONTROLLERS
// =====================================================

export const getAllSubscriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status, company_id } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    // Super admin sees ALL subscriptions unless they explicitly filter by company
    if (req.user.role === 'super_admin') {
      if (company_id) {
        conditions.push(`cs.company_id = $${paramCount++}`);
        values.push(company_id);
      }
      // No filter = see all companies' subscriptions
    } else {
      // Regular users: always restricted to their own company
      if (req.companyFilter) {
        conditions.push(`cs.company_id = $${paramCount++}`);
        values.push(req.companyFilter);
      }
    }

    if (search) {
      conditions.push(`(c.name ILIKE $${paramCount} OR sp.name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`cs.status = $${paramCount++}`);
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.globalQuery(
      `SELECT COUNT(*) FROM company_subscriptions cs
       LEFT JOIN companies c ON cs.company_id = c.id
       LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.globalQuery(
      `SELECT cs.*, c.name as company_name, sp.name as plan_name, sp.price as plan_price,
              sp.duration as plan_duration, sp.duration_type as plan_duration_type
       FROM company_subscriptions cs
       LEFT JOIN companies c ON cs.company_id = c.id
       LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
       ${whereClause}
       ORDER BY cs.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(res, paginationResponse(result.rows, total, page, limit), 'Company subscriptions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let whereConditions = 'WHERE cs.id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND cs.company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const result = await req.db.globalQuery(
      `SELECT cs.*, c.name as company_name, c.email as company_email, sp.name as plan_name,
              sp.price as plan_price, sp.duration as plan_duration, sp.duration_type as plan_duration_type,
              sp.features as plan_features
       FROM company_subscriptions cs
       LEFT JOIN companies c ON cs.company_id = c.id
       LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
       ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) return next(new AppError('Subscription not found', 404));
    return successResponse(res, result.rows[0], 'Subscription retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createSubscription = async (req, res, next) => {
  try {
    const { company_id, plan_id, start_date, end_date, next_payment, status = 'Active', payment_method, amount } = req.body;
    const companyExists = await req.db.globalQuery(`SELECT id FROM companies WHERE id = $1`, [company_id]);
    if (companyExists.rows.length === 0) return next(new AppError('Company not found', 404));

    const planExists = await req.db.globalQuery(`SELECT * FROM subscription_plans WHERE id = $1`, [plan_id]);
    if (planExists.rows.length === 0) return next(new AppError('Subscription plan not found', 404));

    const planAmount = amount !== undefined ? amount : planExists.rows[0].price;

    const result = await req.db.globalQuery(
      `INSERT INTO company_subscriptions 
       (company_id, plan_id, start_date, end_date, next_payment, status, payment_method, amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [company_id, plan_id, start_date, end_date, next_payment || null, status, payment_method || null, planAmount]
    );

    // Log Transaction for the new subscription
    if (status === 'Active' && planAmount > 0) {
      await req.db.globalQuery(
        `INSERT INTO subscription_transactions (company_id, plan_id, amount, payment_method, transaction_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          company_id,
          plan_id,
          planAmount,
          payment_method || 'Manual',
          `TXN-${Date.now()}-${company_id.substring(0, 8)}`,
          'Paid'
        ]
      );
    }

    return successResponse(res, result.rows[0], 'Subscription created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan_id, start_date, end_date, next_payment, status, payment_method, amount } = req.body;

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];
    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      checkParams.push(req.companyFilter);
    }

    const existingSubscription = await req.db.globalQuery(`SELECT * FROM company_subscriptions ${whereConditions}`, checkParams);
    if (existingSubscription.rows.length === 0) return next(new AppError('Subscription not found', 404));

    if (plan_id !== undefined) {
      const planExists = await req.db.globalQuery(`SELECT * FROM subscription_plans WHERE id = $1`, [plan_id]);
      if (planExists.rows.length === 0) return next(new AppError('Subscription plan not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (plan_id !== undefined) { updates.push(`plan_id = $${paramCount++}`); values.push(plan_id); }
    if (start_date !== undefined) { updates.push(`start_date = $${paramCount++}`); values.push(start_date); }
    if (end_date !== undefined) { updates.push(`end_date = $${paramCount++}`); values.push(end_date); }
    if (next_payment !== undefined) { updates.push(`next_payment = $${paramCount++}`); values.push(next_payment); }
    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
    if (payment_method !== undefined) { updates.push(`payment_method = $${paramCount++}`); values.push(payment_method); }
    if (amount !== undefined) { updates.push(`amount = $${paramCount++}`); values.push(amount); }

    if (updates.length === 0) return next(new AppError('No fields to update', 400));

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      values.push(req.companyFilter);
      whereConditions = `WHERE id = $${paramCount} AND company_id = $${paramCount + 1}`;
    } else {
      whereConditions = `WHERE id = $${paramCount}`;
    }

    const result = await req.db.globalQuery(`UPDATE company_subscriptions SET ${updates.join(', ')} ${whereConditions} RETURNING *`, values);
    return successResponse(res, result.rows[0], 'Subscription updated successfully');
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];
    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingSubscription = await req.db.globalQuery(`SELECT * FROM company_subscriptions ${whereConditions}`, queryParams);
    if (existingSubscription.rows.length === 0) return next(new AppError('Subscription not found', 404));
    if (existingSubscription.rows[0].status === 'Cancelled') return next(new AppError('Subscription is already cancelled', 400));

    const result = await req.db.globalQuery(`UPDATE company_subscriptions SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP ${whereConditions} RETURNING *`, queryParams);
    return successResponse(res, result.rows[0], 'Subscription cancelled successfully');
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    const [totalSubscriptions, activeSubscriptions, revenueByPlan, monthlyRevenue, statusBreakdown, expiringSoon, financials] = await Promise.all([
      req.db.globalQuery('SELECT COUNT(*) FROM company_subscriptions'),
      req.db.globalQuery(`SELECT COUNT(*) FROM company_subscriptions WHERE status = 'Active'`),
      req.db.globalQuery(`SELECT sp.name as plan_name, COUNT(cs.id) as subscription_count, SUM(cs.amount) as total_revenue, AVG(cs.amount) as average_revenue FROM company_subscriptions cs LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id GROUP BY sp.id, sp.name ORDER BY total_revenue DESC`),
      req.db.globalQuery(`SELECT DATE_TRUNC('month', start_date) as month, COUNT(id) as new_subscriptions, SUM(amount) as revenue FROM company_subscriptions WHERE start_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY DATE_TRUNC('month', start_date) ORDER BY month DESC LIMIT 12`),
      req.db.globalQuery(`SELECT status, COUNT(*) as count FROM company_subscriptions GROUP BY status`),
      req.db.globalQuery(`SELECT cs.*, c.name as company_name, sp.name as plan_name FROM company_subscriptions cs LEFT JOIN companies c ON cs.company_id = c.id LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id WHERE cs.end_date <= CURRENT_DATE + INTERVAL '30 days' AND cs.end_date >= CURRENT_DATE AND cs.status = 'Active' ORDER BY cs.end_date ASC LIMIT 10`),
      req.db.globalQuery(`
        SELECT 
          SUM(CASE WHEN sp.duration_type = 'month' THEN cs.amount WHEN sp.duration_type = 'year' THEN cs.amount / 12 ELSE cs.amount END) as mrr,
          SUM(CASE WHEN sp.duration_type = 'month' THEN cs.amount * 12 WHEN sp.duration_type = 'year' THEN cs.amount ELSE cs.amount * 12 END) as arr
        FROM company_subscriptions cs
        JOIN subscription_plans sp ON cs.plan_id = sp.id
        WHERE cs.status = 'Active'
      `)
    ]);

    return successResponse(res, {
      overview: { total_subscriptions: parseInt(totalSubscriptions.rows[0].count), active_subscriptions: parseInt(activeSubscriptions.rows[0].count) },
      financials: {
        mrr: parseFloat(financials.rows[0].mrr || 0),
        arr: parseFloat(financials.rows[0].arr || 0)
      },
      revenue_by_plan: revenueByPlan.rows,
      monthly_revenue_trend: monthlyRevenue.rows,
      status_breakdown: statusBreakdown.rows,
      expiring_soon: expiringSoon.rows
    }, 'Subscription analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];
    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }
    const { rows } = await req.db.globalQuery(`DELETE FROM company_subscriptions ${whereConditions} RETURNING id`, queryParams);
    if (rows.length === 0) return next(new AppError('Subscription not found', 404));
    return successResponse(res, { id: rows[0].id }, 'Subscription permanently deleted');
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];
    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }
    const selectResult = await req.db.globalQuery(`SELECT id, status FROM company_subscriptions ${whereConditions}`, queryParams);
    if (selectResult.rows.length === 0) return next(new AppError('Subscription not found', 404));

    const newStatus = selectResult.rows[0].status === 'Active' ? 'Inactive' : 'Active';
    queryParams.push(newStatus);
    const { rows } = await req.db.globalQuery(`UPDATE company_subscriptions SET status = $${queryParams.length} ${whereConditions} RETURNING *`, queryParams);
    return successResponse(res, rows[0], `Subscription status changed to ${newStatus}`);
  } catch (error) {
    next(error);
  }
};

export const checkExpiryStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') return next(new AppError('Forbidden', 403));
    const result = await checkSubscriptionExpiry(req.db);
    return successResponse(res, result, 'Subscription expiry check completed');
  } catch (error) {
    next(error);
  }
};

export const renewSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { duration_days = 30 } = req.body;
    
    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];
    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const sub = await req.db.globalQuery(`SELECT * FROM company_subscriptions ${whereConditions}`, queryParams);
    if (sub.rows.length === 0) return next(new AppError('Subscription not found', 404));

    const today = new Date();
    const newEndDate = new Date(today);
    newEndDate.setDate(newEndDate.getDate() + parseInt(duration_days));

    const result = await req.db.globalQuery(
      `UPDATE company_subscriptions 
       SET end_date = $1, status = 'Active', updated_at = CURRENT_TIMESTAMP 
       ${whereConditions} 
       RETURNING *`,
      [newEndDate.toISOString().split('T')[0], ...queryParams]
    );

    // Log Transaction
    await req.db.globalQuery(
      `INSERT INTO subscription_transactions (company_id, plan_id, amount, payment_method, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        result.rows[0].company_id,
        result.rows[0].plan_id,
        sub.rows[0].amount || 0,
        'Admin Renewal',
        `TXN-${Date.now()}-${id.substring(0, 8)}`,
        'Paid'
      ]
    );

    return successResponse(res, result.rows[0], 'Subscription renewed successfully');
  } catch (error) {
    next(error);
  }
};

export const getExpiringSubscriptions = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    let whereConditions = `WHERE status = 'Active' AND end_date <= CURRENT_DATE + INTERVAL '$1 days' AND end_date >= CURRENT_DATE`;
    let queryParams = [parseInt(days)];

    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const result = await req.db.globalQuery(
      `SELECT cs.*, c.name as company_name, sp.name as plan_name 
       FROM company_subscriptions cs 
       LEFT JOIN companies c ON cs.company_id = c.id 
       LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id 
       ${whereConditions} 
       ORDER BY end_date ASC`,
      queryParams
    );

    return successResponse(res, result.rows, 'Expiring subscriptions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const { limit = 100, offset = 0, company_id } = req.query;

    let whereConditions = '';
    let queryParams = [parseInt(limit), parseInt(offset)];

    // super_admin sees ALL transactions; optionally filter by company_id query param
    if (req.user.role === 'super_admin') {
      if (company_id) {
        whereConditions = 'WHERE st.company_id = $3';
        queryParams.push(company_id);
      }
    } else if (req.companyFilter) {
      whereConditions = 'WHERE st.company_id = $3';
      queryParams.push(req.companyFilter);
    }

    const result = await req.db.globalQuery(
      `SELECT st.*, c.name as company_name, sp.name as plan_name 
       FROM subscription_transactions st
       JOIN companies c ON st.company_id = c.id
       JOIN subscription_plans sp ON st.plan_id = sp.id
       ${whereConditions}
       ORDER BY COALESCE(st.payment_date, st.created_at) DESC
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    return successResponse(res, result.rows, 'Subscription transactions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getAnalytics,
  hardDelete,
  toggleStatus,
  togglePlanStatus,
  checkExpiryStatus,
  renewSubscription,
  getExpiringSubscriptions,
  getTransactions
};
