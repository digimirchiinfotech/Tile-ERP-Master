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

import React from 'react';
import { FileText, Clock, X, RotateCcw } from 'lucide-react';

/**
 * DraftRestoreBanner
 * A slim notification banner that appears at the top of a form
 * when an auto-saved draft is detected in localStorage.
 *
 * Props:
 *  - hasDraft    {boolean}   Whether a saved draft exists
 *  - lastSaved   {Date|null} Timestamp of the last auto-save
 *  - onRestore   {function}  Called when user clicks "Restore Draft"
 *  - onDiscard   {function}  Called when user dismisses the banner (clears draft)
 */
const DraftRestoreBanner = ({ hasDraft, lastSaved, onRestore, onDiscard }) => {
  if (!hasDraft) return null;

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: '1px solid #93c5fd',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '0.875rem',
    }}>
      <FileText size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />

      <div style={{ flex: 1, color: '#1e40af' }}>
        <strong>Unsaved draft found</strong>
        {lastSaved && (
          <span style={{ color: '#3b82f6', marginLeft: '8px' }}>
            <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
            Last saved at {formatTime(lastSaved)}
          </span>
        )}
      </div>

      <button
        onClick={onRestore}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 12px',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <RotateCcw size={13} />
        Restore Draft
      </button>

      <button
        onClick={onDiscard}
        title="Discard draft"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '5px',
          background: 'transparent',
          color: '#64748b',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default DraftRestoreBanner;
