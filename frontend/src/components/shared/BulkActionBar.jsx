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
import { Trash2, CheckSquare, X, RefreshCw } from 'lucide-react';

/**
 * BulkActionBar
 * A sticky action toolbar that slides in when rows are selected in a data table.
 * Works with the existing `useBulkOperations` hook.
 *
 * Props:
 *  - selectionCount  {number}    How many items are selected
 *  - onSelectAll     {function}  Select all handler
 *  - onClearAll      {function}  Deselect all handler
 *  - onDelete        {function}  (Optional) Bulk delete handler
 *  - onStatusChange  {function}  (Optional) Bulk status change handler
 *  - statusOptions   {Array}     (Optional) Array of { label, value } for status choices
 *  - extraActions    {Array}     (Optional) Extra { label, icon, onClick } buttons
 */
const BulkActionBar = ({
  selectionCount = 0,
  onSelectAll,
  onClearAll,
  onDelete,
  onStatusChange,
  statusOptions = [],
  extraActions = [],
}) => {
  if (selectionCount === 0) return null;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '10px 16px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      borderRadius: '8px',
      marginBottom: '12px',
      boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3)',
      animation: 'slideDown 0.2s ease-out',
    }}>
      {/* Selection count badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#fff',
        fontSize: '0.875rem',
        fontWeight: 600,
        marginRight: '8px',
      }}>
        <CheckSquare size={16} style={{ color: '#60a5fa' }} />
        <span>{selectionCount} selected</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Select All */}
      {onSelectAll && (
        <button onClick={onSelectAll} style={btnStyle('transparent')}>
          <RefreshCw size={14} />
          Select All
        </button>
      )}

      {/* Status change dropdown */}
      {onStatusChange && statusOptions.length > 0 && (
        <select
          onChange={(e) => { if (e.target.value) onStatusChange(e.target.value); }}
          defaultValue=""
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          <option value="" disabled style={{ color: '#000' }}>Change Status...</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: '#000' }}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Extra custom actions */}
      {extraActions.map((action, idx) => (
        <button key={idx} onClick={action.onClick} style={btnStyle('rgba(255,255,255,0.1)')}>
          {action.icon && React.cloneElement(action.icon, { size: 14 })}
          {action.label}
        </button>
      ))}

      {/* Delete */}
      {onDelete && (
        <button onClick={onDelete} style={btnStyle('#ef4444')}>
          <Trash2 size={14} />
          Delete
        </button>
      )}

      {/* Clear selection */}
      <button onClick={onClearAll} title="Clear selection" style={btnStyle('transparent')}>
        <X size={16} />
      </button>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const btnStyle = (bg) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '5px 12px',
  background: bg,
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  transition: 'background 0.15s ease',
});

export default BulkActionBar;
