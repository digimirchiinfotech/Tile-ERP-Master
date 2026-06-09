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

import api from './api.js';

/**
 * PrefetchService
 * A background utility to fetch data preemptively when a user hovers over an item (like a table row or button).
 * This eliminates perceived latency when they actually click to edit/view.
 */

const CACHE_LIFETIME_MS = 60000; // Keep in cache for 60 seconds
const cache = new Map();

/**
 * Pre-fetches an endpoint and caches the result.
 * @param {string} url - API endpoint to fetch
 * @returns {Promise<any>}
 */
const prefetch = async (url) => {
  // If already in cache and not expired, skip
  if (cache.has(url)) {
    const entry = cache.get(url);
    if (Date.now() - entry.timestamp < CACHE_LIFETIME_MS) {
      return entry.promise; // return the pending or resolved promise
    }
  }

  // Create the promise and store it immediately so concurrent hovers don't trigger multiple requests
  const reqPromise = api.get(url)
    .then(res => {
      return res.data?.data || res.data;
    })
    .catch(err => {
      // If it fails, remove it from cache so we can try again later
      cache.delete(url);
      console.warn(`[Prefetch] Failed to prefetch ${url}:`, err.message);
      return null;
    });

  cache.set(url, {
    timestamp: Date.now(),
    promise: reqPromise,
  });

  return reqPromise;
};

/**
 * Get a cached item synchronously if available.
 * Good for immediately rendering something while real fetch happens in background.
 */
const getCached = (url) => {
  if (cache.has(url)) {
    const entry = cache.get(url);
    if (Date.now() - entry.timestamp < CACHE_LIFETIME_MS) {
      // Since entry.promise might still be pending, we only want resolved data if it exists.
      // But typically we just let react-query or use effects use the async prefetch.
      return entry; 
    }
  }
  return null;
};

export const prefetchService = {
  prefetch,
  getCached,
  
  // Specific helpers
  prefetchOrder: (id) => prefetch(`/proforma-orders/${id}`),
  prefetchInvoice: (id) => prefetch(`/proforma-invoices/${id}`),
  prefetchClientOrder: (id) => prefetch(`/client-orders/${id}`),
  prefetchClient: (id) => prefetch(`/clients/${id}`),
  prefetchProduct: (id) => prefetch(`/products/${id}`),
  
  clearCache: () => cache.clear()
};

export default prefetchService;
