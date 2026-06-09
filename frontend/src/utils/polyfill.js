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
 * Polyfill for crypto.randomUUID()
 * Used for compatibility with older browsers or non-secure contexts (HTTP)
 */
if (typeof window !== 'undefined') {
  // Ensure crypto exists
  if (!window.crypto) {
    window.crypto = {};
  }
  
  // Polyfill randomUUID if missing
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function() {
      // Robust UUID v4 generator
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ (window.crypto.getRandomValues ? window.crypto.getRandomValues(new Uint8Array(1))[0] : (Math.random() * 16)) & 15 >> c / 4).toString(16)
      );
    };
  }
}
