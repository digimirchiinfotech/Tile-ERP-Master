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
 * useSmartDefaults
 * Persists a user's last-used form preferences (currency, port, supplier, etc.)
 * in localStorage so they're automatically pre-filled on the next form open.
 *
 * Usage:
 *   const { getDefault, saveDefaults } = useSmartDefaults('proforma_invoice');
 *   // Get saved defaults to pre-fill a form
 *   const defaults = getDefault(); // returns { currency: 'USD', port: 'Mundra', ... }
 *   // Save preferences after user submits/changes values
 *   saveDefaults({ currency: formData.currency, port: formData.port });
 */

const STORAGE_PREFIX = 'erp_defaults_';

const useSmartDefaults = (formKey) => {
  const STORAGE_KEY = `${STORAGE_PREFIX}${formKey}`;

  /**
   * Retrieve saved defaults. Returns null if nothing is saved.
   */
  const getDefault = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  };

  /**
   * Save a partial set of preferences.
   * Merges with existing saved defaults so only fields passed are updated.
   * @param {object} values - Key-value pairs of preferences to save
   */
  const saveDefaults = (values) => {
    if (!values || typeof values !== 'object') return;
    try {
      const existing = getDefault() || {};
      // Omit null/undefined/empty values — don't overwrite with blanks
      const cleaned = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== '')
      );
      const merged = { ...existing, ...cleaned, _updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {}
  };

  /**
   * Clear all saved defaults for this form key.
   */
  const clearDefaults = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };

  return { getDefault, saveDefaults, clearDefaults };
};

export default useSmartDefaults;
