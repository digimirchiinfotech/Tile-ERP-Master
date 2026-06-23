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

import { createNotification } from './notificationService.js';
import { debugLogger } from '../utils/debugLogger.js';

/**
 * Check for subscriptions expiring soon and already expired
 * Sends notifications and deactivates expired accounts
 * @param {object} db - Abstract database router
 */
export const checkSubscriptionExpiry = async (db) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tenDaysFromNow = new Date(today);
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    
    const expiringResult = await db.query(
      `SELECT 
        cs.id, cs.company_id, cs.end_date, 
        c.name as company_name,
        sp.name as plan_name,
        u.id as admin_user_id, u.email_id as admin_email
       FROM company_subscriptions cs
       JOIN companies c ON cs.company_id = c.id
       LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
       LEFT JOIN users u ON u.company_id = c.id AND u.role = 'company_admin'
       WHERE cs.status = 'Active'
       AND cs.end_date = $1::date`,
      [tenDaysFromNow.toISOString().split('T')[0]]
    );

    for (const sub of expiringResult.rows) {
      if (sub.admin_user_id) {
        await createNotification(
          sub.admin_user_id,
          'Subscription Renewal Reminder',
          `Your subscription for ${sub.plan_name} expires on ${new Date(sub.end_date).toLocaleDateString('en-GB')}. Please renew to continue using the ERP system.`,
          'warning',
          '/subscriptions',
          db,
          { company_id: sub.company_id }
        );
      }

      const superAdmins = await db.query(
        `SELECT id FROM users WHERE role = 'super_admin' AND is_active = true`
      );
      
      for (const admin of superAdmins.rows) {
        await createNotification(
          admin.id,
          'Company Subscription Expiring Soon',
          `${sub.company_name}'s ${sub.plan_name} subscription expires on ${new Date(sub.end_date).toLocaleDateString('en-GB')}. Please follow up for renewal.`,
          'warning',
          '/admin/subscriptions',
          db
        );
      }
    }

    const expiredResult = await db.query(
      `SELECT 
        cs.id, cs.company_id, cs.end_date,
        c.name as company_name,
        u.id as admin_user_id
       FROM company_subscriptions cs
       JOIN companies c ON cs.company_id = c.id
       LEFT JOIN users u ON u.company_id = c.id AND u.role = 'company_admin'
       WHERE cs.status = 'Active'
       AND cs.end_date < $1::date`,
      [today.toISOString().split('T')[0]]
    );

    for (const sub of expiredResult.rows) {
      await db.query(
        `UPDATE company_subscriptions SET status = 'Expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [sub.id]
      );

      await db.query(
        `UPDATE companies SET status = 'Suspended', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [sub.company_id]
      );

      if (sub.admin_user_id) {
        await createNotification(
          sub.admin_user_id,
          'Subscription Expired',
          `Your subscription has expired on ${new Date(sub.end_date).toLocaleDateString('en-GB')}. Your account is now suspended. Please renew immediately to restore access.`,
          'danger',
          '/subscriptions',
          db,
          { company_id: sub.company_id }
        );
      }

      const superAdmins = await db.query(
        `SELECT id FROM users WHERE role = 'super_admin' AND is_active = true`
      );
      
      for (const admin of superAdmins.rows) {
        await createNotification(
          admin.id,
          'Company Account Suspended',
          `${sub.company_name}'s subscription expired on ${new Date(sub.end_date).toLocaleDateString('en-GB')}. Account has been suspended.`,
          'danger',
          '/admin/subscriptions',
          db
        );
      }
    }

    return {
      expiringInTenDays: expiringResult.rows.length,
      expired: expiredResult.rows.length
    };
  } catch (error) {
    debugLogger.error('SubscriptionService', 'Error checking subscription expiry:', error);
    throw error;
  }
};

/**
 * Get active subscriptions for a company
 */
export const getActiveSubscription = async (companyId, db) => {
  try {
    const result = await db.query(
      `SELECT 
        cs.*,
        sp.name as plan_name,
        sp.price as plan_price,
        sp.duration as plan_duration,
        sp.duration_type as plan_duration_type
       FROM company_subscriptions cs
       LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE cs.company_id = $1 AND cs.status = 'Active'
       ORDER BY cs.created_at DESC
       LIMIT 1`,
      [companyId]
    );

    return result.rows[0] || null;
  } catch (error) {
    debugLogger.error('SubscriptionService', 'Error fetching active subscription:', error);
    throw error;
  }
};

/**
 * Calculate days remaining in subscription
 */
export const getDaysRemaining = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Renew a subscription
 */
export const renewSubscription = async (subscriptionId, durationDays = 30, db) => {
  try {
    const today = new Date();
    const newEndDate = new Date(today);
    newEndDate.setDate(newEndDate.getDate() + durationDays);

    const result = await db.query(
      `UPDATE company_subscriptions 
       SET end_date = $1, status = 'Active', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [newEndDate.toISOString().split('T')[0], subscriptionId]
    );

    if (result.rows.length > 0) {
      await db.query(
        `UPDATE companies SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [result.rows[0].company_id]
      );
    }

    return result.rows[0];
  } catch (error) {
    debugLogger.error('SubscriptionService', 'Error renewing subscription:', error);
    throw error;
  }
};
