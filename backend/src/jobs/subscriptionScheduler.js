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

import { checkSubscriptionExpiry } from '../services/subscriptionService.js';
import masterPool from '../config/masterDatabase.js';
import debugLogger from '../utils/debugLogger.js';

/**
 * Initialize subscription expiry check scheduler
 * Runs daily at midnight to check for expiring and expired subscriptions
 */
export const initSubscriptionScheduler = () => {

  // Run check immediately on startup
  checkSubscriptionExpiry(masterPool).catch(err => {
    debugLogger.error('Scheduler', 'Initial subscription check failed', err);
  });

  // Schedule daily check at midnight (00:00 UTC)
  const scheduleNextCheck = () => {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(24, 0, 0, 0); // Midnight UTC next day

    const delay = next - now;

    setTimeout(() => {
      checkSubscriptionExpiry(masterPool).catch(err => {
        debugLogger.error('Scheduler', 'Scheduled subscription check failed', err);
      });
      scheduleNextCheck(); // Reschedule for next day
    }, delay);
  };

  scheduleNextCheck();
};

/**
 * Manual trigger for subscription check (for testing or manual runs)
 */
export const triggerSubscriptionCheck = async () => {
  try {
    const result = await checkSubscriptionExpiry(masterPool);
    return result;
  } catch (error) {
    debugLogger.error('Scheduler', 'Manual subscription check failed', error);
    throw error;
  }
};
