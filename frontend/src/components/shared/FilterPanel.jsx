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

import React, { useState } from 'react';
import { Card, Collapse, Button } from 'react-bootstrap';
import { Filter, ChevronDown, ChevronUp, Search, RotateCcw } from 'lucide-react';

/**
 * Reusable Filter Panel Component
 * Features:
 * - Collapsible state with animation
 * - Consistent "Enterprise Compact" styling
 * - Standardized iconography
 * - Support for search actions and clear filters
 */
const FilterPanel = ({
  children,
  onSearch,
  onClear,
  title = "Search & Filters",
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="border-0 shadow-sm mb-4 overflow-hidden" style={{ borderRadius: '16px', background: '#ffffff' }}>
      <Card.Header 
        className="bg-primary py-3 px-4 border-0 d-flex flex-row align-items-center justify-content-between flex-nowrap text-white"
        style={{ cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s ease' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="d-flex align-items-center gap-3 flex-nowrap overflow-hidden">
          <div className="p-2 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}>
            <Filter size={20} strokeWidth={2.5} />
          </div>
          <div className="overflow-hidden">
            <h5 className="mb-0 fw-bold text-white text-nowrap" style={{ letterSpacing: '0.01em', fontSize: '1.05rem' }}>{title}</h5>
            <p className="mb-0 text-white text-opacity-75 small fw-medium text-nowrap d-none d-sm-block" style={{ fontSize: '0.75rem' }}>
              {isExpanded ? 'Click to hide filter controls' : 'Click to expand search options'}
            </p>
          </div>
        </div>
        
        <div className="d-flex align-items-center flex-shrink-0 ms-2">
          <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '32px', height: '32px', transition: 'all 0.3s ease', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
            <ChevronDown size={18} className="text-white transition-all" style={{ transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>
        </div>
      </Card.Header>

      <Collapse in={isExpanded}>
        <div className="border-top" style={{ borderColor: '#f1f5f9 !important' }}>
          <Card.Body className="px-4 pb-4 pt-3" style={{ background: '#ffffff' }}>
            {children}
            
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top" style={{ borderColor: '#f8fafc !important' }}>
              {onClear && (
                <Button 
                  variant="white" 
                  className="px-4 py-2 border shadow-sm d-flex align-items-center gap-2 fw-bold text-muted hover-elevate bg-white"
                  onClick={onClear}
                  style={{ borderRadius: '10px', border: '1px solid #e2e8f0 !important' }}
                >
                  <RotateCcw size={16} />
                  Clear Filters
                </Button>
              )}
              {onSearch && (
                <Button 
                  variant="primary" 
                  className="px-4 py-2 shadow-sm d-flex align-items-center gap-2 fw-bold hover-elevate"
                  onClick={onSearch}
                  style={{ borderRadius: '10px' }}
                >
                  <Search size={16} />
                  Apply Search
                </Button>
              )}
            </div>
          </Card.Body>
        </div>
      </Collapse>

      <style>{`
        .bg-primary:hover {
          filter: brightness(1.05);
        }
        .rotate-180 {
          transform: rotate(180deg);
        }
        .hover-elevate {
          transition: all 0.2s ease;
        }
        .hover-elevate:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </Card>
  );
};

export default FilterPanel;
