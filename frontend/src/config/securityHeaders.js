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
 * Frontend Security Configuration
 * Implements XSS protection and secure practices
 */

// Configure secure defaults for API calls
export const setupSecurityDefaults = () => {
  // Prevent direct access to sensitive info
  document.addEventListener('copy', (e) => {
    // Can be enhanced based on requirements
  });
  
  // Disable right-click on sensitive areas if needed
  const protectedElements = document.querySelectorAll('[data-protected]');
  protectedElements.forEach(el => {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  });
};

// Token security practices
export const tokenSecurity = {
  // Store token securely (use sessionStorage by default, not localStorage)
  setToken: (token) => {
    sessionStorage.setItem('authToken', token);
    // Don't store in localStorage as it's vulnerable to XSS
  },
  
  getToken: () => {
    return sessionStorage.getItem('authToken');
  },
  
  removeToken: () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
  },
  
  // Add token to API headers
  getAuthHeaders: () => {
    const token = tokenSecurity.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// XSS prevention for dynamic content
export const sanitizeHTML = (html) => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

export default {
  setupSecurityDefaults,
  tokenSecurity,
  sanitizeInput,
  sanitizeHTML
};
