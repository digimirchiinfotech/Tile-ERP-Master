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

import React, { useEffect, useState } from 'react';
import { Modal, Table, Badge, Button, Card } from 'react-bootstrap';
import { Keyboard, Command, X, Search } from 'lucide-react';

/**
 * Keyboard Shortcuts Component
 * Provides keyboard shortcuts functionality and help modal
 */
const KeyboardShortcuts = ({ show, onHide }) => {
  const [activeShortcuts, setActiveShortcuts] = useState([]);

  // Define keyboard shortcuts
  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['Ctrl', 'Shift', 'D'], description: 'Go to Dashboard', action: 'dashboard' },
        { keys: ['Ctrl', 'Shift', 'P'], description: 'Go to Products', action: 'products' },
        { keys: ['Ctrl', 'Shift', 'I'], description: 'Go to Invoices', action: 'invoices' },
        { keys: ['Ctrl', 'Shift', 'C'], description: 'Go to Clients', action: 'clients' },
        { keys: ['Ctrl', 'Shift', 'Q'], description: 'Go to Quality Control', action: 'qc' },
      ]
    },
    {
      category: 'Actions',
      items: [
        { keys: ['Ctrl', 'N'], description: 'New Product', action: 'new-product' },
        { keys: ['Ctrl', 'Shift', 'N'], description: 'New Invoice', action: 'new-invoice' },
        { keys: ['Ctrl', 'Shift', 'B'], description: 'Create Bundle', action: 'create-bundle' },
        { keys: ['Ctrl', 'S'], description: 'Save Current Form', action: 'save' },
        { keys: ['Escape'], description: 'Close Modal/Cancel', action: 'escape' },
      ]
    },
    {
      category: 'Search & Filters',
      items: [
        { keys: ['Ctrl', 'F'], description: 'Focus Search', action: 'search' },
        { keys: ['Ctrl', 'Shift', 'F'], description: 'Advanced Filters', action: 'advanced-filters' },
        { keys: ['Ctrl', 'Shift', 'R'], description: 'Reset Filters', action: 'reset-filters' },
      ]
    },
    {
      category: 'Theme & UI',
      items: [
        { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle Theme', action: 'toggle-theme' },
        { keys: ['Ctrl', 'Shift', 'H'], description: 'Show Help/Tour', action: 'help' },
        { keys: ['?'], description: 'Show Keyboard Shortcuts', action: 'shortcuts' },
      ]
    }
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const keys = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.metaKey) keys.push('Cmd');
      
      // Add the main key
      if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        keys.push(e.key.toUpperCase());
      }

      // Find matching shortcut
      for (const category of shortcuts) {
        for (const shortcut of category.items) {
          if (JSON.stringify(shortcut.keys) === JSON.stringify(keys)) {
            e.preventDefault();
            handleShortcutAction(shortcut.action);
            
            // Show visual feedback
            setActiveShortcuts(prev => [...prev, shortcut.action]);
            setTimeout(() => {
              setActiveShortcuts(prev => prev.filter(item => item !== shortcut.action));
            }, 500);
            
            break;
          }
        }
      }

      // Special case for '?' key
      if (e.key === '?' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        handleShortcutAction('shortcuts');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleShortcutAction = (action) => {
    switch (action) {
      case 'dashboard':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'role-dashboard' }));
        break;
      case 'products':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'product-management' }));
        break;
      case 'invoices':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoice-dashboard' }));
        break;
      case 'clients':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'client-management' }));
        break;
      case 'qc':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'qc-management' }));
        break;
      case 'new-product':
        window.dispatchEvent(new CustomEvent('action', { detail: 'new-product' }));
        break;
      case 'new-invoice':
        window.dispatchEvent(new CustomEvent('action', { detail: 'new-invoice' }));
        break;
      case 'create-bundle':
        window.dispatchEvent(new CustomEvent('action', { detail: 'create-bundle' }));
        break;
      case 'save':
        window.dispatchEvent(new CustomEvent('action', { detail: 'save' }));
        break;
      case 'escape':
        window.dispatchEvent(new CustomEvent('action', { detail: 'escape' }));
        break;
      case 'search':
        const searchInput = document.querySelector('input[type="text"][placeholder*="search" i], input[type="search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        break;
      case 'advanced-filters':
        window.dispatchEvent(new CustomEvent('action', { detail: 'toggle-advanced-filters' }));
        break;
      case 'reset-filters':
        window.dispatchEvent(new CustomEvent('action', { detail: 'reset-filters' }));
        break;
      case 'toggle-theme':
        window.dispatchEvent(new CustomEvent('action', { detail: 'toggle-theme' }));
        break;
      case 'help':
        window.dispatchEvent(new CustomEvent('action', { detail: 'show-tour' }));
        break;
      case 'shortcuts':
        window.dispatchEvent(new CustomEvent('action', { detail: 'show-shortcuts' }));
        break;
    }
  };

  const renderKeyBadge = (key) => {
    const keyMap = {
      'Ctrl': '⌃',
      'Shift': '⇧', 
      'Alt': '⌥',
      'Cmd': '⌘'
    };
    
    return (
      <Badge 
        bg="secondary" 
        className="me-1 keyboard-key"
        style={{
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          padding: '0.25rem 0.5rem'
        }}
      >
        {keyMap[key] || key}
      </Badge>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Keyboard size={20} className="me-2" />
          Keyboard Shortcuts
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="shortcuts-container">
          {shortcuts.map((category, index) => (
            <Card key={index} className="mb-3">
              <Card.Header className="py-2">
                <h6 className="mb-0">{category.category}</h6>
              </Card.Header>
              <Card.Body className="p-0">
                <Table className="mb-0" size="sm">
                  <tbody>
                    {category.items.map((shortcut, itemIndex) => (
                      <tr key={itemIndex} className={activeShortcuts.includes(shortcut.action) ? 'table-success' : ''}>
                        <td style={{ width: '40%' }}>
                          <div className="d-flex flex-wrap">
                            {shortcut.keys.map((key, keyIndex) => (
                              <React.Fragment key={keyIndex}>
                                {renderKeyBadge(key)}
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="me-1 text-muted">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>
                        <td>{shortcut.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ))}
        </div>

        <div className="mt-4 text-center">
          <div className="d-flex justify-content-center align-items-center mb-2">
            <Command size={16} className="me-2 text-muted" />
            <small className="text-muted">
              Press <Badge bg="secondary">?</Badge> anytime to show this help
            </small>
          </div>
          
          {activeShortcuts.length > 0 && (
            <div className="alert alert-success py-2 mb-0">
              <small>
                <strong>Shortcut activated!</strong> {activeShortcuts.join(', ')}
              </small>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <X size={16} className="me-1" />
          Close
        </Button>
      </Modal.Footer>

      <style>{`
        .shortcuts-container {
          max-height: 60vh;
          overflow-y: auto;
        }

        .keyboard-key {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          border: 1px solid #6c757d;
        }

        .table-success {
          animation: highlight 0.5s ease-out;
        }

        @keyframes highlight {
          0% { background-color: transparent; }
          50% { background-color: #d1edff; }
          100% { background-color: transparent; }
        }
      `}</style>
    </Modal>
  );
};

// Hook to use keyboard shortcuts in components
export const useKeyboardShortcuts = () => {
  const [shortcutsVisible, setShortcutsVisible] = useState(false);

  useEffect(() => {
    const handleAction = (e) => {
      if (e.detail === 'show-shortcuts') {
        setShortcutsVisible(true);
      }
    };

    window.addEventListener('action', handleAction);
    return () => window.removeEventListener('action', handleAction);
  }, []);

  return {
    shortcutsVisible,
    setShortcutsVisible,
    showShortcuts: () => setShortcutsVisible(true),
    hideShortcuts: () => setShortcutsVisible(false)
  };
};

export default KeyboardShortcuts;




