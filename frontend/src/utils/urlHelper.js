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
 * Resolves a URL to be used in image src tags
 * Handles absolute URLs, relative upload paths, and backend API paths
 * 
 * @param {string} url - The URL to resolve
 * @returns {string} The resolved URL
 */
export const resolveImageUrl = (url) => {
  if (!url) return '';

  // If it's already an absolute URL (starts with http or https), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it starts with data:, it's a base64 image
  if (url.startsWith('data:')) {
    return url;
  }

  // Align the upload URL perfectly with the API base URL.
  // This prevents the issue where api.js uploads to production but the frontend
  // tries to fetch the image from the local dev server (e.g., /uploads).
  // If we are hardcoding apiBase to production in api.js, we MUST hardcode uploadUrl to production too.
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const apiBase = isDev ? '/api' : 'https://tile-erp-master-production.up.railway.app/api';
  const isLocalHost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  // If we are hardcoding apiBase to production in api.js, we MUST hardcode uploadUrl to production too.
  let uploadUrl = apiBase.replace(/\/api\/?$/, '/uploads');

  // Fix common path issues (e.g. backend/uploads/... or uploads/...)
  if (url.includes('uploads')) {
    const parts = url.split('uploads');
    const filename = parts[parts.length - 1];
    return `${uploadUrl}${filename.startsWith('/') ? '' : '/'}${filename}`;
  }

  // If the URL doesn't have a prefix and seems to be a filename, assume it's in /uploads
  if (!url.includes('/') && !url.includes('\\') && url.includes('.')) {
    return `${uploadUrl}/${url}`;
  }

  // For other relative paths, prefix with API base if not already present
  if (apiBase && !url.startsWith(apiBase)) {
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return url;
};
