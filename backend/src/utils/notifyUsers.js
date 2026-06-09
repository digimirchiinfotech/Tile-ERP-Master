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

/**
 * Legacy notifyUsers utility — now routes through centralized notificationService.
 * Maintained for backward compatibility with controllers that import this file.
 */
import { notifyUsersByRoles } from '../services/notificationService.js';

const notifyUsers = async (companyId, roles, notification, db) => {
  return notifyUsersByRoles(companyId, roles, {
    ...notification,
    redirect_url: notification.actionUrl || notification.action_url || notification.redirect_url || null
  }, db);
};

export default notifyUsers;
