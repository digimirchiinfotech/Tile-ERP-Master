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
import { Badge } from 'react-bootstrap';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Lock } from 'lucide-react';

const StatusBadge = ({ status, isLocked, lockedBy, lockedAt }) => {
  const getStatusConfig = (status, locked) => {
    const s = status?.toLowerCase() || '';
    // Global Statuses
    if (s === 'draft') return { className: 'bg-secondary text-white', text: 'DRAFT' };
    if (s === 'pending') return { className: 'bg-warning text-dark', text: 'PENDING', style: { backgroundColor: '#fd7e14', color: '#fff' } };
    if (s === 'prepared') return { className: 'bg-primary text-white', text: 'PREPARED' };
    if (s === 'processing') return { className: 'bg-purple text-white', text: 'PROCESSING', style: { backgroundColor: '#6f42c1'} };
    if (s === 'approved') return { className: 'bg-success text-white', text: 'APPROVED' };
    if (s === 'cancelled') return { className: 'bg-danger text-white', text: 'CANCELLED' };
    if (s === 'revised') return { className: 'bg-warning text-dark', text: 'REVISED', style: { backgroundColor: '#ffc107', color: '#000'} };
    if (s === 'locked' || locked) return { className: 'bg-dark text-white', text: 'LOCKED', icon: true, style: { backgroundColor: '#8B0000' } };

    // Deprecated Status mappings to global statuses
    if (s === 'converted') return { className: 'bg-success text-white', text: 'APPROVED' };
    if (s === 'completed') return { className: 'bg-success text-white', text: 'APPROVED' };
    if (s === 'generated') return { className: 'bg-primary text-white', text: 'PREPARED' };
    if (s === 'submitted') return { className: 'bg-warning text-dark', text: 'PENDING', style: { backgroundColor: '#fd7e14', color: '#fff' } };
    
    // Default fallback
    return { className: 'bg-secondary text-white', text: status?.toUpperCase() || '' };
  };

  const config = getStatusConfig(status, isLocked);

  const badgeContent = (
    <span className={`status-badge ${config.className} d-inline-flex align-items-center gap-1`} style={config.style || {}}>
      {config.icon && <Lock size={12} />}
      {config.text}
    </span>
  );

  if (isLocked) {
    const tooltipText = lockedBy || lockedAt ? `Locked${lockedBy ? ` by ${lockedBy}` : ''}${lockedAt ? ` on ${lockedAt}` : ''}` : 'Document is locked and cannot be modified.';
    return (
      <OverlayTrigger overlay={<Tooltip>{tooltipText}</Tooltip>}>
        {badgeContent}
      </OverlayTrigger>
    );
  }

  return badgeContent;
};

export default StatusBadge;




