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

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useFormAutosave
 * Automatically saves form data to localStorage at a given interval.
 * Restores data on mount and clears it on successful submit.
 *
 * @param {string} formKey   - Unique key for localStorage (e.g. 'draft_proforma_invoice')
 * @param {object} formData  - Current form state to save
 * @param {number} interval  - Save interval in ms (default 10s) 
 * @returns {{ hasDraft, clearDraft, restoreDraft, lastSaved }}
 */
const useFormAutosave = (formKey, formData, interval = 10000) => {
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef = useRef(null);

  const STORAGE_KEY = `erp_draft_${formKey}`;

  // Check for an existing draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only flag as draft if it has data and is less than 24 hours old
        const savedAt = new Date(parsed._savedAt);
        const hoursOld = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        if (hoursOld < 24 && Object.keys(parsed).length > 1) {
          setHasDraft(true);
        } else {
          // Stale draft, remove it
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      // Fail silently if localStorage is unavailable
    }
  }, [STORAGE_KEY]);

  // Set up periodic auto-save
  useEffect(() => {
    if (!formData || Object.keys(formData).length === 0) return;

    timerRef.current = setInterval(() => {
      try {
        const snapshot = { ...formData, _savedAt: new Date().toISOString() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setLastSaved(new Date());
        setHasDraft(true);
      } catch (e) {
        // Storage may be full or unavailable
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [formData, interval, STORAGE_KEY]);

  // Restore draft — returns the saved data
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const { _savedAt, ...draftData } = parsed;
        return draftData;
      }
    } catch (e) {}
    return null;
  }, [STORAGE_KEY]);

  // Clear draft after successful submit
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);
      setLastSaved(null);
    } catch (e) {}
  }, [STORAGE_KEY]);

  return { hasDraft, clearDraft, restoreDraft, lastSaved };
};

export default useFormAutosave;
