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

  // Get API base from environment, default to production if not set
  const apiBase = import.meta.env.VITE_API_BASE || 'https://tile-erp-master-production.up.railway.app/api';
  // If VITE_UPLOAD_URL isn't set, deduce it from apiBase
  const uploadUrl = import.meta.env.VITE_UPLOAD_URL || apiBase.replace(/\/api\/?$/, '/uploads');

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
