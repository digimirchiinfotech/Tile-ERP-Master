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
 * prefetchService.js
 * Implements data prefetching on hover to make page/modal opens feel instant.
 * Works by calling the API silently and storing results in a short-lived memory cache.
 *
 * Usage in a component:
 *   import { prefetch, getPrefetched } from '../../utils/prefetchService';
 *
 *   // On mouse enter of a row
 *   onMouseEnter={() => prefetch(`invoice-${invoice.id}`, () => invoiceService.getById(invoice.id))}
 *
 *   // On click (the data should already be in cache)
 *   const cachedData = getPrefetched(`invoice-${invoice.id}`);
 *   if (cachedData) { use cachedData } else { fetch normally }
 */

const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Prefetch and cache a piece of data.
 * Silently fetches data in the background and stores it in memory.
 * @param {string}   key      - Unique cache key (e.g. 'invoice-123')
 * @param {function} fetcher  - Async function that fetches the data
 */
export const prefetch = async (key, fetcher) => {
  // Don't re-fetch if we already have a recent cache entry
  const existing = cache.get(key);
  if (existing && Date.now() - existing.timestamp < CACHE_TTL_MS) {
    return;
  }

  try {
    const result = await fetcher();
    cache.set(key, { data: result, timestamp: Date.now() });
  } catch (e) {
    // Prefetch failures are silent — the real fetch on click will handle errors
  }
};

/**
 * Retrieve prefetched data from cache. Returns null if not available.
 * @param {string} key - Cache key used during prefetch()
 */
export const getPrefetched = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

/**
 * Manually set data in the prefetch cache (useful after creating a record).
 * @param {string} key  - Cache key
 * @param {any}    data - Data to cache
 */
export const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Invalidate a cache entry (call after update/delete operations).
 * @param {string} key - Cache key to invalidate
 */
export const invalidateCache = (key) => {
  cache.delete(key);
};

/**
 * Clear entire prefetch cache.
 */
export const clearPrefetchCache = () => {
  cache.clear();
};
