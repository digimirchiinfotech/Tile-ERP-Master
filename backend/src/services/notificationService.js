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
import socketService from './socketService.js';
import { sendSystemNotificationEmail } from './emailService.js';
import { z } from 'zod';

const CONTEXT = 'NotificationService';

// Schema self-heal guard — runs once per tenant pool
const healedPools = new Set();

/**
 * Ensure the notifications table has all required columns.
 * Runs once per database connection (tenant).
 */
const ensureNotificationSchema = async (db) => {
  if (!db || !db.query) return;
  
  // Use a stable identifier for the pool
  const poolKey = db._poolId || db._companyId || 'default';
  if (healedPools.has(poolKey)) return;

  try {
    const queryFn = db.query.bind(db);
    await queryFn(`
      DO $$
      BEGIN
        -- Ensure the table exists
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          user_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          notification_type VARCHAR(50),
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP,
          redirect_url VARCHAR(500),
          module VARCHAR(100),
          reference_id UUID,
          reference_type VARCHAR(100),
          reference_no VARCHAR(100),
          priority VARCHAR(20) DEFAULT 'normal',
          role_id VARCHAR(50),
          created_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Add missing columns to existing tables
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='redirect_url') THEN
          ALTER TABLE notifications ADD COLUMN redirect_url VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='module') THEN
          ALTER TABLE notifications ADD COLUMN module VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='reference_id') THEN
          ALTER TABLE notifications ADD COLUMN reference_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='reference_type') THEN
          ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='reference_no') THEN
          ALTER TABLE notifications ADD COLUMN reference_no VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read_at') THEN
          ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='priority') THEN
          ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='role_id') THEN
          ALTER TABLE notifications ADD COLUMN role_id VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='notification_type') THEN
          ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='created_by') THEN
          ALTER TABLE notifications ADD COLUMN created_by UUID;
        END IF;

        -- Migrate legacy action_url to redirect_url
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='action_url') THEN
          UPDATE notifications SET redirect_url = action_url WHERE redirect_url IS NULL AND action_url IS NOT NULL;
        END IF;

        -- Make company_id nullable if it isn't already
        ALTER TABLE notifications ALTER COLUMN company_id DROP NOT NULL;

      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notification schema heal warning: %', SQLERRM;
      END $$;
    `);
    healedPools.add(poolKey);
  } catch (err) {
    debugLogger.warn(CONTEXT, `Schema self-heal warning (non-fatal): ${err.message}`);
  }
};

/**
 * Create a notification for a specific user within a company context.
 * This is the SINGLE entry point for all notification creation.
 */
export const notifyUser = async (companyId, userId, notification, db) => {
  try {
    if (!db || !userId) return null;
    await ensureNotificationSchema(db);

    let {
      title,
      message,
      type = 'info',
      notification_type,
      redirect_url,
      actionUrl,
      action_url,
      module,
      reference_id,
      reference_type,
      reference_no,
      priority = 'normal',
      role_id,
      created_by
    } = notification;

    // Fix Notification UUID Bug: Ensure created_by is a valid UUID, otherwise nullify it
    if (created_by) {
      const uuidSchema = z.string().uuid();
      const parsed = uuidSchema.safeParse(created_by);
      if (!parsed.success) {
        debugLogger.warn(CONTEXT, `Invalid UUID provided for created_by: "${created_by}". Setting to null.`);
        created_by = null;
      }
    }

    // Resolve redirect URL from multiple possible fields
    const resolvedUrl = redirect_url || actionUrl || action_url || null;

    const result = await db.query(
      `INSERT INTO notifications 
       (company_id, user_id, title, message, type, notification_type, redirect_url, module, reference_id, reference_type, reference_no, priority, role_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId || null,
        userId,
        title || 'Notification',
        message || '',
        type,
        notification_type || null,
        resolvedUrl,
        module || null,
        reference_id || null,
        reference_type || null,
        reference_no || null,
        priority,
        role_id || null,
        created_by || null
      ]
    );

    const newNotification = result.rows[0];

    // Push real-time notification via Socket.IO
    socketService.emitToUser(userId, 'new_notification', newNotification);

    // Conditional Email Trigger for High/Critical Priority
    if (priority === 'high' || priority === 'critical') {
      try {
        const userRes = await db.query('SELECT email_id FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].email_id) {
          sendSystemNotificationEmail(
            userRes.rows[0].email_id,
            title || 'Important Notification',
            message || 'You have a new important notification in the system.'
          ).catch(e => debugLogger.warn(CONTEXT, 'Failed to send priority email background task', e.message));
        }
      } catch (err) {
        debugLogger.error(CONTEXT, 'Error checking user email for notification', err);
      }
    }

    return newNotification;
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyUser: ${error.message}`);
    return null;
  }
};

/**
 * Legacy alias — routes through notifyUser
 */
export const createNotification = async (userId, title, message, type = 'info', actionUrl = null, db, extraData = {}) => {
  const companyId = extraData.company_id || null;
  return notifyUser(companyId, userId, {
    title,
    message,
    type,
    redirect_url: actionUrl,
    ...extraData
  }, db);
};

