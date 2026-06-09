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

import React, { useState, useEffect, useRef } from 'react';
import { Search, LayoutGrid, FileText, Users, FilePlus, ArrowRight, Box, ClipboardCheck, Settings, BarChart2, Briefcase, Plane } from 'lucide-react';
import './CommandPalette.css';

const CommandPalette = ({ onNavigate, onSearch, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Default Quick Actions
  const quickActions = [
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      icon: <LayoutGrid size={18} />,
      action: () => onNavigate('dashboard') // Or specific dashboard based on role
    },
    {
      id: 'new-invoice',
      title: 'New Proforma Invoice',
      icon: <FilePlus size={18} />,
      action: () => onNavigate('invoice-form')
    },
    {
      id: 'new-client',
      title: 'New Client',
      icon: <Users size={18} />,
      action: () => onNavigate('client-form')
    },
    {
      id: 'new-order',
      title: 'New Order Sheet',
      icon: <FileText size={18} />,
      action: () => onNavigate('order-form')
    },
    {
      id: 'manage-clients',
      title: 'Manage Clients',
      icon: <Users size={18} />,
      action: () => onNavigate('client-management')
    },
    {
      id: 'manage-products',
      title: 'Manage Products & Catalogue',
      icon: <Box size={18} />,
      action: () => onNavigate('product-management')
    },
    {
      id: 'manage-invoices',
      title: 'Manage Proforma Invoices',
      icon: <FileText size={18} />,
      action: () => onNavigate('invoice-management')
    },
    {
      id: 'manage-orders',
      title: 'Manage Orders',
      icon: <FileText size={18} />,
      action: () => onNavigate('order-dashboard')
    },
    {
      id: 'qc-records',
      title: 'QC Records',
      icon: <ClipboardCheck size={18} />,
      action: () => onNavigate('qc-management')
    },
    {
      id: 'export-management',
      title: 'Export Management',
      icon: <Plane size={18} />,
      action: () => onNavigate('export-management')
    },
    {
      id: 'account-finance',
      title: 'Account & Finance',
      icon: <Briefcase size={18} />,
      action: () => onNavigate('account-finance-management')
    },
    {
      id: 'reports-analytics',
      title: 'Reports & Analytics',
      icon: <BarChart2 size={18} />,
      action: () => onNavigate('reports-analytics')
    },
    {
      id: 'company-settings',
      title: 'Company Settings',
      icon: <Settings size={18} />,
      action: () => onNavigate('company-management')
    }
  ];

  const filteredActions = query.trim() === '' 
    ? quickActions 
    : quickActions.filter(action => action.title.toLowerCase().includes(query.toLowerCase()));

  // Add the generic search option at the end if there's a query
  const items = [...filteredActions];
  if (query.trim() !== '') {
    items.push({
      id: 'global-search',
      title: `Search for "${query}"`,
      icon: <Search size={18} />,
      action: () => {
        if (onSearch) onSearch(query);
      }
    });
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        executeAction(items[selectedIndex]);
      }
    }
  };

  const executeAction = (item) => {
    item.action();
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette-container" onClick={e => e.stopPropagation()}>
        <div className="command-palette-header">
          <Search className="command-palette-icon" size={20} />
          <input
            ref={inputRef}
            className="command-palette-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="command-palette-content">
          {items.length > 0 ? (
            <>
              <div className="command-group-title">
                {query.trim() === '' ? 'Quick Actions' : 'Results'}
              </div>
              {items.map((item, index) => (
                <div 
                  key={item.id}
                  className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => executeAction(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="command-item-icon">
                    {item.icon}
                  </div>
                  <div className="command-item-content">
                    <div className="command-item-title">{item.title}</div>
                  </div>
                  {index === selectedIndex && (
                    <div className="command-item-shortcut">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="command-group-title" style={{ textAlign: 'center', padding: '24px 16px' }}>
              No results found.
            </div>
          )}
        </div>

        <div className="command-palette-footer">
          <div>
            <span className="command-footer-key">↑</span>
            <span className="command-footer-key">↓</span> to navigate
          </div>
          <div>
            <span className="command-footer-key">Enter</span> to select
          </div>
          <div>
            <span className="command-footer-key">Esc</span> to close
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
