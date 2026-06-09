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
 * Request Rate Limiter & Retry Manager
 * Prevents 429 errors by throttling concurrent requests
 * Does NOT retry on authentication errors (401/403)
 */

const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 422];

const RequestManager = (() => {
  const activeRequests = new Map();
  const requestQueue = [];
  const MAX_CONCURRENT_REQUESTS = 4;
  const REQUEST_TIMEOUT = 30000;
  const BASE_DELAY = 150;

  let lastRequestTime = 0;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const shouldThrottle = () => {
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    return timeSinceLastRequest < BASE_DELAY;
  };

  const throttleRequest = async () => {
    while (shouldThrottle()) {
      const timeToWait = BASE_DELAY - (Date.now() - lastRequestTime);
      await delay(Math.max(0, timeToWait));
    }
  };

  const isRetryableError = (error) => {
    if (!error.response) return true;
    const status = error.response.status;
    return !NON_RETRYABLE_STATUS_CODES.includes(status);
  };

  const execute = async (requestFn, endpoint, maxRetries = 2) => {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await throttleRequest();

        while (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
          await delay(50);
        }

        const requestId = `${endpoint}-${Date.now()}-${Math.random()}`;
        activeRequests.set(requestId, true);
        lastRequestTime = Date.now();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Request timeout for ${endpoint}`)),
            REQUEST_TIMEOUT
          )
        );

        const result = await Promise.race([requestFn(), timeoutPromise]);
        activeRequests.delete(requestId);
        return result;
      } catch (error) {
        lastError = error;

        const keysToDelete = [...activeRequests.keys()].filter((k) =>
          k.startsWith(endpoint)
        );
        keysToDelete.forEach((k) => activeRequests.delete(k));

        if (!isRetryableError(error)) {
          throw error;
        }

        if (error.response?.status === 429) {
          const retryAfter = parseInt(
            error.response.headers['retry-after'] || (attempt + 1) * 1000
          );
          await delay(retryAfter);
        } else if (attempt < maxRetries - 1) {
          const backoffDelay = Math.min(500 * Math.pow(2, attempt), 5000);
          await delay(backoffDelay);
        }
      }
    }

    throw lastError;
  };

  return {
    execute,
    getActiveRequestCount: () => activeRequests.size,
    reset: () => {
      activeRequests.clear();
      requestQueue.length = 0;
    },
  };
})();

export default RequestManager;
