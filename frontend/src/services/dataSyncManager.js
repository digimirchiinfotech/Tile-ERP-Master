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

import { tokenManager } from '../utils/tokenManager.js';

class DataSyncManager {
  constructor() {
    this.listeners = {};
    this.pollingIntervals = {};
    this.pollConfigs = {
      users: { interval: 300000, enabled: true },      // 300 seconds (5 min) - real-time user updates
      clients: { interval: 300000, enabled: true },    // 300 seconds (5 min) - reduced API load
      suppliers: { interval: 300000, enabled: true },  // 300 seconds (5 min) - reduced API load
      products: { interval: 300000, enabled: true },   // 300 seconds (5 min) - critical: images now excluded from list
      leads: { interval: 300000, enabled: true },      // 300 seconds (5 min) - reduced API load
      invoices: { interval: 300000, enabled: true },   // 300 seconds (5 min) - reduced API load
      orders: { interval: 300000, enabled: true },     // 300 seconds (5 min) - reduced API load
      qcRecords: { interval: 300000, enabled: true },  // 300 seconds (5 min) - reduced API load
      stats: { interval: 60000, enabled: true }        // 60 seconds (1 min) - live dashboard updates
    };
  }

  /**
   * Subscribe to data changes for a specific entity
   * @param {string} entityType - Type of entity (clients, suppliers, etc.)
   * @param {function} callback - Function to call when data changes
   * @returns {function} Unsubscribe function
   */
  subscribe(entityType, callback) {
    if (!this.listeners[entityType]) {
      this.listeners[entityType] = [];
    }
    
    this.listeners[entityType].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[entityType] = this.listeners[entityType].filter(cb => cb !== callback);
    };
  }

  /**
   * Emit data change event to all subscribers
   * @param {string} entityType - Type of entity
   * @param {object} data - Updated data
   */
  emit(entityType, data) {
    if (!this.listeners[entityType]) return;
    
    this.listeners[entityType].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        // Listener error handled silently to prevent blocking other listeners
      }
    });
  }

  /**
   * Start polling for a specific entity type
   * @param {string} entityType - Type of entity
   * @param {function} fetchFn - Function to call to fetch fresh data
   */
  startPolling(entityType, fetchFn) {
    // Stop existing polling
    if (this.pollingIntervals[entityType]) {
      clearInterval(this.pollingIntervals[entityType]);
    }

    const config = this.pollConfigs[entityType];
    if (!config || !config.enabled) return;

    this.pollingIntervals[entityType] = setInterval(async () => {
      try {
        // Check authentication before polling to prevent 401 errors
        if (!tokenManager.isAuthenticated()) {
          this.stopPolling(entityType);
          return;
        }
        await fetchFn();
      } catch (error) {
        // Polling error handled silently
      }
    }, config.interval);
  }

  /**
   * Stop polling for a specific entity type
   * @param {string} entityType - Type of entity
   */
  stopPolling(entityType) {
    if (this.pollingIntervals[entityType]) {
      clearInterval(this.pollingIntervals[entityType]);
      delete this.pollingIntervals[entityType];
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling() {
    Object.keys(this.pollingIntervals).forEach(entityType => {
      this.stopPolling(entityType);
    });
  }

  /**
   * Notify that data for an entity has changed
   * Triggers immediate update for all subscribers and emits global event
   * @param {string} entityType - Type of entity
   * @param {object} data - Optional new data
   */
  notifyChange(entityType, data = null) {
    // Emit internal event for subscribers
    this.emit(entityType, data);
    
    // Emit global DOM event for components not using the manager directly
    window.dispatchEvent(new CustomEvent(`${entityType}:changed`, { detail: data }));
    
    // Log for debugging

  }

  /**
   * Configure polling for an entity
   * @param {string} entityType - Type of entity
   * @param {number} interval - Polling interval in milliseconds
   * @param {boolean} enabled - Whether polling is enabled
   */
  configurePolling(entityType, interval, enabled = true) {
    if (!this.pollConfigs[entityType]) {
      this.pollConfigs[entityType] = {};
    }
    this.pollConfigs[entityType].interval = interval;
    this.pollConfigs[entityType].enabled = enabled;
  }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager();

export default dataSyncManager;
