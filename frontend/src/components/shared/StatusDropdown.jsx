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

import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Dropdown } from 'react-bootstrap';
import { Lock } from 'lucide-react';

const STATUS_COLORS = {
  'Draft': 'bg-secondary text-white',
  'Pending': 'text-white', // orange
  'Prepared': 'bg-primary text-white',
  'Processing': 'text-white', // purple
  'Approved': 'bg-success text-white',
  'Cancelled': 'bg-danger text-white',
  'Revised': 'text-dark', // yellow
  'Locked': 'text-white', // dark red
  'In Production': 'bg-primary text-white',
  'Complete': 'bg-success text-white'
};

const STATUS_STYLE_OVERRIDES = {
  'Pending': { backgroundColor: '#fd7e14' },
  'Processing': { backgroundColor: '#6f42c1' },
  'Revised': { backgroundColor: '#ffc107' },
  'Locked': { backgroundColor: '#8B0000' },
  'In Production': { backgroundColor: '#0d6efd' },
  'Complete': { backgroundColor: '#198754' }
};

const MODULE_STATUSES = {
  DEFAULT: ['Draft', 'Pending', 'Prepared', 'Processing', 'Approved', 'Cancelled'],
  ORDER_SHEET: ['Pending', 'In Production', 'Complete']
};

const PortalDropdownMenu = forwardRef(({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
  return createPortal(
    <div
      ref={ref}
      style={{ ...style, zIndex: 9999 }}
      className={className}
      aria-labelledby={labeledBy}
    >
      {children}
    </div>,
    document.body
  );
});

export default function StatusDropdown({ value, onChange, module, disabled = false, className = '' }) {
  const options = MODULE_STATUSES[module] || MODULE_STATUSES.DEFAULT;
  const currentValue = value || 'Draft';
  
  const displayValue = Object.keys(STATUS_COLORS).find(k => k.toLowerCase() === currentValue.toLowerCase()) || currentValue;

  if (displayValue === 'Locked') {
    return (
      <div className={`form-control bg-dark text-white fw-bold d-flex align-items-center justify-content-between px-3 ${className}`} style={{ borderRadius: '6px', height: '36px', fontSize: '13px', cursor: 'not-allowed' }}>
        <span>LOCKED</span>
        <Lock size={14} className="text-warning ms-1" />
      </div>
    );
  }

  if (displayValue === 'Revised') {
    return (
      <div className={`form-control bg-warning text-dark fw-bold d-flex align-items-center justify-content-between px-3 ${className}`} style={{ borderRadius: '6px', height: '36px', fontSize: '13px', cursor: 'not-allowed' }}>
        <span>REVISED</span>
      </div>
    );
  }

  return (
    <Dropdown className={`w-100 ${className}`}>
      <Dropdown.Toggle 
        as="div"
        variant="none"
        disabled={disabled}
        className={`w-100 d-flex align-items-center justify-content-between fw-bold px-3 border-0 ${STATUS_COLORS[displayValue] || 'bg-secondary text-white'}`}
        style={{ borderRadius: '6px', height: '36px', fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer', ...(STATUS_STYLE_OVERRIDES[displayValue] || {}) }}
      >
        <span className="text-uppercase">{displayValue}</span>
      </Dropdown.Toggle>
      
      <Dropdown.Menu 
        as={PortalDropdownMenu}
        renderOnMount
        className="shadow-sm border border-light py-2" 
        style={{ fontSize: '13px', minWidth: '130px', backgroundColor: '#fff', borderRadius: '8px' }}
      >
        {options.filter(opt => opt !== 'Locked').map(opt => (
          <Dropdown.Item 
            key={opt} 
            active={opt.toLowerCase() === displayValue.toLowerCase()}
            onClick={() => onChange(opt)}
            className="fw-medium text-uppercase py-2 px-3"
          >
            {opt}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
