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
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { HelpCircle } from 'lucide-react';

/**
 * HelpTooltip Component
 * Displays a small icon that shows a contextual tooltip when hovered.
 * Ideal for explaining complex form fields to users.
 * 
 * @param {object} props
 * @param {string|React.ReactNode} props.content - The explanation text to show in the tooltip.
 * @param {string} [props.placement="top"] - Where to place the tooltip (top, right, bottom, left)
 * @param {number} [props.size=14] - Size of the HelpCircle icon
 * @param {string} [props.className="ms-2 text-muted"] - Custom CSS classes for the icon
 */
const HelpTooltip = ({ 
  content, 
  placement = 'top', 
  size = 14, 
  className = "ms-1 text-muted opacity-75"
}) => {
  if (!content) return null;

  return (
    <OverlayTrigger
      placement={placement}
      overlay={
        <Tooltip>
          {content}
        </Tooltip>
      }
    >
      <span className="help-tooltip-wrapper" style={{ cursor: 'help', display: 'inline-flex', verticalAlign: 'middle', marginBottom: '2px' }}>
        <HelpCircle size={size} className={className} />
      </span>
    </OverlayTrigger>
  );
};

export default HelpTooltip;
