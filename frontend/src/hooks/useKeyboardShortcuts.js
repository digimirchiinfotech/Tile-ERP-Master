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

import { useEffect } from 'react';

/**
 * useKeyboardShortcuts
 * Registers global keyboard shortcuts for power users.
 * 
 * Shortcuts registered:
 *  - Alt+N  → New Record (navigate to create form)
 *  - Alt+D  → Go to Dashboard
 *  - Alt+C  → Go to Client Management
 *  - Alt+I  → Go to Invoice Management
 *  - Alt+Q  → Go to QC Management
 *  - Alt+E  → Go to Export Management
 *
 * @param {function} onNavigate  - Navigation callback
 * @param {object}   currentUser - Currently logged-in user
 */
const useKeyboardShortcuts = (onNavigate, currentUser) => {
  useEffect(() => {
    if (!currentUser || !onNavigate) return;

    const getDashboard = (role) => {
      const map = {
        super_admin: 'super-admin-dashboard',
        company_admin: 'dashboard',
        sales_manager: 'dashboard',
        sales_executive: 'dashboard',
        qc: 'qc-management',
        qc_inspector: 'qc-management',
        account: 'account-finance-management',
        purchase_manager: 'order-dashboard',
        administration: 'product-management',
        client: 'client-order-management',
      };
      return map[role] || 'dashboard';
    };

    const handleKeyDown = (e) => {
      // Skip if user is typing in an input / textarea / select / contenteditable
      const tag = e.target?.tagName?.toLowerCase();
      const isEditable = e.target?.isContentEditable;
      if (['input', 'textarea', 'select'].includes(tag) || isEditable) return;

      // Alt + Key shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            onNavigate('invoice-form'); // Alt+N → New Proforma Invoice
            break;
          case 'd':
            e.preventDefault();
            onNavigate(getDashboard(currentUser.role)); // Alt+D → Dashboard
            break;
          case 'c':
            e.preventDefault();
            onNavigate('client-management'); // Alt+C → Clients
            break;
          case 'i':
            e.preventDefault();
            onNavigate('invoice-management'); // Alt+I → Invoices
            break;
          case 'q':
            e.preventDefault();
            onNavigate('qc-management'); // Alt+Q → QC
            break;
          case 'e':
            e.preventDefault();
            onNavigate('export-management'); // Alt+E → Export
            break;
          case 'o':
            e.preventDefault();
            onNavigate('order-dashboard'); // Alt+O → Orders
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, currentUser]);
};

export default useKeyboardShortcuts;
