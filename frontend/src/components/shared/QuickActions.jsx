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

import { Button, Dropdown, ButtonGroup } from 'react-bootstrap';
import {
  Plus,
  FileText,
  Users,
  Package,
  Building,
  UserCheck,
  ShoppingCart,
  Calculator,
  Truck,
  Layers} from 'lucide-react';

function QuickActions({ currentUser, onNavigate }) {
  const getQuickActions = () => {
    const userRole = currentUser?.role;

    const actions = {
      super_admin: [
        {
          label: 'Create Company',
          icon: Building,
          action: () => onNavigate('company-management'),
        },
        {
          label: 'Create User',
          icon: Users,
          action: () => onNavigate('user-management'),
        },
        {
          label: 'New Invoice',
          icon: FileText,
          action: () => onNavigate('invoice-form'),
        },
        {
          label: 'Create Client',
          icon: UserCheck,
          action: () => onNavigate('client-management'),
        },
      ],
      company_admin: [
        {
          label: 'Create User',
          icon: Users,
          action: () => onNavigate('user-management'),
        },
        {
          label: 'New Invoice',
          icon: FileText,
          action: () => onNavigate('invoice-form'),
        },
        {
          label: 'Create Client',
          icon: UserCheck,
          action: () => onNavigate('client-management'),
        },
        {
          label: 'Manage Products',
          icon: Package,
          action: () => onNavigate('product-management'),
        },
      ],
      sales_manager: [
        {
          label: 'Create Lead',
          icon: UserCheck,
          action: () => onNavigate('lead-management'),
        },
        {
          label: 'Create Invoice',
          icon: FileText,
          action: () => onNavigate('invoice-form'),
        },
        {
          label: 'Proforma Invoice',
          icon: FileText,
          action: () => onNavigate('invoice-dashboard'),
        },
        {
          label: 'Create Client',
          icon: Building,
          action: () => onNavigate('client-management'),
        },
        {
          label: 'Packing List',
          icon: Package,
          action: () => onNavigate('packing-list-management'),
        },
      ],
      sales_executive: [
        {
          label: 'Create Lead',
          icon: UserCheck,
          action: () => onNavigate('lead-management'),
        },
        {
          label: 'Create Supplier',
          icon: Truck,
          action: () => onNavigate('supplier-management'),
        },
      ],
      qc: [
        {
          label: 'New QC Report',
          icon: Layers,
          action: () => onNavigate('qc-management'),
        },
      ],
      account: [
        {
          label: 'Account Entry',
          icon: Calculator,
          action: () => onNavigate('account-finance-management'),
        },
        {
          label: 'New Invoice',
          icon: FileText,
          action: () => onNavigate('invoice-form'),
        },
        {
          label: 'Proforma Invoice',
          icon: FileText,
          action: () => onNavigate('invoice-dashboard'),
        },
        {
          label: 'Packing List',
          icon: Package,
          action: () => onNavigate('packing-list-management'),
        },
      ],
      purchase: [
        {
          label: 'Create Order',
          icon: ShoppingCart,
          action: () => onNavigate('order-form'),
        },

        {
          label: 'Packing List',
          icon: Package,
          action: () => onNavigate('packing-list-management'),
        },
      ],
      administration: [
        {
          label: 'New Product',
          icon: Package,
          action: () => onNavigate('product-management'),
        },
        {
          label: 'New Catalogue',
          icon: FileText,
          action: () => onNavigate('catalogue-management'),
        },
        {
          label: 'QC Report',
          icon: Layers,
          action: () => onNavigate('qc-management'),
        },
      ],
      export_documents: [
        {
          label: 'Export Invoice',
          icon: FileText,
          action: () => onNavigate('export-invoice'),
        },
        {
          label: 'Proforma Invoice',
          icon: FileText,
          action: () => onNavigate('invoice-dashboard'),
        },
        {
          label: 'Packing List',
          icon: Package,
          action: () => onNavigate('packing-list-management'),
        },
        {
          label: 'Annexure',
          icon: Package,
          action: () => onNavigate('export-invoice-annexure'),
        },
        {
          label: 'Invoice Backside',
          icon: FileText,
          action: () => onNavigate('invoice-backside'),
        },
        {
          label: 'VGM',
          icon: ShoppingCart,
          action: () => onNavigate('vgm'),
        },
        {
          label: 'Shipping Instructions',
          icon: FileText,
          action: () => onNavigate('export-shipping-instructions'),
        },
      ],
    };

    return actions[userRole] || [];
  };

  const quickActions = getQuickActions();

  if (quickActions.length === 0) {
    return null;
  }

  return (
    <Dropdown as={ButtonGroup}>
      <Button variant="primary" onClick={quickActions[0]?.action} size="sm">
        <Plus size={16} className="me-1" />
        Quick Add
      </Button>

      <Dropdown.Toggle split variant="primary" size="sm" />

      <Dropdown.Menu>
        {quickActions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <Dropdown.Item key={index} onClick={action.action}>
              <IconComponent size={16} className="me-2" />
              {action.label}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default QuickActions;