/**
 * Notify multiple users in a company based on their roles
 */
export const notifyUsersByRoles = async (companyId, roles, notification, db) => {
  try {
    if (!db || !Array.isArray(roles) || roles.length === 0) return [];

    // Use globalQuery if available (for users table in master DB), fallback to query
    const queryFn = db.globalQuery || db.query;
    const users = await queryFn.call(db,
      'SELECT id, email_id FROM users WHERE company_id = $1 AND role = ANY($2) AND status = $3',
      [companyId, roles, 'Active']
    );

    const results = [];
    for (const user of users.rows) {
      const res = await notifyUser(companyId, user.id, notification, db);
      if (res) results.push(res);
    }
    return results;
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyUsersByRoles: ${error.message}`);
    return [];
  }
};

/**
 * Alias for notifyUsersByRoles
 */
export const notifyRoles = notifyUsersByRoles;

/**
 * Notify a specific user by ID (shorthand that auto-resolves company)
 */
export const notifySpecificUser = async (userId, notification, db) => {
  return notifyUser(notification.company_id || null, userId, notification, db);
};

/**
 * Handle QC failure notifications
 */
export const notifyQCFailed = async (companyId, qcRecord, reason, db) => {
  try {
    const title = '⚠️ QC Inspection Failed';
    const message = `Product ${qcRecord.product_name || 'Unknown'} failed QC inspection. Reason: ${reason}`;
    const actionUrl = `/qc-management`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'super_admin'], {
      title,
      message,
      type: 'error',
      redirect_url: actionUrl,
      module: 'QC',
      reference_id: qcRecord.id,
      reference_type: 'qc_record',
      priority: 'high'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyQCFailed: ${error.message}`);
  }
};

/**
 * Handle QC completion notifications
 */
export const notifyQCCompleted = async (companyId, qcRecord, db) => {
  try {
    const title = '✅ QC Inspection Completed';
    const message = `QC inspection for ${qcRecord.product_name || qcRecord.qc_id || 'record'} has been completed. Result: ${qcRecord.result || 'N/A'}`;
    
    await notifyRoles(companyId, ['company_admin', 'admin', 'export_documents', 'sales_manager'], {
      title,
      message,
      type: 'success',
      redirect_url: `/qc-management`,
      module: 'QC',
      reference_id: qcRecord.id,
      reference_type: 'qc_record',
      priority: 'normal'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyQCCompleted: ${error.message}`);
  }
};

/**
 * Handle Order Status Change notifications
 */
export const notifyOrderStatusChange = async (companyId, order, newStatus, db) => {
  try {
    const title = `📦 Order Status: ${newStatus}`;
    const message = `PO ${order.order_no || order.id} status updated to ${newStatus}`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'super_admin', 'purchase_manager'], {
      title,
      message,
      type: 'info',
      redirect_url: `/order-dashboard`,
      module: 'Proforma Order',
      reference_id: order.id,
      reference_type: 'proforma_order'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyOrderStatusChange: ${error.message}`);
  }
};

/**
 * Notify when an Export Invoice is created
 */
export const notifyExportInvoiceCreated = async (companyId, invoice, db) => {
  try {
    const title = '📄 New Export Invoice Created';
    const message = `Export Invoice ${invoice.invoice_no || ''} has been created for ${invoice.client_name || 'client'}`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'export_documents', 'sales_manager'], {
      title,
      message,
      type: 'success',
      redirect_url: `/export-management`,
      module: 'Export Invoice',
      reference_id: invoice.id,
      reference_type: 'export_invoice'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyExportInvoiceCreated: ${error.message}`);
  }
};

/**
 * Notify when a Packing List is created/generated
 */
export const notifyPackingListCreated = async (companyId, packingList, db) => {
  try {
    const title = '📦 Packing List Generated';
    const message = `Packing List ${packingList.packing_list_no || ''} has been generated`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'export_documents'], {
      title,
      message,
      type: 'success',
      redirect_url: `/export-management`,
      module: 'Packing List',
      reference_id: packingList.id,
      reference_type: 'packing_list'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyPackingListCreated: ${error.message}`);
  }
};

/**
 * Notify when a VGM document is created
 */
export const notifyVGMCreated = async (companyId, vgm, db) => {
  try {
    const title = '⚖️ VGM Document Generated';
    const message = `VGM ${vgm.vgm_no || ''} has been generated`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'export_documents'], {
      title,
      message,
      type: 'info',
      redirect_url: `/export-management`,
      module: 'VGM',
      reference_id: vgm.id,
      reference_type: 'vgm'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyVGMCreated: ${error.message}`);
  }
};

/**
 * Notify when Shipping Instructions are created
 */
export const notifyShippingInstructionsCreated = async (companyId, si, db) => {
  try {
    const title = '🚢 Shipping Instructions Generated';
    const message = `SI ${si.si_no || ''} has been generated`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'export_documents'], {
      title,
      message,
      type: 'info',
      redirect_url: `/export-management`,
      module: 'Shipping Instructions',
      reference_id: si.id,
      reference_type: 'shipping_instruction'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyShippingInstructionsCreated: ${error.message}`);
  }
};

