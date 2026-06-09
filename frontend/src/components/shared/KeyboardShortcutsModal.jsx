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

import React, { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

/**
 * KeyboardShortcutsModal
 * Displays a full list of all registered keyboard shortcuts.
 * Opens on pressing `?` (Shift+/) anywhere in the app.
 */
const SHORTCUTS = [
  { category: 'Navigation', keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
  { category: 'Navigation', keys: ['Alt', 'D'], description: 'Go to Dashboard' },
  { category: 'Navigation', keys: ['Alt', 'C'], description: 'Go to Client Management' },
  { category: 'Navigation', keys: ['Alt', 'I'], description: 'Go to Invoice Management' },
  { category: 'Navigation', keys: ['Alt', 'O'], description: 'Go to Orders Dashboard' },
  { category: 'Navigation', keys: ['Alt', 'Q'], description: 'Go to QC Management' },
  { category: 'Navigation', keys: ['Alt', 'E'], description: 'Go to Export Management' },
  { category: 'Actions', keys: ['Alt', 'N'], description: 'New Proforma Invoice' },
  { category: 'General', keys: ['Esc'], description: 'Close modal / Command Palette' },
  { category: 'General', keys: ['?'], description: 'Show this Keyboard Shortcuts guide' },
];

const KeyboardShortcutsModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isEditable = e.target?.isContentEditable;
      if (['input', 'textarea', 'select'].includes(tag) || isEditable) return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Group by category
  const grouped = SHORTCUTS.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={() => setIsOpen(false)}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
        width: '100%', maxWidth: '520px',
        overflow: 'hidden',
        animation: 'slideDown 0.2s ease-out',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          color: '#fff',
        }}>
          <Keyboard size={22} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Keyboard Shortcuts</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Boost your speed with hotkeys</div>
          </div>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
            color: '#fff', padding: '6px', cursor: 'pointer', display: 'flex',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div style={{ padding: '16px 24px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '10px',
              }}>{category}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((shortcut, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                      {shortcut.description}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {shortcut.keys.map((k, ki) => (
                        <React.Fragment key={ki}>
                          <kbd style={{
                            padding: '3px 8px',
                            background: '#fff', color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderBottom: '3px solid #cbd5e1',
                            borderRadius: '5px',
                            fontSize: '0.75rem', fontWeight: 600,
                            fontFamily: 'monospace',
                          }}>{k}</kbd>
                          {ki < shortcut.keys.length - 1 && (
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.75rem', color: '#64748b', textAlign: 'center',
        }}>
          Press <kbd style={{ padding: '1px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace' }}>?</kbd> anytime to open this guide
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
