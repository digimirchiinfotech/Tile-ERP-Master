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
 * Acquire distributed lock and run subscription check
 */
const runWithLock = async () => {
  const client = await masterPool.connect();
  try {
    // Use pg_try_advisory_xact_lock (transaction-level) so PgBouncer transaction
    // pooling does not orphan the lock. The lock auto-releases at transaction end.
    await client.query('BEGIN');
    // 1001 is the advisory lock ID for subscription expiry checks
    const { rows } = await client.query('SELECT pg_try_advisory_xact_lock(1001) as locked');
    if (!rows[0].locked) {
      await client.query('ROLLBACK');
      debugLogger.info('Scheduler', 'Subscription check lock held by another instance. Skipping.');
      return;
    }
    
    debugLogger.info('Scheduler', 'Acquired subscription check lock. Running...');
    await checkSubscriptionExpiry(client);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    debugLogger.error('Scheduler', 'Subscription check failed', err);
  } finally {
    client.release();
  }
};

/**
 * Initialize subscription expiry check scheduler
 * Runs daily at midnight to check for expiring and expired subscriptions
 */
export const initSubscriptionScheduler = () => {

  // Run check immediately on startup
  runWithLock();

  // Schedule daily check at midnight (00:00 UTC)
  const scheduleNextCheck = () => {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(24, 0, 0, 0); // Midnight UTC next day

    const delay = next - now;

    setTimeout(() => {
      runWithLock();
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