/**
 * Notify when an Annexure is created
 */
export const notifyAnnexureCreated = async (companyId, annexure, db) => {
  try {
    const title = '📋 Annexure Generated';
    const message = `Annexure ${annexure.annexure_no || ''} has been generated`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'export_documents'], {
      title,
      message,
      type: 'info',
      redirect_url: `/export-management`,
      module: 'Annexure',
      reference_id: annexure.id,
      reference_type: 'annexure'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyAnnexureCreated: ${error.message}`);
  }
};

/**
 * Notify when a document is locked
 */
export const notifyDocumentLocked = async (companyId, docType, docNo, docId, lockedByName, db) => {
  try {
    const title = `🔒 ${docType} Locked`;
    const message = `${docType} ${docNo || ''} has been locked by ${lockedByName || 'an admin'}`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'export_documents'], {
      title,
      message,
      type: 'warning',
      redirect_url: `/export-management`,
      module: docType,
      reference_id: docId,
      reference_type: 'document_lock',
      priority: 'high'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyDocumentLocked: ${error.message}`);
  }
};

/**
 * Notify when a user is created
 */
export const notifyUserCreated = async (companyId, newUser, createdByName, creatorId, db) => {
  try {
    const title = '👤 New User Added';
    const message = `${newUser.name || newUser.email_id} has been added as ${(newUser.role || 'staff').replace(/_/g, ' ')}${createdByName ? ` by ${createdByName}` : ''}`;

    await notifyRoles(companyId, ['company_admin', 'super_admin'], {
      title,
      message,
      type: 'info',
      redirect_url: `/user-management`,
      module: 'User Management',
      reference_id: newUser.id,
      reference_type: 'user',
      created_by: creatorId || null
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyUserCreated: ${error.message}`);
  }
};

/**
 * Notify when a PI (Proforma Invoice) is created
 */
export const notifyPICreated = async (companyId, invoice, db) => {
  try {
    const title = '📝 Proforma Invoice Created';
    const message = `PI ${invoice.invoice_no || ''} created for ${invoice.client_name || 'client'}`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'super_admin', 'sales_manager'], {
      title,
      message,
      type: 'success',
      redirect_url: `/invoice-management`,
      module: 'Proforma Invoice',
      reference_id: invoice.id,
      reference_type: 'proforma_invoice'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyPICreated: ${error.message}`);
  }
};

/**
 * Notify when a PO (Proforma Order) is created
 */
export const notifyPOCreated = async (companyId, order, db) => {
  try {
    const title = '📦 Purchase Order Created';
    const message = `PO ${order.order_no || ''} created for ${order.supplier_name || 'supplier'}`;

    await notifyRoles(companyId, ['company_admin', 'admin', 'purchase_manager'], {
      title,
      message,
      type: 'success',
      redirect_url: `/order-dashboard`,
      module: 'Proforma Order',
      reference_id: order.id,
      reference_type: 'proforma_order'
    }, db);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error in notifyPOCreated: ${error.message}`);
  }
};

// ────────────────────────────────────────
// Read / Query / Delete operations
// ────────────────────────────────────────

/**
 * Get notifications for a user (with company filter for multi-tenant safety)
 */
export const getUserNotifications = async (userId, unreadOnly = false, db, companyId = null) => {
  try {
    await ensureNotificationSchema(db);
    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params = [userId];

    if (companyId) {
      query += ` AND company_id = $2`;
      params.push(companyId);
    }

    if (unreadOnly) {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    debugLogger.error(CONTEXT, `Error fetching notifications: ${error.message}`);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId, db) => {
  try {
    const result = await db.query(
      `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  } catch (error) {
    debugLogger.error(CONTEXT, `Error marking notification as read: ${error.message}`);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId, db) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return true;
  } catch (error) {
    debugLogger.error(CONTEXT, `Error marking all notifications as read: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId, userId, db) => {
  try {
    await db.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return true;
  } catch (error) {
    debugLogger.error(CONTEXT, `Error deleting notification: ${error.message}`);
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId, db) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    debugLogger.error(CONTEXT, `Error getting unread count: ${error.message}`);
    return 0;
  }
};

/**
 * Broadcast data update to all users in a company (used to trigger frontend React Query invalidations)
 */
export const broadcastDataUpdate = (companyId, entityType, data = null) => {
  try {
    socketService.emitToCompany(companyId, 'data_updated', { entityType, data });
  } catch (error) {
    debugLogger.error(CONTEXT, `Error broadcasting data update for ${entityType}: ${error.message}`);
  }
};

// Export as a service object for centralized usage
export const notificationService = {
  createNotification,
  notifyUser,
  notifyRoles,
  notifyUsersByRoles,
  notifySpecificUser,
  notifyQCFailed,
  notifyQCCompleted,
  notifyOrderStatusChange,
  notifyExportInvoiceCreated,
  notifyPackingListCreated,
  notifyVGMCreated,
  notifyShippingInstructionsCreated,
  notifyAnnexureCreated,
  notifyDocumentLocked,
  notifyUserCreated,
  notifyPICreated,
  notifyPOCreated,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  broadcastDataUpdate
};

export default notificationService;
