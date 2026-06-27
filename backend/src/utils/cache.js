import NodeCache from 'node-cache';

// Master data: cache for 1 hour (3600 seconds)
export const masterDataCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false
});

// Dashboard stats: cache for 5 minutes (300 seconds)
export const dashboardCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

// Generic cache helper
export const withCache = async (cache, key, fetchFn) => {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const fresh = await fetchFn();
  cache.set(key, fresh);
  return fresh;
};

// Call this when master data is updated to clear cache
export const invalidateMasterDataCache = (companyId) => {
  const keys = masterDataCache.keys();
  keys.filter(k => k.startsWith(`master_${companyId}`))
      .forEach(k => masterDataCache.del(k));
};
